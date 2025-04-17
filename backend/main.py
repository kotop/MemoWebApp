from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import notes, folders, graph, tree  # Импортируем все роутеры

app = FastAPI(title="Notes Manager API")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Регистрируем роутеры
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(graph.router)
app.include_router(tree.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Notes Manager API"}
