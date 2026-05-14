# Zault

Personal investment dashboard for portfolio analysis.

## Quick Start

```bash
# Local dev with Docker (builds everything)
make dev

# Or run frontend/backend separately with hot reload
make fe-dev   # React dev server on :5173
make be-dev   # Spring Boot on :8080
```

## Project Structure

```
├── frontend/           React + Vite + TypeScript
├── backend/            Java 25 + Spring Boot + Maven (GraalVM native image)
├── docs/api/           OpenAPI spec (auto-generated from backend)
├── docker-compose.yml  Local development
├── docker-compose.prod.yml  Production (Docker Hub + Watchtower)
├── Makefile            All commands in one place
├── CONTEXT.md          Architecture & project state
└── SCRATCHPAD.md       Raw notes
```

## Commands

Run `make help` to see all available targets.

## Deployment

Push to `main` → GitHub Actions builds Docker images → Docker Hub → Watchtower auto-pulls on the Debian laptop.

See [CONTEXT.md](CONTEXT.md) for full architecture details.
