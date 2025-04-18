from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db_connection
from backend.auth import get_current_user, get_user_id

router = APIRouter(prefix="/api/tree", tags=["tree"])

@router.get("")
async def get_tree(current_user: dict = Depends(get_current_user)):
    """Получение структуры файлов и папок для проводника"""
    user_id = get_user_id(current_user)
    conn = get_db_connection(user_id)  # Используем пользовательскую БД
    cursor = conn.cursor()
    
    try:
        # Получаем все папки пользователя
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
        
        # Получаем все файлы пользователя
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
        
        return {"folders": folders, "files": files}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()