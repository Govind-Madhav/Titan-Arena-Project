#!/bin/sh
set -e

# Default to MySQL port if not set
PORT_TO_CHECK="${DB_PORT:-3306}"
HOST_TO_CHECK="${DB_HOST:-database}"

echo "⏳ Waiting for database at $HOST_TO_CHECK:$PORT_TO_CHECK..."

# Loop until netcat succeeds
until nc -z "$HOST_TO_CHECK" "$PORT_TO_CHECK"; do
  echo "Sleeping..."
  sleep 1
done

echo "✅ Database is up"

echo "📦 Running migrations..."
npm run db:push

echo "🚀 Starting backend..."
exec npm start
