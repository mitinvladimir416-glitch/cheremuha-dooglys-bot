# Dockerfile для Telegram-бота (Python aiogram)
# Секреты сюда не пишутся — подставляются Railway из Environment Variables.

FROM python:3.12-slim

WORKDIR /app

COPY bot/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/main.py ./

CMD ["python", "main.py"]
