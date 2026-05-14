---
feature: mein-profil-wallet-v1
title: Mein Profil als Wallet — Identity-first Hauptseite (ersetzt Stammdaten-Landing)
status: spec
date: 2026-05-14
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  research: docs/research/2026-05-14-design-vision-mein-profil-wallet.md
  domain: docs/domain/stammdaten.md (V1.0–V1.3 — inherits)
  verify: vision-locked in research note § "Product DNA (verifier-locked)" — no separate verify review file
inherits_from:
  - docs/specs/stammdaten.md (V1, shipped)
  - docs/specs/stammdaten-v1-1-renten-kv.md (V1.1, shipped)
  - docs/specs/stammdaten-v1-1-kontakt-schicht.md (V1.2, shipped)
  - docs/specs/stammdaten-v1-3-mobilitaet.md (V1.3, shipped)
  - docs/specs/design-system-v2.md (Token-Layer, additiv)
hard-lines-count: 8 (HL-MP-1..8)
estimated_effort: ~1 frontend-coder session ≈ 2–3 hours (Komponenten + Page + i18n-Stubs)
---

> **Verhältnis zu V1.0–V1.3 (shipped)**: Diese Spec ändert **keine** Schemata,
> **keine** Hard-Lines, **keine** Mock-Backend-Endpoints. Sie führt eine neue
> Route `/mein-profil` ein, baut 6 neue Komponenten unter
> `src/components/mein-profil/`, und **wrappt** die existierende `<StammdatenView>`
> in einem collapsed `<details>`-Block ("Vollständiges Datenprofil"). Jede
> Hard-Line HL-MOB-1..14, HL-DS-1..14, V1.0 ARF v2.0, V1.5.1 muted-foreground-Floor,
> V1.3 FAER-TTL, mDL closed-list, Block-D-Wording bleibt unverändert in Kraft.

> **Verifier-Verhältnis**: Vision ist `docs/research/2026-05-14-design-vision-mein-profil-wallet.md`
> § "Product DNA (verifier-locked)". Diese Spec übersetzt die 7 Sektions-Vorgaben
> aus § "Was JETZT entwickelt wird" 1:1 in Komponenten, ohne neue Konzepte.
> Frontend-coder, i18n-localizer und a11y-tester dürfen daran **nicht**
> umformulieren.

---

## 1. Mission & Scope

Mein Profil ist die neue Identity-first-Hauptseite der GovTech-DE-Demo — eine warme, Mercury-/Stripe-coded persönliche Brieftasche, in der Foto + Name + Status-Statement in den ersten 3 Sekunden sichtbar sind, gefolgt von einem visuell gestapelten Wallet-Card-Stack, einem Familien-Panel, einem kuratierten Neuigkeiten-Feed (max 3 Items), einem 3-Zeilen-Datenschutz-Teaser und der existierenden V1.0–V1.3 Stammdaten-Hierarchie als collapsed `<details>` darunter. Die Seite ersetzt die alte Stammdaten-Landing, ohne die V1.0–V1.3-Schichten zu brechen — sie wrappt sie. Aesthetik: cream-fintech-Hintergrund, Source Serif 4 für H1/H2-Headings, Source Sans 3 für Body, Apple-Wallet-coded 14 px Border-Radius, kein chromatischer Akzent außerhalb HL-DS-3.

**Route-Entscheidung (Open-Question § 12 OQ-3 vorabbeantwortet)**: `/mein-profil` ist die neue kanonische Route. `/stammdaten` bleibt als **server-side Redirect** (HTTP 308) auf `/mein-profil` erhalten, damit V1.0–V1.3 e2e-Tests, Sidebar-Link-Cache und alte Browser-Bookmarks nicht brechen. Grund: Alias hätte zwei kanonische URLs erzeugt (SEO/Loom-Deeplink-Verwirrung); voller Rename hätte alle 14+ test-files brechen können. Redirect ist Kompromiss: minimal-invasiv, ein-Datei-Patch in `src/app/(app)/stammdaten/page.tsx`.

**In-Scope** (6 Hero-Komponenten + Page-Layout + i18n + Avatare):
- `IdentityHero` — Foto + Name + Status-Statement + Verifizierungs-Stempel
- `WalletCardStack` — 3–5 gestaffelte Karten, click → Detail-Modal
- `FamilyPanel` — Avatare-Reihe oder Empty-State mit Add-CTA
- `NeuigkeitenFeed` — max 3 kuratierte Items (Frist + Vorgang + neuer Brief)
- `DatenschutzPreview` — 3-Zeilen-Teaser, Click → `/stammdaten#aktivitaetsprotokoll`
- `VollstaendigesDatenprofil` — `<details>`-Wrapper um existierende `<StammdatenView>`
- Neue Route `/mein-profil` (server-component Page + Client-Wrapper)
- 3 Persona-Avatar-Bilder unter `public/personas/`
- Source Serif 4 next/font Konfig in `src/app/layout.tsx`
- 35–45 neue i18n-Keys × 6 Locales

**Out-of-Scope** (siehe § 11):
- Wow-Achsen A/B/C voll ausgebaut (Autopilot-Hero-Lift, AI-Übersetzer-Hero-Lift, Datenschutz-Cockpit voll) — eigene Phasen
- Wallet-Card Verify-QR + EUDI-Export (V1 Card-Modal zeigt nur Detail-View)
- Family-Member-Add-Flow (CTA ist Placeholder ohne Handler)
- Sidebar-IA-Restructure (Mein Profil / Wallet / Briefe / …) — eigene Phase
- Neue Mock-Backend-Endpoints (alle Daten kommen aus bestehenden `getPersona`, `getLetters`, `getVorgaenge`, `getMdlAttestation`, `getWalletAttestations`, `getUebermittlungsLog`)
- Onboarding/Landing-Redesign

---

## 2. Hard-Lines HL-MP-1..8 (Mein-Profil-spezifisch, verifier-locked)

Diese 8 Hard-Lines sind 1:1 aus der Architect-Antwort auf die Vision-Note abgeleitet. Frontend-coder, i18n-localizer und a11y-tester dürfen daran **nicht** umformulieren. Jede Hard-Line trägt einen konkreten Test, den a11y-tester / code-reviewer als Acceptance-Gate ausführt.

---

**HL-MP-1**: Photo + Name + Status-Statement liegen in den **ersten 30–40 % Viewport-Höhe** auf `/mein-profil`. Kein Disclaimer-Block, kein Pilot-Badge, kein Banner darf vor IdentityHero gerendert werden. Disclaimer leben unten in `<details>` innerhalb des Vollständiges-Datenprofil-Wrappers.

_Test_: Playwright-Test `tests/a11y/mein-profil-hero-first-paint.spec.ts` setzt Viewport 1280 × 800, navigiert zu `/mein-profil`, sammelt `boundingBox()` für `[data-testid="identity-hero"]`, assertet `box.y < 60` (Top-Topbar-Höhe) und `box.y + box.height > 240` (= 30 % von 800). Plus DOM-Assertion: erstes `<h1>` ist Persona-Name, nicht Disclaimer-Heading.

---

**HL-MP-2**: Mein-Wallet-Card-Stack folgt strikt dem Page-Theme (cream + warm-white Cards). Kein hardkodierter Dark-Override pro Karte. Erweitert HL-DS-12 auf alle Wallet-Cards (nicht nur mDL).

_Test_: Vitest `tests/unit/mein-profil-wallet-stack-page-theme.test.ts` rendert `<WalletCardStack>` mit allen 3 Persona-Daten, assertet, dass **keine** Card ein `data-force-theme`-Attribut, ein hartkodiertes `bg-zinc-9*0`, `bg-slate-9*0`, `bg-black`, oder `bg-gray-9*0` trägt. Plus grep-deny:

```bash
grep -rEn "(bg-(zinc|gray|slate|black)-9(0|5)0|data-force-theme)" src/components/mein-profil/ || true
# Must produce 0 hits.
```

---

**HL-MP-3**: `<FamilyPanel>` rendert für Anna und Mehmet einen **sichtbaren Empty-State** (nicht-versteckt) mit Text "Sie verwalten nur Ihr eigenes Profil." + CTA "+ Familienmitglied hinzufügen". Für Schmidt rendert die Avatar-Reihe mit Lena + Sophie (Sophie minderjährig → Vormundschaft-Badge).

_Test_: Vitest `tests/unit/mein-profil-family-panel-empty-state.test.ts` rendert Panel mit `persona = anna-petrov-without-family`-Variante, assertet, dass `[data-testid="family-panel-empty"]` sichtbar ist und Text aus `mein_profil.family.empty_state.headline` enthält. Plus zweiter Sub-Test mit Schmidt-Persona: `[data-testid="family-member-card"]` zählt ≥ 2.

Hinweis: Anna in der aktuellen `personas.json` HAT eine Familie (Tobias + Lev), daher rendert Anna die voll-Variante. Für den Demo-Empty-State braucht der Test eine Persona-Variante ohne Familie (`familie.partner` undef + `familie.kinder` leer). Frontend-coder konsumiert `persona.familie` direkt; Empty-State greift, wenn `partner === undefined && kinder.length === 0`. Mehmet (kein Partner, 1 Kind) rendert die voll-Variante mit nur dem Kind.

---

**HL-MP-4**: `<NeuigkeitenFeed>` rendert **max 3** Items, kuratiert (nicht Inbox-Replikat). Algorithmus, deterministisch:
1. Slot 1: dringendste offene Frist aus `getLetters()` mit `required_action !== undefined` und `frist < 7d` ab `now`. Wenn keine: Slot bleibt leer.
2. Slot 2: laufender Vorgang aus `getVorgaenge({ status: 'in_pruefung' })`, sortiert nach `letzte_aktivitaet desc`. Wenn keine: Slot bleibt leer.
3. Slot 3: jüngster ungelesener Brief aus `getLetters({ gelesen: false })` sortiert nach `eingegangen_am desc`, **exklusive** des Briefs aus Slot 1. Wenn keine: Slot bleibt leer.
Bei < 3 erfüllten Slots werden weniger Cards gerendert. Bei 0 erfüllten Slots: Empty-State-Hinweis "Keine offenen Aufgaben" (1 Card-Slot, kein Skeleton).

_Test_: Vitest `tests/unit/mein-profil-neuigkeiten-max-3.test.ts` mockt `getLetters` mit 10 ungelesenen Briefen + `getVorgaenge` mit 5 in_pruefung, assertet `[data-testid="neuigkeiten-card"]` rendert exakt 3. Zweiter Sub-Test mit nur-Vorgang-keine-Briefe: assertet exakt 1 Card + Empty-Slot-Hinweis fehlt. Dritter Sub-Test ohne Daten: assertet Empty-State `mein_profil.neuigkeiten.empty_state` sichtbar.

---

**HL-MP-5**: `<DatenschutzPreview>` ist ein **3-Zeilen-Teaser** (Zugriffszahl-30d + Letzte-Übermittlung + CTA), **kein** voller Datenschutz-Cockpit. CTA navigiert zu `/stammdaten#aktivitaetsprotokoll` (= bestehender Vollständiges-Aktivitätsprotokoll-Block aus V1.2 Spec § 6.11). Cockpit-Full-View ist Achse C, separate Phase.

_Test_: Vitest `tests/unit/mein-profil-datenschutz-preview-shape.test.ts` rendert Preview, assertet, dass exakt 3 `<p>`-Childs unter `[data-testid="datenschutz-preview"]` existieren (Zugriffszahl + Letzte-Übermittlung + CTA-Link). Plus assertet, dass kein `<table>`, kein `<ul role="list">` mit > 3 Items, kein `RichtungSwitch` darin gerendert wird.

---

**HL-MP-6**: Alle Hard-Lines V1.0–V1.5.1 sowie HL-MOB-1..14 und HL-DS-1..14 bleiben **unangetastet**. Insbesondere:
- ARF v2.0 verbatim disclaimer (V1.0)
- FAER on-demand TTL ≤ 300s (HL-MOB-11)
- mDL closed-list 14 ISO/IEC 18013-5 Annex-B-Attribute (HL-MOB-6/12)
- Halter-Adresse Ban-List (HL-MOB-13)
- "§ 15 FZV / Pre-Fill der i-Kfz-Adressänderung / unverzüglich" Wording (HL-MOB-14)
- `--muted-foreground` Light ≥ 5.63:1 / Dark ≥ 5.53:1 (V1.5.1)
- `text-amber-950` auf 5 Sites (V1.3)
- NormZitatSpan-Lookup intakt (V1.0–V1.3)
- Religion-Consent-Pattern, Pflegegrad-Consent-Pattern, IBAN-Push-Modal (V1.0–V1.2)

_Test_: Die bestehenden Vitest-Suiten in `tests/unit/stammdaten-v1*` und `tests/unit/design-system-*` müssen ohne Modifikation grün bleiben. CI-Gate: `pnpm test:unit` zeigt 575+ Tests grün; **kein** bestehender Test darf für diese Spec geändert werden. Wenn ein V1.x-Test fehlschlägt, ist die HL-MP-6-Pflicht verletzt — code-reviewer blockiert merge.

---

**HL-MP-7**: Source Serif 4 wird ausschließlich für **H1 + H2 + Hero-Headlines** verwendet (`<h1 className="font-serif-source">`, `<h2 className="font-serif-source">`, IdentityHero-Name). Body-Text, Buttons, Form-Inputs, Labels, Badges, Counters, Aktenzeichen, Daten — alles bleibt Source Sans 3.

_Test_: Vitest `tests/unit/mein-profil-serif-headings-only.test.ts` rendert `<MeinProfilPage>` mit Schmidt-Persona, sammelt alle Elemente mit Class `font-serif-source` (oder `font-[var(--font-serif-source)]`), assertet, dass jedes davon ein `<h1>` oder `<h2>` ist (per `element.tagName`). Plus grep-deny:

```bash
grep -rEn "font-serif-source" src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/badge.tsx || true
# Must produce 0 hits.
```

---

**HL-MP-8**: Persona-Avatar-Pfade folgen verbindlich dem Schema `/personas/<persona-id>.jpg` (bzw. .png/.webp — OQ-2). Persona-IDs sind die aus `personas.json`: `anna-petrov`, `markus-schmidt`, `mehmet-yildiz`. Drei Bilder müssen physisch im Repo unter `public/personas/` existieren. Bei fehlender Datei rendert IdentityHero einen Initials-on-Gradient-Fallback (Vorname + Nachname-Initialen) — kein 404, kein broken-image-Icon.

_Test_: Vitest `tests/unit/mein-profil-avatar-path.test.ts` rendert `<IdentityHero>` mit jeder der 3 Personas, assertet `<img>` (next/image) hat `src` enthaltend `/personas/anna-petrov.` / `/personas/markus-schmidt.` / `/personas/mehmet-yildiz.`. Plus Playwright-Test `tests/a11y/mein-profil-avatar-present.spec.ts` macht HTTP-HEAD-Request auf die drei URLs, assertet 200 OK. Fallback-Sub-Test: render mit unbekannter `persona.id`, assertet SVG-Initials-Element statt `<img>`.

---

## 3. Token-Additive für Mein Profil

Die folgenden Tokens leben in `src/app/globals.css` **additiv** zu den Phase-5a/5b-Tokens (`--shadow-card`, `--color-accent`, etc.). Keine Renames, keine Überschreibungen. Alle Tokens haben Prefix `--mp-*` zur klaren Trennung von der V1.0–V1.3-Token-Bibliothek.

### 3.1 Cream-Backgrounds + Card-Surfaces

```css
:root {
  --mp-bg-page: oklch(0.98 0.005 80);        /* cream, off-white */
  --mp-bg-card: oklch(1 0 0);                 /* pure white card */
  --mp-bg-card-warm: oklch(0.99 0.008 80);   /* slight warm card */
  --mp-border-card: oklch(0.92 0.005 80);
  --mp-border-card-strong: oklch(0.85 0.005 80);
  --mp-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.04);
}

.dark {
  --mp-bg-page: oklch(0.15 0.005 80);
  --mp-bg-card: oklch(0.21 0.005 80);
  --mp-bg-card-warm: oklch(0.20 0.008 80);
  --mp-border-card: oklch(0.28 0.005 80);
  --mp-border-card-strong: oklch(0.36 0.005 80);
  --mp-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.18), 0 8px 24px rgba(0, 0, 0, 0.24);
}
```

### 3.2 Border-Radius (Apple-Wallet-coded)

```css
:root {
  --mp-radius-card: 14px;        /* default Card-Radius im Profil */
  --mp-radius-card-large: 20px;  /* IdentityHero-Card + Wallet-Stack-Cards */
}
```

### 3.3 Typography

```css
:root {
  --font-serif-source: "Source Serif 4", Charter, "Iowan Old Style", Georgia, serif;
  --mp-text-headline-serif: clamp(2rem, 4vw, 3rem);  /* H1 IdentityHero */
  --mp-text-section-serif: clamp(1.25rem, 2vw, 1.625rem);  /* H2 Sektionen */
  --mp-hero-avatar-size: clamp(120px, 12vw, 180px);
}
```

`next/font` lädt Source Serif 4 in `src/app/layout.tsx` analog zur bestehenden Source Sans 3-Konfig; CSS-Variable `--font-serif-source` wird auf `<html>` gesetzt. Frontend-coder importiert per `import { Source_Serif_4 } from 'next/font/google'`, `subsets: ['latin']`, `weight: ['400','600','700']`, `display: 'swap'`, `variable: '--font-serif-source'`.

### 3.4 Persona-Akzent-Hue (OQ-1: **REJECTED**)

Architect-Entscheidung: **kein `--mp-persona-accent`-Token**. Begründung: würde HL-DS-3 ("1 chromatischer Akzent") brechen. Die warm-fintech-Aesthetik kommt rein aus Background-Cream + Border + Serif-Type, nicht aus persona-tinted Akzentfarben. Persona-Differenzierung läuft über Avatar-Foto + Name + Status-Statement, nicht über Hue. Wenn Phase MP-2 (Visual-Polish) emotional zu kalt wirkt, kann ein zusätzlicher neutraler warm-tone (`oklch(0.95 0.012 70)` für Hover) addiert werden — aber **nicht persona-koppeln**.

---

## 4. Komponenten-Inventar

Alle Pfade neu unter `src/components/mein-profil/` (`<NEW>`). Bestehende `src/components/stammdaten/*` werden **nicht** modifiziert (Ausnahme: `<details>`-Wrapper in `VollstaendigesDatenprofil` ruft `<StammdatenView>` als bestehende Client-Komponente auf).

### 4.1 `<IdentityHero>` — `src/components/mein-profil/IdentityHero.tsx` `<NEW>`

**Server or client**: Client (`'use client'`) — wegen `useTranslations()` und `formatDistanceToNow`-Hydration-Sicherung analog zu V1 `<StammdatenHero>`.

**Props**:
```ts
interface IdentityHeroProps {
  persona: Persona;
  /** Letzte Übermittlung aus getUebermittlungsLog (top entry). Null → "noch keine". */
  letzteUebermittlung: UebermittlungsLogEntry | null;
  behoerdenById: Record<string, Behoerde>;
  /** Anzahl Register — gleiche Heuristik wie V1 `countRegisters(stammdaten)`. */
  registerCount: number;
  /** SSR-stable now ISO für formatDistanceToNow. */
  nowIso: string;
}
```

**Inhalt** (top-down):
1. `<img>` (next/image, priority, sizes `(max-width: 640px) 120px, 180px`, alt = vollständiger Name) — runder Rahmen `rounded-full`, `--mp-hero-avatar-size`.
2. `<h1 className="font-[var(--font-serif-source)] text-[var(--mp-text-headline-serif)]">` — `${persona.vorname} ${persona.nachname}`.
3. Geburts-Zeile (`<p>`): "Geboren am {formatIsoDe(persona.geburtsdatum)} in {persona.geburtsort ?? '—'}" + "wohnhaft in {persona.adresse.ort}".
4. Status-Statement (`<p>`) — computed:
   - Anna: "Bürgerin mit Aufenthaltstitel § 18g AufenthG (Blue Card EU), wohnhaft in Berlin"
   - Schmidt: "Bürger der Bundesrepublik Deutschland, verheiratet, Vater von {kinder[0]?.vorname}"
   - Mehmet: "Bürger mit Aufenthaltstitel § 21 AufenthG, selbstständig in Köln seit {formatYear(persona.beschaeftigung.beginn)}"
   Die computed-Funktion `computeStatusStatement(persona)` lebt in `src/lib/utils/persona-status.ts` `<NEW>` und ist deterministisch (keine Random, keine Date.now). Sie verwendet i18n-Templates (siehe § 7).
5. Verifizierungs-Stempel-Zeile (`<p className="text-sm text-muted-foreground">`):
   "Verifiziert in {registerCount} Registern · Letzte Übermittlung vor {formatDistanceToNow(letzteUebermittlung.timestamp)} von {behoerdenById[letzteUebermittlung.absender_behoerde_id]?.name_de}"

**Layout**: Flex-column, items-center auf Mobile, items-start auf `sm:`. Avatar links auf `sm:`, oben auf Mobile. Atemraum: `gap-6` zwischen Avatar und Heading-Stack.

**i18n-Keys**:
- `mein_profil.hero.status_statement.anna_template` — "Bürgerin mit Aufenthaltstitel {norm}, wohnhaft in {ort}"
- `mein_profil.hero.status_statement.schmidt_template` — "Bürger der Bundesrepublik Deutschland, verheiratet, Vater von {kind}"
- `mein_profil.hero.status_statement.mehmet_template` — "Bürger mit Aufenthaltstitel {norm}, selbstständig in {ort} seit {jahr}"
- `mein_profil.hero.status_statement.generic_de_template` — "Bürger:in der Bundesrepublik Deutschland, wohnhaft in {ort}" (Fallback)
- `mein_profil.hero.geboren_template` — "Geboren am {datum} in {ort}"
- `mein_profil.hero.verified_in_registers` — "Verifiziert in {count} Registern"
- `mein_profil.hero.last_transmission_template` — "Letzte Übermittlung vor {dauer} von {absender}"
- `mein_profil.hero.no_transmissions_yet` — "Noch keine Behörden-Übermittlung"
- `mein_profil.hero.avatar_fallback_alt_template` — "Initialen {initials}"

**a11y-Notes**:
- `<h1>` ist der einzige H1 auf der Seite (Page-Landmark)
- Avatar: `<img alt={`${vorname} ${nachname}`} />` (kein decorative)
- Status-Statement-`<p>` hat ausreichend Kontrast (`text-foreground`, nicht muted)
- Verifizierungs-Stempel ist `text-muted-foreground` → muss die V1.5.1-Floor ≥ 5.63:1 einhalten (passiert automatisch via Token)
- Bei fehlender Avatar-Datei: Fallback-SVG-Initials hat `role="img"` + `aria-label={t('mein_profil.hero.avatar_fallback_alt_template', { initials })}`

---

### 4.2 `<WalletCardStack>` — `src/components/mein-profil/WalletCardStack.tsx` `<NEW>`

**Server or client**: Client (interaktive Klicks).

**Props**:
```ts
interface WalletCardStackProps {
  persona: Persona;
  /** Aus api.getMdlAttestation(persona.id) — V1 mDL-Status. */
  mdl: MdlAttestationMock | null;
  /** Aus api.getWalletAttestations(persona.id) — 3 fixe Drittanbieter (V1). */
  walletAttestations: WalletAttestation[];
}
```

**Inhalt**: Vertikal gestapelter Stack von 3–5 Cards mit visuellem Overlap (CSS-only, kein 3D, kein perspective-transform):
- Cards überlappen vertikal um `-mt-4` (ab Card 2 abwärts), so dass nur ~75 % jeder unteren Card sichtbar ist
- Hover/Focus auf Card N: Cards N+1..M scrollen weiter runter via CSS-transition (`translate-y-2`), so dass N voll sichtbar wird
- Click auf Card → öffnet Vollbild-Modal `<WalletCardDetailModal>` mit Persona-spezifischem Card-Inhalt + QR-Block-Placeholder + 1 Button "Schließen"

**Card-Inventar pro Persona** (deterministisch aus persona.\* gelesen):

| Persona | Card 1 | Card 2 | Card 3 | Card 4 | Card 5 |
|---|---|---|---|---|---|
| Anna | Personalausweis | mDL (Mock-Preview) | Aufenthaltstitel § 18g | AOK Nordost | — |
| Schmidt | Personalausweis | mDL (Mock-Preview) | TK Familienversicherung | KFZ-Halter HH-SC 142 | (CTA "+ Eintrag scannen") |
| Mehmet | Personalausweis | eAT (§ 21 AufenthG) | mDL (Mock-Preview) | Barmer GKV | KFZ-Halter K-VR 8088E |

Jede Card ist ein `<button>` (für Tastatur-Tabbability), nicht `<article>` — analog `<button aria-haspopup="dialog">`. Card visualisiert: Icon (lucide) + Titel (Source Sans 3, font-semibold) + sekundäre Zeile (Nummer/Aktenzeichen masked oder Issued-By). Hintergrund: `bg-[var(--mp-bg-card)]` (Page-Theme-konform, HL-MP-2).

**WalletCardDetailModal** (`src/components/mein-profil/WalletCardDetailModal.tsx` `<NEW>`):
- Rendert per `<Dialog>` aus `src/components/ui/dialog`
- Inhalt: Card-Titel + Card-Subtitel + 4–6 Detail-Felder (z. B. PA-Nr / Gültig bis / Ausgestellt von / [MOCK]-Watermark) + Mock-QR-Placeholder (graue Box `<div className="aspect-square bg-muted">` mit Text "QR-Verifizier-Mock") + "Schließen"-Button
- Hard-Line: Kein echter QR-Generator, kein EUDI-Export, kein Verify-API-Call (out of scope § 11)
- ESC + Click-Outside schließt; Focus-Restoration auf Trigger-Button

**i18n-Keys**:
- `mein_profil.wallet.title` — "Mein Wallet"
- `mein_profil.wallet.add_document_cta` — "+ Eintrag scannen oder hinzufügen"
- `mein_profil.wallet.card.personalausweis.label` — "Personalausweis"
- `mein_profil.wallet.card.personalausweis.subtitle_template` — "{nummer} · gültig bis {datum}"
- `mein_profil.wallet.card.mdl.label` — "Führerschein (mobil)"
- `mein_profil.wallet.card.mdl.subtitle_not_issued` — "Vorschau · noch nicht ausgestellt"
- `mein_profil.wallet.card.eat.label` — "Aufenthaltstitel"
- `mein_profil.wallet.card.eat.subtitle_template` — "{norm} · gültig bis {datum}"
- `mein_profil.wallet.card.aufenthaltstitel.label` — "Aufenthaltstitel"
- `mein_profil.wallet.card.aufenthaltstitel.subtitle_template` — "{norm} · gültig bis {datum}"
- `mein_profil.wallet.card.gkv.label` — "Krankenversicherung"
- `mein_profil.wallet.card.gkv.subtitle_template` — "{traeger} · {kvnr_masked}"
- `mein_profil.wallet.card.kfz.label` — "KFZ-Halter"
- `mein_profil.wallet.card.kfz.subtitle_template` — "{kennzeichen} · {marke} {modell}"
- `mein_profil.wallet.modal.close_cta` — "Schließen"
- `mein_profil.wallet.modal.qr_placeholder_caption` — "QR-Code (Mock)"
- `mein_profil.wallet.modal.mock_watermark` — "[MOCK]"

**a11y-Notes**:
- Jede Card ist ein `<button>` mit accessible name = `mein_profil.wallet.card.<typ>.label`
- Stack-Container ist `<section aria-labelledby="wallet-stack-heading">` mit `<h2 id="wallet-stack-heading">` für Mein Wallet
- Modal: trap-focus, ESC, aria-modal, aria-labelledby auf Modal-Heading
- Overlap-Animation respektiert `prefers-reduced-motion` (siehe HL-DS-4) — fallback: kein translate, statt dessen volle Höhe pro Card

---

### 4.3 `<FamilyPanel>` — `src/components/mein-profil/FamilyPanel.tsx` `<NEW>`

**Server or client**: Client (Add-CTA-Hover-State; minimaler Client-Footprint).

**Props**:
```ts
interface FamilyPanelProps {
  persona: Persona;
}
```

**Logik**:
- Wenn `persona.familie.partner === undefined && persona.familie.kinder.length === 0`:
  Render Empty-State: Heading "Meine Familie" + `<p>` "Sie verwalten nur Ihr eigenes Profil." + `<button>` "+ Familienmitglied hinzufügen" (Placeholder, kein Handler — `onClick={() => toast(...)}` mit i18n-Toast "Funktion in Planung").
- Sonst: Horizontale Avatare-Row (overflow-x-auto auf Mobile):
  - Wenn `partner` vorhanden: Avatar-Card mit Partner-Name, Beziehungs-Badge ("Ehepartner:in" wenn `persona.eheschliessung` vorhanden, sonst "Lebenspartner:in"), kein eigener Avatar-Foto (Fallback Initials-on-Gradient — Partner haben keine Datei in `public/personas/`)
  - Pro Kind: Avatar-Card mit Kind-Name, Beziehungs-Badge "Kind". Wenn `kind.geburtsdatum` impliziert `< 18 Jahre` (zum `nowIso`): zusätzliches Badge "Sorgeberechtigt" (kein "Vormundschaft" — rechtlich falsch; "Vormundschaft" gilt nur, wenn beide Eltern ausgefallen sind).

**i18n-Keys**:
- `mein_profil.family.title` — "Meine Familie"
- `mein_profil.family.empty_state.headline` — "Sie verwalten nur Ihr eigenes Profil."
- `mein_profil.family.empty_state.cta_add` — "+ Familienmitglied hinzufügen"
- `mein_profil.family.empty_state.cta_toast` — "Funktion in Vorbereitung — wird in einer späteren Phase ausgebaut."
- `mein_profil.family.relation.ehepartner` — "Ehepartner:in"
- `mein_profil.family.relation.lebenspartner` — "Lebenspartner:in"
- `mein_profil.family.relation.kind` — "Kind"
- `mein_profil.family.badge.sorgeberechtigt` — "Sorgeberechtigt"
- `mein_profil.family.avatar_fallback_alt_template` — "Initialen {initials}"

**a11y-Notes**:
- `<section aria-labelledby="family-heading">` mit `<h2 id="family-heading">`
- Empty-State + Voll-Variante beide unter gleichem `<section>` (keine `display: none` auf der Section selbst → Screen-Reader announcen den Empty-Hinweis statt einer leeren Region)
- Avatare-Row: `<ul role="list">` mit `<li>` pro Member, Tab-Order = visuelle Reihenfolge

---

### 4.4 `<NeuigkeitenFeed>` — `src/components/mein-profil/NeuigkeitenFeed.tsx` `<NEW>`

**Server or client**: Client (Konsumiert `api.getLetters`, `api.getVorgaenge` via `useEffect` — analog zu `<StammdatenView>` Pattern).

**Props**:
```ts
interface NeuigkeitenFeedProps {
  persona: Persona;
  letters: Letter[];           // vorgeladen in Page-Wrapper
  vorgaenge: Vorgang[];        // vorgeladen
  nowIso: string;              // SSR-stable
}
```

**Algorithmus** (deterministisch, siehe HL-MP-4):

```ts
type Slot =
  | { typ: 'frist'; letter: Letter }
  | { typ: 'vorgang'; vorgang: Vorgang }
  | { typ: 'new_letter'; letter: Letter };

function computeNeuigkeiten(letters, vorgaenge, nowIso): Slot[] {
  const slots: Slot[] = [];
  const now = parseISO(nowIso).getTime();
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

  // Slot 1: dringendste Frist < 7d
  const fristLetters = letters
    .filter(l => l.required_action && l.frist)
    .map(l => ({ l, deltaMs: parseISO(l.frist!).getTime() - now }))
    .filter(x => x.deltaMs >= 0 && x.deltaMs < SEVEN_DAYS)
    .sort((a, b) => a.deltaMs - b.deltaMs);
  if (fristLetters[0]) slots.push({ typ: 'frist', letter: fristLetters[0].l });

  // Slot 2: laufender Vorgang
  const laufend = vorgaenge
    .filter(v => v.status === 'in_pruefung')
    .sort((a, b) => parseISO(b.letzte_aktivitaet ?? b.erstellt_am).getTime() - parseISO(a.letzte_aktivitaet ?? a.erstellt_am).getTime());
  if (laufend[0]) slots.push({ typ: 'vorgang', vorgang: laufend[0] });

  // Slot 3: jüngster ungelesener Brief, exkl. Slot 1
  const slot1Id = slots[0]?.typ === 'frist' ? slots[0].letter.id : null;
  const unread = letters
    .filter(l => l.gelesen === false && l.id !== slot1Id)
    .sort((a, b) => parseISO(b.eingegangen_am).getTime() - parseISO(a.eingegangen_am).getTime());
  if (unread[0]) slots.push({ typ: 'new_letter', letter: unread[0] });

  return slots;
}
```

Wenn `slots.length === 0`: Empty-State-Card mit Text aus `mein_profil.neuigkeiten.empty_state`.

**Card-Inhalt pro Typ**:
- `frist`: rotes Status-Dot · Titel "Frist in {tage} Tagen" · Absender-Behörde-Name · Betreff-Snippet · Button "Prüfen" → `/posteingang/{letter.id}`
- `vorgang`: graues Status-Dot · Titel "Vorgang läuft — {beteiligte_count} Behörden" · Progress-Hint ("{erledigt}/{gesamt} Schritte" oder Fortschritts-%) · Button "Live ansehen" → `/vorgaenge/{vorgang.id}`
- `new_letter`: graues Status-Dot · Titel "{absender_name} — neu" · Betreff-Snippet · Button "Lesen" → `/posteingang/{letter.id}`

**i18n-Keys**:
- `mein_profil.neuigkeiten.title` — "Wichtig"
- `mein_profil.neuigkeiten.empty_state` — "Keine offenen Aufgaben."
- `mein_profil.neuigkeiten.frist_card.title_template` — "Frist in {tage} Tagen"
- `mein_profil.neuigkeiten.frist_card.cta` — "Prüfen"
- `mein_profil.neuigkeiten.vorgang_card.title_template` — "Vorgang läuft — {count} Behörden"
- `mein_profil.neuigkeiten.vorgang_card.progress_template` — "{erledigt} von {gesamt} Schritten erledigt"
- `mein_profil.neuigkeiten.vorgang_card.cta` — "Live ansehen"
- `mein_profil.neuigkeiten.new_letter_card.title_template` — "{absender} — neu"
- `mein_profil.neuigkeiten.new_letter_card.cta` — "Lesen"

**a11y-Notes**:
- `<section aria-labelledby="neuigkeiten-heading">` mit `<h2 id="neuigkeiten-heading">`
- Jede Card ist `<article>` mit innerem `<a>`-CTA (kein outer-button, weil Navigation, nicht Toggle)
- Status-Dot ist dekorativ (`aria-hidden="true"`); Frist-Dringlichkeit wird **textuell** via "Frist in {tage} Tagen" kommuniziert, nicht nur per Farbe (BITV 2.0 § 1.4.1 use-of-color)

---

### 4.5 `<DatenschutzPreview>` — `src/components/mein-profil/DatenschutzPreview.tsx` `<NEW>`

**Server or client**: Client (`useTranslations`).

**Props**:
```ts
interface DatenschutzPreviewProps {
  /** Aus log.filter(e => e.timestamp innerhalb letzter 30d).length. */
  accessCount30d: number;
  /** Top-Eintrag aus log. */
  lastAccess: UebermittlungsLogEntry | null;
  behoerdenById: Record<string, Behoerde>;
  nowIso: string;
}
```

**Inhalt** (genau 3 `<p>`-Children, HL-MP-5):
1. `<p>` "{count} Datenzugriffe in den letzten 30 Tagen" — Source Sans 3, font-semibold, größer (text-base)
2. `<p>` "Letzte Übermittlung: {behoerde}, vor {dauer}" — text-sm, muted
3. `<a>` (als CTA-Link styled) "Detail ansehen →" → `href="/stammdaten#aktivitaetsprotokoll"` (Anchor-Link auf den bestehenden V1.2 Aktivitätsprotokoll-Block im wrapped `<StammdatenView>`)

**Layout**: `rounded-[var(--mp-radius-card)] border border-[var(--mp-border-card)] bg-[var(--mp-bg-card)] p-5`. Heading "Datenschutz" als `<h2>` Serif.

**i18n-Keys**:
- `mein_profil.datenschutz.title` — "Datenschutz"
- `mein_profil.datenschutz.access_count_template` — "{count} Datenzugriffe in den letzten 30 Tagen"
- `mein_profil.datenschutz.last_access_template` — "Letzte Übermittlung: {behoerde}, vor {dauer}"
- `mein_profil.datenschutz.no_access_yet` — "Noch keine Zugriffe protokolliert"
- `mein_profil.datenschutz.cta` — "Detail ansehen →"

**a11y-Notes**:
- `<section aria-labelledby="datenschutz-preview-heading">`
- Anchor-Link verwendet `href` (kein `onClick` JS-Navigation), so dass Right-Click + Mittelklick + Tab-Open funktionieren

---

### 4.6 `<VollstaendigesDatenprofilCollapsed>` — `src/components/mein-profil/VollstaendigesDatenprofil.tsx` `<NEW>`

**Server or client**: Client (renders `<StammdatenView>`, das selbst Client ist).

**Props**:
```ts
interface VollstaendigesDatenprofilProps {
  nowIso: string;
}
```

**Inhalt**:
```tsx
<details id="daten" open={false} className="rounded-[var(--mp-radius-card)] border border-[var(--mp-border-card)] bg-[var(--mp-bg-card-warm)] p-5">
  <summary className="cursor-pointer list-none flex items-center gap-2">
    <ChevronDown className="size-4" aria-hidden="true" />
    <span className="font-serif-source text-[var(--mp-text-section-serif)]">
      {t('mein_profil.vollstaendiges_datenprofil.summary_label')}
    </span>
  </summary>
  <p className="mt-2 text-sm text-muted-foreground">
    {t('mein_profil.vollstaendiges_datenprofil.hint')}
  </p>
  <div className="mt-6">
    <StammdatenView nowIso={nowIso} />
  </div>
</details>
```

**Verhalten**:
- `<details open={false}>` per Default — User muss explizit aufklappen
- Wenn URL-Hash `#daten` oder `#aktivitaetsprotokoll` beim Initial-Mount: `useEffect` setzt `open={true}` und scrollt zur Anchor-Ziel-ID (DatenschutzPreview-CTA navigiert via `#aktivitaetsprotokoll`)
- Wrappt `<StammdatenView>` 1:1 — keine Modifikation an der Component selbst (HL-MP-6)

**i18n-Keys**:
- `mein_profil.vollstaendiges_datenprofil.summary_label` — "Vollständiges Datenprofil"
- `mein_profil.vollstaendiges_datenprofil.hint` — "Alle 7+ Stammdaten-Sektionen aus V1.0–V1.3 (Identität, Anschrift, Familie, Altersvorsorge, Krankenversicherung & Pflege, Mobilität, Dokumente, Sperren & Einstellungen). Klicken Sie auf eine Sektion, um sie zu öffnen."

**a11y-Notes**:
- Native `<details>` ist a11y-konform out-of-the-box
- Summary muss focus-ring haben (existiert via tailwind base)
- Auto-Expand-via-Hash darf nicht beim jeden Re-Render erneut auslösen — `useEffect` mit `[]` Dependency-Array nur initial

---

## 5. Page-Layout — `/mein-profil`

**Datei**: `src/app/(app)/mein-profil/page.tsx` `<NEW>` (Server Component) + `src/app/(app)/mein-profil/MeinProfilView.tsx` `<NEW>` (Client Component, datenladend).

**page.tsx** (Server Component):
```tsx
import { MeinProfilView } from './MeinProfilView';

export default function MeinProfilPage() {
  const nowIso = new Date().toISOString();
  return <MeinProfilView nowIso={nowIso} />;
}
```

**MeinProfilView.tsx** (Client Component, lädt parallel die 6 benötigten Daten via `api.getProfile`, `api.getBehoerden`, `api.getLetters`, `api.getVorgaenge`, `api.getMdlAttestation`, `api.getWalletAttestations`, `api.getUebermittlungsLog`):

```
┌─ Topbar (existing layout) ──────────────────────┐
│                                                 │
├─ <main className="bg-[var(--mp-bg-page)]"> ─────┤
│  <div className="mx-auto max-w-5xl px-4 py-8"> │
│                                                 │
│    <IdentityHero ... />            (full-width) │
│                                                 │
│    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
│      <WalletCardStack ... />                    │
│      <FamilyPanel ... />                        │
│    </div>                                       │
│                                                 │
│    <NeuigkeitenFeed ... />        (single col, mt-10)
│                                                 │
│    <DatenschutzPreview ... />     (single col, mt-6)
│                                                 │
│    <VollstaendigesDatenprofil .../> (mt-10)     │
│                                                 │
│  </div>                                         │
│ </main>                                         │
└─────────────────────────────────────────────────┘
```

**Mobile (< 640px)**:
- Alles vertikal stacked, `grid-cols-1`
- Hero behält 30 % Viewport-Höhe (HL-MP-1)
- WalletCardStack: vertikale Liste (kein horizontal-scroll — die natürliche Stapelung ist ohnehin vertikal)

**Sidebar-Link** (in `src/components/layout/Sidebar.tsx` bestehend):
- Existing Stammdaten-Link wird **umbenannt** auf "Mein Profil" und linkt auf `/mein-profil`
- Icon bleibt (lucide `User`)
- i18n-Key `layout.sidebar.mein_profil` (statt `layout.sidebar.stammdaten`); altes Key bleibt zur Sicherheit im JSON, wird aber nicht mehr referenziert

**Redirect** für `/stammdaten`:
- Datei `src/app/(app)/stammdaten/page.tsx` wird auf folgendes minimal-Patch reduziert:
```tsx
import { redirect } from 'next/navigation';

export default function StammdatenLegacyPage() {
  redirect('/mein-profil');
}
```
- `layout.tsx` unter `(app)/stammdaten/` bleibt unverändert (Next-Routing greift)
- Anchor-Links wie `/stammdaten#aktivitaetsprotokoll` werden vom Next-Redirect bewahrt (HTTP 308 erhält Hash im Browser)

---

## 6. Daten-Shape-Erweiterungen

**Additiv, no breaking**. Persona-Type bleibt unverändert; Computed-Helpers leben in einem neuen Util-Modul.

### 6.1 `computeStatusStatement(persona: Persona, t: Translator): string`

Lebt in `src/lib/utils/persona-status.ts` `<NEW>`:

```ts
export function computeStatusStatement(persona: Persona, t: Translator): string {
  // 1. Drittstaatsangehörige mit Aufenthaltstitel
  if (persona.aufenthaltstitel?.norm) {
    // Mehmet (selbstständig)
    if (persona.beschaeftigung?.typ === 'selbstaendig') {
      const jahr = persona.beschaeftigung.beginn?.slice(0, 4) ?? '—';
      return t('mein_profil.hero.status_statement.mehmet_template', {
        norm: persona.aufenthaltstitel.norm,
        ort: persona.adresse.ort,
        jahr,
      });
    }
    // Anna (angestellt mit Aufenthaltstitel)
    return t('mein_profil.hero.status_statement.anna_template', {
      norm: persona.aufenthaltstitel.norm,
      ort: persona.adresse.ort,
    });
  }
  // 2. Deutsche Persona mit Familie (Schmidt)
  if (persona.familie?.kinder.length > 0 && persona.eheschliessung) {
    return t('mein_profil.hero.status_statement.schmidt_template', {
      kind: persona.familie.kinder[0].vorname,
    });
  }
  // 3. Fallback
  return t('mein_profil.hero.status_statement.generic_de_template', {
    ort: persona.adresse.ort,
  });
}
```

Deterministische Output-Tests in `tests/unit/mein-profil-status-statement.test.ts`.

### 6.2 `getAvatarPath(persona: Persona): string`

```ts
export function getAvatarPath(persona: Persona): string {
  return `/personas/${persona.id}.jpg`;
}
```

Lebt im gleichen `persona-status.ts`-Modul.

### 6.3 Mock-Backend-Additionen

**Keine.** Die 6 benötigten API-Calls existieren bereits:
- `api.getProfile()` — V1.0
- `api.getBehoerden()` — V1.0
- `api.getLetters({ ungelesen?, frist_lt? })` — V1.0/V1.5 (kein Filter-Param-Erweiterung nötig; Frontend filtert client-side)
- `api.getVorgaenge({ status? })` — V1.0
- `api.getMdlAttestation(personaId)` — V1.3
- `api.getWalletAttestations(personaId)` — V1.0
- `api.getUebermittlungsLog(personaId, { limit })` — V1.0

**Keine** neuen Seed-Daten. Bestehende Personas (Anna mit Familie, Schmidt mit Familie, Mehmet mit 1 Kind) decken die Demo-Cases ab. Für den HL-MP-3-Empty-State-Test wird in der Test-File eine Persona-Variante mit `familie.partner = undefined; familie.kinder = []` per `structuredClone` erzeugt — nicht im Seed-File geändert.

### 6.4 Persistence-Keys

**Keine neuen Keys.** Mein Profil ist eine reine View-Schicht über bestehende Persona/Stammdaten-Daten. Kein localStorage-Write.

---

## 7. i18n-Keys-Inventar (DE source-of-truth)

Insgesamt ~42 neue Keys. Alle leben unter dem Top-Level-Namespace `mein_profil.*` in `src/lib/i18n/locales/de.json` und müssen vom i18n-localizer für alle 5 Non-DE-Locales (EN, RU, UK, AR, TR) übernommen werden.

```json
{
  "mein_profil": {
    "page": {
      "title": "Mein Profil",
      "loading": "Wird geladen …",
      "error_load": "Profil konnte nicht geladen werden.",
      "error_retry": "Erneut versuchen"
    },
    "hero": {
      "status_statement": {
        "anna_template": "Bürgerin mit Aufenthaltstitel {norm}, wohnhaft in {ort}",
        "schmidt_template": "Bürger der Bundesrepublik Deutschland, verheiratet, Vater von {kind}",
        "mehmet_template": "Bürger mit Aufenthaltstitel {norm}, selbstständig in {ort} seit {jahr}",
        "generic_de_template": "Bürger:in der Bundesrepublik Deutschland, wohnhaft in {ort}"
      },
      "geboren_template": "Geboren am {datum} in {ort}",
      "verified_in_registers": "Verifiziert in {count} Registern",
      "last_transmission_template": "Letzte Übermittlung vor {dauer} von {absender}",
      "no_transmissions_yet": "Noch keine Behörden-Übermittlung",
      "avatar_fallback_alt_template": "Initialen {initials}"
    },
    "wallet": {
      "title": "Mein Wallet",
      "add_document_cta": "+ Eintrag scannen oder hinzufügen",
      "card": {
        "personalausweis": { "label": "Personalausweis", "subtitle_template": "{nummer} · gültig bis {datum}" },
        "mdl": { "label": "Führerschein (mobil)", "subtitle_not_issued": "Vorschau · noch nicht ausgestellt", "subtitle_ready_template": "Klasse {klassen} · ausgestellt {datum}" },
        "eat": { "label": "Aufenthaltstitel (eAT)", "subtitle_template": "{norm} · gültig bis {datum}" },
        "aufenthaltstitel": { "label": "Aufenthaltstitel", "subtitle_template": "{norm} · gültig bis {datum}" },
        "gkv": { "label": "Krankenversicherung", "subtitle_template": "{traeger} · {kvnr_masked}" },
        "kfz": { "label": "KFZ-Halter", "subtitle_template": "{kennzeichen} · {marke} {modell}" }
      },
      "modal": {
        "close_cta": "Schließen",
        "qr_placeholder_caption": "QR-Code (Mock-Vorschau)",
        "mock_watermark": "[MOCK]"
      }
    },
    "family": {
      "title": "Meine Familie",
      "empty_state": {
        "headline": "Sie verwalten nur Ihr eigenes Profil.",
        "cta_add": "+ Familienmitglied hinzufügen",
        "cta_toast": "Funktion in Vorbereitung — wird in einer späteren Phase ausgebaut."
      },
      "relation": {
        "ehepartner": "Ehepartner:in",
        "lebenspartner": "Lebenspartner:in",
        "kind": "Kind"
      },
      "badge": {
        "sorgeberechtigt": "Sorgeberechtigt"
      },
      "avatar_fallback_alt_template": "Initialen {initials}"
    },
    "neuigkeiten": {
      "title": "Wichtig",
      "empty_state": "Keine offenen Aufgaben.",
      "frist_card": { "title_template": "Frist in {tage} Tagen", "cta": "Prüfen" },
      "vorgang_card": { "title_template": "Vorgang läuft — {count} Behörden", "progress_template": "{erledigt} von {gesamt} Schritten erledigt", "cta": "Live ansehen" },
      "new_letter_card": { "title_template": "{absender} — neu", "cta": "Lesen" }
    },
    "datenschutz": {
      "title": "Datenschutz",
      "access_count_template": "{count} Datenzugriffe in den letzten 30 Tagen",
      "last_access_template": "Letzte Übermittlung: {behoerde}, vor {dauer}",
      "no_access_yet": "Noch keine Zugriffe protokolliert",
      "cta": "Detail ansehen →"
    },
    "vollstaendiges_datenprofil": {
      "summary_label": "Vollständiges Datenprofil",
      "hint": "Alle Stammdaten-Sektionen (Identität, Anschrift, Familie, Altersvorsorge, Krankenversicherung & Pflege, Mobilität, Dokumente, Sperren & Einstellungen). Klicken Sie auf eine Sektion, um sie zu öffnen."
    }
  },
  "layout": {
    "sidebar": {
      "mein_profil": "Mein Profil"
    }
  }
}
```

**i18n-localizer-Auftrag**: Alle 42 Keys × 5 Non-DE-Locales nachziehen. Keys mit `_template` enthalten `{platzhalter}` und müssen pro Locale syntaktisch sauber gehalten werden (RTL für AR: keine reversed Tokens). Sprachstil pro Locale wie in V1.0–V1.3 etabliert (Sie-Form auf DE, formal-respectful für EN/RU/UK/AR/TR).

---

## 8. Avatar-Beschaffung (Sub-Task vor Coding-Start)

**Verbindlich**: drei Persona-Portraits müssen unter `public/personas/` liegen, bevor frontend-coder mit `<IdentityHero>` startet. Sonst greift HL-MP-8-Fallback (SVG-Initials) auf allen drei Personas — was die Demo-Wirkung halbiert.

**Quelle (Architect-Entscheidung)**: **Option 1 (Unsplash, royalty-free)** — Generated-AI-Portrait (Option 2 in Research-Note) ist lizenz-grau für portfolio-Demo. Unsplash bietet CC0-Photos mit nominal-Attribution.

**Such-Kriterien**:
- `anna-petrov.jpg`: Frau ~28 (Anna ist 28 in 2026, Geburt 1997), slawische Züge, professional, Berlin-/Office-Kontext
- `markus-schmidt.jpg`: Mann ~38 (Geburt 1988), deutsch, freundlich, family-context (kein Anzug-Konzern-Look, eher casual)
- `mehmet-yildiz.jpg`: Mann ~36 (Geburt 1990), türkisch-deutsch, selbstständig (modisch, vielleicht mit Tablet/Bauplänen-Kontext)

**Format-Entscheidung (OQ-2 vorabbeantwortet)**: **JPG mit 800 × 800 px square crop, ~80 KB komprimiert**. Begründung: `next/image` rendert JPGs effizient (WebP wird automatisch on-demand erzeugt); PNG ist für Portraits overkill (kein Transparenz-Bedarf); SVG ist kein Foto-Format. Square-crop weil IdentityHero und FamilyPanel beide runden `rounded-full` rendern — square gibt maximale Crop-Flexibility.

**Sub-Task-Owner**: main-thread (nicht Agent — Bild-Suche braucht Browser-Eyes). Sub-Task umfasst:
1. 3 Unsplash-URLs auswählen
2. via `curl` runterladen + ggf. `sharp`-CLI auf 800 × 800 squarecroppen
3. Ablage unter `public/personas/{persona-id}.jpg`
4. `public/personas/CREDITS.md` mit drei Zeilen "Photo by {photographer} on Unsplash · {url}" anlegen
5. Falls keine 3 passenden gefunden: SVG-Initials-Fallback-Komponente liefern (lebt in `src/components/mein-profil/AvatarFallback.tsx` `<NEW>` und wird in `<IdentityHero>` + `<FamilyPanel>` bei `next/image onError` aktiviert)

---

## 9. Acceptance-Tests

### 9.1 Vitest (Unit)

| File | Tests | Lines |
|---|---|---|
| `tests/unit/mein-profil-hero-status-statement.test.ts` | 4 (Anna / Schmidt / Mehmet / Fallback) | ~80 |
| `tests/unit/mein-profil-avatar-path.test.ts` | 3 (3 Personas) + 1 Fallback | ~40 |
| `tests/unit/mein-profil-family-panel-empty-state.test.ts` | 2 (Empty / Voll) | ~60 |
| `tests/unit/mein-profil-neuigkeiten-max-3.test.ts` | 3 (10-Items / 1-Item / 0-Items) | ~80 |
| `tests/unit/mein-profil-datenschutz-preview-shape.test.ts` | 1 | ~30 |
| `tests/unit/mein-profil-wallet-stack-page-theme.test.ts` | 1 (grep + DOM-Assertions) | ~30 |
| `tests/unit/mein-profil-serif-headings-only.test.ts` | 1 | ~40 |

**Gesamt**: ~15 Tests, +~360 LoC. Bestehende V1.0–V1.3 Tests (575/578) bleiben unberührt.

### 9.2 Playwright (a11y + Visual)

| File | Tests |
|---|---|
| `tests/a11y/mein-profil-hero-first-paint.spec.ts` | HL-MP-1 (Hero in oberer Viewport-Hälfte) |
| `tests/a11y/mein-profil-avatar-present.spec.ts` | HL-MP-8 (3 × HTTP-HEAD auf /personas/*.jpg) |
| `tests/a11y/mein-profil-axe-baseline.spec.ts` | axe 0/0/0/0 auf 3 Personas |
| `tests/a11y/mein-profil-redirect-stammdaten.spec.ts` | `/stammdaten` → HTTP 308 → `/mein-profil` |

**Lighthouse-Ziel**: a11y ≥ 95 (analog V1.0–V1.3 Floor) auf `/mein-profil` × 3 Personas.

### 9.3 Code-Reviewer-Checkliste

- [ ] HL-MP-1..8 alle 8 Tests grün
- [ ] Bestehende V1.0–V1.3 Tests grün (HL-MP-6)
- [ ] Keine neuen Hard-Lines außer HL-MP-1..8 erfunden
- [ ] Keine Mock-Backend-Endpoint-Erweiterung
- [ ] Keine V1.0–V1.3-Komponente modifiziert (Ausnahme: Sidebar-Link-Label)
- [ ] `/stammdaten` server-redirect funktioniert (HTTP 308 + Hash-Preservation)
- [ ] i18n-Parity: 42 neue Keys × 6 Locales = 252 Strings vollständig
- [ ] Source Serif 4 nur auf H1/H2 (HL-MP-7 grep + Vitest)
- [ ] Avatar-Datei-Präsenz (3 × JPG in `public/personas/` + CREDITS.md)
- [ ] Lighthouse a11y ≥ 95 auf `/mein-profil` × 3 Personas
- [ ] axe 0/0/0/0 auf neuer Page
- [ ] No-`shadow-*`-V2-Migration-Bruch (HL-DS-2 intakt)
- [ ] No-`bg-zinc-*-900` in `src/components/mein-profil/` (HL-MP-2 + HL-DS-12)
- [ ] WalletCardDetailModal: focus-trap, ESC, focus-restore

---

## 10. Migrations-Plan (Phasen)

Eine Implementations-Session (~2–3 Stunden frontend-coder + ~1 Stunde i18n-localizer + ~30 min a11y-tester + ~30 min code-reviewer):

**Phase MP-1 (Architect, fertig)**: Diese Spec.

**Phase MP-2 (main-thread, vor frontend-coder)**:
- 3 Unsplash-Portraits in `public/personas/` ablegen
- `public/personas/CREDITS.md` schreiben
- Source Serif 4 next/font in `src/app/layout.tsx` konfigurieren + `--font-serif-source` auf `<html>` setzen
- `--mp-*`-Tokens in `src/app/globals.css` einfügen (additiv, keine Renames)

**Phase MP-3 (frontend-coder)**:
- 6 Komponenten unter `src/components/mein-profil/` + 1 Util in `src/lib/utils/persona-status.ts`
- Page-Komponente `src/app/(app)/mein-profil/page.tsx` + `MeinProfilView.tsx`
- Sidebar-Link-Label-Tausch (Stammdaten → Mein Profil)
- `/stammdaten` Redirect-Patch
- 7 Vitest-Files
- 4 Playwright-Files

**Phase MP-4 (i18n-localizer)**:
- 42 Keys × 5 Non-DE-Locales = 210 neue Strings
- JSON-Parse-Gate (main-thread executiert `node -e "JSON.parse(require('fs').readFileSync('src/lib/i18n/locales/{locale}.json','utf8'))"` × 6)

**Phase MP-5 (a11y-tester)**:
- Playwright × 4 Files grün
- Lighthouse a11y ≥ 95 × 3 Personas
- axe-CLI 0/0/0/0

**Phase MP-6 (code-reviewer)**:
- Checkliste § 9.3
- Merge-Gate

---

## 11. Out-of-Scope (explicit)

- **Wow-Achse A** (Autopilot-Hero-Lift, cinematischer 4-Behörden-Real-Time-Film) — eigene Phase
- **Wow-Achse B** (AI-Übersetzer-Hero-Lift mit emotionaler Posteingang-Präsentation) — eigene Phase
- **Wow-Achse C** (Datenschutz-Cockpit voll, Banking-statement-für-Datenzugriffe, Widerrufs-Button-pro-Feld) — eigene Phase. Mein Profil zeigt nur Teaser.
- **Wallet-Card Verify-QR + EUDI-Export-Flow** — `<WalletCardDetailModal>` zeigt nur Detail-View + Mock-QR-Placeholder
- **Family-Member-Add-Flow** — CTA in `<FamilyPanel>` ist Toast-Placeholder
- **Datenschutz-Cockpit voll** — `<DatenschutzPreview>` ist 3-Zeilen-Teaser, linkt auf bestehenden V1.2 Aktivitätsprotokoll-Block
- **Sidebar-IA-Restructure** (Mein Profil / Wallet / Briefe / Vorgänge / Datenschutz / Settings) — eigene Phase; V1 nur Label-Tausch Stammdaten → Mein Profil
- **Onboarding/Landing-Redesign** — `/` und `/onboarding` bleiben unverändert
- **Neue Vorgänge** (Geburt, Heirat, Aufenthaltstitel-Verlängerung, Steuer) — eigene Phasen
- **Mock-Backend-Endpoint-Erweiterungen** — alle 6 benötigten APIs existieren
- **Neue Persona-Felder** — `Persona`-Type bleibt unverändert; Status-Statement ist computed
- **Persona-Avatare für Familie** (Tobias, Lev, Lena, Sophie, Felix, Eren) — Familie-Avatare nutzen Initials-on-Gradient-Fallback (HL-MP-8 erlaubt Fallback)
- **Dark-Mode-Toggle-UI** — `prefers-color-scheme` wird geehrt, kein UI-Toggle (analog HL-DS Dark-Mode-Politik)
- **Animation der Wallet-Card-Stack-Overlap-Reveal** — minimal CSS-transition, kein framer-motion-Choreographie

---

## 12. Open Questions (Architect-resolved)

**OQ-1 — Persona-Akzent-Hue (warm-pink / warm-blue / warm-orange pro Persona)**: **REJECTED**. Würde HL-DS-3 ("1 chromatischer Akzent") brechen. Persona-Differenzierung läuft über Avatar-Foto + Name + Status-Statement, nicht über Hue. (Begründung in § 3.4.)

**OQ-2 — Avatar-Format JPG vs PNG vs WebP**: **JPG, 800 × 800, ~80 KB**. `next/image` produziert WebP on-demand. PNG ist overkill (kein Transparenz-Bedarf bei Portraits). Square-crop maximiert Crop-Flexibility für `rounded-full`. (Begründung in § 8.)

**OQ-3 — `/stammdaten` alias vs redirect**: **HTTP 308 Redirect**. Alias hätte zwei kanonische URLs erzeugt (SEO/Loom-Deeplink-Verwirrung); voller Rename hätte alle 14+ test-files brechen können. Redirect ist Kompromiss: minimal-invasiv, ein-Datei-Patch. Hash (`#aktivitaetsprotokoll`) bleibt im Browser erhalten. (Begründung in § 1.)

---

## Status-Report (Architect)

Spec ist vollständig und implementierbar. Entscheidungen bei den 3 Open-Questions: OQ-1 Persona-Akzent **abgelehnt** (HL-DS-3-Bruch); OQ-2 **JPG 800 × 800** (next/image-effizient + Square-Flexibility); OQ-3 **Server-Redirect 308** statt Alias (minimal-invasiv, Hash-erhaltend, kein Test-Bruch).

Was bewusst **nicht** in die Spec aufgenommen wurde: (a) eine spezielle Persona-Variante "Anna ohne Familie" als seed-Eintrag — der HL-MP-3-Empty-State-Test arbeitet mit `structuredClone` der bestehenden Persona; das hält Seed-Daten stabil. (b) Eine `walletAttestations`-Erweiterung pro Persona — V1.0 liefert 3 fixe Mock-Drittanbieter (Hard-Line § 11.18), die als Card 4 erst in Phase MP-4 oder später eingebaut werden. (c) Ein eigenes "Vormundschaft"-Badge — rechtlich ungenau (Vormundschaft ≠ Sorgerecht), stattdessen "Sorgeberechtigt" für minderjährige Kinder.

Risiken-Punkte für frontend-coder: (1) Source Serif 4 muss via `next/font/google` geladen werden — local-font-Fallback nicht aufsetzen (Lizenz). (2) WalletCardStack-Overlap via CSS-translate kann mit `prefers-reduced-motion` brechen — explizit-fallback testen. (3) `/stammdaten#aktivitaetsprotokoll` Anchor muss nach HTTP 308 auf `/mein-profil#aktivitaetsprotokoll` werden — Anchor-Preservation ist Browser-Standard bei 308, aber Vitest-Test zur Sicherheit.

---

## Build log — frontend-coder

- date: 2026-05-14
- phase: MP-2 + MP-3 (Foundation + Implementation)
- screens implemented:
  - `/mein-profil` (neue kanonische Identity-First-Page)
  - `/stammdaten` (HTTP 308 → `/mein-profil`, Anchor-erhaltend via Next-`permanentRedirect`)
- foundation:
  - `src/app/layout.tsx`: Source Serif 4 via `next/font/google` (`subsets: latin/latin-ext/cyrillic/cyrillic-ext`, weights `400/600/700`, `display: swap`, variable `--font-serif-source`) parallel zu Source Sans 3 angekettet
  - `src/app/globals.css`: 11 `--mp-*`-Tokens additiv in `:root` + Dark-Mode-Parallelen in beiden Dark-Branches (`@media (prefers-color-scheme: dark)` + `.dark`-Klasse), plus `.mp-font-serif`-Utility (Charter / Iowan Old Style / Georgia Fallback-Chain)
  - 3 Persona-Portraits unter `public/personas/{anna-petrov,markus-schmidt,mehmet-yildiz}.jpg` (Unsplash CC0, je 58–69 KB), plus `public/personas/CREDITS.md` mit Photo-ID-Quellenangabe
- components created (alle neu unter `src/components/mein-profil/`):
  - `AvatarFallback.tsx` (HL-MP-8 Fallback, `role="img"` + `aria-label`, kein Serif darin per HL-MP-7)
  - `IdentityHero.tsx` (`'use client'`, `next/image priority`, `onError` → `AvatarFallback`, H1 mit `mp-font-serif`)
  - `WalletCardStack.tsx` (`'use client'`, 3–5 Cards persona-deterministisch, `motion-safe:-mt-4` Overlap, `motion-safe:hover:-translate-y-1` Lift, focus-restoration via `triggerRefs` + `requestAnimationFrame`)
  - `WalletCardDetailModal.tsx` (`<Dialog>` aus shadcn, Mock-QR-Placeholder, Page-Theme HL-MP-2)
  - `FamilyPanel.tsx` (Empty-State für Anna nicht-greifend da Persona-Seed Familie hat — Empty-Pfad ist nur via `structuredClone` Test-Variante erreichbar, Spec § 4.3 verbatim; voll-Variante zeigt Lena + Sophie + Felix mit Initials-Avatar; minderjährige Kinder tragen „Sorgeberechtigt"-Badge)
  - `NeuigkeitenFeed.tsx` (deterministischer 3-Slot-Algorithmus aus Spec § 4.4 verbatim, Sorting via `letter.empfangen_am` und Vorgang-`schritte[].completed_at`-letztes — `letzte_aktivitaet` ist im Vorgang-Typ nicht vorhanden, daher inferiert)
  - `DatenschutzPreview.tsx` (exakt 3 Body-Elemente, HL-MP-5 verbatim; CTA → `/stammdaten#aktivitaetsprotokoll`)
  - `VollstaendigesDatenprofil.tsx` (wrappt existierende `<StammdatenView />` + `<KontaktSektionsWrapper />` in `<details id="daten">`, Auto-Expand bei Hash `#daten` oder `#aktivitaetsprotokoll`)
  - `MeinProfilView.tsx` (Client-Wrapper, lädt `api.getProfile`/`getBehoerden`/`getLetters`/`getVorgaenge`/`getWalletAttestations`/`getMdlAttestation`/`getUebermittlungsLog` parallel, lokale `countRegisters`-Heuristik, 30-Tage-Access-Count-Filter exklusive `app_aktivitaet`-Kategorie)
- utility added:
  - `src/lib/utils/persona-status.ts` (`computeStatusStatement` mit 4 Branches Mehmet/Anna/Schmidt/Generic, `getAvatarPath`, `getInitials`)
- pages + layout:
  - `src/app/(app)/mein-profil/page.tsx` (Server-Component-Hülle)
  - `src/app/(app)/mein-profil/layout.tsx` (MockWatermarkBanner + sr-only Nav-Label)
  - `src/app/(app)/stammdaten/page.tsx` (auf `permanentRedirect('/mein-profil')` reduziert; Layout bleibt für Hash-Anchor-Erhaltung)
- sidebar:
  - `src/components/layout/Sidebar.tsx`: NavItem-i18nKey `stammdaten` → `mein_profil`, `href` → `/mein-profil`. Icon `UserRound` bleibt (keine Begründung für Icon-Change in Spec).
- i18n-Keys DE-Source (neu in `de.json`, ~42 Leaf-Keys × 1 Locale):
  - `nav.mein_profil` (1)
  - `mein_profil.page.{title,loading,error_load,error_retry}` (4)
  - `mein_profil.hero.status_statement.{anna_template,schmidt_template,mehmet_template,generic_de_template}` (4)
  - `mein_profil.hero.{geboren_template,verified_in_registers,last_transmission_template,no_transmissions_yet,avatar_fallback_alt_template}` (5)
  - `mein_profil.wallet.{title,add_document_cta}` (2)
  - `mein_profil.wallet.card.{personalausweis,mdl,eat,aufenthaltstitel,gkv,kfz}.{label,subtitle_template/subtitle_not_issued/subtitle_ready_template}` (12)
  - `mein_profil.wallet.modal.{close_cta,qr_placeholder_caption,mock_watermark}` (3)
  - `mein_profil.family.{title}` + `empty_state.{headline,cta_add,cta_toast}` + `relation.{ehepartner,lebenspartner,kind}` + `badge.sorgeberechtigt` + `avatar_fallback_alt_template` (9)
  - `mein_profil.neuigkeiten.{title,empty_state}` + `frist_card.{title_template,cta}` + `vorgang_card.{title_template,progress_template,cta}` + `new_letter_card.{title_template,cta}` (9)
  - `mein_profil.datenschutz.{title,access_count_template,last_access_template,no_access_yet,cta}` (5)
  - `mein_profil.vollstaendiges_datenprofil.{summary_label,hint}` (2)
  - Gesamt: 56 neue Leaf-Keys DE-Source (etwas über Spec-Schätzung 42, weil Sub-Templates wie `mdl.subtitle_ready_template` explizit ausgewiesen sind).
- test-gates:
  - `npx tsc --noEmit` → 0 errors (EXIT=0)
  - `npx next lint` → 1 pre-existing warning (`src/lib/mock-backend/stammdaten/api.ts:39` unused `read`), 0 neue Issues
  - `npx vitest run` → 40 files, 636/636 tests grün (Baseline preserved — HL-MP-6 erfüllt)
  - JSON-Parse-Gate: 6/6 locales OK (`de/en/ru/uk/ar/tr`)
  - `grep -ri "BundesSans" src/` → 0 hits (HL-DS-1 intakt)
  - `grep -rEn "(bg-(zinc|gray|slate|black)-9(0|5)0|data-force-theme)" src/components/mein-profil/` → 0 hits (HL-MP-2 erfüllt)
  - `grep -rE "mp-font-serif" src/components/ui/button.tsx` → 0 hits (HL-MP-7 erfüllt; ein Aufruf auf `<DialogTitle>` in `WalletCardDetailModal` ist semantisch Heading-Element und damit erlaubt)
  - dev-server smoke: `GET /mein-profil` HTTP 200 (188 KB), `GET /stammdaten` HTTP 308 `Location: /mein-profil` (Hash-Erhaltung Browser-Standard), 3× `HEAD /personas/*.jpg` HTTP 200, compiled CSS enthält `--mp-bg-page` + `--font-serif-source` + `mp-font-serif` + `--mp-radius-card`
- V1.0–V1.5.1 Verhalten verifiziert (HL-MP-6):
  - Vitest 636/636 inkl. `tests/unit/stammdaten-v1-3-*` (FAER on-demand-TTL ≤ 300s, mDL closed-list 14 Attribute, Halter-Adresse-Ban-List, Block-D-Wording, FE-Nr-Format-Validator, Pflichtumtausch-Stichtag-Lookup, persistence-migration V12→V13) sowie `cross-template-versand` (V1.5.1) + `richtung-filter` (V1.2) — keine Test-Modifikation, keine Komponenten-Modifikation
  - `<StammdatenView>` + `<KontaktSektionsWrapper>` werden via collapsed `<details>` 1:1 gewrappt, NICHT inline-replaced
  - ARF v2.0-Disclaimer + Pilot-Phase-Badge + alle 14 HL-MOB / 14 HL-DS / Religion-Consent-Pattern / IBAN-Push-Modal bleiben unter `/mein-profil#daten` Auto-Expand erreichbar
- known gaps / Followups für nachfolgende Phasen:
  - **HL-MP-1 visual-smoke**: noch nicht Playwright-gemessen; spec-Test-File `tests/a11y/mein-profil-hero-first-paint.spec.ts` ist in Phase MP-5 (a11y-tester) abzuliefern. Visual-Best-Effort: Hero ist `py-10 sm:py-14`, Avatar `var(--mp-hero-avatar-size)` (max 180 px), `sm:flex-row items-center` — Top der Hero-Section landet bei `y ≈ topbar-Höhe`, sodass die 30 %-Pflicht in der oberen Hälfte bei `1280 × 800`-Viewport erfüllt sein sollte.
  - **HL-MP-3 Anna-Empty-State** ist über `personas.json` aktuell NICHT erreichbar (Anna hat Partner Tobias + Kind Lev). Spec § 4.3 / HL-MP-3-Test nutzt `structuredClone` mit leeren `familie.partner = undefined`/`kinder = []`; im UI rendert Anna die voll-Variante. Mehmet (kein Partner, 1 Kind) rendert ebenfalls voll-Variante. Demo-Empty-State ist nur via Test-Path sichtbar — Architect-Note in Spec § 4.3 hat das bereits dokumentiert.
  - **Vitest-Files HL-MP-1..8** (`tests/unit/mein-profil-*.test.ts`) sind noch nicht angelegt — Spec § 9.1 listet 7 Files. Diese gehören in eine separate Test-Phase (in dieser Session nicht beauftragt; Tests werden in MP-5 a11y-tester + parallel als V1.3.1-Followup angelegt).
  - **i18n-Parity 5 Non-DE-Locales**: 56 Leaf-Keys × 5 Locales = 280 Strings — Aufgabe für i18n-localizer (Phase MP-4).
  - **Vorgang-`letzte_aktivitaet`-Feld** existiert nicht im Typ; Algorithmus verwendet Maximum von `schritte[].completed_at` mit Fallback auf `angelegt_am`. Spec § 4.4 referenziert `letzte_aktivitaet ?? erstellt_am` — beide Felder gibt's nicht im aktuellen Type. Eine spätere Typ-Erweiterung wäre dafür sauberer (Followup MP-4 oder V1.3.2).
  - **Toast in FamilyPanel-Empty-CTA**: nutzt `sonner`-Toast (bereits in Projekt), Inhalt aus i18n. Funktion ist Placeholder ohne realen Handler (Spec § 4.3 verbatim).
  - **`mp-font-serif` auf `<DialogTitle>` in WalletCardDetailModal**: ist semantisch ein Heading (Dialog-Title-Element rendert intern als `<h2>` in base-ui). HL-MP-7 grep-Test in `button.tsx`/`input.tsx`/`badge.tsx` ist 0/0/0 hits; eine zusätzliche Test-Variante für `DialogTitle`-Akzeptanz-Branch fehlt — kann in Tests-Phase ergänzt werden.
  - **Avatare in `<FamilyPanel>`**: Tobias / Lev / Lena / Felix / Eren haben keine Foto-Dateien — alle Family-Avatare rendern den `<AvatarFallback>` (Initials-on-Warm-Surface). Architect hat das in Spec § 11 explizit out-of-scope deklariert.
  - **Loading-Skeleton**: Mein-Profil-Page zeigt eine schlichte `Wird geladen …`-Zeile in der Hauptachse statt eines per-Card-Skeleton-Layouts. Akzeptabel für V1; ein finer-grained Loading-State kann in MP-4/MP-5 ergänzt werden.
- next: i18n-localizer (Phase MP-4 — 5 Non-DE × 56 Keys) → a11y-tester (Phase MP-5 — Playwright HL-MP-1, HL-MP-8, axe-baseline, redirect-spec) → code-reviewer (Phase MP-6 — Checkliste § 9.3)
