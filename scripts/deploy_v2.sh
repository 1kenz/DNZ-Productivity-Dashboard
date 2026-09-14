#!/bin/bash
set -e

# Always run from the project root, regardless of where this script is invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Configuration
IMAGE_NAME="productivity-dashboard"
TAG="v2.5-fixed"
FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

echo "🚀 Starting Deployment for $FULL_IMAGE_NAME"
echo "📁 Build context: $PROJECT_DIR"

# 1. Build the Docker Image
echo "📦 Building Docker Image..."
docker build -t $FULL_IMAGE_NAME .

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ Docker Build failed! Exiting."
    exit 1
fi

echo "✅ Docker build successful!"

# 2. Tag and Push to Local Registry (localhost:5001)
echo "🏷️ Tagging for local registry..."
docker tag $FULL_IMAGE_NAME localhost:5001/$FULL_IMAGE_NAME

echo "🚀 Pushing to localhost:5001..."
docker push localhost:5001/$FULL_IMAGE_NAME || echo "⚠️ Could not push to local registry. Is it running on port 5001?"

# 3. Start with Docker Compose
echo "🛠️ Starting Service with Docker Compose..."
docker compose up -d

echo "🎉 Deployment Complete!"
echo "👉 App is running at http://localhost:9999"
