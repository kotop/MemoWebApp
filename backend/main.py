from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import notes, folders, graph, tree, auth  # Импортируем все роутеры
from database import init_db

# Задаем режим разработки через переменную окружения
DEV_MODE = os.environ.get("DEV_MODE", "False").lower() == "true"

app = FastAPI(title="Notes Manager API")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализируем базу данных при запуске
init_db()

# Регистрируем роутеры
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(graph.router)
app.include_router(tree.router)
app.include_router(auth.router) 

@app.get("/")
async def root():
    return {
        "message": "Welcome to Notes Manager API",
        "version": "1.0.0",
        "mode": "development" if DEV_MODE else "production"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "mode": "development" if DEV_MODE else "production"}