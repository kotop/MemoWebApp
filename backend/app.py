from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from database import init_db
from routers import notes, folders, graph

# Инициализируем базу данных
init_db()

app = FastAPI(title="Notes Manager API")

# Настройка CORS
origins = [
    "http://localhost:3000",  # React разработка
    "http://localhost:8000",  # FastAPI
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(graph.router)

@app.get("/api/tree")
async def get_tree():
    """Получение структуры файлов и папок для проводника"""
    from database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Получаем все папки
    cursor.execute("""
        SELECT id, name, parent_id, color, position
        FROM folders
        ORDER BY position
    """)
    
    folders = [
        {
            "id": row[0],
            "name": row[1],
            "parent_id": row[2],
            "color": row[3],
            "position": row[4]
        }
        for row in cursor.fetchall()
    ]
    
    # Получаем все файлы
    cursor.execute("""
        SELECT id, name, folder_id, parent_id, path
        FROM files
        ORDER BY name
    """)
    
    files = [
        {
            "id": row[0],
            "name": row[1],
            "folder_id": row[2],
            "parent_id": row[3],
            "path": row[4]
        }
        for row in cursor.fetchall()
    ]
    
    conn.close()
    
    return {"folders": folders, "files": files}

@app.get("/")
async def root():
    return {"message": "Notes Manager API is running"}