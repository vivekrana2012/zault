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
| GET | `/api/investments` | List current user investment rows |
| POST | `/api/investments` | Create one investment row |
| PATCH | `/api/investments/{id}` | Update only amount for one row |
| DELETE | `/api/investments/{id}` | Delete one investment row |

## Authentication

- Passwords stored as bcrypt hashes (cost factor 12) — never reversible
- JWT issued in HTTP-only, Secure, SameSite=Strict cookie (`zault_token`)
- JWT signed with HS256, secret from `JWT_SECRET` env var (min 32 chars)
- Token expiry configurable via `JWT_EXPIRY` (default: 1 hour)
- CSRF protection via `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header
- Account lockout after 5 failed attempts for 15 minutes
- Timing-attack mitigation on login (bcrypt runs even for unknown usernames)
- Initial admin user seeded from `ZAULT_ADMIN_PASSWORD` env var on first startup

## API Versioning

- Header-based versioning via `X-API-Version`
- Supported value currently: `1`
- Header is required for `/api/**` except:
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/health`
- Error shape for missing/unsupported versions:
  - `error` (message)
  - `code` (`missing_api_version` or `unsupported_api_version`)
  - `supportedVersions` (array)
  - `receivedVersion` (null for missing header)
  - `path`

## Data Model

All schema changes must be reflected here and in the relevant source:
- **Main DB** (`data/zault.db`) — update `src/main/resources/schema.sql`
- **Per-user DB** (`data/users/{id}.db`) — update `UserDatabaseService.initializeSchema()`

### Main DB — `data/zault.db`

Managed by Spring SQL init from `schema.sql`. Hibernate DDL is disabled.

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | Application-assigned UUID |
| username | VARCHAR(50) | Unique |
| password_hash | VARCHAR(72) | bcrypt (cost 12) |
| email | VARCHAR(255) | Unique |
| display_name | VARCHAR(100) | Nullable |
| email_verified | BOOLEAN | Default false |
| failed_attempts | INTEGER | Default 0, reset on successful login |
| lockout_until | TIMESTAMP | Null when not locked |
| created_at | TIMESTAMP | Immutable, default CURRENT_TIMESTAMP |

### Per-user DB — `data/users/{userId}.db`

Each user gets their own SQLite file named after their UUID user ID. Schema is applied by `UserDatabaseService.initializeSchema()` on first connection.

#### `user_db_meta`
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT (PK) | |
| value | TEXT | Seeded with `created_at` = CURRENT_TIMESTAMP on init |

#### `investments`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| category | TEXT | Not null |
| amount | NUMERIC | Not null, `>= 0` |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP, updated on write |

Indexes: `idx_investments_category` on `investments(category)`

_Next steps: Portfolio, Holding, Transaction entities._

## Technical Debt

_None yet._
