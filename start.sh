#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until npx prisma db push --accept-data-loss; do
  echo "Database is unavailable - sleeping 2s..."
  sleep 2
done

echo "Database schema synchronized!"
exec node server.js
