#!/bin/bash

# School Survey Application - Docker Secrets Setup Script
# This script generates the necessary secrets for Docker Compose

echo "=========================================="
echo "School Survey Application - Setup Secrets"
echo "=========================================="
echo ""

# Create secrets directory
echo "Creating secrets directory..."
mkdir -p secrets

# Generate database user (default: survey_admin)
echo "survey_admin" > secrets/db_user.txt
echo "✓ Created: secrets/db_user.txt"

# Generate random database password
echo "Generating random database password..."
DB_PASSWORD=$(openssl rand -base64 32)
echo "$DB_PASSWORD" > secrets/db_password.txt
echo "✓ Created: secrets/db_password.txt"

# Generate database URL
echo "Generating database URL..."
DATABASE_URL="postgresql://survey_admin:${DB_PASSWORD}@db:5432/school_survey"
echo "$DATABASE_URL" > secrets/database_url.txt
echo "✓ Created: secrets/database_url.txt"

# Generate session secret
echo "Generating session secret..."
SESSION_SECRET=$(openssl rand -base64 32)
echo "$SESSION_SECRET" > secrets/session_secret.txt
echo "✓ Created: secrets/session_secret.txt"

echo ""
echo "=========================================="
echo "Secrets Setup Complete!"
echo "=========================================="
echo ""
echo "Secrets created in ./secrets/ directory"
echo "To use with Docker Compose, run:"
echo "  docker compose up -d"
echo ""
echo "⚠️  IMPORTANT:"
echo "  - Do NOT commit the secrets/ directory to Git"
echo "  - Keep these secrets secure"
echo "  - secrets/ is already in .gitignore"
echo ""
