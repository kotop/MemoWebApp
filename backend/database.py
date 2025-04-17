import sqlite3
import os
from sqlite3 import Row

# Путь к файлу базы данных
DATABASE_URL = "notes.db"

def get_db_connection():
    """Создает соединение с базой данных"""
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = Row  # Возвращает результаты как словари
    return conn

def init_db():
    """Инициализирует базу данных"""
    # Создаем директорию для заметок, если она не существует
    if not os.path.exists("notes"):
        os.makedirs("notes")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Создаем таблицы
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        date_added TEXT NOT NULL,
        folder_id TEXT,
        parent_id TEXT,
        FOREIGN KEY (folder_id) REFERENCES folders (id),
        FOREIGN KEY (parent_id) REFERENCES files (id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS unique_tags (
        id INTEGER PRIMARY KEY,
        tag TEXT UNIQUE,
        color TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS file_tags (
        id INTEGER PRIMARY KEY,
        file_id TEXT,
        tag_id INTEGER,
        FOREIGN KEY (file_id) REFERENCES files (id),
        FOREIGN KEY (tag_id) REFERENCES unique_tags (id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        color TEXT,
        position INTEGER DEFAULT 0,
        FOREIGN KEY (parent_id) REFERENCES folders (id)
    )
    ''')
    
    # Добавляем таблицу folder_messages из десктопной версии
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS folder_messages (
        id INTEGER PRIMARY KEY,
        folder_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        author TEXT,
        FOREIGN KEY (folder_id) REFERENCES folders (id)
    )
    ''')
    
    # Включаем WAL режим как в десктопной версии
    cursor.execute('PRAGMA journal_mode = WAL;')
    
    conn.commit()
    conn.close()

def verify_db_schema():
    """Проверяет и обновляет схему базы данных при необходимости"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Проверяем наличие колонок в таблицах
    _add_column_if_not_exists(cursor, 'files', 'folder_id', 'TEXT')
    _add_column_if_not_exists(cursor, 'files', 'parent_id', 'TEXT')
    _add_column_if_not_exists(cursor, 'unique_tags', 'color', 'TEXT')
    _add_column_if_not_exists(cursor, 'folders', 'color', 'TEXT')
    _add_column_if_not_exists(cursor, 'folders', 'position', 'INTEGER DEFAULT 0')
    
    conn.commit()
    conn.close()

def _add_column_if_not_exists(cursor, table_name, column_name, column_type):
    """Добавляет колонку в таблицу, если она не существует"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    if column_name not in columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")

# Инициализируем базу данных при импорте модуля, если её нет
if not os.path.exists(DATABASE_URL):
    init_db()
else:
    # Проверяем схему существующей БД
    verify_db_schema()