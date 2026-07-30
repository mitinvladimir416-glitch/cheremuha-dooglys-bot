# Быстрый старт

## 1. Локальный запуск (проверить, что всё работает)

```bash
git clone https://github.com/mitinvladimir416-glitch/cheremuha-dooglys-bot.git
cd cheremuha-dooglys-bot
cp .env.example .env
```

Откройте `.env` и впишите туда свои реальные значения:
- `DB_PASSWORD` — придумайте любой пароль для локальной БД
- `JWT_SECRET` — любая длинная случайная строка
- `TELEGRAM_BOT_TOKEN` — новый токен от @BotFather (старый нужно отозвать, если он раньше публиковался)
- `OPENROUTER_API_KEY` — новый ключ с openrouter.ai
- `DOOGLYS_ACCESS_TOKEN`, `DOOGLYS_DOMAIN` — из панели Dooglys

Затем:
```bash
docker compose up --build
```
Backend поднимется на `http://localhost:3000`, бот подключится к Telegram, БД создастся автоматически из `init.sql`.

## 2. Создание первого админа

После первого запуска нужно вручную добавить запись в таблицу `users` (пароль нужно захэшировать через bcrypt) — либо сделать отдельный сид-скрипт (можно попросить создать его отдельно).

## 3. Деплой backend на Railway

1. Зайдите на railway.app → New Project → Deploy from GitHub repo → выберите `cheremuha-dooglys-bot`.
2. В настройках сервиса укажите Dockerfile: `backend.Dockerfile`.
3. Во вкладке **Variables** впишите те же переменные, что в `.env` (но НЕ загружайте сам файл `.env`).
4. Railway выдаст публичный URL — это и есть `BACKEND_URL` для бота и фронтенда.

## 4. Деплой бота

Аналогично — второй сервис на Railway с `bot.Dockerfile`, те же переменные + `BACKEND_URL` от шага 3.

## 5. GitHub Secrets для автодеплоя (необязательно)

Settings → Secrets and variables → Actions → New repository secret → `RAILWAY_TOKEN` (получить в Railway → Account Settings → Tokens).

После этого каждый `git push` в `main` будет автоматически деплоить backend.

## 6. Фронтенд (React) — следующий шаг

Когда backend будет живым и с реальным `BACKEND_URL`, переходим к сборке `frontend/` и деплою на Vercel — это следующий этап, можно начинать по готовности.
