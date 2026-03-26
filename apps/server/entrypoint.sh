#!/bin/sh
set -e

echo "⏳ Waiting for database to be ready..."
for i in $(seq 1 30); do
  if bun -e "
    import postgres from 'postgres';
    const sql = postgres(process.env.DATABASE_URL || 'postgres://webchat:webchat_password@db:5432/webchat_db', { max: 1, connect_timeout: 3 });
    await sql\`SELECT 1\`;
    await sql.end();
  " 2>/dev/null; then
    echo "✅ Database is ready!"
    break
  fi
  echo "  Waiting ($i/30)..."
  sleep 1
done

echo "🗄  Running database migrations..."
./node_modules/.bin/drizzle-kit push --config=drizzle.config.ts

echo "🚀 Starting server..."
exec bun run src/index.ts
