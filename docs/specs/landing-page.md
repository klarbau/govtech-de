---
feature: landing-page
title: Public Landing Page — "Behörden, aber auf Autopilot."
status: shipped
track: spine
date: 2026-05-27
author: product-architect
owner_agents: [frontend-coder, i18n-localizer, a11y-tester, code-reviewer]
authorization: research/domain/verify WAIVED — user-supplied complete visual prototype; see docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)". Stage 0 satisfied directly (the user IS the vision source).
inputs:
  foundation: docs/specs/redesign-foundation.md   # tokens (§6.A) + shared primitives (§6.B) — these EXIST
  spine: docs/demo-spine.md                        # headline wow (one sentence)
  current_file: src/app/page.tsx                   # being REPLACED
  conventions: CLAUDE.md
related:
  onboarding: docs/specs/onboarding-login.md       # spine step 1 — the primary CTA target (spec'd in parallel)
---

> **Scope guard.** This spec covers ONLY the public Landing page at `src/app/page.tsx`
> and its new components under `src/components/landing/`. It does NOT touch onboarding
> internals, the `(app)` shell, `next.config.ts`, or real nav destinations (nav links
> and "Mehr erfahren" are in-page anchors / `#` placeholders — see § 4 and § 10).
>
> **Foundation dependency.** Every token, color, radius, shadow, and shared primitive
> referenced here is defined in `docs/specs/redesign-foundation.md` and already shipped
> in code (frontend-coder build log, 2026-05-27). Use ONLY that vocabulary. Do not fork
> the design system or invent a bespoke illustration layer.

---

## 1. Problem statement

Die heutige Startseite (`src/app/page.tsx`) ist ein nüchterner Persona-Auswahl-Schalter ohne erklärende Funktion — ein GovTech-Stakeholder, der das Konzept zum ersten Mal sieht, versteht in den ersten Sekunden weder das Produkt noch das zentrale Wow. Diese Spec ersetzt sie durch eine echte, seriöse Marketing-Landingpage im gov.uk-/DigitalService-DE-Register, die in **einem** Satz erklärt, was das System für Bürger:innen tut, und dann mit einer klaren primären Handlung in die Demo führt. Die Persona-Auswahl wandert in das Onboarding und verschwindet von der Landing.

## 2. Persona & journey

- **Persona/Audience**: Ein:e Entscheider:in / Reviewer:in aus dem deutschen GovTech-Ökosystem (DigitalService, BMDS, Tech4Germany, GovTech Deutschland, GovStart), die den Link zum Demo oder die README öffnet — NICHT die End-Bürgerin selbst. Die Bürger-Personas (Anna Petrov, Familie Schmidt, Mehmet Yıldız) erscheinen erst im Onboarding.
- **Trigger**: Stakeholder öffnet die Demo-URL (Loom-Link, GitHub-README, geteilter Vercel-Link).
- **Outcome**: In < 10 Sekunden versteht der/die Betrachter:in (a) was das Produkt ist ("Bürgerportal für Deutschland, das mitdenkt"), (b) das Autopilot-Wow in einem Satz, und (c) wie man die Demo startet (primärer CTA → `/onboarding`).
- **Time saved vs status quo**: Nicht anwendbar (öffentliche Einstiegsseite, kein Bürger-Vorgang). Der quantifizierte Zeitgewinn des Produkts wird im Hero-Diagramm erzählt (einmal angeben statt mehrfach bei jeder Behörde).

## 3. Success criteria for the demo

- [ ] Betrachter:in versteht das Autopilot-Wow in **einem Satz** in < 10 Sekunden (Hero-Subtitle + Diagramm-Bar konvergieren auf dieselbe Aussage).
- [ ] Das Hero-Diagramm zeigt sichtbar: ein:e Bürger:in → Autopilot → **drei** Behörden empfangen den Vorgang. Auf Mobile stapeln die Knoten vertikal, ohne Bedeutungsverlust.
- [ ] Genau **ein** `<h1>`: „Behörden, aber auf Autopilot." Logische Heading-Hierarchie für die nachfolgenden Sektionen (`<h2>` pro Sektion).
- [ ] Der Prototyp-/Mock-Disclaimer ist unmissverständlich präsent, ohne aufdringlich zu sein (`PrototypeDisclaimerBanner` oben + `PrototypeDisclaimer`-Langform im Footer).
- [ ] Lighthouse a11y > 95 auf `/`; axe 0 kritische Verstöße.
- [ ] Register seriös, minimalistisch, NICHT flashy: keine dekorativen Gradients, kein Glassmorphism, kein Konfetti (HL-DS-5).
- [ ] Light + Dark Mode beide korrekt (rein tokenbasiert).
- [ ] Alle Strings über `t()`; 0 hardcoded; neue Keys ausschließlich unter `landing.*` (+ Reuse von `app.*`/`footer.*`/`common.*`/`shell.*`).

## 4. Screen-by-screen flow

Eine einzige Route, eine Server-Component-Seite, vertikal in fünf Bänder gegliedert: (4.0) Top-Nav, (4.1) Hero zweispaltig, (4.2) Feature-Reihe 1, (4.3) Feature-Reihe 2 (Trust/Tech), (4.4) Footer. Der Sticky-Prototype-Banner steht ganz oben.

### 4.0 Screen-Container

- **Route**: `/`
- **File**: `src/app/page.tsx` — **REBUILD** (ersetzt den Persona-Picker).
- **Server or client**: **RSC** (`export default async function HomePage()` mit `getTranslations`). Kein Client-State auf Seitenebene. Einzige Client-Inseln sind die bestehenden `ThemeToggle` und `LanguageSwitcher` (bereits `'use client'`).
- **Beibehalten (verbindlich)**:
  - Der führende Kommentar über next-intl@3 + Next 15.5 (Zeilen 10–11 der aktuellen Datei) bleibt.
  - `export const dynamic = 'force-dynamic';` bleibt.
- **Page-Hintergrund**: `bg-surface-page` (das kühle Hellgrau hinter weißen Cards). Nav + Hero-Hintergrund weiß (`bg-surface`) wo der Prototyp es zeigt — siehe je Sektion.
- **Layout-Container**: zentrierter Content `mx-auto max-w-6xl px-4 md:px-6` für Hero + Feature-Reihen; Nav und Footer dürfen voll-breit mit eigener Innen-`max-w`-Begrenzung sein.
- **Daten geladen**: KEINE mock-backend-Calls. Reine statische, übersetzte Marketing-Inhalte. (Kein `api.*`-Aufruf — bewusst, die Landing ist datenfrei.)
- **States**: Es gibt nur den Success-State (statischer Inhalt). Kein loading/empty/error — alle Inhalte sind übersetzte Konstanten. (Falls `getTranslations` in einem Nicht-DE-Locale einen fehlenden Key wirft, ist das ein i18n-Parity-Bug, kein Runtime-State — i18n-localizer liefert alle 6 Locales.)

#### Top-Nav-Bar

- **File**: `src/components/landing/LandingNav.tsx` `<NEW>` — RSC (Server Component); rendert die Client-Inseln `ThemeToggle` + `LanguageSwitcher` als Kinder.
- **Layout**: voll-breit, `bg-surface`, untere Hairline `border-b border-border`, `sticky top-0 z-30` (unter dem Prototype-Banner — Banner steht im DOM davor, `z`-Reihenfolge so wählen, dass der Banner sichtbar bleibt; einfachste Lösung: Banner nicht sticky lassen, Nav sticky). Höhe `h-14` (56px), Innen-Container `mx-auto max-w-6xl px-4 md:px-6 flex items-center gap-4`.
- **Links (Wortmarke)**: Reuse `app.name` (`„GovTech DE"`, `font-semibold text-text-primary text-base`) + Separator-Punkt + `app.tagline` (`„Verwaltung neu gedacht."`, `text-text-muted text-sm`, nur ≥ md sichtbar). Optional führendes `Landmark`-Mini-Icon (lucide), `aria-hidden`. Link-Ziel: `/` (Self / scroll-to-top), oder kein Link (reiner Brand-Block) — Brand muss NICHT klickbar sein auf der Landing.
- **Mitte (Nav-Links)**: fünf Anker-Links, nur ≥ md sichtbar, `text-sm text-text-secondary hover:text-text-primary`, `gap-6`, zentriert (`mx-auto` oder `flex-1 justify-center`):
  - „Leistungen ▾" — `landing.nav.leistungen` — Anker `#leistungen` (= Feature-Reihe 1). **Non-funktional als Dropdown**: der `▾`-Chevron ist dekorativ (`aria-hidden`); kein echtes Submenü in dieser Iteration. Link scrollt zu `#leistungen`.
  - „Für Bürger:innen" — `landing.nav.buerger` — Anker `#` (non-funktional Platzhalter).
  - „Für Behörden" — `landing.nav.behoerden` — Anker `#` (non-funktional Platzhalter).
  - „Sicherheit & Datenschutz" — `landing.nav.sicherheit` — Anker `#vertrauen` (= Feature-Reihe 2).
  - „Über uns" — `landing.nav.ueber_uns` — Anker `#` (non-funktional Platzhalter).
  - **Coder-Hinweis**: alle fünf sind `<a href="...">`; `#leistungen`/`#vertrauen` springen zu echten Section-IDs, die übrigen drei sind ehrliche `#`-Platzhalter (im Code mit einem `// non-functional anchor (demo)`-Kommentar markieren). Chevron mirror-sicher (RTL): logischer `ChevronDown` ist orientierungsneutral, ok.
- **Rechts (`ml-auto`, `gap-2`, `flex items-center`)** — exakt zwei Controls + ein Button:
  1. **`ThemeToggle`** (bestehend, `src/components/layout/ThemeToggle.tsx`) — Sonnen-/Mond-Icon, ≥ 44px Touch-Target (bereits foundation-konform).
  2. **`LanguageSwitcher`** (bestehend, `src/components/layout/LanguageSwitcher.tsx`) — kompaktes „DE ▾".
  3. **„Anmelden"-Button** → `/onboarding`. `<Button variant="outline" size="default" asChild>` umschließt `<Link href="/onboarding">` mit führendem lucide `User`-Icon (`data-icon="inline-start"`, `aria-hidden`) + Label `landing.nav.login` (`„Anmelden"`). ≥ 44px (Button-`default`-Size erfüllt das, HL-DS-8).
  - **Reihenfolge-Hinweis**: Der Prototyp zeigt rechts ThemeToggle (Sonne) zuerst, dann „Anmelden". LanguageSwitcher reiht sich daneben ein. Verbindliche Reihenfolge: ThemeToggle → LanguageSwitcher → Anmelden-Button (Sprachschalter vor dem Primär-CTA, damit der Button rechtsbündig endet).
- **Responsive < md**: Die mittleren fünf Links werden **ausgeblendet** (`hidden md:flex`) — KEIN Hamburger in dieser Iteration (die Links sind ohnehin größtenteils non-funktionale Anker; ein Burger-Menü für tote Anker wäre Overhead). Brand (gekürzt auf `app.name`, Tagline `hidden md:inline`), ThemeToggle, LanguageSwitcher und „Anmelden" bleiben sichtbar. Coder-Hinweis: die Entscheidung „hide statt Hamburger" ist bewusst und in § 9 begründet.
- **i18n keys eingeführt**: `landing.nav.leistungen`, `landing.nav.buerger`, `landing.nav.behoerden`, `landing.nav.sicherheit`, `landing.nav.ueber_uns`, `landing.nav.login`. (Brand reuse `app.name`/`app.tagline`.)
- **Accessibility**: `<header>` Landmark um die Nav; die mittleren Links in `<nav aria-label={landing.nav.aria_label}>`. „Anmelden" ist ein echter Link mit zugänglichem Namen (Text + dekoratives Icon `aria-hidden`). Fokusreihenfolge: Brand → Nav-Links → ThemeToggle → LanguageSwitcher → Anmelden. Alle Targets ≥ 44px.

### 4.1 Hero (zweispaltig)

- **File**: `src/components/landing/LandingHero.tsx` `<NEW>` — RSC. Enthält die Diagramm-Komposition als Unterkomponente (siehe `AutopilotDiagram` unten).
- **Layout**: `<section>` mit `id` weder nötig (Hero ist der Einstieg) — Container `mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-20`. Zwei Spalten ≥ md (`grid md:grid-cols-2 gap-10 md:gap-12 items-center`); < md einspaltig, **LEFT zuerst** (Text vor Diagramm).
- **Hintergrund**: `bg-surface-page` (erbt vom Container). Kein Gradient (HL-DS-5).

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ✦ Die Verwaltung, die mitdenkt.            ┌─────────────────────────────┐ │
│                                             │  Sie als Bürger:in          │ │
│  Behörden, aber                             │  ┌───────────────────────┐  │ │
│  auf Autopilot.            (H1, text-5xl)   │  │ Einmal angeben        │  │ │
│                                             │  │ Wir verstehen Ihr …   │  │ │
│  Ein Bürgerportal für Deutschland, das      │  └───────────┬───────────┘  │ │
│  Vorgänge vorbereitet, Daten vorausfüllt    │              │ (dashed)     │ │
│  und den nächsten Schritt erklärt.          │         ( ✦ Autopilot )     │ │
│                                             │   Vorgang vorbereiten /     │ │
│  [ Demo starten → ]  [ Mehr erfahren → ]    │   Daten vorausfüllen /      │ │
│                                             │   Nächsten Schritt erklären │ │
│  🛡 Sicher. Vertrauenswürdig.               │    ╱     │      ╲ (dashed)   │ │
│     Deutschlandweit.                        │ [Ein- ] [Auslän-] [Finanz-] │ │
│                                             │ [wohner][derbeh.][  amt   ]  │ │
│                                             │ ┌─────────────────────────┐ │ │
│                                             │ │ ✓ Sie behalten jederzeit│ │ │
│                                             │ │   Überblick & Kontrolle │ │ │
│                                             │ └─────────────────────────┘ │ │
│                                             └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
        LEFT (text + CTAs)                          RIGHT (diagram card)
```

#### LEFT column

- **Pill-Badge** (oben): kleine Pill mit führendem lucide `Sparkles`-Icon (`aria-hidden`) + Text `landing.hero.badge` (`„Die Verwaltung, die mitdenkt."`). Styling: `inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-primary`. **Reuse-Hinweis**: keine eigene Komponente nötig — komponiert aus Tailwind + `bg-accent-soft`. (Optional als `StatusBadge`-artige Pill, aber `StatusBadge` trägt semantische Status-Varianten; hier ist es eine reine Akzent-Pill → inline.)
- **H1**: `landing.hero.title` = „Behörden, aber auf Autopilot." — `text-4xl font-bold text-text-primary md:text-5xl lg:text-6xl leading-tight tracking-tight`. **Genau dieses eine `<h1>` auf der Seite.**
- **Subtitle**: `landing.hero.subtitle` = „Ein Bürgerportal für Deutschland, das Vorgänge vorbereitet, Daten vorausfüllt und den nächsten Schritt erklärt." — `mt-4 text-lg text-text-secondary leading-relaxed max-w-xl`.
- **CTA-Reihe** (`mt-8 flex flex-wrap gap-3`):
  - **Primär**: `<Button variant="default" size="lg" asChild>` um `<Link href="/onboarding">` — Label `landing.hero.cta_primary` (`„Demo starten"`) + trailing lucide `ArrowRight` (`data-icon="inline-end"`, `aria-hidden`, **RTL-spiegeln** — siehe § 9). Cobalt-Primary.
  - **Sekundär**: `<Button variant="outline" size="lg" asChild>` um `<a href="#leistungen">` — Label `landing.hero.cta_secondary` (`„Mehr erfahren"`) + trailing `ArrowRight` (mirror). Anker zur Feature-Reihe 1.
- **Trust-Zeile** (`mt-6 flex items-center gap-2 text-sm text-text-muted`): führendes lucide `ShieldCheck`-Icon (`aria-hidden`, `text-success` oder `text-text-muted`) + `landing.hero.trust` (`„Sicher. Vertrauenswürdig. Deutschlandweit."`).

#### RIGHT column — Autopilot-Diagramm

- **File**: `src/components/landing/AutopilotDiagram.tsx` `<NEW>` — RSC. **Aus Divs + bestehenden Primitives + Tailwind komponiert; KEINE SVG-Illustration, KEIN bespoke Zeichensystem.** Verbindliche Bauweise unten.
- **Container**: bordered Card — Reuse `<Card>` (`src/components/ui/card.tsx`, border-first, `rounded-lg` 12px, `shadow-none`) oder `<SectionCard padding="lg">`. Innen `flex flex-col gap-4 items-stretch`.
- **Diagramm-Aufbau (von oben nach unten, vertikaler Fluss — der Fluss ist auf allen Breakpoints vertikal, damit Mobile-Stacking trivial ist):**
  1. **Label-Zeile**: `landing.diagram.you_label` (`„Sie als Bürger:in"`) — `text-sm font-medium text-text-secondary`. Optional führendes `Avatar` (Monogramm, neutral) oder `IconCircle` mit lucide `User`. Empfohlen: `IconCircle icon={<User/>} tone="neutral" size="sm"` + Label inline.
  2. **„Einmal angeben"-Card**: kleine getönte Card (`SectionCard variant="muted" padding="sm"` ODER ein `rounded-md border border-border bg-surface p-4`): Titel `landing.diagram.input_title` (`„Einmal angeben"`, `text-base font-semibold`) + Body `landing.diagram.input_body` (`„Wir verstehen Ihr Anliegen und bereiten alles vor."`, `text-sm text-text-secondary`).
  3. **Dashed-Connector** (Card → Autopilot): ein vertikaler gestrichelter Strich, gebaut als `<div aria-hidden="true" className="mx-auto h-6 w-px border-l border-dashed border-border-strong">`. Rein dekorativ.
  4. **Autopilot-Knoten**: zentrierter `IconCircle icon={<Sparkles/>} tone="primary" size="lg"` (cobalt-Akzent-Kreis) mit darunter dem Label `landing.diagram.autopilot_label` (`„Autopilot"`, `text-base font-semibold text-text-primary text-center`) und einer Sublabel-Zeile `landing.diagram.autopilot_sub` (`„Vorgang vorbereiten · Daten vorausfüllen · Nächsten Schritt erklären"`, `text-xs text-text-muted text-center`).
  5. **Dashed-Connector** (Autopilot → Behörden): ein gestrichelter Block, der ≥ md drei Pfade fächert (CSS-Border-dashed, KEIN SVG). Mobile: ein einzelner vertikaler dashed-Strich. Verbindlich: dekorativ, `aria-hidden`. Coder-Freiheit in der genauen CSS-Umsetzung (z. B. ein zentrierter vertikaler Strich + drei kurze Striche), solange (a) gestrichelt, (b) tokenbasiert `border-border-strong`, (c) `aria-hidden`, (d) `prefers-reduced-motion`-irrelevant (keine Animation).
  6. **„Ihre Behörden"-Label**: `landing.diagram.authorities_label` (`„Ihre Behörden"`) — `text-sm font-medium text-text-secondary`.
  7. **Drei Behörden-Cards** (`grid grid-cols-1 sm:grid-cols-3 gap-2`): je eine kleine Card (`rounded-md border border-border bg-surface p-3`) mit `IconCircle size="sm"` + Behörden-Name (`text-sm font-semibold`) + Status-Zeile (`text-xs text-text-muted`):
     - `landing.diagram.behoerde1_name` (`„Einwohnermeldeamt"`) — `landing.diagram.behoerde1_status` (`„Daten prüfen"`) — lucide `Building2`.
     - `landing.diagram.behoerde2_name` (`„Ausländerbehörde"`) — `landing.diagram.behoerde2_status` (`„Antrag bearbeiten"`) — lucide `FileCheck`.
     - `landing.diagram.behoerde3_name` (`„Finanzamt"`) — `landing.diagram.behoerde3_status` (`„Bescheid erhalten"`) — lucide `Receipt`.
  8. **Grüner Kontroll-Bar** (unten, `mt-2`): getönter Balken `rounded-md bg-success-soft px-3 py-2 flex items-center gap-2 text-sm text-success` mit führendem lucide `Check` (`aria-hidden`) + `landing.diagram.control_bar` (`„Sie behalten jederzeit den Überblick und die Kontrolle."`).
- **Diagramm-a11y (verbindlich)**: Das gesamte Diagramm ist eine **dekorativ-illustrative Komposition, deren Bedeutung im Text steht**. Alle Icons und Connectors `aria-hidden="true"`. Die *Bedeutung* darf nicht ausschließlich visuell sein: deshalb trägt das Diagramm-Wrapper-`<section>` (oder ein `<figure>`) ein zugängliches Pendant — entweder ein sichtbares Textgerüst (die Labels oben sind echter Text und werden von Screenreadern gelesen) ODER ein `<figcaption className="sr-only">` mit `landing.diagram.sr_summary` (`„Ablauf: Sie geben Ihr Anliegen einmal an, der Autopilot bereitet den Vorgang vor und benachrichtigt alle zuständigen Behörden — Einwohnermeldeamt, Ausländerbehörde und Finanzamt. Sie behalten jederzeit Überblick und Kontrolle."`). **Verbindlich: das `sr_summary` als `<figcaption className="sr-only">` setzen**, weil die einzelnen Labels (Behördennamen, Statuszeilen) zwar als Text vorliegen, der *Fluss* (Einmal → Autopilot → mehrere Behörden) sonst aber nur über die visuellen Connectors transportiert wird. Wrapper als `<figure aria-labelledby>` oder mit `role="group"` + dem `sr-only` `<figcaption>`.
- **i18n keys eingeführt** (Hero gesamt): `landing.hero.badge`, `landing.hero.title`, `landing.hero.subtitle`, `landing.hero.cta_primary`, `landing.hero.cta_secondary`, `landing.hero.trust`; `landing.diagram.*` (siehe Tabelle § 8).
- **Accessibility (Hero)**: `<section aria-labelledby="hero-h1">` mit der H1 als `id="hero-h1"`. CTAs sind echte `<Link>`/`<a>` mit Textlabels. Touch-Targets ≥ 44px (Button `lg` = 48px). Fokusreihenfolge: H1 (nicht fokussierbar) → Primär-CTA → Sekundär-CTA → (Diagramm enthält keine interaktiven Elemente, wird übersprungen).

### 4.2 Feature-Reihe 1 — „Leistungen" (4 verlinkte Karten)

- **File**: `src/components/landing/LandingFeatureGrid.tsx` `<NEW>` — RSC, parametrisiert (wird sowohl für Reihe 1 als auch Reihe 2 verwendet, siehe Hinweis unten) ODER zwei dünne Sektionen. **Bevorzugt: eine `LandingFeatureGrid`-Komponente, die ein `items[]`-Array + ein `linkable`-Flag rendert.** Jede Karte: `src/components/landing/LandingFeatureCard.tsx` `<NEW>`.
- **Section-Wrapper**: `<section id="leistungen" aria-labelledby="leistungen-h2">` — Container `mx-auto max-w-6xl px-4 md:px-6 py-12`. Optionaler `<h2 id="leistungen-h2">` `landing.features.title` (`„Was die Demo zeigt"`) — sichtbar oder `sr-only`; **verbindlich sichtbar** als `text-2xl font-bold text-text-primary mb-6` (gibt der Sektion eine Überschrift in der Hierarchie).
- **Grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
- **LandingFeatureCard (Prop-Shape — verlinkte Variante)**: `IconCircle` (tone primary) + Titel (`text-base font-semibold`) + Beschreibung (`text-sm text-text-secondary`) + trailing lucide `ChevronRight` (`aria-hidden`, **RTL mirror**). Die ganze Karte ist ein `<Link>` (Reuse `<Card>` als Inhalt). Hover: `hover:shadow-card` (near-flat lift) + `hover:border-border-strong`.
- **Vier Karten** (alle `href` → `/onboarding`; im Code mit Kommentar, dass dies bewusst alle in die Demo führen, statt zu echten Sub-Routen):
  | i18n-Stamm | Titel (DE) | Beschreibung (DE) | lucide Icon | href |
  |---|---|---|---|---|
  | `landing.feature.umzug` | „Umzug" | „Wir melden Ihre neue Adresse bei allen relevanten Stellen." | `Truck` | `/onboarding` |
  | `landing.feature.kindergeburt` | „Kindergeburt" | „Anmeldung im Rathaus, GEMA & mehr – in Minuten." | `Baby` | `/onboarding` |
  | `landing.feature.aufenthalt` | „Aufenthaltstitel verlängern" | „Antrag vorbereiten, Dokumente prüfen, Termin buchen." | `IdCard` | `/onboarding` |
  | `landing.feature.posteingang` | „Posteingang mit KI-Erklärer" | „Verstehen statt verzweifeln – klärt, fasst zusammen, hilft." | `Inbox` | `/onboarding` |
- **i18n keys**: je Karte `*.title` + `*.desc` (8 Keys) + `landing.features.title`.
- **Accessibility**: `<ul>`/`<li>` Liste; jede Karte ein `<Link>` mit zugänglichem Namen = Titel + Beschreibung (Chevron `aria-hidden`). Touch-Target: gesamte Karte (≫ 44px). `<h3>` für Kartentitel (unter dem Sektions-`<h2>`).

### 4.3 Feature-Reihe 2 — „Vertrauen & Technik" (4 nicht-verlinkte Karten)

- **File**: dieselbe `LandingFeatureGrid` mit `linkable={false}` ODER eine zweite Sektion mit `LandingFeatureCard variant="static"`.
- **Section-Wrapper**: `<section id="vertrauen" aria-labelledby="vertrauen-h2">` — Container wie 4.2. `<h2 id="vertrauen-h2">` `landing.trust.title` (`„Auf einer vertrauenswürdigen Basis"`) — sichtbar, `text-2xl font-bold mb-6`. Hintergrund optional `bg-surface` (weißes Band) zur visuellen Abgrenzung von 4.2 — Coder-Freiheit, tokenbasiert.
- **Grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
- **LandingFeatureCard (statische Variante)**: `IconCircle` + Titel + Beschreibung; **kein** Chevron, **kein** Link (`<div>`/`<li>`, nicht klickbar). Hover-Effekt entfällt (keine Interaktivität).
- **Vier Karten** (non-link):
  | i18n-Stamm | Titel (DE) | Beschreibung (DE) | lucide Icon | tone |
  |---|---|---|---|---|
  | `landing.trust.deutschlandid` | „DeutschlandID" | „Sicher anmelden mit Ihrer digitalen Identität." | `Fingerprint` | primary |
  | `landing.trust.eudi` | „EUDI Wallet" | „EU-weit anerkannt und zukunftssicher." | `Wallet` | primary |
  | `landing.trust.bitv` | „BITV-konform" | „Barrierefrei, verständlich und für alle zugänglich." | `Accessibility` | success |
  | `landing.trust.mock` | „Mock-Demo 2027-Vision" | „Ein Blick in die Zukunft der Verwaltung in Deutschland." | `Sparkles` | neutral |
  - **Realismus-Hinweis (verbindlich, § 11)**: Marken-/Tech-Begriffe „DeutschlandID", „EUDI Wallet", „BITV" bleiben in allen Locales latein/bidi-neutral (siehe § 9 RTL). Die Karte „Mock-Demo 2027-Vision" trägt die ehrliche Spekulations-Aussage und stützt damit den Disclaimer — sie behauptet keine reale Behördenanbindung.
- **i18n keys**: je Karte `*.title` + `*.desc` (8 Keys) + `landing.trust.title`.
- **Accessibility**: `<ul>`/`<li>`; statische Karten sind keine Links → kein Touch-Target-Floor. `<h3>` für Titel. Icons `aria-hidden`.

### 4.4 Footer

- **Reuse**: die bestehende `<Footer>`-Komponente (`src/components/layout/Footer.tsx`) — sie enthält bereits den `PrototypeDisclaimer`-Langform-Block (`<details>`) + Impressum/Datenschutz/Barrierefreiheit-Links (alle `#`, foundation-konform getokt). **Direkt wiederverwenden; KEINE landing-eigene Footer-Komponente.** Falls die Landing einen schlankeren Footer braucht, ist das eine Coder-Entscheidung — aber Default: bestehende `<Footer>`, weil sie den honest disclaimer bereits trägt und konsistent mit dem App-Shell ist.
- **i18n keys**: keine neuen (reuse `footer.*` + `common.disclaimer.*` + `shell.footer.landmark`).

#### Prototype-Disclaimer (verbindlich, zwei Ebenen)

1. **Sticky-Banner oben**: Reuse `<PrototypeDisclaimerBanner />` (bestehend) als allererstes Element in `<main>` — wie in der aktuellen Datei (Zeile 25). Bleibt. Macht den Mock-Status sofort sichtbar (warning-soft Band).
2. **Langform im Footer**: der `<PrototypeDisclaimer>`-`<details>`-Block lebt bereits in `<Footer>`. **Kein zusätzlicher Disclaimer im Body nötig** (der alte `<PrototypeDisclaimer defaultOpen />` am Ende der Persona-Sektion entfällt mit der Persona-Sektion). Banner oben + Footer-Langform = unmissverständlich, ohne aufdringlich.

## 5. Autopilot logic

**Nicht anwendbar.** Die Landing ist eine statische Marketing-Seite ohne mock-backend-Interaktion. Sie *erzählt* das Autopilot-Wow visuell (4.1 Diagramm) und sprachlich (Hero-Subtitle, Diagramm-Bar), führt aber selbst keine Autopilot-Orchestrierung aus. Die echte Autopilot-Mechanik lebt in `lib/mock-backend/autopilot/umzug.ts` + `components/autopilot/**` und ist Teil der Vorgänge/Assistent-Screen-Specs (Spine-Schritte 3–6).

## 6. Data model additions / changes

**Keine.** Keine neuen TypeScript-Typen, keine mock-backend-Erweiterungen, keine Seed-Daten, keine localStorage-Keys. Die Landing rendert ausschließlich übersetzte Konstanten.

- **New types**: keine.
- **Mock-backend additions**: keine.
- **Persistence keys**: keine. (ThemeToggle/LanguageSwitcher persistieren ihren eigenen State über bestehende Mechanismen — nicht in dieser Spec.)

## 7. AI assistant integration

**Nicht anwendbar.** Die Landing bindet den Assistenten nicht ein. Keine Tools, keine System-Prompt-Änderungen. (Der Assistent ist eine eigene Hero-Screen-Spec, Spine-Schritt 3.)

## 8. i18n

Track `spine` → **volle 6-Sprachen-Lokalisierung** durch i18n-localizer (de = Source; en, ru, uk, ar, tr human-reviewed). Alle neuen Keys ausschließlich unter `landing.*` (anhängen — die bestehenden 9 Keys `eyebrow`/`title`/`subtitle`/`personas_title`/`personas_helper`/`persona_anna`/`persona_schmidt`/`persona_mehmet`/`cta_continue` werden **NICHT gelöscht, NICHT umsortiert** — concurrent-session-Sicherheit; sie verwaisen, das ist akzeptiert — siehe § 10).

**Reuse (keine neuen Keys anlegen)**: `app.name`, `app.tagline`, `app.skip_to_content`, `footer.imprint`, `footer.privacy`, `footer.accessibility`, `shell.footer.landmark`, `common.disclaimer.prototype_title`, `common.disclaimer.prototype`, `posteingang.watermark.banner` (letztere beide via `PrototypeDisclaimerBanner`/`PrototypeDisclaimer`).

**Neue `landing.*`-Keys (DE source-of-truth):**

| Key | DE source value |
|---|---|
| `landing.nav.aria_label` | „Hauptnavigation" |
| `landing.nav.leistungen` | „Leistungen" |
| `landing.nav.buerger` | „Für Bürger:innen" |
| `landing.nav.behoerden` | „Für Behörden" |
| `landing.nav.sicherheit` | „Sicherheit & Datenschutz" |
| `landing.nav.ueber_uns` | „Über uns" |
| `landing.nav.login` | „Anmelden" |
| `landing.hero.badge` | „Die Verwaltung, die mitdenkt." |
| `landing.hero.title` | „Behörden, aber auf Autopilot." |
| `landing.hero.subtitle` | „Ein Bürgerportal für Deutschland, das Vorgänge vorbereitet, Daten vorausfüllt und den nächsten Schritt erklärt." |
| `landing.hero.cta_primary` | „Demo starten" |
| `landing.hero.cta_secondary` | „Mehr erfahren" |
| `landing.hero.trust` | „Sicher. Vertrauenswürdig. Deutschlandweit." |
| `landing.diagram.you_label` | „Sie als Bürger:in" |
| `landing.diagram.input_title` | „Einmal angeben" |
| `landing.diagram.input_body` | „Wir verstehen Ihr Anliegen und bereiten alles vor." |
| `landing.diagram.autopilot_label` | „Autopilot" |
| `landing.diagram.autopilot_sub` | „Vorgang vorbereiten · Daten vorausfüllen · Nächsten Schritt erklären" |
| `landing.diagram.authorities_label` | „Ihre Behörden" |
| `landing.diagram.behoerde1_name` | „Einwohnermeldeamt" |
| `landing.diagram.behoerde1_status` | „Daten prüfen" |
| `landing.diagram.behoerde2_name` | „Ausländerbehörde" |
| `landing.diagram.behoerde2_status` | „Antrag bearbeiten" |
| `landing.diagram.behoerde3_name` | „Finanzamt" |
| `landing.diagram.behoerde3_status` | „Bescheid erhalten" |
| `landing.diagram.control_bar` | „Sie behalten jederzeit den Überblick und die Kontrolle." |
| `landing.diagram.sr_summary` | „Ablauf: Sie geben Ihr Anliegen einmal an, der Autopilot bereitet den Vorgang vor und benachrichtigt alle zuständigen Behörden — Einwohnermeldeamt, Ausländerbehörde und Finanzamt. Sie behalten jederzeit Überblick und Kontrolle." |
| `landing.features.title` | „Was die Demo zeigt" |
| `landing.feature.umzug.title` | „Umzug" |
| `landing.feature.umzug.desc` | „Wir melden Ihre neue Adresse bei allen relevanten Stellen." |
| `landing.feature.kindergeburt.title` | „Kindergeburt" |
| `landing.feature.kindergeburt.desc` | „Anmeldung im Rathaus, GEMA & mehr – in Minuten." |
| `landing.feature.aufenthalt.title` | „Aufenthaltstitel verlängern" |
| `landing.feature.aufenthalt.desc` | „Antrag vorbereiten, Dokumente prüfen, Termin buchen." |
| `landing.feature.posteingang.title` | „Posteingang mit KI-Erklärer" |
| `landing.feature.posteingang.desc` | „Verstehen statt verzweifeln – klärt, fasst zusammen, hilft." |
| `landing.trust.title` | „Auf einer vertrauenswürdigen Basis" |
| `landing.trust.deutschlandid.title` | „DeutschlandID" |
| `landing.trust.deutschlandid.desc` | „Sicher anmelden mit Ihrer digitalen Identität." |
| `landing.trust.eudi.title` | „EUDI Wallet" |
| `landing.trust.eudi.desc` | „EU-weit anerkannt und zukunftssicher." |
| `landing.trust.bitv.title` | „BITV-konform" |
| `landing.trust.bitv.desc` | „Barrierefrei, verständlich und für alle zugänglich." |
| `landing.trust.mock.title` | „Mock-Demo 2027-Vision" |
| `landing.trust.mock.desc` | „Ein Blick in die Zukunft der Verwaltung in Deutschland." |

> **Anzahl neuer `landing.*`-Leaf-Keys: 44** = 7 nav + 6 hero + 13 diagram + 1 `features.title` + 8 feature-cards (4×2) + 1 `trust.title` + 8 trust-cards (4×2). Die bestehenden 9 `landing.*`-Keys bleiben unverändert (verwaisen). Total `landing.*` nach diesem Spec: 53 (9 alt + 44 neu).
>
> **i18n-localizer-Hinweise:**
> - Marken-/Tech-Begriffe „GovTech DE", „DeutschlandID", „EUDI Wallet", „BITV", „Deutschland-Stack" bleiben in ALLEN Locales latein und bidi-neutral; in AR nicht transliterieren.
> - Behördennamen „Einwohnermeldeamt", „Ausländerbehörde", „Finanzamt": EN/RU/UK/TR übersetzen mit dem deutschen Original in Klammern beibehalten (bestehende Projekt-Konvention für Behörden-Termini); AR analog, deutsche Originale latein in Klammern.
> - „Bürger:innen" / „Bürgerportal": gendergerechte Form in DE; Zielsprachen nutzen die jeweils etablierte inklusive/neutrale Form (EN „citizens", RU/UK neutral, AR/TR neutral).
> - Sie-Form (formal) durchgängig: EN „you" formal, RU „Вы", UK „Ви", AR فصحى formell, TR „Siz".

## 9. Edge cases

- **RTL (AR)**: gesamte Seite mit logischen Properties (`ms-`/`me-`/`ps-`/`pe-`/`border-s`/`border-e`, `text-start`). **Pfeile/Chevrons spiegeln**: `ArrowRight` (Hero-CTAs) und `ChevronRight` (Feature-Karten) zeigen in LTR nach rechts „vorwärts"; in RTL müssen sie nach links zeigen — Umsetzung über `rtl:-scale-x-100` auf dem Icon ODER eine logische Icon-Wahl. Der Diagramm-Fluss ist **vertikal** (top→down), damit er in RTL nicht „rückwärts" läuft — bewusst so designt (§ 4.1). Die Hero-Spalten kehren in RTL die visuelle Reihenfolge um (Diagramm links, Text rechts) — akzeptabel, da `grid` + logische Anordnung; Mobile bleibt Text-zuerst.
- **prefers-reduced-motion**: Die Landing hat **keine Entrance-Animationen** (keine Scroll-Reveals, kein Auto-Play). Erlaubt sind nur Hover-Transitions auf Buttons/Feature-Karten (`transition-colors`/`transition-shadow`) ≤ 200ms. Unter `prefers-reduced-motion: reduce` werden auch diese auf ≤ 200ms Opacity reduziert (foundation `MotionConfig reducedMotion="user"` in `layout.tsx` deckt framer-motion ab; die hier genutzten reinen CSS-Hover-Transitions sind ohnehin ≤ 200ms und unkritisch). **Verbindlich: keine framer-motion-Entrance auf der Landing** (HL-DS-4 + HL-DS-5).
- **Locale-Text-Expansion in H1/Badge**: „Behörden, aber auf Autopilot." expandiert in RU/UK deutlich (z. B. RU ≈ +30%). H1 mit `text-balance` + `leading-tight`, KEIN `truncate` (Überschrift muss vollständig lesbar bleiben — sie darf umbrechen). Die Badge-Pill (`landing.hero.badge`) darf bei langer Übersetzung umbrechen (`max-w-fit`, kein `nowrap`-Zwang) ODER auf zwei Zeilen gehen — kein `truncate`. CTA-Buttons: Labels kurz, aber `whitespace-nowrap` nur wenn sie passen; bei Expansion Button wachsen lassen (CTAs sind `flex-wrap`).
- **Mobile-Stacking Diagramm**: Der vertikale Fluss (§ 4.1) macht das Stacking trivial — die drei Behörden-Cards gehen von `sm:grid-cols-3` auf `grid-cols-1`; die fächernden dashed-Connectors fallen ≥ md weg / werden < sm zu einem einzelnen vertikalen Strich. Bedeutung bleibt über Text + `sr_summary` erhalten.
- **Mobile-Nav**: < md werden die fünf mittleren Anker-Links ausgeblendet (kein Hamburger). Begründung: drei der fünf Links sind ehrliche `#`-Platzhalter; ein Burger-Menü für tote Anker wäre irreführend. ThemeToggle, LanguageSwitcher und der Primär-CTA „Anmelden" bleiben sichtbar — der Betrachter kann jederzeit in die Demo. Falls code-reviewer einen Burger fordert, ist das eine vertretbare Alternative, aber nicht verlangt.
- **Sticky-Banner + Sticky-Nav-Kollision**: Der `PrototypeDisclaimerBanner` und die `sticky`-Nav dürfen sich nicht überlappen. Verbindlich: Banner **nicht** sticky (scrollt weg), Nav `sticky top-0`. So bleibt der Mock-Hinweis beim Einstieg sichtbar, ohne dauerhaft Platz zu kosten.
- **Theme nicht gemountet (SSR)**: ThemeToggle zeigt System-Icon bis `mounted` (bestehendes Verhalten, unverändert).
- **JS deaktiviert**: Die Seite ist serverseitig gerendert (RSC, `force-dynamic`); Inhalt, Links und der Primär-CTA funktionieren ohne Client-JS. Nur ThemeToggle/LanguageSwitcher brauchen JS (degradieren still).

## 10. Out of scope (explicit)

- **Onboarding-Internals** — `/onboarding` ist eine parallele Spec (`docs/specs/onboarding-login.md`); diese Landing verlinkt nur dorthin.
- **Echte Nav-Ziele** — „Für Bürger:innen", „Für Behörden", „Über uns" sind `#`-Platzhalter; „Leistungen"/„Sicherheit & Datenschutz" springen zu In-Page-Ankern. Keine echten Marketing-Unterseiten in dieser Iteration.
- **Funktionales „Leistungen ▾"-Dropdown** — der Chevron ist dekorativ; kein Submenü.
- **Persona-Auswahl** — wandert ins Onboarding; die alten `landing.persona_*`/`landing.personas_*`/`landing.cta_continue`/`landing.eyebrow` Keys bleiben **orphaned in allen 6 Locale-Files** (nicht löschen, nicht umsortieren — concurrent-session-Sicherheit). Cleanup ist ein späterer, separater Slot.
- **Hamburger-/Off-Canvas-Mobile-Nav** — bewusst nicht (§ 9).
- **`next.config.ts`, `not-found.tsx`, `global-error.tsx`, der `(app)`-Shell** — unverändert.
- **Grafik-Logo / SVG-Illustration** — Textwortmarke genügt; das Diagramm ist div-/primitive-komponiert, keine SVG-Illustration.
- **mock-backend-/AI-Integration** — die Landing ist datenfrei.
- **Neue Farbfamilien/Tokens** — nur das Foundation-Vokabular (HL-DS-3).

## 11. Review checklist (for code-reviewer)

- [ ] `src/app/page.tsx` bleibt **RSC** mit `export const dynamic = 'force-dynamic'` + dem next-intl@3-Kommentar; kein Client-State auf Seitenebene.
- [ ] Genau **ein** `<h1>`: „Behörden, aber auf Autopilot." Logische Hierarchie: H1 → `<h2>` je Sektion (Leistungen, Vertrauen) → `<h3>` je Karte.
- [ ] **Keine hardcoded Strings** — alle via `t()`; alle neuen Keys ausschließlich unter `landing.*`; bestehende 9 `landing.*`-Keys unverändert/nicht umsortiert; Reuse von `app.*`/`footer.*`/`common.*`/`shell.*` wo spezifiziert.
- [ ] **Nur Foundation-Tokens/-Primitives** — `bg-surface`/`bg-surface-page`/`bg-accent-soft`/`text-text-*`/`border-border(-strong)`/`bg-success-soft`/`text-success`/`text-primary`; Reuse von `Button`, `Card`, `IconCircle`, `SectionCard`, `Footer`, `PrototypeDisclaimer(Banner)`, `ThemeToggle`, `LanguageSwitcher`. Kein neuer Token, keine geforkte Card.
- [ ] **Autopilot-Diagramm** aus Divs + Primitives + Tailwind (dashed via `border-dashed border-border-strong`); **KEINE SVG-Illustration, kein bespoke Zeichensystem**. Alle Icons/Connectors `aria-hidden`; `landing.diagram.sr_summary` als `<figcaption class="sr-only">` (oder gleichwertig) vorhanden, sodass der Fluss nicht nur visuell ist.
- [ ] **Touch-Targets ≥ 44px** auf allen interaktiven Nav-/CTA-Elementen (Buttons `default`/`lg`, „Anmelden", Feature-Karten als ganze Links).
- [ ] **Keyboard + sichtbarer Fokus** überall; Fokus-Ring `--color-primary` 2px/Offset 2px (foundation global). Fokusreihenfolge logisch (Brand → Nav → Controls → Hero-CTAs → Feature-Karten → Footer-Links).
- [ ] **Mock-Disclaimer unmissverständlich**: `PrototypeDisclaimerBanner` oben (nicht sticky) + `PrototypeDisclaimer`-Langform im Footer; Wortlaut aus `common.disclaimer.*` unverändert. Keine Behauptung realer Behördenanbindung; „Mock-Demo 2027-Vision"-Karte trägt die ehrliche Spekulations-Aussage.
- [ ] **RTL (AR)**: logische Properties durchgängig; `ArrowRight`/`ChevronRight` gespiegelt (`rtl:-scale-x-100` o. ä.); Marken-/Behörden-Begriffe latein/bidi-neutral; Diagramm-Fluss vertikal (kein RTL-Rückwärtslauf).
- [ ] **Reduced motion**: keine Entrance-Animationen; nur Hover-Transitions ≤ 200ms (HL-DS-4). Kein Glassmorphism, kein dekorativer Gradient, kein Konfetti (HL-DS-5).
- [ ] **Dark Mode** korrekt rein über Tokens (kein hartkodiertes Hex/dark:-Hex außerhalb der Tokens).
- [ ] **Locale-Expansion**: H1/Badge umbrechen statt `truncate`; CTAs `flex-wrap`.
- [ ] **Lighthouse a11y > 95** auf `/`; **axe 0 kritisch** (a11y-tester).
- [ ] Server-Component-by-default; `@/`-Alias; kebab-case Dateien / PascalCase Komponenten; neue Komponenten unter `src/components/landing/`.

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Public Landing page (`/`) — Nav, Hero + Autopilot-Diagramm, Feature-Reihe 1 (Leistungen), Feature-Reihe 2 (Vertrauen & Technik), Footer (reused)
- components created: `src/components/landing/LandingNav.tsx`, `src/components/landing/LandingHero.tsx`, `src/components/landing/AutopilotDiagram.tsx`, `src/components/landing/LandingFeatureGrid.tsx`, `src/components/landing/LandingFeatureCard.tsx` (all RSC)
- components modified: `src/app/page.tsx` (rebuilt — RSC, `force-dynamic` + next-intl@3 comment preserved; persona-picker removed)
- i18n keys added (DE source): 44 new `landing.*` leaf-keys (7 nav + 6 hero + 13 diagram + 1 features.title + 8 feature + 1 trust.title + 8 trust). The original 9 `landing.*` keys (eyebrow/title/subtitle/personas_title/personas_helper/persona_anna/persona_schmidt/persona_mehmet/cta_continue) are UNTOUCHED and now orphaned per § 10. de.json JSON.parse OK.
- reused primitives: Button, Card, IconCircle, Footer, PrototypeDisclaimerBanner, ThemeToggle, LanguageSwitcher. No new tokens, no forked card. Diagram is div/primitive/Tailwind-dashed-composed (no SVG).
- typecheck: pass (tsc --noEmit exit 0)
- lint: PRE-EXISTING eslint-config-next/ESLint-9 environment failure (config file cannot be loaded — unrelated to new code); no new lint findings introduceable
- unit: pass (639/639, 41 files)
- build: pass (next build exit 0; `/` is ƒ dynamic, 5.14 kB)
- known gaps: en/ru/uk/ar/tr translations for the 44 new keys (i18n-localizer); Lighthouse/axe runtime audit on `/` (a11y-tester)
- next: i18n-localizer (6-locale parity) → a11y-tester → code-reviewer
