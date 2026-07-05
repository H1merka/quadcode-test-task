#!/bin/bash

# Скрипт автоматического запуска мок-сервера локально или в Docker
PORT=8080
IMAGE_NAME="mock-api-sandbox"
CONTAINER_NAME="mock-api-container"

echo "=== Mock Sandbox Starter ==="
echo "Checking environment..."

# Проверяем наличие Docker
if command -v docker &> /dev/null; then
    echo "Docker detected. Building image..."
    
    # Останавливаем старый контейнер, если он запущен
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        echo "Stopping old container..."
        docker rm -f $CONTAINER_NAME
    fi

    docker build -t $IMAGE_NAME .
    echo "Running container on port $PORT..."
    docker run -d --name $CONTAINER_NAME -p $PORT:8080 $IMAGE_NAME
    
    echo "Mock server is running inside Docker container!"
    echo "Local Address: http://localhost:$PORT"
    echo "To stop container run: docker rm -f $CONTAINER_NAME"
else
    echo "Docker not found. Falling back to local Node.js installation..."
    if command -v node &> /dev/null; then
        echo "Installing dependencies..."
        npm install
        echo "Starting Node.js server..."
        PORT=$PORT npm start
    else
        echo "Error: Neither Docker nor Node.js is installed."
        exit 1
    fi
fi
