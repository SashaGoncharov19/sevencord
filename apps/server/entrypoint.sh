#!/bin/sh
set -e

echo "⏳ Waiting for database to be ready..."
# Wait up to 30 seconds for db to accept connections
for i in $(seq 1 30); do
  if bun run -e "
    import postgres from 'postgres';
    const sql = postgres(process.env.DATABASE_URL || 'postgres://webchat:webchat_password@db:5432/webchat_db', { max: 1 });
    await sql\`SELECT 1\`;
    await sql.end();
    console.log('DB ready');
  " 2>/dev/null; then
    break
  fi
  echo "  DB not ready yet ($i/30)..."
  sleep 1
done

echo "🗄  Running database migrations..."
bun run db:push

echo "🚀 Starting server..."
exec bun run src/index.ts
