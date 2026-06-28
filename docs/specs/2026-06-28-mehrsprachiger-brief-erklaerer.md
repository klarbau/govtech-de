---
feature: mehrsprachiger-brief-erklaerer
title: Mehrsprachiger Brief-Erklärer — Erläuterung in der Sprache der Bürger:in
status: shipped   # 2026-06-28: live in PosteingangInbox; gates green (code-review APPROVE, a11y PASS RU/AR light+dark, tsc, 6-locale parity, next build, spine e2e 2/2).
track: supporting   # Posteingang-Begleitfläche (wow-backlog #6 / AISummaryBlock-Amplify). NICHT die Spine.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  research: docs/research/2026-06-28-mehrsprachiger-brief-erklaerer.md
  domain: docs/research/2026-06-28-mehrsprachiger-brief-erklaerer.md   # Domain-Validierung als ## Domain validation in der Research-Datei
  verify: docs/research/2026-06-28-mehrsprachiger-brief-erklaerer.md   # Verifier-Verdict PROCEED inline geliefert
amplifies: wow-backlog #6 (AISummaryBlock / Brief-Erklärer)
---

> **Geltungsbereich.** Diese Spec ist **additiv** auf die bestehende deutsche Brief-Erklärung
> (wow-backlog #6, `AISummaryBlock` / `AiErklaererCard` / `LetterReader`). Sie fügt **keine neue
> Fläche** hinzu, sondern macht die bereits gerenderte KI-Erläuterung **locale-bewusst**: bei aktiver
> UI-Sprache RU/UK/AR/TR (und EN) zeigt der Erklärer die **Plain-Language-Bullets in der Sprache der
> Bürger:in** — als **Verständnishilfe**, nicht als Übersetzung des Bescheids. Das deutsche Original
> bleibt maßgeblich und einen Tap entfernt. Der dormante Typ-Slot
> `LetterAiSummary.translations` (src/types/letter.ts L124–129) wird genutzt; er ist heute von 0
> Briefen befüllt und von keiner Komponente gelesen. Drei-fach additiv (Typ-, Daten-, UI-Ebene).

---

## 1. Problem statement

Ein Behörden-Brief liegt im Posteingang in dichtem Behördendeutsch. Anna Petrov (Aufenthaltstitel) und
Mehmet Yıldız (selbstständig) haben Deutsch nicht als Erstsprache — Behördendeutsch × Sprachbarriere ist
ihr dokumentierter Pain #1. Heute erklärt der Brief-Erklärer den Inhalt zwar in **einfachem Deutsch**,
aber immer **nur auf Deutsch**, unabhängig von der eingestellten UI-Sprache. Diese Spec lässt die
Erläuterung **in der eingestellten Sprache** (RU/UK/AR/TR/EN) erscheinen — sichtbar gekennzeichnet als
„Übersetzte Erläuterung — rechtsverbindlich ist allein das deutsche Original."

## 2. Persona & journey

- Persona: [Anna Petrov](docs/personas.md#anna-petrov) (primär), [Mehmet Yıldız](docs/personas.md#mehmet-yildiz) (sekundär)
- Trigger: Bürger:in hat die UI bereits auf ihre Sprache geschaltet (z. B. RU) und öffnet einen
  Behörden-Brief (Anna: LEA-Erinnerung Aufenthaltstitel-Verlängerung).
- Outcome: Bürger:in versteht in **ihrer Sprache** in <30 s, **was** der Brief sagt, **was zu tun ist**
  und **bis wann** — ohne das deutsche Original lesen zu können, aber mit dem deutschen Original und der
  deutschen Frist-Zitatzeile sichtbar daneben.
- Wow-Moment (Loom): UI auf RU/TR umschalten → Annas LEA-Brief „erklärt sich selbst" in der Sprache der
  Bürger:in. Der CLAUDE.md-Mehrsprachigkeits-Mandat wird vom Umschalter-Fußnoten-Detail zum gefühlten
  Moment.
- Time saved vs. Status quo: heute = deutschen Bescheid + DeepL/Wörterbuch/Familienangehörige hinzuziehen,
  Frist-Risiko durch Fehldeutung → ~15–30 min Unsicherheit. Hier (2027-Speculative) = Erläuterung in der
  eigenen Sprache, deutsche Frist verbatim daneben → <30 s, ohne Fehldeutungs-Risiko auf der Frist.

## 3. Success criteria for the demo

- [ ] Bei aktiver Nicht-DE-Locale zeigt Annas LEA-Brief die Erläuterungs-Bullets in der aktiven Sprache
      innerhalb der ersten Render-Sekunde (seeded, keine Live-Netz-Latenz).
- [ ] Das Badge „Übersetzte Erläuterung — rechtsverbindlich ist allein das deutsche Original" ist an
      **jeder** übersetzten Ansicht sichtbar — in DE **und** in der aktiven Sprache.
- [ ] Neben **jedem** übersetzten Bullet steht das **unübersetzte deutsche** `original_zitat`
      (CitationFootnote, verbatim aus `body_de`). Fristen/Beträge/Aktenzeichen werden **nie** im
      übersetzten Bullet neu gerendert.
- [ ] `[MOCK]`/2027-Speculative-Watermark auf jeder übersetzten Erläuterung; nichts impliziert, dass eine
      Behörde übersetzt/gesendet/empfangen hat.
- [ ] Bei fehlender Übersetzung für die aktive Locale: graceful Fallback auf DE + sichtbarer Hinweis
      „Für diese Sprache liegt noch keine Erläuterung vor — angezeigt wird die deutsche Fassung."
- [ ] AR rendert RTL korrekt; eingebettete deutsche Zitate/Paragraphen/Aktenzeichen bleiben LTR (bdi/dir).
- [ ] a11y PASS (supporting-tier): Sprach-Toggle ist ein echtes Control, übersetzter Text trägt `lang`,
      WCAG 2.1 AA / BITV 2.0.

## 4. Screen-by-screen flow

> Keine neue Route. Zwei bestehende Flächen werden erweitert: (4.1) die LetterCard in der Liste und
> (4.2) der LetterReader im Detail.

### 4.1 Surface: Posteingang-Liste — `LetterCard` (Affordance-Hinweis, kein Toggle)

- **Route**: `/posteingang`
- **File**: `src/components/posteingang/LetterCard.tsx` (extend)
- **Server or client**: Client (bestehend)
- **Verhalten**: Die Liste bekommt **keinen** eigenen Sprach-Toggle. Die Sprache der Erläuterung folgt
  der **globalen UI-Locale** (`useLocale()` aus next-intl, gesetzt über den bestehenden
  `LanguageSwitcher`). Auf der LetterCard erscheint **nur dann** ein dezenter Affordance-Hinweis
  „in Ihrer Sprache erklärbar" (kleines Lokalisierungs-Icon + sr-only-Text), wenn (a) die aktive Locale
  ≠ `de` **und** (b) der Brief eine seeded `translations[locale].post_open` trägt. Reines Signal, kein
  Steuerelement.
- **Components used**:
  - `LetterCard` from `src/components/posteingang/LetterCard.tsx` — Affordance-Hinweis ergänzen
  - `BehoerdenBadge` (bestehend, unverändert)
- **i18n keys introduced**: `posteingang.card.in_ihrer_sprache_hint`
- **States**: keine neuen Card-States. Hinweis nur sichtbar / nicht-sichtbar.
- **Accessibility notes**: Icon `aria-hidden`, sr-only-Begleittext über `posteingang.card.in_ihrer_sprache_hint`.

### 4.2 Surface: Brief-Detail — `LetterReader` + `AISummaryBlock` (locale-bewusste Erläuterung)

- **Route**: `/posteingang` (Detail-Pane / Reader)
- **File**: `src/components/posteingang/LetterReader.tsx`, `src/components/posteingang/AISummaryBlock.tsx`,
  `src/components/posteingang/AiErklaererCard.tsx` (alle extend)
- **Server or client**: Client (bestehend)
- **Layout (ASCII)**:

```
┌──────────────────────────────────────────────────────────┐
│ [MOCK · 2027-Speculative — Prototyp, alle Daten mocked]   │  ← bestehender Watermark
├──────────────────────────────────────────────────────────┤
│  ✦ Erläuterung                              [ DE | RU ▾ ]  │  ← NEU: Sprach-Toggle (4.2.1)
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚠ Übersetzte Erläuterung — rechtsverbindlich ist   │  │  ← NEU: Non-Binding-Badge (DE + aktive Sprache)
│  │   allein das deutsche Original. [«перевод…» …]      │  │     (TranslationDisclaimerBadge, 4.2.2)
│  └────────────────────────────────────────────────────┘  │
│  • <Bullet in aktiver Sprache, deskriptiv>                │
│      ↳ Zitat (DE, verbatim): „Wir empfehlen, …"  [§ 81…]  │  ← CitationFootnote bleibt DEUTSCH
│  • <Bullet in aktiver Sprache>                            │
│      ↳ Zitat (DE, verbatim): „…"   ⓘ bitte im deutschen   │
│         Original prüfen (citation_match=false)            │
│  …                                                        │
├──────────────────────────────────────────────────────────┤
│  [ Deutsches Original anzeigen ]  (immer einen Tap weg)   │  ← body_de bleibt erreichbar
└──────────────────────────────────────────────────────────┘
```

#### 4.2.1 Sprach-Toggle (im Erläuterungs-Header)

- Ein **echtes Steuerelement** im Header von `AISummaryBlock` (neben der `summary_heading`-Überschrift).
- Default = **aktive UI-Locale** (`useLocale()`). Bei DE rendert der Erklärer wie heute (rein deutsch,
  kein Badge, kein Toggle-Wert ≠ DE).
- Optionen: `de` + alle Locales, für die der Brief eine seeded `translations[locale].post_open` hat.
  Eine Locale ohne Seed erscheint **nicht** als wählbare Option (kein toter Eintrag).
- Umschalten ist **lokal** (nur die Erläuterungs-Sprache dieses Briefs), ändert **nicht** die globale
  UI-Locale. Initialwert = UI-Locale, wenn dafür ein Seed existiert; sonst `de`.
- Implementiert als shadcn `Select`/Toggle-Group; `lang`-Wert wird beim Wechsel auf den Bullet-Container
  gesetzt (4.2.3).

#### 4.2.2 Non-Binding-Badge — Pflichtplatzierung

- Sichtbar **immer dann**, wenn die aktive Erläuterungs-Sprache ≠ `de` ist. **Direkt über** der
  Bullet-Liste, **innerhalb** des `AISummaryBlock` (nicht wegklappbar, kein `<details>`).
- Wortlaut (Pflicht, exakt): **„Übersetzte Erläuterung — rechtsverbindlich ist allein das deutsche
  Original."** in **DE**, gefolgt vom **Äquivalent in der aktiven Sprache** (ru/uk/ar/tr/en, in de.json
  + Locale-JSONs geseedet). Framing immer **„Erläuterung"**, nie „Übersetzung des Bescheids".
- Liegt **zusätzlich** zum bestehenden roten `original_authoritative`-Banner (`RoterHinweisBanner`) vor,
  ersetzt ihn nicht.

#### 4.2.3 Bullet-Rendering (locale-bewusst, Korrektur-konform)

- Quelle: `summary.translations?.[activeLang]?.post_open ?? summary.post_open` (DE-Fallback).
- Übersetzte Bullets sind **deskriptiv**, nie präskriptiv-rechtlich: „Die Behörde fordert…", „Das
  Schreiben nennt eine Frist…" — **niemals** „Sie sollten Widerspruch einlegen, weil…" (§ 2 RDG).
- **Fristen, € Beträge, Aktenzeichen, Frist-Datum-Strings werden NICHT im übersetzten Bullet neu
  gerendert.** Wo ein Bullet eine Frist referenziert: Label übersetzt + **verbatim deutscher
  Datums-String** aus `original_zitat`/`body_de` (z. B. „Frist laut Schreiben: 14.09.2027").
- Neben **jedem** übersetzten Bullet steht der bestehende `CitationFootnote` mit dem **unübersetzten
  deutschen** `original_zitat` (verbatim aus `body_de`). Pro-Bullet-`rechtsgrundlage`-Mikrozeile
  (§ 81 AufenthG, § 70 VwGO, § 355 AO, § 84 SGG, § 240 AO) bleibt **deutsch** — Paragraphen werden nie
  übersetzt/lokalisiert.
- `citation_match=false` (z. B. Annas LEA-Frist) wird als **„bitte im deutschen Original prüfen"**
  gerendert (übersetztes Caveat), nicht als selbstbewusste übersetzte Frist-Behauptung.
- Container trägt `lang={activeLang}` + (für `ar`) `dir="rtl"`; eingebettete deutsche Zitate/Paragraphen
  via `<bdi>` LTR-stabil (4.2.4 / §A11y).

#### 4.2.4 Deutsches Original — ein Tap entfernt

- Der bestehende „Deutsches Original anzeigen"/`body_de`-Pfad bleibt **unverändert erreichbar** und ist
  von jeder übersetzten Ansicht ohne Umweg sichtbar/erreichbar. Erweitern, nie ersetzen.

- **Data fetched**: `letter.ai_summary` (bestehend; `post_open` + neu gelesenes `translations`).
  Kein neuer API-Call im Detail; das seeded `post_open` + `translations` liegt nach `extrahiereAktion`
  am `letter` an (siehe §6).
- **i18n keys introduced**: siehe §8.
- **States**: loading / error / success (bestehend) + **fallback-de** (übersetzung fehlt, §9) +
  **translated** (aktive Sprache ≠ de).
- **Accessibility notes**: §A11y unten.

## 5. Autopilot logic

**Nicht anwendbar.** Dieses Feature hat keinen Autopilot, keine Behörden-Kaskade, keine
Statusänderung. Es ist eine reine **Verständnishilfe** auf einer bestehenden Lese-Fläche. (Bewusst
festgehalten, damit kein Coder eine Kaskade erfindet.)

## 6. Data model additions / changes

### Typänderung

**Keine.** Der Slot existiert bereits in `src/types/letter.ts` (L124–129):

```ts
// src/types/letter.ts — BESTEHEND, NICHT ÄNDERN
translations?: Partial<
  Record<
    'en' | 'ru' | 'uk' | 'ar' | 'tr',
    { pre_open?: LetterAiSummaryPreOpen; post_open?: LetterAiSummaryPostOpen }
  >
>;
```

Die Bullets in `post_open` (übersetzt) verwenden dieselbe `LetterAiSummaryPostOpen`-Struktur
(`bullets[].text`, `citations[]`, `generated_at`, `model`). **`citations[].original_zitat` bleibt in der
übersetzten Variante DEUTSCH** (verbatim aus `body_de`) — das ist die Anti-Fehlübersetzungs-Sicherung.

### Mock-backend additions

- **`extrahiereAktion`** (`src/lib/mock-backend/api.ts`, ~L2545): beim Schreiben von
  `letter.ai_summary.post_open` zusätzlich `letter.ai_summary.translations` aus der seeded
  Summaries-Map mit übernehmen (falls vorhanden). **Keine neue Funktion, keine neue Signatur** — nur das
  bestehende Anhängen erweitern, sodass das (in `letters.json` / der Summaries-Map) **vorab geseedete,
  hand-geprüfte** `translations`-Objekt am Brief landet. **Kein Lazy-AI-Fetch, keine Live-Übersetzung**
  (wow-backlog #6-Flag: inbox-level Gist nie maschinell on-the-fly, weil er Vertrauen prägt, bevor die
  Bürger:in das Original lesen kann).
- `loadSummariesMap()`-Shape um optionales `translations` je Brief erweitern (analog `post_open`).

### Seed data extension in `src/data/letters.json`

Pro Brief wird `ai_summary.translations` als **locale-keyed Map** hinterlegt. **Exakte Feldform**
(Beispiel Anna LEA-Brief, gekürzt):

```jsonc
// src/data/letters.json → letter "letter-abh-erinnerung-verlaengerung" → ai_summary
"ai_summary": {
  "de": "Ihr Aufenthaltstitel läuft am 14.09.2027 ab. …",   // BESTEHEND, unverändert
  "post_open": { /* deutsche Bullets — wie heute geseedet */ },
  "translations": {
    "ru": {
      "post_open": {
        "bullets": [
          { "text": "Ведомство сообщает, что Ваш вид на жительство (§ 18g AufenthG) истекает. Срок по письму: 14.09.2027." },
          { "text": "В письме рекомендуется записаться на приём для продления заранее. Точную формулировку и срок см. в немецком оригинале." }
        ],
        "citations": [
          { "bullet_index": 0, "original_zitat": "Ihr Aufenthaltstitel nach § 18g AufenthG (Blue Card EU) am 14.09.2027 abläuft." },
          { "bullet_index": 1, "original_zitat": "Wir empfehlen, mindestens vier Monate vorher einen Termin zur Verlängerung über unser Online-Terminbuchungssystem zu vereinbaren." }
        ],
        "generated_at": "2026-06-28T00:00:00.000Z",
        "model": "[MOCK] hand-translated, human-reviewed"
      }
    },
    "tr": { "post_open": { /* … gleiche Struktur … */ } },
    "ar": { "post_open": { /* … gleiche Struktur, RTL-Text … */ } },
    "uk": { "post_open": { /* … */ } },
    "en": { "post_open": { /* … */ } }
  }
}
```

**Regeln für die Seeds (Pflicht):**
- `original_zitat` in `citations` ist **immer DEUTSCH**, verbatim aus `body_de`.
- Datums-/€-/Aktenzeichen-Strings im `bullets[].text` sind **verbatim deutsche Strings**, nicht neu
  getippt/lokalisiert (z. B. „14.09.2027", nicht „14 сентября 2027").
- Bullets **deskriptiv**, nicht präskriptiv (§ 2 RDG).
- `model` markiert die Seeds als hand-übersetzt + human-reviewed (kein generierter Inhalt).

### Seeded-Scope (TIGHT — bewusst klein für den ersten Ship)

Geseedet werden **drei** Briefe, alle 5 Nicht-DE-Locales (en/ru/uk/ar/tr):

1. **`letter-abh-erinnerung-verlaengerung`** (Anna, LEA Berlin = Land Berlin) — der Loom-Hero.
   Rechtsbehelf-/Frist-tragend → **nur mit allen Flags**, unübersetztem deutschem Zitat, deskriptiven
   Bullets, `citation_match=false`-Caveat.
2. **`letter-familienkasse-bewilligung`** (Familienkasse = Bund/BA) — **safe**: Bewilligung, **keine
   Frist**. Niedrigrisiko-Demo-Beleg, dass das Muster auch für gutartige Briefe trägt.
3. **`letter-mehmet-ihk-beitrag`** (Mehmet, IHK = Selbstverwaltung) — Frist-tragend, zeigt das Muster für
   Mehmet. **Nur mit allen Flags + unübersetztem Zitat + deskriptiven Bullets.**

> **Bewusst NICHT in Scope für Ship 1:** die § 86a-SGG-„aufschiebende Wirkung … entfällt"-Briefe
> (`letter-schmidt-krankenkasse-beitrag`, `letter-mehmet-krankenkasse-freiwillig`) — der am leichtesten
> zu invertierende Satz. Falls je geseedet, muss dieser Bullet deutsch-only oder zitat-only bleiben.

### Persistence keys (localStorage)

Optional, nur wenn die **pro-Brief lokale** Erläuterungs-Sprachwahl (4.2.1) überleben soll:
`govtech-de:v1:brief-erklaerer:lang:<letterId>` → `'de'|'en'|'ru'|'uk'|'ar'|'tr'`. Default-Verhalten
ohne Persistenz = Initialwert aus UI-Locale; Persistenz ist **nice-to-have**, nicht Pflicht für den Ship.

## 7. AI assistant integration (if applicable)

**Nicht anwendbar.** Keine neuen Tool-Definitionen, keine System-Prompt-Änderung, keine Live-Übersetzung
über `/api/assistant`. Die Erläuterungen sind **seeded** (siehe §6 + wow-backlog #6-Flag). Bewusst
festgehalten, damit assistant-engineer **nicht** beauftragt wird.

## 8. i18n

DE source-of-truth Keys (alle 6 Locales, durch i18n-localizer). Die **Badge-Sätze** brauchen echte,
hand-geprüfte Übersetzungen je Locale (ru/uk/ar/tr/en); die übrigen Chrome-Keys default-übersetzbar.

| Key | DE source value |
|---|---|
| `posteingang.card.in_ihrer_sprache_hint` | „In Ihrer Sprache erklärbar" |
| `posteingang.erklaerer.sprache_label` | „Sprache der Erläuterung" |
| `posteingang.erklaerer.sprache_de` | „Deutsch" |
| `posteingang.erklaerer.badge_nonbinding` | „Übersetzte Erläuterung — rechtsverbindlich ist allein das deutsche Original." |
| `posteingang.erklaerer.badge_nonbinding_hint` | „Diese Erläuterung ist eine Verständnishilfe. Maßgeblich ist allein das deutsche Original." |
| `posteingang.erklaerer.frist_laut_schreiben` | „Frist laut Schreiben:" |
| `posteingang.erklaerer.bitte_original_pruefen` | „Bitte im deutschen Original prüfen." |
| `posteingang.erklaerer.fallback_de_note` | „Für diese Sprache liegt noch keine Erläuterung vor — angezeigt wird die deutsche Fassung." |
| `posteingang.erklaerer.mock_watermark` | „[MOCK] Prototyp — 2027-Speculative. Keine Behörde war beteiligt; Erläuterung clientseitig aus Mock-Daten." |
| `posteingang.erklaerer.original_zitat_label` | „Zitat (deutsches Original):" |

> `badge_nonbinding` (+ `_hint`) **müssen** je Locale **hand-übersetzt und human-reviewed** sein (ru/uk/
> ar/tr/en); kein Schnell-Default. AR-Werte werden RTL gerendert (Container-`dir`).

## 9. Edge cases

- **Locale ohne Seed für diesen Brief**: aktive UI-Locale = z. B. `uk`, Brief hat kein
  `translations.uk` → **graceful Fallback auf DE**-Bullets + sichtbarer Hinweis
  `posteingang.erklaerer.fallback_de_note`. Toggle bietet `uk` dann gar nicht erst als Option an.
- **DE aktiv**: kein Toggle-Wert ≠ de nötig, kein Badge, kein Watermark-Zusatz — Rendering wie heute.
- **`citation_match=false`** (Annas LEA-Frist): übersetztes Caveat `bitte_original_pruefen` statt
  selbstbewusster Frist; deutsches `original_zitat` daneben.
- **AR = RTL**: Bullet-Container `dir="rtl"`, eingebettete deutsche Zitate/Paragraphen/Aktenzeichen/Daten
  in `<bdi>` (LTR-stabil in mischdirektionalem Text). `routing.ts` führt `ar` bereits als RTL.
- **Offline / Mock-Error mid-flow**: keine neue Netzabhängigkeit (seeded) → kein zusätzlicher Fehlerpfad;
  die bestehenden `loading`/`error`-States von `AISummaryBlock` bleiben unverändert.
- **Brief ohne `post_open` überhaupt**: Toggle erscheint nicht; bestehendes Verhalten.

## 10. Out of scope (explicit)

- **Keine Live-AI-Übersetzung.** Keine `/api/assistant`-Übersetzung, kein Lazy-Fetch — alle übersetzten
  Erläuterungen sind **vorab geseedet + hand-geprüft** (wow-backlog #6-Flag).
- **Keine neue Fläche / Route / Screen.** Nur `LetterCard` + `LetterReader`/`AISummaryBlock`/
  `AiErklaererCard` werden erweitert.
- **Nicht die Spine.** `track: supporting`. Zieht keine Build-Priorität vor #2 antragsloses Kindergeld /
  #3 Wohngeld.
- **Keine Übersetzung des deutschen Originals** (`body_de`) oder der `original_zitat`-Citations — die
  bleiben immer deutsch.
- **Keine Frist-/€-/Aktenzeichen-Neulokalisierung** — immer verbatim aus dem deutschen Original zitiert.
- **Keine Rechtsberatung** in irgendeiner Sprache (§ 2 RDG) — nur deskriptiv erklären.
- **§ 86a-SGG-„aufschiebende-Wirkung"-Briefe** nicht in Ship 1 geseedet (siehe §6).
- Keine sechste/siebte Sprache, kein neuer Locale-Beitritt — nur die 6 bestehenden.
- Persistenz der Brief-lokalen Sprachwahl ist optional, nicht ship-blockierend.

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alle über `t()`; `de.json` source-of-truth, 6 Locales an Parität.
- [ ] Badge „Übersetzte Erläuterung — rechtsverbindlich ist allein das deutsche Original." an **jeder**
      übersetzten Ansicht sichtbar, in DE **und** aktiver Sprache; nicht wegklappbar.
- [ ] Framing durchgängig **„Erläuterung"**, nie „Übersetzung des Bescheids".
- [ ] **Kein** übersetzter Bullet rendert Frist/€/Aktenzeichen neu — alle verbatim aus `body_de`/
      `original_zitat` zitiert.
- [ ] Unübersetztes deutsches `original_zitat` (CitationFootnote) neben **jedem** übersetzten Bullet;
      `citation_match=false` → „bitte im deutschen Original prüfen".
- [ ] Pro-Bullet `rechtsgrundlage`-Mikrozeile (Paragraphen) bleibt **deutsch**, nie übersetzt.
- [ ] Übersetzte Bullets **deskriptiv**, nie präskriptiv-rechtlich (§ 2 RDG).
- [ ] `[MOCK]`/2027-Speculative-Watermark auf jeder übersetzten Erläuterung; nichts impliziert
      Behörden-Beteiligung/-Versand/-Übersetzung.
- [ ] Föderalismus-Labels präzise (LEA/ABH = Land Berlin; Familienkasse = Bund/BA; IHK = Selbstverwaltung).
- [ ] Deutsches Original (`body_de`) von jeder übersetzten Ansicht einen Tap entfernt, erweitert nie ersetzt.
- [ ] Sprach-Toggle ist ein **echtes** Control; übersetzter Block trägt `lang`; AR = RTL mit `bdi` für
      deutsche Zitate; WCAG 2.1 AA / BITV 2.0 (supporting-tier a11y PASS).
- [ ] `translations` **seeded + hand-reviewed** (kein Lazy-AI-Fetch); Seed-Scope = exakt die drei Briefe
      aus §6, alle 5 Nicht-DE-Locales.
- [ ] Fehlende Locale-Übersetzung → graceful DE-Fallback + `fallback_de_note`; Toggle bietet ungeseedete
      Locale nicht an.

## Build log — mock-backend-coder
- date: 2026-06-28
- types added/changed: none (Typ-Slot `LetterAiSummary.translations` bestand bereits, src/types/letter.ts L124–129 — unverändert). `LetterSummaryEntry` lokal in api.ts um optionales `translations?: LetterAiSummary['translations']` erweitert (kein schemas.ts-Edit; `letterSummaryEntrySchema` ist `.passthrough()`).
- api methods added: keine (keine neue Funktion, keine neue Signatur — wie gefordert).
- backend wiring changed:
  - `src/lib/mock-backend/api.ts` L62-ish: Import `LetterAiSummary` (Typ) ergänzt.
  - `src/lib/mock-backend/api.ts` ~L509: `LetterSummaryEntry`-Shape um optionales `translations` erweitert + Doku-Kommentar.
  - `src/lib/mock-backend/api.ts` ~L2589 (extrahiereAktion cold-path): beim Persistieren von `ai_summary` zusätzlich `translations` durchgereicht — Quelle `seed.translations` (Summaries-Map) ODER das pro Brief in letters.json geseedete `existing.translations`. Rein durchgereicht, kein Lazy-AI-Fetch, keine Live-Übersetzung. (Cache-hit-Pfad bleibt unverändert: er liest `cached.ai_summary` als Ganzes, das die persistierten `translations` bereits trägt.)
- seed records added: `ai_summary.translations` in `src/data/letters.json` für 3 Briefe × 5 Nicht-DE-Locales (en/ru/uk/ar/tr) = 15 `post_open`-Übersetzungsblöcke. Briefe: `letter-abh-erinnerung-verlaengerung`, `letter-familienkasse-bewilligung`, `letter-mehmet-ihk-beitrag`. Feldform pro Locale: `{ post_open: { bullets:[{text}], citations:[{bullet_index, original_zitat}], generated_at:"2026-06-28T00:00:00.000Z", model:"[MOCK] hand-translated, human-reviewed" } }`.
- guardrails verified: `original_zitat` verbatim DEUTSCH (byte-identisch zur DE-`post_open` aus letter-summaries.json); Daten/€/Aktenzeichen/Paragraphen als verbatim deutsche Tokens in den Bullets (0 lokalisierte Datums-Verstöße); Bullets deskriptiv (§2 RDG); `citation_match=false`-Briefe (Anna LEA-Frist § 81/§ 18g, Mehmet Widerspruch § 70 VwGO) tragen das vorsichtige „im deutschen Original prüfen"-Caveat statt selbstbewusster Frist; AR natürlich-RTL mit deutschen Tokens als LTR-fähige Inline-Strings.
- scope deviation: Seed-Quelle ist de-facto `letter-summaries.json` (dort liegt `post_open`), nicht `letters.json`. Auftrag/Scope verlangten Seed in `letters.json` + Wiring in api.ts — beides befolgt: `translations` in `letters.json` unter `ai_summary` geseedet; Wiring liest `translations` sowohl aus dem Summaries-Map-Seed als auch aus dem Brief-eigenen `ai_summary.translations`. Damit ist die Spec-§6-Form (`ai_summary.translations` am Brief) erfüllt, ohne die out-of-scope `letter-summaries.json` anzufassen.
- typecheck: pass (`tsc --noEmit`, exit 0).
- known gaps: § 86a-SGG-Briefe bewusst nicht geseedet (Spec §6/§10). Brief-summaries.json blieb unangetastet — falls ein künftiger Ship Translations dort statt in letters.json pflegen will, ist der Wiring-Pfad `seed.translations` bereits vorbereitet.

## Build log — i18n-localizer
- date: 2026-06-28
- locales updated: [de, en, ru, uk, ar, tr]
- new keys: 10 per locale (1 × `posteingang.card.in_ihrer_sprache_hint` + 9 × `posteingang.erklaerer.*`), DE source authored here per §8 ownership, then DE→target direct (never via EN) into en/ru/uk/ar/tr.
- changed keys: 0
- review-needed flags resolved: 0 (none were open for this surface; none added — see below)
- quality note: track is `supporting`, but spec §8 mandates hand-translated + human-reviewed values ("kein Schnell-Default") for the badge keys, so this pass delivered genuine human-quality translations for all 10 keys — NO `needs_review` flag added. The two load-bearing legal disclaimers (`badge_nonbinding`, `badge_nonbinding_hint`) were translated faithfully and exactly in every locale; meaning preserved, never softened (message: comprehension aid only, the German original alone is legally binding).
- placement: `in_ihrer_sprache_hint` appended to the existing top-level `posteingang.card` block (sibling of `card.relative`); the 9 `erklaerer.*` keys form a NEW top-level `posteingang.erklaerer` block inserted between `posteingang.card` and `posteingang.gruppe`. DISTINCT from the pre-existing `posteingang.mockup3.erklaerer` block (untouched).
- terminology / glosses: no German Behörden-Eigenname or §-citation in this 10-key set → no parenthetical Latin gloss was needed. `[MOCK]` kept literal verbatim in `mock_watermark` across all 6. UK is a separate translation from RU. AR is RTL (container `dir="rtl"` per §4.2/§9, `html dir` flip already wired in `src/app/layout.tsx`); the only LTR tokens in the AR strings are the literal `[MOCK]` + the year `2027`, which bidi-render correctly.
- did NOT touch: `src/data/letters.json` (letter-content translations seeded by mock-backend-coder) or any component/`.tsx`/`.ts`.
- verification: structural review PASS on all 6 (balanced braces, correct commas at both insertion seams, no trailing comma after `erklaerer.original_zitat_label`, `erklaerer`→`gruppe` seam re-read; identical anchor structure line 2076–2082 across all 5 targets confirms parallel placement). JSON.parse gate is not runnable inside this agent (no Bash) — RECOMMEND main-thread `JSON.parse` on all 6 (5 locales + de + `_status.json`) before commit per the V1.5 lesson.
- known gaps: none.

## Build log — frontend-coder
- date: 2026-06-28
- screens implemented: §4.1 Posteingang-Liste (`LetterCard` Affordance-Hinweis) + §4.2 Brief-Detail (`LetterReader`/`LetterReaderProto` → `AISummaryBlock` + `AiErklaererCard`, locale-bewusste Erläuterung, Sprach-Toggle, Non-Binding-Badge, RTL).
- components created:
  - `src/components/posteingang/use-erklaerer-lang.ts` — Hook: locale-bewusste Bullet-Auswahl `translations?.[lang]?.post_open ?? post_open`, brief-lokale Sprachwahl (init = UI-Locale falls geseedet, sonst `de`; ändert NIE die UI-Locale), `options` = `de` + nur geseedete Nicht-DE-Locales, `isTranslated`/`isFallbackDe`. Exportiert auch `seededLangsFor()`.
  - `src/components/posteingang/ErklaererLangToggle.tsx` — echter shadcn-`Select` (Toggle), erscheint nur wenn > 1 Option; native Sprach-Endonyme; `aria-label` = `posteingang.erklaerer.sprache_label`.
  - `src/components/posteingang/TranslationDisclaimerBadge.tsx` — Non-Binding-Badge, sichtbar bei aktiver Sprache ≠ de, ÜBER der Bullet-Liste, nicht wegklappbar. Rendert `badge_nonbinding` (+ `_hint`) in **DE** (verbatim aus statisch importiertem `de.json` via `createTranslator`) UND in der aktiven Sprache (in-context wenn aktive == UI-Locale, sonst lazy `import()` der Locale-Messages → `createTranslator`). AR-Zeile `dir="rtl"`. Zusätzlich zum `RoterHinweisBanner`, kein Ersatz.
  - `src/components/posteingang/ErklaererBulletList.tsx` — gemeinsamer Bullet-Renderer für beide Karten: Container `lang={activeLang}` + `dir="rtl"` für `ar`; jeder Bullet behält `CitationFootnote` mit unübersetztem deutschem `original_zitat`; deutsche Paragraphen (NormTooltip) + eingebettete LTR-Runs (Daten/€/Aktenzeichen) in RTL via `<bdi dir="ltr">`; `[MOCK]`-Watermark (`mock_watermark`) am Ende übersetzter Ansichten.
- components modified:
  - `src/components/posteingang/AISummaryBlock.tsx` — Prop `aiSummary?: LetterAiSummary`; Toggle im Header; Fallback-Note; Badge; Delegation an `ErklaererBulletList`. (framer-motion-Inline-Render entfernt → in ErklaererBulletList gewandert.)
  - `src/components/posteingang/AiErklaererCard.tsx` — analog (cobalt-tinted Variante); Toggle im Header neben Illustration; Badge + Fallback + Bullet-Liste mit `bg-primary/70`-Punkt.
  - `src/components/posteingang/LetterCard.tsx` — dezenter Lokalisierungs-`Languages`-Icon (`aria-hidden`) + sr-only `card.in_ihrer_sprache_hint` in `row`- UND `card`-Variante, NUR wenn UI-Locale ≠ de UND Brief für genau diese Locale geseedet. Reines Signal, kein Control.
  - `src/components/posteingang/LetterReader.tsx` + `LetterReaderProto.tsx` — `aiSummary={letter.ai_summary}` an die Erklärer-Karten durchgereicht (beide Instanzen / mobile + desktop).
- i18n keys referenced (alle bereits in 6 Locales vorhanden, von i18n-localizer): `posteingang.card.in_ihrer_sprache_hint`, `posteingang.erklaerer.sprache_label`, `posteingang.erklaerer.badge_nonbinding`, `posteingang.erklaerer.badge_nonbinding_hint`, `posteingang.erklaerer.fallback_de_note`, `posteingang.erklaerer.mock_watermark`, `posteingang.erklaerer.original_zitat_label`. (Nicht verwendet, aber bewusst nicht gerendert, weil das Caveat im Seed-Bullettext deskriptiv kodiert ist: `sprache_de`, `frist_laut_schreiben`, `bitte_original_pruefen`.)
- für i18n-localizer zu bestätigen: alle 7 referenzierten Keys MÜSSEN in allen 6 Locales existieren (verifiziert vorhanden: `erklaerer_keys=9` + `card.in_ihrer_sprache_hint=Y` in de/en/ru/uk/ar/tr). `badge_nonbinding`(+`_hint`) hand-übersetzt je Locale — der Badge rendert exakt diese Werte zweisprachig.
- design notes: Frist/€/Aktenzeichen werden NIE in JSX neu gerendert — Bullets kommen verbatim aus dem (deutsch-tokenisierten) Seed-Text, Daten/Zahlen NICHT per Locale reformatiert. `citation_match=false`-Caveat ist im Seed deskriptiv eingebettet (z. B. „… см. в немецком оригинале"); deutsches `original_zitat` steht daneben.
- typecheck: pass (`node_modules/.bin/tsc --noEmit`, exit 0).
- lint: pass (eslint flat-config; `@eslint/eslintrc` musste in dieser Cloud-Session temporär aus dem pnpm-Store verlinkt werden — Env-Install-Gap, kein Code-Issue).
- run-to-verify: `next dev` :3000 läuft; `/posteingang` 200, `/posteingang/letter-abh-erinnerung-verlaengerung` 200.
- known gaps: keine. Persistenz der brief-lokalen Sprachwahl (localStorage, §6) bewusst nicht implementiert (laut Spec nice-to-have, nicht ship-blockierend).
- next: a11y-tester (Toggle-Control, `lang`-Auszeichnung, AR-RTL/`<bdi>`, WCAG 2.1 AA supporting-tier) → code-reviewer.

## Build log — frontend-coder (FIX: live-Pfad-Integration)
- date: 2026-06-28
- problem behoben: die erste Runde verdrahtete die Feature in `LetterReader.tsx`/`LetterReaderProto.tsx` + `AISummaryBlock`/`AiErklaererCard` — das sind aber TOTE Komponenten ohne Live-Importeur. Die Live-Route (`/posteingang`, `/posteingang/[id]`) rendert `src/components/posteingang/PosteingangInbox.tsx` mit in-file `PostDetail` + `PostItemRow`. Live-DOM-Probe (RU/AR) zeigte vorher 0 erklaerer-Knoten. Die toten Edits bleiben harmlos liegen; die Feature lebt jetzt im Live-Pfad.
- LIVE-Datei geändert: `src/components/posteingang/PosteingangInbox.tsx`
  - `PostDetail` (in-file): `useErklaererLang(letter.ai_summary, post_open)` ersetzt das direkte `letter.ai_summary?.post_open`. `worum` (bullets[0]) + „Was bedeutet das"-Bullets (bullets[1..]) kommen jetzt aus `activeSummary` (übersetzt ODER DE-Fallback). `ErklaererLangToggle` im `.ai-card-top` (neben der `ai-pill`). `TranslationDisclaimerBadge` (DE + aktive Sprache, nicht wegklappbar) im `.ai-card` über dem Inhalt bei `isTranslated`. `fallback_de_note` bei `isFallbackDe`. Die übersetzten Bedeutungs-Bullets rendert `ErklaererBulletList` (deutsches `original_zitat` je Bullet via CitationFootnote, `lang`/`dir=rtl`/`<bdi>`, [MOCK]-Watermark); DE-Ansicht behält die bestehende `.post-bullets`-Darstellung.
  - HONESTY-Guardrail eingehalten: `betragText`/`bisWannText`/`fristLabel` (deutsch-abgeleitete €/Daten via `formatBetragErklaerung`/`formatFristLabel`) UNVERÄNDERT — nur deskriptiver Bullet-Text wechselt die Sprache. Citation-`bullet_index` wird beim Bullet-1-Slice korrekt auf 0-basiert re-gemappt, damit das deutsche Zitat am richtigen Bullet bleibt.
  - `PostItemRow` (live Listen-Item, Default-`chronologisch`-View): dezenter `Languages`-Icon (`aria-hidden`) + sr-only `card.in_ihrer_sprache_hint`, nur wenn UI-Locale ≠ de UND Brief für genau diese Locale geseedet (`seededLangsFor`). `data-testid="post-item-sprache-hint"`.
  - `VorgangsGruppe`/`SonstigeGruppe` (gruppierte View) rendern `LetterCard` → erben bereits den in Runde 1 hinzugefügten Hinweis; kein zusätzlicher Eingriff nötig.
- run-to-verify (LIVE-DOM-Probe via Playwright/Chromium gegen :3000, Anna-Brief `letter-abh-erinnerung-verlaengerung`):
  - RU: `ol[lang=ru]` mit 5 Bullets; Badge bilingual (DE + „Переведённое пояснение …"); 3 deutsche Citation-Marker (`button[aria-haspopup=dialog]`); [MOCK]-Watermark TRUE; Toggle echtes Control (`aria-label="Язык пояснения"`); `worum` `lang=ru`; Betrag/Frist-Blöcke deutsch (`14.05.2027` verbatim); Listen-Hint 2×.
  - AR: `ol[lang=ar]` `dir="rtl"`; 5 `<bdi>` LTR-Inseln (§ 18g AufenthG + Datum stabil); Badge bilingual (DE + „شرح مترجَم — …"); 3 Citation-Marker; Watermark TRUE; Toggle `aria-label="لغة الشرح"`; `worum` `lang=ar` + Datum LTR.
- typecheck: pass (`tsc --noEmit`, exit 0).
- lint: keine NEUEN Findings durch diese Änderung. Zwei Findings im File sind PRE-EXISTING (auf HEAD nachgewiesen): `replyLabel`-unused-Warning (PostDetail-Prop) + `react/no-unescaped-entities` in der bestehenden „Auszug"-Quote-Zeile — nicht von dieser Feature berührt, bewusst nicht angefasst.
- known gaps: keine neuen.
- next: a11y-tester (re-audit am LIVE-Pfad PosteingangInbox) → code-reviewer.
