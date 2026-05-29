---
feature: onboarding-login
title: Onboarding / Login — DeutschlandID + EUDI Wallet (spine step 1)
status: shipped
track: spine
date: 2026-05-27
author: product-architect
owner_agents: [frontend-coder, i18n-localizer, a11y-tester, code-reviewer]
authorization: >
  research / domain / verify are WAIVED for this surface. This is a user-authorized
  execution of an existing, user-supplied visual prototype — see docs/demo-spine.md
  § "ACTIVE BUILD (decided 2026-05-27)": the design is user-supplied, so the pipeline
  skips research-scout / domain-expert / concept-verifier (Stage 0 is satisfied
  directly; the user IS the vision source). This is spine step 1 ("Login with
  DeutschlandID + EUDI Wallet") and is full-rigor spine track (6 locales human-reviewed,
  AR-RTL audited, a11y PASS).
inputs:
  design_foundation: docs/specs/redesign-foundation.md   # tokens § 6.A + ~15 shared primitives § 6.B (SHIPPED, see Build logs)
  spine: docs/demo-spine.md                                # step 1 of the 6-step spine
  personas: src/data/personas.json                         # anna-petrov / markus-schmidt / mehmet-yildiz
  activation: src/lib/mock-backend/index.ts                # reseedForActivePersona(id) + getActivePersonaId()
mock_backend_required: false  # No new api work. Onboarding uses the EXISTING reseedForActivePersona(id) export. See § 6.
---

> **Scope guard.** This spec covers the `(auth)/onboarding` surface ONLY: the entry/
> method-selection screen, the simulated eID handshake, the persona selection, and the
> general eID-attribute transparency screen — ending by committing the persona and
> redirecting to `/dashboard`. It does NOT spec the Umzug "Freigaben für diesen Vorgang"
> Behörde-matrix (Bürgeramt / Finanzamt / Beitragsservice / Bundesdruckerei + Krankenkasse
> / Bank / Arbeitgeber / Versicherer) — that is the Umzug preview/consent screen owned by
> another track. Onboarding's transparency screen is about the eID **identity attributes**
> in general. It also does NOT change the `(app)` shell, the Landing page beyond its
> redirect target, or any token (foundation is frozen and consumed as-is).

---

## 1. Problem statement

Bürgerinnen und Bürger sollen die Demo so betreten, wie sie 2027 eine echte Verwaltungs-App betreten würden: mit der eigenen digitalen Identität (DeutschlandID oder EUDI Wallet), nicht mit einem Formular. Heute existiert dafür gar kein Einstieg — es gibt keine `(auth)`-Route; die Landing-Seite springt direkt ins Dashboard. Diese Spec baut den ehrlichen, ruhigen, datensparsamen Anmelde-Einstieg, der zeigt **welche Identitätsdaten** die eID liefert, **wer** sie (nur mit Einwilligung) erhält und **auf welcher Rechtsgrundlage** — und der am Ende die gewählte Persona als aktive Demo-Identität festschreibt.

## 2. Persona & journey

- **Persona**: alle drei — Anna Petrov (`anna-petrov`), Familie Schmidt / Markus Schmidt (`markus-schmidt`), Mehmet Yıldız (`mehmet-yildiz`). Die Persona-Auswahl IST die gewählte Identität der Demo (siehe § 4.3 + § 6).
- **Trigger**: Klick auf "Demo starten" / "Demo öffnen" auf der Landing-Seite (`/`), oder Direktaufruf von `/onboarding`.
- **Outcome**: Der Nutzer hat eine Anmeldemethode gewählt, den simulierten Identitäts-Handshake gesehen, die gelieferten eID-Attribute transparent geprüft, eine Persona als aktive Identität festgeschrieben (`reseedForActivePersona(id)`) und landet im Dashboard.
- **Time saved vs. status quo**: nicht quantitativ relevant — dies ist der Einstieg, nicht ein Vorgang. Der "Wow" hier ist **Vertrauen**: in unter 30 Sekunden versteht der Betrachter, dass die App datensparsam ist, die Rechtsgrundlage offenlegt und nichts ohne Einwilligung teilt. Das ist das BITV-/DSGVO-Glaubwürdigkeitssignal, das alle weiteren Spine-Schritte trägt.

## 3. Success criteria for the demo

- [ ] Betrachter versteht in < 10 Sekunden auf Screen A: "ich melde mich mit meiner digitalen Identität an oder starte den Demo-Modus".
- [ ] Der gesamte Flow ist eine ruhige, minimale Abfolge von **drei** Schritten (Methode → Handshake+Persona → Transparenz) und endet deterministisch auf `/dashboard`.
- [ ] Auf der Transparenz-Stufe (Screen D) sind sichtbar: gelieferte Attribute mit StatusBadge, Empfänger nur mit Einwilligung, Rechtsgrundlage (**eIDAS 2 / OZG**, DSGVO Art. 6 für einwilligungsbasierte Attribute) und Datenminimierung (optionale Attribute togglebar, nichts ohne Einwilligung).
- [ ] Der "Spekulatives Demo / Mock"-Hinweis ist auf jedem Schritt sichtbar, aber unaufdringlich.
- [ ] Lighthouse a11y > 95 auf der Onboarding-Primärroute; axe 0 kritische Verstöße.
- [ ] Korrekt in Light + Dark Mode (nur über Tokens); korrekt in AR-RTL (logische Properties, gespiegelte Chevrons).

## 4. Screen-by-screen flow

### Flow ordering & justification

Der Flow hat **drei** Schritte (Screens B und C sind zu EINEM Schritt zusammengelegt; D folgt danach):

```
Landing (/)  ──"Demo starten"──▶  /onboarding
   Step 1 = Screen A   (Willkommen + Methodenwahl)
        │  Nutzer wählt DeutschlandID | EUDI Wallet | Demo-Modus
        ▼
   Step 2 = Screen B + C   (Handshake-Overlay → Persona-Auswahl, eine Route)
        │  ~1.2–2.0 s Handshake-Mock  →  drei Persona-Karten
        │  Nutzer wählt Persona  (Auswahl wird gemerkt, noch NICHT committed)
        ▼
   Step 3 = Screen D   (eID-Attribut-Transparenz für die gewählte Persona)
        │  "Anmeldung bestätigen"  →  reseedForActivePersona(id)  →  router.push('/dashboard')
        ▼
   /dashboard
```

**Warum diese Reihenfolge:**
1. **Methode zuerst (A)** — entspricht der realen eID-Mentalität ("womit melde ich mich an?") und dem Prototyp. Der Demo-Modus ist ein gleichwertiger dritter Weg, der ehrlich sagt "ohne Anmeldung, keine echte Behördenanbindung".
2. **Handshake + Persona zusammen (B+C)** — der Handshake ist ein kurzes, beruhigendes Latenz-Mock (~1.2–2.0 s); ihn als eigene Vollroute zu führen wäre eine leere Wartezeit. Stattdessen läuft der Handshake als Overlay/Status-Block auf derselben Route, der nach Settle sanft in die Persona-Auswahl übergeht. Im **Demo-Modus** wird der Handshake-Mock übersprungen (kein eID-Handshake nötig) und direkt die Persona-Auswahl gezeigt — der Handshake gehört konzeptuell zur eID, nicht zum Demo-Modus.
3. **Persona vor Transparenz** — die Transparenz-Stufe zeigt **konkrete** Attribute (Name, Geburtsdatum, Anschrift, Familienstand …) aus der gewählten Persona. Diese Werte gibt es erst, wenn eine Persona feststeht. Persona-Auswahl committet aber noch NICHT (kein Reseed); erst "Anmeldung bestätigen" auf D ruft `reseedForActivePersona(id)`. So bleibt der Zurück-Pfad sauber.
4. **Commit zuletzt (D)** — Datenminimierung ist nur glaubwürdig, wenn der Nutzer die Attribute SIEHT, bevor er bestätigt. Der Reseed + Redirect ist die einzige Stelle, die den Demo-State verändert.

> Routing-Implementierung: Eine einzige Client-Route `/onboarding` mit internem Step-State (`useReducer` / `useState`, kein Zustand-Store nötig — der State lebt nur für die Dauer des Flows). Optional darf der Coder Sub-Routen (`/onboarding`, `/onboarding/persona`, `/onboarding/bestaetigen`) bauen; **bevorzugt ist die Ein-Route-Variante mit Step-State**, weil sie Back-Button-Edge-Cases (§ 9) vereinfacht und keine geteilten Daten über Routen tragen muss.

### 4.0 (auth) layout — `src/app/(auth)/layout.tsx` (NEW)

- **Server or client**: RSC.
- **Zweck**: Slim Top-Bar, **NICHT** die App-Shell (keine Sidebar, keine `(app)`-Topbar mit Nav). Onboarding lebt außerhalb `(app)`.
- **Layout**:
  ```
  ┌──────────────────────────────────────────────────────────────────┐
  │ 🏛 GovTech DE · Verwaltung neu gedacht.        DE▾   ☀   Anmelden ▾ │  ← slim top bar, h-14, border-b
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │                    <Onboarding step content>                       │  ← bg-surface-page, zentriert
  │                                                                    │
  ├──────────────────────────────────────────────────────────────────┤
  │ 🔒 Diese Anwendung entspricht den BSI-Grundschutz-Kriterien.       │  ← footer line
  │                                Datenschutz · Impressum             │
  └──────────────────────────────────────────────────────────────────┘
  ```
- **Top-Bar (`<header>`)**: `h-14`, `sticky top-0 z-30`, `border-b border-border`, `bg-surface`, kein backdrop-blur (HL-DS-5).
  - Links: `Landmark`-Mini-Icon (`text-text-secondary`, `size-5`) + Wortmarke `app.name` ("GovTech DE") `font-semibold text-text-primary` + Separator + `app.tagline` ("Verwaltung neu gedacht.") `text-text-muted text-caption`, Tagline nur ≥ md sichtbar. Link-Ziel `/`.
  - Rechts (`ml-auto`, `gap-2`): **LanguageSwitcher** (reuse `src/components/layout/LanguageSwitcher.tsx`) → **ThemeToggle** (reuse `src/components/layout/ThemeToggle.tsx`) → **"Anmelden ▾"** Affordance.
  - **"Anmelden ▾"**: ein `Button variant="ghost"`-Look mit Label `onboarding.topbar.login_label` ("Anmelden") + gespiegelbarem `ChevronDown`. In der Demo ist dies ein **dekoratives/leichtgewichtiges** Element: ein Klick scrollt/fokussiert die Methoden-Karten auf Screen A bzw. öffnet ein minimales Menü mit denselben drei Methoden (DeutschlandID / EUDI Wallet / Demo-Modus), die A anbietet. Es ist KEINE separate Auth-Logik. Touch-Target ≥ 44px. `aria-label` via `onboarding.topbar.login_label`. (Wenn der Coder es als reinen Anker auf die Methoden-Sektion baut statt als Menü, ist das zulässig — es darf nur keinen zweiten, divergierenden Anmeldepfad einführen.)
- **Footer-Zeile**: `Lock`-Icon + `onboarding.footer.bsi` ("Diese Anwendung entspricht den BSI-Grundschutz-Kriterien.") `text-text-muted text-sm`, rechts/darunter zwei Links `footer.privacy` ("Datenschutz") + `footer.imprint` ("Impressum") (reuse existierende `footer.*`-Keys). Border-top `border-border`, `bg-surface`.
- **Page-Surface**: `bg-surface-page` (das kühle Hellgrau hinter den Cards) — über die `--background`-Alias-Kette aus der Foundation automatisch korrekt.
- **a11y**: `<header>`, `<main id="main-content">` umschließt den Step-Inhalt, `<footer>`. Skip-Link `app.skip_to_content` als erstes fokussierbares Element (analog zur App-Shell). Genau ein `<h1>` lebt im jeweiligen Step-Inhalt, nicht im Layout.
- **`export const dynamic = 'force-dynamic'`** auf der `(auth)/layout.tsx` setzen — analog zur `(app)/layout.tsx` (next-intl@3 + Next 15.5 Prerender-Workaround, siehe redesign-foundation Build log "Cleanup pass").

---

### 4.1 Screen A — "Willkommen bei GovTech DE" (Entry + Methodenwahl)

- **Route**: `/onboarding` (Step-State `'method'`).
- **File**: `src/app/(auth)/onboarding/page.tsx` (Client — siehe § 4.5) rendert die Step-Komponenten.
- **Server or client**: Die Page ist Client (Step-State + Interaktion). Reine Präsentationsteile dürfen als RSC-Kinder ausgelagert werden, aber der Methoden-Klick braucht `'use client'`.
- **Layout**: eine große, zentrierte Card auf `bg-surface-page`, zweispaltig (≥ lg; < lg gestapelt, LEFT zuerst):
  ```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  (●) Landmark                          │  So einfach geht's              │
  │  Willkommen bei GovTech DE             │   ① Identität wählen            │
  │  Melden Sie sich an oder starten Sie   │   │  Wählen Sie DeutschlandID   │
  │  die Demo.                             │   │  oder EUDI Wallet.          │
  │                                        │   ② Datenfreigabe prüfen        │
  │  ┌───────────────┐ ┌───────────────┐   │   │  Geben Sie nur frei, was    │
  │  │ 🪪 DeutschlandID│ │ 👛 EUDI Wallet │   │   │  nötig ist.                 │
  │  │ Sicher, einfach│ │ Ihre digitale  │   │   ③ Autopilot starten           │
  │  │ und behördlich │ │ Brieftasche    │   │      Daten vorausgefüllt,       │
  │  │ anerkannt.     │ │ für Europa.    │   │      Briefe erklärt, Vorgänge   │
  │  └───────────────┘ └───────────────┘   │      automatisch gestartet.     │
  │  ┌───────────────────────────────────┐ │                                 │
  │  │ 🧪 Demo-Modus mit Mock-Daten     ›  │ │  Warum diese Anmeldung?         │
  │  │ Ohne Anmeldung testen. Keine echte│ │   (●) Daten vorausfüllen        │
  │  │ Behördenanbindung.                │ │   (●) Briefe verständlich erklär.│
  │  └───────────────────────────────────┘ │   (●) Autopilot für Vorgänge    │
  │  ───────────────────────────────────── │                                 │
  │  🔒 Sichere Anmeldung   ✓ Nur mit Ihrer│                                 │
  │  Zustimmung   🚫 Keine echte Behörden- │                                 │
  │  anbindung                             │                                 │
  └─────────────────────────────────────────────────────────────────────────┘
       LEFT (method selection)                  RIGHT (steps + why)
  ```
- **LEFT-Spalte**:
  - `IconCircle` tone `primary`, icon lucide `Landmark`, size `lg`.
  - `<h1>` `onboarding.welcome.title` ("Willkommen bei GovTech DE") — `text-3xl font-bold`.
  - Subtitle `onboarding.welcome.subtitle` ("Melden Sie sich an oder starten Sie die Demo.") `text-sm text-text-secondary`.
  - **Zwei Methoden-Karten side-by-side** (`<NEW> OnboardingMethodCard`): DeutschlandID (`IdCard`-Icon, helper `onboarding.method.deutschlandid.helper`) und EUDI Wallet (`Wallet`-Icon, helper `onboarding.method.eudi.helper`). Beide sind `prominent`-Variante (große, klickbare Card-Buttons).
  - **Full-width Demo-Modus-Zeile** (`OnboardingMethodCard` Variante `row` mit `Chevron`): `FlaskConical`-Icon, Titel `onboarding.method.demo.title`, helper `onboarding.method.demo.helper`, gespiegelbarer `ChevronRight`.
  - Hairline-Divider (`border-t border-border`).
  - **Drei Trust-Mini-Items** (`<NEW> OnboardingTrustItem` oder inline `IconCircle size="sm"` + Label): `Lock` → `onboarding.trust.secure`, `ShieldCheck` (oder `CheckCircle2`) → `onboarding.trust.consent`, `Ban` (oder `Building2`-durchgestrichen) → `onboarding.trust.no_real_connection`.
- **RIGHT-Spalte** (`RightRailCard`-artig oder `SectionCard`):
  - Titel `onboarding.how.title` ("So einfach geht's") `text-base font-semibold`.
  - **Drei nummerierte Schritte** mit vertikalem Connector (`<NEW> OnboardingStepList`): (1) `onboarding.how.step1.title` / `.desc`, (2) `onboarding.how.step2.title` / `.desc`, (3) `onboarding.how.step3.title` / `.desc`.
  - Subtitel `onboarding.why.title` ("Warum diese Anmeldung?") + drei `IconCircle`+Label-Items: `onboarding.why.prefill` (`Sparkles`/`Wand2`-Icon), `onboarding.why.explain` (`FileText`/`MessageCircle`), `onboarding.why.autopilot` (`Rocket`/`Workflow`).
- **Components used**:
  - `IconCircle` (foundation) — Hero-Icon + Why-Items.
  - `SectionCard` / `RightRailCard` (foundation) — Container der zwei Spalten / der "So einfach geht's"-Karte.
  - `Button` (foundation, ui) — innerhalb der Methoden-Karten falls als Button gebaut.
  - `OnboardingMethodCard` `<NEW>` — siehe § 5.
  - `OnboardingStepList` `<NEW>` — siehe § 5.
  - `OnboardingTrustItem` `<NEW>` (optional; darf inline sein) — siehe § 5.
- **Data fetched**: keine. Reiner Präsentations-Screen.
- **i18n keys introduced**: alle unter `onboarding.*` — siehe § 8.
- **States**: nur `idle` (keine Daten, kein Loading). Klick auf DeutschlandID / EUDI → Step `'handshake'` (Screen B) mit gemerkter Methode. Klick auf Demo-Modus → Step `'persona'` direkt (Screen C, Handshake übersprungen).
- **Accessibility notes**:
  - Genau ein `<h1>` (`onboarding.welcome.title`).
  - Methoden-Karten sind echte `<button>` (oder `<a role="button">`) mit zugänglichem Namen = Titel + helper (z. B. via `aria-describedby` auf den Helper-Text). Touch-Target ≥ 44px, hier deutlich größer.
  - "So einfach geht's"-Titel als `<h2>`, "Warum diese Anmeldung?" als `<h2>`.
  - Trust-Item-Icons `aria-hidden`; der Text trägt die Bedeutung.
  - Focus-Order: Skip-Link → Top-Bar (Brand → LanguageSwitcher → ThemeToggle → Anmelden) → h1-Bereich → DeutschlandID → EUDI → Demo-Modus → Trust-Items → RIGHT-Spalte.

---

### 4.2 Screen B — Simulierter Identitäts-Handshake (Overlay/Status, gehört zu Step 2)

- **Route**: `/onboarding` (Step-State `'handshake'`). Nur erreichbar nach Wahl DeutschlandID / EUDI (nicht im Demo-Modus).
- **File**: `src/components/onboarding/OnboardingHandshake.tsx` `<NEW>` (Client), gerendert von der Page.
- **Server or client**: Client (Timer/Latenz + aria-live).
- **Layout**: eine ruhige, zentrierte Card:
  ```
  ┌──────────────────────────────────────────┐
  │              ▢▢▢                           │
  │            ▢ QR ▢   (oder Wallet-Visual)   │
  │              ▢▢▢                           │
  │                                            │
  │            ◠ (Spinner)                      │
  │   Verbindung zu DeutschlandID …            │  ← aria-live status
  │                                            │
  │   [MOCK · Prototyp — keine echte           │
  │    Behördenanbindung]                      │
  │                                            │
  │   Abbrechen                                │  ← zurück zu Screen A
  └──────────────────────────────────────────┘
  ```
- **Visual**: ein QR-/Wallet-Visual (`<NEW> OnboardingQrMock` — ein dekoratives, klar als Mock markiertes QR-Quadrat bzw. Wallet-Icon-Block; KEIN echter QR-Code), darunter ein Spinner (lucide `Loader2` mit `animate-spin`) + Status-Text.
- **Latenz-Mock**: gesamte Dauer **~1.2–2.0 s** (Coder wählt einen festen Wert in diesem Fenster, z. B. 1500 ms; KEIN `Math.random`-Fehlerpfad — der Handshake muss in der Demo immer grün enden). Implementierung: ein einfacher `setTimeout` / Promise-`wait` im Client-Effekt. Es ist **keine** mock-backend-Funktion nötig (kein State-Write). Optional darf der Coder den vorhandenen `latency`-„Feel" nachbilden, aber NICHT den 5%-Error-Pfad aus `mock-backend/latency.ts` einbeziehen.
- **Status-Transition** (mind. zwei Phasen, methodenabhängiger Name):
  - Phase 1 (`connecting`): `onboarding.handshake.connecting` mit Methodenname interpoliert → "Verbindung zu {method} …".
  - Phase 2 (`confirmed`, am Ende des Timers): `onboarding.handshake.confirmed` → "Identität bestätigt ✓" — danach automatischer Übergang zu Step `'persona'` (Screen C).
  - `{method}` = "DeutschlandID" bzw. "EUDI Wallet" (Markennamen, nicht übersetzbar — als Interpolations-Argument übergeben, NICHT als Teil des i18n-Werts hartkodieren).
- **`prefers-reduced-motion`**:
  - Kein Spinner-Spin: statt `Loader2 animate-spin` ein statisches Icon (z. B. `Loader2` ohne `animate-spin`, oder `Hourglass`) + ein nicht-animierter Fortschritts-/Status-Hinweis.
  - **Instant-Settle**: unter reduced-motion wird die Latenz auf ein Minimum reduziert (≤ 200 ms) ODER sofort der `confirmed`-Zustand gezeigt; jedenfalls keine künstlich animierte Wartezeit. Der Status-Text-Wechsel bleibt (per aria-live angesagt).
- **[MOCK]-Markierung**: ein sichtbarer, unaufdringlicher Hinweis `onboarding.handshake.mock_note` ("Simulierter Identitäts-Handshake · Prototyp, keine echte Behördenanbindung."). Reuse `MockWatermarkBanner` / `PrototypeDisclaimer`-Sprache falls passend (Token-only-restyled, existiert).
- **Abbrechen**: `Button variant="ghost"` / `outline`, Label `common.cancel` (falls vorhanden) bzw. `onboarding.handshake.cancel` ("Abbrechen") → zurück zu Step `'method'` (Screen A). Timer wird gecleart.
- **i18n keys introduced**: `onboarding.handshake.*` — siehe § 8.
- **States**: `connecting` / `confirmed`. Kein Error-State (Demo immer grün). `cancelled` → Rücksprung zu A.
- **Accessibility notes**:
  - Status-Text in einem `aria-live="polite"`-Region (`role="status"`), damit Screenreader "Verbindung zu DeutschlandID …" → "Identität bestätigt" hören.
  - Spinner-Icon `aria-hidden`; die Bedeutung steht im Live-Text.
  - QR-Mock-Visual `aria-hidden` (dekorativ) bzw. mit `aria-label` "QR-Code (Mock)".
  - Fokus beim Eintritt in die Card auf die Status-Region oder die Abbrechen-Schaltfläche setzen; bei Rücksprung Fokus zurück auf die zuvor gewählte Methoden-Karte (Focus-Restoration).
  - `Loader2 animate-spin` MUSS `motion-reduce:animate-none` bzw. den reduced-motion-Pfad oben respektieren.

---

### 4.3 Screen C — Persona-Auswahl (Step 2, nach Handshake bzw. direkt im Demo-Modus)

- **Route**: `/onboarding` (Step-State `'persona'`).
- **File**: `src/components/onboarding/OnboardingPersonaSelect.tsx` `<NEW>` (Client), gerendert von der Page.
- **Server or client**: Client (Auswahl-State; Lese-Zugriff auf Personas).
- **Layout**: zentrierte Card, Titel + drei wählbare Persona-Karten (vertikal gestapelt oder im 3er-Grid ≥ md):
  ```
  ┌────────────────────────────────────────────────┐
  │  Wählen Sie eine Identität für die Demo          │  ← h1 (dieser Step trägt das h1, weil B kein h1 hat)
  │  Sie können die Identität später wechseln.       │
  │  ┌──────────────────────────────────────────┐   │
  │  │ (AP) Anna Petrov                           │   │
  │  │      Berlin · angestellt · russisch        │   │  ← honest one-liner
  │  └──────────────────────────────────────────┘   │
  │  ┌──────────────────────────────────────────┐   │
  │  │ (FS) Familie Schmidt                       │   │
  │  │      Hamburg · Familie mit Kind · deutsch  │   │
  │  └──────────────────────────────────────────┘   │
  │  ┌──────────────────────────────────────────┐   │
  │  │ (MY) Mehmet Yıldız                         │   │
  │  │      Köln · selbstständig · türkisch       │   │
  │  └──────────────────────────────────────────┘   │
  │                                  [Zurück]        │
  └────────────────────────────────────────────────┘
  ```
- **Persona-Karten** (`<NEW> OnboardingPersonaCard`): jede trägt `Avatar` (Monogramm aus Name: "AP" / "FS" / "MY"), Name und einen **ehrlichen Einzeiler aus `personas.json`** (Stadt · Beschäftigungs-Schlagwort · Staatsangehörigkeit). Die Einzeiler-WERTE liegen als i18n-Keys vor (übersetzbar), die Initialen/Avatar kommen aus den Namen.
  - Anna Petrov → `onboarding.persona.anna.descriptor` = "Berlin · angestellt · russisch" (aus `adresse.ort=Berlin`, `beschaeftigung.typ=angestellt`, `staatsangehoerigkeit=russisch`).
  - Familie Schmidt → `onboarding.persona.schmidt.descriptor` = "Hamburg · Familie mit Kind · deutsch" (aus `adresse.ort=Hamburg`, hat Partner + Kind Felix, `staatsangehoerigkeit=deutsch`). Name-Label `onboarding.persona.schmidt.name` = "Familie Schmidt" (Persona-ID `markus-schmidt`, aber im Onboarding als Haushalt präsentiert).
  - Mehmet Yıldız → `onboarding.persona.mehmet.descriptor` = "Köln · selbstständig · türkisch" (aus `adresse.ort=Köln`, `beschaeftigung.typ=selbstaendig`, `staatsangehoerigkeit=tuerkisch`).
  > Die Descriptor-Werte sind ehrlich aus `personas.json` abgeleitet und im Spec festgeschrieben; der Coder hardcodet sie NICHT, sondern nimmt die i18n-Keys. Persona-IDs sind fix: `anna-petrov`, `markus-schmidt`, `mehmet-yildiz`.
- **Auswahl-Verhalten**: Klick auf eine Persona-Karte **merkt** die Auswahl (`selectedPersonaId` im Step-State) und geht zu Step `'transparency'` (Screen D). **Kein Reseed an dieser Stelle** — der Commit passiert erst auf D.
- **Zurück**: `Button variant="ghost"` Label `common.back` (falls vorhanden) bzw. `onboarding.persona.back` → zurück zu Step `'method'` (Screen A). (Aus dem Demo-Modus: zurück zu A; aus dem eID-Pfad: ebenfalls zurück zu A, der Handshake wird nicht wiederholt erzwungen.)
- **Components used**: `Avatar` (foundation), `SectionCard` (foundation), `OnboardingPersonaCard` `<NEW>`, `Button` (foundation).
- **Data fetched**: Persona-Stammdaten für die drei IDs zur Ableitung von Name/Initialen. **Empfehlung**: die drei Namen/IDs sind statisch bekannt; der Descriptor kommt aus i18n. Es ist KEIN mock-backend-Read nötig, um die Karten zu rendern (Namen liegen im Spec/i18n). Wenn der Coder die Namen dennoch dynamisch ziehen will, geht das über die EXISTIERENDE API (kein neuer Endpoint). **Bevorzugt: statische Karten-Definition + i18n.**
- **i18n keys introduced**: `onboarding.persona.*` — siehe § 8.
- **States**: `idle` (keine asynchronen Daten). Genau eine Karte kann ausgewählt sein.
- **Accessibility notes**:
  - Dieser Step trägt das `<h1>` (`onboarding.persona.title`), weil Screen B (Handshake-Overlay) kein eigenes `<h1>` führt und A bereits unmounted ist. **Pro gerendertem Step genau ein `<h1>`** — A: welcome.title; C: persona.title; D: transparency.title. (B hat kein h1 — es ist ein transienter Status, der Live-Region-Text trägt die Bedeutung; akzeptabel, weil B nie ohne vorhergehendes h1 dauerhaft sichtbar ist und sofort zu C übergeht.)
  - Persona-Karten sind echte `<button>` mit zugänglichem Namen = Name + Descriptor.
  - `Avatar` mit `aria-label` = Personenname (oder `aria-hidden`, wenn der Name als Text danebensteht — bevorzugt aria-hidden, Name steht im Button-Label).
  - Lange Namen / Locale-Expansion: Name `truncate` statt Umbruch in der Karte (§ 9).

---

### 4.4 Screen D — eID-Attribut-Transparenz / Privacy-by-Design (Step 3, Commit)

- **Route**: `/onboarding` (Step-State `'transparency'`). Nur erreichbar mit gewählter Persona.
- **File**: `src/components/onboarding/OnboardingTransparency.tsx` `<NEW>` (Client — enthält den Bestätigen-Button, der `reseedForActivePersona` + `router.push` auslöst).
- **Server or client**: Client.
- **Layout**: zentrierte Card mit (1) Spekulativ-/MOCK-Banner, (2) Attribut-Liste mit StatusBadges + Datenminimierungs-Toggles, (3) Empfänger-/Rechtsgrundlage-Block, (4) DSGVO-Footer + Bestätigen-CTA:
  ```
  ┌──────────────────────────────────────────────────────────────────┐
  │ [ⓘ Spekulatives Demo-Feature · Mock-Daten]                         │  ← context chip / banner
  │ Diese Daten stellt Ihre digitale Identität bereit                   │  ← h1
  │ Sie entscheiden, was geteilt wird. Nichts ohne Ihre Zustimmung.     │
  │                                                                    │
  │ Pflichtangaben (für die Anmeldung erforderlich)                     │  ← group label
  │  Name              Anna Petrov                 [Bestätigt]          │
  │  Geburtsdatum      22.03.1997                   [Bestätigt]          │
  │  Anschrift         Friedrichstraße 100, Berlin  [Bestätigt]          │
  │  Staatsangehörigk. russisch                     [Verfügbar]          │
  │                                                                    │
  │ Optionale Angaben (nur bei Bedarf — Datenminimierung)               │  ← group label
  │  Familienstand     —                  [Optional]  ( ◯ teilen)       │  ← toggle, default off
  │  Steuer-ID         [MOCK] …            [Optional]  ( ◯ teilen)       │
  │                                                                    │
  │ ───────────────────────────────────────────────────────────────── │
  │ 🏛 Empfänger: nur GovTech DE (Demo) — und nur mit Ihrer Zustimmung. │
  │ Rechtsgrundlage: eIDAS 2 / OZG · einwilligungsbasiert: DSGVO Art.6  │
  │ (1)(a)                                                              │
  │                                                                    │
  │ Ihre Daten werden sicher übertragen und gemäß DSGVO verarbeitet.    │  ← DSGVO footer
  │                                         [Zurück]  [Anmeldung bestät.]│
  └──────────────────────────────────────────────────────────────────┘
  ```
- **Attribut-Liste** — zwei Gruppen, gerendert mit `KeyValueRow` (foundation) + `StatusBadge` (foundation):
  - **Gruppe 1 — Pflichtangaben** (`onboarding.transparency.required_group`), immer geteilt, StatusBadge:
    - `onboarding.transparency.attr.name` → Wert: `${vorname} ${nachname}` der gewählten Persona, Badge `common.status.bestaetigt` ("Bestätigt").
    - `onboarding.transparency.attr.birthdate` → Wert: formatiertes `geburtsdatum`, Badge "Bestätigt".
    - `onboarding.transparency.attr.address` → Wert: `${strasse} ${hausnummer}, ${plz} ${ort}`, Badge "Bestätigt".
    - `onboarding.transparency.attr.nationality` → Wert: `staatsangehoerigkeit`, Badge `onboarding.transparency.badge.available` ("Verfügbar") oder "Bestätigt".
  - **Gruppe 2 — Optionale Angaben** (`onboarding.transparency.optional_group`), Datenminimierung sichtbar — jedes Attribut hat einen Toggle (`Switch` / `ConsentToggle`), **default AUS**, Badge `onboarding.transparency.badge.optional` ("Optional"):
    - `onboarding.transparency.attr.marital_status` → Wert: abgeleitet (Anna: ledig/Partner Tobias; Schmidt: verheiratet; Mehmet: —). Wert darf "—" sein, wenn nicht eindeutig; der Punkt ist die **Toggle-Mechanik**, nicht der konkrete Wert.
    - `onboarding.transparency.attr.tax_id` → Wert: maskierte `steuer_id` (`[MOCK]`-Präfix sichtbar, restliche Ziffern maskiert via vorhandenes `MaskedField`/`masked`-Prop von KeyValueRow). `tabular-nums` (HL-DS-6).
  > Die exakten Attribut-Werte stammen konzeptuell aus der gewählten Persona (`personas.json`). Der Coder darf sie über die EXISTIERENDE API lesen (`getStammdaten(personaId)` o. ä.) ODER — da Onboarding noch vor dem Commit steht — direkt aus dem statischen `personas.json`-Fixture die drei bekannten Datensätze projizieren. **Bevorzugt**: eine kleine Projektionsfunktion, die aus dem Persona-Objekt nur die hier gezeigten Felder liest. KEIN neuer mock-backend-Endpoint.
- **Empfänger + Rechtsgrundlage-Block** (`<NEW> OnboardingLegalBasis` oder `RightRailCard`-artiger Block):
  - Empfänger: `onboarding.transparency.recipient` ("Empfänger: nur GovTech DE (Demo) — und nur mit Ihrer Zustimmung.") mit `Landmark`/`Building2`-`IconCircle`.
  - Rechtsgrundlage: `onboarding.transparency.legal_basis` ("Rechtsgrundlage: eIDAS 2 / OZG · einwilligungsbasierte Angaben: DSGVO Art. 6 Abs. 1 lit. a"). Norm-Begriffe (eIDAS 2, OZG, DSGVO Art. 6) bleiben latein/bidi-neutral in AR (Klammer-Latein-Konvention, siehe § 8/i18n-Hinweis).
- **DSGVO-Footer**: `onboarding.transparency.dsgvo_footer` ("Ihre Daten werden sicher übertragen und gemäß DSGVO verarbeitet.") `text-text-muted text-sm`.
- **Spekulativ-/MOCK-Banner**: ein `PageHeader.contextChip` tone `speculative` (reuse `common.context_chip.speculative` = "Spekulatives Demo-Feature") ODER `MockWatermarkBanner`. Macht klar: keine echte eID-Datenübertragung.
- **CTA-Zeile**:
  - `Button variant="ghost"` Label `onboarding.transparency.back` → zurück zu Step `'persona'` (Screen C).
  - **Primär-Button** `Button` (default/primary) Label `onboarding.transparency.confirm` ("Anmeldung bestätigen"). **onClick (Client):**
    1. `reseedForActivePersona(selectedPersonaId)` aufrufen (Import aus `@/lib/mock-backend`). Schreibt `meta.active_persona_id` + reseedt alle Per-Persona-Buckets. (Die optionalen Toggles haben in dieser Demo **keinen** Backend-Effekt — sie sind die sichtbare Datenminimierungs-Mechanik; ihr Zustand wird NICHT persistiert. Das ist ehrlich für einen Prototyp und vermeidet neue mock-backend-Arbeit. In § 9 als bewusste Scope-Grenze dokumentiert.)
    2. `router.push('/dashboard')` (`useRouter` aus `next/navigation`).
- **Components used**: `KeyValueRow` (foundation), `StatusBadge` (foundation), `IconCircle` (foundation), `Switch`/`ConsentToggle` (foundation, restyled), `PageHeader` contextChip / `MockWatermarkBanner` (foundation), `Button` (foundation), `OnboardingLegalBasis` `<NEW>` (optional).
- **Data fetched**: Projektion der gewählten Persona aus `personas.json` (oder über existierende API). Kein neuer Endpoint.
- **i18n keys introduced**: `onboarding.transparency.*` — siehe § 8.
- **States**: `idle` (Toggles default aus) / `committing` (nach Bestätigen-Klick: Button disabled + Spinner bis `router.push` greift — kurz, da kein Netzwerk).
- **Accessibility notes**:
  - Dieser Step trägt das `<h1>` (`onboarding.transparency.title`).
  - Attribut-Liste als `<dl>` (KeyValueRow nutzt `dt`/`dd`; ein umschließendes `<dl>` pro Gruppe). Gruppen-Labels als `<h2>` oder als `<dl>`-vorangestellte Überschrift.
  - Toggles: echte `Switch`/Checkbox mit Label-Verknüpfung; `aria-checked`; Touch-Target ≥ 44px (HL-DS-8). Default-Zustand "aus" muss für AT erkennbar sein.
  - Maskierte Steuer-ID: Reveal-Button (falls vorhanden über `KeyValueRow masked`) ≥ 44px.
  - Bestätigen-Button: nach Klick `aria-busy="true"`/disabled bis Navigation; verhindert Doppel-Commit.
  - Rechtsgrundlage-Norm-Begriffe: in AR-RTL als `dir="ltr"`-Inline-Spans für "eIDAS 2", "OZG", "DSGVO Art. 6" (Bidi-Sicherheit).

---

### 4.5 Onboarding page shell — `src/app/(auth)/onboarding/page.tsx` (NEW, client)

- **Server or client**: **Client** (`'use client'`) — hält den Step-State und routet.
- **Verantwortung**: ein `useReducer`/`useState` über `step: 'method' | 'handshake' | 'persona' | 'transparency'`, `method?: 'deutschlandid' | 'eudi' | 'demo'`, `selectedPersonaId?: string`. Rendert je nach `step` die passende Step-Komponente und reicht Callbacks (`onSelectMethod`, `onHandshakeDone`, `onSelectPersona`, `onBack`, `onConfirm`) durch.
- **`onConfirm`**: ruft `reseedForActivePersona(selectedPersonaId)` + `router.push('/dashboard')`.
- **Transitionen** respektieren `prefers-reduced-motion` (Crossfade ≤ 200 ms zwischen Steps statt Slide; HL-DS-4 / `MotionConfig reducedMotion="user"` aus dem Root-Layout greift).
- **Direktaufruf** `/onboarding` (Deep-Link, § 9): startet immer bei `step='method'` (Screen A), egal welcher State zuvor existierte. Kein Step ist per URL direkt adressierbar (Ein-Route-Variante) — daher kein "tiefer" Deep-Link auf Handshake/Persona/Transparency möglich, was die Edge-Cases minimiert.

---

## 5. Autopilot logic

**Nicht anwendbar als Behörden-Autopilot.** Onboarding startet keinen Vorgang und benachrichtigt keine Behörden. Die einzige „Orchestrierung" ist der simulierte Identitäts-Handshake (§ 4.2): ein rein client-seitiges Latenz-Mock (~1.2–2.0 s) mit aria-live-Statuswechsel, KEIN mock-backend-Aufruf, KEIN Error-Pfad. Der eigentliche Umzug-Autopilot (Spine-Schritte 3–6) ist ausdrücklich nicht Teil dieser Surface.

### NEW onboarding components (component inventory)

Alle unter `src/components/onboarding/`. Server-Component-by-default, außer die markierten Client-Komponenten. Alle Strings via `t()`. Reuse der Foundation-Primitives wo möglich.

| Component | Client? | Prop shape (skizziert) | Purpose |
|---|---|---|---|
| `OnboardingMethodCard` | client (onClick) | `{ icon: ReactNode; title: string; helper: string; variant: 'prominent' \| 'row'; onClick: () => void; trailingChevron?: boolean }` | DeutschlandID / EUDI / Demo-Modus Auswahl-Karten (Screen A) |
| `OnboardingStepList` | RSC | `{ steps: { num: number; title: string; desc: string }[] }` | nummerierte „So einfach geht's"-Schritte mit Connector (Screen A) |
| `OnboardingTrustItem` | RSC (optional, darf inline) | `{ icon: ReactNode; label: string }` | Trust-Mini-Items (Screen A) |
| `OnboardingHandshake` | client | `{ method: 'deutschlandid' \| 'eudi'; onDone: () => void; onCancel: () => void }` | Handshake-Mock + aria-live Status (Screen B) |
| `OnboardingQrMock` | RSC | `{ label?: string }` | dekoratives QR/Wallet-Mock-Visual (Screen B), `aria-hidden`/`aria-label` |
| `OnboardingPersonaSelect` | client | `{ onSelect: (personaId: string) => void; onBack: () => void; selectedId?: string }` | Persona-Auswahl-Liste (Screen C) |
| `OnboardingPersonaCard` | client (onClick) | `{ personaId: string; name: string; descriptor: string; selected?: boolean; onClick: () => void }` | einzelne Persona-Karte mit Avatar (Screen C) |
| `OnboardingTransparency` | client | `{ personaId: string; onBack: () => void; onConfirm: () => void }` | Attribut-Transparenz + Commit (Screen D) |
| `OnboardingLegalBasis` | RSC (optional) | `{ }` (reine Präsentation, Strings via t()) | Empfänger + Rechtsgrundlage-Block (Screen D) |

> Reuse-Disziplin: jede Card-Hülle nutzt `SectionCard`/`RightRailCard`/`ui/card`; jeder Status-Pill nutzt `StatusBadge`; jeder getönte Icon-Kreis nutzt `IconCircle`; jedes Personen-Monogramm nutzt `Avatar`; jede Label/Wert-Zeile nutzt `KeyValueRow`; Buttons nutzen `ui/button`; Toggles nutzen `ui/switch`/`ConsentToggle`. **Keine neue Card-/Badge-/Row-Implementierung.** Die `Onboarding*`-Komponenten sind dünne Kompositionen über den Foundation-Primitives.

## 6. Data model additions / changes

### New types
**Keine neuen Domain-Types nötig.** Onboarding liest die bestehende `Persona` (`src/types/persona.ts`) und arbeitet mit einem rein lokalen Step-State-Type, der im Page-Modul lebt (keine geteilte Type-Datei):
```ts
// lokal in src/app/(auth)/onboarding/page.tsx — NICHT in src/types/
type OnboardingMethod = 'deutschlandid' | 'eudi' | 'demo';
type OnboardingStep = 'method' | 'handshake' | 'persona' | 'transparency';
```

### Mock-backend additions
**KEINE. mock-backend-coder ist für diese Surface NICHT erforderlich.** Onboarding nutzt ausschließlich die bereits exportierte Funktion:
- `reseedForActivePersona(personaId: string): void` — exportiert aus `src/lib/mock-backend/index.ts` (definiert in `src/lib/mock-backend/seed.ts`). Schreibt `meta.active_persona_id` und reseedt alle Per-Persona-Buckets (profile, letters, vorgaenge, documents, termine, consent, stammdaten-Buckets, …). **Dies ist exakt der Commit-Mechanismus, den Onboarding vor dem Redirect nach `/dashboard` aufruft.** Verifiziert: Export vorhanden in `index.ts` (`export { seedIfEmpty, reseedForActivePersona, getActivePersonaId } from './seed';`).
- Optional `getActivePersonaId()` (gleicher Export) falls der Coder den aktuellen Default lesen will.
- Der Boot-Hook (`seedIfEmpty` via `ensureBooted()`) läuft beim ersten API-Zugriff ohnehin; `reseedForActivePersona` schreibt Meta + Buckets direkt und braucht keinen separaten Boot.

### Seed data extension
**Keine.** Die drei Personas existieren bereits in `src/data/personas.json`.

### Persistence keys (localStorage)
**Keine neuen Keys.** `reseedForActivePersona` schreibt in die bestehenden Buckets (`meta`, `profile`, `letters`, …) über den bestehenden Versionierungs-Wrapper. Der optionale Attribut-Toggle-Zustand (Screen D Gruppe 2) wird **bewusst NICHT persistiert** — er ist die sichtbare Datenminimierungs-Mechanik, kein Backend-State.

## 7. AI assistant integration

**Nicht anwendbar.** Onboarding bindet den Assistenten nicht ein. Der Assistent (Hero, Spine-Schritt 3) lebt unter `(app)/assistent` und ist eine eigene Spec.

## 8. i18n

Alle neuen Keys liegen unter dem Top-Level-Namespace **`onboarding.*`** (NUR dort). Reuse bestehender Keys, wo sie passen: `app.name`, `app.tagline`, `app.skip_to_content`, `footer.privacy`, `footer.imprint`, `common.status.bestaetigt`, `common.context_chip.speculative`, `common.context_chip.prototype` (vorhanden). `track: spine` → **volle 6-Sprachen-Lokalisierung** durch i18n-localizer (de = Source-of-truth; en, ru, uk, ar, tr human-reviewed; AR-RTL audited).

> Marken-/Norm-Begriffe **NICHT übersetzen** und in `{method}` als Interpolations-Argument übergeben bzw. als Latein-Inline behalten: „DeutschlandID", „EUDI Wallet", „GovTech DE", „eIDAS 2", „OZG", „DSGVO", „BSI", „MOCK". In AR als `dir="ltr"`-Spans / Latein in Klammern (Bidi-Konvention der bestehenden i18n-Disziplin).

### DE source key table (key → DE value)

| Key | DE source value |
|---|---|
| `onboarding.topbar.login_label` | „Anmelden" |
| `onboarding.welcome.title` | „Willkommen bei GovTech DE" |
| `onboarding.welcome.subtitle` | „Melden Sie sich an oder starten Sie die Demo." |
| `onboarding.method.deutschlandid.title` | „Mit DeutschlandID fortfahren" |
| `onboarding.method.deutschlandid.helper` | „Sicher, einfach und behördlich anerkannt." |
| `onboarding.method.eudi.title` | „Mit EUDI Wallet fortfahren" |
| `onboarding.method.eudi.helper` | „Ihre digitale Brieftasche für Europa." |
| `onboarding.method.demo.title` | „Demo-Modus mit Mock-Daten" |
| `onboarding.method.demo.helper` | „Ohne Anmeldung testen. Keine echte Behördenanbindung." |
| `onboarding.trust.secure` | „Sichere Anmeldung" |
| `onboarding.trust.consent` | „Nur mit Ihrer Zustimmung" |
| `onboarding.trust.no_real_connection` | „Keine echte Behördenanbindung" |
| `onboarding.how.title` | „So einfach geht's" |
| `onboarding.how.step1.title` | „Identität wählen" |
| `onboarding.how.step1.desc` | „Wählen Sie Ihre bevorzugte Anmeldemethode: DeutschlandID oder EUDI Wallet." |
| `onboarding.how.step2.title` | „Datenfreigabe prüfen" |
| `onboarding.how.step2.desc` | „Prüfen Sie die angeforderten Daten und geben Sie nur frei, was nötig ist." |
| `onboarding.how.step3.title` | „Autopilot starten" |
| `onboarding.how.step3.desc` | „Ihre Daten werden vorausgefüllt, Briefe erklärt und Ihre Vorgänge automatisch gestartet." |
| `onboarding.why.title` | „Warum diese Anmeldung?" |
| `onboarding.why.prefill` | „Daten vorausfüllen" |
| `onboarding.why.explain` | „Briefe verständlich erklären" |
| `onboarding.why.autopilot` | „Autopilot für Ihre Vorgänge" |
| `onboarding.handshake.connecting` | „Verbindung zu {method} …" |
| `onboarding.handshake.confirmed` | „Identität bestätigt" |
| `onboarding.handshake.mock_note` | „Simulierter Identitäts-Handshake · Prototyp, keine echte Behördenanbindung." |
| `onboarding.handshake.qr_label` | „QR-Code zur Anmeldung (Mock)" |
| `onboarding.handshake.cancel` | „Abbrechen" |
| `onboarding.persona.title` | „Wählen Sie eine Identität für die Demo" |
| `onboarding.persona.subtitle` | „Sie können die Identität später jederzeit wechseln." |
| `onboarding.persona.anna.name` | „Anna Petrov" |
| `onboarding.persona.anna.descriptor` | „Berlin · angestellt · russisch" |
| `onboarding.persona.schmidt.name` | „Familie Schmidt" |
| `onboarding.persona.schmidt.descriptor` | „Hamburg · Familie mit Kind · deutsch" |
| `onboarding.persona.mehmet.name` | „Mehmet Yıldız" |
| `onboarding.persona.mehmet.descriptor` | „Köln · selbstständig · türkisch" |
| `onboarding.persona.back` | „Zurück" |
| `onboarding.transparency.title` | „Diese Daten stellt Ihre digitale Identität bereit" |
| `onboarding.transparency.subtitle` | „Sie entscheiden, was geteilt wird. Nichts ohne Ihre Zustimmung." |
| `onboarding.transparency.required_group` | „Pflichtangaben — für die Anmeldung erforderlich" |
| `onboarding.transparency.optional_group` | „Optionale Angaben — nur bei Bedarf (Datenminimierung)" |
| `onboarding.transparency.attr.name` | „Name" |
| `onboarding.transparency.attr.birthdate` | „Geburtsdatum" |
| `onboarding.transparency.attr.address` | „Anschrift" |
| `onboarding.transparency.attr.nationality` | „Staatsangehörigkeit" |
| `onboarding.transparency.attr.marital_status` | „Familienstand" |
| `onboarding.transparency.attr.tax_id` | „Steuer-Identifikationsnummer" |
| `onboarding.transparency.badge.available` | „Verfügbar" |
| `onboarding.transparency.badge.optional` | „Optional" |
| `onboarding.transparency.share_toggle` | „Teilen" |
| `onboarding.transparency.recipient` | „Empfänger: nur GovTech DE (Demo) — und nur mit Ihrer Zustimmung." |
| `onboarding.transparency.legal_basis` | „Rechtsgrundlage: eIDAS 2 / OZG · einwilligungsbasierte Angaben: DSGVO Art. 6 Abs. 1 lit. a" |
| `onboarding.transparency.dsgvo_footer` | „Ihre Daten werden sicher übertragen und gemäß DSGVO verarbeitet." |
| `onboarding.transparency.mock_note` | „Spekulatives Demo-Feature · keine echte eID-Datenübertragung." |
| `onboarding.transparency.back` | „Zurück" |
| `onboarding.transparency.confirm` | „Anmeldung bestätigen" |
| `onboarding.transparency.committing` | „Anmeldung wird vorbereitet …" |
| `onboarding.footer.bsi` | „Diese Anwendung entspricht den BSI-Grundschutz-Kriterien." |

**Key count: 56 neue `onboarding.*` Leaf-Keys.** (Strukturknoten wie `onboarding.method`, `onboarding.how.step1` etc. nicht mitgezählt.)

> i18n-localizer: `{method}` ist ein ICU-Interpolations-Argument; den Markennamen NICHT in den lokalisierten String einbacken. RU/UK: „Sie"-Form (Вы/Ви großgeschrieben). AR: formelle فصحى, RTL-sicher, Norm-/Markenbegriffe latein in `dir="ltr"`-Spans. Längen-Disziplin: Persona-Descriptoren und Trust-Items sind kurz; `onboarding.transparency.legal_basis` ist der längste String — am gerenderten Layout prüfen (darf umbrechen).

## 9. Edge cases

- **`prefers-reduced-motion`**: Handshake-Spinner → statisches Icon, Latenz auf ≤ 200 ms / Instant-Settle; Step-Übergänge Crossfade ≤ 200 ms statt Slide; Status-Text-Wechsel bleibt (aria-live).
- **AR-RTL**: gesamte Surface mit logischen Properties (`ms-`/`me-`/`border-s`/`border-e`, `text-start`); Chevrons (Demo-Modus-Zeile, „Anmelden ▾") gespiegelt; Norm-/Markenbegriffe als `dir="ltr"`-Inline-Spans. Persona-Avatare links/rechts korrekt gespiegelt.
- **Lange Persona-Namen / Locale-Expansion**: Name in Persona-Karte und in der Transparenz-Attributzeile `truncate`, nicht umbrechen; Descriptor darf auf zwei Zeilen.
- **Methode abbrechen / Zurück**: Handshake-„Abbrechen" → zurück zu Screen A, Timer gecleart, Fokus zurück auf zuvor gewählte Methoden-Karte. Persona-„Zurück" → Screen A. Transparenz-„Zurück" → Persona-Auswahl (Auswahl bleibt gemerkt). Browser-Back während des Flows: da Ein-Route, führt Browser-Back von `/onboarding` zur Landing `/` — akzeptabel; der interne Step-State geht verloren und beginnt bei A neu (idempotent, kein State korrumpiert, weil Commit erst auf D passiert).
- **Deep-Link direkt auf `/onboarding`**: startet deterministisch bei `step='method'` (Screen A). Kein Step ist per URL direkt erreichbar.
- **Doppel-Klick auf „Anmeldung bestätigen"**: Button nach erstem Klick disabled/`aria-busy` bis `router.push` greift; verhindert doppelten Reseed.
- **Bereits aktive Persona vorhanden** (Nutzer war schon in der App, kehrt zu `/onboarding` zurück): `reseedForActivePersona` ist idempotent und überschreibt sauber; kein Sonderfall nötig. Onboarding zeigt KEINE „aktuell aktiv"-Vorauswahl (bewusst — der Flow ist immer ein frischer Einstieg).
- **Optionale Attribut-Toggles**: haben in dieser Demo keinen Backend-Effekt (nicht persistiert) — bewusste Scope-Grenze. Ihr sichtbarer Zweck ist die Datenminimierungs-Mechanik (an/aus, default aus).
- **Theme nicht gemountet (SSR)**: ThemeToggle zeigt System-Icon bis `mounted` (bestehendes Verhalten der Foundation-Komponente).
- **Demo-Modus**: überspringt den Handshake (Screen B) und geht direkt zu Persona (Screen C) — der eID-Handshake gehört konzeptuell nur zu DeutschlandID/EUDI.

## 10. Out of scope (explicit)

- **Echte eID**: kein echter DeutschlandID-/EUDI-Wallet-Handshake, keine echte Identitätsprüfung, kein OAuth/SAML/OpenID-Connect.
- **Echter QR-Code**: das QR-Visual ist dekoratives Mock; kein scanbarer Code, keine Geräte-Kopplung.
- **Echte Wallet-Anbindung**: keine `@anthropic-ai/sdk`, keine externe API, kein Netzwerk-Call.
- **Die Umzug-Behörden-Consent-Matrix** (Bürgeramt / Finanzamt / Beitragsservice / Bundesdruckerei + Krankenkasse / Bank / Arbeitgeber / Versicherer) — gehört zur Umzug-Preview/Consent-Screen eines anderen Tracks, NICHT hierher. Die Transparenz hier ist allgemein über eID-Identitätsattribute.
- **Persistenz der optionalen Attribut-Toggles** — bewusst nicht (siehe § 9).
- **Änderungen an der `(app)`-Shell** (Sidebar/Topbar/Footer der App) — keine.
- **Änderungen an der Landing-Seite** über das Umlenken des CTA auf `/onboarding` hinaus — die Landing kann ihren „Demo öffnen"-Pfad auf `/onboarding` zeigen lassen (statt direkt `/dashboard?persona=…`), aber ein Redesign der Landing ist eine eigene Screen-Spec.
- **Neue mock-backend-Endpoints / Datentypen / Seed-Daten** — keine (mock-backend-coder nicht erforderlich).
- **„Persona wechseln" aus der App heraus** (UserMenu-Item) — eigene Screen-Spec; nutzt denselben `reseedForActivePersona`-Mechanismus, ist aber nicht Teil dieser Surface.

## 11. Review checklist (for code-reviewer)

**Surface-spezifisch:**
- [ ] `(auth)`-Layout existiert (`src/app/(auth)/layout.tsx`), slim Top-Bar (Brand + LanguageSwitcher + ThemeToggle + „Anmelden ▾"), KEINE App-Sidebar/Topbar-Nav; Footer-Zeile mit BSI-Hinweis + Datenschutz/Impressum.
- [ ] `export const dynamic = 'force-dynamic'` auf `(auth)/layout.tsx` (next-intl@3 Prerender-Workaround).
- [ ] Flow ist drei Schritte (Methode → Handshake+Persona → Transparenz), endet auf `/dashboard`; Ordering wie § 4 begründet.
- [ ] Screen A: ein `<h1>`, zwei prominente Methoden-Karten + Demo-Modus-Zeile + 3 Trust-Items + „So einfach geht's" 3 Schritte + „Warum diese Anmeldung?" 3 Items.
- [ ] Screen B: Handshake-Mock ~1.2–2.0 s, KEIN Error-Pfad, aria-live Status „Verbindung zu {method} …" → „Identität bestätigt"; reduced-motion → statisch + Instant-Settle; sichtbarer MOCK-Hinweis; Abbrechen → A mit Focus-Restoration. Demo-Modus überspringt B.
- [ ] Screen C: drei Persona-Karten (Avatar-Monogramm + Name + ehrlicher Descriptor aus i18n), Auswahl committet NICHT, geht zu D; Zurück → A.
- [ ] Screen D: Attribut-Liste (Pflicht + Optional) mit StatusBadge; optionale Attribute mit Toggle default AUS; Empfänger + Rechtsgrundlage (eIDAS 2 / OZG + DSGVO Art. 6) + DSGVO-Footer; „Anmeldung bestätigen" ruft `reseedForActivePersona(id)` + `router.push('/dashboard')`; Doppel-Klick-Schutz.

**Reuse / Konventionen:**
- [ ] AUSSCHLIESSLICH Foundation-Primitives (PageHeader, SectionCard, RightRailCard, StatusBadge, IconCircle, Avatar, KeyValueRow, EmptyState, ui/{button,card,switch,…}); keine geforkte Card/Badge/Row/Token-Definition.
- [ ] Keine neuen mock-backend-Endpoints, keine neuen Types in `src/types/`, keine neuen localStorage-Keys; Commit nur über `reseedForActivePersona`.
- [ ] Keine hardcoded Strings — alles via `t()`; alle 56 neuen Keys unter `onboarding.*` in `de.json` + 5 weiteren Locales (en/ru/uk/ar/tr), human-reviewed (spine).
- [ ] `{method}` als Interpolations-Argument; Marken-/Norm-Begriffe nicht übersetzt, AR `dir="ltr"`-Spans.
- [ ] Server-Component-by-default; `'use client'` nur auf page + Handshake/PersonaSelect/Transparency/MethodCard/PersonaCard.
- [ ] `@/`-Import-Alias; kebab-case Dateien; PascalCase Komponenten.

**a11y (BITV/WCAG AA):**
- [ ] Genau ein `<h1>` pro gerendertem Step (A welcome.title / C persona.title / D transparency.title); B trägt aria-live-Status statt h1 (begründet § 4.3).
- [ ] Skip-Link `app.skip_to_content` als erstes fokussierbares Element im `(auth)`-Layout.
- [ ] Alle interaktiven Elemente ≥ 44×44px (HL-DS-8); Inputs/Toggles ≥ 48px wo zutreffend (HL-DS-9).
- [ ] Sichtbarer Focus-Ring (`--color-primary`, 2px + 2px offset); Focus-Order wie § 4.1; Focus-Restoration bei Handshake-Abbruch.
- [ ] Handshake: `role="status"` / `aria-live="polite"`; Spinner `aria-hidden` + `motion-reduce:animate-none`.
- [ ] Attribut-Liste als `<dl>`/`dt`/`dd`; Toggles mit Label-Verknüpfung + `aria-checked`; maskierte Steuer-ID Reveal ≥ 44px + `tabular-nums` (HL-DS-6).
- [ ] AR-RTL: logische Properties, gespiegelte Chevrons, `dir="ltr"`-Spans für Latein-Begriffe; Light + Dark via Tokens korrekt.
- [ ] Lighthouse a11y > 95 auf `/onboarding`; axe 0 kritisch.

**Mock-/Ehrlichkeits-Disziplin:**
- [ ] Auf jedem Schritt ein sichtbarer, unaufdringlicher MOCK-/Prototyp-/Spekulativ-Hinweis; kein Versprechen einer echten Behördenanbindung.
- [ ] Steuer-ID maskiert mit `[MOCK]`-Präfix; keine als echt wirkende, unmaskierte sensible Nummer ohne Maske.

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Screen A (Willkommen + Methodenwahl), Screen B (Handshake-Mock), Screen C (Persona-Auswahl), Screen D (eID-Attribut-Transparenz + Commit) — single client route `/onboarding` mit `useReducer` Step-State (`method | handshake | persona | transparency`); endet via `reseedForActivePersona(id)` + `router.push('/dashboard')`.
- files created:
  - `src/app/(auth)/layout.tsx` (RSC, slim Top-Bar Brand+LanguageSwitcher+ThemeToggle+„Anmelden", Skip-Link, `<main id="main-content">`, BSI-Footer; `export const dynamic = 'force-dynamic'`)
  - `src/app/(auth)/onboarding/page.tsx` (client, Step-State-Reducer + Crossfade-Transition + reseed/redirect)
  - `src/components/onboarding/OnboardingWelcome.tsx` (client, Screen A composition — trägt h1 welcome.title)
  - `src/components/onboarding/OnboardingMethodCard.tsx` (client, `prominent`/`row` Varianten, aria-describedby helper)
  - `src/components/onboarding/OnboardingStepList.tsx` (RSC, nummerierte Schritte + Connector)
  - `src/components/onboarding/OnboardingTrustItem.tsx` (RSC)
  - `src/components/onboarding/OnboardingHandshake.tsx` (client, ~1500ms Timer / ≤150ms unter reduced-motion, role=status aria-live, kein Error-Pfad, Focus auf Status-Region)
  - `src/components/onboarding/OnboardingQrMock.tsx` (RSC, dekoratives Mock-QR, kein scanbarer Code)
  - `src/components/onboarding/OnboardingPersonaSelect.tsx` (client, trägt h1 persona.title)
  - `src/components/onboarding/OnboardingPersonaCard.tsx` (client, Avatar-Monogramm + Name + Descriptor, aria-pressed)
  - `src/components/onboarding/OnboardingTransparency.tsx` (client, trägt h1 transparency.title, KeyValueRow+StatusBadge, Switch-Toggles default AUS, maskierte Steuer-ID mit Reveal ≥44px, Commit-Doppelklick-Schutz via aria-busy)
  - `src/components/onboarding/OnboardingLegalBasis.tsx` (RSC, Empfänger + Rechtsgrundlage)
  - `src/components/onboarding/persona-attributes.ts` (statische Persona-Projektion aus `personas.json`, kein mock-backend-Read)
- reuse only: `Card`, `Button`, `Switch` (ui), `IconCircle`, `Avatar`, `KeyValueRow`, `StatusBadge`, `MockWatermarkBanner`, `LanguageSwitcher`, `ThemeToggle` (foundation/layout). Keine neuen Tokens, keine geforkten Primitives, keine neuen mock-backend-Endpoints/Types/localStorage-Keys.
- i18n keys added (DE source, `de.json`, neuer Top-Level-Namespace `onboarding.*`, 56 Leaf-Keys): topbar.login_label; welcome.{title,subtitle}; method.{deutschlandid,eudi,demo}.{title,helper}; trust.{secure,consent,no_real_connection}; how.{title,step1.{title,desc},step2.{title,desc},step3.{title,desc}}; why.{title,prefill,explain,autopilot}; handshake.{connecting,confirmed,mock_note,qr_label,cancel}; persona.{title,subtitle,anna.{name,descriptor},schmidt.{name,descriptor},mehmet.{name,descriptor},back}; transparency.{title,subtitle,required_group,optional_group,attr.{name,birthdate,address,nationality,marital_status,tax_id},badge.{available,optional},share_toggle,recipient,legal_basis,dsgvo_footer,mock_note,back,confirm,committing}; footer.bsi. de.json JSON.parse OK.
- typecheck: pass (`tsc --noEmit` exit 0; eine transiente TS6053 für eine von einer Parallel-Session gelöschte `tests/e2e/debug-dash5.spec.ts` verschwand beim Re-Run — nicht in meinem Scope).
- lint: blocked by PRE-EXISTING `eslint-config-next@15.5.18` + ESLint-9 `@rushstack/eslint-patch`-Inkompatibilität (config-load schlägt fehl, identisch auf unberührten Dateien — siehe redesign-foundation Cleanup-Pass). Keine neuen Lint-Verstöße eingeführt: meine Dateien sind frei von `console.*`/`any`/`@ts-ignore`/`localStorage`/`JSON.parse` (Grep 0 Treffer); strict-tsc clean.
- unit suite: pass 639/639 (41 Dateien) — keine Regression ggü. Foundation-Baseline.
- build: pass (`next build` exit 0) — `/onboarding` baut als Dynamic-Route (10.4 kB), alle 20 Routen grün.
- known gaps / Entscheidungen (für code-reviewer):
  1. **„Anmelden ▾" als Anker** (nicht Menü) auf `#main-content` gebaut — Spec § 4.0 erlaubt das ausdrücklich, vermeidet zweiten Anmeldepfad.
  2. **`legal_basis` Norm-Begriffe / AR-`dir="ltr"`-Spans**: DE-Source ist ein flacher String; die AR-Bidi-Behandlung (Latein-Inline `dir=ltr`) liegt im Stringinhalt und damit bei i18n-localizer (Konvention der bestehenden Pässe). Frontend rendert `t('legal_basis')` als plain paragraph. Falls Reviewer Markup-Splitting (t.rich) bevorzugt, müsste das Key-Schema Tags tragen — derzeit nicht spezifiziert.
  3. **Optionale Toggles**: default AUS, kein Backend-Effekt, nicht persistiert (Spec § 9 bewusste Scope-Grenze). Wert wird erst bei `share=on` angezeigt, sonst `—`.
  4. **Familienstand-Descriptor** aus `personas.json` abgeleitet (Anna „ledig (Partnerschaft)" via `familie.partner`; Schmidt „verheiratet" via `eheschliessung`; Mehmet „—"). Spec ließ den konkreten Wert offen („der Punkt ist die Toggle-Mechanik").
  5. **Handshake-Focus** auf die `role=status`-Region (statt Abbrechen-Button) gesetzt, weil base-ui `Button` keinen DOM-`ref` sauber forwarded (bestehende Codebase nutzt `document.activeElement`-Pattern); Focus-Restoration bei Abbruch obliegt dem natürlichen Re-Render auf Screen A (keine vorherige Karte als Trigger-ref gehalten, da Karten beim Step-Wechsel unmounten).
- next: i18n-localizer (56 `onboarding.*` DE-Keys → en/ru/uk/ar/tr, AR-RTL `dir=ltr`-Spans für eIDAS 2 / OZG / DSGVO im `legal_basis`-String), dann a11y-tester (Lighthouse/axe auf `/onboarding`, AR-RTL-Audit, reduced-motion Handshake), dann code-reviewer.
