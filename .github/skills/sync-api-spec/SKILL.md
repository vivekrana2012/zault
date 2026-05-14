---
name: sync-api-spec
description: "Sync OpenAPI spec and TypeScript types after backend API changes. Use when: adding, modifying, or deleting Spring Boot controller endpoints, changing request/response DTOs, updating API annotations. Triggers: controller changes, endpoint changes, API spec, sync api, generate types, openapi update."
argument-hint: "Run after making backend API changes"
---

# Sync API Spec & Frontend Types

## When to Use

Run this skill **every time** you make changes to backend code that affects the API contract:
- Add, modify, or delete controller endpoints (`@GetMapping`, `@PostMapping`, etc.)
- Change request/response DTOs or entity classes exposed in API responses
- Update OpenAPI annotations (`@Operation`, `@Schema`, `@Tag`, etc.)

## Procedure

### 1. Start the backend (if not already running)

```bash
export JAVA_HOME="/Users/viv/Library/Java/JavaVirtualMachines/corretto-25.0.2/Contents/Home"
cd backend && ./mvnw spring-boot:run
```

Run this in a **background terminal**. Wait for it to be ready by polling the health endpoint:

```bash
# Poll until ready (max 60 seconds)
for i in $(seq 1 30); do
  curl -sf http://localhost:8080/api/health > /dev/null 2>&1 && break
  sleep 2
done
```

If port 8080 is already in use, check if the backend is already running by hitting `/api/health` first. If it responds, skip starting.

### 2. Export the OpenAPI spec

```bash
make api-spec
```

This writes to `docs/api/openapi.yaml`. Verify the file was updated and contains the new/changed endpoints.

### 3. Generate TypeScript types

```bash
make api-types
```

This writes to `frontend/src/api/schema.d.ts`. Verify the generated types reflect the API changes.

### 4. Stop the backend (if you started it)

```bash
lsof -ti:8080 | xargs kill 2>/dev/null
```

Only stop it if you started it in step 1. If it was already running, leave it.

### 5. Verify

- Confirm `docs/api/openapi.yaml` contains the correct endpoints
- Confirm `frontend/src/api/schema.d.ts` has the expected TypeScript types
- If frontend code imports from `schema.d.ts`, check for type errors

## Important Notes

- The backend must be **running** to export the spec (springdoc serves it at `/v3/api-docs.yaml`)
- `JAVA_HOME` must be set — see the export command in step 1
- If the backend fails to start, check for compilation errors first with `./mvnw compile`
- The spec and types are **checked into git** — they are source-of-truth artifacts
