from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import hmac
import json
import os
from typing import Dict, Optional
import urllib.parse
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Режим разработки (можно переключать в зависимости от среды)
DEV_MODE = os.environ.get("DEV_MODE", "False").lower() == "true"

# Данные тестового пользователя для режима разработки
DEV_USER = {"id": "12345", "username": "dev_user", "first_name": "Developer"}

security = HTTPBearer(auto_error=not DEV_MODE)

# Используем токен из .env через переменные окружения
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")

if not BOT_TOKEN and not DEV_MODE:
    raise ValueError("Необходимо установить переменную окружения TELEGRAM_BOT_TOKEN")

def verify_telegram_data(init_data: str, bot_token: str) -> Dict:
    """Проверка подлинности данных от Telegram WebApp"""
    data_dict = {}
    try:
        # Логируем получение данных
        logger.info(f"Verifying initData: {init_data[:30]}...")
        
        # Декодируем URL-закодированные данные
        decoded_data = urllib.parse.unquote(init_data)
        logger.info(f"Decoded initData: {decoded_data[:30]}...")
        
        # Разбираем строку init_data на параметры
        for param in decoded_data.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)  # Split only once
                data_dict[key] = value
                # Логируем ключи (не значения для безопасности)
                if key != 'hash' and key != 'user':
                    logger.info(f"Found param: {key}={value[:10]}...")
        
        if 'hash' not in data_dict:
            logger.error("Hash not found in initData")
            raise ValueError("Hash not found")
        
        received_hash = data_dict.pop('hash', None)
        
        # Сортируем параметры и создаем строку для проверки
        data_check_arr = []
        for key in sorted(data_dict.keys()):
            data_check_arr.append(f"{key}={data_dict[key]}")
        
        data_check_string = '\n'.join(data_check_arr)
        logger.info(f"Data check string created, length: {len(data_check_string)}")
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Создаем HMAC-SHA-256 подпись
        generated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Сравниваем хеши
        is_valid = hmac.compare_digest(received_hash, generated_hash)
        logger.info(f"Hash verification result: {is_valid}")
        
        if not is_valid:
            logger.error(f"Hash verification failed. Received: {received_hash[:10]}..., Generated: {generated_hash[:10]}...")
            raise ValueError("Invalid hash")
        
        # Извлекаем данные пользователя
        user_data = json.loads(urllib.parse.unquote(data_dict.get('user', '{}')))
        logger.info(f"Extracted user data: {user_data.get('id')}, {user_data.get('username')}")
        return user_data
    except Exception as e:
        logger.error(f"Failed to verify Telegram data: {str(e)}")
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
        logger.info(f"Received init_data: {init_data[:50]}...")
        
        # Исправленный вызов - передаем BOT_TOKEN как аргумент
        user_data = verify_telegram_data(init_data, BOT_TOKEN)
        
        # Регистрируем пользователя в системе, если он еще не зарегистрирован
        await register_user_if_needed(user_data)
        
        return user_data
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
async def register_user_if_needed(user_data: Dict):
    """Регистрирует пользователя в базе данных, если он еще не зарегистрирован"""
    from backend.database import get_db_connection
    
    try:
        user_id = str(user_data.get('id', ''))
        if not user_id:
            return
        
        username = user_data.get('username', '')
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id FROM users WHERE telegram_id = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Создаем нового пользователя
            cursor.execute("""
                INSERT INTO users (telegram_id, username, first_name, last_name)
                VALUES (?, ?, ?, ?)
            """, (user_id, username, first_name, last_name))
            conn.commit()
        
        conn.close()
    except Exception as e:
        print(f"Error registering user: {str(e)}")
        


def get_user_id(user_data: Dict) -> str:
    """Получение Telegram ID пользователя"""
    return str(user_data.get('id', ''))