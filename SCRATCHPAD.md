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
- Add security price plot againt trades to see where you bought/sold.
- Holding period analysis
  - By analyzing exits: You might realize you actually select plenty of winners, but you consistently exit them at a 10% or 20% gain, missing out on the 5x or 10x moves that cover your losses.
  - Velocity of Impatience (The Churn Metric) - If you find your average exit happens within 45 days of entry—despite telling yourself you are a long-term investor—your data is signaling a behavioral gap. It highlights a tendency to overtrade, react to quarterly noise, or treat investing like trading.
  - The FOMO / Regret Loop (Re-Entry Patterns)
  - One of the most humbling behavioral exercises is tracking the performance of an asset after you sold it.