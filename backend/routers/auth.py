from fastapi import APIRouter, Depends, Request, HTTPException
from backend.auth import get_current_user, get_user_id
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/test")
async def test_auth(request: Request, current_user: dict = Depends(get_current_user)):
    """Тестовый маршрут для проверки авторизации"""
    user_id = get_user_id(current_user)
    
    # Логируем заголовки запроса
    auth_header = request.headers.get('authorization', 'None')
    auth_header_preview = auth_header[:30] + '...' if len(auth_header) > 30 else auth_header
    
    logger.info(f"Auth test endpoint called. User ID: {user_id}")
    logger.info(f"Auth header: {auth_header_preview}")
    
    return {
        "status": "success", 
        "authenticated": True,
        "user_id": user_id,
        "user_data": current_user
    }