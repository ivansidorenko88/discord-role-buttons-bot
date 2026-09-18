require('dotenv').config();

const {
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('Управление панелью автовыдачи ролей')

    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Создать или обновить сообщение с кнопками')
    )

    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Добавить новую кнопку выдачи роли')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('Роль, которую будет выдавать кнопка')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('label')
            .setDescription('Текст на кнопке')
            .setRequired(true)
            .setMaxLength(80)
        )
        .addStringOption(opt =>
          opt.setName('style')
            .setDescription('Цвет кнопки')
            .setRequired(false)
            .addChoices(
              { name: 'Синий', value: 'primary' },
              { name: 'Серый', value: 'secondary' },
              { name: 'Зелёный', value: 'success' },
              { name: 'Красный', value: 'danger' }
            )
        )
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('Emoji, например 🎮')
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Редактировать существующую кнопку роли')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('Текущая роль кнопки')
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('new_role')
            .setDescription('Новая роль для этой кнопки')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('label')
            .setDescription('Новое название кнопки')
            .setRequired(false)
            .setMaxLength(80)
        )
        .addStringOption(opt =>
          opt.setName('style')
            .setDescription('Новый цвет кнопки')
            .setRequired(false)
            .addChoices(
              { name: 'Синий', value: 'primary' },
              { name: 'Серый', value: 'secondary' },
              { name: 'Зелёный', value: 'success' },
              { name: 'Красный', value: 'danger' }
            )
        )
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('Новый emoji. Укажите none, чтобы убрать emoji')
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Удалить кнопку роли')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('Роль')
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Показать настроенные кнопки')
    )

    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Удалить все настроенные кнопки')
    )
].map(c => c.toJSON());

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Заполните DISCORD_TOKEN, CLIENT_ID и GUILD_ID в .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('Загрузка slash-команд...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash-команды успешно загружены.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
