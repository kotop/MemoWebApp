#!/usr/bin/env python3
"""
Скрипт для миграции данных из общей базы в пользовательские.
Используйте этот скрипт, если вы обновляете существующую систему
с режима разработки на мультипользовательский режим.

Запуск:
python migrate_data.py

Опции:
--user-id ID   - Указание конкретного Telegram ID пользователя для миграции
--all          - Мигрировать для всех пользователей (по умолчанию только для первого)
--force        - Перезаписать существующие данные
--help         - Показать эту справку
"""

import os
import sys
import sqlite3
import shutil
import argparse

def parse_arguments():
    parser = argparse.ArgumentParser(description='Migrate notes data to per-user databases')
    parser.add_argument('--user-id', help='Specific Telegram user ID to migrate data for')
    parser.add_argument('--all', action='store_true', help='Migrate data for all users (default is only the first user)')
    parser.add_argument('--force', action='store_true', help='Overwrite existing data')
    
    return parser.parse_args()

def get_db_path(user_id=None):
    """Определяет путь к базе данных"""
    data_dir = os.environ.get("DATA_DIR", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    if user_id:
        user_db_dir = os.path.join(data_dir, "users")
        os.makedirs(user_db_dir, exist_ok=True)
        return os.path.join(user_db_dir, f"user_{user_id}.db")
    else:
        return os.path.join(data_dir, "notes.db")

def get_notes_dir(user_id=None):
    """Определяет директорию для хранения заметок"""
    data_dir = os.environ.get("DATA_DIR", "data")
    notes_dir = os.path.join(data_dir, "notes")
    os.makedirs(notes_dir, exist_ok=True)
    
    if user_id:
        user_notes_dir = os.path.join(notes_dir, user_id)
        os.makedirs(user_notes_dir, exist_ok=True)
        return user_notes_dir
    else:
        return notes_dir

def init_user_db(db_path):
    """Инициализирует базу данных пользователя"""
    conn = sqlite3.connect(db_path)
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
    conn.close()

def migrate_data_for_user(user_id, force=False):
    """Мигрирует данные для конкретного пользователя"""
    # Пути к базам данных
    main_db_path = get_db_path()
    user_db_path = get_db_path(user_id)
    
    # Пути к директориям заметок
    main_notes_dir = get_notes_dir()
    user_notes_dir = get_notes_dir(user_id)
    
    # Проверяем, существует ли уже пользовательская БД
    if os.path.exists(user_db_path) and not force:
        print(f"База данных для пользователя {user_id} уже существует. Используйте --force для перезаписи.")
        return False
    
    # Инициализируем пользовательскую БД
    init_user_db(user_db_path)
    
    # Открываем соединения с базами данных
    main_conn = sqlite3.connect(main_db_path)
    main_cursor = main_conn.cursor()
    
    user_conn = sqlite3.connect(user_db_path)
    user_cursor = user_conn.cursor()
    
    try:
        # Проверяем, существуют ли таблицы для заметок и папок в основной БД
        main_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'")
        has_folders = main_cursor.fetchone() is not None
        
        main_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='files'")
        has_files = main_cursor.fetchone() is not None
        
        if not has_folders and not has_files:
            print("Нет данных для миграции")
            main_conn.close()
            user_conn.close()
            return False
        
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
        print(f"Миграция данных для пользователя {user_id} завершена успешно")
        return True
    
    except Exception as e:
        print(f"Ошибка миграции данных для пользователя {user_id}: {str(e)}")
        return False
    
    finally:
        main_conn.close()
        user_conn.close()

def get_all_users():
    """Получает список всех зарегистрированных пользователей"""
    main_db_path = get_db_path()
    
    if not os.path.exists(main_db_path):
        print("Основная база данных не найдена")
        return []
    
    conn = sqlite3.connect(main_db_path)
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли таблица пользователей
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        has_users = cursor.fetchone() is not None
        
        if not has_users:
            print("Таблица пользователей не найдена")
            return []
        
        cursor.execute("SELECT telegram_id FROM users")
        users = [row[0] for row in cursor.fetchall()]
        
        return users
    except Exception as e:
        print(f"Ошибка получения списка пользователей: {str(e)}")
        return []
    finally:
        conn.close()

def main():
    args = parse_arguments()
    
    if args.user_id:
        # Мигрируем данные для указанного пользователя
        migrate_data_for_user(args.user_id, args.force)
    else:
        # Получаем список всех пользователей
        users = get_all_users()
        
        if not users:
            print("Нет зарегистрированных пользователей")
            sys.exit(1)
        
        if args.all:
            # Мигрируем данные для всех пользователей
            for user_id in users:
                migrate_data_for_user(user_id, args.force)
        else:
            # Мигрируем данные только для первого пользователя
            migrate_data_for_user(users[0], args.force)
            print(f"Для миграции данных всех пользователей используйте опцию --all")

if __name__ == "__main__":
    main()
