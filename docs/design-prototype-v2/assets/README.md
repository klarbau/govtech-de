# Assets

## Brand marks

- `logo-mark.svg` — 48 × 48 monochrome brand mark (a reproduction of lucide-react's `Landmark` glyph, which the live Sidebar + Topbar import as the app's logo). Use `currentColor` to recolor.
- `logo-wordmark.svg` — 280 × 48 horizontal lockup: mark + "GovTech DE" wordmark + eyebrow "VERWALTUNG · CITIZEN-FIRST".

The brand mark deliberately re-uses the Lucide icon system the app already uses — there is **no separate proprietary logo**. This is intentional: the prototype is speculative and avoids implying any real-government brand affiliation (HL-DS-1: never frame as "BundesSans-Lookalike" or "official Bund design").

## Iconography

All icons in the GovTech DE app are **lucide-react** (ISC license) — see `../README.md` § Iconography for the canonical set used in production. The repo ships no proprietary icon font or SVG sprite; iconography is loaded from the `lucide-react` npm package at build time, or from CDN in design artefacts.

### Common icons (from the live code)

| Icon | Lucide name | Used for |
|---|---|---|
| 🏛 | `Landmark` | Brand mark, Stammdaten sidebar item |
| ✉ | `Inbox` | Posteingang sidebar item |
| 📁 | `FolderKanban` | Vorgänge sidebar item |
| 📄 | `FileText` | Dokumente sidebar item |
| 📅 | `CalendarClock` | Termine sidebar item |
| 🧾 | `ReceiptText` | Steuer sidebar item |
| 👥 | `Users` | Familie sidebar item |
| 💬 | `MessageSquareText` | Assistent sidebar item |
| 🛡 | `Shield`, `ShieldCheck` | Datenschutz, EUDI-versiegelt |
| 🏠 | `Home` | Dashboard sidebar item |
| ⏱ | `Clock3` | FristChip — normal deadline |
| ⚠ | `AlertTriangle` | FristChip — overdue, citation mismatch |
| ℹ | `Info` | Föderalismus disclaimer, pilot-phase badge |
| ✨ | `Sparkles` | AI summary heading, 2027-vision banner |
| → | `ArrowRight` | "Weiter", "Mehr anzeigen" CTAs |
| 🔄 | `RefreshCw` | Inbox refresh, error retry |
| ✉ | `Mail` | Brief-Authentizität: Briefpost |

(Emoji column is for visual reference only — the live app never renders emoji. See README § Iconography & emoji.)

## Imagery

The prototype intentionally ships **no stock photography, illustrations or marketing imagery**. This matches the gov.uk / DigitalService DE register: every pixel is functional UI. If a design surface ever calls for imagery (Loom thumbnail, social share), use neutral document/architecture photography — never people in marketing situations.

## What is missing

- **No Behörden-Logos** were shipped in the repo's `public/behoerden-logos/` folder (the path is mentioned in `CLAUDE.md` but the folder didn't exist in the snapshot we read). The live `BehoerdenBadge` component renders text only — by design (HL-DS-10: no per-category colour or logo).
- **No proprietary brand mark** beyond the Lucide-Landmark glyph. This is intentional, not a gap.

If you have updated logos or imagery you'd like added, drop them here and update this README.
