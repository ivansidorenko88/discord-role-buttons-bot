const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const ROLE_CHANNEL_ID = '1449962175870275666';

const styles = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger
};

function buildComponents(buttons) {
  const rows = [];

  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder();

    for (const item of buttons.slice(i, i + 5)) {
      const button = new ButtonBuilder()
        .setCustomId(`role:${item.roleId}`)
        .setLabel(item.label)
        .setStyle(styles[item.style] ?? ButtonStyle.Secondary);

      if (item.emoji) {
        try {
          button.setEmoji(item.emoji);
        } catch (_) {}
      }

      row.addComponents(button);
    }

    rows.push(row);
  }

  return rows.slice(0, 5);
}

function buildEmbed(buttons) {
  return new EmbedBuilder()
    .setTitle('Выбор ролей')
    .setDescription(
      buttons.length
        ? 'Нажмите на кнопку ниже, чтобы получить или снять соответствующую роль.'
        : 'Администратор пока не добавил роли в эту панель.'
    )
    .setColor(0x2B2D31)
    .setFooter({ text: 'Повторное нажатие на кнопку снимает роль.' });
}

async function upsertPanel(guild, config, saveConfig) {
  const channel = await guild.channels.fetch(ROLE_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    throw new Error(`Канал ${ROLE_CHANNEL_ID} не найден или не является текстовым.`);
  }

  const payload = {
    embeds: [buildEmbed(config.buttons)],
    components: buildComponents(config.buttons)
  };

  let message = null;

  if (config.messageId) {
    message = await channel.messages.fetch(config.messageId).catch(error => {
      if (error?.code !== 10008 && error?.code !== 10003) {
        console.error('[PANEL FETCH ERROR]', error);
      }
      return null;
    });
  }

  if (message) {
    try {
      await message.edit(payload);
      return message;
    } catch (error) {
      // Старое сообщение было удалено между fetch и edit.
      if (error?.code !== 10008) throw error;

      console.warn('[PANEL] Старое сообщение удалено. Создаю новое.');
      config.messageId = null;
      saveConfig(config);
    }
  }

  const newMessage = await channel.send(payload);
  config.messageId = newMessage.id;
  saveConfig(config);

  console.log(`[PANEL] Новое сообщение панели: ${newMessage.id}`);
  return newMessage;
}

module.exports = {
  ROLE_CHANNEL_ID,
  upsertPanel
};
