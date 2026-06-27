# GovTech-DE — Update-Log „Waldgrün"

> Vollständiges Änderungsprotokoll **ab dem ersten Commit des neuen Designs**
> (`3a76418`, 2026-06-18 — *„Waldgruen brandbook foundation + rebuilt landing"*)
> bis zum aktuellen Stand. Es löst die frühere cobalt-blaue Redesign-Baseline
> ab. Reihenfolge: neueste Phase zuerst.
>
> **Stand:** 2026-06-24 · Branch `feat/termine-vorgemerkt`
> **Hinweis zur Reife:** Phase 0–1 sind auf den **lokalen `main`** gemerged
> (noch **nicht** zu `origin` gepusht); Phase 2 ist **WIP, noch nicht committet**.
> Alles ist ein **Speculative-Design-Prototyp** — alle Daten sind Beispieldaten `[MOCK]`,
> spekulative Schritte sind als `[ZUKUNFT 2027]` gekennzeichnet.

---

## TL;DR — was sich geändert hat

Aus dem blau-minimalistischen Prototyp wurde ein eigenständiges, grünes
Produkt mit Identität: **„Waldgrün"** (`#0F3D2E`), Top-Navigation statt
Sidebar, **Inter Tight** als Display-Schrift — gov.uk-/DigitalService-Register,
ernst und bürgerrespektvoll. Wichtiger als die Optik: die **Lebenslagen sind
jetzt funktional** — ein konfigurationsgetriebener Kaskaden-Motor führt alle
sieben Vorgänge vom Detail über den vorausgefüllten Antrag und die eID-Bestätigung
bis zur koordinierten Bearbeitung und zum Abschluss-Dossier.

| Kennzahl | Wert |
|---|---|
| Commits (Design-Ära) | 11 (`3a76418` … `fd444a4`) |
| Code committed | 109 Dateien, **+20 634 / −2 912** |
| Code WIP (Phase 2, uncommitted) | 38 Dateien, **+7 242 / −2 487** |
| Funktionale Lebenslagen | **7** (Umzug, Aufenthalt, Kindergeld, Wohngeld, Geburt, BAföG, Pflege) |
| Sprachen | 6 (DE-Quelle · EN · RU · UK · AR · TR) |
| Gates | `next build` + `tsc` grün · Spine-E2E 2/2 · axe WCAG 2.1 AA |

**Die Produkt-Story in einem Satz:** *Ein Vorgang. Fünf Ämter. Eine Bestätigung —
ca. 95 Minuten gespart gegenüber dem klassischen Weg.*

---

## Phase 2 — Mockup-getriebene Relayouts (2026-06-21 … 06-24) · WIP, `feat/termine-vorgemerkt`

Fünf Screens (+ ein geteiltes Ergebnis-Dossier) nach gelieferten Mockups neu
aufgebaut, jeweils an die **echten Seed-Daten** gebunden und „honesty-locked" (keine erfundenen Behördenprozesse,
korrekte Rechtsgrundlagen, `[MOCK]`/`[ZUKUNFT]`-Kennzeichnung).

- **eID-Einwilligung — „Screen D" (`OnboardingTransparency`)**
  Aus dem Mockup neu gebaut: grüner eID-Hero (`#0F3D2E`), 3-Spalten
  *Empfänger / Zweck / §-Rechtsgrundlage*, Attribut-Tabellen
  *Verifiziert / Erforderlich / Optional*, „X von 6"-Zähler, Trust-Strip,
  Lock-CTA. Logik unverändert. Verwaiste `OnboardingLegalBasis` entfernt.
  Onboarding-a11y wieder **grün** (live axe 19/0/0, light+dark+mobil).

- **Lebenslagen — Hub + Detail (`LebenslagenView` + `LeistungDetailView`)**
  *Hub:* Suche + 9 Themen-Chips, 6 echte „Beliebte Lebenslagen"-Karten mit
  Live-Zählern, „Nach Lebensphase"-Verzeichnis, „Warum/Empfohlen"-Schiene,
  Trust-Bar. *Detail (generisch für alle 7 Slugs):* Breadcrumb, Kaskaden-Stepper,
  „Beteiligte Stellen", `[MOCK]`-Nachweise, Once-Only-Block, „Auf einen
  Blick"-Schiene. Honesty-Swap (Mockup-Demoinhalte → echte Kindergeld/Wohngeld).

- **Ergebnis-Dossier (`VorgangAbgeschlossen` + `VorgangInBearbeitung`)**
  Generische „Vorgang in Bearbeitung" / „Vorgang abgeschlossen"-Ansicht für
  alle 7 Lebenslagen (config-getrieben, nach dem Pflegegrad-Mockup): Fortschritt,
  Aktenzeichen, „ca. X Min gespart", alle Schritte mit Rechtsgrundlage,
  „Ihre Kontrolle"-Schiene.

- **Termine — Command-Center (`TermineView`)**
  4-KPI-Zeile, Tab-Toolbar, Kalender + Legende als Schiene, „Anstehende Termine"
  + „Fristen", „Termindetails"-Panel (ersetzt den alten Detail-Dialog). Der
  §17-BMG-Moment (Bürgeramt-Anmeldetermin „gefunden + vorgemerkt, Sie bestätigen")
  wandert ins Panel mit ehrlicher Quittung. `MonthCalendar` mit
  Kategorie-Punkten + „Erinnerung"-Legende. Neu: `TerminAbsagenDialog`,
  `TerminRescheduleDialog`, `termin-format`, `termin-status`. Entfernt:
  `TermineFilter`, `TerminHeroCard`. Neuer Datentyp `src/types/termin.ts`.
  **Backend-Ehrlichkeitskorrektur (`api.ts`):** „Verschieben" mutiert nur das
  Datum — kein Status-Wechsel mehr; die Behörde wird **nicht** automatisch
  benachrichtigt (`[MOCK]` — kein OZG/XTermin-Sync), die frühere falsche
  Behauptung ist aus der UI raus. §17-BMG-Slot mit `reasoning_typ: 'bmg_17'`.

- **Umzug-Autopilot `/run` → geteiltes Dossier**
  Die alte flache „Umzug auf Autopilot"-Seite nutzt jetzt dieselben
  Dossier-Komponenten (`VorgangInBearbeitung` / `VorgangAbgeschlossen`) wie die
  Lebenslagen — einheitlich nach dem Pflegegrad-Mockup. Live-Tick-Stream +
  Inspector-Panels bleiben; eID via `bestaetigeAutopilotSchritt`.
  Spine-E2E Schritt 5 entsprechend migriert (`.vlf-timeline` / „Erledigt").

- **i18n:** großer Zuwachs — **~466 neue Leaf-Keys pro Sprache** (Onboarding,
  Lebenslagen, Dossier, Termine) bei voller 6-Sprachen-Parität
  (DE-Quelle + EN/RU/UK/AR/TR).

- **Kleinere Anpassungen & Tests:**
  - `PosteingangInbox` — Reply-Gutter folgt jetzt dem Öffnen-Lebenszyklus,
    klappt synchron zur Drawer-Exit-Animation ein.
  - Neue/erweiterte a11y-Spec `tests/a11y/redesign-termine.spec.ts` (+485)
    sowie angepasste `onboarding-landing.spec.ts`; Spine-E2E `spine.spec.ts`
    auf das geteilte Dossier migriert.
  - 7 Lebenslagen-Configs erweitert (Dossier-/Termin-Felder), `index.ts` + `types.ts`.
  - Infrastruktur: `package.json`, `CLAUDE.md` aktualisiert; interne Diagnose-Specs
    (`tests/e2e/_vab-*`, `_vlf-*`) als Arbeitswerkzeug (nicht Teil der Suite).

---

## Phase 1 — Funktionale Tiefe + grüne Kern-Screens (2026-06-20)

Merge der Stränge `feat/brandbook-redesign` + `feat/vorgaenge-functional` in
den lokalen `main`.

- **`c73fc78` — Stammdaten „green-bento" + `/vorgaenge` Command-Center**
  *Stammdaten:* Ring-Header-Bento aus Mockup — Vollständigkeits-Ring,
  Wallet-/Once-Only-Register-Karten, eingebundene `v2`-Karten (klärt einen Teil
  der „orphaned redesign"-Schuld). *Vorgänge:* 4-KPI-Statzeile, Suche, grüne
  Umzug-Timeline, 3-Spalten-Karten mit „Nächste Aktion", 4-Sektionen-Schiene —
  an echte Seed-Daten gebunden.

- **`a44d2df` — config-getriebener `runLebenslageCascade`-Motor: alle 7 Karten
  funktional** *(der Kern dieser Ära)*
  **Ein** generischer Motor lässt jede `/lebenslagen`-Karte arbeiten:
  Detail → **vorausgefüllter Antrag** (aus Stammdaten, mit Datenminimierungs-Panel)
  → **eID-Bestätigung** → **Bearbeitungs-Kaskade** (Ämter koordinieren sich)
  → Aktenzeichen + Posteingang-Eingang + Wert-Quittung. Umzug-Saga unberührt.
  Honesty-Locks: Kindergeld antragslos = `[ZUKUNFT 2027]`, **kein** Melderegister→ABH-Push,
  Reisepass = Termin statt Versand.

- **`05de852`** — Stammdaten-V3 (eID-Identity-Hero + Once-Only-Panel, später
  zugunsten der green-bento-Variante zurückgestellt) + Demo-/Teaser-Recording-Tooling.
- **`1b5c6c4` / `fcff4ba`** — Merges der beiden Stränge.
- **`fd444a4`** — a11y-Fix: Kontrast des dunklen Wert-Quittungs-Bandes;
  die verwaiste Stammdaten-V3-Spec via `test.fixme` zurückgestellt.

**Gates beim Merge:** `next build` + `tsc` grün · Spine-E2E **2/2** ·
axe **160 / −6 / 53** — die 6 roten Tests sind das **bereits zuvor bestehende**
Once-Only-`/dokumente`-Panel (keine Regression).

---

## Phase 0 — Design-Fundament „Waldgrün" (2026-06-18)

Der eigentliche Marken- und Shell-Wechsel.

- **`3a76418` — Waldgrün-Brandbook-Fundament + neu gebaute Landing**
  Neue Farb-/Typo-Token (siehe „Design-Grundlagen"), Landing-Page von Grund auf
  neu — „Verwaltung, die vorausdenkt.", grüner Hero, „Ein Antrag, koordiniert
  und sicher"-Visual, Lebenslagen-Karten.
- **`21b2f3d` — Phase 2a:** App-Sidebar → **Top-Navigation-Shell**.
- **`5171396` — Phase 2b:** Screen-Politur an Mockups #2–#6, grüner Build.
- **`2126a0b`** — verwaiste Sidebar-Shell-Komponenten entfernt.
- **`3c32b3e`** — Landing auf 1440 px verbreitert (war bei 1200 px App-Breite zu eng).

---

## Design-Grundlagen (Referenz)

Quelle: `design-handoff/DESIGN-FOUNDATIONS.md` (reale Token aus
`globals.css` + `prototype-v2.css`).

### Palette „Waldgrün"

| Token | Light | Verwendung |
|---|---|---|
| `--brand-600` / `--color-primary` | `#0F3D2E` | **Waldgrün — Primärfarbe.** Buttons, Akzente, Logo-Kreuz. Weißer Text darauf = 11.7:1 |
| `--brand-700` | `#0C3325` | hover |
| `--color-primary-active` | `#0A2A1F` | active |
| `--brand-500` | `#1E5C46` | Zwischenton |
| `--brand-50` / `--color-accent-soft` | `#ECF1EE` | weiche grüne Unterlage (aktive Nav-Pille, KI-Block, Info-Chip) |
| `--brand-900` | `#0B1220` | **Tintenblau** — nur Wordmark/Logo |
| `--brand-fill` | = `#0F3D2E` | Füllungen mit weißem Text (Primär-Buttons, Zähler, Avatare) — bleibt in beiden Themes satt |

### Typografie & Shell
- **Display:** Inter Tight (`--font-display`) · **Fließtext:** Inter (`--font-sans`)
- **Shell:** Top-Navigation (Lösungen · Lebenslagen · Sicherheit & Datenschutz · Ressourcen · Über uns) statt Sidebar
- **Register:** ernst, ruhig, transparent — *nicht* Fintech-Glanz, *nicht* AI-Startup, *nicht* Gosuslugi-Klon

### Prinzipien
- **Autopilot ist der Held** — der Wow-Moment ist, was das System *für* den Bürger tut, nicht das schönere Formular.
- **Datenminimierung sichtbar** — jeder Screen mit Personendaten zeigt: was, an wen, auf welcher Rechtsgrundlage (Art. 5 DSGVO).
- **Ehrlichkeit** — `[MOCK]` an Belegen/Daten, `[ZUKUNFT 2027]` an spekulativen Schritten.
- **Barrierefreiheit** — WCAG 2.1 AA + BITV 2.0, light + dark, Tastatur + Screenreader.

---

## Begleitendes Tooling (nicht Teil der App)

- **Demo-Recorder** für die Walkthrough-Videos: `playwright.green-clean.config.ts`,
  `playwright.green-demo.config.ts`, `playwright.update-clean.config.ts` +
  `tests/demo/green-tour-*.spec.ts` / `update-arc-clean.spec.ts`.
- **„Produkt-Update"-Reel:** `demo-recording/build-update.mjs` macht aus der
  rohen CLEAN-Aufnahme (`green-tour-clean.webm`) den geschnittenen Film
  `green-tour-update.mp4` — Waldgrün-Intro/Outro-Karten, 10 deutsche
  Bauchbinden, **Bildschirm-Übergänge als Cross-Dissolves** (die weißen
  Route-Wechsel-Schleier werden herausgeschnitten), sine-pad-Tonbett + Klicks.
- **`design-handoff/`** — `DESIGN-FOUNDATIONS.md` (Waldgrün-Token) + Screenshots
  (light/dark, 1440×900 @2x).

---

## Offene Punkte / Deferred

- **Phase 2 ist noch nicht committet** und Phase 0–1 noch **nicht zu `origin` gepusht**.
- **Stammdaten-V3-Spec** via `test.fixme` zurückgestellt (orphaned redesign-Komponenten).
- **6 axe-Rote** = das bereits zuvor bestehende Once-Only-`/dokumente`-Panel (keine Redesign-Regression).
- **Loom-Video / README / Vercel-Deploy** des Waldgrün-Stands stehen aus.

---

*Erzeugt als Begleitdokument zum „Produkt-Update"-Reel. Sprache: Deutsch
(Produkt-Register, Sie-Form). RU-/EN-Fassung auf Wunsch.*
