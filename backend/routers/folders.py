from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid

from backend.models import Folder
from backend.database import get_db_connection

router = APIRouter(prefix="/api/folders", tags=["folders"])

@router.get("")
async def get_folders():
    conn = get_db_connection()
    cursor = conn.cursor()
    
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
    
    conn.close()
    
    return folders

@router.get("/{folder_id}")
async def get_folder(folder_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, parent_id, color, position
        FROM folders
        WHERE id = ?
    """, (folder_id,))
    
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder = {
        "id": row[0],
        "name": row[1],
        "parent_id": row[2],
        "color": row[3],
        "position": row[4]
    }
    
    conn.close()
    
    return folder

@router.post("")
async def create_folder(folder: Folder):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Если ID не указан, генерируем новый
        if not folder.id:
            folder.id = str(uuid.uuid4())
        
        # Получаем максимальную позицию для нового элемента
        cursor.execute("""
            SELECT COALESCE(MAX(position), -1) + 1
            FROM folders
            WHERE parent_id IS ? OR (parent_id IS NULL AND ? IS NULL)
        """, (folder.parent_id, folder.parent_id))
        
        next_position = cursor.fetchone()[0]
        folder.position = next_position
        
        # Создаем папку
        cursor.execute("""
            INSERT INTO folders (id, name, parent_id, color, position)
            VALUES (?, ?, ?, ?, ?)
        """, (folder.id, folder.name, folder.parent_id, folder.color, folder.position))
        
        conn.commit()
        
        return {"id": folder.id, "status": "created"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{folder_id}")
async def update_folder(folder_id: str, folder: Folder):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверяем существование папки
        cursor.execute("SELECT id FROM folders WHERE id = ?", (folder_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="Folder not found")
        
        # Обновляем папку
        cursor.execute("""
            UPDATE folders
            SET name = ?, parent_id = ?, color = ?, position = ?
            WHERE id = ?
        """, (folder.name, folder.parent_id, folder.color, folder.position, folder_id))
        
        conn.commit()
        
        return {"id": folder_id, "status": "updated"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{folder_id}")
async def delete_folder(folder_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверяем существование папки
        cursor.execute("SELECT parent_id FROM folders WHERE id = ?", (folder_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="Folder not found")
        
        parent_id = result[0]
        
        # Перемещаем дочерние папки к родителю удаляемой папки
        cursor.execute("""
            UPDATE folders
            SET parent_id = ?
            WHERE parent_id = ?
        """, (parent_id, folder_id))
        
        # Перемещаем файлы к родителю удаляемой папки
        cursor.execute("""
            UPDATE files
            SET folder_id = ?
            WHERE folder_id = ?
        """, (parent_id, folder_id))
        
        # Удаляем папку
        cursor.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
        
        conn.commit()
        
        return {"status": "deleted"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        