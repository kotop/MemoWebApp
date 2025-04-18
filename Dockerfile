FROM python:3.9-slim

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Копируем файл с зависимостями и устанавливаем их
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Копируем бэкенд и .env-файл
COPY backend/ ./backend/
COPY bot.py ./
COPY server.py ./
COPY .env ./

# Копируем готовую сборку фронтенда
COPY frontend/build ./frontend/build

# Создаем директории с правами
RUN mkdir -p notes data && chmod 777 notes data

# Открываем порт
EXPOSE 8080

# Запускаем приложение с переменными окружения
CMD ["python", "server.py"]