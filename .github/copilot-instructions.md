# Copilot Instructions — Zault

## Project Overview

Zault is a personal investment dashboard. Monorepo with:
- **`frontend/`** — React + Vite + TypeScript (served by nginx in production)
- **`backend/`** — Java 25 + Spring Boot + Maven (SQLite database, GraalVM native image)

Each sub-project has its own `.instructions.md` with project-specific conventions.

## Key Files to Read First

1. **`CONTEXT.md`** — System-wide architecture decisions and deployment info.
2. **`backend/CONTEXT.md`** — Backend-specific state and decisions.
3. **`frontend/CONTEXT.md`** — Frontend-specific state and decisions.
4. **`docs/api/openapi.yaml`** — The API contract (auto-generated from backend). This is the boundary between frontend and backend.
5. **`SCRATCHPAD.md`** — Raw, unstructured notes from the developer.

## Context Scoping

### Backend

- Read `backend/CONTEXT.md` and `docs/api/openapi.yaml`. Do NOT read frontend code.

### Frontend

When making **any** frontend change, follow this discovery sequence:

1. **Read `frontend/.instructions.md`** — contains hard visual/aesthetic rules and component guidance. This file is auto-loaded for `frontend/**` but read it before writing UI code.
2. **Read `frontend/CONTEXT.md`** — current state, technical decisions, component conventions.
3. **If you need detailed reference** (color tokens, chart specs, animation timings, full component inventory) → read `frontend/design.md`.

Do NOT read backend Java code. The API spec (`docs/api/openapi.yaml`) is the single source of truth for the contract between frontend and backend.

## Conventions

- **All CLI commands** should reference `Makefile` targets when possible (e.g., suggest `make dev` not `docker compose up --build`).
- **Backend** uses Maven (not Gradle). The wrapper (`./mvnw`) is checked in.
- **Frontend** uses npm (not yarn/pnpm).
- **Docker Compose** is the orchestration layer. Two compose files:
  - `docker-compose.yml` — local development (builds from source)
  - `docker-compose.prod.yml` — production (pulls from Docker Hub, includes Watchtower)
- **SQLite** is the database, stored in a Docker named volume (`zault_data`).
- **Environment variables** are documented in `.env.example`. Never hardcode secrets.

## API Workflow

1. Change backend controllers → annotations drive the spec.
2. Use the `sync-api-spec` skill to export `docs/api/openapi.yaml` and generate `frontend/src/api/schema.d.ts`.
3. The skill handles starting the backend, exporting, generating types, and stopping.

## When Asked to "Sync" or "Update Docs"

1. Read `SCRATCHPAD.md` for any new raw notes.
2. Incorporate them into the appropriate `CONTEXT.md` (root, backend, or frontend).
3. Clear the processed entries from `SCRATCHPAD.md` (leave the file with just the header).
