from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import hmac
import json
import os
from typing import Dict, Optional

# Режим разработки (можно переключать в зависимости от среды)
DEV_MODE = True  # Для продакшена установите False

# Данные тестового пользователя для режима разработки
DEV_USER = {"id": "12345", "username": "dev_user", "first_name": "Developer"}

security = HTTPBearer(auto_error=not DEV_MODE)

# Используем токен из .env через переменные окружения
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")

if not BOT_TOKEN and not DEV_MODE:
    raise ValueError("Необходимо установить переменную окружения TELEGRAM_BOT_TOKEN")

def verify_telegram_data(init_data: str) -> Dict:
    """Проверка подлинности данных от Telegram WebApp"""
    data_dict = {}
    try:
        # Разбираем строку на параметры
        for item in init_data.split('&'):
            if '=' in item:
                key, value = item.split('=')
                data_dict[key] = value
        
        if 'hash' not in data_dict:
            raise ValueError("Hash not found")
        
        received_hash = data_dict.pop('hash')
        
        # Сортируем параметры
        data_check_arr = []
        for key in sorted(data_dict.keys()):
            data_check_arr.append(f"{key}={data_dict[key]}")
        
        data_check_string = '\n'.join(data_check_arr)
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=BOT_TOKEN.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Создаем HMAC-SHA-256 подпись
        generated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Если хеш не совпадает, значит данные недействительны
        if not hmac.compare_digest(received_hash, generated_hash):
            raise ValueError("Invalid hash")
        
        # Пытаемся получить данные пользователя
        user_data = json.loads(data_dict.get('user', '{}'))
        return user_data
    except Exception as e:
        raise ValueError(f"Failed to verify Telegram data: {str(e)}")

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict:
    """Получение текущего пользователя"""
    
    # В режиме разработки возвращаем тестового пользователя
    if DEV_MODE:
        return DEV_USER
    
    try:
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        init_data = credentials.credentials
        user_data = verify_telegram_data(init_data)
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_user_id(user_data: Dict) -> str:
    """Получение Telegram ID пользователя"""
    return str(user_data['id'])