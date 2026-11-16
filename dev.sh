#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🧹 Temizleniyor..."
dot_clean "$SCRIPT_DIR"
echo "🐳 Dev ortamı başlatılıyor..."
cd "$SCRIPT_DIR"
docker compose -f docker-compose.dev.yml up --build
# ref: 5c5c28bf7feb233530bd1b12f226d78e⁠​‍⁠‌‌⁠​‌‌⁠​​‍‍​‍⁠⁠⁠‌⁠⁠⁠⁠‍‍⁠​‍​⁠​⁠‌‌​⁠​​‍⁠⁠‌​‌‍⁠​‌​‍⁠⁠​‍​‍‌‍⁠‌‌⁠‍​⁠‍
