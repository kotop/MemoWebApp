from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import hashlib
import hmac
import time
from typing import Optional, Dict, Any, List
import logging
from pydantic import BaseModel
from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
    CallbackQueryHandler
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Получаем токен бота из переменных окружения
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("Необходимо установить переменную окружения TELEGRAM_BOT_TOKEN")

# URL вашего приложения, развернутого на хостинге
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://example.com/app")

# Инициализация FastAPI
app = FastAPI(title="Notes Manager Bot API")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели данных
class WebAppData(BaseModel):
    user_id: int
    action: str
    data: Dict[str, Any]

class TelegramInitData(BaseModel):
    data: str
    
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# Вспомогательные функции
def validate_telegram_data(init_data: str, bot_token: str) -> bool:
    """
    Проверяет валидность данных, полученных от Telegram Web App
    Подробнее: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    """
    try:
        # Разбираем строку init_data на параметры
        data_dict = dict(param.split('=') for param in init_data.split('&'))
        
        # Извлекаем хеш из параметров
        received_hash = data_dict.pop('hash', None)
        if not received_hash:
            logger.error("Hash is missing from init_data")
            return False
        
        # Проверяем, что контрольная строка содержит только разрешенные символы
        if not all(c in "0123456789abcdef" for c in received_hash):
            logger.error("Hash contains invalid characters")
            return False
        
        # Сортируем оставшиеся параметры в алфавитном порядке
        data_check_string = '\n'.join(f'{key}={value}' for key, value in sorted(data_dict.items()))
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Создаем HMAC-SHA-256 подпись
        generated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Сравниваем полученный хеш с сгенерированным
        return hmac.compare_digest(received_hash, generated_hash)
    except Exception as e:
        logger.error(f"Error validating Telegram init data: {e}")
        return False

# Обработчики команд бота
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправляет приветственное сообщение и меню при команде /start."""
    user = update.effective_user
    
    # Создаем кнопку для запуска веб-приложения
    keyboard = [
        [InlineKeyboardButton(
            "📝 Открыть Notes Manager", 
            web_app=WebAppInfo(url=f"{WEBAPP_URL}")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_html(
        f"Привет, {user.mention_html()}! 👋\n\n"
        f"Я бот для работы с заметками Notes Manager.\n"
        f"Нажмите на кнопку ниже, чтобы открыть приложение.",
        reply_markup=reply_markup
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправляет информацию о командах бота."""
    keyboard = [
        [InlineKeyboardButton(
            "📝 Открыть Notes Manager", 
            web_app=WebAppInfo(url=f"{WEBAPP_URL}")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Доступные команды:\n"
        "/start - Начать работу с ботом\n"
        "/help - Показать эту справку\n"
        "/notes - Показать список последних заметок\n"
        "/new - Создать новую заметку\n\n"
        "Или нажмите на кнопку ниже, чтобы открыть приложение:",
        reply_markup=reply_markup
    )

async def notes_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Показывает список последних заметок пользователя."""
    user_id = update.effective_user.id
    
    # Заглушка для демонстрации, в реальном приложении здесь будет запрос к базе данных
    # для получения фактических данных о заметках пользователя
    keyboard = [
        [InlineKeyboardButton(
            "📝 Просмотреть все заметки", 
            web_app=WebAppInfo(url=f"{WEBAPP_URL}")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Ваши последние заметки:\n\n"
        "🔹 Для доступа к полному списку заметок используйте кнопку ниже:",
        reply_markup=reply_markup
    )

async def new_note_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Команда для создания новой заметки."""
    keyboard = [
        [InlineKeyboardButton(
            "📝 Создать заметку", 
            web_app=WebAppInfo(url=f"{WEBAPP_URL}?create=new")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Нажмите на кнопку ниже, чтобы создать новую заметку:",
        reply_markup=reply_markup
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик обычных текстовых сообщений."""
    if update.message.text:
        # Проверяем, может быть это команда поиска по заметкам
        if update.message.text.startswith("найти ") or update.message.text.startswith("поиск "):
            query = update.message.text.split(" ", 1)[1]
            await search_notes(update, query)
        else:
            await help_command(update, context)

async def search_notes(update: Update, query: str) -> None:
    """Функция для поиска заметок по запросу."""
    keyboard = [
        [InlineKeyboardButton(
            "📝 Открыть результаты поиска", 
            web_app=WebAppInfo(url=f"{WEBAPP_URL}?search={query}")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"Для просмотра результатов поиска по запросу \"{query}\"\n"
        f"нажмите на кнопку ниже:",
        reply_markup=reply_markup
    )

async def handle_webapp_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик данных, отправленных из веб-приложения."""
    # Данные из веб-приложения приходят в виде JSON строки
    if not update.message.web_app_data:
        return
    
    try:
        # Разбираем полученные данные
        data = json.loads(update.message.web_app_data.data)
        action = data.get("action", "")
        
        if action == "note_created":
            # Обработка события создания заметки
            note_name = data.get("note_name", "")
            await update.message.reply_text(f"✅ Заметка '{note_name}' успешно создана!")
            
        elif action == "note_updated":
            # Обработка события обновления заметки
            note_name = data.get("note_name", "")
            await update.message.reply_text(f"✅ Заметка '{note_name}' успешно обновлена!")
            
        elif action == "note_deleted":
            # Обработка события удаления заметки
            note_name = data.get("note_name", "")
            await update.message.reply_text(f"🗑️ Заметка '{note_name}' удалена!")
            
        else:
            # Если действие неизвестно, отправляем общее сообщение
            await update.message.reply_text("✅ Операция выполнена успешно!")
            
    except json.JSONDecodeError:
        await update.message.reply_text("❌ Ошибка обработки данных из приложения.")
    except Exception as e:
        logger.error(f"Error handling webapp data: {e}")
        await update.message.reply_text("❌ Произошла ошибка при обработке запроса.")

# API endpoints для взаимодействия с веб-приложением
@app.post("/api/telegram/validate", response_model=ApiResponse)
async def validate_telegram_init_data(data: TelegramInitData):
    """Проверяет валидность данных инициализации от Telegram Web App."""
    try:
        if validate_telegram_data(data.data, TELEGRAM_BOT_TOKEN):
            return {"success": True, "message": "Данные валидны", "data": None}
        else:
            raise HTTPException(status_code=403, detail="Невалидные данные инициализации")
    except Exception as e:
        logger.error(f"Error validating init data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telegram/webapp-data", response_model=ApiResponse)
async def receive_webapp_data(data: WebAppData):
    """Получает данные от веб-приложения и обрабатывает их."""
    try:
        user_id = data.user_id
        action = data.action
        
        # Отправляем сообщение пользователю через бота
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        
        if action == "note_created":
            # Обработка создания заметки
            note_name = data.data.get("note_name", "")
            await bot.send_message(
                chat_id=user_id,
                text=f"✅ Заметка '{note_name}' успешно создана!"
            )
        
        elif action == "note_updated":
            # Обработка обновления заметки
            note_name = data.data.get("note_name", "")
            await bot.send_message(
                chat_id=user_id,
                text=f"✅ Заметка '{note_name}' успешно обновлена!"
            )
        
        elif action == "note_deleted":
            # Обработка удаления заметки
            note_name = data.data.get("note_name", "")
            await bot.send_message(
                chat_id=user_id,
                text=f"🗑️ Заметка '{note_name}' удалена!"
            )
        
        else:
            # Общее сообщение для неизвестных действий
            await bot.send_message(
                chat_id=user_id,
                text="✅ Операция выполнена успешно!"
            )
        
        return {"success": True, "message": "Данные успешно обработаны", "data": None}
    
    except Exception as e:
        logger.error(f"Error processing webapp data: {e}")
        return {"success": False, "message": f"Ошибка: {str(e)}", "data": None}

# Убедитесь, что метод run_bot правильно работает с асинхронными функциями

async def run_bot():
    """Запускает Telegram бота."""
    try:
        # Используем токен из переменных окружения
        application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        
        # Регистрация обработчиков
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CommandHandler("notes", notes_command))
        application.add_handler(CommandHandler("new", new_note_command))
        application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_webapp_data))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        
        # Запуск бота без ожидания - просто инициализация
        await application.initialize()
        await application.start()
        return application
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
        return None

# Если файл запущен напрямую
if __name__ == "__main__":
    import asyncio
    asyncio.run(run_bot())
