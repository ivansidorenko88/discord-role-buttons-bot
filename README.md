# Discord Role Buttons Bot

Бот автоматически выдаёт или снимает роли по нажатию кнопок.

## Важное ограничение

Панель ролей публикуется и кнопки обрабатываются только в канале:

`1449962175870275666`

## Возможности

- `/role-panel create` — создать/обновить панель.
- `/role-panel add` — добавить кнопку роли.
- `/role-panel remove` — удалить кнопку роли.
- `/role-panel list` — посмотреть текущие кнопки.
- `/role-panel reset` — удалить все кнопки.
- Повторное нажатие пользователем снимает роль.
- Максимум 25 кнопок.
- Настройки сохраняются в `data/config.json`.
- Административные команды требуют право `Manage Roles`.

## Установка

1. Установите Node.js 20.
2. Создайте Discord Application и Bot.
3. В Developer Portal включите **Server Members Intent**.
4. Пригласите бота с правами:
   - View Channels
   - Send Messages
   - Read Message History
   - Manage Roles
5. В настройках ролей Discord переместите роль бота **выше всех ролей**, которые он должен выдавать.
6. Скопируйте `.env.example` в `.env`.
7. Заполните:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
8. Выполните:

```bash
npm install
npm run deploy
npm start
```

## Пример настройки

```text
/role-panel add role:@Gamer label:Игры style:success emoji:🎮
/role-panel add role:@News label:Новости style:primary emoji:📰
/role-panel create
```

После этого сообщение появится только в канале `1449962175870275666`.

## Поведение кнопки

Если роли нет — бот выдаёт её.
Если роль уже есть — бот снимает её.
