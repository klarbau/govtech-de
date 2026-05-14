# Design Vision — Mein Profil als Wallet

**Datum**: 2026-05-14
**Status**: vision-locked, ready for spec
**Anlass**: Design-System v2 ship rejected — "polish ≠ vision"

---

## TL;DR

**Was es ist** (ein Satz): GovTech-DE ist die digitale Brieftasche eines deutschen Bürgers — Identität, Familie, Dokumente, laufende Vorgänge und Datenschutz an einem Ort, mit der Wärme eines Premium-Banking-Produkts statt der Kälte einer Behörde.

**Drei-Wort-Pitch**: *Mein Akt. Schön.*

---

## Product DNA (verifier-locked)

### 1. Metapher: **Wallet + Personal Profile**
Nicht "Datenbank-Frontend". Nicht "Behörden-Portal". Eine **persönliche Brieftasche**, in der:
- meine **Identitäts-Karten** liegen (Personalausweis, mDL, eAT, EU Health Card, Aufenthaltstitel)
- mein **Profil** sichtbar ist (wer bin ich, woher, welcher Status)
- meine **Familie** lebt (Ehepartner, Kinder, geteilte Vorgänge)
- meine **wichtigen Neuigkeiten** ankommen (Behörden-Briefe als Kuratierte Feed, nicht Inbox)
- mein **Datenschutz** sichtbar ist (wer hat was gesehen)

Apple Wallet × Personal Profile × Stripe Dashboard. Citizen-respectful, aber warm.

### 2. Hero "Это вы" — Identity First
**Erste 3 Sekunden** auf Stammdaten / Mein Profil:
- Avatar (Foto oder Illustration)
- Voller Name in groß
- Status-Statement: *"Anna Petrov, Bürgerin mit Aufenthaltstitel § 18g, wohnhaft in Berlin"*
- Verifizierungs-Stempel: *"Verifiziert in 6 Registern"*
- Letzte Aktivität: *"Vor 2 Stunden vom Bundesamt für Migration aktualisiert"*

KEINE Disclaimer-Wand zuerst. Disclaimer leben in `<details>` darunter.

### 3. Visueller Anker: **Mercury / Stripe / Cron — warm-fintech**
- **Hintergrund**: cream (`oklch(0.98 0.005 80)`), nicht reines Weiß
- **Cards**: warmes Off-White (`oklch(1 0 0)`) auf cream-bg, dünner Border (`1px solid oklch(0.92 0.005 80)`), 14px Border-Radius (Apple-Wallet-coded)
- **Headings**: **Serif** — Source Serif 4 oder Tiempos Text — premium-editorial. Body bleibt Sans (Source Sans 3).
- **Akzent**: ein einziges warmes Trust-Blau `oklch(0.42 0.13 250)`. Sonst neutral.
- **Typografie**: H1 in 36–48 px Serif, viel Atemraum, line-height generous
- **Schatten**: minimal, `0 1px 2px rgba(0,0,0,0.04)` für Card-Lift, sonst Border-first
- **Photo**: persona-spezifisch, Portrait, runder Frame (Apple Health Coded)

**Anti-Patterns**:
- Kein dichtes Linear-Layout
- Kein cooles Notion-Grau
- Kein Stripe-grünes Brand-Accent
- Kein Apple Wallet Dark-Cards-on-Dark
- Keine generischen Government-Blau-Boxen

### 4. Information-Density: **Editorial**
- Hero-Sektion takes 30–40 % der Viewport-Höhe.
- 1 hero + 4–5 "wichtige Sektionen" pro Scroll-Screen, NICHT 8 accordions.
- Lange Daten-Listen in collapsed `<details>` — Default-collapsed, nicht expanded.

---

## Drei Wow-Achsen (geplant, eine entwickeln)

### Achse A: Autopilot — *"Das System hat es für Sie erledigt"*
Bereits shipped als V1.0 Umzug. Aktuelle UX = Formular. Future-State = cinematischer Real-Time-Film: 4 Behörden, 14 Aktionen, Live-Status-Pulse, fertig.

**Status**: vorhanden, braucht Hero-Lift in einer späteren Phase.

### Achse B: AI-Übersetzer — *"Die Behörde sagt es Ihnen verständlich"*
Bereits teil-shipped als Posteingang Brief-Erklärer (V1.5/1.5.1). Kanzleitext → 1-Satz-AI-Übersetzung → Draft-Antwort.

**Status**: vorhanden, braucht emotionale Hero-Präsentation in einer späteren Phase.

### Achse C: Datenschutz-Cockpit — *"Sichtbare Bytes"*
Nicht-gebaut. Banking-statement für Datenzugriffe: wer hat welches Feld wann gesehen, mit Widerrufs-Button. Radikale Transparenz als deutsche Trust-Currency.

**Status**: noch nicht gebaut, eigene Phase nach Profile.

---

## ⚡ Was JETZT entwickelt wird: Mein Profil als Wallet

**Scope dieser Phase** (eine Phase, eine Vision, ein Ergebnis):

### Mein Profil — neue Seite (ersetzt Stammdaten-Landing)

**Route**: `/stammdaten` wird zu **`/mein-profil`** (alte Route bleibt als Redirect)

**Inhalt** (in Lese-Reihenfolge top-down):

#### 1. Identity Hero
```
                        ╭─────────────────╮
                        │     👤 Foto      │
                        ╰─────────────────╯

                       Anna Petrov
              Geboren 1992 in Sankt Petersburg
                   wohnhaft in Berlin

      Bürgerin der Bundesrepublik Deutschland
      mit Aufenthaltstitel § 18g (Blue Card EU)

         Verifiziert in 6 Registern  •  Letzte
         Übermittlung vor 2 Stunden  •  BAMF
```

Schriftart: Heading in **Source Serif 4**, sehr großzügig. Photo runder Rahmen 120–160 px.

#### 2. Mein Wallet
Karten-Stack visuell (gestaffelt, leicht überlappend, Mercury-style — nicht 3D-fancy):

- **Personalausweis** (offen sichtbar)
- **Mobile Driving Licence (mDL)** — Klasse B, EU
- **Aufenthaltstitel § 18g**
- **Krankenversicherung** (AOK Berlin)
- **EU-Krankenversicherungs-Karte**
- *(+ neues Dokument scannen / hinzufügen)*

Click → Vollbild-Karte mit Details + QR-Verify + EUDI-Wallet-Export. **Jede Karte folgt Page-Theme** (kein Dark-Override, HL-DS-12).

#### 3. Meine Familie
Wenn Persona Familie hat (Schmidt-Familie, Anna nicht): horizontale Avatare-Reihe mit:
- Lena Schmidt (Ehefrau) — Avatar + Name + "geteiltes Konto"
- Sophie Schmidt (Tochter, 14) — Avatar + Name + "Vormundschaft"
- + Familienmitglied hinzufügen

Anna (single) sieht: leere Sektion oder "Sie verwalten nur Ihr eigenes Profil. + Familienmitglied hinzufügen".

#### 4. Neuigkeiten (kuratiert, nicht Inbox)
Top-3 wichtigste Dinge gerade — nicht alle Briefe, nicht alle Vorgänge:

```
Wichtig
────────────────────────────────────────────
🔴  Steuer-Einspruch — Frist in 3 Tagen
    Finanzamt Frankfurt/Oder hat einen Bescheid
    geschickt. Wir haben einen Entwurf vorbereitet.
    [Prüfen]

⚪  Umzug-Vorgang läuft — Block 3 von 4
    73 % erledigt. Voraussichtlich fertig: morgen.
    [Live ansehen]

⚪  Renteninformation — neu
    Deutsche Rentenversicherung Bund hat aktualisiert.
    [Lesen]
```

Click → Detail-View (Posteingang Letter Reader oder Vorgang-Run-Page).

#### 5. Mein Datenschutz (preview)
3-Zeilen-Teaser zum kommenden Datenschutz-Cockpit (Achse C):

```
Datenschutz
────────────────────────────────────────────
142 Datenzugriffe in den letzten 30 Tagen
Letzte Übermittlung: BAMF, vor 2 Stunden
[Detail ansehen →]
```

#### 6. Alle Daten (collapsed)
Die alten 7 Sektionen aus V1.0-V1.3 (Identität, Adresse, Familie, Beschäftigung, Altersvorsorge, KV/Pflege, Mobilität) leben darunter als **collapsed `<details>`**, nicht hero. "Vollständiges Datenprofil" als Disclosure-Toggle.

---

## Visual Token Additions (für Phase Mein-Profil)

### Neue Tokens (additiv, parallel zu Phase 5a/5b)
```css
/* Cream-fintech Backgrounds */
--mp-bg-page: oklch(0.98 0.005 80);          /* cream, off-white */
--mp-bg-card: oklch(1 0 0);                   /* pure white card */
--mp-bg-card-warm: oklch(0.99 0.008 80);     /* slight warm card */

/* Borders */
--mp-border-card: oklch(0.92 0.005 80);
--mp-border-card-strong: oklch(0.85 0.005 80);

/* Serif Heading Font (next/font Source Serif 4) */
--font-serif-source: "Source Serif 4", Charter, "Iowan Old Style", serif;

/* Premium Card Shadow (singular, minimal) */
--mp-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.04);

/* Identity Hero proportions */
--mp-hero-avatar-size: clamp(120px, 12vw, 180px);
--mp-hero-headline-size: clamp(2rem, 4vw, 3rem);
```

### Persona-Avatare
3 Personas brauchen Portrait-Fotos. **Verbindlich** für Mein-Profil-Vision.

Optionen (Architect entscheidet):
1. **Real-stock photographic** (Unsplash, royalty-free, Creative Commons) — feinster premium-grade, aber muss passend ausgewählt sein
2. **Generated AI-Portrait** (Midjourney/DALL-E export, in repo committed) — kontrollierbar, demo-grade
3. **Illustrated** (Notion-style abstract figures) — sicher, aber weniger emotional
4. **Initials-on-gradient SVG** — sicher, aber generic-startup-feel

Empfehlung: **Option 2 (Generated AI-Portrait)** für eine echte Foto-Anmutung ohne Lizenz-Risiko. Drei Bilder:
- `public/personas/anna-petrov.jpg` (junge Frau, Mitte 30, slawische Züge, professional, Berlin-Kontext)
- `public/personas/markus-schmidt.jpg` (Mann Mitte 50, deutsch, freundlich, family-context)
- `public/personas/mehmet-yildiz.jpg` (Mann Mitte 40, türkisch-deutsch, selbstständig)

Wenn keine AI-Generation möglich: Option 1 (Unsplash mit klarer Quellenangabe in `public/personas/CREDITS.md`).

---

## Erhaltene Bestände (NICHT brechen)

- V1.0 Umzug Autopilot — bleibt unter `/vorgaenge/umzug` unverändert
- V1.5/1.5.1 Posteingang — bleibt unter `/posteingang` unverändert
- V1.3 Mobilität / Wallet-Sub-Tab — Inhalt bleibt, wandert in **collapsed Datenprofil**, und mDL-Card wandert in den neuen **Mein Wallet Hero-Stack**
- Alle Hard-Lines V1.0–V1.5.1 — unangetastet (FAER TTL, mDL closed-list, ARF v2.0, ban-list, etc.)
- Design-System v2 Tokens (Phase 5a/5b/5e) — bleiben, werden um die `--mp-*` Tokens additiv ergänzt
- Phase 6a/6b Sidebar/Topbar/LetterCard-Polish — bleibt, wird komplementiert

---

## NICHT in dieser Phase

- Achse A (Autopilot Hero-Lift) — separate Phase
- Achse B (AI-Übersetzer Hero-Lift) — separate Phase
- Achse C (Datenschutz-Cockpit voll) — nur Preview-Teaser auf Mein Profil
- Posteingang-Refactor außer als Konsum-Point von "Neuigkeiten"
- Vorgänge-Refactor außer als Konsum-Point von "Neuigkeiten"
- Onboarding/Landing-Redesign — eigene Phase
- Sidebar-Restructure auf neue IA (Mein Profil, Wallet, Briefe, Vorgänge, Datenschutz) — vielleicht später

---

## Spec-Pipeline

1. **product-architect** schreibt `docs/specs/mein-profil-wallet-v1.md` — Komponenten-Inventar, Daten-Shape, Persona-Differenzierung (Anna single vs Schmidt-Familie vs Mehmet selbstständig), i18n-Keys, a11y-Pflichten
2. **frontend-coder** baut nach Spec
3. **i18n-localizer** (6 Sprachen)
4. **a11y-tester**
5. **code-reviewer**

Avatare werden VOR Spec geliefert (separate Mini-Task: Persona-Fotos beschaffen + in `public/personas/` ablegen + Credits-Datei).

---

## Acceptance — "Vision umgesetzt?"

Wenn dieser Test bestanden:
- [x] User landet auf `/mein-profil`, sieht sein Foto + Namen + Status-Statement in 3 Sekunden
- [x] User sieht 3–5 Wallet-Karten gestapelt, optisch wie ein echter Geldbeutel
- [x] User sieht Familie (oder leere Familie-Card mit Add-CTA)
- [x] User sieht 1–3 "Wichtige Neuigkeiten" als Card-Stack, nicht Liste
- [x] User sieht Datenschutz-Preview als Trust-Anker
- [x] Alte 7-Sektionen-Daten sind erreichbar aber nicht hero
- [x] Aesthetic erinnert an Mercury, nicht an Behördenportal
- [x] User sagt "Yes, das ist mein Profil"

Wenn dieser Test fehlschlägt:
- User sieht weiterhin Daten-Tabellen ohne Identität
- User sagt weiterhin "interface ist v'переmешку, нет идеи"
