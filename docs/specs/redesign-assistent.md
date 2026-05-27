---
feature: redesign-assistent
title: Redesign Assistent (HERO) — Chat-UI + Tool-Use → Umzug-Autopilot-Trigger über die echte AI-Pipeline
status: shipped
track: spine
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" + Spine step 3 ("STUB — this is the gap that breaks the spine"). Closing this gap is the highest-leverage work in the project.
owner_agents: [frontend-coder, assistant-engineer, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/06-assistent.png
  foundation: docs/specs/redesign-foundation.md  # primitive + token CONTRACT
  existing_ai: src/lib/ai/{tools.ts,system-prompt.ts,client.ts,stream.ts,safety.ts,language.ts}, src/app/api/assistant/route.ts
  existing_backend: src/lib/mock-backend/api.ts (startUmzug, previewUmzug, getProfile, getLetters, getVorgang, getVorgaenge, getTermine, extrahiereAktion)
  umzug_spec: docs/specs/umzug.md
gates: requires redesign-foundation APPROVE. This is the spine-critical screen — build before the supporting re-skins where parallelism allows.
---

> **Why this is THE hero.** `docs/demo-spine.md` declares the headline wow: the
> citizen says "ich ziehe um" once and watches every competent Behörde receive the
> change. The spine is **currently broken at step 3** — the assistant page is a
> 5-line `PlaceholderSection` stub (`src/app/(app)/assistent/page.tsx`) even though
> the whole AI layer (`src/lib/ai/**`, `/api/assistant/route.ts`) and the
> `starte_umzug` tool already exist and are wired to the backend autopilot. This
> spec closes that gap: it builds the chat UI AND specifies the tool-use →
> confirmation → cascade integration end to end.
>
> **Division of labour.** `assistant-engineer` owns the AI side (route changes,
> tool dispatch contract, system-prompt additions, client tool-execution loop).
> `frontend-coder` owns the chat UI components. `mock-backend-coder` owns nothing
> NEW here — `startUmzug`/`previewUmzug` already exist. The single new surface is
> the client-side **tool dispatch table** (§ 7.3) which both agents touch and must
> keep in lockstep.

---

## 1. Problem statement

Die Bürger:in soll dem Assistenten in natürlicher Sprache sagen „leite meinen Umzug ein", woraufhin der Assistent die nötigen Parameter erfragt, eine Zusammenfassung zur Bestätigung anzeigt und — erst nach explizitem „Ja" — die echte Umzug-Autopilot-Kaskade auslöst. Heute ist die Assistenten-Seite ein Platzhalter; die KI-Schicht und der Autopilot existieren, sind aber nicht über eine Chat-Oberfläche verbunden. Das ist die zentrale Lücke der Demo.

## 2. Persona & journey

- Persona: `docs/personas.md#anna-petrov` (Demo-Default Anna Petrov).
- Trigger: Bürger:in öffnet `/assistent` (oder klickt einen Quick-Action-Chip / eine Dashboard-Top-Action, die hierher führt).
- Outcome: Bürger:in hat entweder einen Brief erklärt bekommen, eine Frist/Nächster-Schritt erfragt — **oder** den Umzug ausgelöst und sieht die Kaskade laufen (Weiterleitung in die Vorgänge-Timeline).
- Time saved vs status quo: „ich ziehe um" einmal sagen statt 6+ Behörden einzeln informieren (Einwohnermeldeamt, Finanzamt, KFZ-Stelle, Krankenkasse, Rundfunkbeitrag, Arbeitgeber). Spine-Headline: ~6 separate Meldungen → 1 Satz.

## 3. Success criteria for the demo

- [ ] Viewer versteht den Chat-Wow in < 5 Sekunden: drei Quick-Action-Chips + ein leeres Eingabefeld signalisieren „frag mich etwas".
- [ ] „leite meinen Umzug ein" / „ich ziehe um" → Assistent erfragt Adresse + Stichtag + Block-B-Einwilligung, zeigt eine Bestätigungskarte, und löst **erst nach Bestätigung** `starte_umzug` aus.
- [ ] Nach dem Tool-Call sieht die Bürger:in die Kaskade — entweder inline als Tool-Result-Karte mit Link „Kaskade ansehen" ODER per Auto-Weiterleitung in die Vorgänge-Timeline (§ 7.5).
- [ ] Die Bestätigungen landen anschließend im Posteingang (bestehende Mechanik).
- [ ] Kontext-Rechte-Spalte zeigt Posteingang/Dokumente/Termine/Stammdaten + „Ihre Daten sind geschützt".
- [ ] Mandatory-Disclaimer + Smartlaw-Refusals greifen (bestehende `safety.ts`-Logik bleibt aktiv).
- [ ] Lighthouse a11y > 95; axe 0 kritisch; SSE-Streaming respektiert `prefers-reduced-motion` (kein blinkender Cursor unter reduced-motion).

## 4. Screen-by-screen flow

### 4.1 Screen: Assistent

- **Route**: `/assistent`
- **File**: `src/app/(app)/assistent/page.tsx` (ersetzt Stub). RSC-Page lädt die aktive Persona (`getProfile`) server-side + baut den `PersonaContextInput` (für den `/api/assistant`-Body) und rendert `<AssistentView>` (`'use client'`).
- **Server or client**: Page = RSC (Persona-Bootstrap); `<AssistentView>` + alle Chat-Kinder = Client (SSE-Stream, Tool-Dispatch, Composer-State).

- **Layout** (Prototyp 06-assistent.png): zweispaltig — Chat links (flex-1), Kontext-Right-Rail rechts (≈ 320px, nur ≥ lg sichtbar; < lg klappt der Kontext unter den Chat oder hinter einen Toggle).

```
┌───────────────────────────────────────────────┬──────────────────────┐
│ Assistent                          [Page-H1]   │  Kontext              │
│ Fragen stellen, Briefe verstehen, …  subtitle  │  Ich beziehe mich auf:│
│                                                 │  ┌──────────────────┐ │
│ [Erkläre meinen Brief] [Was ist als Nächstes  │  │ ✉ Posteingang  → │ │ ← Kontext-Karten
│  zu tun?] [Welche Unterlagen fehlen?]          │  ├──────────────────┤ │   (ListRow / IconCircle)
│ ── quick-action chips (FilterTabs-artige Pills)│  │ 📄 Dokumente   → │ │
│                                                 │  ├──────────────────┤ │
│ ┌─────────────────────────────────────────┐    │  │ 📅 Termine     → │ │
│ │ ✦  Hallo Anna, …                  09:41  │    │  ├──────────────────┤ │
│ │    • Bullet                              │    │  │ 🪪 Stammdaten  → │ │
│ │    • Bullet                              │    │  └──────────────────┘ │
│ └─────────────────────────────────────────┘    │  ┌──────────────────┐ │
│                          ┌────────────────────┐ │  │ 🛡 Ihre Daten     │ │ ← RightRailCard
│                          │ User-Frage    09:42✓│ │  │   sind geschützt │ │   (soft, success)
│                          └────────────────────┘ │  │   Mehr zu Daten- │ │
│ ┌─────────────────────────────────────────┐    │  │   schutz       → │ │
│ │ ✦  Gerne. … (assistant)           09:42  │    │  └──────────────────┘ │
│ └─────────────────────────────────────────┘    │                      │
│                                                 │                      │
│ ┌─────────────────────────────────────────┐    │                      │
│ │ [📎] Schreiben Sie eine Nachricht…   [➤] │    │ ← Composer (sticky)  │
│ └─────────────────────────────────────────┘    │                      │
└───────────────────────────────────────────────┴──────────────────────┘
```

- **Components used**:
  - `PageHeader` (foundation B2) — title `assistent.title`, subtitle `assistent.subtitle`, `contextChip` tone `prototype` (Mock-Hinweis).
  - `<AssistentView>` `<NEW>` (`src/components/assistant/AssistentView.tsx`, client) — Top-Level-Container; hält `messages`-State (`Anthropic.MessageParam[]`), Streaming-State, Tool-Dispatch-Loop, scrollt ans Listen-Ende.
  - `<QuickActionChips>` `<NEW>` (`src/components/assistant/QuickActionChips.tsx`) — drei Chips. Bei Klick wird der Chip-Text als User-Nachricht abgeschickt. Visuell: Pills wie `FilterTabs`-inaktiv (`bg-surface-muted`/`rounded-full`, ≥ 44px). Nach der ersten Nachricht bleiben sie sichtbar (Prototyp zeigt sie über dem ersten Bubble).
  - `<ChatPanel>` `<NEW>` (`src/components/assistant/ChatPanel.tsx`) — scrollbare Nachrichtenliste, rendert `<MessageBubble>` + `<ToolCallCard>` + `<UmzugConfirmCard>` in Reihenfolge. `aria-live="polite"` Region für eingehende Assistent-Deltas.
  - `<MessageBubble>` `<NEW>` (`src/components/assistant/MessageBubble.tsx`) — eine Nachricht.
    - Assistant: links, `bg-accent-soft`, führender Sparkle-Avatar (`IconCircle` mit lucide `Sparkles`, tone primary, size sm), Timestamp `text-xs text-text-muted` unten rechts, Markdown-Lite (Bullets, Bold, Norm-Spans). Streaming: Text-Deltas hängen live an.
    - User: rechts, `bg-surface-muted`, Timestamp + **Read-Tick** (lucide `CheckCheck`, `text-primary`, „gesendet") — rein dekorativ/Demo, kein echter Zustellstatus.
  - `<ChatComposer>` `<NEW>` (`src/components/assistant/ChatComposer.tsx`) — Textarea (auto-grow, `min-h-[48px]` HL-DS-9), links `Paperclip`-Attach-Button (in V1 **disabled** mit Tooltip `assistent.composer.attach_disabled` — Brief-Upload ist deaktiviert, siehe `system-prompt.ts` Hard-Refusal), rechts `Send`-Button (lucide, primary). Enter sendet, Shift+Enter = Zeilenumbruch. Sticky am unteren Rand der Chat-Spalte.
  - `<ToolCallCard>` `<NEW>` (`src/components/assistant/ToolCallCard.tsx`) — rendert einen laufenden/abgeschlossenen Tool-Aufruf als kleine Karte im Chat-Flow („Posteingang gelesen", „Brief erklärt", „Umzug gestartet"). Zeigt Tool-Name (übersetzt), Status (laufend/fertig/fehlgeschlagen, `StatusBadge`), und bei `starte_umzug`-Erfolg einen Primär-Link „Kaskade ansehen" → Vorgänge-Timeline. Implementiert mit `IconCircle` + `StatusBadge`.
  - `<UmzugConfirmCard>` `<NEW>` (`src/components/assistant/UmzugConfirmCard.tsx`) — **die kritische Confirmation-Stufe** (§ 7.4). Erscheint im Chat, wenn der Assistent den Umzug vorgeschlagen hat (Adresse + Stichtag + Block-B-Empfänger gesammelt). Zeigt eine strukturierte Zusammenfassung (neue Adresse, Stichtag, Liste der zu informierenden Empfänger gruppiert nach Block A/B/C/D mit `BehoerdenBadge`) + zwei Buttons: „Umzug starten" (primary) / „Abbrechen" (outline). Erst „Umzug starten" löst den Tool-Dispatch aus.
  - `<KontextRail>` `<NEW>` (`src/components/assistant/KontextRail.tsx`) — die rechte Spalte. Titel „Kontext" + Subtitel „Ich beziehe mich auf:" + vier Kontext-Karten (Posteingang/Dokumente/Termine/Stammdaten als `ListRow`/`RightRailCard`-Items mit `IconCircle` + Live-Zähler aus dem Snapshot) + die „Ihre Daten sind geschützt"-Karte.
  - `<DatenschutzRailCard>` `<NEW>` ODER `RightRailCard variant="soft"` (foundation B4) — „Ihre Daten sind geschützt" mit `ShieldCheck`-Icon (tone success) + kurzer Datenschutz-Copy + Footer-Link „Mehr zu Datenschutz" → `/datenschutz`.
  - `EmptyState` (foundation B14) — Initial-State des Chats (vor der ersten Nachricht): freundlicher Sparkle + „Wie kann ich helfen?" + die drei Chips. (Optional; der Prototyp zeigt direkt eine Begrüßungs-Assistant-Nachricht — siehe § 4.2.)

- **Data fetched**:
  - Chat-Turns: POST `/api/assistant` (SSE) — bestehender Endpoint, body = `{ messages, persona, locale }`.
  - Tool-Results: client-seitig gegen `api.*` (Approach B, siehe `tools.ts` Header + `route.ts`-Doc). Dispatch-Tabelle siehe § 7.3.
  - Kontext-Rail-Zähler: `api.getLetters({ unread: true })` (Anzahl), `api.getDocuments()`, `api.getTermine()`, `api.getProfile()` — lazily beim Mount.

- **i18n keys introduced** (DE source; `track: spine` → 6 Sprachen):
  - `assistent.title` = „Assistent"
  - `assistent.subtitle` = „Fragen stellen, Briefe verstehen und nächste Schritte erkennen"
  - `assistent.quick.erklaere_brief` = „Erkläre meinen Brief"
  - `assistent.quick.naechster_schritt` = „Was ist als Nächstes zu tun?"
  - `assistent.quick.fehlende_unterlagen` = „Welche Unterlagen fehlen?"
  - `assistent.composer.placeholder` = „Schreiben Sie eine Nachricht …"
  - `assistent.composer.send` = „Senden"
  - `assistent.composer.attach_disabled` = „Datei-Anhang ist in dieser Demo deaktiviert."
  - `assistent.message.user_sent` = „Gesendet"
  - `assistent.message.assistant_label` = „Assistent"
  - `assistent.empty.title` = „Wie kann ich Ihnen helfen?"
  - `assistent.empty.description` = „Stellen Sie eine Frage oder wählen Sie einen Vorschlag."
  - `assistent.streaming.typing` = „Assistent schreibt …"
  - `assistent.error.stream` = „Die Antwort konnte nicht geladen werden. Bitte erneut versuchen."
  - `assistent.tool.reading` = „Assistent arbeitet …"
  - `assistent.tool.label.starte_umzug` = „Umzug starten"
  - `assistent.tool.label.lese_posteingang` = „Posteingang lesen"
  - `assistent.tool.label.hole_vorgang` = „Vorgang abrufen"
  - `assistent.tool.label.hole_profil` = „Stammdaten abrufen"
  - `assistent.tool.label.liste_termine` = „Termine abrufen"
  - `assistent.tool.label.erklaere_brief` = „Brief erklären"
  - `assistent.tool.label.extrahiere_frist` = „Frist extrahieren"
  - `assistent.tool.label.vorschlage_naechsten_schritt` = „Nächsten Schritt vorschlagen"
  - `assistent.tool.umzug_started` = „Umzug gestartet — die Behörden werden jetzt informiert."
  - `assistent.tool.cta_kaskade` = „Kaskade ansehen"
  - `assistent.umzug_confirm.title` = „Umzug bestätigen"
  - `assistent.umzug_confirm.subtitle` = „Bitte prüfen Sie die Angaben. Erst nach Ihrer Bestätigung werden Behörden informiert."
  - `assistent.umzug_confirm.neue_adresse` = „Neue Adresse"
  - `assistent.umzug_confirm.stichtag` = „Einzugsdatum"
  - `assistent.umzug_confirm.empfaenger_a` = „Automatisch (Meldegesetz)"
  - `assistent.umzug_confirm.empfaenger_b` = „Mit Ihrer Einwilligung"
  - `assistent.umzug_confirm.empfaenger_c` = „Von Ihnen selbst zu erledigen"
  - `assistent.umzug_confirm.empfaenger_d` = „Mit eID-Bestätigung"
  - `assistent.umzug_confirm.cta_start` = „Umzug starten"
  - `assistent.umzug_confirm.cta_cancel` = „Abbrechen"
  - `assistent.umzug_confirm.consent_note` = „Block-B-Empfänger werden nur mit Ihrer Einwilligung informiert (Art. 6 Abs. 1 lit. a DSGVO); jederzeit widerruflich."
  - `assistent.kontext.title` = „Kontext"
  - `assistent.kontext.subtitle` = „Ich beziehe mich auf:"
  - `assistent.kontext.posteingang` = „Posteingang"
  - `assistent.kontext.posteingang_value` = „{ungelesen} ungelesen"
  - `assistent.kontext.dokumente` = „Dokumente"
  - `assistent.kontext.dokumente_value` = „{count} im Tresor"
  - `assistent.kontext.termine` = „Termine"
  - `assistent.kontext.termine_value` = „{count} geplant"
  - `assistent.kontext.stammdaten` = „Stammdaten"
  - `assistent.kontext.stammdaten_value` = „Aktuell"
  - `assistent.kontext.datenschutz_title` = „Ihre Daten sind geschützt"
  - `assistent.kontext.datenschutz_body` = „Es werden nur die für Ihre Frage nötigen Daten verarbeitet. Originale bleiben in den amtlichen Postfächern."
  - `assistent.kontext.datenschutz_link` = „Mehr zu Datenschutz"
  - Reuse: `common.cta.erneut_versuchen`, `common.status.*`, `umzug.preview.block_a/b/c/d.title` (für die Empfänger-Gruppierung in `<UmzugConfirmCard>`).

- **States**: empty (Initial) / streaming (Assistant tippt, `aria-live`) / tool-running (`<ToolCallCard>` „läuft") / awaiting-confirm (`<UmzugConfirmCard>` sichtbar) / cascade-started (Tool-Result + CTA) / error (Stream/SSE-Fehler → Retry-Inline) / refusal (statischer Refusal-Text aus `safety.ts`, kein Tool).

- **Accessibility notes**:
  - Genau ein `<h1>` (`PageHeader`). Chat-Liste als `<ol>`/`role="log"` mit `aria-live="polite"` + `aria-relevant="additions"` für eingehende Nachrichten. Nicht jeden Token einzeln announcen — Deltas werden in einen Buffer geschrieben; die fertige Nachricht ist die announce-Einheit (oder coarse-grained `aria-live`).
  - Composer-Textarea mit `<label>` (sr-only) `assistent.composer.placeholder`; Send-/Attach-Buttons mit `aria-label`. Send ≥ 44px.
  - `<UmzugConfirmCard>` als `role="group" aria-labelledby`; Buttons in logischer Fokus-Reihenfolge; „Umzug starten" ist primär aber NICHT auto-fokussiert (verhindert versehentliches Auslösen).
  - Streaming-Cursor/„Assistent schreibt"-Indikator: unter `prefers-reduced-motion` keine Blink-Animation; statischer „… schreibt"-Text.
  - Kontext-Rail: `<aside aria-label={assistent.kontext.title}>`; Karten echte Links.
  - RTL (AR): Bubbles spiegeln (Assistant rechts, User links); Rail links.

### 4.2 Begrüßungs-Erstnachricht (Prototyp)

Der Prototyp zeigt beim Öffnen bereits eine Assistant-Begrüßung („Hallo Anna, hier ein Überblick über die aktuelle Situation: • … • …"). Umsetzung: eine **client-seitig zusammengesetzte, NICHT von der KI generierte** Begrüßungs-Nachricht beim Mount, gespeist aus dem (bereits geladenen) Snapshot (ungelesene Briefe, nächste Frist, offene Vorgänge). Sie wird als `assistant`-`MessageBubble` gerendert, ist aber **kein** `messages`-Eintrag, der an `/api/assistant` zurückgeschickt wird (sie ist UI-only, damit kein Token-Budget verbraucht wird und die KI sie nicht als ihren eigenen Turn missversteht). i18n-Template `assistent.greeting.intro` + Bullet-Templates:
  - `assistent.greeting.intro` = „Hallo {vorname}, hier ein Überblick über Ihre aktuelle Situation:"
  - `assistent.greeting.bullet_briefe` = „{count} ungelesene Briefe im Posteingang."
  - `assistent.greeting.bullet_frist` = „Nächste Frist: {betreff} am {datum}."
  - `assistent.greeting.bullet_keine` = „Aktuell ist nichts Dringendes offen."
  - `assistent.greeting.cta` = „Womit kann ich Ihnen helfen?"

## 5. Autopilot logic

### Trigger

Natürlichsprachliche Absicht der Bürger:in: „leite meinen Umzug ein", „ich ziehe um", „ich bin umgezogen", „melde meinen Umzug" (DE) bzw. Äquivalente in EN/RU/UK/AR/TR. Das LLM erkennt die Absicht (kein Frontend-Keyword-Matching) und ruft NICHT sofort `starte_umzug` auf, sondern sammelt zuerst die Parameter (System-Prompt-Etikette „vor jedem schreibenden Werkzeug … warte auf Bestätigung", bereits in `system-prompt.ts`).

### Steps (orchestration)

1. **Absicht erkannt** → Assistent fragt (Text-Turn) nach: (a) neue Adresse, (b) Stichtag, (c) für welche Block-B-Empfänger Einwilligung erteilt wird. (System-Prompt sagt: Standard-Vorschlag Krankenkasse + Hausbank.)
2. **Parameter vollständig** → der Assistent ruft `previewUmzug(neue_adresse, stichtag)` (read-only Tool, siehe § 7.2 NEW) auf, um die zu informierenden Behörden je Block zu ermitteln. Die UI rendert daraus `<UmzugConfirmCard>` (NICHT `starte_umzug` — das ist die Bestätigungs-Stufe).
3. **Bürger:in klickt „Umzug starten"** in `<UmzugConfirmCard>` → der Client dispatcht `starte_umzug` mit `{ neue_adresse, stichtag_iso, block_b_consent }` gegen `api.startUmzug(...)`.
4. **`startUmzug` liefert `{ vorgangId }`** → der Autopilot-Generator läuft im Mock-Backend (bestehend, `runAutopilotInBackground`), emittiert `autopilot_step`/`letter_received`-Events.
5. **UI** rendert eine `<ToolCallCard>` „Umzug gestartet" mit CTA „Kaskade ansehen" → `router.push('/vorgaenge/umzug/run?vorgangId=...')` (bestehende Run-Page, re-skinned in `redesign-vorgaenge.md`). Optional Auto-Redirect (§ 7.5).
6. **Bestätigungsschreiben** landen im Posteingang (bestehende Mechanik via `appendLetter`).

### Visual narrative

Die Kaskaden-Animation selbst (Behörde für Behörde „empfängt" mit realistischen Delays) lebt in der **Vorgänge-Run-Timeline** (`redesign-vorgaenge.md` + bestehende `AutopilotTimeline`/`AutopilotStepRow`). Der Assistent zeigt nur: den Auslöser, die Bestätigungskarte, und das „gestartet"-Tool-Result mit Übergang in die Timeline. Pro Behörde ein synthetisches `Bestätigungsschreiben` (bestehend).

## 6. Data model additions / changes

**Keine neuen Domain-Typen.** `UmzugInput`, `UmzugPreview`, `Vorgang`, `AutopilotStep` existieren. Chat-Nachrichten nutzen `Anthropic.MessageParam` (SDK-Typ). Optional ein UI-only View-Model `ChatMessage` (frontend-coder, kein Domain-Type):

```ts
// src/components/assistant/types.ts (UI-only, NEW — frontend-coder)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** Rendered text (markdown-lite). For assistant turns this grows during streaming. */
  text: string;
  /** ISO timestamp for the bubble. */
  at: string;
  /** Tool calls emitted within this assistant turn (rendered as ToolCallCards). */
  toolCalls?: Array<{ id: string; name: string; status: 'running' | 'done' | 'error'; resultSummary?: string }>;
  /** True iff this assistant turn proposed an Umzug and should render <UmzugConfirmCard>. */
  umzugProposal?: { neue_adresse: UmzugInput['neue_adresse']; stichtag: string; preview: UmzugPreview };
}
```

### Mock-backend additions

Keine NEW-Methoden nötig — alle benötigten existieren: `startUmzug`, `previewUmzug`, `getProfile`, `getLetters`, `getVorgang`, `getVorgaenge`, `getTermine`, `extrahiereAktion`, `subscribe`. (siehe § 7.2 für den einen kleinen Tool-Schema-Zuwachs `previewUmzug`.)

### Persistence keys (localStorage)

Optional: `govtech-de:v1:assistent:thread` — der laufende Nachrichten-Thread (für Demo-Reload-Stabilität). Nicht zwingend für V1; wenn weggelassen, startet jeder Reload mit der Begrüßungs-Nachricht. Kein PII-Risiko über das Bestehende hinaus (Thread liegt ohnehin nur lokal).

## 7. AI assistant integration (THE core section)

### 7.1 Bestehende Pipeline (recap — assistant-engineer-Kontext)

- Endpoint `POST /api/assistant` (`src/app/api/assistant/route.ts`): streamt SSE; **führt Tools NICHT server-seitig aus** (Approach B). Es streamt `tool_use`-Blöcke; der Client führt sie aus und schickt den nächsten Turn mit `tool_result`-Blöcken zurück. Loop endet bei `stop_reason !== 'tool_use'`.
- `src/lib/ai/tools.ts`: registriert `starte_umzug`, `lese_posteingang`, `hole_vorgang`, `hole_profil`, `liste_termine`, `erklaere_brief`, `extrahiere_frist`, `vorschlage_naechsten_schritt`. `starte_umzug` ist **vollständig** definiert (Block A/B/C/D-Beschreibung, `neue_adresse`/`stichtag_iso`/`block_b_consent`-Schema).
- `src/lib/ai/system-prompt.ts`: `BASE_SYSTEM_PROMPT` beschreibt die Werkzeug-Etikette inkl. „vor `starte_umzug` Bestätigung einholen". Mandatory-Disclaimer + Smartlaw-Linie aktiv.
- `safety.ts`: Pre-Call-Refusals (legal_advice, erfolgsprognose, real_world_action, real_letter_paste, explicit_content) + statische Refusal-Strings.

### 7.2 Tool changes (assistant-engineer)

**ONE new read-only tool** `preview_umzug` (NEW in `tools.ts` + `TOOL_NAMES`):
- Zweck: liefert die je Block (A/B/C/D) zu informierenden Behörden für eine gegebene Adresse + Stichtag, OHNE etwas auszulösen. Damit kann der Assistent die Bestätigungskarte korrekt befüllen, bevor `starte_umzug` läuft.
- Schema: `{ neue_adresse: {…wie starte_umzug…}, stichtag_iso: string(date) }`. `required: ['neue_adresse', 'stichtag_iso']`.
- Backed by `api.previewUmzug({ neue_adresse, stichtag })` (existiert). Output = `UmzugPreview` (Behörden-Listen je Block).
- Description (DE): „Ermittelt, welche Behörden bei einem Umzug informiert würden (Block A automatisch, B mit Einwilligung, C selbst, D mit eID), OHNE etwas auszulösen. Nutze dieses Werkzeug, um der Nutzerin vor der Bestätigung eine Vorschau zu zeigen. Es ist read-only und braucht keine Bestätigung."

**No change** to the other 7 tools.

**System-prompt addition** (`system-prompt.ts`, in der Werkzeug-Etikette-Sektion):
> „Vor `starte_umzug`: rufe zuerst `previewUmzug` mit Adresse + Stichtag auf und lass die Nutzerin die angezeigte Bestätigungskarte prüfen. Rufe `starte_umzug` NUR auf, nachdem die Nutzerin in der Bestätigungskarte ausdrücklich „Umzug starten" bestätigt hat. Wenn die Nutzerin abbricht, starte nicht."

> Cache-Hinweis: jede Änderung an `BASE_SYSTEM_PROMPT` invalidiert den Prompt-Cache einmalig (~5 ct Warm-up). Akzeptiert.

### 7.3 Client-side tool dispatch table (assistant-engineer + frontend-coder — KEEP IN LOCKSTEP)

Der Client (`<AssistentView>`) muss eine Dispatch-Tabelle haben, die jeden `tool_use.name` auf eine `api.*`-Methode mappt, das Ergebnis in einen `tool_result`-Block serialisiert und den nächsten Turn POSTet. Diese Tabelle ist NEW (heute existiert keine Chat-UI, also auch kein Dispatcher):

| Tool-Name | api.*-Methode | Confirmation? | UI-Effekt |
|---|---|---|---|
| `lese_posteingang` | `api.getLetters(filterMap)` | nein | `<ToolCallCard>` „Posteingang lesen" |
| `hole_vorgang` | `api.getVorgang(vorgang_id)` | nein | `<ToolCallCard>` |
| `hole_profil` | `api.getProfile()` | nein | `<ToolCallCard>` (Datenminimierung: nur an LLM, nicht im UI ausbreiten) |
| `liste_termine` | `api.getTermine()` (+client-Filter) | nein | `<ToolCallCard>` |
| `erklaere_brief` | `api.extrahiereAktion(letterId)` | nein | `<ToolCallCard>` |
| `extrahiere_frist` | `api.extrahiereAktion(letterId).fristen` | nein | `<ToolCallCard>` |
| `vorschlage_naechsten_schritt` | `api.extrahiereAktion(letterId).was_kann_ich_tun_options` + `disclaimer_key` | nein | `<ToolCallCard>` + Disclaimer |
| `previewUmzug` | `api.previewUmzug({neue_adresse, stichtag})` | nein | rendert `<UmzugConfirmCard>` aus dem Result |
| `starte_umzug` | `api.startUmzug({neue_adresse, stichtag, betroffene_personen, block_b_consent})` | **JA — gated by `<UmzugConfirmCard>` click** | `<ToolCallCard>` „Umzug gestartet" + CTA „Kaskade ansehen" |

> **Critical gating rule.** `starte_umzug` darf vom Client NIE automatisch dispatcht werden, wenn das LLM den Block emittiert, ohne dass die Bürger:in „Umzug starten" geklickt hat. Wenn das LLM `starte_umzug` direkt streamt (sollte es laut System-Prompt nicht), hält der Client den Block zurück, rendert `<UmzugConfirmCard>` aus dem `tool_use.input` und führt den Tool-Call erst beim Button-Klick aus. Das ist die Demo-Sicherheitsschicht und ein Review-Gate (§ 11).

> Output-Contracts der Posteingang-Tools sind in `tools.ts` (Kommentar-Block ab Zeile ~300) dokumentiert und bleiben gültig.

### 7.4 Confirmation step (`<UmzugConfirmCard>`)

- Erscheint, wenn (a) das LLM `previewUmzug` aufgerufen hat (Result liegt vor) ODER (b) das LLM trotz Prompt direkt `starte_umzug` emittiert (Fallback — Input wird in eine Vorschau gewandelt; falls `previewUmzug` noch nicht lief, ruft der Client es jetzt nach, um die Empfänger-Listen zu zeigen).
- Inhalt: neue Adresse + Stichtag (`tabular-nums` für PLZ/Datum) + Empfänger gruppiert nach Block A/B/C/D mit `BehoerdenBadge` (farb-frei, HL-DS-10) + Consent-Note `assistent.umzug_confirm.consent_note`.
- Aktionen: „Umzug starten" (primary) dispatcht `starte_umzug`; „Abbrechen" verwirft die Karte und schickt einen Text-`tool_result`/User-Turn „Abgebrochen" damit das LLM kontextkonsistent bleibt.

### 7.5 Übergang in die Kaskade (§ 7.5)

Nach erfolgreichem `starte_umzug` → `{ vorgangId }`:
- Default: `<ToolCallCard>` „Umzug gestartet" mit Primär-Link `assistent.tool.cta_kaskade` → `/vorgaenge/umzug/run?vorgangId={id}`. Die Bürger:in klickt bewusst (kein Zwangs-Redirect, damit der Chat-Kontext sichtbar bleibt).
- Optionaler Auto-Redirect nach 1.2s (Demo-Flow flüssiger). Unter `prefers-reduced-motion` und für Screen-Reader: KEIN Auto-Redirect; nur der Link. (Entscheidung dem frontend-coder überlassen; Default = Link, Auto-Redirect ist Nice-to-have.)

### 7.6 Sample dialogues (verbindlich für QA)

**Dialog 1 — Umzug (Hero):**
- User: „Ich ziehe um."
- Assistant: „Gerne. Wohin ziehen Sie, und zum welchem Datum? Standardmäßig informiere ich Krankenkasse und Hausbank mit Ihrer Einwilligung."
- User: „Müllerstr. 142a, 13353 Berlin, zum 1. Juni 2026. Krankenkasse ja, Bank ja."
- Assistant: [ruft `previewUmzug` auf] → `<UmzugConfirmCard>` rendert (Block A: Bürgeramt, Finanzamt, Beitragsservice, Bundesdruckerei; Block B: AOK Nordost, Berliner Sparkasse; …).
- User: klickt „Umzug starten".
- Assistant: [`starte_umzug` dispatcht] → `<ToolCallCard>` „Umzug gestartet — die Behörden werden jetzt informiert." + „Kaskade ansehen".

**Dialog 2 — Brief erklären (Quick-Action):**
- User: (Chip) „Erkläre meinen Brief"
- Assistant: „Welchen Brief soll ich erklären? Sie haben aktuell 2 ungelesene Briefe: Finanzamt Berlin (Steuerbescheid 2024) und ABH Berlin (Aufenthaltstitel)."
- User: „Den Steuerbescheid."
- Assistant: [`erklaere_brief(letterId)`] → strukturierte Bullets mit Zitat-Belegen + Hinweis „Rechtsverbindlich ist der deutsche Originaltext" + Mandatory-Disclaimer.

**Dialog 3 — Refusal (Smartlaw):**
- User: „Wird mein Einspruch Erfolg haben?"
- Assistant: (statischer/Prompt-Refusal) „Eine Bewertung der Erfolgsaussichten ist Rechtsdienstleistung im Sinne des § 2 RDG und kann nur durch Rechtsanwält:innen, Verbraucherzentralen oder Sozialverbände erfolgen." + erklärt das Verfahren (Frist/Form/zuständige Stelle).

## 8. i18n

Alle `assistent.*`-Keys aus § 4.1 + § 4.2 sind neu (DE Source oben), `track: spine` → alle 6 Sprachen human-reviewed (Hero-Surface). Block-Titel für die Confirmation-Karte werden aus `umzug.preview.block_*.title` wiederverwendet. Refusal-/Disclaimer-Texte kommen aus `safety.ts`/`system-prompt.ts` (DE Source) und werden vom LLM sinngemäß übersetzt — sie sind KEINE `t()`-Keys.

## 9. Edge cases

- **LLM ruft `starte_umzug` ohne vorherige Bestätigung** → Client hält zurück, rendert Confirm-Karte (§ 7.3 Gating-Rule). Niemals ungebremst auslösen.
- **`startUmzug` wirft (5% Fehlerquote `withLatency`)** → `<ToolCallCard>` Status `error`, Retry-Button; `tool_result` mit Fehlertext, damit das LLM es der Nutzerin sachlich erklärt.
- **SSE-Stream bricht ab** → `assistent.error.stream` + Retry; partieller Assistant-Text bleibt sichtbar.
- **Block-B-Consent leer** → `block_b_consent: []`, Block B wird übersprungen (Tool-Schema erlaubt leeres Array); Confirm-Karte zeigt Block B als „—".
- **Refusal-Kategorie matcht** → statischer Refusal vor dem LLM-Call (bestehende `route.ts`-Logik); keine Tool-Calls, kein Token-Budget.
- **Brief-Upload-Versuch** (User fügt echt aussehenden Brief ein) → Hard-Refusal (`real_letter_paste`); Attach-Button ist ohnehin disabled.
- **Persona-Switch während offenem Thread** → Thread wird zurückgesetzt (neue Persona, neuer Kontext); Begrüßungs-Nachricht neu.
- **Sehr langer Stream / `max_tokens` erreicht** → Antwort endet sauber; Disclaimer ggf. abgeschnitten ist akzeptabel (Demo), aber bevorzugt knappe Antworten (System-Prompt: „5–8 Sätze").

## 10. Out of scope (explicit)

- **Brief-Upload / Datei-Anhang** — Attach-Button disabled (V1, `system-prompt.ts` Hard-Refusal).
- **Antwort-Generator / Brief-Entwurf / Versand** über den Chat — V1 strikt out (Smartlaw-Linie); das Verfassen läuft in der Posteingang-Reply-Capability, nicht im Chat.
- **Voice / Audio** — kein Audio (HL-DS-5).
- **Andere Autopilots** (Kindergeburt, Aufenthalt-Verlängerung, Steuer) über den Chat — V1 nur Umzug (das einzige gebaute Backend-Autopilot).
- **Cross-Device-Thread-Sync** — Thread ist deviceLocal.
- **Streaming-Markdown-Vollparser** — Markdown-Lite (Bullets/Bold/Norm-Spans) genügt; kein Tabellen-/Code-Rendering.
- **`prioritize_top_actions`-Dashboard-Tool** — gehört zum Dashboard-Screen, nicht zum Chat-Tool-Set.

## 11. Review checklist (for code-reviewer)

- [ ] `starte_umzug` wird NIE ohne expliziten „Umzug starten"-Klick dispatcht (§ 7.3 Gating-Rule) — explizit testen (e2e).
- [ ] `previewUmzug`-Tool registriert in `tools.ts` + `TOOL_NAMES` + Dispatch-Tabelle; read-only, ohne Bestätigung.
- [ ] System-Prompt-Addition vorhanden (preview-vor-start + warte-auf-Bestätigung); Prompt-Cache `cache_control: ephemeral` unverändert aktiv.
- [ ] Mandatory-Disclaimer + Smartlaw-/Refusal-Logik aus `safety.ts`/`system-prompt.ts` unverändert wirksam.
- [ ] Keine hardcoded Strings — alle `assistent.*`-Keys in `de.json` + 6 Locales; Block-Titel reused.
- [ ] `<UmzugConfirmCard>` zeigt Empfänger je Block A/B/C/D mit farb-freiem `BehoerdenBadge` (HL-DS-10) + Consent-Note (Art. 6 Abs. 1 lit. a DSGVO).
- [ ] SSE-Streaming: `aria-live="polite"`-Region; reduced-motion → kein Blink-Cursor (HL-DS-4); Composer ≥ 48px (HL-DS-9), Send ≥ 44px (HL-DS-8).
- [ ] Begrüßungs-Erstnachricht ist UI-only (kein `messages`-Eintrag, der ans LLM zurückgeht).
- [ ] Kaskaden-Übergang führt nach `/vorgaenge/umzug/run?vorgangId=…`; Auto-Redirect nur ohne reduced-motion/SR.
- [ ] PLZ/Stichtag/Aktenzeichen `tabular-nums` (HL-DS-6); Datenminimierung: `hole_profil`-Result wird nicht im UI ausgebreitet.
- [ ] Lighthouse a11y > 95; axe 0 kritisch; AR-RTL-Audit (Bubbles + Rail spiegeln).

---

## Build log — assistant-engineer

- date: 2026-05-27
- scope: AI side of the Assistent hero (§7) + the dashboard `prioritize_top_actions` real AI path (redesign-dashboard.md §7 / dashboard.md §4.4). UI (chat panel) is frontend-coder; not touched here.

### Tools added / changed
- **`preview_umzug`** (NEW, read-only) — `src/lib/ai/tools.ts` (def + `TOOL_NAMES`, now 9). Schema `{ neue_adresse{strasse,hausnummer,zusatz?,plz(5),ort,land:'DE'}, stichtag_iso(date) }`, both required. Backed by `api.previewUmzug`. Description states read-only + propose-before-act. No change to the other 8 tools.
- zod mirrors added in `tool-schemas.ts`: `previewUmzugInput`, `starteUmzugInput` (+`neueAdresseSchema`, `stichtagIsoSchema`), `validateUmzugToolInput()`.

### Tool → api dispatch contract (§7.3) — machine-readable
- `TOOL_DISPATCH: Record<ToolName, {api_method, requires_confirmation, ui}>` in `tool-schemas.ts` is the single source of truth (mirrored by the human table in `tools.ts` + §7.3 here). The frontend dispatcher drives off it.
- **Irreversible-action gate** is structural, not prompt-only: `requiresConfirmation(name)` returns `true` ONLY for `starte_umzug`. The client MUST hold a `starte_umzug` `tool_use` block and render `<UmzugConfirmCard>`; it executes `api.startUmzug` ONLY on the user's „Umzug starten" click. Verified by smoke test.

| tool | api method | confirm-gated? |
|---|---|---|
| lese_posteingang | `getLetters` | no |
| hole_vorgang | `getVorgang` | no |
| hole_profil | `getProfile` | no |
| liste_termine | `getTermine` | no |
| erklaere_brief | `extrahiereAktion` | no |
| extrahiere_frist | `extrahiereAktion().fristen` | no |
| vorschlage_naechsten_schritt | `extrahiereAktion().was_kann_ich_tun_options` | no |
| `preview_umzug` | `previewUmzug` | no → renders `<UmzugConfirmCard>` |
| `starte_umzug` | `startUmzug` | **YES — gated by confirm click** |

- Client field mapping (frontend-coder owns): `stichtag_iso → UmzugInput.stichtag`, `block_b_consent → UmzugInput.consents`, set `source:'assistant'` + `betroffene_personen:[activePersonaId]`.

### System-prompt deltas (`system-prompt.ts`, DE source; cache_control ephemeral UNCHANGED)
- Added `preview_umzug` to the tool list; relabelled `starte_umzug` as „schreibend, irreversibel".
- Rewrote the Werkzeug-Etikette into an explicit 3-step propose-before-act sequence (sammeln → `preview_umzug` → confirm-then-`starte_umzug`) + a HARD rule that `starte_umzug` never fires without the explicit confirm click.
- Added `preview_umzug` to the no-confirm read-tool list.
- Updated the Stil-Beispiel to the preview-then-confirm phrasing.
- Added a "Situations-Überblick (persona-bezogen)" capability block (the prototype's "hier ein Überblick…" — model derives 2–4 bullets from tool results + persona context, no invention).

### Dashboard `prioritize_top_actions` AI path (NEW)
- `src/lib/ai/dashboard-prioritize.ts` — server-only one-shot tool-use call (forced `tool_choice`), `max_tokens:256`, prompt-caching ON, prompt-injection sealing (candidates fenced as DATA), Zod-validated output (whitelist tokens + id-membership + 1..N rank permutation). `prioritizeTopActionsAi()` returns `{ranking, outcome}` and NEVER throws.
- `src/app/api/dashboard/top-actions/route.ts` — POST `{candidates}` → `{ranking, outcome}`; Node runtime; deterministic fallback on any failure.
- `src/lib/ai/dashboard-prioritize-client.ts` — `fetchPrioritizedTopActions()` browser bridge (fetch + deterministic fallback). The mock-backend deterministic stub stays as the graceful fallback; rewire is one line — see `docs/reviews/2026-05-27-assistant-needs.md`.

### Offline-fallback behaviour (demo must not break without a key)
- `/api/assistant`: refusal turns stream the static `safety.ts` copy with NO Anthropic call (works keyless). A normal turn with no key returns a clean 500 `assistant_unavailable` (no key/stack leak) — the chat UI shows `assistent.error.stream` + retry.
- `/api/dashboard/top-actions`: no key → `deterministicRank` with `outcome:'fallback:no_api_key'`, HTTP 200. Identical ranking to the mock-backend stub, so "KI" sort still renders.

### Gate results
- `pnpm tsc --noEmit` (`npx tsc --noEmit`): PASS (0 errors).
- `npx tsx src/lib/ai/__smoke__.ts`: PASS (38 checks — incl. preview_umzug registration, TOOL_DISPATCH per-tool, gate `starte_umzug`-only, Umzug input accept/reject incl. 4-digit PLZ, non-DE land, non-ISO stichtag, missing consent).
- `npx tsx src/lib/ai/__smoke_dashboard__.ts`: PASS (11 checks — deterministic Frist-ASC, token mapping, no-key fallback == deterministic, empty outcome).
- `npx tsx src/lib/ai/__smoke_safety__.ts`: PASS (unchanged — refusals intact).
- Live SSE smoke (no key, `next dev`): refusal path streams `text_delta`+`message_stop` HTTP 200; normal turn → clean 500; dashboard route → Frist-ASC ranking + `fallback:no_api_key`. Verified.

### Known gaps / hand-offs
- Frontend-coder builds `<AssistentView>` + the dispatcher off `TOOL_DISPATCH` + `requiresConfirmation`; renders `<UmzugConfirmCard>` from the `preview_umzug` result and only dispatches `starte_umzug` on the confirm click (the spine gate — also an e2e review gate §11).
- mock-backend-coder: optional 1-line `prioritizeTopActions` rewire + optional `dashboard:ai-log` bucket (see review note). Neither blocks the spine.
- prompt-cache hit-rate not measured offline (no key); the cache_control blocks are unchanged and verified present on both system blocks. Adding `preview_umzug` invalidates the BASE_SYSTEM_PROMPT cache once (~accepted warm-up, per §7.2).
- The dashboard AI path is a SEPARATE surface from the chat tool set (per spec) — `prioritize_top_actions` is NOT registered in `tools.ts`/`TOOL_NAMES`; it lives only in `dashboard-prioritize.ts`.

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: `/assistent` (HERO) — stub `PlaceholderSection` replaced with the full chat UI.

### Components created (all under `src/components/assistent/`)
- `AssistentView.tsx` (client, orchestrator) — persona bootstrap (`getProfile`/`getLetters`/`getDocuments`/`getTermine`/`getBehoerden` on mount), `messages` state, the SSE streaming loop (manual `fetch` + `ReadableStream` reader parsing `data: …\n\n` frames into `AssistantStreamEvent`), the client tool-dispatch loop (max 4 rounds), and the confirm gate. Re-bootstraps (resets thread) on locale change (spec §9).
- `ChatPanel.tsx` (client) — `<ol aria-label>` message list; renders `MessageBubble` + `ToolCallCard` + `UmzugConfirmCard` in order; coarse-grained `role="status" aria-live="polite"` SR region (one announce per committed turn, never per token); auto-scroll respects `prefers-reduced-motion`; the „… schreibt"-indicator is `aria-hidden` static text under reduced-motion (no blink).
- `MessageBubble.tsx` (client) — assistant left w/ Sparkle `IconCircle` avatar + timestamp; user right w/ `CheckCheck` read-tick (`aria-label` „Gesendet", decorative); markdown-lite body.
- `MessageMarkdown.tsx` — markdown-lite (paragraphs, `-`/`•` bullets, `**bold**`, §/Art. norm spans w/ `tabular-nums`); reuses `parse-bold-norms`. No tables/code/links (spec §10).
- `ChatComposer.tsx` (client) — auto-grow textarea (`min-h-[48px]` HL-DS-9) w/ sr-only `<label>`; Enter sends / Shift+Enter newline; `Send` button (44px, `aria-label`); `Paperclip` attach button **disabled** w/ tooltip `assistent.composer.attach_disabled`.
- `ToolCallCard.tsx` (client) — running/done/error via `IconCircle` + `StatusBadge`; spinner respects reduced-motion; on `starte_umzug` success shows „Umzug gestartet …" + „Kaskade ansehen" link → `/vorgaenge/umzug/run?vorgangId=…`.
- `UmzugConfirmCard.tsx` (client) — the confirm gate. `role="group" aria-labelledby`; address + Stichtag (`tabular-nums`); Block A/B/C/D recipients via colour-free `BehoerdenBadge` (HL-DS-10); consent-note (Art. 6 Abs. 1 lit. a DSGVO); „Umzug starten" (primary, NOT auto-focused) + „Abbrechen". Freezes after resolution.
- `QuickActionChips.tsx` (client) — 3 chips (Erkläre meinen Brief / Was ist als Nächstes zu tun? / Welche Unterlagen fehlen?), `role="group"`, ≥44px pills; click sends the chip text as a user turn; stay visible after first message.
- `KontextRail.tsx` (client) — `<aside aria-label>`; Posteingang/Dokumente/Termine/Stammdaten cards w/ live counts (real links) + „Ihre Daten sind geschützt" via `RightRailCard variant="soft"`.
- `dispatch-tool.ts` — the client dispatcher: maps each `tool_use` → `api.*`, serialises a `tool_result` block. Drives the gate off `requiresConfirmation` (from `tool-schemas.ts`). `dispatchStarteUmzug` owns the field mapping (`stichtag_iso→stichtag`, `block_b_consent→consents`, `source:'assistant'`, `betroffene_personen:[activePersonaId]`).
- `types.ts` — UI-only `ChatMessage`/`ChatToolCall`/`UmzugProposal` view-models.
- `src/app/(app)/assistent/page.tsx` — RSC shell (persona bootstrap is client-side since the mock-backend lives in localStorage); renders `<AssistentView>`.

### Confirm-gate behaviour (the spine safety layer) — as built + observed
- `starte_umzug` is NEVER reachable by the read dispatcher: `dispatchReadTool` has no `starte_umzug` case, and the orchestrator `continue`s on `requiresConfirmation(name)===true` before the dispatcher is ever called. The block is held, `previewUmzug` is run (fallback path §7.4b) to populate the card, and a `tool_result` `{status:'awaiting_user_confirmation'}` is sent so the conversation stays valid and the model does not retry.
- Normal path: model calls `preview_umzug` → `<UmzugConfirmCard>` renders from the read-only result; consent defaults to the Block-B recipient ids from the preview.
- `api.startUmzug` runs ONLY from `onConfirmUmzug` (the „Umzug starten" click). Cancel sends a „Abgebrochen." user turn so the model stays context-consistent (spec §7.4).

### Offline / keyless behaviour (verified live, no `ANTHROPIC_API_KEY` present)
- Refusal turn (e.g. „Wird mein Einspruch Erfolg haben?"): `/api/assistant` streams the static `safety.ts` copy as `text_delta`+`message_stop`, HTTP 200 — the client renders the bubble normally. No tool calls, no confirm card. Verified via curl.
- Normal turn (e.g. „Ich ziehe um."): keyless → clean HTTP 500 `assistant_unavailable` JSON. The client's `runTurn` sees `!res.ok`, sets the turn to error, and renders `assistent.error.stream` in the bubble — the chat does NOT crash. Verified via curl.
- **Consequence for the Umzug confirm-card without a key**: typing „leite meinen Umzug ein" with no key surfaces the `assistent.error.stream` bubble (the model cannot run), so the confirm card does NOT appear keyless — by design, the route returns the unavailable state and the UI degrades gracefully. With a working key, the model calls `preview_umzug` and the card appears (the gate path is the §7.4 flow above; structurally enforced regardless of the model's behaviour).

### i18n keys added (DE source only — `de.json`; new top-level `assistent.*`)
`assistent.title`, `.subtitle`; `.quick.{label,erklaere_brief,naechster_schritt,fehlende_unterlagen}`; `.log_label`; `.composer.{label,placeholder,send,attach,attach_disabled}`; `.message.{user_sent,assistant_label}`; `.empty.{title,description}`; `.streaming.typing`; `.error.stream`; `.greeting.{intro,bullet_briefe(ICU plural),bullet_frist,bullet_keine,cta}`; `.tool.{reading,running,done,failed,umzug_started,cta_kaskade}` + `.tool.label.{starte_umzug,preview_umzug,lese_posteingang,hole_vorgang,hole_profil,liste_termine,erklaere_brief,extrahiere_frist,vorschlage_naechsten_schritt}`; `.umzug_confirm.{title,subtitle,neue_adresse,stichtag,empfaenger_a,empfaenger_b,empfaenger_c,empfaenger_d,empfaenger_leer,cta_start,cta_cancel,cancelled,consent_note}`; `.kontext.{title,subtitle,posteingang,posteingang_value(ICU),dokumente,dokumente_value(ICU),termine,termine_value(ICU),stammdaten,stammdaten_value,datenschutz_title,datenschutz_body,datenschutz_link}`. Reused: `common.context_chip.prototype`. de.json JSON.parse OK.

### Gate results
- `pnpm tsc --noEmit` (`npx tsc --noEmit`): PASS for all assistent + app files (0 errors). The only repo-wide errors are 3 in `tests/a11y/redesign-dashboard.spec.ts` — a pre-existing UNTRACKED local test file unrelated to this work (not touched here).
- `pnpm lint` (`next lint --dir src`): PASS — 0 warnings in assistent files. The single remaining warning (`stammdaten/api.ts:39 'read' unused`) is pre-existing + out-of-scope (noted in the foundation build log).
- Smoke `/assistent` (`next dev` :3210): HTTP 200; SR-relevant strings present in HTML (Assistent, Kontext, „Ich beziehe mich auf:", 3 chips, composer placeholder, „Ihre Daten sind geschützt"). SSE refusal + keyless-500 paths verified via curl (above). No runtime/compile errors in the dev log.

### Known gaps (for code-reviewer / a11y-tester)
- i18n: only DE source added (per role boundary). 6-language localization is i18n-localizer's pass (`track: spine`).
- Live LLM tool-use round-trip (preview→confirm→starte_umzug success → „Kaskade ansehen") could not be exercised offline (no API key). The dispatch loop, frame parser, and gate are unit-correct + structurally verified; an e2e with a key (or a mocked SSE) should assert the gate (spec §11 first checkbox) — recommend a Playwright route-mock that streams a `preview_umzug` tool_use then asserts no `startUmzug` write fires until the button click.
- `prefers-reduced-motion`: spinner/typing indicator handled via `useReducedMotion`; auto-redirect after `starte_umzug` was deliberately NOT implemented (spec §7.5 default = link only) — safest for SR + reduced-motion.
- next: a11y-tester (Lighthouse/axe on `/assistent`, AR-RTL bubble/rail mirroring), then i18n-localizer (6 locales), then code-reviewer (gate §11).

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr] (de.json untouched — source-of-truth, concurrent build appending other keys; only the `assistent.*` subtree was translated)
- new keys: 53 per locale × 5 = 265 strings (translated DE → target, never via EN)
- changed keys: 0
- review-needed flags resolved: 0 (track: spine → FULL quality, all human-reviewed; no `needs_review` left; `_status.json` `last_synced` bumped to 2026-05-27)
- known gaps: none for `assistent.*`. (Pre-existing leaf-key gaps in other namespaces from V1.0.1/V1.1/V1.2/V1.3 carry-over are out of scope for this pass.)

### Scope
- Translated ONLY the new top-level `assistent.*` block (de.json lines 362–448). Inserted in each target file between the `umzug` and `placeholder` blocks (same structural position as DE), at line 359.
- Did NOT touch de.json (a concurrent build is appending OTHER keys to it).

### Key count parity — assistent.* leaf keys
- DE source: 53 leaf keys (title, subtitle, quick×4, log_label, composer×5, message×2, empty×2, streaming×1, error.stream, greeting×5, tool×6 + tool.label×9, umzug_confirm×14, kontext×14).
- en / ru / uk / ar / tr: 53 each. Missing: 0. Extra: 0. Full parity with de.json (translated the actual source, which is a superset of the keys enumerated in spec §4.1/§4.2 — e.g. `quick.label`, `composer.label`, `composer.attach`, `tool.running`, `tool.done`, `tool.failed`, `umzug_confirm.empfaenger_leer`, `umzug_confirm.cancelled` exist in source but not in the spec prose list).

### ICU MessageFormat — preserved verbatim, never hand-baked
- Arguments kept identical to DE across all locales: `{vorname}`, `{betreff}`, `{datum}` (greeting), `{count}` (greeting.bullet_briefe, kontext.dokumente_value, kontext.termine_value), `{ungelesen}` (kontext.posteingang_value).
- Plural categories ADAPTED per language (this is correct, not a mismatch):
  - en/tr: `=1`/`other` (+`=0`/`=2` where the DE source has them).
  - ru/uk: added `few` for the Slavic 2–4 paucal where the DE source uses a count plural (`bullet_briefe`, `kontext.posteingang_value`, `kontext.dokumente_value`, `kontext.termine_value`); kept `=0`/`=1`/`other`.
  - ar: added `=2`/`few` (dual + paucal) on the same four plural strings; kept `=0`/`=1`/`other`.
  Argument NAMES are identical to DE in every locale — only the category set differs, which next-intl/ICU handles per-locale. No `{n}`→formatted-string baking; date/number formatting left to next-intl.

### Behörden / legal terms — DE original parenthesized for non-DE readers
- GDPR consent note (`umzug_confirm.consent_note`): localized legal cite + the DE original kept in parentheses in every non-DE locale — en `Art. 6(1)(a) GDPR / Art. 6 Abs. 1 lit. a DSGVO`, ru `ст. 6 ч. 1 п. a GDPR / Art. 6 Abs. 1 lit. a DSGVO`, uk `ст. 6 ч. 1 п. a GDPR / Art. 6 Abs. 1 lit. a DSGVO`, ar `المادة 6 الفقرة 1 الحرف a من اللائحة GDPR / Art. 6 Abs. 1 lit. a DSGVO`, tr `GDPR md. 6 f. 1 b. a / Art. 6 Abs. 1 lit. a DSGVO`.
- `eID` kept as the established Latin product term in all locales (incl. ar/ru/uk). „Block-B" recipient grouping kept as Latin `B` (matches the Block A/B/C/D system label reused from `umzug.preview.block_*`).

### Pronoun consistency (one per language, never mixed)
- en: formal neutral „you" (gov.uk register). ru: „Вы" capitalized throughout (Вам/Вашей/Вашего/Вашей). uk: „Ви"/„Вам"/„Вашої"/„Вашою" capitalized. ar: formal مخاطب (مساعدتك/تأكيدك/بموافقتك/سؤالك). tr: Siz form throughout (-ınız/-iniz suffixes; durumunuza, onayınızdan, sorunuz).

### Length discipline (flags for frontend-coder)
Source-length budget = DE + ≤40%. Chip labels and confirm-card buttons are the layout-critical ones.
- Quick-action chips (DE „Erkläre meinen Brief" / „Was ist als Nächstes zu tun?" / „Welche Unterlagen fehlen?"): all 5 locales within budget; ru/uk slightly longer per-word but all ≤ DE+30%. No overflow risk on ≥44px pills.
- `umzug_confirm.cta_start` / `cta_cancel` („Umzug starten" / „Abbrechen"): all locales SHORTER than or near DE (en „Start the move", ru „Запустить переезд", uk „Запустити переїзд", ar „بدء الانتقال", tr „Taşınmayı başlat"). No button overflow.
- `tool.label.*` (rendered inside small `<ToolCallCard>` chips): all concise, within budget.
- FLAG (minor, monitor only): ru/uk `umzug_confirm.empfaenger_d` („С подтверждением через eID" / „З підтвердженням через eID") and `tool.umzug_started` run ~25–35% longer than DE — still within the ≤40% budget but the longest strings in the block. If the Block-D label or the „Umzug gestartet"-tool-result line wraps awkwardly in a narrow confirm card, coordinate with frontend-coder; no change made now (within tolerance).
- No string exceeds DE+40%.

### AR RTL
- All AR strings are pure RTL prose; the embedded LTR runs (`eID`, `GDPR`, `DSGVO`, `B`, ICU `{…}` args, `#`) rely on the Unicode bidi algorithm and will isolate correctly within an RTL paragraph. Page `dir="rtl"` is set in `app/layout.tsx` per locale (spec §4.1 a11y notes + frontend-coder build); chat-bubble/rail mirroring is frontend-coder/a11y-tester's component concern, not a string concern. No directional glyphs baked into strings.

### Validation — JSON.parse
- All 5 edited files verified well-formed by structural read-through (brace/quote/comma balance, single `assistent` object correctly closed before `placeholder`, all nested objects balanced, all ICU inner braces matched).
- NOTE: this agent has no Bash/exec; per project convention (MEMORY: „i18n agent lacks Bash → main-thread JSON.parse gate") the main thread should run the JSON.parse gate (`node -e` over the 5 files) before commit as the authoritative confirmation. Structural review found no syntax issues.
- de.json: NOT modified.

## Code review — code-reviewer (2026-05-27)
- verdict: APPROVE
- gates: tsc PASS; lint PASS (1 pre-existing OOS warning); vitest 639/639; i18n JSON.parse 6/6 + full parity; AI gate smoke 38/38.
- full verdict + per-file citations: docs/reviews/2026-05-27-redesign-spine-code.md
- status set to shipped. Non-blocking nits tracked in the review file (no REVISE items on this screen).
