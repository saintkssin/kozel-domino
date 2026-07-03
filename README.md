# 🐐 Козёл — Доміно онлайн

Багатокористувацька веб-гра "Козёл" (доміно) для 2–4 гравців у стилі Balatro.

## Структура

```
kozel-domino/
├── shared/   — спільні TypeScript-типи (DominoTile, GameState, SocketEvents)
├── server/   — Node.js + Socket.io сервер, ігрова логіка
└── client/   — React + Vite + Tailwind фронтенд
```

## Запуск локально

```bash
npm install          # встановить залежності всіх воркспейсів
npm run dev          # запускає server (port 3001) + client (port 5173) паралельно
```

Або окремо:
```bash
npm run dev -w server
npm run dev -w client
```

## Змінні оточення

**server/.env**
```
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

**client/.env**
```
VITE_SOCKET_URL=http://localhost:3001
```

## Деплой на Railway (один сервіс)

Сервер роздає зібрану статику клієнта. Додай в Railway:
- `PORT` — прокидується автоматично
- `CLIENT_ORIGIN` — URL клієнта (той самий домен)
- `VITE_SOCKET_URL` — URL сервера

Build command: `npm install && npm run build -w client && npm run build -w server`  
Start command: `npm start -w server`
