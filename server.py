import os
import logging
import asyncio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

# Импортируем наши модули
from bot import run_bot
from backend.database import init_db
from backend.routers import notes, folders, graph, tree

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Инициализируем базу данных
init_db()

# Создаем экземпляр FastAPI
app = FastAPI(title="Notes Manager API")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры API
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(graph.router)
app.include_router(tree.router)

app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")


# Перенаправление корневого URL на React-приложение
@app.get("/")
async def redirect_to_app():
    return RedirectResponse(url="/app/")

# Подключаем статические файлы React-приложения
app.mount("/app", StaticFiles(directory="frontend/build", html=True), name="app")

# Проверка состояния API
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

async def start_bot():
    """Запускает Telegram бота в отдельной задаче."""
    try:
        # Запускаем бота в отдельном потоке
        bot_updater = run_bot()
        logger.info("Telegram bot started successfully")
    except Exception as e:
        logger.error(f"Failed to start Telegram bot: {e}")

async def start_server():
    """Запускает веб-сервер в основном потоке."""
    config = uvicorn.Config(
        app=app, 
        host="0.0.0.0", 
        port=int(os.environ.get("PORT", 8000)),
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

async def main():
    """Основная функция для запуска всех компонентов."""
    try:
        # Запускаем бота как отдельную задачу
        bot_task = asyncio.create_task(start_bot())
        
        # Запускаем сервер в основном потоке
        await start_server()
        
        # Ждем завершения задачи бота
        await bot_task
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")

if __name__ == "__main__":
    # Запускаем всю систему
    asyncio.run(main())