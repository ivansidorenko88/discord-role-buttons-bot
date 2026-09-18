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
  const description = buttons.length
    ? 'Нажмите на кнопку ниже, чтобы получить или снять соответствующую роль.'
    : 'Администратор пока не добавил роли в эту панель.';

  return new EmbedBuilder()
    .setTitle('Выбор ролей')
    .setDescription(description)
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
    message = await channel.messages.fetch(config.messageId).catch(() => null);
  }

  if (message) {
    await message.edit(payload);
  } else {
    message = await channel.send(payload);
    config.messageId = message.id;
    saveConfig(config);
  }

  return message;
}

module.exports = {
  ROLE_CHANNEL_ID,
  upsertPanel
};
