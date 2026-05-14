# UX-Audit: Posteingang V1.5.1

**Datum**: 2026-05-14
**Auditor**: Explore-Agent (inline-report)
**Zweck**: Eingangs-Daten für `docs/specs/design-system-v2.md` § 11.2 und Phase 6b frontend-coder

## Top-5 schwerwiegendste UX-Probleme

### 1. Information-Overload in der LetterCard
`LetterCard.tsx:103–140` rendert 7–8 visuelle Elemente in einer Reihe:
- Status-Dot + SR-Only-Text ("ungelesen"/"gelesen")
- **FristChip** (Icon + Typ-Label + Tage)
- Bullet-Separator
- **BehoerdenBadge** (Name + farbige Kategorie-Kappe)
- Brieftyp ("Steuerbescheid")
- Bullet-Separator
- **Aktenzeichen** in Monospace

Mobile (375px): Zeile bricht in 3 Reihen, CSS `flex flex-wrap items-center gap-x-3 gap-y-2` räumt chaotisch um. Nicht-deutschsprachiger oder älterer Nutzer muss kognitiv dekodieren. **"Muss ich antworten?"** nicht sofort klar. Brieftyp (z.B. "Steuerbescheid") sitzt hinter Behörde und wird übersehen.

**Hebel**: Frist-Typ + Status zuerst visuell; Aktenzeichen zu Zeile 2.

### 2. Reply-Flow = Überraschungsversand + unklare Bestätigungssemantik
- Reply-Sheet öffnen → Template wählen (z.B. "Einspruch nach AO").
- Skelett-Template → `PreInsertionModal.tsx` mit 120+ Wörtern juristischem Text öffnet.
- Nutzer klickt "Bestätigen" — unklar, dass er Template-Body akzeptiert, nicht legal endorsiert.
- Sheet wieder offen; Skelett-Body vorausgefüllt, **kein visueller Hinweis "Skelett"**.
- "Senden" → Versand-Modal-Bestätigung (Cross-Template-Versand-Pfad, `PreVersandModal.tsx`).
- `ReplyConfirmationView.tsx`: Green Check, Empfänger, "Kanal: …", Datenschutz-Link.

**Problem**: 3 Modals durchlaufen, Final-Bestätigung wirkt abrupt. Antwort-Body (was versendet wurde) **nicht inline sichtbar** — nur über "Versendete Antwort anzeigen".

**Hebel**:
1. Skelett-Body nach Modal-Bestätigung deutlich kennzeichnen ("Generierter Vortext — bitte überprüfen").
2. ReplyConfirmationView Body inline zeigen, mindestens erste 3 Zeilen.

### 3. Sticky-Frist-Action zu statisch, kein Countdown-Emotion
`StickyFristAction.tsx:69–89`: Frist-Chip zeigt `Einspruch · 3 Tage verbleibend` mit `bg-amber-100` auch bei `days <= 7`. **Nicht emotional dringend genug.**

**Hebel**:
1. Für `days < 3` → rote Palette (`bg-red-100 text-red-900`).
2. Sticky-Band immer sichtbar auf allen Breakpoints.

### 4. Filter-Entdeckbarkeit & Kategorie-Auswahl
- Desktop: `FilterButton` → `FilterPopover` mit 4 Checkboxes.
- Mobile: `FilterButton` → `FilterSheet` (full-screen).
- Button auf gleicher Linie wie `AktenzeichenSearch` + View-Switcher → visuell als "Optional" gelesen.
- Beim Switch "Chronologisch" ↔ "Nach Vorgang" bleibt Filter aktiv, **wird aber nicht visuell bestätigt** auf Nach-Vorgang-Tab.

**Hebel**:
1. Filter-Button visuell hervorheben (größer, fetter, Icon mit Count).
2. "Nach-Vorgang"-Tab mit Filter-Count-Badge.

### 5. Rechtsbehelf-Entscheidungshilfe zu dünn
`WasKannIchTunFooter.tsx` + `preInsertionModalLookup.ts` zeigen Optionen-Liste (Einspruch / Aussetzung / Säumniszuschlag-Info) ohne kontextuelle Heuristik. Nutzer mit Steuerbescheid + Nachzahlung könnte sowohl Einspruch (Berechnung falsch) ALS AUCH Aussetzung (Zahlung-jetzt-nicht-möglich) wollen.

`PreInsertionModal` zeigt nur Rechtsnormen, **keine "Tue dies wenn"-Heuristics**.

**Hebel**:
1. Optional: After-Summary-Prompt ("Sie haben eine Nachzahlung. Einspruch oder Zahlungsfrist?") nur bei `required_action.typ === "zahlung"`.
2. Tooltip-Erweiterung auf Footer-Optionen ("Einspruch lohnt sich, wenn Berechnung falsch erscheint").

## Quick wins

1. FristChip rote Palette für `days < 3` (`FristChip.tsx:57–61`).
2. Skelett-Body-Banner nach Modal-Accept im ReplySheet.
3. ReplyConfirmationView Body-Preview (first 500 chars + truncate).
4. ActiveFilterChips prominenter platzieren.
5. "Nach-Vorgang"-Tab Filter-Count-Badge.

## Strukturelle Probleme (Redesign-Spec)

1. **LetterCard Informationshierarchie radikal neu gewichten**:
   - Hauptzeile: `[Status-Severity-Icon] [Frist-Dringlichkeit] [Kernfrage: "Handlung erforderlich?"]`
   - Behörde + Brieftyp → Zeile 2.
   - Aktenzeichen → Zeile 3 (auf Mobile evtl. sr-only).

2. **Reply-Flow braucht "Review"-Stadium vor Versand**:
   - Nach Modal-Bestätigung zeigt ReplySheet Body inline (scrollbar).
   - Nutzer kann editieren (Skeleton als Prefix).
   - **DANN** erst Versand-Modal.

3. **"Was kann ich tun"-Footer braucht kontextuelle Hints**:
   - Prä-Qualifikation: "Sie haben eine **Nachzahlung** → typischerweise **Aussetzung** beantragen."
   - Pre-Insertion-Modal: visuelle Warnung "Sie erstellen ein Dokument nach rechtlichen Vorlagen. Dies ist kein Rechtsrat."

4. **Sticky-Action-Band breakpoint-agnostisch**:
   - Aktuell `md:` sticky bottom, Mobile `fixed` bottom.
   - Empfehlung: immer `fixed` bottom, `max-w-prose` Centering Desktop.

5. **Cross-Template-Versand prominenter sichtbar**:
   - Wenn Brief mehrere Fristen (Einspruch UND Aussetzung), Nutzer soll früher erkennen, dass **2 Replies versendet werden**.

## Was funktioniert und behalten werden muss

1. **LetterReader-Layout** (Original + Summary + Actions) — Dreiteilung klar auf Desktop.
2. **FristChip mit Icon + Tage-Template** — visuell einheitlich.
3. **BehoerdenBadge-Kategorien** — Bund/Land/Kommune/Sonstige. → ABER HL-DS-10: Farbe entfernen, nur Text-Label.
4. **Skeleton-Templates mit Norm-Zitaten** — Tooltips funktionieren, mindert Unsicherheit.
5. **Chronologisch-View Gruppierung** (Neu / Frist ≤7d / Frist >7d / Erledigt) — priorisiert Aufmerksamkeit richtig.
6. **MockBackend-Architektur mit localStorage**.

**V1.5.1 Hard-Lines erhalten**:
- Cross-Template-Versand (2+ Replies möglich).
- Stammdaten-Bridge (Renteninfo → Yellow-Letter).
- Archetype-Actions extensible.
- i18n-Strings für juristische Terme.

## Konkrete Files für Phase 6b frontend-coder

- `src/components/posteingang/LetterCard.tsx` — Zeilen 89–140 (Hierarchie-Rewrite)
- `src/components/posteingang/FristChip.tsx` — Zeilen 57–61 (Palette-Logik)
- `src/components/posteingang/ReplySheet.tsx` — nach Modal-Confirm (~Z. 230), Body-Preview-Banner
- `src/components/posteingang/ReplyConfirmationView.tsx` — Body-Preview inline (Z. 74–82)
- `src/components/posteingang/StickyFristAction.tsx` — Z. 137–166 (fixed-positioning alle Breakpoints; optionale 1s-outline-highlight)
- `src/components/posteingang/PreInsertionModal.tsx` — Z. 75–100 (Disclaimer-Callout)
- `src/components/posteingang/WasKannIchTunFooter.tsx` — Z. 69–140 (pre-action-hint)
- `src/components/posteingang/PosteingangInbox.tsx` — Z. 330–335 (ActiveFilterChips prominence; Tab-Badge)
- `src/lib/i18n/locales/de.json` — `posteingang.*` Strings

## Erhaltene Hard-Lines aus V1.5/V1.5.1

1. Norm-Zitate + Tooltips — nicht entfernen.
2. Skelett-Template Pre-Insertion-Modal — Spec § 7 verbatim.
3. Cross-Template-Versand-Stapel — 2+ Replies.
4. Stammdaten-Bridge (Yellow-Letter).
5. Brieftyp-Archetypen (16+ Typen).
6. Authentizitäts-Badge + Auth-Channel-Hint.

**Fazit**: V1.5.1 hat technische Substanz, aber User-Flow-Klarheit ist fragmentiert. Phase 6b fokussiert auf **emotional klare Hierarchie** und **Review-vor-Versand**.
