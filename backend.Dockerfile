# Dockerfile для backend (Node.js Express)
# ВАЖНО: секреты сюда никогда не пишутся — Railway подставит их
# сам из панели Environment Variables во время запуска контейнера.

FROM node:18-alpine

WORKDIR /app

COPY backend/package.json ./
RUN npm install --production

COPY backend/src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]
