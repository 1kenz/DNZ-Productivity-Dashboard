#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🧹 Temizleniyor..."
dot_clean "$SCRIPT_DIR"
echo "🐳 Dev ortamı başlatılıyor..."
cd "$SCRIPT_DIR"
docker compose -f docker-compose.dev.yml up --build
