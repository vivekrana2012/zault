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

## Shared Data Docs

- Tradebook CSV domain knowledge and column dictionary: [docs/domain/tradebook.md](../docs/domain/tradebook.md)

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
| POST | `/api/tradebook/files` | Upload CSV tradebook file(s), multipart/form-data |
| GET | `/api/tradebook/files` | List uploaded tradebook files |
| DELETE | `/api/tradebook/files/{fileId}` | Delete file and its owned trades, recomputes allocations |
| GET | `/api/tradebook/allocations` | Get pre-computed allocation data (net positions by ISIN) |
| GET | `/api/tradebook/trades` | Paginated trade listing (optional fileId filter) |

## Authentication

- Passwords stored as bcrypt hashes (cost factor 12) — never reversible
- JWT issued in HTTP-only, Secure, SameSite=Strict cookie (`zault_token`)
- JWT signed with HS256, secret from `JWT_SECRET` env var (min 32 chars)
- Token expiry configurable via `JWT_EXPIRY` (default: 1 hour)
- CSRF protection via `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header
- Account lockout after 5 failed attempts for 15 minutes
- Timing-attack mitigation on login (bcrypt runs even for unknown usernames)
- Users self-register via `/api/auth/register`

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
- **Per-user DB** — update `src/main/resources/user-schema.sql`, then re-run `scripts/create-template-db.sh`

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

### Per-user DB — Sharded Directory Structure

Each user gets their own SQLite file stored in a 2-level sharded directory layout:

```
data/users/{hex[0:2]}/{hex[2:4]}/{uuid}/{uuid}.db
```

Where `hex` is the UUID with dashes removed. Example for user `f5153a7b-...`:

```
data/users/f5/15/f5153a7b-.../f5153a7b-....db
```

#### Template-based provisioning

New user databases are **copied from a pre-built template** rather than running SQL at runtime:

1. Schema is defined in `src/main/resources/user-schema.sql`
2. `scripts/create-template-db.sh` builds `data/users/.template-user.db` from that schema (with WAL mode and pragmas pre-applied)
3. On first access, `UserDatabaseService` copies the template to the user's sharded path and stamps `user_db_meta.created_at`

The template must exist before the application starts. The app will fail fast with an error if it's missing.

#### Migration from flat layout

`scripts/migrate-user-dbs.sh` migrates legacy flat files (`data/users/{uuid}.db`) into the new sharded structure. Safe to run multiple times (idempotent).

#### Connection management

- Connections are cached via Caffeine (configurable max size and idle eviction)
- SQLite pragmas applied on every connection: `journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout`
- Configurable via `zault.user-db.*` properties (`base-dir`, `busy-timeout-ms`, `max-connections`, `idle-timeout-minutes`)

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
| amount | NUMERIC | Not null, `>= 0`, supports up to 4 decimal places |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP, updated on write |

Indexes: `idx_investments_category` on `investments(category)`

#### `tradebook_files`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID assigned at upload |
| filename | TEXT | Not null, original filename |
| row_count | INTEGER | Not null, trades persisted from this file |
| uploaded_at | TEXT | Default CURRENT_TIMESTAMP |

#### `trades`
| Column | Type | Notes |
|--------|------|-------|
| trade_id | TEXT (PK) | Natural key from CSV — dedup anchor |
| file_id | TEXT | Not null, FK → tradebook_files.id |
| symbol | TEXT | Not null |
| isin | TEXT | Not null, aggregation key |
| trade_date | TEXT | Not null, YYYY-MM-DD |
| exchange | TEXT | Not null |
| segment | TEXT | Not null |
| series | TEXT | Not null |
| trade_type | TEXT | Not null, 'buy' or 'sell' |
| auction | INTEGER | Not null, 0/1 |
| quantity | TEXT | Not null, decimal as text for precision |
| price | TEXT | Not null, decimal as text for precision |
| order_id | TEXT | Not null |
| order_execution_time | TEXT | Not null, ISO 8601 |

Indexes: `idx_trades_isin` on `trades(isin)`, `idx_trades_file_id` on `trades(file_id)`

#### `allocations`
| Column | Type | Notes |
|--------|------|-------|
| isin | TEXT (PK) | Security identity |
| symbol | TEXT | Not null |
| net_quantity | TEXT | Not null, buy_qty - sell_qty |
| invested_amount | TEXT | Not null, buy_amount - sell_amount, rounded to 4 decimal places |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

Pre-computed on every file upload/delete. Only positive net positions stored.

## Technical Debt

_None yet._
