# UX-Audit: Layout-Shell + Onboarding + Vorgänge-Wizard

**Datum**: 2026-05-14
**Auditor**: Explore-Agent (inline-report)
**Zweck**: Eingangs-Daten für `docs/specs/design-system-v2.md` § 11.1 und Phase 6a frontend-coder

## Top-5 schwerwiegendste UX-Probleme

1. **`src/components/layout/Sidebar.tsx:53–63` — Active-State nur durch Hover-Hintergrund, kein persistentes Visual-Feedback**
   - Das `Link`-Element nutzt nur `hover:bg-sidebar-accent`, aber **keine `.active`-State** oder `aria-current="page"`-Styling.
   - Bei langen Labels (Deutsch: "Stammdaten", Russisch: "Штамм-данные") ist Kontrast zu schwach (sidebar-accent ist fast weiß).
   - **Hebel**: Mittel — Sidebar ist Navigation-Backbone, Fix < 30 Min.

2. **`src/app/(app)/layout.tsx:31` — Content-Container `max-w-5xl` + 8px Padding zu eng für Rich Data**
   - Vorgänge-Wizard braucht 4× CascadeBlöcke nebeneinander (Block A/B/C/D), max-w-5xl = 64rem = 1024px.
   - Jede Block-Spalte (mit Rechtsgrundlagen-Tags) braucht ~280px minimum → **Layout bricht auf Mobil-Stack**.
   - **Hebel**: Hoch — betrifft alle Pages.

3. **`src/components/umzug/CascadePreview.tsx:80–210` + `AutopilotTimeline.tsx` — Kein Visual-Hierarchy zwischen Blocks**
   - 4 Blocks (A, B, C, D) haben gleiche Schriftgröße (`text-sm uppercase` für H2), unterschiedliche Farbcodes (emerald, violet, zinc, sky) — **zu subtil**.
   - Keine Abstände zwischen Blocks variieren (alle `gap-8`).
   - **Keine "Hero"-Präsentation** des Autopilot-Umzugs: Wizard-Flow fühlt sich wie Daten-Entry-Form an, nicht wie **"Du delegierst Bürokratie an einen AI-Agenten"**-Experience.
   - **Hebel**: Sehr hoch — das ist das Wow-Feature.

4. **`src/app/(app)/vorgaenge/umzug/start/page.tsx:74–145` — Keine Fortschrittsanzeige über Step 1/3 des Wizard**
   - Nutzer sieht kein visuelles "Du bist bei Step 1 von 3".
   - Nach "Weiter" Flash zu `/preview`, dann `/run` — **keine Breadcrumbs, kein Fortschrittsbar**.
   - **Hebel**: Mittel — Fix < 1h.

5. **`src/components/shared/PrototypeDisclaimer.tsx:40–52` — Disclaimer am Fuß statt oben**
   - `<details>`-Block am Ende jeder Page → Nutzer muss scrollen, um "Prototype"-Status zu erkennen.
   - **Hebel**: Klein — aber Glaubwürdigkeit-Signal wichtig für Gov-Context.

## Quick wins (< 1h pro Stück)

- **Sidebar Active-State**: `border-l-4 border-l-sidebar-primary` statt nur Background-Hover.
- **AdresseInput** (`src/components/umzug/AdresseInput.tsx:75`) Grid: `sm:grid-cols-[1fr_120px_140px]` → `md:grid-cols-[2fr_100px_120px]`.
- **Tooltip/Helper-Text Placement**: `AdresseInput.tsx:116` — Helper-Text **über** Feld statt darunter.
- **FormFieldError einheitlich**: `WohnungsgeberUpload.tsx:93–100` vs `AdresseInput.tsx:121–128` — unterschiedliche Patterns.
- **Topbar-Tagline** (`Topbar.tsx:18–23`): auf Mobile sichtbar.

## Strukturelle Probleme (Redesign-Spec)

### 1. Vorgänge-Wizard: keine "Review"-Phase vor Versand
- `/umzug/start` → `/umzug/preview` → `/umzug/run`, aber:
  - Kein "Du stellst jetzt X Behörden-Benachrichtigungen los"-Bestätigung vor `/run`.
  - EID-Bestätigungsdialog sitzt **innerhalb** der Timeline, nicht **davor**.
  - **Keine Zusammenfassung** (Adresse, Behörden, EID-Schritte) vor Autopilot-Start.

### 2. Onboarding ist nur Persona-Auswahl, kein Onboarding
- Keine "Welcome"-Sequenz.
- DeutschlandID-Login in Meta-Beschreibung erwähnt ("2027 vision"), aber nicht in UI.
- Persona-Auswahl ist Demo-Krücke, kein echtes Onboarding.

### 3. Posteingang + Vorgänge + Stammdaten: keine klare Content-Architektur
- `src/app/(app)/posteingang/page.tsx`: leere Liste → Client-seitig via localStorage.
- `src/app/(app)/stammdaten/page.tsx`: `force-dynamic`, aber keine Server-Revalidation.
- `src/app/(app)/vorgaenge/page.tsx`: statische Karten-Grid.

## Was gut ist und nicht angefasst werden sollte

- **Accessibility-Fundament**: `aria-label`, `aria-describedby`, `aria-live="polite"`, `role="alert"`, Skip-to-Content-Link (`layout.tsx:16–21`) — solide.
- **RTL/i18n-Handling**: `<html dir={dir}>`, `next-intl`, Locale-Switcher — professionell.
- **Farb-Coding für Behördentypen** (`BehoerdenBadge.tsx:20–26`): Bund/Land/Kommune/Sonstige. → ABER: HL-DS-10 verbietet Farbe → Refactor zu Text-Label nur.
- **Autopilot-Timeline Animation** (`AutopilotStepRow.tsx:76–86`): `framer-motion` + `useReducedMotion()` — modern und respektiert Preferences.
- **Consent-Pattern** (Block B Checkboxen): explizites Opt-In vor Autopilot-Start ist rechtlich korrekt.

## Konkrete Files für Phase 6a frontend-coder

| Datei | Prio | Was | Geschätzte Zeit |
|-------|------|-----|-----------------|
| `src/components/layout/Sidebar.tsx` | P1 | Active-State border-l-4 | 30min |
| `src/app/(app)/layout.tsx` | P1 | `max-w-5xl` → `max-w-7xl`, responsive Padding | 20min |
| `src/components/umzug/CascadePreview.tsx` + `CascadeBlock.tsx` | P2 | H1-Hierarchie, Block-Spacing variieren | 45min |
| `src/app/(app)/vorgaenge/umzug/start/page.tsx` | P2 | Breadcrumb + Progress-Indicator | 1h |
| `src/components/shared/PrototypeDisclaimer.tsx` | P3 | Verschieben nach oben, default-open | 15min |
| `src/components/layout/Topbar.tsx` | P3 | Mobile-Branding-Text | 10min |
| `src/app/page.tsx` | P3 | DeutschlandID-Login-Visualisierung | 1h+ |
| `src/components/umzug/AdresseInput.tsx` | P2 | Label-Reihenfolge, Helper-Text vor Feld | 30min |

Gesamt-Aufwand P1+P2: ~4h Coding + 2h Design-Review.
