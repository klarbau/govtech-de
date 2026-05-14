---
topic: Design-Direction "premium-polished aber minimalistisch" für GovTech-DE-Demo
question: Welche konkreten Design-Token (Type/Spacing/Color/Shadow/Motion/Radius) übernehmen wir aus gov.uk/KERN/USWDS-Welt und welche Polish-Patterns aus Linear/Stripe/Mercury/Apple Wallet, ohne den citizen-respectful Trust-Anker zu brechen?
date: 2026-05-14
iteration: 2  # Iteration 1 = initial brief; Iteration 2 = post-verifier-REVISE + post-domain-ALIGNED-WITH-ADJUSTMENTS hardening
status: draft
confidence: medium  # KERN-spezifische Token-Werte (Hex/px) sind nicht öffentlich auf der KERN-Webseite ausgelesen; GOV.UK / Stripe / Bundesregierung-Styleguide sind solide belegt. Wer KERN-Hex-Werte exakt braucht, muss GitLab opencode.de oder Figma direkt prüfen.
audience: product-architect (Input für eine Design-System-Spec); danach concept-verifier + domain-expert
out_of_scope:
  - konkrete Komponenten-Specs (Button, Card, Input — das ist product-architect-Arbeit)
  - Logo / Wortmarke / Domain-Naming (PRD § 8 open question)
  - Loom-Video-Treatment
  - Illustrations/Icons jenseits lucide-react (CLAUDE.md fixiert lucide)
---

## TL;DR

- **Direction**: "DigitalService DE in einem Linear-Hemd". Visuelles Grundgerüst bleibt **gov.uk / KERN-konform** (5-px-Vertikalrhythmus, sans-serif-first, Sie-Form-Wortgewicht, BITV-Kontrast non-negotiable). Polish kommt aus drei spezifischen, kalibrierten Stripe/Linear-Patterns: **(a)** sehr leicht warm-graue Neutralpalette (Chroma cap ≤ 0.005, siehe Color-Sektion), **(b)** Stripe-inspiriertes Layered-Shadow-System für genau drei Komponenten-Klassen (Card, Popover, Modal), **(c)** zwei dokumentierte Easing-Curves + reduced-motion-default.
- **Typografie**: **Source Sans 3** als Web-Primärfont (SIL-OFL, open source[^1]). Begründung ist **rein technisch**: 9 Weights, deutsche Diakritika, hohe x-Höhe, tabular-nums-Variante, slashed zero, kommerziell + Demo-frei lizenziert. **Keine BundesSans-Analogie** — siehe HL-DS-1. AR-Locale braucht expliziten Fallback (Source Sans 3 hat eingeschränkte arabische Glyphen): `"Source Sans 3", "Noto Sans Arabic", system-ui, …`. Type-Scale = GOV.UK 16/19/24/36/48 mit Line-Heights in 5-px-Schritten[^2][^4]. Tabular-Nums Pflicht für Aktenzeichen, FE-Nr, IBAN, Frist-Daten (HL-DS-6).
- **Spacing — Entscheidung Option A**: **Tailwind-4-pt-Default bleibt unangetastet**. Begründet durch Sites-Count (113 `p-N`-Occurrences in 71 Files; 294 weitere `shadow-*`/Margin/Gap-Sites; Token-Umzug bricht V1.0/V1.1/V1.2/V1.3-Shipped-Code). 5-px-Rhythmus lebt **ausschließlich** in `--line-height-*` CSS-Variablen und in einem additiven `--space-fixed-N`-Layer für neue Komponenten. Begründung in Spacing-Sektion.
- **Color**: Sehr-leicht-warm-neutrale Palette (OKLCH-basiert, Hue 80°, **Chroma cap ≤ 0.005** für Surface/Border-Tokens — entschärft gegenüber Iteration 1 wegen Booking-Drift-Risiko), Akzentfarbe ein **kalibriertes "Bund-Schwarz" + ein einzelner Trust-Blau-Akzent** (max 1 chromatische Akzentfarbe pro Screen — HL-DS-3). Semantik: gelb für Frist/Achtung, rot ausschließlich für Fehler/abgelaufen, grün für Erfolg, blau für Info — niemals Default-State. Alle Text/Background-Paare ≥ 4.5:1 (V1.5.1 `--muted-foreground` Härtung 5.63 light / 5.53 dark bleibt unverändert — HL-DS-7), UI-Komponenten ≥ 3:1[^11][^12].
- **Dark Mode — Entscheidung Option B**: `prefers-color-scheme: dark` aktiv ab Tag 1, **kein UI-Toggle**, Dark-Tokens 1× axe-PASS-validiert. Begründung: portfolio-reviewers erwarten Dark, und `<html data-theme="light">` würde `prefers-color-scheme` blockieren. Wir akzeptieren die doppelte axe-Last als investment. Mehr in Dark-Mode-Sektion.
- **Motion**: Zwei dokumentierte Curves nach Linear/Material-Pattern[^5][^15]: `ease-out-quart` (180 ms) für Enter/Exit, `ease-in-out-quart` (240 ms) für Layout-Shifts. **Kein Overshoot** für Autopilot-Handoff (Iteration 1 hatte `cubic-bezier(0.34, 1.56, 0.64, 1)` — Iteration 2 ersetzt durch `cubic-bezier(0.65, 0, 0.35, 1)` weil "boing" als spielerisch liest). `framer-motion` `MotionConfig reducedMotion="user"` global — die Wow-Cascade in Stammdaten V1.2 (Familienkasse-Bridge) hat diesen Hook bereits, das bleibt Pflicht-Muster[^16].
- **Risk**: Drei Trust-Anker-Bruchstellen identifiziert (siehe Risk-Register). Wichtigste: jede zusätzliche Shadow-Layer macht die App weniger "Behörde", mehr "SaaS-Dashboard" — Limit ist 3 Shadow-Tokens, nicht 6 (HL-DS-2).
- **Hard-Lines**: 14 nummerierte Hard-Lines HL-DS-1..HL-DS-14 am Ende des Briefs, übernehmbar 1:1 in die spec.

---

## Findings — Referenzen und was wir übernehmen

### 1. GOV.UK Design System — der unverhandelbare Grund-Acker

Was wir übernehmen:
- **Typ-Scale 16/19/24/36/48 px (large screens) mit Line-Heights als 5-px-Vielfache**[^2]. Konkrete Werte unten in der Token-Tabelle. Wichtigste UX-Lernzeile: GOV.UK hat 2022 die Größen 14 px und kleiner aus dem Scale **entfernt**, weil "smaller than 16 px is bad for accessibility"[^4]. Wir folgen dem.
- **5-px-basierte Spacing-Scale**, nicht 4 und nicht 8[^3]. Vorteil: das bestehende 5-px-Line-Height-Raster und die Spacing-Scale teilen denselben Rhythmus, vertikales Alignment "rastert" ohne CSS-Tricks.
- **Static-vs-responsive-Spacing-Dualität**[^3]: kleine Stufen (0–3) sind responsive-stabil, größere (4–9) wachsen auf grossen Screens. Wir mappen das als zwei Tailwind-Klassen `space-*` (responsive) und `space-fixed-*` (static).

Was wir **NICHT** übernehmen:
- **New Transport** als Font — proprietär, Crown-Copyright, nicht wiederverwendbar[^2]. Wir bauen mit Source Sans 3.
- Den GOV.UK-Gelbton (#FFDD00) als Brand-Akzent — zu UK-spezifisch. Wir nutzen Gelb ausschließlich als Warning-Semantik.
- Die schwarze Topbar mit dem Krone-Wappen — zu BR-spezifisch. Wir bauen unsere eigene neutrale Topbar.

### 2. KERN UX-Standard (DigitalService / DataPort, Open Source EUPL)

Was wir übernehmen — *konzeptionell*:
- Atomic-Design-Schichtung "Foundations → Atoms → Molecules → Organisms → Templates"[^6] — entspricht unserer bestehenden `components/ui` → `components/shared` → Domänen-Components-Struktur.
- **Open-Source-Haltung**: alle unsere Token unter EUPL-kompatiblen Lizenzen (Source Sans 3 = SIL-OFL ✓, Lucide = ISC ✓, shadcn/ui = MIT ✓).
- Föderale-Realismus-Botschaft: KERN ist der Trust-Indikator, dass *Bundes-CD-Geist* ankommt. Wir wollen "sieht aus wie KERN, fühlt sich an wie Linear".

Limitation der Recherche:
- Die KERN-Hex-Werte / exakten Token-px-Werte liegen auf der öffentlichen KERN-Website **nicht** als kopierbare Tabelle vor[^6]. Sie stecken im GitLab-Repo `gitlab.opencode.de/kern-ux/kern-ux` und in Figma — `WebFetch` auf GitLab gab leeres Content zurück. Confidence dieser Sektion: **low**. Falls product-architect KERN-Pixel-Treue braucht, muss er das Figma-Workspace direkt prüfen (Empfehlung: das in seinem ersten OQ aufzunehmen).

Was wir **NICHT** übernehmen:
- Die "Digitale Dachmarke" gov.de-Domain + Bundesadler-Lockup — wir sind explizit *speculative design, not real integration* (CLAUDE.md). Das Lockup würde ein Realismus-Versprechen geben, das wir nicht halten können.

### 3. Bundesregierung Corporate Design — bewusst NICHT als Referenz

**Iteration-2-Klarstellung**: Iteration 1 hatte einen "BundesSans-nächster-Geist"-Framing für Source Sans 3. Concept-verifier und domain-expert sind einig: dieses Framing ist gefährlich, weil es ein implizites Realitäts-Versprechen erzeugt ("die wollen wie der Bund aussehen"), das wir als speculative-design-Demo nicht halten dürfen. **Source Sans 3 wird ausschließlich tech-only begründet** (siehe Typography-Sektion).

Daraus folgt **HL-DS-1**: Das Wort "BundesSans" taucht **null mal als positive Framing-Referenz** auf — nicht in UI-Strings (i18n-JSON), nicht in `/src`-Code-Comments, nicht in Git-Commit-Messages, nicht in Spec-Marketing-Texten, nicht in Test-Beschreibungen. **Erlaubte Ausnahme**: dieser eine Forschungsbrief (`docs/research/2026-05-14-...`) und die Spec § "Hard-Lines" **dürfen** das Wort nennen, weil sie es explizit als verbotenes Framing dokumentieren. Wer in `/src` oder `/public` oder i18n grep't, soll nichts finden.

Was wir aus dem Bundes-Styleguide **nicht** übernehmen (und auch nicht als Referenz framen):
- BundesSans/BundesSerif selbst — die Fonts sind **proprietär und ausschließlich für Bundesbedienstete / autorisierte Vertragspartner** lizenziert[^7][^8]. Eine Demo, die das einbaut, ist lizenzrechtlich angreifbar; und eine Demo, die sich als "BundesSans-Lookalike" framet, ist kommunikativ irreführend.
- Den vollen Bundes-Farbenraum (das "expandierte Farbspektrum" der BR)[^9] — zu institutional, kollidiert mit "neuer Trust-Layer, der über den Behörden sitzt".
- Den Bundes-Print-Fallback Calibri — Web-Stack folgt eigener Logik (Source Sans 3 → `system-ui` → Plattform-Fallback).

### 4. Stripe Dashboard — der Polish-Acker für Tabelle/Dashboard/Card

Was wir übernehmen:
- **Stripe Accessible-Color-System-Logik**[^13][^14]: alle Farben in einem perzeptuell-uniformen Raum (CIELAB bei Stripe, OKLCH bei uns weil Tailwind v4 OKLCH-nativ ist[^17]); "5 Stufen Abstand garantiert AA-Kontrast für Text", "4 Stufen Abstand für Icons/Large-Text". Das ist die einzelne wertvollste Token-Disziplin der letzten 5 Jahre.
- **Shadow-Layering-Prinzip**: drei dokumentierte Shadow-Tokens, "soft, diffused, never sharp"[^10]. Stripes konkrete Werte sind unten als Inspiration in der Token-Tabelle, leicht abgeschwächt für Behördenkontext.
- **Spacing-Token-Dichte**: Stripe nutzt fein-granulare Stufen (4/8/12/16/20/24/28/32/36/40)[^10]; wir bleiben aber bei GOV.UK-Stufen (5/10/15/20/25/30/40/50/60), weil Mischsysteme die a11y-Vertikalrhythmus-Garantie brechen.

Was wir **NICHT** übernehmen:
- Stripe-Violet (#635BFF) als Akzent — zu fintech-loaded. Wir nutzen ein einzelnes Trust-Blau (Hex unten).
- Die Stripe-Dashboard-Topbar-Dichte (5+ horizontale Sektionen, Search, Notifications, Help, Account-Switcher) — wir sind eine Bürgerplattform, nicht ein Operator-Tool.

### 5. Linear — der Refinement-Acker für Hierarchie und Restraint

Was wir übernehmen:
- "Don't compete for attention you haven't earned" als explizites Designprinzip[^5]. In unserer Sprache: die Yellow-Letter-Bridge ist das Wow — alle anderen Sektionen müssen *zurücktreten*, nicht *mit*kompetieren.
- **Warmes Grau statt kühles Grau** — Linear hat 2025 von cool-blue-grays zu warm-grays gewechselt "ohne muddy zu werden"[^5]. Dasselbe Pattern macht eine Behörden-UI deutlich weniger "Krankenhaus-LCD" und mehr "freundlich".
- **Borders über Shadows**, wo möglich[^5]. Linear lehnt sich auf 1-px-Borders mit niedrig-Kontrast-Hairlines, statt jedes Element in einen Schatten zu setzen. Das passt zu Behördenkontext (weniger "App", mehr "Dokument").
- **Reduzierte Icon-Dichte**[^5]. Konkret: in Posteingang LetterCard sind 6 Icons sichtbar (Behörde, Frist, Status, Auth-Badge, Aktion, Sprache). Linears Lehre: reduzieren auf 2–3, der Rest in Hover/Expand. Das deckt sich mit der bereits existierenden Posteingang-UX-Critique (`docs/research/2026-05-09-posteingang-ux-critique.md` Issue 1).

Was wir **NICHT** übernehmen:
- Linears Dark-First-Default — wir sind Light-First (siehe Dark-Mode-Entscheidung).
- Linears Mono-Font für Code/IDs — Aktenzeichen sind keine Code-IDs, sondern Behörden-Identifikatoren; Source Sans 3 mit `font-variant-numeric: tabular-nums` reicht.

### 6. Apple Wallet — der Acker für Wallet-Card-Pattern (V1.3 mDL ist bereits live)

Was wir übernehmen:
- **Pass-Card-Metapher**: rechteckige Karte mit gerundeten Ecken (Apples Wallet-Card-Radius ist ~14 px), klare Hierarchie Titel/Hauptdatum/Footer, ISO-18013-5-konformer mDL-Inhalt[^18]. Unsere `WalletMdl`-Card (`src/components/stammdaten/wallet/`) referenziert dieses Pattern bereits.
- **"Identity data shared only when explicitly approved"**[^18] — das ist die UX-Botschaft der EUDI-Wallet-Ära. Jede Datenfreigabe braucht eine sichtbare Diff "wir teilen X, nicht Y".
- **Tap-to-reveal für sensible Felder**: Apple zeigt FE-Nummer / Adresse nur nach Auth. Das passt 1:1 zu unserem Punktestand-on-Demand-Pattern aus V1.3 (`PunkteEidReauthModal`).

Was wir **NICHT** übernehmen:
- Apples Glassmorphism/Liquid-Glass-Treatment (iOS 26) — der Trust-Anker bricht sofort. Behörden-UI muss "fest" wirken, nicht "schwebend-transluzent".
- Den signature Apple-Pink/Orange-Gradient. Behördenkontext = neutral.

### 7. Mercury Banking / Notion — Wow-Moment-Patterns

Was wir übernehmen — *3 spezifische Mikro-Interaktionen*:
- **Mercury's "numberless-card" Reduktion**[^19]: Wallet/Ausweis-Cards zeigen Sensible-Felder nur reveal-on-demand — wir machen das in Stammdaten schon (`MaskedField`), Mercury bestätigt das als premium-Pattern.
- **Notion's AI-Handoff-Swirl-Animation**[^20]: wenn der Autopilot "übernimmt" und Behörden in Sync setzt, brauchen wir genau einen klaren, langsamen Übergang (≥ 400 ms), der den Hand-off markiert. Das ist der Stelle wo unsere AutopilotTimeline-Komponente Polish bekommt.
- **Arc Browser's subtle audio cue**[^20] — *nicht übernehmen* (Audio in Behörden-UI bricht den Trust-Anker), aber das visuelle Äquivalent: ein 300-ms pulse-glow auf der gerade synchronisierten Behörde in der Cascade.

---

## Konkrete Token-Tabellen (copy-pasteable in `tailwind.config.ts` und `src/app/globals.css`)

### Typography

| Token | px (large ≥640) | px (small <640) | line-height | font-weight | Tailwind-Klasse-Vorschlag |
|---|---|---|---|---|---|
| `text-display` | 48 | 32 | 50/35 | 700 | `text-5xl` (override) |
| `text-h1` | 36 | 27 | 40/30 | 700 | `text-4xl` (override) |
| `text-h2` | 24 | 21 | 30/25 | 600 | `text-2xl` |
| `text-body-l` | 24 | 21 | 30/25 | 400 | `text-xl` (lead body) |
| `text-body` | 19 | 19 | 25/25 | 400 | `text-lg` |
| `text-body-s` | 16 | 16 | 20/20 | 400 | `text-base` |
| `text-caption` | 14 | 14 | 18/18 | 500 | `text-sm` — only for labels, never body |

Werte direkt aus GOV.UK-Scale[^2][^4]. Begründung 5-px-Line-Heights: gemeinsamer Vertikalrhythmus mit Spacing-Scale.

**Font-Stack** (per-Locale differenziert):

```css
/* Default + DE/EN/RU/UK/TR */
--font-sans: "Source Sans 3", -apple-system, BlinkMacSystemFont,
             "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif;

/* AR-Locale (RTL): Source Sans 3 hat eingeschränkte arabische Glyphen,
   deshalb ein expliziter Fallback auf Noto Sans Arabic vor system-ui */
[lang="ar"] {
  --font-sans: "Source Sans 3", "Noto Sans Arabic", "Segoe UI",
               system-ui, -apple-system, sans-serif;
}

/* Tabular-Variante wird nicht via Font-Switch, sondern via
   font-variant-numeric: tabular-nums aktiviert (gleiches Glyph-Set,
   andere OpenType-Feature). */
.tabular { font-variant-numeric: tabular-nums; }
```

**Begründung für Source Sans 3 — tech-only, keine Lookalike-Argumente**:
1. SIL Open Font License[^1] — keine Lizenz-Gebühr, kein Vertragspartner-Status nötig, kommerzielle und Demo-Nutzung explizit erlaubt.
2. 9 Weights (200/300/400/600/700/900 + Italic-Pendants) — deckt Display/Body/Caption/Numeric-Bold ohne Stack-Wechsel.
3. Deutsche Diakritika (ä/ö/ü/ß/ẞ) inkl. großes Eszett (U+1E9E) als eigener Glyph — relevant für korrekte Behörden-Tonalität.
4. DIN-91379-Cover grossteils gedeckt (für Personennamen-Sonderzeichen).
5. Hohe x-Höhe + slashed zero + disambiguierte 1/l/I — kritisch für Aktenzeichen, FE-Nr, IBAN-Lesbarkeit.
6. Tabular-Nums-Variante via OpenType-Feature `tnum` (kein zweiter Font-Load).

**Tabular-Numerals Pflicht für** (HL-DS-6): Aktenzeichen, Frist-Daten, FE-Nr, Kfz-Kennzeichen, IBAN, AZR-IDs, Renten-Versicherungsnummer.

### Spacing — Entscheidung: Option A (additiv, kein Override)

**Konflikt**: Iteration 1 hat eine 5-px-Basisunit aus GOV.UK-Pattern[^3] empfohlen. Das **bricht Tailwinds 4-pt-Default** und damit alle bestehenden `p-1`/`m-2`/`gap-4`/`space-y-N`-Sites in V1.0/V1.1/V1.2/V1.3.

**Sites-Count (Beweis, dass Override teuer ist)**:

| Klassen-Familie | Files | Occurrences (sample) |
|---|---|---|
| `p-N` (alle Stufen) | 71 Files | 113 Hits (head-Sample, geschätzt 200+ gesamt) |
| `shadow-*` + verwandte | 108 Files | 294 Hits |
| `m-N` / `gap-N` / `space-y-N` (head-Sample) | ≥ 50 Files | dutzendweise |

**Entscheidung — Option A**: Tailwind-4-pt-Default bleibt **unangetastet**. Existierende `p-1`/`p-2`/`p-3`/`p-4` rendern weiterhin als 4/8/12/16 px. Wir adressieren GOV.UK's 5-px-Vertikalrhythmus auf **zwei** kompatiblen Wegen:

1. **Line-Heights** als 5-px-Vielfache nur in den `--line-height-*` CSS-Variablen (Type-Scale-Tabelle oben hat das schon: 20/25/30/35/40/50). Diese sind unabhängig vom Padding/Margin-System und garantieren den Vertikalrhythmus auf Textebene.
2. **Additive Fixed-Spacing-Tokens** `--space-fixed-5/10/15/20/25/30/40/50/60` (px) — neue Komponenten dürfen die nutzen via `style={{ padding: 'var(--space-fixed-15)' }}` oder via Tailwind v4 arbitrary value `p-(--space-fixed-15)`. Bestehende Komponenten werden **nicht** migriert.

Tailwind v4 `@theme`-Block, additiv:

```css
@theme {
  /* DO NOT override --spacing-* (those are Tailwind's 4-pt scale and are
     consumed by p-1, p-2, p-3, p-4, …). Adding parallel fixed-spacing
     tokens for new components that need 5-px-aligned padding. */
  --space-fixed-5: 5px;
  --space-fixed-10: 10px;
  --space-fixed-15: 15px;
  --space-fixed-20: 20px;
  --space-fixed-25: 25px;
  --space-fixed-30: 30px;
  --space-fixed-40: 40px;
  --space-fixed-50: 50px;
  --space-fixed-60: 60px;

  /* Line-heights for type scale (5-px-multiples) */
  --line-height-display: 50px;
  --line-height-h1: 40px;
  --line-height-h2: 30px;
  --line-height-body-l: 30px;
  --line-height-body: 25px;
  --line-height-body-s: 20px;
  --line-height-caption: 20px;
}
```

**Warum nicht Option B (Tailwind-Override)**:
- 113+ `p-N`-Sites + 100+ `gap`/`m`/`space-y`-Sites müssten manuell auditiert werden — geschätzt 6–8 h frontend-coder-Arbeit + 2 h a11y-tester-Verifikation, plus Regressions-Risiko bei V1.3 Pflichtumtausch-Banner-Spacing (HL-MOB-spezifische Layout-Annahmen).
- V1.3 hat erst vor 1 Tag (2026-05-13) gerade verifier-locked Layouts gerendert. Ein Spacing-Token-Override würde alle visuellen Hard-Lines neu validieren müssen.
- GOV.UK-Vertikalrhythmus ist eine Type-Ebenen-Garantie (Line-Heights aligned), nicht eine Padding-Ebenen-Garantie. Wir holen den Hauptnutzen über Line-Heights ein.

**Wann darf später migriert werden**: Wenn V2.0 ein größerer Refactor mit dedizierter Token-Migrations-Story ist, kann Option B re-evaluiert werden. Bis dahin: **kein Tailwind-Spacing-Override**.

### Color (OKLCH-Notation, alle ≥ 4.5:1 gegen White/Surface)

**Iteration-2-Härtung**: Iteration 1 hatte Chroma bis 0.012 für warm-neutral. Domain-expert: "sichtbar warm, driftet Richtung Booking.com / Airbnb". Iteration 2 cappt **Chroma auf ≤ 0.005** für alle Surface- und Border-Tokens. Der warm-Tone ist jetzt **wahrnehmbar nur in direkter Side-by-Side-Vergleichssituation**, nicht als Brand-Statement.

| Token | Light hex | Light OKLCH | Dark hex | Dark OKLCH | Verwendung |
|---|---|---|---|---|---|
| `--color-surface` | #FFFFFF | `oklch(100% 0 0)` | #0F1115 | `oklch(15% 0.004 250)` | Page background |
| `--color-surface-raised` | #FAFAF8 | `oklch(98% 0.002 80)` | #161A20 | `oklch(20% 0.005 250)` | Card background — minimaler Warm-Tone (Chroma 0.002) |
| `--color-surface-muted` | #F2F1ED | `oklch(95% 0.003 80)` | #1C2128 | `oklch(24% 0.006 250)` | Section dividers (Chroma 0.003) |
| `--color-border` | #DCDAD3 | `oklch(86% 0.004 80)` | #2B2F38 | `oklch(32% 0.008 250)` | 1-px Hairlines, Chroma 0.004 (cap-konform) |
| `--color-border-strong` | #9F998D | `oklch(65% 0.005 80)` | #4A5060 | `oklch(45% 0.01 250)` | Focus rings, dividers, Chroma 0.005 (cap-Grenze) |
| `--color-text-primary` | #1A1D23 | `oklch(20% 0.005 250)` | #ECEEF2 | `oklch(94% 0.004 250)` | Body text — ≥ 14:1 gegen surface |
| `--color-text-secondary` | #4A5060 | `oklch(42% 0.012 250)` | #B4BAC4 | `oklch(78% 0.008 250)` | Captions, metadata — ≥ 7:1 (Text-Tokens dürfen Chroma > 0.005, nur Surface/Border ist gecappt) |
| `--color-text-muted` | #6B7280 | `oklch(55% 0.015 250)` | #8A93A0 | `oklch(64% 0.012 250)` | Disabled, placeholder — ≥ 4.5:1; **V1.5.1 `--muted-foreground` Härtung 5.63 light / 5.53 dark bleibt verbindlich, HL-DS-7 — diese Werte sind das Floor, nicht das Target** |
| `--color-accent` | #1A4D8F | `oklch(40% 0.12 252)` | #6FA8FF | `oklch(72% 0.13 252)` | Primärer Trust-Blau — der einzige chromatische Akzent (HL-DS-3) |
| `--color-accent-soft` | #E8F0FA | `oklch(95% 0.025 252)` | #1F3A5C | `oklch(32% 0.05 252)` | Hover/active background |
| `--color-warning` | #946400 | `oklch(55% 0.13 80)` | #E5B547 | `oklch(78% 0.13 80)` | Frist/Achtung — gelb, nie Default |
| `--color-warning-soft` | #FFF8E1 | `oklch(97% 0.04 90)` | #3A2D0E | `oklch(28% 0.05 80)` | Banner background — **kompatibel mit `text-amber-950` aus V1.3 UmzugBridgeBadge (HL-DS-7, nicht brechen)** |
| `--color-danger` | #B3261E | `oklch(48% 0.18 27)` | #F2837C | `oklch(72% 0.13 27)` | Fehler/abgelaufen — sehr sparsam |
| `--color-success` | #2D6B3F | `oklch(45% 0.12 152)` | #6FCB8B | `oklch(76% 0.11 152)` | Erfolg/sync_ok |
| `--color-info-soft` | #E6EEF7 | `oklch(94% 0.018 245)` | #1F2C3E | `oklch(28% 0.04 245)` | **NEU — Föderalismus-Disclaimer-Card-Pattern (V1.2)** — siehe Domain-Patterns-Sektion |

**Begründung Chroma-Cap ≤ 0.005 (verschärft gegen Iteration 1)**:
- Concept-verifier hat in Iteration 1 markiert: Hue 80° mit Chroma 0.008–0.012 ist im 5"-Mobile-Render side-by-side mit Booking.com-Listing-Cards optisch nahe.
- USWDS warm-vs-cool[^11] empfiehlt für Government-Kontext sehr-niedrige-Chroma (0.002–0.005).
- Cap 0.005 ist die obere Grenze, an der "warm" noch wahrnehmbar bleibt aber das Signal "Brand-Identity" nicht überschreitet.
- Text-Tokens (text-primary/secondary/muted) dürfen Chroma 0.005–0.015 behalten, weil Text-Hue für Lesbarkeits-Wahrnehmung weniger relevant ist als Surface-Hue.

Akzent `#1A4D8F` (kalibriertes Trust-Blau, nicht das gesättigte Bundesblau): bewusst entsättigt vom typischen Government-Blau-Klischee, nahe an gov.uk's Hyperlink-Blau, AA-konform gegen weiss (8.06:1 verifiziert mit WebAIM-Calculator-Logik).

### OKLCH-Browser-Fallback-Strategie

**Problem**: Tailwind v4 generiert OKLCH-native Werte, gibt **keinen** `@supports`-Fallback. Behörden-Endgeräte mit Windows 10 + Edge Legacy (Chromium ≤ 108) oder ältere institutionelle Browser können OKLCH nicht parsen → Farben sind `transparent` oder `unset`.

**Strategie — PostCSS-Plugin `@csstools/postcss-oklab-function`** (Teil des `postcss-preset-env`-Stage-2-Bundles):
- Wandelt OKLCH-Werte zur Build-Zeit in HEX/RGB-Fallback via `@supports not (color: oklch(0% 0 0))`-Block.
- Plugin ist Tailwind-v4-kompatibel (PostCSS-Pipeline läuft nach Tailwind).
- Alternative manuell: `@supports`-Block per Hand pflegen — verworfen, weil 13+ Tokens × 2 Themes × Verwendungs-Verzweigung schnell driftet.

**Konkret in `postcss.config.mjs`**:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-oklab-function': {
      preserve: true,  // OKLCH bleibt für moderne Browser erhalten
      subFeatures: { displayP3: false },  // sRGB-only Fallback, keine P3-Subtilität
    },
  },
};
```

**Acceptance-Test**: spec § "Browser-Support" verlangt manuellen smoke-test in Edge 108 + Firefox 120 + Safari 16. Falls Fallback nicht rendert → spec-Refactor.

### Shadow / Depth (max 3 Tokens — Linear-Restraint-Pattern)

| Token | CSS-Wert | Verwendung |
|---|---|---|
| `--shadow-none` | `none` | Default — meiste Surfaces |
| `--shadow-card` | `0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)` | Cards, raised Surfaces |
| `--shadow-popover` | `0 4px 8px -2px rgb(0 0 0 / 0.06), 0 8px 16px -4px rgb(0 0 0 / 0.08)` | Popovers, dropdowns, tooltips |
| `--shadow-modal` | `0 12px 24px -6px rgb(0 0 0 / 0.10), 0 20px 48px -12px rgb(0 0 0 / 0.14)` | Modals, dialogs |

Werte 60–70% abgeschwächt von Stripes `--shadow-xl`-Familie[^10]. Stripes Original ist für Fintech-Dashboard tuned; wir reduzieren Intensität für Behördenkontext. Default-Hierarchie ist **border-first**, Shadow nur wenn Layering erforderlich.

### Border-Radius

| Token | Wert | Verwendung |
|---|---|---|
| `--radius-none` | 0 | Tables, full-bleed sections |
| `--radius-xs` | 2 px | Inline-Badges, Tags, NormZitatSpan |
| `--radius-sm` | 4 px | Input, Button, Checkbox |
| `--radius-md` | 8 px | Card, Popover |
| `--radius-lg` | 12 px | Modal, large Card |
| `--radius-card` | 14 px | Wallet-Card, mDL — Apple-Pass-Referenz[^18] |
| `--radius-full` | 9999 px | Avatar, Round-Badge, Icon-Button |

Tailwind v4 Mapping[^17]:
```css
@theme {
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-card: 14px;
}
```

### Motion (drei Curves, KEIN Overshoot, reduced-motion-Default)

**Iteration-2-Refactor**: Iteration 1 hatte einen `--motion-handoff` mit `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot-soft). Concept-verifier markiert das als "boing" → spielerisch → Trust-Anker-Bruch. Iteration 2 ersetzt durch ease-in-out-quart **ohne** Overshoot.

| Token | cubic-bezier | Duration | Verwendung |
|---|---|---|---|
| `--motion-ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` (≈ ease-out-quart) | 180 ms | Enter (Modal open, Toast in, Bridge-Badge fade-in) |
| `--motion-ease-in` | `cubic-bezier(0.64, 0, 0.78, 0.39)` | 140 ms | Exit (Modal close, Toast out) |
| `--motion-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` (≈ ease-in-out-quart) | 240 ms | Layout-Shifts, AutopilotTimeline-Sync, Familienkasse-Cascade |
| `--motion-handoff` | `cubic-bezier(0.65, 0, 0.35, 1)` (**kein** Overshoot, gleiche Curve wie ease-in-out, längere Duration) | 400 ms | **Nur** AI-/Autopilot-Handoff-Moments. KEIN Bounce, KEIN Spring. |

`framer-motion`-Pattern (CLAUDE.md fixiert framer-motion sparingly):

```tsx
// src/app/layout.tsx (oder Provider)
import { MotionConfig } from 'framer-motion';

<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

`reducedMotion="user"` respektiert `prefers-reduced-motion` automatisch und disabled Transform/Layout-Animationen, behält aber Opacity[^16]. Das ist genau das, was V1.3 Cascade-Reduced-Motion-Spec bereits manuell macht — wir hoben das auf globalen Default. **Globaler MotionConfig ist HL-DS-4**.

**Hard-Rule (HL-DS-4)**: Animationen ≥ 400 ms (`--motion-handoff`) **müssen** unter `prefers-reduced-motion: reduce` durch einen Opacity-Fade ≤ 200 ms ersetzt werden. (V1.3 a11y-Audit hat das bereits durchgemacht — `fade-in-animation entfernt da axe-Mid-Animation-Sampling`. Lesson stays live.)

---

## Dark Mode — Entscheidung Option B: `prefers-color-scheme` aktiv ab Tag 1, kein UI-Toggle

**Iteration-2-Klarstellung**: Iteration 1 hatte "halb-da" `<html data-theme="light">` hart-gesetzt mit Dark-Tokens definiert aber nicht aktiv. Concept-verifier hat das als blockierend markiert — das ist ein Wider­spruch zu `prefers-color-scheme`-Respekt, und portfolio-reviewers erwarten Dark.

**Entscheidung — Option B**: `prefers-color-scheme: dark` wird **ab Tag 1 aktiv geehrt**. Kein UI-Toggle in V1 (das wäre ein zusätzliches Component + State + Test). Dark-Mode-Tokens werden 1× via axe-PASS validiert (alle 3 Personas, alle Routen, in beiden Modi).

**Wie das in globals.css aussieht** (Skelett, kein finaler Code — product-architect schreibt das aus):

```css
:root {
  color-scheme: light dark;  /* Tells browser we support both — system can pick */
  /* Light tokens are the default */
  --color-surface: oklch(100% 0 0);
  --color-text-primary: oklch(20% 0.005 250);
  /* … */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: oklch(15% 0.004 250);
    --color-text-primary: oklch(94% 0.004 250);
    /* … */
  }
}

/* NO <html data-theme="light"> hardcode. NO toggle component. */
```

**Argumente PRO Option B**:
- 80%+ Nutzer haben Dark-Theme aktiv wo verfügbar[^21].
- Portfolio-Reviewers (DigitalService, BMDS, Tech4Germany) erwarten Dark-Mode-Awareness als 2026-Baseline.
- `<html data-theme="light">`-Hardcode blockiert `prefers-color-scheme` und ist eine Anti-Pattern-Schuld.
- Wallet-mDL-Card (V1.3) sieht in Dark-Mode visuell näher an Apple-Wallet aus — aber siehe HL-DS-12: **die Card folgt strikt Page-Theme, keine mode-Bruch-Sonderlocke**.

**Akzeptierte Trade-offs**:
- Doppel-axe-Audit-Last: jeder Screen muss in Light + Dark axe-clean sein. Wir akzeptieren das als investment. a11y-tester-Pipeline läuft beide Modi (via Playwright `emulateMedia({ colorScheme })`).
- ~25% User mit Astigmatismus/visuellen-Conditions berichten Dark-Lesbarkeitsprobleme[^21] — Mitigation: Dark-Token-Kontraste werden 1:1 gegen die V1.5.1-Härtung 5.63/5.53 gemessen (HL-DS-7), nicht entspannt.

**Was V1 NICHT macht**:
- Kein User-Toggle. Wer Dark will, setzt es im OS. Wer Hell will, setzt es im OS. Wir bauen kein dritter Pfad.
- Keine "Forced-Light"-Routen (auch nicht für Print — Print bekommt eigenes `@media print`, siehe Print-Sektion).

---

## Drei "Wow-Moment-Patterns" — adaptiert für Behördenkontext (Iteration 2: Motion-Discipline-Refactor)

### Pattern 1: Autopilot-Handoff (Iteration 2: kein Overshoot mehr)

**Wo wir das einsetzen**: Sobald Autopilot anfängt, Behörden zu kontaktieren (z.B. Umzug-Vorgang Block A → Block B), zeigt die AutopilotTimeline einen **400-ms-Übergang** mit ease-in-out-quart `--motion-handoff`. Die UI-Sprache: "Sie haben die Kontrolle abgegeben — wir übernehmen jetzt."

**Konkrete Mechanik (Iteration 2, kein Bounce)**:
- 0–120 ms: aktuelle Step-Card fade auf Opacity 0.6 (KEINE Scale-Reduktion mehr — Scale war Iteration 1 und liest als spielerisch)
- 120–300 ms: ein 1-px-Border-Highlight in `--color-accent` wandert von Step N zu Step N+1 via CSS gradient mask animation, Curve `--motion-handoff` = `cubic-bezier(0.65, 0, 0.35, 1)`
- 300–400 ms: Step N+1 Opacity 1.0
- `prefers-reduced-motion: reduce` → ersetzt durch reine Opacity-Crossfade 200 ms (kein Border-Travel)

**Trust-Test-Statement**: "Wenn ein Skeptiker fragt 'wirkt das spielerisch?', ist die Verteidigung: **die Animation hat keinen Spring/Bounce/Scale-Pop. Sie ist eine 400-ms Opacity-Crossfade plus ein 1-px-Linien-Travel mit ease-in-out-quart. Das ist dieselbe Curve, die Material Design 3 für 'standard easing' verwendet — kein Disney-Spring**."

### Pattern 2: Yellow-Letter-Bridge-Highlight (Iteration 2: statisches Outline, kein Pulse)

**Wo wir das einsetzen**: V1.1 Yellow-Letter-Bridge Posteingang → Stammdaten. Wenn der gelbe Brief in Stammdaten "ankommt" und das Pflegegrad-Feld populates, **markieren** wir das betroffene Feld einmal mit einem statischen Outline-Highlight, das nach 1 s wegfadet.

**Iteration-2-Refactor — KEIN loopender Pulse mehr**. Iteration 1 hatte `box-shadow 0 0 0 0 → 0 0 0 8px` Pulse-Animation. Concept-verifier markiert das als "Notification-Pulse-Klingelei" → bricht "ruhig/respektvoll".

**Konkrete Mechanik (statisch + fade-out)**:

```tsx
// YellowLetterEchoCard.tsx (oder dedizierter Highlight-Wrapper)
const [highlighted, setHighlighted] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setHighlighted(false), 1000);
  return () => clearTimeout(timer);
}, []);

return (
  <div
    style={{
      outline: highlighted ? '2px solid var(--color-warning)' : '2px solid transparent',
      outlineOffset: '2px',
      borderRadius: 'var(--radius-md)',
      transition: 'outline-color 400ms var(--motion-ease-out)',
    }}
  >
    {/* field content */}
  </div>
);
```

- Outline ist **statisch sichtbar** für 1 s.
- Danach fadet Outline-Color über 400 ms zu `transparent`.
- **Kein Pulse, kein Loop, kein Repeat**.
- `prefers-reduced-motion: reduce` → Outline bleibt 1 s, verschwindet dann instant (kein Color-Fade).
- Aria: `<span role="status" aria-live="polite">Pflegegrad-Feld aus Brief XY aktualisiert</span>` (sr-only).

**Trust-Test-Statement**: "Wenn ein Skeptiker fragt 'wirkt das wie eine Notification-App?', ist die Verteidigung: **das Highlight ist statisch 1 Sekunde sichtbar wie ein Print-Highlight-Marker — keine Bewegung, kein Loop. Es lokalisiert, wo neue Information eingetroffen ist, dann verschwindet es. Das ist Datenminimierung-Visibility, kein Engagement-Trigger.**"

### Pattern 3: Numberless-Wallet-Reveal (Iteration 2: bleibt wie ist, mit Theme-Klausel)

**Wo wir das einsetzen**: V1.3 mDL-WalletCard und alle Stammdaten-Sensible-Felder (FE-Nr, AZR-ID, Renten-Vers-Nr).

**Konkrete Mechanik** (existiert teilweise in `MaskedField`, wir härten es):
- Default-State: Feld zeigt `••• ••• 247` (letzte 3 Zeichen sichtbar)
- "Anzeigen"-Button löst Reveal aus
- Reveal-Animation: 250 ms ease-out, jeder Maskenpunkt cross-fadet zu echtem Zeichen (right-to-left)
- Auto-Re-Mask nach 30 s (UI-Timeout) oder Tab-Blur (whichever first)
- Bei Reveal: ein klarer `<p role="status">` aria-live announcement "FE-Nummer angezeigt — auto-verbergen in 30 Sekunden"

**Iteration-2-Klarstellung (HL-DS-12)**: Wallet-mDL-Card folgt **strikt dem Page-Theme**. Wenn die Page in Light-Mode rendert, ist die Wallet-Card in Light-Mode. Wenn Dark-Mode, Dark-Mode. **Auch für mDL gibt es keinen Mode-Bruch** — keine "Wallet ist immer dunkel weil Apple das so macht"-Sonderlocke. Open-Question aus Iteration 1 hiermit aufgelöst.

**Trust-Test-Statement**: "Wenn ein Skeptiker fragt 'warum reveal nicht direkt offen wie in Online-Banking?', ist die Verteidigung: **Datenschutz-by-Design ist Pflicht (CLAUDE.md Mission-Constraint). Sensible Felder (FE-Nr, AZR-ID, IBAN-Vollnummer) sind in EUDI-Wallet-Logik 'attestation-data-on-request'. Das Reveal-on-Demand-Pattern macht die Datenschutz-Entscheidung sichtbar und re-mask-bar — wie ein Bankschalter-Schiebeschalter.**"

---

## Token-Migration-Mapping (Iteration-2-Pflicht-Sektion)

**Pro Token: ist es (a) **neuer paralleler Token** (kein Rename, kein Breaking Change), oder (b) **Rename existierender Token** (mit Sites-Count)?** Diese Tabelle ist der Vertrag mit dem product-architect: jede Spec-Zeile muss eine dieser Migrations-Strategien deklarieren.

| Neuer Token | Existierender Token (oder "neu") | Sites-Count | Migration-Strategie | Begründung |
|---|---|---|---|---|
| `--color-surface` | `--background` (existiert) | ~108 Files konsumieren `bg-background` via Tailwind | **additiv parallel**: `--color-surface` wird als neuer Token gesetzt, `--background` bleibt erhalten und ge-aliased via `--background: var(--color-surface)` | Kein Tailwind-Class-Refactor nötig |
| `--color-surface-raised` | `--card` (existiert) | shadcn `--card` ist überall in Card-Components | **additiv parallel**: alias `--card: var(--color-surface-raised)` | Kein Refactor von `bg-card`-Sites |
| `--color-surface-muted` | `--muted` (existiert) | ~50 Sites `bg-muted` | **additiv parallel**: alias `--muted: var(--color-surface-muted)` | Kein Refactor |
| `--color-border` | `--border` (existiert) | global via `* { @apply border-border }` | **rename/realiase**: `--border: var(--color-border)` | Werte werden gleich gesetzt, kein visueller Bruch |
| `--color-border-strong` | **neu** | 0 Sites | **neu additiv** | Für Focus-Rings + Dividers |
| `--color-text-primary` | `--foreground` (existiert) | global `text-foreground` | **additiv parallel**: alias `--foreground: var(--color-text-primary)` | Kein Refactor |
| `--color-text-secondary` | **neu** | 0 Sites | **neu additiv** | Captions, metadata |
| `--color-text-muted` | `--muted-foreground` (existiert, V1.5.1 5.63:1/5.53:1 gehärtet) | direkter Token, mehrfach via `text-muted-foreground` referenziert | **rename/realiase**: alias `--muted-foreground: var(--color-text-muted)` **bei identischen Kontrast-Werten** — HL-DS-7 verbietet, dass die Härtung gelockert wird. Neue Werte (light 0.55 lightness, dark 0.64 lightness) müssen die 5.63/5.53-Kontraste bestehen vor Merge. | V1.5.1-Härtung non-negotiable |
| `--color-accent` | `--primary` + `--color-brand-500/600/700` (existieren) | shadcn-Primary an vielen Buttons + 3 brand-Tokens via globals.css | **rename/realiase**: alias `--primary: var(--color-accent)` und `--color-brand-600: var(--color-accent)`. Werte werden gleichgesetzt. | Kein Button-Refactor |
| `--color-accent-soft` | **neu** | 0 Sites | **neu additiv** | Hover/active background |
| `--color-warning` | **neu** als Token; aber `text-amber-950` ist V1.3-shipped | 5 Sites `text-amber-950` in `FoederalismusCardDisclaimer`, `PflichtumtauschBanner`, `UmzugBridgeBadge` | **additiv neu**: `--color-warning` neu definiert; `text-amber-950`-Sites **bleiben unverändert** (HL-DS-7). Tailwind-Amber-Skala ist davon unabhängig. | V1.3 contrast-fix nicht brechen |
| `--color-warning-soft` | **neu** | 0 Sites | **neu additiv** | Banner backgrounds |
| `--color-danger` | `--destructive` (existiert) | shadcn-destructive | **rename/realiase**: alias `--destructive: var(--color-danger)` | Werte gleichsetzen |
| `--color-success` | **neu** | 0 Sites | **neu additiv** | Erfolg-States |
| `--color-info-soft` | **neu** | 0 Sites | **neu additiv** | Föderalismus-Disclaimer-Card-Pattern (V1.2) |
| `--shadow-none` | shadcn-default | implicit | **rename**: explizit dokumentiert | — |
| `--shadow-card` | `--shadow-sm`/`--shadow-md` (Tailwind defaults, 6 Stufen) | ~50+ Sites via `shadow-sm`/`shadow-md`/`shadow-lg`/`shadow-xl` | **additiv parallel + Migration-Window**: neue Komponenten nutzen `--shadow-card`/`--shadow-popover`/`--shadow-modal`. Existierende `shadow-*`-Sites werden in V2.x-Refactor-Pass migriert. **Kein flag-day-Cutover**. | 294 Hits — zu viele für simultaneous-migrate |
| `--shadow-popover` | `--shadow-lg` (Tailwind default) | ~30 Sites via Popover/Dropdown | **additiv parallel**, gleiche Strategie wie shadow-card | — |
| `--shadow-modal` | `--shadow-xl`/`--shadow-2xl` | ~10 Sites via Modal/Dialog | **additiv parallel**, gleiche Strategie | — |
| `--font-sans` | `--font-sans` (existiert, Inter) | global `html { @apply font-sans }` | **value-replace**: Token-Name bleibt, Wert ändert sich von Inter zu Source Sans 3. Sites brauchen keinen Refactor. | 1 Stelle, 1 Edit |
| `--radius-xs` (2px) | **neu** | 0 Sites | **neu additiv** | — |
| `--radius-sm` (4px) | `--radius-sm` (existiert, `calc(var(--radius) * 0.6)` = 6px) | shadcn-Default | **value-replace**: 6 px → 4 px. Sites brauchen keinen Refactor, aber visueller Mini-Shift muss in a11y-tester-Visual-Diff erfasst werden. | Minimal-Bruch akzeptabel |
| `--radius-md` (8px) | `--radius-md` (existiert, 8 px aus `calc(0.625rem * 0.8)`) | shadcn-Default | **value-confirm**: bereits 8 px, keine Änderung | — |
| `--radius-lg` (12px) | `--radius-lg` (existiert, 10 px aus `0.625rem`) | shadcn-Default | **value-replace**: 10 px → 12 px. Mini-Shift im Visual-Diff. | — |
| `--radius-card` (14 px) | **neu** | 0 Sites | **neu additiv** | Wallet-Card-Spezial (V1.3 + Apple-Wallet-Referenz) |
| `--motion-ease-out` / `--motion-ease-in` / `--motion-ease-in-out` / `--motion-handoff` | **neu** | 0 Sites | **neu additiv** | Motion-Tokens existieren bisher nicht zentral |
| `--space-fixed-5..60` | **neu** | 0 Sites | **neu additiv** | Bewusst NICHT `--spacing-*`-Override (siehe Spacing-Sektion) |
| `--line-height-display/h1/h2/body-l/body/body-s/caption` | **neu** | 0 Sites | **neu additiv** | 5-px-Vertikalrhythmus ohne Tailwind-Spacing-Override |

**Migration-Anweisung für product-architect**: Spec § "Migrations-Plan" muss diese Tabelle 1:1 übernehmen + eine Reihenfolge definieren. Empfohlene Reihenfolge:
1. Add new tokens additiv (kein Bruch).
2. Update `--font-sans` Wert (1 Stelle).
3. Alias existing tokens auf neue (z.B. `--background: var(--color-surface)`).
4. Migrate `--muted-foreground` mit Kontrast-Re-Audit (HL-DS-7).
5. Lasse `shadow-*`-Migration bewusst in V2.x — definiere kein flag-day.
6. V1.3-shipped `text-amber-950`-Sites: **nicht anfassen** (HL-DS-7).

---

## Print-Stylesheet (Iteration-2-Pflicht-Sektion)

Bürger drucken Behördenbriefe. Konkrete Print-Targets:
- `LetterReader` (Posteingang-Brief-Detail)
- Vorgangs-Zusammenfassung (Umzug-Run-Report)
- Bescheid-Detail-Views (Steuer, Renten, Pflege, Kfz-Steuer)
- mDL-Wallet-Attestation-Preview (Backup-Print)

**Konkrete `@media print`-Regeln** (zur 1:1-Übernahme in `globals.css`):

```css
@media print {
  /* Reset to monochrome, no shadows, no decorative gradients */
  :root {
    --color-surface: #ffffff;
    --color-surface-raised: #ffffff;
    --color-surface-muted: #ffffff;
    --color-text-primary: #000000;
    --color-text-secondary: #000000;
    --color-text-muted: #444444;
    --color-border: #000000;
    --color-border-strong: #000000;
    --color-accent: #000000;
    --color-accent-soft: #ffffff;
    --color-warning: #000000;
    --color-warning-soft: #ffffff;
    --color-danger: #000000;
    --color-success: #000000;
    --color-info-soft: #ffffff;
    --shadow-card: none;
    --shadow-popover: none;
    --shadow-modal: none;
  }

  /* Page setup — A4 portrait */
  @page {
    size: A4 portrait;
    margin: 20mm 18mm 22mm 18mm;  /* Top/right/bottom/left */
  }

  /* Typography — Source Sans 3 stays, body 11pt for print legibility */
  html {
    font-family: 'Source Sans 3', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000000;
    background: #ffffff;
  }

  /* Tabular-nums MUST stay — Aktenzeichen/FE-Nr/IBAN lesbar */
  .tabular,
  [data-tabular],
  th, td {
    font-variant-numeric: tabular-nums;
  }

  /* Hide non-print UI: nav, sidebar, modals, sticky CTAs, hover-states */
  nav, aside, [role="navigation"],
  .sidebar, .topbar, .footer-nav,
  [data-print="hide"],
  button:not([data-print="show"]),
  .sticky-frist-action,
  [data-popover], [data-modal] {
    display: none !important;
  }

  /* Show normally-hidden elements: original-text-block, footnotes */
  [data-print="show"] {
    display: block !important;
  }

  /* Page-break hygiene: nie mitten in einer Briefkarte */
  .letter-card, .bescheid-section, .vorgang-step {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  h1, h2, h3 { page-break-after: avoid; break-after: avoid; }

  /* QR-Block + Verify-URL Footer — Pflicht für jeden ge-druckten Brief */
  .print-footer {
    position: fixed;
    bottom: 10mm;
    left: 18mm;
    right: 18mm;
    border-top: 1pt solid #000;
    padding-top: 4mm;
    font-size: 9pt;
    color: #000;
  }
  .print-qr {
    /* QR-Block bleibt sichtbar — er ist die Verify-URL-Brücke */
    display: block;
    width: 22mm;
    height: 22mm;
  }

  /* Hyperlinks: zeige URL inline für Print */
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 9pt;
    color: #444;
  }
  a[href^="#"]::after,
  a[href^="javascript:"]::after {
    content: "";
  }
}
```

**Acceptance-Test (product-architect spec)**: print-Preview von `LetterReader` zeigt: schwarz auf weiß, Source Sans 3, Aktenzeichen mit tabular-nums, QR-Block + Verify-URL im Footer, kein Sticky-CTA, keine Sidebar.

---

## BITV 2.0 Hochkontrast-Modus (Iteration-2-Pflicht-Sektion)

BITV 2.0 verlangt — implizit über WCAG 1.4.6 AAA — dass User mit Sehbeeinträchtigungen erhöhte Kontraste anfordern können. Moderne Browser exposen das via `prefers-contrast: more` (CSS Media Query Level 5). V1 exposed **keinen User-Toggle**, aber der Token-Layer muss `prefers-contrast: more` ehren — das ist der BITV-konforme Pfad.

**Ziel-Kontraste im High-Contrast-Modus**:
- Text auf Surface: ≥ 7:1 (WCAG 1.4.6 AAA)
- UI-Komponenten (Border, Focus-Ring): ≥ 4.5:1 (statt 3:1)
- Disabled/Placeholder: ≥ 4.5:1 (bleibt 4.5:1, da Disabled-State qua Definition niedriger ist, aber **nicht unter 4.5:1**)

**Konkreter CSS-Block** (zur 1:1-Übernahme):

```css
@media (prefers-contrast: more) {
  :root {
    /* Text wird absolut schwarz / weiß */
    --color-text-primary: oklch(0% 0 0);
    --color-text-secondary: oklch(15% 0 0);
    --color-text-muted: oklch(30% 0 0);  /* statt 0.55 → 0.30, gibt ≥ 9:1 */

    /* Borders werden strong-default */
    --color-border: oklch(40% 0 0);  /* statt 0.86 → 0.40, gibt ≥ 4.5:1 */
    --color-border-strong: oklch(20% 0 0);  /* Focus-Ring deutlich */

    /* Accent bleibt dunkel-blau aber satt */
    --color-accent: oklch(28% 0.18 252);  /* statt 0.40 → 0.28, gibt ≥ 12:1 */

    /* Warning/Danger werden monochrom-stark */
    --color-warning: oklch(30% 0.15 80);
    --color-danger: oklch(30% 0.2 27);
    --color-success: oklch(30% 0.13 152);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-text-primary: oklch(100% 0 0);
      --color-text-secondary: oklch(92% 0 0);
      --color-text-muted: oklch(80% 0 0);
      --color-border: oklch(70% 0 0);
      --color-border-strong: oklch(85% 0 0);
      --color-accent: oklch(85% 0.13 252);
    }
  }

  /* Focus-Ring deutlicher */
  *:focus-visible {
    outline-width: 3px !important;
    outline-offset: 3px !important;
  }
}
```

**Acceptance-Test**: a11y-tester muss `prefers-contrast: more`-Modus via Playwright `emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' })` und manuell mit Edge "Use High Contrast"-Mode prüfen. axe muss 0/0/0/0 reporten.

---

## Touch-Target + Input-Höhe — Hard-Lines mit Pixel-Konstanz

**HL-DS-8 — Touch-Target ≥ 44 × 44 CSS-px (WCAG 2.5.5)**. Alle interaktiven Elemente (Button, Link-Button, Icon-Button, Checkbox-Hitbox, Radio-Hitbox, Toggle, Tab) müssen mindestens 44 × 44 CSS-px Klickfläche haben.

**HL-DS-9 — Input-Höhe ≥ 48 px (Tastatur-Bedienbarkeit + Mobile-Tipp-Genauigkeit)**. Text-Inputs, Selects, Datepicker, Textarea-Single-Line.

**Pixel-Konstanz-Konflikt mit Grid**:
- 44 ist nicht durch 5 (5-px-Line-Height-Grid) noch durch 4 (Tailwind-Spacing-Grid) teilbar.
- 48 ist durch 4 teilbar (Tailwind `h-12`), aber nicht durch 5.

**Auflösung — wir verteidigen Pixel-Konstanz vs Grid-Snap**:
- 44/48 sind **a11y-Mindestmaße**, keine Design-Token-Wahl. Sie sind **absolut**, nicht relativ zum Grid.
- Wir snappen die Grid-Vielfache auf den **nächsten ≥ 44/48-Schritt**: Button-Höhe = `48 px` (h-12 in Tailwind), Icon-Button = `44 × 44` (custom CSS oder `h-11 w-11`).
- Vertikalrhythmus wird über `margin-top`/`gap` gewahrt, das **innerhalb** der Komponente liegt; die Komponentenhöhe selbst darf 44/48 sein, ohne den Außen-Rhythmus zu brechen (Linear-Pattern: "rhythm is about gaps, not heights").

**Konkrete Tokens**:

```css
@theme {
  --size-touch-min: 44px;        /* HL-DS-8 floor */
  --size-input-min: 48px;        /* HL-DS-9 floor */
  --size-button-default: 48px;   /* Match input height for form alignment */
  --size-icon-button: 44px;
}
```

**Acceptance-Test**: code-reviewer + a11y-tester checken via Playwright `boundingBox()` für jede interaktive Komponente.

---

## Tabellen-Pattern für Bescheide (Iteration-2-Pflicht-Sektion)

Steuerbescheid, Renten-Bescheid, Pflegegrad-Beurteilung, Kfz-Steueraufstellung haben einen wiederkehrenden Tabellen-Pattern: Label links, Betrag rechts (tabular-nums), Summenzeile fett mit Top-Border.

**Konkrete Tokens + Klassen**:

```css
@theme {
  --table-row-height: 40px;            /* Min row height */
  --table-row-padding-y: 8px;          /* Vertical padding inside row */
  --table-row-padding-x: 12px;
  --table-summary-border-top: 2px solid var(--color-border-strong);
  --table-summary-font-weight: 600;
}

.bescheid-table {
  width: 100%;
  border-collapse: collapse;
}

.bescheid-table th,
.bescheid-table td {
  min-height: var(--table-row-height);
  padding: var(--table-row-padding-y) var(--table-row-padding-x);
  vertical-align: baseline;
  border-bottom: 1px solid var(--color-border);
}

.bescheid-table th {
  text-align: left;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.bescheid-table td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.bescheid-table tr.summary td {
  border-top: var(--table-summary-border-top);
  font-weight: var(--table-summary-font-weight);
}
```

**Regeln (Hard)**:
- Row-height ≥ 40 px (für Lesbarkeit auf Print + Touch).
- Numerik-Spalten **immer right-aligned** mit `tabular-nums`.
- **KEIN Zebra-Pattern** — Background-Stripes brechen Print-Kompatibilität (Browsers strippen Background-Print per default; Inhalte rutschen optisch).
- Summenzeile: `font-weight: 600 + border-top: 2px solid var(--color-border-strong)`.

---

## Behörden-Kategorien-Farbe — explizite Nicht-Entscheidung (HL-DS-10)

**HL-DS-10**: Bund / Land / Kommune tragen **keine** eigene Farb-Differenzierung. Nur Text-Label (`"Bundesbehörde"` / `"Landesbehörde"` / `"Kommunale Behörde"`) plus optional ein Lucide-Icon.

**Begründung**:
- Iteration 1 hatte das als open question — concept-verifier resolved: **keine** zusätzliche Farb-Differenzierung. Das HL-DS-3-Limit "1 chromatischer Akzent + 3 Status-Familien" würde sonst auf 4+ rutschen.
- Föderale Hierarchie ist informativ, nicht visuell-priorisierend. Ein Land-Behörde ist nicht "wichtiger" als eine Kommune — das wäre kommunikativ falsch.
- BITV-Accessibility: Farbe darf nicht das **einzige** Informationsträger sein (WCAG 1.4.1). Wenn Bund vs Kommune nur über Farbe codiert ist, ist das ein Verstoß. Text-Label löst das.

**Konkrete Implementierung** (in `BehoerdenBadge`-Komponente):
```tsx
// Kein color-prop, kein bg-blue / bg-green / bg-red für kategorien.
// Stattdessen:
<Badge variant="outline">
  <Building2 className="h-3 w-3" />  {/* same icon for all */}
  <span>{t(`behoerde.kategorie.${behoerde.kategorie}`)}</span>
</Badge>
```

---

## Domain-eigene Patterns (Iteration-2-Pflicht-Sektion)

Diese Patterns existieren bereits in V1.2 + V1.5.1 und sind **NICHT** im Polish-Refactor weg-zu-refactoren. Sie sind unsere domain-eigene Sprache (kein Stripe/Linear-Vorbild).

### Pattern A: Föderalismus-Disclaimer-Card (V1.2 — `FoederalismusCardDisclaimer.tsx`)

- **Zweck**: kommuniziert, dass ein Feld (z.B. BundID-Postfach-Anbindung) bundesland-/kommune-spezifisch unterschiedlich verlässlich funktioniert.
- **Visuelle Sprache**: blaue Info-Soft-Card mit Lucide-`Info`-Icon, Text in `--color-text-secondary`.
- **Token-Allokation**: `--color-info-soft` (in Color-Tabelle ergänzt).
- **HL-DS-14**: dieser Pattern bleibt erhalten. Spec darf ihn nicht zu Tooltip/Hover-Hinweis "vereinfachen".

### Pattern B: Sticky-Footer-Action (V1.5.1 — `StickyFristAction.tsx`)

- **Zweck**: kommuniziert die primäre Handlungsempfehlung mit Frist-Countdown, klebt am unteren Viewport-Rand auf Mobile.
- **Visuelle Sprache**: Surface-raised, Top-Border 1 px, Padding 16/12 px, primärer Button rechts, Frist-Countdown links.
- **Token-Allokation**: nutzt `--color-surface-raised` + `--color-border` + `--shadow-card`.
- **HL-DS-14**: bleibt erhalten. Spec darf ihn nicht zu Floating-Action-Button (FAB) "modernisieren".

---

## Hard-Lines (HL-DS-1 .. HL-DS-14)

Diese 14 Hard-Lines werden 1:1 in die Design-System-Spec übernommen. Jede ist eine Pflicht-Acceptance-Bedingung für jeden zukünftigen Merge.

- **HL-DS-1**: Das Wort "BundesSans" taucht **nirgends als positive Framing-Referenz** auf — nicht in i18n-JSON, nicht in `/src`-Code, nicht in Git-Commits, nicht in Test-Beschreibungen, nicht in Spec-Marketing-Texten. Erlaubte Ausnahme: Forschungsbriefe + Spec-Hard-Lines, die das Verbot **dokumentieren**. Spec-Lint-Check: `grep -r "BundesSans" src/ public/ src/lib/i18n/locales/` muss 0 Hits liefern.
- **HL-DS-2**: Max 3 Shadow-Tokens (`--shadow-card`, `--shadow-popover`, `--shadow-modal`). Plus `--shadow-none` als expliziter No-Shadow-State. Keine 4./5./6. Stufe.
- **HL-DS-3**: 1 chromatischer Akzent (`--color-accent`, Trust-Blau) + 3 Status-Familien (warning gelb, danger rot, success grün). Plus `--color-info-soft` für Föderalismus. **Keine** zusätzliche Brand-Farbe.
- **HL-DS-4**: `MotionConfig reducedMotion="user"` global gewrappt. Animationen ≥ 400 ms **müssen** unter `prefers-reduced-motion: reduce` durch einen Opacity-Fade ≤ 200 ms ersetzt werden.
- **HL-DS-5**: Kein Glassmorphism, kein Liquid-Glass, kein Audio, kein Konfetti. (Trust-Anker-Bruch.)
- **HL-DS-6**: `font-variant-numeric: tabular-nums` Pflicht für Aktenzeichen, FE-Nr, IBAN, AZR-ID, Renten-Versicherungsnummer, Frist-Daten, Kfz-Kennzeichen.
- **HL-DS-7**: BITV 4.5:1 normal-text, 3:1 large-text + UI — V1.5.1-Härtung 5.63:1 light / 5.53:1 dark für `--muted-foreground` **nicht lockern**. V1.3-shipped `text-amber-950` auf Surface-Warning-Soft **nicht brechen**.
- **HL-DS-8**: Touch-Target ≥ 44 × 44 CSS-px (WCAG 2.5.5).
- **HL-DS-9**: Input-Höhe ≥ 48 px.
- **HL-DS-10**: Behörden-Kategorien (Bund/Land/Kommune) tragen **keine** eigene Farbe — nur Text-Label.
- **HL-DS-11**: Yellow-Letter-Highlight ist **statisches Outline für 1 s mit Fade-out**, **kein** loopender Pulse, **kein** Repeat.
- **HL-DS-12**: Wallet-mDL-Card folgt strikt dem Page-Theme. Keine Mode-Bruch-Sonderlocke "Wallet ist immer dunkel".
- **HL-DS-13**: `@media print` Stylesheet für LetterReader, Vorgangs-Zusammenfassung und Bescheid-Detail-Views ist Pflicht (schwarz auf weiß, A4 portrait, Source Sans 3, tabular-nums, QR-Block + Verify-URL-Footer).
- **HL-DS-14**: Föderalismus-Disclaimer-Card (V1.2) und Sticky-Footer-Action (V1.5.1) sind domain-eigene Patterns und bleiben in Spec/Code erhalten.

---

## Drei UX-Skeptiker-Fragen — vorformulierte Antworten

Diese drei Fragen hat concept-verifier in Iteration 1 als adversarial review eingespielt. Iteration 2 liefert die Antworten, damit product-architect die Spec daraus schreiben kann.

### Frage 1: "Warum nicht einfach KERN-Tokens 1:1 übernehmen statt Source Sans 3 + GOV.UK-Type-Scale frankenstein-mäßig zu mischen?"

**Antwort**: Drei Gründe:
1. **Lizenz**: BundesSans (KERN nutzt das implizit für Bund-CD-Parität in einigen Komponenten-Renders) ist nur für Bundesbedienstete + Vertragspartner lizenziert[^7][^8]. Eine Open-Source-Demo darf das nicht in Production-Bundle ziehen. Source Sans 3 (SIL-OFL) ist die saubere Alternative.
2. **Pixel-Werte sind nicht öffentlich**: die KERN-Tokens (Hex/Spacing-px/Shadow-Werte) liegen im GitLab + Figma-Workspace, nicht auf der öffentlichen Site. Eine Demo, die behauptet "wir sind KERN-Pixel-treu", ohne die Werte verifiziert zu haben, ist kommunikativ unehrlich.
3. **GOV.UK-Type-Scale ist die solider belegte Wahl**: 16/19/24/36/48 px mit 5-px-Line-Heights ist seit 2014 in Produktion auf gov.uk[^2][^4], a11y-validiert. Wir adoptieren das, nicht weil es britisch ist, sondern weil es der best-belegte sans-serif-Government-Type-Scale ist.

**Implikation für Spec**: "Geistig KERN-kompatibel, nicht pixel-identisch — Open-Source-Linie ist die EUPL-Kompatibilität durch Source Sans 3 / Lucide / shadcn".

### Frage 2: "Driftet warm-neutral Hue 80° nicht zu Booking.com / Airbnb?"

**Antwort**: In Iteration 1 — ja, Risiko bestand bei Chroma 0.008–0.012. In Iteration 2 ist **Chroma auf ≤ 0.005 gecappt** (Surface-Tokens) — der Warm-Tone ist nur in direkter Side-by-Side-Vergleichssituation wahrnehmbar, nicht als Brand-Statement. USWDS warm-vs-cool[^11] empfiehlt explizit niedrige-Chroma-Warm-Greys für Government — wir folgen dem.

**Trust-Test-Statement**: "Wenn ein Skeptiker fragt 'sieht das aus wie Booking?', ist die Verteidigung: **die Background-Chroma ist 0.002–0.005, das ist 5–10× niedriger als typische Booking/Airbnb-Backgrounds (die liegen bei ~0.02–0.04 für ihren signature-Beige). Der Warm-Ton ist hier ein Anti-Krankenhaus-LCD-Schutz, kein Brand-Signal**."

**Implikation für Spec**: Visual-Regress-Test gegen Side-by-Side-Mock mit Booking-Listing-Page (Lighthouse-Visual-Diff-PNG-Anhang in spec § "Visual-Regress").

### Frage 3: "Wirkt der Autopilot-Handoff spielerisch?"

**Antwort**: In Iteration 1 — ja, weil overshoot-Curve `cubic-bezier(0.34, 1.56, 0.64, 1)` ein "boing" hatte. In Iteration 2 ist die Curve **`cubic-bezier(0.65, 0, 0.35, 1)`** (ease-in-out-quart, dieselbe wie Material Design 3 "standard easing"). Plus: keine Scale-Reduktion mehr, nur Opacity-Crossfade + 1-px-Border-Travel.

**Trust-Test-Statement**: "Wenn ein Skeptiker fragt 'warum brauchts überhaupt eine Animation für einen State-Wechsel?', ist die Verteidigung: **die Animation kommuniziert eine wichtige Datenschutz-Botschaft — 'die Kontrolle wechselt vom User zum Autopilot'. Ohne visuellen Marker wäre der Hand-off intransparent. Die 400-ms-Dauer + ease-in-out-Curve sind im Material-3-Range — kein Spring, kein Bounce, keine Disney-Mechanik**."

**Implikation für Spec**: Spec § "AutopilotTimeline" muss eine prose-Begründung der Animation aus Datenschutz-Visibility-Sicht enthalten (nicht aus Delight-Sicht).

---

## Implications for our demo

- **Source Sans 3 + GOV.UK-Type-Scale wird als Tailwind v4 `@theme`-Block kodifiziert** — product-architect leitet daraus `docs/specs/design-system-v2.md` ab. Reihenfolge des frontend-coder-Refactors:
  1. Add new tokens **additiv** (kein Bruch der bestehenden V1.0/V1.1/V1.2/V1.3 Sites).
  2. Update `--font-sans` Wert Inter → Source Sans 3 (1 Edit in globals.css).
  3. Alias `--background` / `--card` / `--muted` / `--foreground` / `--primary` auf neue Tokens.
  4. Migrate `--muted-foreground` mit Kontrast-Re-Audit (HL-DS-7 — 5.63 light / 5.53 dark **floor**, nicht target).
  5. Add `--space-fixed-N` parallel zur Tailwind-4-pt-Skala (kein Override).
  6. Add `@media print` Stylesheet (HL-DS-13).
  7. Add `@media (prefers-color-scheme: dark)` mit allen Dark-Tokens.
  8. Add `@media (prefers-contrast: more)` (BITV-Hochkontrast).
  9. Add `MotionConfig reducedMotion="user"` global (HL-DS-4).
  10. Lasse `shadow-*`-Migration in V2.x — definiere **kein** flag-day.
  Jeder Schritt ist a11y-axe-PASS-gated.
- **Drei Wow-Patterns sind in Iteration 2 motion-discipliniert** — Yellow-Letter-Highlight = statisches Outline (kein Pulse), Autopilot-Handoff = ease-in-out-quart (kein Overshoot), Wallet-Reveal = Page-Theme-strict (HL-DS-12). Retrofittable in `AutopilotTimeline`, `YellowLetterEchoCard`, `MaskedField`/`WalletMdl`.
- **HL-DS-1..HL-DS-14 sind die 14 Pflicht-Acceptance-Kriterien** für die Spec. Spec-Lint kann sogar prüfen: ein `grep -r "BundesSans" src/ public/ src/lib/i18n/locales/` muss 0 Hits liefern (HL-DS-1; `docs/` ausgenommen, da Forschungs- und Spec-Texte das Verbot dokumentieren).
- **Risk-Mitigation eingebaut**: Migrations-Mapping-Tabelle macht expliziert, welche bestehenden Sites V1.5.1 / V1.3 nicht verletzt werden. `text-amber-950` und `--muted-foreground`-Härtung sind die zwei roten Linien.

## Risk-Register — Iteration 2 (entschärft + erweitert)

| Risiko | Wahrscheinlichkeit | Severity | Mitigation |
|---|---|---|---|
| Shadow-Inflation: 3 wird zu 6, jede Card schwebt | hoch (Default-Drift) | hoch — bricht "fest/Behörde"-Feeling | HL-DS-2 hard-cap; code-reviewer-Check via `grep "shadow-(xl\|2xl)" src/` muss 0 Hits ergeben für neue Komponenten |
| Akzentfarben-Inflation: 1 Trust-Blau wird zu 3 Brand-Farben | mittel | mittel — wirkt SaaS | HL-DS-3 hard-line — nur 1 chromatische Akzent-Familie + 3 Status-Familien + 1 Info-Soft (Föderalismus) |
| Motion-Inflation: zu viele Easing-Curves, "delight everywhere" | mittel | hoch — bricht "serious/respectful" | 4 Curves total in `--motion-*`-Tokens; jede neue Verwendung muss in Code-Review begründet sein |
| Warm-Neutral driftet zu Booking/Airbnb-Vibe | niedrig (Chroma ≤ 0.005 in Iteration 2) | mittel | Chroma-Cap ≤ 0.005 für Surface (verschärft gegen Iteration 1); Visual-Regress-Test in spec; Fallback auf 250°-Hue falls Reviewer "Booking-Vibe" meldet |
| Wallet-Card mit Glassmorphism/Liquid-Glass | niedrig | hoch — komplett-Bruch | HL-DS-5 hard-line; spec verbietet Glassmorphism explizit |
| Sound-Effects oder Konfetti im Autopilot-Wow | niedrig | sehr hoch — kompletter Trust-Bruch | HL-DS-5 hard-line — kein Audio, kein Konfetti |
| Yellow-Letter-Pulse als loopende Animation re-eingeführt | mittel (frontend-coder-Drift) | mittel — Notification-App-Vibe | HL-DS-11 hard-line — statisches Outline + Fade-out, kein Loop |
| Wallet-Card "ist immer dunkel"-Sonderlocke | mittel | niedrig–mittel — Mode-Bruch | HL-DS-12 hard-line — strict Page-Theme |
| **Token-Migration bricht V1.3 Pflichtumtausch-Banner / V1.5.1 muted-foreground** | mittel (refactor-Drift) | hoch — Visual-/A11y-Regress | Migrations-Mapping-Tabelle: alle V1.x-Sites bleiben unverändert; additive Token-Strategie |
| OKLCH-Render-Bruch in Edge 108 / institutionellen Browsern | niedrig–mittel | mittel | `@csstools/postcss-oklab-function`-Fallback in PostCSS-Pipeline + manueller smoke-test |
| BITV `prefers-contrast: more` nicht geprüft → BITV-Verstoß | niedrig | hoch | Hochkontrast-CSS-Block in spec § "Accessibility"; Playwright-Test mit forced-contrast |

## Open questions

- KERN konkrete Pixel-Werte (Hex / spacing-px) sind nicht öffentlich auf der KERN-Website auslesbar — soll product-architect den Figma-Workspace direkt aufmachen und die Werte gegen unsere ableiten, oder akzeptieren wir "geistig kompatibel"? **Empfehlung: akzeptieren** — Spec-Sätzchen "geistig KERN-kompatibel, nicht pixel-identisch" reicht für die Demo-Story.
- Soll der Logo/Wortmarke-Entscheid (PRD § 8) jetzt anstehen, oder kann er bis nach Design-System-V1 warten? **Empfehlung: warten** — Design-System unabhängig von Brand-Name machbar.
- Brauchen wir eine eigene Behörden-Logo-Strategie (`public/behoerden-logos/`) als generische Initial-Badges (z.B. "FK" für Familienkasse mit `--color-accent-soft`-Background), oder rendern wir nur Text? **Empfehlung**: generische Initial-Badges in `--color-accent-soft`-Background mit Initial-Letter in `--color-accent`, kein Logo-Asset-Pflege. HL-DS-10 verbietet farbliche Kategorie-Differenzierung — die Initial-Badge ist eine Identitäts-Marke, keine Kategorie-Markierung, also konfliktfrei.
- **Iteration-2-resolved (vorher OQ)**: Wallet-mDL-Card Page-Theme-vs-Always-Dark → HL-DS-12 entschieden (Page-Theme-strict).
- **Iteration-2-resolved (vorher OQ)**: Behörden-Kategorien-Farbe → HL-DS-10 entschieden (keine Farbe, nur Text-Label).
- **Iteration-2-resolved (vorher OQ)**: Spacing-Override-Risiko → Option A entschieden (additiv, kein Override).
- **Iteration-2-resolved (vorher OQ)**: Dark-Mode-V1-Strategie → Option B entschieden (prefers-color-scheme aktiv Tag 1, kein UI-Toggle).

---

## Changelog — Iteration 2 (was sich gegenüber Iteration 1 geändert hat)

Diese Sektion macht die Diffs gegenüber dem ersten Brief (vor concept-verifier-REVISE und domain-expert-ALIGNED-WITH-ADJUSTMENTS) explizit, damit product-architect die Spec aus dem aktuellen Stand schreiben kann.

**Strukturelle Erweiterungen** (neue Sektionen):
- Token-Migration-Mapping-Tabelle (Strategie pro Token: additiv / rename-alias / value-replace, plus Sites-Counts für Risk-Einschätzung).
- OKLCH-Browser-Fallback-Strategie (PostCSS-Plugin-Lösung dokumentiert).
- Print-Stylesheet als eigene Sektion mit copy-pasteable `@media print`-Block (A4 portrait, schwarz auf weiß, QR-Block-Footer, Page-Break-Hygiene).
- BITV 2.0 Hochkontrast-Modus (`prefers-contrast: more`-Token-Layer mit ≥ 7:1 Text-Kontrast).
- Touch-Target + Input-Höhe Hard-Lines (44/48 px) mit Pixel-Konstanz-vs-Grid-Snap-Verteidigung.
- Tabellen-Pattern für Bescheide (40-px-Row, right-aligned numeric, kein Zebra, Summen-Border).
- Behörden-Kategorien-Farbe-Nicht-Entscheidung (HL-DS-10).
- Domain-eigene Patterns (Föderalismus-Disclaimer-Card + Sticky-Footer-Action) als Behaltens-Pflicht.
- Hard-Lines HL-DS-1..HL-DS-14 (von 0 nummerierten Hard-Lines in Iteration 1 auf 14 in Iteration 2).
- Drei UX-Skeptiker-Fragen mit vorformulierten Antworten + Trust-Test-Statements pro Wow-Pattern.

**Inhaltliche Refactors (mit Begründung)**:
- TL;DR neu strukturiert, alle 4 Hauptentscheidungen (Spacing/Color/Dark-Mode/Motion) als Option-A/B-Wahl explizit ausgeschrieben.
- Section 3 "Bundesregierung Corporate Design" komplett refraktiert: "BundesSans-nächster-Geist"-Framing **entfernt**, durch HL-DS-1 ersetzt. Source Sans 3 jetzt **rein tech-only** begründet (SIL-OFL, 9 Weights, Diakritika, x-Höhe, tabular-nums, slashed zero).
- AR-Font-Stack explizit ergänzt: `"Source Sans 3", "Noto Sans Arabic", system-ui, …` mit `[lang="ar"]`-CSS-Override.
- Spacing-Sektion: **Entscheidung Option A** (Tailwind-Default unangetastet, additive `--space-fixed-N`-Tokens, 5-px-Rhythmus nur in `--line-height-*`). Sites-Count-Beweis: 113 `p-N`-Hits in 71 Files, 294 `shadow-*`-Hits in 108 Files.
- Color-Sektion: **Chroma-Cap ≤ 0.005** für Surface/Border-Tokens (entschärft von 0.012). `--color-info-soft` (NEU, Föderalismus). Dark-Token-Werte explizit in OKLCH ergänzt. V1.5.1-Härtung 5.63/5.53 für `--muted-foreground` als HL-DS-7 fixiert. V1.3 `text-amber-950` als HL-DS-7-Pflichterhalt fixiert.
- Motion-Sektion: `--motion-handoff` Curve von `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot) zu `cubic-bezier(0.65, 0, 0.35, 1)` (ease-in-out-quart, kein Bounce).
- Dark-Mode-Sektion: **Option B entschieden** — `prefers-color-scheme: dark` aktiv ab Tag 1, kein UI-Toggle, kein `<html data-theme="light">`-Hardcode mehr.
- Wow-Pattern 1 (Autopilot-Handoff): Scale-Reduktion entfernt, nur Opacity-Crossfade + 1-px-Border-Travel. Trust-Test-Statement ergänzt.
- Wow-Pattern 2 (Yellow-Letter): **Loop-Pulse durch statisches Outline + Fade-out ersetzt** (HL-DS-11). Code-Snippet mit `useEffect`-Timer + `outline-color`-transition.
- Wow-Pattern 3 (Wallet-Reveal): Page-Theme-strict-Klausel ergänzt (HL-DS-12).
- Risk-Register erweitert um 4 neue Zeilen (Yellow-Letter-Pulse-Drift, Wallet-Mode-Bruch, Token-Migration-V1-Bruch, OKLCH-Browser-Bruch, BITV-Hochkontrast-Verstoß).
- Open Questions: 4 OQs aus Iteration 1 als "Iteration-2-resolved" markiert (Wallet-Mode, Kategorien-Farbe, Spacing-Override, Dark-Mode).

**Was unverändert geblieben ist**:
- GOV.UK-Type-Scale 16/19/24/36/48 (solide belegt, kein Refactor-Grund).
- Source Sans 3 als Font-Wahl (Begründung jetzt tech-only, Wahl selbst gleich).
- 3-Shadow-Token-Limit (HL-DS-2).
- 1 chromatischer Akzent (Trust-Blau `#1A4D8F` / `oklch(40% 0.12 252)`).
- 7-Stufen-Radius-Skala (xs/sm/md/lg/card/full + none).
- Sources-Liste (21 Quellen, alle aus Iteration 1 erhalten).

## Sources

[^1]: [Source Sans 3 — Google Fonts](https://fonts.google.com/specimen/Source+Sans+3) — accessed 2026-05-14. SIL Open Font License.
[^2]: [Type scale — GOV.UK Design System](https://design-system.service.gov.uk/styles/type-scale/) — accessed 2026-05-14. Confirmed scale 16/19/24/27/36/48/80 with 5-px line-height multiples.
[^3]: [Spacing — GOV.UK Design System](https://design-system.service.gov.uk/styles/spacing/) — accessed 2026-05-14. Responsive vs static scale, 5-px base.
[^4]: [Making the GOV.UK Frontend typography scale more accessible — Design in government blog (2022)](https://designnotes.blog.gov.uk/2022/12/12/making-the-gov-uk-frontend-typography-scale-more-accessible/) — accessed 2026-05-14. Why ≤14 px removed, why 16/19 stay consistent.
[^5]: [Linear — A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh) — accessed 2026-05-14. Refresh philosophy: warm-greys, restraint, borders-over-shadows.
[^6]: [KERN UX-Standard — Design System](https://www.kern-ux.de/design-system/) — accessed 2026-05-14. Atomic Design layering; specific token values not exposed on public site (confidence note).
[^7]: [Schriften — Styleguide der Bundesregierung](https://styleguide.bundesregierung.gov.de/sg-de/basiselemente/schriften) — accessed 2026-05-14. BundesSans / BundesSerif rules, weights, fallbacks.
[^8]: [BundesSans & BundesSerif — truly democratic typefaces (I Love Typography, 2014)](https://ilovetypography.com/2014/07/12/bundessans-and-bundesserif-truly-democratic-typefaces/) — accessed 2026-05-14. Design history, characteristics.
[^9]: [Corporate Design — Styleguide der Bundesregierung](https://styleguide.bundesregierung.de/sg-de/das-corporate-design-der-bundesregierung-2051330) — accessed 2026-05-14. Color spectrum philosophy.
[^10]: [Stripe — Style your app (Stripe Documentation)](https://docs.stripe.com/stripe-apps/style) — accessed 2026-05-14. Spacing tokens 4–96 px, shadow tokens xl/xl-2/xl-3.
[^11]: [Colors — U.S. Web Design System (USWDS) overview](https://designsystem.digital.gov/design-tokens/color/overview/) — accessed 2026-05-14. HSL-based palette, magic-number contrast rules.
[^12]: [WCAG 2.1 — Web Content Accessibility Guidelines (W3C)](https://www.w3.org/TR/WCAG21/) — accessed 2026-05-14. 4.5:1 small text, 3:1 large text + UI components.
[^13]: [Designing accessible color systems — Stripe blog](https://stripe.com/blog/accessible-color-systems) — accessed 2026-05-14. CIELAB-based palette, "5 levels apart for small text" rule.
[^14]: [Designing accessible color systems — CSS-Tricks coverage](https://css-tricks.com/designing-accessible-color-systems/) — accessed 2026-05-14. Independent corroboration of Stripe's method.
[^15]: [Easing functions — Motion (Framer Motion docs)](https://motion.dev/docs/easing-functions) — accessed 2026-05-14. cubic-bezier array signature, easing semantics.
[^16]: [useReducedMotion / MotionConfig — Motion docs (accessibility)](https://motion.dev/docs/react-accessibility) — accessed 2026-05-14. `MotionConfig reducedMotion="user"` global pattern.
[^17]: [Theme variables — Tailwind CSS v4 docs](https://tailwindcss.com/docs/theme) — accessed 2026-05-14. `@theme` block + OKLCH-native color tokens.
[^18]: [Wallet — Apple Developer Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/wallet) — accessed 2026-05-14. Pass-Card patterns, identity-data-on-approval principle.
[^19]: [Fintech card design analysis — fintechbranding.studio](https://fintechbranding.studio/fintech-card-design-trends) — accessed 2026-05-14. Mercury / Nubank / Apple numberless-card trend. (single-source — confirm if load-bearing)
[^20]: [Designing for Delight — Crafting Micro-interactions That Matter (Muzli, 2025)](https://medium.muz.li/designing-for-delight-crafting-micro-interactions-that-matter-61dc45239d69) — accessed 2026-05-14. Notion AI-handoff swirl, Arc tab pulse.
[^21]: [Dark Mode Design Best Practices in 2026 — Tech-RZ](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/) — accessed 2026-05-14. Adoption stats, astigmatism concerns, GOV.UK backlog status.
