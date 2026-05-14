# Zault — Project Context

> System-wide architecture and deployment. For project-specific context, see `backend/CONTEXT.md` and `frontend/CONTEXT.md`.

## Architecture

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  React   │──────▶│  nginx   │──────▶│  Spring   │
│  (Vite)  │ build │ :80      │ /api  │  Boot     │
└──────────┘       └──────────┘       │  :8080    │
                                      └────┬─────┘
                                           │
                                      ┌────▼─────┐
                                      │  SQLite   │
                                      │  (volume) │
                                      └──────────┘
```

- **Frontend:** React + TypeScript, built with Vite, served by nginx.
- **Backend:** Java 25 + Spring Boot, Maven build, GraalVM native image. Exposes REST API under `/api/`.
- **Database:** SQLite, stored in a Docker named volume (`zault_data`).
- **API contract:** `docs/api/openapi.yaml` (auto-generated from backend, the boundary between projects).
- **Deployment:** Docker Compose → Docker Hub → Watchtower on Debian laptop.
- **CI/CD:** GitHub Actions builds and pushes images on push to `main`.

## Tech Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Language (BE) | Java 25 + Spring Boot | Latest features, strong ecosystem |
| Language (FE) | React + TypeScript | Industry standard, good tooling |
| Database | SQLite | Single-user, zero config, file-based |
| Build tool | Maven | Standard, well-supported by Spring Native |
| Runtime | GraalVM native image | Fast startup, low memory footprint |
| API spec | springdoc-openapi | Auto-generated from code, Swagger UI in dev |
| FE API types | openapi-typescript | Types generated from spec, no manual sync |
| Deployment | Docker Compose + Watchtower | Hands-off, no SSH needed |
| CI/CD | GitHub Actions | Free, integrated with repo |
| Exposure | Cloudflare Tunnel | Free HTTPS, no port forwarding |

## API Workflow

1. Annotate backend controllers → springdoc generates spec.
2. `make api-spec` → exports `docs/api/openapi.yaml`.
3. `make api-types` → generates `frontend/src/api/schema.d.ts`.

## Current State

- **Phase:** Initial scaffold — health endpoint + bare React shell.
- **What works:** Project structure, Dockerfiles, CI/CD pipeline, Makefile, API spec pipeline.
- **What doesn't exist yet:** Actual investment analysis features, data models, API integrations.

## Next Steps

- [ ] Define initial data model (Portfolio, Holding, Transaction)
- [ ] Add a market data API integration (Alpha Vantage / Finnhub)
- [ ] Build the first dashboard view (portfolio summary)
- [ ] Set up the Debian laptop with `docker-compose.prod.yml`

## Technical Debt

_None yet — fresh project._
