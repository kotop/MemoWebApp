from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import os
import uuid
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import Note, Tag
from database import get_db_connection

router = APIRouter(prefix="/api/notes", tags=["notes"])

# ВАЖНО: Маршрут для поиска должен быть определен ДО маршрута для получения заметки по ID
@router.get("/search", summary="Search notes")
async def search_notes(query: Optional[str] = None, tag: Optional[str] = None, exact_match: bool = False):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Добавим логирование для отладки
    print(f"Search request received: query='{query}', tag='{tag}', exact_match={exact_match}")
    
    try:
        files = []
        processed_files = set()  # Множество для отслеживания уже обработанных файлов
        
        search_by_tag_only = False
        search_tag_name = None

        if query and query.startswith('#'):
            search_by_tag_only = True
            search_tag_name = query[1:]  # Убираем '#' для поиска по тегу
            print(f"Searching by tag: {search_tag_name}")
            
            # Ищем точное совпадение тега (без учёта регистра)
            cursor.execute("""
                SELECT files.id, files.name, files.date_added, files.folder_id
                FROM files
                JOIN file_tags ON files.id = file_tags.file_id
                JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                WHERE unique_tags.tag COLLATE NOCASE = ?
                ORDER BY files.date_added DESC
            """, (search_tag_name,))
            
            for row in cursor.fetchall():
                file_id, name, date_added, folder_id = row
                if file_id not in processed_files:
                    processed_files.add(file_id)
                    # Получаем теги для каждого файла
                    cursor.execute("""
                        SELECT unique_tags.tag, unique_tags.color
                        FROM file_tags
                        JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                        WHERE file_tags.file_id = ?
                    """, (file_id,))
                    tags_data = [{"name": t_name, "color": color} for t_name, color in cursor.fetchall()]
                    files.append({
                        "id": file_id, "name": name, "date_added": date_added, 
                        "folder_id": folder_id, "tags": tags_data,
                        "match": "tag"   # добавленный флаг совпадения
                    })
        
        elif tag: # Если передан параметр tag
            print(f"Searching by tag parameter: {tag}")
            
            cursor.execute("""
                SELECT files.id, files.name, files.date_added, files.folder_id
                FROM files
                JOIN file_tags ON files.id = file_tags.file_id
                JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                WHERE unique_tags.tag COLLATE NOCASE = ?
                ORDER BY files.date_added DESC
            """, (tag,))
            
            for row in cursor.fetchall():
                file_id, name, date_added, folder_id = row
                if file_id not in processed_files:
                    processed_files.add(file_id)
                    cursor.execute("""
                        SELECT unique_tags.tag, unique_tags.color
                        FROM file_tags JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                        WHERE file_tags.file_id = ?
                    """, (file_id,))
                    tags_data = [{"name": t_name, "color": color} for t_name, color in cursor.fetchall()]
                    files.append({
                        "id": file_id, "name": name, "date_added": date_added, 
                        "folder_id": folder_id, "tags": tags_data,
                        "match": "tag"
                    })

        elif query: # Если запрос есть, но не начинается с '#'
            print(f"Searching by query: {query}")
            # 1. Ищем по имени заметки (частичное совпадение)
            print("Searching by note name")
            cursor.execute("""
                SELECT id, name, date_added, folder_id
                FROM files
                WHERE name LIKE ?
                ORDER BY date_added DESC
            """, (f"%{query}%",))
            
            for row in cursor.fetchall():
                file_id, name, date_added, folder_id = row
                if file_id not in processed_files:
                    processed_files.add(file_id)
                    # Получаем теги
                    cursor.execute("""
                        SELECT unique_tags.tag, unique_tags.color
                        FROM file_tags JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                        WHERE file_tags.file_id = ?
                    """, (file_id,))
                    tags_data = [{"name": t_name, "color": color} for t_name, color in cursor.fetchall()]
                    files.append({
                        "id": file_id, "name": name, "date_added": date_added, 
                        "folder_id": folder_id, "tags": tags_data,
                        "match": "name"   # совпадение по имени
                    })

            # 2. Ищем по тегам (частичное совпадение)
            print("Searching by tag partial match")
            cursor.execute("""
                SELECT files.id, files.name, files.date_added, files.folder_id
                FROM files
                JOIN file_tags ON files.id = file_tags.file_id
                JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                WHERE unique_tags.tag LIKE ?
                ORDER BY files.date_added DESC
            """, (f"%{query}%",))
            
            for row in cursor.fetchall():
                file_id, name, date_added, folder_id = row
                if file_id not in processed_files:
                    processed_files.add(file_id)
                    # Получаем теги
                    cursor.execute("""
                        SELECT unique_tags.tag, unique_tags.color
                        FROM file_tags JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                        WHERE file_tags.file_id = ?
                    """, (file_id,))
                    tags_data = [{"name": t_name, "color": color} for t_name, color in cursor.fetchall()]
                    files.append({
                        "id": file_id, "name": name, "date_added": date_added, 
                        "folder_id": folder_id, "tags": tags_data,
                        "match": "tag"   # совпадение по тегу
                    })

            # 3. Поиск по содержимому
            print("Searching by content")
            cursor.execute("SELECT id, name, path, date_added, folder_id FROM files")
            for row in cursor.fetchall():
                file_id, name, path, date_added, folder_id = row
                if file_id in processed_files:
                    continue
                try:
                    if os.path.exists(path):
                        with open(path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        if query.lower() in content.lower():
                            processed_files.add(file_id)
                            cursor.execute("""
                                SELECT unique_tags.tag, unique_tags.color
                                FROM file_tags JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                                WHERE file_tags.file_id = ?
                            """, (file_id,))
                            tags_data = [{"name": t_name, "color": color} for t_name, color in cursor.fetchall()]
                            files.append({
                                "id": file_id, "name": name, "date_added": date_added, 
                                "folder_id": folder_id, "tags": tags_data,
                                "match": "content"   # совпадение по содержимому
                            })
                except Exception as e:
                    print(f"Error reading file {path}: {str(e)}")

        if not query and not tag:
            return []
        
        # Перед возвратом результатов добавим лог
        print(f"Search results: {len(files)} files found")    
        return files
    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{note_id}")
async def get_note(note_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Получаем информацию о заметке
    cursor.execute("SELECT id, name, path, folder_id, date_added FROM files WHERE id = ?", 
                  (note_id,))
    note_data = cursor.fetchone()
    
    if not note_data:
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")
    
    note_id, name, path, folder_id, date_added = note_data
    
    # Получаем содержимое заметки
    content = ""
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        # Если файл не существует, создаем пустой
        note_dir = "notes"
        path = os.path.join(note_dir, f"{note_id}.md")
        with open(path, 'w', encoding='utf-8') as f:
            pass
        
        # Обновляем путь в базе данных
        cursor.execute("UPDATE files SET path = ? WHERE id = ?", (path, note_id))
        conn.commit()
    
    # Получаем теги заметки
    cursor.execute("""
        SELECT unique_tags.tag, unique_tags.color
        FROM unique_tags
        JOIN file_tags ON unique_tags.id = file_tags.tag_id
        WHERE file_tags.file_id = ?
    """, (note_id,))
    
    tags = [{"name": row[0], "color": row[1]} for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "id": note_id,
        "name": name,
        "content": content,
        "folder_id": folder_id,
        "date_added": date_added,
        "tags": tags
    }

@router.post("")
async def create_note(note: Note):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Если ID не указан, генерируем новый
        if not note.id:
            note.id = str(uuid.uuid4())
        
        # Если дата не указана, используем текущую
        if not note.date_added:
            note.date_added = datetime.now().isoformat()
        
        # Создаем файл заметки
        note_dir = "notes"
        path = os.path.join(note_dir, f"{note.id}.md")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(note.content)
        
        # Добавляем запись в базу данных
        cursor.execute("""
            INSERT INTO files (id, name, path, date_added, folder_id, parent_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (note.id, note.name, path, note.date_added, note.folder_id, note.parent_id))
        
        # Добавляем теги, если они указаны
        if note.tags:
            for tag in note.tags:
                # Проверяем, существует ли тег
                cursor.execute("SELECT id FROM unique_tags WHERE tag = ?", (tag.name,))
                tag_row = cursor.fetchone()
                
                if tag_row:
                    tag_id = tag_row[0]
                    # Обновляем цвет, если он задан
                    if tag.color:
                        cursor.execute("UPDATE unique_tags SET color = ? WHERE id = ?", 
                                      (tag.color, tag_id))
                else:
                    # Создаем новый тег
                    color = tag.color or f"#{uuid.uuid4().hex[:6]}"
                    cursor.execute("INSERT INTO unique_tags (tag, color) VALUES (?, ?)", 
                                  (tag.name, color))
                    tag_id = cursor.lastrowid
                
                # Связываем тег с файлом
                cursor.execute("INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)", 
                              (note.id, tag_id))
        
        conn.commit()
        
        return {"id": note.id, "status": "created"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{note_id}")
async def update_note(note_id: str, note: Note):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверяем существование заметки
        cursor.execute("SELECT path FROM files WHERE id = ?", (note_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="Note not found")
        
        note_path = result[0]
        
        # Обновляем содержимое заметки
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(note.content)
        
        # Обновляем имя и папку, если указаны
        cursor.execute("""
            UPDATE files 
            SET name = ?, folder_id = ?, parent_id = ? 
            WHERE id = ?
        """, (note.name, note.folder_id, note.parent_id, note_id))
        
        # Обновляем теги
        if note.tags is not None:
            # Удаляем старые связи
            cursor.execute("DELETE FROM file_tags WHERE file_id = ?", (note_id,))
            
            # Добавляем новые теги
            for tag in note.tags:
                # Проверяем существование тега
                cursor.execute("SELECT id FROM unique_tags WHERE tag = ?", (tag.name,))
                tag_row = cursor.fetchone()
                
                if tag_row:
                    tag_id = tag_row[0]
                    # Обновляем цвет, если он задан
                    if tag.color:
                        cursor.execute("UPDATE unique_tags SET color = ? WHERE id = ?", 
                                      (tag.color, tag_id))
                else:
                    # Создаем новый тег
                    color = tag.color or f"#{uuid.uuid4().hex[:6]}"
                    cursor.execute("INSERT INTO unique_tags (tag, color) VALUES (?, ?)", 
                                  (tag.name, color))
                    tag_id = cursor.lastrowid
                
                # Связываем тег с файлом
                cursor.execute("INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)", 
                              (note_id, tag_id))
        
        conn.commit()
        
        return {"id": note_id, "status": "updated"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{note_id}")
async def delete_note(note_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверяем существование заметки
        cursor.execute("SELECT path FROM files WHERE id = ?", (note_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="Note not found")
        
        note_path = result[0]
        
        # Удаляем файл заметки
        if os.path.exists(note_path):
            os.remove(note_path)
        
        # Удаляем связи с тегами
        cursor.execute("DELETE FROM file_tags WHERE file_id = ?", (note_id,))
        
        # Удаляем запись из базы данных
        cursor.execute("DELETE FROM files WHERE id = ?", (note_id,))
        
        conn.commit()
        
        return {"status": "deleted"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
