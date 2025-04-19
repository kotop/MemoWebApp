import sqlite3
import os
from sqlite3 import Row
import shutil

# Путь к файлу базы данных
DATABASE_URL = os.environ.get("DATABASE_URL", "data/notes.db")
DATA_DIR = os.path.dirname(DATABASE_URL)
USER_DB_DIR = os.path.join(DATA_DIR, "users")

# Убедитесь, что директории существуют
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(USER_DB_DIR, exist_ok=True)

def get_db_connection(user_id=None):
    """Создает соединение с базой данных
    
    Args:
        user_id: идентификатор пользователя Telegram. Если передан,
                 то будет использоваться персональная БД этого пользователя.
    
    Returns:
        sqlite3.Connection: Соединение с базой данных
    """
    if user_id:
        # Определяем путь к БД пользователя
        db_path = os.path.join(USER_DB_DIR, f"user_{user_id}.db")
        
        # Проверяем существование директории для БД пользователей
        os.makedirs(USER_DB_DIR, exist_ok=True)
            
        conn = sqlite3.connect(db_path)
        conn.row_factory = Row
        
        # Если это новая БД, инициализируем таблицы
        if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
            init_user_db(conn)
        
        return conn
    else:
        # Подключение к общей БД (для аутентификации и т.п.)
        conn = sqlite3.connect(DATABASE_URL)
        conn.row_factory = Row
        return conn

def init_user_db(conn):
    """Инициализация базы данных отдельного пользователя"""
    cursor = conn.cursor()
    
    # Создаем таблицу папок
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            color TEXT,
            position INTEGER DEFAULT 0,
            FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
        )
    ''')
    
    # Создаем таблицу файлов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            folder_id TEXT,
            parent_id TEXT,
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
        )
    ''')
    
    # Создаем таблицы для тегов
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
    
    # Создаем таблицу для сообщений папок
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
    
    # Включаем WAL режим
    cursor.execute('PRAGMA journal_mode = WAL;')
    
    conn.commit()

def init_db():
    """Инициализация основной базы данных и создание таблиц"""
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Добавляем таблицу пользователей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            telegram_id TEXT UNIQUE,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Включаем WAL режим для главной БД
    cursor.execute('PRAGMA journal_mode = WAL;')
    
    conn.commit()
    conn.close()

def verify_db_schema(user_id=None):
    """Проверяет и обновляет схему базы данных при необходимости"""
    conn = get_db_connection(user_id)
    cursor = conn.cursor()
    
    if user_id:
        # Проверка схемы пользовательской БД
        _add_column_if_not_exists(cursor, 'files', 'folder_id', 'TEXT')
        _add_column_if_not_exists(cursor, 'files', 'parent_id', 'TEXT')
        _add_column_if_not_exists(cursor, 'unique_tags', 'color', 'TEXT')
        _add_column_if_not_exists(cursor, 'folders', 'color', 'TEXT')
        _add_column_if_not_exists(cursor, 'folders', 'position', 'INTEGER DEFAULT 0')
    else:
        # Проверка схемы основной БД
        _add_column_if_not_exists(cursor, 'users', 'telegram_id', 'TEXT UNIQUE')
        _add_column_if_not_exists(cursor, 'users', 'username', 'TEXT')
        _add_column_if_not_exists(cursor, 'users', 'first_name', 'TEXT')
        _add_column_if_not_exists(cursor, 'users', 'last_name', 'TEXT')
    
    conn.commit()
    conn.close()

def _add_column_if_not_exists(cursor, table_name, column_name, column_type):
    """Добавляет колонку в таблицу, если она не существует"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    if column_name not in columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")

# Функция для миграции существующих данных (опционально)
def migrate_existing_data():
    """Мигрирует данные из общей БД в персональные БД пользователей.
    Предназначена только для использования при обновлении существующей системы."""
    try:
        # Подключаемся к общей БД
        main_conn = sqlite3.connect(DATABASE_URL)
        main_cursor = main_conn.cursor()
        
        # Получаем список пользователей
        main_cursor.execute("SELECT telegram_id FROM users")
        users = [row[0] for row in main_cursor.fetchall()]
        
        if not users:
            print("Нет пользователей для миграции")
            main_conn.close()
            return
        
        # Проверяем, существуют ли таблицы для заметок и папок в основной БД
        main_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'")
        has_folders = main_cursor.fetchone() is not None
        
        main_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='files'")
        has_files = main_cursor.fetchone() is not None
        
        if not has_folders and not has_files:
            print("Нет данных для миграции")
            main_conn.close()
            return
        
        # Определяем пользователя по умолчанию для миграции (первый в списке)
        default_user_id = users[0]
        
        # Создаем БД для этого пользователя
        user_conn = get_db_connection(default_user_id)
        user_cursor = user_conn.cursor()
        
        # Мигрируем папки, если они есть
        if has_folders:
            main_cursor.execute("SELECT id, name, parent_id, color, position FROM folders")
            folders = main_cursor.fetchall()
            
            for folder in folders:
                user_cursor.execute("""
                    INSERT OR IGNORE INTO folders (id, name, parent_id, color, position)
                    VALUES (?, ?, ?, ?, ?)
                """, folder)
        
        # Мигрируем файлы, если они есть
        if has_files:
            main_cursor.execute("SELECT id, name, path, date_added, folder_id, parent_id FROM files")
            files = main_cursor.fetchall()
            
            # Создаем директорию для заметок пользователя
            user_notes_dir = os.path.join(DATA_DIR, "notes", default_user_id)
            os.makedirs(user_notes_dir, exist_ok=True)
            
            for file in files:
                id, name, old_path, date_added, folder_id, parent_id = file
                
                # Определяем новый путь для файла
                new_path = os.path.join(user_notes_dir, f"{id}.md")
                
                # Копируем содержимое файла, если старый файл существует
                if os.path.exists(old_path):
                    try:
                        shutil.copy2(old_path, new_path)
                    except Exception as e:
                        print(f"Ошибка копирования файла {old_path}: {str(e)}")
                        # Создаем пустой файл, если копирование не удалось
                        with open(new_path, 'w', encoding='utf-8') as f:
                            f.write('')
                else:
                    # Создаем пустой файл, если старый файл не существует
                    with open(new_path, 'w', encoding='utf-8') as f:
                        f.write('')
                
                # Добавляем запись в БД пользователя
                user_cursor.execute("""
                    INSERT OR IGNORE INTO files (id, name, path, date_added, folder_id, parent_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (id, name, new_path, date_added, folder_id, parent_id))
        
        # Мигрируем теги
        main_cursor.execute("SELECT id, tag, color FROM unique_tags")
        tags = main_cursor.fetchall()
        
        for tag in tags:
            tag_id, tag_name, color = tag
            user_cursor.execute("""
                INSERT OR IGNORE INTO unique_tags (id, tag, color)
                VALUES (?, ?, ?)
            """, (tag_id, tag_name, color))
        
        # Мигрируем связи файлов с тегами
        main_cursor.execute("SELECT file_id, tag_id FROM file_tags")
        file_tags = main_cursor.fetchall()
        
        for file_tag in file_tags:
            file_id, tag_id = file_tag
            user_cursor.execute("""
                INSERT OR IGNORE INTO file_tags (file_id, tag_id)
                VALUES (?, ?)
            """, (file_id, tag_id))
        
        # Сохраняем изменения
        user_conn.commit()
        user_conn.close()
        main_conn.close()
        
        print(f"Миграция данных для пользователя {default_user_id} завершена успешно")
    except Exception as e:
        print(f"Ошибка миграции данных: {str(e)}")

# Инициализируем базу данных при импорте модуля, если её нет
if not os.path.exists(DATABASE_URL):
    init_db()
else:
    # Проверяем схему существующей БД
    verify_db_schema()