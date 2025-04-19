FROM python:3.9-slim

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Создаем директории для данных
RUN mkdir -p /data /data/notes /data/users /app/notes
RUN chmod 777 /data /data/notes /data/users /app/notes

# Устанавливаем переменные среды
ENV DATABASE_URL=/data/notes.db
ENV DATA_DIR=/data
ENV PORT=8080
ENV DEV_MODE=False

COPY . .

EXPOSE 8080

CMD ["python", "server.py"]