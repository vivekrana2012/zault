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

## Current State

- Bare React shell — App.tsx with default Vite template
- No routing, state management, or component library yet

## UI Decisions

- **Design system:** Documented in `frontend/design.md` (single source of truth for tokens, colors, typography, component conventions)
- **Component library:** shadcn/ui (Radix primitives + Tailwind CSS)
- **Charts:** D3.js
- **Icons:** Lucide React
- **Color mode:** Light + Dark with user toggle
- **Aesthetic:** Clean & minimal, data-first
- **Routing:** React Router (`react-router`)
- **State management:** _Not yet decided (TanStack Query candidate)_

## Component Conventions

- **All interactive elements** must use the `<Button>` component for consistent theming — never style links or clickable elements with ad-hoc classes.
- **Navigation links** use `<Button variant="..." asChild><Link to="...">` — the `asChild` prop delegates rendering to `<Link>` while keeping Button's themed styles.
- **Action buttons** use `<Button>` directly (form submits, toggles, etc.).

## Technical Debt

_None yet._
