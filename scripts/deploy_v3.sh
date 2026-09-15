#!/bin/bash
set -e

# Always run from the project root, regardless of where this script is invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Configuration
IMAGE_NAME="productivity-dashboard"
TAG="v3.0"
FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
REGISTRY="localhost:5001"

echo "🚀 Starting Deployment for $FULL_IMAGE_NAME"
echo "📁 Build context: $PROJECT_DIR"

# 1. Build the Docker Image
echo "📦 [1/3] Building Docker Image ($FULL_IMAGE_NAME)..."
docker build -t $FULL_IMAGE_NAME .
docker tag $FULL_IMAGE_NAME $IMAGE_NAME:latest
docker tag $FULL_IMAGE_NAME $IMAGE_NAME:v3

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ Docker Build failed! Exiting."
    exit 1
fi

echo "✅ Docker build successful!"

# 2. Tag and Push to Local Registry (localhost:5001)
echo "🏷️ [2/3] Tagging for local registry ($REGISTRY)..."
docker tag $FULL_IMAGE_NAME $REGISTRY/$FULL_IMAGE_NAME
docker tag $FULL_IMAGE_NAME $REGISTRY/$IMAGE_NAME:v3
docker tag $FULL_IMAGE_NAME $REGISTRY/$IMAGE_NAME:latest

echo "🚀 Pushing to local registry at $REGISTRY..."
docker push $REGISTRY/$FULL_IMAGE_NAME || echo "⚠️ Could not push $FULL_IMAGE_NAME to local registry. Is it running on port 5001?"
docker push $REGISTRY/$IMAGE_NAME:v3 || true
docker push $REGISTRY/$IMAGE_NAME:latest || true

# 3. Start with Docker Compose
echo "🛠️ [3/3] Starting Service with Docker Compose..."
# Remove any previous v2 dashboard container to free port 9999
docker stop i-kenz-dashboard-v2 2>/dev/null || true
docker rm i-kenz-dashboard-v2 2>/dev/null || true

# If productivity_db container already exists, safely start the v3 dashboard service without container name collision
if docker ps -a --format '{{.Names}}' | grep -q "^productivity_db$"; then
  echo "ℹ️ Existing database container 'productivity_db' detected. Starting v3 dashboard..."
  docker compose up -d --no-recreate postgres 2>/dev/null || true
  docker compose up -d --force-recreate productivity-dashboard
else
  docker compose up -d
fi

echo "🎉 Deployment Complete!"
echo "👉 App is running at http://localhost:9999"
