#!/bin/sh
set -e

# Create .env.local file from secrets for reliable environment variable access
ENV_FILE="/app/.env.local"
rm -f "$ENV_FILE"  # Clear any existing file

if [ -f /run/secrets/database_url ]; then
  echo "DATABASE_URL=$(cat /run/secrets/database_url)" >> "$ENV_FILE"
fi

if [ -f /run/secrets/session_secret ]; then
  echo "SESSION_SECRET=$(cat /run/secrets/session_secret)" >> "$ENV_FILE"
fi

if [ -f /run/secrets/db_user ]; then
  echo "DB_USER=$(cat /run/secrets/db_user)" >> "$ENV_FILE"
fi

if [ -f /run/secrets/db_password ]; then
  echo "DB_PASSWORD=$(cat /run/secrets/db_password)" >> "$ENV_FILE"
fi

# Source the .env.local file to load environment variables
set -a
. "$ENV_FILE"
set +a

# Execute the command
exec "$@"
