require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits
} = require('discord.js');

const { loadConfig, saveConfig } = require('./config');
const { ROLE_CHANNEL_ID, upsertPanel } = require('./panel');

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN не указан в .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Бот запущен как ${readyClient.user.tag}`);
  console.log(`Канал панели ролей: ${ROLE_CHANNEL_ID}`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== 'role-panel') return;

      if (!interaction.inGuild()) {
        return interaction.reply({
          content: 'Эта команда работает только на сервере.',
          ephemeral: true
        });
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          content: 'Нужно право **Управление ролями**.',
          ephemeral: true
        });
      }

      const sub = interaction.options.getSubcommand();
      const config = loadConfig();

      if (sub === 'create') {
        const message = await upsertPanel(interaction.guild, config, saveConfig);

        return interaction.reply({
          content: `Панель создана/обновлена: <#${ROLE_CHANNEL_ID}> — сообщение \`${message.id}\`.`,
          ephemeral: true
        });
      }

      if (sub === 'add') {
        const role = interaction.options.getRole('role', true);
        const label = interaction.options.getString('label', true).trim();
        const style = interaction.options.getString('style') || 'secondary';
        const emoji = interaction.options.getString('emoji')?.trim() || null;

        if (role.id === interaction.guild.id) {
          return interaction.reply({
            content: 'Нельзя использовать роль @everyone.',
            ephemeral: true
          });
        }

        if (role.managed) {
          return interaction.reply({
            content: 'Эта роль управляется интеграцией и не может выдаваться ботом.',
            ephemeral: true
          });
        }

        const me = await interaction.guild.members.fetchMe().catch(() => null);

        if (!me) {
          return interaction.reply({
            content: 'Не удалось определить роль бота.',
            ephemeral: true
          });
        }

        if (role.position >= me.roles.highest.position) {
          return interaction.reply({
            content: 'Роль должна находиться **ниже самой высокой роли бота** в настройках сервера.',
            ephemeral: true
          });
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

          return interaction.reply({
            content: 'Discord позволяет максимум 25 кнопок в одном сообщении.',
            ephemeral: true
          });
        }

        saveConfig(config);
        await upsertPanel(interaction.guild, config, saveConfig);

        return interaction.reply({
          content: `Кнопка для роли ${role} сохранена.`,
          ephemeral: true
        });
      }

      if (sub === 'remove') {
        const role = interaction.options.getRole('role', true);
        const before = config.buttons.length;

        config.buttons = config.buttons.filter(x => x.roleId !== role.id);

        if (config.buttons.length === before) {
          return interaction.reply({
            content: 'Кнопка для этой роли не найдена.',
            ephemeral: true
          });
        }

        saveConfig(config);
        await upsertPanel(interaction.guild, config, saveConfig);

        return interaction.reply({
          content: `Кнопка роли ${role} удалена.`,
          ephemeral: true
        });
      }

      if (sub === 'list') {
        if (!config.buttons.length) {
          return interaction.reply({
            content: 'Кнопки пока не настроены.',
            ephemeral: true
          });
        }

        const text = config.buttons.map((x, i) =>
          `${i + 1}. <@&${x.roleId}> — **${x.label}**${x.emoji ? ` ${x.emoji}` : ''} — \`${x.style}\``
        ).join('\n');

        return interaction.reply({
          content: text,
          ephemeral: true
        });
      }

      if (sub === 'reset') {
        config.buttons = [];
        saveConfig(config);

        await upsertPanel(interaction.guild, config, saveConfig);

        return interaction.reply({
          content: 'Все кнопки удалены. Сообщение панели очищено.',
          ephemeral: true
        });
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('role:')) {
      if (!interaction.inGuild()) return;

      if (interaction.channelId !== ROLE_CHANNEL_ID) {
        return interaction.reply({
          content: 'Эта кнопка ролей неактивна вне специального канала.',
          ephemeral: true
        });
      }

      const config = loadConfig();

      if (config.messageId && interaction.message.id !== config.messageId) {
        return interaction.reply({
          content: 'Это устаревшая панель ролей.',
          ephemeral: true
        });
      }

      const roleId = interaction.customId.split(':')[1];
      const configured = config.buttons.some(x => x.roleId === roleId);

      if (!configured) {
        return interaction.reply({
          content: 'Эта роль больше не настроена.',
          ephemeral: true
        });
      }

      const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

      if (!role) {
        return interaction.reply({
          content: 'Роль не найдена на сервере.',
          ephemeral: true
        });
      }

      const me = await interaction.guild.members.fetchMe().catch(() => null);

      if (!me || role.position >= me.roles.highest.position) {
        return interaction.reply({
          content: 'Бот не может управлять этой ролью. Поднимите роль бота выше.',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members
        .fetch(interaction.user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          content: 'Не удалось получить данные участника сервера.',
          ephemeral: true
        });
      }

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);

        return interaction.reply({
          content: `Роль ${role} снята.`,
          ephemeral: true
        });
      }

      await member.roles.add(role);

      return interaction.reply({
        content: `Роль ${role} выдана.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Interaction error:', error);

    const message = 'Произошла ошибка. Проверьте права бота и положение его роли.';

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: message,
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
