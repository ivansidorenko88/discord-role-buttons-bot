# Discord Role Buttons Bot v1.0.1

Исправленная версия бота для автовыдачи ролей через кнопки.

## Что исправлено

- Убран `GuildMembers Intent`.
- Для запуска достаточно `GatewayIntentBits.Guilds`.
- Участник сервера корректно запрашивается при нажатии кнопки.
- Бот по-прежнему работает только с панелью в канале:
  `1449962175870275666`.

## Discord Developer Portal

В разделе Bot → Privileged Gateway Intents можно оставить всё выключенным:

- Presence Intent — OFF
- Server Members Intent — OFF
- Message Content Intent — OFF

## Права бота

Нужны:

- View Channels
- Send Messages
- Read Message History
- Embed Links
- Manage Roles

Роль бота должна находиться выше ролей, которые он выдаёт.

## Установка

1. Скопируйте `.env.example` в `.env`.
2. Заполните `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`.
3. Выполните:

```bash
npm install
npm run deploy
npm start
```
