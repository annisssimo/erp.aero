# ERP Aero REST API

REST API сервис с JWT авторизацией и управлением файлами.

## Tech stack

| | |
|---|---|
| Runtime | Node.js 22 + TypeScript (strict) |
| Framework | Express.js |
| Database | MySQL 8 (Sequelize ORM) |
| Auth | JWT access (10 min) + refresh token rotation |
| Files | multer, локальное хранилище |
| Tests | Jest + supertest — 41 тест, SQLite in-memory |
| Lint | ESLint `@typescript-eslint/recommended-requiring-type-checking` + Prettier |

## Структура проекта

```
src/
├── config/
│   └── database.ts          # Sequelize: MySQL (prod) / SQLite :memory: (test)
├── errors/
│   └── app-error.ts         # Typed HTTP error class
├── middleware/
│   ├── async-handler.ts     # Wraps async handlers, routes errors to Express
│   └── auth.ts              # JWT verify + active session check
├── models/
│   ├── user.ts
│   ├── token.ts             # refresh tokens + deviceId + revoked flag
│   ├── file.ts
│   └── index.ts             # Sequelize associations
├── services/
│   ├── auth.service.ts      # Бизнес-логика авторизации
│   └── file.service.ts      # Бизнес-логика файлов
├── routes/
│   ├── auth.routes.ts       # Тонкие handlers, вызывают service
│   └── file.routes.ts
├── app.ts                   # createApp() — Express factory (без listen)
└── server.ts                # bootstrap() — sync DB + listen
tests/
├── fixtures/test-file.txt
├── setup.ts                 # Jest env vars
├── unit/
│   ├── middleware/auth.test.ts
│   └── services/auth.service.test.ts
└── integration/
    ├── auth.routes.test.ts
    └── file.routes.test.ts
```

## Быстрый старт

### 1. Зависимости

```bash
npm install
```

### 2. База данных (Docker)

```bash
docker compose up -d
```

Поднимает MySQL 8 на порту `3307`. БД `erp_aero`, пользователь `erp_user`.

### 3. Переменные окружения

Файл `.env` уже настроен под docker-compose. При необходимости отредактируй:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3307
DB_NAME=erp_aero
DB_USER=erp_user
DB_PASSWORD=erp_pass

JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=10m
JWT_REFRESH_EXPIRES=30d

UPLOAD_DIR=uploads
```

### 4. Миграции

```bash
npm run db:migrate          # применить все миграции
npm run db:migrate:undo     # откатить последнюю
npm run db:migrate:undo:all # откатить все
```

### 5. Запуск

```bash
npm run dev      # tsx watch — без компиляции, запускает миграции автоматически
npm run build    # компилировать в dist/
npm start        # запуск из dist/, запускает миграции автоматически
```

> В продакшне при старте сервер автоматически прогоняет непримененные миграции через `umzug`.

---

## API

### Авторизация

| Метод | Роут | Защита | Описание |
|-------|------|--------|----------|
| POST | `/signup` | — | Регистрация. Body: `{ id, password }` |
| POST | `/signin` | — | Вход. Body: `{ id, password }` |
| POST | `/signin/new_token` | — | Обновление токенов. Body: `{ refreshToken }` |
| GET | `/info` | Bearer | Возвращает `{ id }` текущего пользователя |
| GET | `/logout` | Bearer | Завершает сессию текущего устройства |

Поле `id` — номер телефона или email.

Успешный ответ `/signup` и `/signin`:
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

**Заголовок для защищённых роутов:**
```
Authorization: Bearer <accessToken>
```

### Файлы (все роуты защищены)

| Метод | Роут | Описание |
|-------|------|----------|
| POST | `/file/upload` | Загрузка файла (multipart, поле `file`) |
| GET | `/file/list` | Список файлов с пагинацией |
| GET | `/file/:id` | Метаданные файла |
| GET | `/file/download/:id` | Скачать файл |
| PUT | `/file/update/:id` | Заменить файл |
| DELETE | `/file/delete/:id` | Удалить файл |

Параметры пагинации для `/file/list`:
- `list_size` — размер страницы (default: `10`)
- `page` — номер страницы (default: `1`)

---

## Принципы авторизации

**Мульти-девайс:** каждый вход создаёт независимую сессию с уникальным `deviceId`. Один пользователь может быть залогинен с нескольких устройств одновременно.

**Logout** отзывает только сессию текущего устройства — остальные продолжают работать.

**Token rotation:** `/signin/new_token` помечает старый refresh токен как `revoked` и выдаёт новую пару. Повторное использование старого токена вернёт `401`.

---

## Разработка

```bash
npm test              # все тесты (MySQL не нужен — SQLite in-memory)
npm run test:coverage # с отчётом покрытия
npm run lint          # ESLint
npm run lint:fix      # ESLint autofix
npm run format        # Prettier
```
