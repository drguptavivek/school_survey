# School Survey Application - Setup Guide

A multi-tenant educational data collection application for managing school eye health surveys across 60 districts with 40 partners.

**Tech Stack**: Svelte 5 | SvelteKit | PostgreSQL 18 | Docker | Drizzle ORM | Zod Validation

---

## Prerequisites

- Docker & Docker Compose (v3.8+)
- Node.js 20+ (for local development)
- OpenSSL (for generating secrets)

---

## Quick Start (Docker)

### 1. Generate Secrets
```bash
./scripts/setup-secrets.sh
```

This creates the `secrets/` directory with encrypted credentials:
- `db_user.txt` - Database username
- `db_password.txt` - Generated random password
- `database_url.txt` - Full connection string
- `session_secret.txt` - Session encryption secret

### 2. Start Services
```bash
docker compose up -d
```

This starts:
- **PostgreSQL 18** on `localhost:5432`


### 3. Run Migrations
```bash
npm run db:push
```

### 4. Access the Application
- Open `http://localhost:5174` in your browser
- Login with initial admin credentials (to be set up)

---

## Development Workflow

### Local Development (with Docker)

1. **Start containers**:
   ```bash
   docker compose up -d
   ```

2. **View logs**:
   ```bash
   docker compose logs -f app
   ```

3. **Run migrations after schema changes**:
   ```bash
   docker compose exec app npm run db:push
   ```

4. **Access database directly**:
   ```bash
   # Inside container
   docker compose exec db psql -U survey_admin -d school_survey

   # Or from host (requires PostgreSQL client)
   PGPASSWORD=$(cat secrets/db_password.txt) psql \
     -h localhost \
     -U survey_admin \
     -d school_survey
   ```

### Database Schema

Schema files are in `src/lib/server/db/schema.ts` using Drizzle ORM.

**Key tables**:
- `users` - User accounts with roles (national_admin, data_manager, partner_manager, team_member)
- `partners` - Partner organizations (40 total)
- `districts` - Geographic districts (60 total)
- `schools` - Schools uploaded by partners
- `survey_responses` - Child-level survey data
- `sessions` - Session management for auth
- `audit_logs` - Audit trail for sensitive operations

---

## Project Structure

```
school-app/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/              # Database schema & queries
│   │   │   ├── auth.ts          # Authentication logic
│   │   │   ├── guards.ts        # Authorization guards
│   │   │   └── services/        # Business logic
│   │   └── components/          # Shared UI components
│   └── routes/
│       ├── (auth)/              # Login/logout
│       └── (app)/               # Protected routes
├── docker-compose.yml           # Docker configuration
├── Dockerfile                   # Development container
├── Dockerfile.prod              # Production container
├── .env.example                 # Environment template
├── drizzle.config.ts            # ORM configuration
├── tailwind.config.ts           # Styling
└── vite.config.ts              # Build configuration
```

---

## Environment Variables

Copy `.env.example` to `.env` and update as needed:

```bash
# Database
DB_USER=survey_admin
DB_PASSWORD=your_password
DB_NAME=school_survey
DB_HOST=db              # 'db' in Docker, 'localhost' locally
DB_PORT=5432

# Session
SESSION_SECRET=your_session_secret

# App
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
```

---

## Common Tasks

### Reset Database
```bash
# Stop containers
docker compose down

# Remove database volume
docker volume rm schoo_survey_postgres_data

# Restart containers
docker compose up -d

# Run migrations
docker compose exec app npm run db:push
```

### View Database
```bash
docker compose exec db psql -U survey_admin -d school_survey
```

### Run Tests
```bash
docker compose exec app npm test
```

### Lint & Format
```bash
docker compose exec app npm run lint
docker compose exec app npm run format
```

### Build for Production
```bash
docker build -f Dockerfile.prod -t school-survey:prod .
```

---

## Troubleshooting

### Port Already in Use
If ports 3000, 5173, or 5432 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"      # Change 3000 to 3001
  - "5174:5173"      # Change 5173 to 5174
  - "5433:5432"      # Change 5432 to 5433
```

### Database Connection Failing
```bash
# Check if database is ready
docker compose logs db

# Check app logs for connection errors
docker compose logs app

# Verify secrets are created
ls -la secrets/
```

### Node Modules Issues
```bash
# Clear and reinstall
docker compose exec app rm -rf node_modules package-lock.json
docker compose exec app npm install
```

---

## Production Deployment

### Create Production Docker Image
```bash
# Build using production Dockerfile
docker build -f Dockerfile.prod -t school-survey:latest .

# Push to registry (e.g., Docker Hub)
docker tag school-survey:latest your-registry/school-survey:latest
docker push your-registry/school-survey:latest
```

### Production Checklist
- [ ] Generate strong secrets
- [ ] Use PostgreSQL 18 managed service
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring & logging
- [ ] Set up CI/CD pipeline
- [ ] Perform security audit
- [ ] Create admin user account

---

## Documentation

- **[Implementation Plan](../PLAN/Plan.md)** - Architecture & design decisions
- **[Implementation Tracker](../IMPLEMENTATION_TRACKER.md)** - Progress tracking
- **[Database Schema](./src/lib/server/db/schema.ts)** - Complete schema definition
- **[API Documentation](./API.md)** - API endpoints (coming soon)

---

## Support

For issues or questions:
1. Check the [Implementation Plan](../PLAN/Plan.md) for design decisions
2. Review [troubleshooting section](#troubleshooting) above
3. Check Docker logs: `docker compose logs`

---

## License

Internal use only - School Survey Application
