#!/bin/bash
set -euo pipefail

# School Survey Application - Docker Secrets Setup Script
# Idempotent: preserves existing secrets, creates missing ones.

echo "=========================================="
echo "School Survey Application - Setup Secrets"
echo "=========================================="
echo ""

SECRET_DIR="secrets"
mkdir -p "$SECRET_DIR"

# Defaults favor local host/forwarded port; override with DB_HOST/DB_PORT for other setups (e.g., inside Docker network).
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5442}"
DB_NAME="${DB_NAME:-school_survey}"
DB_USER_FILE="$SECRET_DIR/db_user.txt"
DB_PASSWORD_FILE="$SECRET_DIR/db_password.txt"
DB_URL_FILE="$SECRET_DIR/database_url.txt"

create_static_secret() {
	local file="$1"
	local value="$2"
	local label="$3"

	if [ -s "$file" ]; then
		echo "✓ Existing ${label} kept: $file" >&2
	else
		echo "$value" >"$file"
		echo "✓ Created ${label}: $file" >&2
	fi
}

create_random_secret() {
	local file="$1"
	local label="$2"
	local val

	if [ -s "$file" ]; then
		val="$(cat "$file")"
		echo "✓ Existing ${label} kept: $file" >&2
	else
		val="$(openssl rand -base64 32)"
		echo "$val" >"$file"
		echo "✓ Created ${label}: $file" >&2
	fi

	printf "%s" "$val"
}

generate_safe_db_password() {
	python3 - <<'PY'
import secrets, string
alphabet = string.ascii_letters + string.digits + '_'
print(''.join(secrets.choice(alphabet) for _ in range(32)))
PY
}

ensure_db_password() {
	local file="$1"
	local label="$2"
	local val
	local pattern='^[A-Za-z0-9_]+$'

	if [ -s "$file" ]; then
		val="$(cat "$file")"
		if [[ "$val" =~ $pattern ]]; then
			echo "✓ Existing ${label} kept: $file" >&2
		else
			val="$(generate_safe_db_password)"
			echo "$val" >"$file"
			echo "✓ Regenerated ${label} with safe charset (A-Z a-z 0-9 _): $file" >&2
		fi
	else
		val="$(generate_safe_db_password)"
		echo "$val" >"$file"
		echo "✓ Created ${label}: $file" >&2
	fi

	printf "%s" "$val"
}

echo "Ensuring database user secret..."
create_static_secret "$DB_USER_FILE" "survey_admin" "DB user"

echo "Ensuring database password..."
DB_PASSWORD="$(ensure_db_password "$DB_PASSWORD_FILE" "DB password")"
export DB_PASSWORD

echo "Ensuring database URL..."
URL_PASSWORD="$(python3 - <<'PY'
import os, urllib.parse
print(urllib.parse.quote(os.environ["DB_PASSWORD"], safe=""))
PY
)"
EXPECTED_URL="postgresql://survey_admin:${URL_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
if [ -s "$DB_URL_FILE" ]; then
	CURRENT_URL="$(cat "$DB_URL_FILE")"
	if [ "$CURRENT_URL" != "$EXPECTED_URL" ]; then
		echo "$EXPECTED_URL" >"$DB_URL_FILE"
		echo "✓ Updated database URL to match current DB password: $DB_URL_FILE" >&2
	else
		echo "✓ Existing database URL kept: $DB_URL_FILE" >&2
	fi
else
	echo "$EXPECTED_URL" >"$DB_URL_FILE"
	echo "✓ Created database URL: $DB_URL_FILE" >&2
fi

update_env_var() {
	local file="$1"
	local key="$2"
	local value="$3"
	local tmp

	if [ -f "$file" ]; then
		if grep -q "^${key}=" "$file"; then
			tmp="$(mktemp)"
			awk -v k="$key" -v v="$value" '
				BEGIN { updated = 0 }
				$0 ~ "^" k "=" {
					print k "=\"" v "\""
					updated = 1
					next
				}
				{ print }
				END {
					if (updated == 0) {
						print k "=\"" v "\""
					}
				}
			' "$file" >"$tmp" && mv "$tmp" "$file"
		else
			echo "${key}=\"${value}\"" >>"$file"
		fi
	else
		echo "${key}=\"${value}\"" >"$file"
	fi
	echo "✓ Ensured ${key} in ${file}" >&2
}

echo "Ensuring .env connection components..."
update_env_var ".env" "DB_HOST" "$DB_HOST"
update_env_var ".env" "DB_PORT" "$DB_PORT"
update_env_var ".env" "DB_NAME" "$DB_NAME"
update_env_var ".env" "DB_USER" "$(cat "$DB_USER_FILE")"
update_env_var ".env" "DB_PASSWORD" "$DB_PASSWORD"

echo "Ensuring session secret..."
create_random_secret "$SECRET_DIR/session_secret.txt" "session secret" >/dev/null

echo ""
echo "=========================================="
echo "Secrets Setup Complete!"
echo "=========================================="
echo ""
echo "Secrets located in ./secrets/ (idempotent: existing files are kept)."
echo "To use with Docker Compose, run:"
echo "  docker compose up -d"
echo ""
echo "⚠️  IMPORTANT:"
echo "  - Do NOT commit the secrets/ directory to Git"
echo "  - Keep these secrets secure"
echo "  - secrets/ is already in .gitignore"
echo ""
