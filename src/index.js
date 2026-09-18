require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits,
  MessageFlags,
  Routes
} = require('discord.js');

const { loadConfig, saveConfig } = require('./config');
const { ROLE_CHANNEL_ID, upsertPanel } = require('./panel');

const { DISCORD_TOKEN } = process.env;

const ADMIN_ROLE_ID = '1449827112017072336';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN не указан в переменных окружения.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function hasRoleFromInteraction(interaction, roleId) {
  const member = interaction.member;
  if (!member) return false;

  // GuildMember
  if (member.roles?.cache?.has) {
    return member.roles.cache.has(roleId);
  }

  // APIInteractionGuildMember: roles — массив ID.
  if (Array.isArray(member.roles)) {
    return member.roles.includes(roleId);
  }

  return false;
}

function discordRoleErrorText(error) {
  const code = error?.code;

  if (code === 50013) {
    return 'Discord отказал в изменении роли: у бота нет права **Управление ролями** либо роль бота находится ниже выдаваемой роли.';
  }

  if (code === 50001) {
    return 'У бота нет доступа к серверу/каналу или нужному ресурсу.';
  }

  if (code === 10011) {
    return 'Выбранная роль больше не существует.';
  }

  if (code === 10007) {
    return 'Discord не нашёл участника сервера.';
  }

  return 'Не удалось изменить роль. Точная ошибка записана в лог хостинга.';
}

async function replyEphemeral(interaction, content) {
  try {
    if (interaction.deferred) {
      return await interaction.editReply({ content });
    }

    if (interaction.replied) {
      return await interaction.followUp({
        content,
        flags: MessageFlags.Ephemeral
      });
    }

    return await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    if (error?.code === 40060 || error?.code === 10062) {
      console.warn(
        `[INTERACTION ALREADY HANDLED] id=${interaction.id} code=${error.code}`
      );
      return null;
    }

    throw error;
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Бот запущен как ${readyClient.user.tag}`);
  console.log(`Канал панели ролей: ${ROLE_CHANNEL_ID}`);
});

client.on(Events.Error, error => {
  // 40060/10062 обычно означают, что тот же interaction уже обработал
  // другой экземпляр бота или interaction успел истечь.
  if (error?.code === 40060 || error?.code === 10062) {
    console.warn(`[Discord interaction warning] ${error.code}: ${error.message}`);
    return;
  }

  console.error('[Discord client error]', error);
});

process.on('unhandledRejection', error => {
  console.error('[Unhandled rejection]', error);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== 'role-panel') return;

      if (!interaction.inGuild()) {
        return replyEphemeral(interaction, 'Эта команда работает только на сервере.');
      }

      if (!hasRoleFromInteraction(interaction, ADMIN_ROLE_ID)) {
        return replyEphemeral(
          interaction,
          `Этой командой могут пользоваться только участники с ролью <@&${ADMIN_ROLE_ID}>.`
        );
      }

      const sub = interaction.options.getSubcommand();
      const config = loadConfig();

      if (sub === 'create') {
        const message = await upsertPanel(interaction.guild, config, saveConfig);

        return replyEphemeral(
          interaction,
          `Панель создана/обновлена: <#${ROLE_CHANNEL_ID}> — сообщение \`${message.id}\`.`
        );
      }

      if (sub === 'add') {
        const role = interaction.options.getRole('role', true);
        const label = interaction.options.getString('label', true).trim();
        const style = interaction.options.getString('style') || 'secondary';
        const emoji = interaction.options.getString('emoji')?.trim() || null;

        if (role.id === interaction.guild.id) {
          return replyEphemeral(interaction, 'Нельзя использовать роль @everyone.');
        }

        if (role.managed) {
          return replyEphemeral(
            interaction,
            'Эта роль управляется Discord/интеграцией и не может выдаваться ботом.'
          );
        }

        const me = interaction.guild.members.me
          ?? await interaction.guild.members.fetchMe().catch(() => null);

        if (!me) {
          return replyEphemeral(interaction, 'Не удалось определить роль самого бота.');
        }

        if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return replyEphemeral(
            interaction,
            'У бота нет разрешения **Управление ролями**.'
          );
        }

        if (role.position >= me.roles.highest.position) {
          return replyEphemeral(
            interaction,
            'Выдаваемая роль должна находиться **ниже самой высокой роли бота**.'
          );
        }

        const existingIndex = config.buttons.findIndex(x => x.roleId === role.id);
        const item = { roleId: role.id, label, style, emoji };

        if (existingIndex >= 0) {
          config.buttons[existingIndex] = item;
        } else {
          config.buttons.push(item);
        }

        if (config.buttons.length > 25) {
          config.buttons.pop();
          return replyEphemeral(
            interaction,
            'Discord позволяет максимум 25 кнопок в одном сообщении.'
          );
        }

        saveConfig(config);
        await upsertPanel(interaction.guild, config, saveConfig);

        return replyEphemeral(interaction, `Кнопка для роли ${role} сохранена.`);
      }


if (sub === 'edit') {
  const currentRole = interaction.options.getRole('role', true);
  const newRole = interaction.options.getRole('new_role');
  const newLabel = interaction.options.getString('label');
  const newStyle = interaction.options.getString('style');
  const newEmojiRaw = interaction.options.getString('emoji');

  const itemIndex = config.buttons.findIndex(x => x.roleId === currentRole.id);

  if (itemIndex < 0) {
    return replyEphemeral(
      interaction,
      'Кнопка для выбранной роли не найдена.'
    );
  }

  const targetRole = newRole ?? currentRole;

  if (targetRole.id === interaction.guild.id) {
    return replyEphemeral(interaction, 'Нельзя использовать роль @everyone.');
  }

  if (targetRole.managed) {
    return replyEphemeral(
      interaction,
      'Эта роль управляется Discord/интеграцией и не может выдаваться ботом.'
    );
  }

  const me = interaction.guild.members.me
    ?? await interaction.guild.members.fetchMe().catch(() => null);

  if (!me) {
    return replyEphemeral(
      interaction,
      'Не удалось определить роль самого бота.'
    );
  }

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return replyEphemeral(
      interaction,
      'У бота нет разрешения **Управление ролями**.'
    );
  }

  if (targetRole.position >= me.roles.highest.position) {
    return replyEphemeral(
      interaction,
      'Выдаваемая роль должна находиться **ниже самой высокой роли бота**.'
    );
  }

  if (
    newRole &&
    newRole.id !== currentRole.id &&
    config.buttons.some((x, i) => i !== itemIndex && x.roleId === newRole.id)
  ) {
    return replyEphemeral(
      interaction,
      'Для новой роли уже существует отдельная кнопка.'
    );
  }

  const current = config.buttons[itemIndex];

  let emoji = current.emoji ?? null;
  if (newEmojiRaw !== null) {
    emoji = newEmojiRaw.trim().toLowerCase() === 'none'
      ? null
      : newEmojiRaw.trim();
  }

  config.buttons[itemIndex] = {
    roleId: targetRole.id,
    label: newLabel?.trim() || current.label,
    style: newStyle || current.style || 'secondary',
    emoji
  };

  saveConfig(config);
  await upsertPanel(interaction.guild, config, saveConfig);

  return replyEphemeral(
    interaction,
    `Кнопка роли ${targetRole} обновлена.`
  );
}

      if (sub === 'remove') {
        const role = interaction.options.getRole('role', true);
        const before = config.buttons.length;

        config.buttons = config.buttons.filter(x => x.roleId !== role.id);

        if (config.buttons.length === before) {
          return replyEphemeral(interaction, 'Кнопка для этой роли не найдена.');
        }

        saveConfig(config);
        await upsertPanel(interaction.guild, config, saveConfig);

        return replyEphemeral(interaction, `Кнопка роли ${role} удалена.`);
      }

      if (sub === 'list') {
        if (!config.buttons.length) {
          return replyEphemeral(interaction, 'Кнопки пока не настроены.');
        }

        const text = config.buttons.map((x, i) =>
          `${i + 1}. <@&${x.roleId}> — **${x.label}**${x.emoji ? ` ${x.emoji}` : ''} — \`${x.style}\``
        ).join('\n');

        return replyEphemeral(interaction, text);
      }

      if (sub === 'reset') {
        config.buttons = [];
        saveConfig(config);
        await upsertPanel(interaction.guild, config, saveConfig);

        return replyEphemeral(
          interaction,
          'Все кнопки удалены. Сообщение панели очищено.'
        );
      }

      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('role:')) {
      if (!interaction.inGuild()) return;

      // Сразу подтверждаем interaction, чтобы Discord не получил timeout.
      // Если interaction уже забрал другой экземпляр бота, просто прекращаем обработку.
      try {
        await interaction.deferReply({
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        if (error?.code === 40060 || error?.code === 10062) {
          console.warn(
            `[BUTTON ALREADY HANDLED] id=${interaction.id} code=${error.code}`
          );
          return;
        }

        throw error;
      }

      if (interaction.channelId !== ROLE_CHANNEL_ID) {
        return interaction.editReply({
          content: 'Эта кнопка ролей работает только в специальном канале.'
        });
      }

      const config = loadConfig();

      // Если config.json пережил рестарт — защищаем от старой панели.
      // Если хост очистил config.json, существующие role-кнопки всё равно продолжают работать.
      if (config.messageId && interaction.message.id !== config.messageId) {
        return interaction.editReply({
          content: 'Это устаревшая панель ролей.'
        });
      }

      const roleId = interaction.customId.slice('role:'.length);

      if (!/^\d{16,22}$/.test(roleId)) {
        console.error('[Role button] Некорректный roleId:', roleId);
        return interaction.editReply({
          content: 'Кнопка содержит некорректный ID роли.'
        });
      }

      const role = await interaction.guild.roles.fetch(roleId).catch(error => {
        console.error('[Role fetch error]', error);
        return null;
      });

      if (!role) {
        return interaction.editReply({
          content: 'Роль не найдена на сервере.'
        });
      }

      if (role.managed) {
        return interaction.editReply({
          content: 'Этой ролью управляет Discord/интеграция, бот не может её менять.'
        });
      }

      const me = interaction.guild.members.me
        ?? await interaction.guild.members.fetchMe().catch(error => {
          console.error('[Bot member fetch error]', error);
          return null;
        });

      if (!me) {
        return interaction.editReply({
          content: 'Не удалось получить данные роли самого бота.'
        });
      }

      if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.editReply({
          content: 'У бота нет разрешения **Управление ролями**.'
        });
      }

      if (role.position >= me.roles.highest.position) {
        return interaction.editReply({
          content: `Бот не может управлять ролью ${role}: подними роль бота **выше** неё в списке ролей сервера.`
        });
      }

      const userId = interaction.user.id;
      const hadRole = hasRoleFromInteraction(interaction, role.id);

      try {
        if (hadRole) {
          await client.rest.delete(
            Routes.guildMemberRole(interaction.guildId, userId, role.id),
            { reason: `Self-role button: ${interaction.user.tag}` }
          );

          return interaction.editReply({
            content: `Роль ${role} снята.`
          });
        }

        await client.rest.put(
          Routes.guildMemberRole(interaction.guildId, userId, role.id),
          { reason: `Self-role button: ${interaction.user.tag}` }
        );

        return interaction.editReply({
          content: `Роль ${role} выдана.`
        });
      } catch (error) {
        console.error('[ROLE ACTION ERROR]', {
          name: error?.name,
          code: error?.code,
          status: error?.status,
          message: error?.message,
          guildId: interaction.guildId,
          userId,
          roleId: role.id
        });

        return interaction.editReply({
          content: discordRoleErrorText(error)
        });
      }
    }
  } catch (error) {
    if (error?.code === 40060 || error?.code === 10062) {
      console.warn(
        `[INTERACTION SKIPPED] id=${interaction.id} code=${error.code}: ${error.message}`
      );
      return;
    }

    console.error('[INTERACTION ERROR]', {
      name: error?.name,
      code: error?.code,
      status: error?.status,
      message: error?.message,
      stack: error?.stack
    });

    try {
      await replyEphemeral(
        interaction,
        'Произошла ошибка. В лог хостинга записана её точная причина.'
      );
    } catch (replyError) {
      console.error('[ERROR REPLY FAILED]', replyError);
    }
  }
});

client.login(DISCORD_TOKEN).catch(error => {
  console.error('[LOGIN ERROR]', error);
  process.exit(1);
});
