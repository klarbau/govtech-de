# GovTech DE — Web UI kit

A click-through, high-fidelity recreation of the web product's shipped surfaces. Open `index.html` to enter — the persona picker leads into the authenticated app shell (sidebar + topbar + main column) and you can navigate Posteingang, Stammdaten, Umzug, Dashboard.

## What's included

| Surface | Real route in upstream | Status |
|---|---|---|
| Persona picker (landing) | `src/app/page.tsx` | ✅ Full recreation |
| Dashboard | `src/app/(app)/dashboard/page.tsx` | 🟡 Stub in upstream — recreated with seed data + open Vorgänge |
| **Posteingang** (inbox) | `src/app/(app)/posteingang/page.tsx` + `PosteingangInbox.tsx` | ✅ Full recreation: filter, LetterCard list, status grouping |
| **Posteingang letter detail** | `src/app/(app)/posteingang/[id]/page.tsx` + `LetterReader.tsx` | ✅ AI-summary block + original brief + sticky Frist action |
| **Stammdaten** (profile) | `src/app/(app)/stammdaten/page.tsx` + `StammdatenView.tsx` | ✅ Hero + Pilot-Phase + sections + activity log |
| **Umzug** (Vorgangs-wizard) | `src/app/(app)/vorgaenge/umzug/*` | ✅ Start → Preview → Run cascade |
| Dokumente / Termine / Steuer / Familie / Assistent / Datenschutz | stubs in upstream | ⛔ Skipped — no UI exists in upstream |

## How it's wired

- All shared chrome (sidebar, topbar, disclaimer banner, footer) lives in `shell.jsx`.
- Primitives (Button, Card, Input, Badge, FristChip, lucide icons) live in `primitives.jsx`.
- Each surface has its own `screen-*.jsx` file. Switching surfaces is a single `setRoute` call from `app.jsx`.
- Mock data (3 personas, 4 letters, Behörden seed, Umzug cascade) is in `data.jsx`.
- All design tokens come from the shared `../../colors_and_type.css`.
- All icons are inline SVG following Lucide stroke conventions (no CDN dependency).

## What you can do in the prototype

- **Pick a persona** (Anna / Familie Schmidt / Mehmet) — seeds the inbox + activity log.
- **Navigate** the sidebar — 10 items, with active state and `border-s-4` accent.
- **Open a letter** — click any LetterCard to read AI summary + original side-by-side.
- **Start an Umzug** — pick the new address + Stichtag → preview cascade → "run" the autopilot.
- **Toggle theme** — flip light/dark from the topbar.

## What it does NOT do

UI-kit assets are intentionally cosmetic. There is no real backend, no localStorage persistence between routes, no AI streaming, no axe-clean Playwright pass, no i18n switch. For production-grade behaviour, see the upstream Next.js app.

## Hygiene rules followed

- No emoji.
- All Sie-Form German UI copy.
- Tabular numerals on every Aktenzeichen / FE-Nr / IBAN / Frist date.
- `[MOCK]` watermark on every persona row + every letter.
- Touch targets ≥ 44 px; inputs ≥ 48 px.
- No bouncy / spring animation.
