from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from backend.models import GraphData
from backend.database import get_db_connection
from backend.auth import get_current_user, get_user_id

router = APIRouter(prefix="/api/graph", tags=["graph"])

@router.get("")
async def get_graph(
    folder_id: Optional[str] = None, 
    tag: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = get_user_id(current_user)
    conn = get_db_connection(user_id)  # Используем пользовательскую БД
    cursor = conn.cursor()
    
    try:
        # Определяем условия выборки файлов
        files_query = """
            SELECT files.id, files.name, files.folder_id, files.parent_id
            FROM files
        """
        
        params = []
        
        if folder_id:
            # Получаем все подпапки выбранной папки
            folder_ids = [folder_id]
            queue = [folder_id]
            
            while queue:
                current_id = queue.pop(0)
                cursor.execute("SELECT id FROM folders WHERE parent_id = ?", (current_id,))
                children = [row[0] for row in cursor.fetchall()]
                folder_ids.extend(children)
                queue.extend(children)
            
            placeholders = ','.join(['?'] * len(folder_ids))
            files_query += f" WHERE files.folder_id IN ({placeholders})"
            params.extend(folder_ids)
            
        elif tag:
            files_query = """
                SELECT files.id, files.name, files.folder_id, files.parent_id
                FROM files
                JOIN file_tags ON files.id = file_tags.file_id
                JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                WHERE unique_tags.tag = ?
            """
            params.append(tag)
        
        cursor.execute(files_query, params)
        files = [dict(row) for row in cursor.fetchall()]
        
        # Получаем все связи между файлами (родитель-потомок)
        file_ids = [file["id"] for file in files]
        
        nodes = []
        edges = []
        
        if file_ids:
            placeholders = ','.join(['?'] * len(file_ids))
            
            # Получаем цвета папок для узлов
            for file in files:
                file_id = file["id"]
                name = file["name"]
                folder_id = file.get("folder_id")
                
                color = "#1E90FF"  # Цвет по умолчанию
                
                if folder_id:
                    cursor.execute("SELECT color FROM folders WHERE id = ?", (folder_id,))
                    folder_row = cursor.fetchone()
                    if folder_row and folder_row[0]:
                        color = folder_row[0]
                
                nodes.append({
                    "id": file_id,
                    "name": name,
                    "color": color,
                    "folder_id": folder_id
                })
            
            # Получаем связи родитель-потомок
            if len(file_ids) > 1:  # Проверяем, что есть достаточно файлов для связей
                cursor.execute(f"""
                    SELECT f1.id as source, f2.id as target
                    FROM files f1
                    JOIN files f2 ON f1.id = f2.parent_id
                    WHERE f1.id IN ({placeholders}) AND f2.id IN ({placeholders})
                """, file_ids + file_ids)
                
                parent_edges = [
                    {
                        "source": row[0],
                        "target": row[1],
                        "relation": "parent",
                        "color": "#000000"
                    }
                    for row in cursor.fetchall()
                ]
                
                edges.extend(parent_edges)
            
            # Получаем теги и даты добавления для файлов
            cursor.execute(f"""
                SELECT files.id, unique_tags.tag, unique_tags.color, files.date_added
                FROM files
                JOIN file_tags ON files.id = file_tags.file_id
                JOIN unique_tags ON file_tags.tag_id = unique_tags.id
                WHERE files.id IN ({placeholders})
                ORDER BY files.date_added ASC
            """, file_ids)
            
            # Группируем файлы по тегам
            tag_files = {}
            tag_colors = {}
            for row in cursor.fetchall():
                file_id, tag, color, date_added = row
                if tag not in tag_files:
                    tag_files[tag] = []
                    tag_colors[tag] = color or "#888888"
                tag_files[tag].append((file_id, date_added))
            
            # Создаем последовательные связи для каждого тега
            tag_edges = []
            for tag, files_with_tag in tag_files.items():
                # Сортируем файлы по дате (хотя они должны уже быть отсортированы по SQL)
                unique_files = sorted(list(set([(fid, d) for fid, d in files_with_tag])), key=lambda x: x[1])
                
                color = tag_colors.get(tag, "#888888")
                
                # Создаем ребра между последовательными файлами
                for i in range(len(unique_files) - 1):
                    source_id = unique_files[i][0]
                    target_id = unique_files[i + 1][0]
                    
                    tag_edges.append({
                        "source": source_id,
                        "target": target_id,
                        "relation": "tag",
                        "tag": tag,
                        "color": color
                    })
            
            edges.extend(tag_edges)
        
        conn.close()
        
        return {
            "nodes": nodes,
            "edges": edges
        }
    
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))