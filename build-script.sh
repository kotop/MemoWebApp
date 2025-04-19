#!/bin/bash

# Скрипт для автоматизации сборки и деплоя Telegram Mini App
# Автор: Claude
# Дата: Апрель 2025

# Цвета для вывода сообщений
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Конфигурация (можно заменить на чтение из .env файла)
CONTAINER_NAME="notes-manager-tg"
IMAGE_NAME="notes-manager-tg"
PORT="8080"
TELEGRAM_BOT_TOKEN="8056577366:AAETl5dS6wLtzxWcY2dv8EWZTtxU_w6lvxM"
WEBAPP_URL="https://your-domain.com"
DATABASE_URL="/data/notes.db"
DATA_DIR="$(pwd)/data"
NOTES_DIR="$(pwd)/data/notes"
USERS_DIR="$(pwd)/data/users"
DEV_MODE="False"

# Функция для вывода сообщений
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция для проверки результата выполнения команды
check_result() {
    if [ $? -ne 0 ]; then
        log_error "$1"
        exit 1
    else
        log "$2"
    fi
}

# Начало сборки
log "Начинаем процесс сборки и деплоя Notes Manager для Telegram Mini App"
log "Текущая директория: $(pwd)"

# Шаг 1: Сборка фронтенда
log "Шаг 1: Сборка фронтенда"
cd frontend || { log_error "Директория frontend не найдена"; exit 1; }
log "Установка NPM-зависимостей..."
npm install
check_result "Ошибка установки NPM-зависимостей" "NPM-зависимости успешно установлены"

log "Сборка React-приложения..."
npm run build
check_result "Ошибка сборки React-приложения" "React-приложение успешно собрано"

cd ..
log "Вернулись в корневую директорию проекта"

# Шаг 2: Остановка и удаление существующего контейнера, если он запущен
log "Шаг 2: Проверка и удаление существующего контейнера"
if docker ps -a | grep -q $CONTAINER_NAME; then
    log_warn "Контейнер $CONTAINER_NAME уже существует, останавливаем и удаляем..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    check_result "Ошибка при удалении существующего контейнера" "Существующий контейнер успешно удален"
else
    log "Контейнер $CONTAINER_NAME не найден, продолжаем..."
fi

# Шаг 3: Сборка Docker-образа
log "Шаг 3: Сборка Docker-образа"
docker build -t $IMAGE_NAME .
check_result "Ошибка сборки Docker-образа" "Docker-образ успешно собран"

# Шаг 4: Создание директорий для данных, если они не существуют
log "Шаг 4: Подготовка директорий для данных"
mkdir -p "$DATA_DIR"
check_result "Ошибка создания директории данных" "Директория данных готова"
mkdir -p "$NOTES_DIR"
check_result "Ошибка создания директории для заметок" "Директория для заметок готова"
mkdir -p "$USERS_DIR"
check_result "Ошибка создания директории для пользовательских баз данных" "Директория для пользовательских баз данных готова"

# Шаг 5: Запуск Docker-контейнера
log "Шаг 5: Запуск Docker-контейнера"
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:$PORT \
  -e TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN \
  -e WEBAPP_URL=$WEBAPP_URL \
  -e PORT=$PORT \
  -e DATABASE_URL=$DATABASE_URL \
  -e DATA_DIR=/data \
  -e DEV_MODE=$DEV_MODE \
  -v "$DATA_DIR:/data" \
  $IMAGE_NAME

check_result "Ошибка запуска Docker-контейнера" "Docker-контейнер успешно запущен"

# Шаг 6: Проверка статуса контейнера
log "Шаг 6: Проверка статуса контейнера"
sleep 3 # Дадим контейнеру время на запуск
if docker ps | grep -q $CONTAINER_NAME; then
    log "Контейнер $CONTAINER_NAME успешно запущен и работает"
    
    # Показываем логи контейнера (первые 10 строк)
    log "Логи контейнера (первые 10 строк):"
    docker logs $CONTAINER_NAME --tail 10
    
    # Выводим информацию о доступе к приложению
    echo -e "\n${GREEN}==============================================${NC}"
    echo -e "${GREEN}  Notes Manager для Telegram успешно запущен!  ${NC}"
    echo -e "${GREEN}==============================================${NC}"
    echo -e "URL приложения: ${YELLOW}$WEBAPP_URL${NC}"
    echo -e "Порт: ${YELLOW}$PORT${NC}"
    echo -e "Мультипользовательский режим: ${YELLOW}$([ "$DEV_MODE" == "False" ] && echo "Включен" || echo "Отключен")${NC}"
    echo -e "\nДля просмотра логов используйте: ${YELLOW}docker logs $CONTAINER_NAME${NC}"
    echo -e "Для остановки контейнера: ${YELLOW}docker stop $CONTAINER_NAME${NC}"
    echo -e "Для перезапуска контейнера: ${YELLOW}docker restart $CONTAINER_NAME${NC}"
else
    log_error "Контейнер не запущен после создания. Проверьте логи: docker logs $CONTAINER_NAME"
    exit 1
fi

log "Процесс сборки и деплоя успешно завершен!"