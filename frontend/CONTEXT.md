# Frontend — Context

> Frontend-specific decisions, state, and notes. For system-wide architecture, see root `CONTEXT.md`.

## Stack

- React 19 + TypeScript 5.8 (strict mode)
- Vite 6 for dev server and build
- nginx for production serving

## API Integration

- API types auto-generated from `docs/api/openapi.yaml` via `openapi-typescript`
- Generated types live in `src/api/schema.d.ts`
- Regenerate with `make api-types`
- API base URL: `/api/` (proxied by nginx in prod, Vite proxy in dev)

## Shared Data Docs

- Tradebook CSV domain knowledge and column dictionary: [docs/domain/tradebook.md](../docs/domain/tradebook.md)

## Current State

- Auth flow complete: Login, Register, Logout
- Pages: HomePage (authenticated), LoginPage, RegisterPage
- Routing: React Router with auth-guarded routes
- Theme toggle: Light/Dark with localStorage persistence
- Reusable components: BracketButton, SubmitButton, FormField, FormError, Header, AuthPageLayout

## UI Decisions

- **Design system:** Documented in `frontend/design.md` (single source of truth for tokens, colors, typography, component conventions)
- **Component library:** shadcn/ui (Radix primitives + Tailwind CSS)
- **Charts:** D3.js — used for AllocationDonut (pie + arc generators); D3 handles math, React owns the DOM
- **Icons:** Lucide React
- **Color mode:** Light + Dark with user toggle
- **Aesthetic:** Brutalist notebook — see `frontend/.instructions.md` for rules
- **Routing:** React Router (`react-router`)
- **State management:** _Not yet decided (TanStack Query candidate)_

## Technical Debt

_None yet._
