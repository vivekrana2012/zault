# Zault — Scratchpad

> Dump raw thoughts, temporary notes, and half-formed ideas here.
> At the end of each session, ask Copilot to "sync" these into CONTEXT.md.

---

<!-- Use date headers like below to keep things chronological -->

## 2026-05-14

- Added context scoping to minimize token usage:
  - springdoc-openapi added to backend → auto-generates OpenAPI spec
  - `make api-spec` exports `docs/api/openapi.yaml` from running backend
  - `make api-types` generates `frontend/src/api/schema.d.ts` from the spec
  - Folder-scoped `.instructions.md` files for backend/ and frontend/
  - Split CONTEXT.md into root (architecture), backend/CONTEXT.md, frontend/CONTEXT.md
  - Root copilot-instructions.md updated with context scoping rules + API workflow


## 2026-05-16

- Maybe the tradebook ingestion should be async.
- Fix logging, otherwise we are going to have a mess.