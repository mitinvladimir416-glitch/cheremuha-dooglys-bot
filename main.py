"""
Telegram-бот для управления Черёмуха Street.
Все секреты — только через os.getenv(), никогда не хардкодятся.
"""
import os
import asyncio
import logging

import aiohttp
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN не задан — проверьте .env")

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Токены авторизованных пользователей храним в памяти по telegram_id
user_sessions: dict[int, str] = {}


class Auth(StatesGroup):
    waiting_login = State()
    waiting_password = State()


@dp.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    if message.from_user.id in user_sessions:
        await message.answer("Вы уже авторизованы. Наберите /help чтобы увидеть команды.")
        return
    await message.answer("Добро пожаловать! Введите логин:")
    await state.set_state(Auth.waiting_login)


@dp.message(Auth.waiting_login)
async def process_login(message: Message, state: FSMContext):
    await state.update_data(login=message.text.strip())
    await message.answer("Теперь введите пароль:")
    await state.set_state(Auth.waiting_password)


@dp.message(Auth.waiting_password)
async def process_password(message: Message, state: FSMContext):
    data = await state.get_data()
    login = data["login"]
    password = message.text.strip()

    # Удаляем сообщение с паролем из чата для безопасности
    await message.delete()

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{BACKEND_URL}/api/auth/login",
            json={"login": login, "password": password},
        ) as resp:
            if resp.status != 200:
                await message.answer("❌ Неверный логин или пароль. Попробуйте /start снова.")
                await state.clear()
                return
            result = await resp.json()

    user_sessions[message.from_user.id] = result["token"]
    await message.answer(
        f"✅ Успешный вход, {result['user']['full_name'] or login}! "
        f"Роль: {result['user']['role']}.\nНаберите /help для списка команд."
    )
    await state.clear()


@dp.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        "Доступные команды:\n"
        "/sales — последние продажи\n"
        "/lowstock — товары на исходе\n"
        "/dashboard — сводка за сегодня"
    )


def _auth_header(user_id: int) -> dict:
    token = user_sessions.get(user_id)
    return {"Authorization": f"Bearer {token}"} if token else {}


@dp.message(Command("dashboard"))
async def cmd_dashboard(message: Message):
    if message.from_user.id not in user_sessions:
        await message.answer("Сначала авторизуйтесь: /start")
        return
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{BACKEND_URL}/api/dashboard/summary?period=day",
            headers=_auth_header(message.from_user.id),
        ) as resp:
            data = await resp.json()
    await message.answer(f"📊 Сегодня:\nВыручка: {data['revenue']} ₽\nЗаказов: {data['orders']}")


@dp.message(Command("lowstock"))
async def cmd_lowstock(message: Message):
    if message.from_user.id not in user_sessions:
        await message.answer("Сначала авторизуйтесь: /start")
        return
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{BACKEND_URL}/api/ingredients/low-stock",
            headers=_auth_header(message.from_user.id),
        ) as resp:
            items = await resp.json()
    if not items:
        await message.answer("✅ Критичных остатков нет.")
        return
    text = "⚠️ Заканчиваются:\n" + "\n".join(f"- {i['name']}: {i['current_stock']} {i['unit']}" for i in items)
    await message.answer(text)


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
