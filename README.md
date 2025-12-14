# School Survey Application

A  data collection application for managing school eye health surveys across 60 districts with 40 partners.

**Tech Stack**: Svelte 5 | SvelteKit | PostgreSQL 18 | Docker | Drizzle ORM | Zod Validation

---

## Quick Start

### Prerequisites
- Docker & Docker Compose (v3.8+)
- Node.js 20+ (for local development)
- OpenSSL (for generating secrets)

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd schoo_survey/school-app
```

### 2. Generate Secrets
```bash
./scripts/setup-secrets.sh
```

This creates the `secrets/` directory with encrypted credentials:
- `db_user.txt` - Database username
- `db_password.txt` - Generated random password
- `database_url.txt` - Full connection string
- `session_secret.txt` - Session encryption secret

### 3. Start Services
```bash
docker compose up -d
```

This starts:
- **PostgreSQL 18** on `localhost:5442` (mapped from container port 5432)

### 4. Run Database Migrations
```bash
npm run db:migrate

npm run db:seed
```


Test Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
National Admin:   admin@example.com / password123
Partner Manager:  manager@example.com / password123
Team Member:      team@example.com / password123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 5. Start Development Server
```bash
npm run dev
```

The SvelteKit app will be available on `http://localhost:5173/`

### 6. Access the Application
Open `http://localhost:5173/` in your browser

---

## Secrets Setup

### Automated Setup (Recommended)
```bash
./scripts/setup-secrets.sh
```

### Manual Setup
If you prefer to set up secrets manually:

1. **Create secrets directory**:
   ```bash
   mkdir -p secrets
   ```

2. **Generate database credentials**:
   ```bash
   echo "survey_admin" > secrets/db_user.txt
   openssl rand -base64 32 | tr -d "=+/" | cut -c1-25 > secrets/db_password.txt
   ```

3. **Generate session secret**:
   ```bash
   openssl rand -base64 32 > secrets/session_secret.txt
   ```

4. **Create database URL**:
   ```bash
   DB_USER=$(cat secrets/db_user.txt)
   DB_PASS=$(cat secrets/db_password.txt)
   echo "postgresql://${DB_USER}:${DB_PASS}@db:5432/school_survey" > secrets/database_url.txt
   ```

5. **Set proper permissions**:
   ```bash
   chmod 600 secrets/*
   ```

### Environment Variables
Copy `.env.example` to `.env` and update as needed:

```bash
cp .env.example .env
```

Key variables:
- `DB_USER` - Database username (default: survey_admin)
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: school_survey)
- `DB_HOST` - Database host (use `db` in Docker, `localhost` locally)
- `DB_PORT` - Database port (default: 5432)
- `SESSION_SECRET` - Session encryption secret
- `NODE_ENV` - Environment (development/production)
- `PORT` - Application port (default: 3000)

---

## Container Setup

### Docker Compose Configuration
The application uses Docker Compose with the following services:

#### Database Service (`school_survey_db`)
- **Image**: postgres:18-alpine
- **Container Name**: school_survey_db
- **Port**: 5442:5432 (host:container)
- **Environment**: Uses Docker secrets for credentials
- **Database**: school_survey
- **Volume**: Persistent data storage (postgres_data)
- **Health Check**: Automated database readiness checks
- **Network**: survey_network
- **Restart Policy**: unless-stopped

#### Secrets Management
Docker Compose uses file-based secrets:
```yaml
secrets:
  db_user:
    file: ./secrets/db_user.txt
  db_password:
    file: ./secrets/db_password.txt
  database_url:
    file: ./secrets/database_url.txt
  session_secret:
    file: ./secrets/session_secret.txt
```

### Container Commands

#### Start Services
```bash
docker compose up -d
```

#### View Logs
```bash
docker compose logs -f app
docker compose logs -f db
```

#### Stop Services
```bash
docker compose down
```

#### Access Containers
```bash
# Access database container
docker compose exec school_survey_db psql -U survey_admin -d school_survey
```

#### Database Access from Host
```bash
PGPASSWORD=$(cat secrets/db_password.txt) psql \
  -h localhost \
  -p 5442 \
  -U survey_admin \
  -d school_survey
```

---

## Application Setup

### Development Workflow

#### 1. Initial Setup
```bash
# Navigate to app directory
cd school-app

# Generate secrets
./scripts/setup-secrets.sh

# Start containers
docker compose up -d

# Run database migrations
docker compose exec app npm run db:migrate
```

#### 2. Development Commands
```bash
# Install dependencies
docker compose exec app npm install

# Run development server
docker compose exec app npm run dev

# Run tests
docker compose exec app npm test

# Lint code
docker compose exec app npm run lint

# Format code
docker compose exec app npm run format
```

#### 3. Database Operations
```bash

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed
```

### Project Structure
```
school-app/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/              # Database schema & queries
│   │   │   ├── auth.ts          # Authentication logic
│   │   │   ├── guards.ts        # Authorization guards
│   │   │   └── audit.ts         # Audit logging
│   │   ├── forms/               # Form validation
│   │   └── validation/          # Zod schemas
│   └── routes/
│       ├── (auth)/              # Login/logout
│       └── (app)/               # Protected routes
├── drizzle/                     # Database migrations
├── scripts/                     # Setup scripts
├── secrets/                     # Docker secrets (generated)
├── docker-compose.yml           # Docker configuration
├── Dockerfile                   # Development container
├── Dockerfile.prod              # Production container
└── .env.example                 # Environment template
```

### Database Schema
Key tables managed by Drizzle ORM:
- `users` - User accounts with role-based access
- `partners` - Partner organizations (40 total)
- `districts` - Geographic districts (60 total)
- `schools` - Schools uploaded by partners
- `survey_responses` - Child-level survey data
- `sessions` - Session management
- `audit_logs` - Audit trail for sensitive operations

---

## Common Tasks

### Reset Database
```bash
# Stop containers
docker compose down

# Remove database volume
docker volume rm school-app_postgres_data
# Note: Check actual volume name with `docker volume ls`

# Restart containers
docker compose up -d

# Run migrations
docker compose exec app npm run db:push
```

### Update Secrets
```bash
# Regenerate all secrets
./scripts/setup-secrets.sh

# Restart containers to pick up new secrets
docker compose down && docker compose up -d
```

### Build for Production
```bash
# Build production image
docker build -f Dockerfile.prod -t school-survey:latest .

# Run production container
docker run -p 3000:3000 --env-file .env school-survey:latest
```

---

## Troubleshooting

### Port Conflicts
If ports are already in use, modify `docker-compose.yml`:
```yaml
services:
  school_survey_db:
    ports:
      - "5443:5432"      # Change database port mapping
```

### Database Connection Issues
```bash
# Check database logs
docker compose logs db

# Check app logs
docker compose logs app

# Verify secrets exist
ls -la secrets/

# Test database connection
docker compose exec school_survey_db pg_isready -U survey_admin
```

### Permission Issues
```bash
# Fix secret file permissions
chmod 600 secrets/*
chown $USER:$USER secrets/*
```

### Container Issues
```bash
# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Clear node modules (if using app container)
# docker compose exec app rm -rf node_modules package-lock.json
# docker compose exec app npm install
```

---

## Production Deployment

### Security Checklist
- [ ] Generate strong, unique secrets
- [ ] Use managed PostgreSQL service
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Implement CI/CD pipeline
- [ ] Perform security audit
- [ ] Set up proper firewall rules

### Environment Configuration
For production, update `.env`:
```bash
NODE_ENV=production
DB_HOST=your-production-db-host
SESSION_SECRET=your-production-session-secret
```

### Docker Production Build
```bash
# Build and tag for production
docker build -f Dockerfile.prod -t school-survey:prod .

# Run with production settings
docker run -d \
  --name school-survey-prod \
  -p 3000:3000 \
  --env-file .env.production \
  school-survey:prod
```

---

## Documentation

- **[Implementation Plan](../PLAN/Plan.md)** - Architecture & design decisions
- **[Implementation Tracker](../IMPLEMENTATION_TRACKER.md)** - Progress tracking
- **[Database Schema](./src/lib/server/db/schema.ts)** - Complete schema definition
- **[Setup Guide](./SETUP.md)** - Detailed setup instructions

---

## Support

For issues or questions:
1. Check this README first
2. Review the [Setup Guide](./SETUP.md) for detailed instructions
3. Check Docker logs: `docker compose logs`
4. Verify all secrets are properly configured

---

## License

Internal use only - School Survey Application


Email: admin@example.com
User Code: U1003
Temporary Password: saluters-sennight-inkwood
