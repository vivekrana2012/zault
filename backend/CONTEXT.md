# Backend — Context

> Backend-specific decisions, state, and notes. For system-wide architecture, see root `CONTEXT.md`.

## Stack

- Java 25 (Amazon Corretto) + Spring Boot 4.0.6
- Maven (wrapper: `./mvnw`)
- SQLite via JPA + Hibernate community dialect
- GraalVM native image for production Docker image
- springdoc-openapi for API spec generation
- Spring Security + JWT (HTTP-only cookie) for authentication
- bcrypt (cost 12) for password hashing

## API Design

- All endpoints under `/api/` prefix
- OpenAPI spec auto-generated from controller annotations → `docs/api/openapi.yaml`
- Swagger UI available at `/swagger-ui.html` in dev

## Current Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (Spring Boot Actuator) |
| POST | `/api/auth/login` | Authenticate user, returns JWT cookie |
| POST | `/api/auth/logout` | Clears JWT cookie |
| GET | `/api/auth/me` | Returns current authenticated user |

## Authentication

- Passwords stored as bcrypt hashes (cost factor 12) — never reversible
- JWT issued in HTTP-only, Secure, SameSite=Strict cookie (`zault_token`)
- JWT signed with HS256, secret from `JWT_SECRET` env var (min 32 chars)
- Token expiry configurable via `JWT_EXPIRY` (default: 1 hour)
- CSRF protection via `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header
- Account lockout after 5 failed attempts for 15 minutes
- Timing-attack mitigation on login (bcrypt runs even for unknown usernames)
- Initial admin user seeded from `ZAULT_ADMIN_PASSWORD` env var on first startup

## Data Model

### Users table
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT (PK) | Auto-increment |
| username | VARCHAR(50) | Unique, lowercase |
| password_hash | VARCHAR(72) | bcrypt |
| failed_attempts | INT | Reset on successful login |
| lockout_until | TIMESTAMP | Null when not locked |
| created_at | TIMESTAMP | Immutable |

_Next steps: Portfolio, Holding, Transaction entities._

## Technical Debt

_None yet._
