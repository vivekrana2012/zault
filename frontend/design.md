# Zault — Design System

> Single source of truth for UI/UX decisions. All tokens map directly to shadcn/ui + Tailwind CSS variables.
> When implementing, copy the HSL values from the color tables into `globals.css`.

---

## Design Principles

1. **Brutalist notebook** — The UI feels like a hand-drawn prototype on graph paper. Monospace type, underline inputs, bracket labels, no rounded corners. Structure comes from the grid, not from decoration.
2. **Data-first** — Content is the interface. The hand-drawn frame stays subtle; financial data is crisp and precise.
3. **One accent rule** — The palette is greyscale. Color appears only when it carries meaning: green for gains, red for losses, amber for warnings. No decorative color.
4. **Accessible** — WCAG 2.1 AA minimum. Every interaction works with keyboard, screen reader, and reduced motion.
5. **Responsive** — Desktop-first (this is a dashboard), but usable on tablet. Mobile is a stretch goal.

---

## Aesthetic

The visual language is inspired by architectural blueprints and engineering notebooks:

- **Paper texture** — Warm off-white background with subtle grain, not clinical pure white.
- **Sketch lines (light mode only)** — Faint construction marks around containers (forms, cards). An L-shape: bottom horizontal + left vertical, extending past corners like hand-drawn registration marks. Not shown in dark mode — dark mode relies on the paper texture and whitespace alone.
- **Monospace everything** — JetBrains Mono for all text: headings, labels, data, buttons.
- **Underline inputs** — No bordered boxes. Inputs are just a bottom border (thick underline).
- **Bracket notation** — Labels use `[ Username ]`, buttons use `[ Login ]`. Headings use `# Title`.
- **Zero border radius** — No rounded corners anywhere. Sharp rectangles.
- **Invert on hover** — Buttons and interactive elements invert to black bg / white text on hover.
- **Dark mode = dark craft paper** — Off-black with warm undertones, not cold blue-black. Clean and minimal — no sketch lines or shadows, letting the paper texture and typography carry the aesthetic.

---

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Components | **shadcn/ui** | Copy-paste Radix primitives, restyled for brutalist aesthetic |
| Styling | **Tailwind CSS** | Utility-first, configured via design tokens |
| Charts | **D3.js** | Custom, flexible, matches the minimal/blueprint feel |
| Icons | **Lucide React** | Ships with shadcn/ui |
| Color mode | **Light + Dark** | Toggle via `.dark` class on `<html>`, persisted to `localStorage` |

---

## Component Inventory

> **Check here before creating new components.** If a component exists for your use case, use it.

### Custom Components

| Component | File | Purpose | Example |
|-----------|------|---------|---------|
| `BracketButton` | `src/components/bracket-button.tsx` | Action buttons with auto-wrapped `[ label ]` brackets. | `<BracketButton label="Log out" onClick={handleLogout} />` |
| `SubmitButton` | `src/components/submit-button.tsx` | Form submit with loading spinner + bracket wrapping. | `<SubmitButton loading={loading} label="Login" loadingLabel="Signing in…" />` |
| `FormField` | `src/components/form-field.tsx` | Label + underline input + optional hint. | `<FormField label="Username" id="username" type="text" ... />` |
| `FormError` | `src/components/form-error.tsx` | Error message with AlertCircle icon (red text, no background). | `<FormError message="Invalid credentials" />` |
| `AuthPageLayout` | `src/components/auth-page-layout.tsx` | Auth page container: Header + centered card with sketch lines. | `<AuthPageLayout title="Login">...</AuthPageLayout>` |
| `Header` | `src/components/header.tsx` | Top bar: logo + branding (sketch-lines-sm) + theme toggle. | `<Header />` |

### Primitive UI Components (shadcn/ui, restyled)

| Component | File | When to Use |
|-----------|------|-------------|
| `Button` | `src/components/ui/button.tsx` | **Only** for ghost links, icon-only buttons, or `asChild` delegation. Never for visible action buttons (use `BracketButton`). |
| `Card` | `src/components/ui/card.tsx` | Bordered container with card bg. Use for dashboard panels. |
| `Input` | `src/components/ui/input.tsx` | Raw underline input. Prefer `FormField` which wraps this with a label. |
| `Label` | `src/components/ui/label.tsx` | Form label primitive. Prefer `FormField` which includes this. |

### Decision Tree: Which Button Component?

```
Need a button?
├── Is it a form submit? → SubmitButton
├── Is it a visible action (logout, save, delete, confirm)? → BracketButton
├── Is it icon-only (theme toggle, close)? → Button (size="icon")
└── Is it a subtle navigation link (ghost text)? → Button (variant="ghost", asChild) + Link
```

---

## Color System

All values are **HSL** (shadcn/ui convention). CSS variables omit the `hsl()` wrapper so Tailwind can apply opacity modifiers.

> **To change colors:** Edit the HSL values in the tables below, then update `globals.css` to match.

### Neutral Palette (Greyscale)

<!-- NEUTRAL COLORS — Edit these to change the base look -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `40 20% 96%` | `30 5% 8%` | Page background (warm paper / dark craft paper) |
| `--foreground` | `0 0% 0%` | `40 10% 90%` | Primary text |
| `--card` | `40 15% 94%` | `30 5% 10%` | Card surfaces (slightly darker than page) |
| `--card-foreground` | `0 0% 0%` | `40 10% 90%` | Card text |
| `--popover` | `40 20% 96%` | `30 5% 10%` | Dropdown/popover bg |
| `--popover-foreground` | `0 0% 0%` | `40 10% 90%` | Popover text |
| `--muted` | `40 10% 90%` | `30 5% 14%` | Muted backgrounds (disabled, secondary areas) |
| `--muted-foreground` | `0 0% 45%` | `40 5% 55%` | Secondary/muted text |
| `--border` | `0 0% 0%` | `40 10% 90%` | Borders, dividers (black / off-white) |
| `--input` | `0 0% 0%` | `40 10% 90%` | Input underlines |
| `--ring` | `0 0% 0%` | `40 10% 90%` | Focus ring |

### Brand / Primary (Black / White invert)

<!-- PRIMARY COLORS — In brutalist mode this is just foreground/background invert -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `0 0% 0%` | `40 10% 90%` | Buttons, active states |
| `--primary-foreground` | `40 20% 96%` | `30 5% 8%` | Text on primary (inverts bg) |

### Secondary

<!-- SECONDARY COLORS — Used for secondary buttons, subtle highlights -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--secondary` | `40 10% 90%` | `30 5% 14%` | Secondary buttons, subtle bg |
| `--secondary-foreground` | `0 0% 0%` | `40 10% 90%` | Text on secondary |

### Accent

<!-- ACCENT COLORS — Used for hover states, highlighted rows -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--accent` | `40 10% 90%` | `30 5% 14%` | Hover bg, highlighted rows |
| `--accent-foreground` | `0 0% 0%` | `40 10% 90%` | Text on accent |

### Destructive

<!-- DESTRUCTIVE COLORS — Used for delete actions, error states -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--destructive` | `0 72% 51%` | `0 63% 55%` | Delete buttons, errors |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` | Text on destructive |

### Semantic — Financial

<!-- FINANCIAL COLORS — Gains, losses, warnings. The ONLY color in the UI. -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--gain` | `152 60% 36%` | `152 55% 50%` | Positive returns, up arrows, `+` prefix |
| `--gain-foreground` | `0 0% 100%` | `30 5% 8%` | Text on gain badges |
| `--loss` | `347 77% 50%` | `347 70% 58%` | Negative returns, down arrows, `-` prefix |
| `--loss-foreground` | `0 0% 100%` | `0 0% 100%` | Text on loss badges |
| `--warning` | `38 92% 50%` | `38 80% 55%` | Alerts, stale data indicators |
| `--warning-foreground` | `0 0% 100%` | `30 5% 8%` | Text on warning badges |

### Grid Lines

<!-- GRID — The faint graph paper background -->

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--grid` | `0 0% 0%` | `40 10% 90%` | Grid line color (same as foreground) |
| `--grid-opacity` | `0.04` | `0.06` | Very subtle; barely visible |
| `--grid-size` | `40px` | `40px` | Grid cell size |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0` | **Zero radius everywhere.** Sharp corners, no rounding. |

---

## Typography

### Font Stack

| Role | Font | Fallback | Usage |
|------|------|----------|-------|
| Everything | **JetBrains Mono** | `ui-monospace, monospace` | All text — headings, labels, body, data, buttons. One font, one voice. |

Load JetBrains Mono via `@fontsource-variable/jetbrains-mono`.

Inter is available as a fallback but not used in the brutalist theme.

### Type Scale

Uses Tailwind's default scale. Key mappings:

| Element | Class | Size | Weight | Notes |
|---------|-------|------|--------|-------|
| Page title | `text-3xl` | 1.875rem | `font-bold` (700) | Prefixed with `# ` (markdown-style) |
| Section heading | `text-xl` | 1.25rem | `font-bold` (700) | Prefixed with `## ` |
| Card title | `text-base` | 1rem | `font-semibold` (600) | |
| Body text | `text-sm` | 0.875rem | `font-normal` (400) | |
| Labels | `text-sm` | 0.875rem | `font-medium` (500) | Wrapped in `[ brackets ]` |
| Buttons | `text-sm` | 0.875rem | `font-medium` (500) | Wrapped in `[ brackets ]` |
| Mono numbers | `text-sm` | 0.875rem | `font-normal` (400) | |
| Large portfolio value | `text-3xl` | 1.875rem | `font-bold` (700) | |

### Tabular Numerals

All numeric data should use `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) so columns of numbers align properly.

---

## Spacing & Layout

### Base Unit

`4px` (0.25rem). All spacing is a multiple of this. Use Tailwind's spacing scale (`p-1` = 4px, `p-2` = 8px, etc.).

### Layout Dimensions

| Element | Value | Notes |
|---------|-------|-------|
| Max content width | `1280px` | `max-w-7xl` |
| Sidebar width | `240px` | Collapsible to icon-only (`64px`) |
| Top nav height | `56px` | `h-14` |
| Card padding | `24px` | `p-6` |
| Card gap | `16px` | `gap-4` between cards in a grid |
| Section gap | `32px` | `gap-8` between page sections |

### Breakpoints

| Name | Width | Target |
|------|-------|--------|
| `sm` | 640px | — |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / small laptop |
| `xl` | 1280px | Desktop (primary) |
| `2xl` | 1536px | Wide desktop |

Dashboard is designed for `xl` and up. Sidebar collapses below `lg`.

---

## Shadows & Elevation

**Minimal shadows.** Separation comes primarily from borders (1px solid) and whitespace.

- **Light mode:** `.sketch-lines` containers get a subtle bottom-only shadow (`0 12px 12px -12px`) to ground them on the page. The negative spread ensures the shadow only bleeds downward.
- **Dark mode:** No shadows at all. The dark paper texture provides enough contrast.
- Floating layers (popovers, modals) get shadows in both modes for depth cues.

| Level | Light | Dark | Usage |
|-------|-------|------|-------|
| None | ✓ | ✓ | Cards, buttons, inputs — everything flat |
| Bottom-only | ✓ | ✗ | `.sketch-lines` containers |
| `shadow-md` | ✓ | ✓ | Popovers, dropdowns (floating layers) |
| `shadow-lg` | ✓ | ✓ | Modals, dialogs |

---

## Background Texture

### Paper Grain

The page background has a subtle warm texture:

- **Light mode:** Warm off-white (`hsl(40 20% 96%)`) with a subtle CSS noise/grain overlay.
- **Dark mode:** Dark warm grey (`hsl(30 5% 8%)`) with the same grain, slightly more visible.

Implementation: A tiny inline SVG noise pattern at very low opacity via CSS `background-image`.

### Sketch Lines

Faint construction marks drawn around key containers (forms, cards). **Light mode only** — dark mode shows no lines.

#### Light Mode

- **L-shape only:** bottom horizontal line + left vertical line.
- Lines **extend past the corners** (~48px overshoot) to give a rough, hand-drawn look.
- Lines are `--foreground` color at `~8%` opacity (`--grid-color`), 1px thick.
- A subtle bottom-only `box-shadow` grounds the container.
- Applied via the `.sketch-lines` CSS utility class (uses `::before` pseudo-element).

#### Dark Mode

- **No lines, no shadow.** The `.sketch-lines` class still provides its padding/positioning, but `::before` background and `box-shadow` are both set to `none`.
- The dark paper texture and generous whitespace provide enough visual structure.

#### Usage

- Only used on structural containers — login form, main content cards, dashboard sections.
- Not applied to every element. Use sparingly for architectural framing.

---

## Component Guidelines

### Cards

- 1px solid border (`border-foreground`), **no radius**, **no shadow**.
- Background: `bg-card` (slightly darker than page to distinguish from grid).
- Padding: `p-6`. Title at top-left, actions at top-right.

### Data Tables

- Used for holdings, transactions, watchlist.
- No zebra striping. Hover highlight: `bg-accent`.
- Numbers right-aligned, `tabular-nums`.
- Gain/loss values colored with `--gain` / `--loss`, paired with `+`/`-` prefix.
- Column headers are bold, uppercase.
- Table borders: horizontal rules only (bottom border on each row).

### Navigation

- **Sidebar** (left): Primary nav. Icon + label in brackets, collapses to icon-only on smaller screens.
- **Top bar**: App title with `#` prefix, dark mode toggle (sun/moon icon).
- Active nav item: foreground-inverted (`bg-foreground text-background`).

### Header

Reusable header component (`<Header />`) used across all pages.

- **Layout:** Full-width flex row, `items-center justify-between`, padding `px-14 py-10`.
- **Left side — Brand:**
  - Logo image (`zault_logo.png`, `h-8 w-auto`) followed by "Zault" text (`text-2xl font-black tracking-tight`).
  - Brand group uses `.sketch-lines .sketch-lines-sm` with `!p-0` — applies the bottom/left construction lines with a compact 20px overshoot (vs the standard 48px).
  - Shadow and lines are light-mode only (per `.sketch-lines` convention).
- **Right side — Theme toggle:**
  - Ghost icon button (sun/moon), `relative z-10` to stay above the sketch-lines pseudo-element.
- **Favicon:** `public/favicon.png` — the logo resized to 32×60px (portrait, preserving the lightning bolt's natural aspect ratio). Referenced via `<link rel="icon">` in `index.html`.
- **Auth page form offset:** The form content area uses `-mt-16` to visually compensate for the header height and keep the form centered.

#### Sketch Lines — Small Variant

Added `.sketch-lines-sm` modifier in `globals.css`:
- Overrides `inset` to `-20px` (from `-48px`) for tighter construction marks.
- Used on compact elements like the header brand where 48px overshoot would be excessive.

### Buttons

- Default: transparent bg, no border, foreground text.
- Hover: **inverts** to `bg-foreground text-background`.
- Destructive: same invert pattern but uses `--destructive`.
- Ghost: no border, just text. Inverts on hover.
- Outline: border + transparent bg, inverts on hover. Use when a visible border is needed.
- Size: default `h-9 px-4`, small `h-8 px-3`, icon-only `h-9 w-9`.
- **No border radius.**

### Feedback Messages (Errors, Warnings, Success)

- **No background color.** Messages use colored text + an icon only. No `bg-*` washes or tinted panels.
- Error: `text-destructive` + `AlertCircle` icon.
- Success: `text-gain` + `CheckCircle` icon.
- Warning: `text-warning` + icon.
- Text is `font-bold text-sm`, centered, with `p-3` padding for breathing room.
- Color carries meaning but is always paired with an icon (accessibility).

### Forms

- Labels inline with inputs, wrapped in `[ brackets ]`.
- Inputs: **underline only** (bottom border, no box). No background, no side/top borders.
- Focus: thicker underline instead of ring.
- **No border radius.**

---

# Reference

> The sections below are detailed reference material. Read them when implementing specific features (charts, animations, accessibility). You do not need to read all of this for every UI change.

---

## Data Visualization (D3.js)

### Chart Types

| Chart | Usage |
|-------|-------|
| Line chart | Portfolio value over time, price history |
| Area chart | Portfolio value (filled), cumulative returns |
| Bar chart | Monthly returns, sector allocation |
| Donut chart | Asset allocation, portfolio composition |
| Sparkline | Inline mini-charts in table rows |

### Color Scales

#### Categorical (for different assets/sectors)

Mostly monochrome with accent highlights for emphasis:

| Index | HSL | Usage Example |
|-------|-----|---------------|
| 1 | `0 0% 0%` | Primary series (black/white) |
| 2 | `0 0% 40%` | Second series (medium grey) |
| 3 | `0 0% 65%` | Third series (light grey) |
| 4 | `152 60% 36%` | Fourth series (gain green) |
| 5 | `347 77% 50%` | Fifth series (loss red) |
| 6 | `38 80% 50%` | Sixth series (warning amber) |

#### Diverging (gain/loss)

- Positive: `--gain` → neutral grey → `--loss`: Negative
- Midpoint anchored at 0% return.

#### Sequential (intensity)

- Use a greyscale ramp from `--foreground` at low opacity to full opacity.

### Axis & Grid Styling

- Grid lines: `--foreground` at 10% opacity, dashed.
- Axis text: `--muted-foreground`, `text-xs`.
- Axis lines: `--foreground` at 20% opacity.
- No chart borders or background fills — charts sit directly on the card surface.

### Tooltips

- `bg-foreground text-background`, no radius, `shadow-md`.
- Show: date, value formatted with currency/percent, delta from previous.
- Appear on hover, dismiss on mouse leave.

### Animation

- Line/area charts: draw-in animation on mount (500ms, ease-out).
- Bar charts: grow-up animation on mount (300ms, ease-out).
- Transitions between data ranges: 200ms.
- Respect `prefers-reduced-motion`: skip animations entirely.

---

## Motion & Transitions

| Element | Duration | Easing | Notes |
|---------|----------|--------|-------|
| Hover invert | `150ms` | `ease-in-out` | Buttons, rows, links |
| Sidebar expand/collapse | `200ms` | `ease-in-out` | Width + content fade |
| Modal/dialog open | `200ms` | `ease-out` | Scale + fade |
| Modal/dialog close | `150ms` | `ease-in` | Fade out faster than in |
| Theme toggle | `200ms` | `ease-in-out` | All color transitions |
| Page transitions | None | — | Instant route changes, no page-level animation |

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

---

## Accessibility

### Targets

- **WCAG 2.1 Level AA** compliance.
- Minimum contrast ratio: **4.5:1** for normal text, **3:1** for large text and UI components.

### Requirements

- All interactive elements must be keyboard-focusable with visible focus indicators.
- Focus order follows visual order (no `tabindex` hacks).
- Color is never the only indicator — pair gain/loss colors with text prefix (`+`/`-`) and icons (↑/↓).
- Charts must have text alternatives (summary, data table toggle).
- Modals trap focus. Escape closes them.
- Loading states use `aria-busy`. Skeleton placeholders over spinners.
- All images/icons have `aria-label` or are marked `aria-hidden` if decorative.

### Screen Reader

- Use semantic HTML (`<nav>`, `<main>`, `<table>`, `<th scope>`).
- Live regions (`aria-live="polite"`) for updates (portfolio value changes, alerts).
- Announce route changes to screen readers.

---

## File Naming & Structure (future)

When implementing, organize frontend files as:

```
frontend/src/
├── components/
│   └── ui/              ← shadcn/ui components (restyled brutalist)
├── lib/
│   └── utils.ts         ← cn() helper, formatters
├── hooks/               ← Custom React hooks
├── pages/               ← Route-level components
├── charts/              ← D3.js chart components
├── styles/
│   └── globals.css      ← Tailwind directives + CSS variables from this doc
└── api/
    └── schema.d.ts      ← Auto-generated (existing)
```