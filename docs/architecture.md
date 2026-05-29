# Architecture

The complete folder structure is documented in `CLAUDE.md`. This file describes runtime data flow, the mock-backend contract, and the AI assistant execution model. Update this file whenever any of those change.

## Runtime overview

```
┌──────────────────────────────────────────────────┐
│ Browser                                          │
│                                                  │
│  ┌────────────────┐    ┌────────────────────┐    │
│  │ React Server   │    │ React Client       │    │
│  │ Components     │    │ Components         │    │
│  │ (Server-       │◀──▶│ (interactive UI,   │    │
│  │  rendered)     │    │  state, listeners) │    │
│  └────────┬───────┘    └─────────┬──────────┘    │
│           │                      │               │
│           ▼                      ▼               │
│  ┌────────────────────────────────────────────┐  │
│  │  src/lib/mock-backend/api.ts               │  │
│  │  (in-process module — no network)          │  │
│  │                                            │  │
│  │  api.startUmzug()                          │  │
│  │  api.getLetters()                          │  │
│  │  api.subscribe(listener)                   │  │
│  │            │                               │  │
│  │            ▼                               │  │
│  │  ┌──────────────────┐                      │  │
│  │  │ persistence      │ ──▶ localStorage     │  │
│  │  │ (zod-validated)  │                      │  │
│  │  └──────────────────┘                      │  │
│  │  ┌──────────────────┐                      │  │
│  │  │ autopilot/*      │ (async generators)   │  │
│  │  └──────────────────┘                      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
            │
            │ POST /api/assistant
            ▼
┌──────────────────────────────────────────────────┐
│ Next.js Route Handler (Node runtime)             │
│  src/app/api/assistant/route.ts                  │
│                                                  │
│  ┌────────────────────────────────────────┐      │
│  │ @anthropic-ai/sdk                      │      │
│  │ model: claude-haiku-4-5-20251001       │      │
│  │ system: cached prompt (ephemeral)      │      │
│  │ tools: [starte_umzug, … ]              │      │
│  │ stream: true → SSE → client            │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  Tool execution loop:                            │
│   - emits tool_use blocks                        │
│   - server dispatches to mock-backend-mirror     │
│   - feeds tool_result back into the model        │
│   - until stop_reason !== 'tool_use'             │
└──────────────────────────────────────────────────┘
```

The mock backend lives entirely in the browser. The AI assistant route is the only server-side piece. This keeps the demo deployable as a static-ish Next.js app on Vercel with one route handler.

## Mock-backend contract

### Public surface

`src/lib/mock-backend/api.ts` exposes a single object `api` with read, write, and subscribe methods. All methods are async; all may throw `MockBackendError`.

```ts
type Read = {
  getProfile(): Promise<Persona>;
  getLetters(filter?: LetterFilter): Promise<Letter[]>;
  getLetter(id: string): Promise<Letter>;
  getVorgang(id: string): Promise<Vorgang>;
  getVorgaenge(filter?: VorgangFilter): Promise<Vorgang[]>;
  getDocuments(): Promise<Document[]>;
  getTermine(): Promise<Termin[]>;
};

type Write = {
  startUmzug(input: UmzugInput): Promise<{ vorgangId: string }>;
  beantrageElterngeld(input: ElterngeldInput): Promise<{ vorgangId: string }>;
  verlängereAufenthaltstitel(input: AufenthaltInput): Promise<{ vorgangId: string }>;
  markiereLetterGelesen(id: string): Promise<void>;
  bestätigeAutopilotSchritt(vorgangId: string, schrittId: string): Promise<void>;
};

type Subscribe = {
  subscribe(listener: (e: MockBackendEvent) => void): () => void;
};
```

### Event model

```ts
type MockBackendEvent =
  | { type: 'letter_received'; letter: Letter }
  | { type: 'vorgang_status_changed'; vorgangId: string; status: VorgangStatus }
  | { type: 'autopilot_step'; vorgangId: string; step: AutopilotStep }
  | { type: 'document_added'; document: Document };
```

The UI subscribes once at app boot and dispatches events into the appropriate React tree (Zustand store or context).

### Persistence keys

All under namespace `govtech-de:v1:`:

| Key | Schema |
|---|---|
| `meta` | `{ version, active_persona_id, seeded_at }` |
| `profile` | `Persona` |
| `letters` | `Letter[]` |
| `vorgaenge` | `Vorgang[]` |
| `documents` | `Document[]` |
| `termine` | `Termin[]` |
| `consent` | `Record<BehoerdeId, ConsentScope[]>` |

On version bump, all keys under prior namespace are purged and reseeded.

### Latency + error injection

- Default: 300–800ms uniform random delay.
- Default: 5% chance of `MockBackendError`.
- Override via `?reliable=1` URL param or `localStorage['govtech-de:v1:meta'].reliable_mode`.
- Recordings/screencasts: enable reliable mode.

## AI assistant execution model

Two equally valid approaches; pick one and document it here once chosen:

### Approach A — server-side mirror

The route handler imports a server-side mirror of `mock-backend/api.ts` (same logic, in-memory, request-scoped). When the model emits `tool_use`, the route handler executes the call against the mirror, feeds the result back. Result includes any side-effects to be mirrored back to the client (e.g. new letters), serialised in a final SSE event the client applies to its own mock-backend.

### Approach B — client-executes-tools

The route handler streams `tool_use` blocks back to the client untouched. The client executes the tool against its real (browser) mock-backend, then POSTs the next turn (with tool_result) back to the server. Loop continues until `stop_reason !== 'tool_use'`.

Approach B is simpler (single source of truth for state) but requires more chattier client/server flow. Approach A is one round-trip but requires careful state mirroring.

**Decision** (assistant-engineer, 2026-05-08): **Approach B — client-executes-tools.** The mock-backend is the single source of truth for application state and lives entirely in the browser (`localStorage` plus in-memory subscribers). Mirroring it server-side would mean (a) duplicating every autopilot generator, (b) keeping two `localStorage`-equivalents in sync across users, and (c) reasoning about race conditions between server-mirror writes and client-side subscribers — substantial complexity for zero user-visible benefit on a portfolio demo. The chattier client/server flow that Approach B implies is acceptable because each turn carries only a few hundred tokens; the route handler stays small and stateless. Concretely: `route.ts` streams `tool_use` blocks to the browser unmodified, the chat-panel client dispatches each block against `lib/mock-backend/api.ts`, and posts the next turn back with `tool_result` content blocks attached. The server-side loop terminates when `stop_reason !== 'tool_use'`; multi-step tool chains become multi-request chains, one HTTP round-trip per Claude turn.

## Data shape — top-level types

(Stubs — extend in `src/types/`.)

```ts
type Persona = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;        // ISO
  staatsangehoerigkeit: string;
  familienstand?: 'ledig' | 'verheiratet' | 'geschieden' | 'verwitwet' | 'eingetragene_lebenspartnerschaft'; // § 3 Abs. 1 Nr. 8 BMG; surfaced on Stammdaten.familie.familienstand
  adresse: Adresse;
  steuer_id?: string;
  rentenversicherungsnummer?: string;
  aufenthaltstitel?: Aufenthaltstitel;
  familie: { partner?: Persona; kinder: Persona[] };
  beschaeftigung?: Beschaeftigung;
  krankenversicherung?: Krankenversicherung;
};

type Behoerde = {
  id: string;
  name_de: string;
  kategorie: 'bund' | 'land' | 'kommune' | 'sozialversicherung';
  zustaendige_themen: string[];
  adresse: Adresse;
  online: { portal_url?: string; supports_eudi: boolean };
};

type Letter = {
  id: string;
  absender_behoerde_id: string;
  empfaenger_persona_id: string;
  aktenzeichen: string;
  betreff: string;
  body_de: string;             // includes [MOCK] watermark
  ai_summary?: { de: string; en?: string; ru?: string; uk?: string; ar?: string; tr?: string };
  required_action?: { typ: string; frist: string; cta: string };
  status: 'ungelesen' | 'gelesen' | 'erledigt';
  empfangen_am: string;
  vorgang_id?: string;
  betrag_cent?: number;        // structured monetary outcome of a Bescheid (Euro-Cent)
  betrag_richtung?: 'erstattung' | 'nachzahlung'; // refund to / payment by the citizen
};

type Vorgang = {
  id: string;
  typ: 'umzug' | 'kindergeburt' | 'aufenthaltstitel-verlaengerung' | string;
  status: 'angelegt' | 'in_pruefung' | 'genehmigt' | 'abgelehnt' | 'abgeschlossen';
  beteiligte_behoerden_ids: string[];
  schritte: AutopilotStep[];
  fristen: { typ: string; datum: string }[];
  angelegt_am: string;
  abgeschlossen_am?: string;
};

type AutopilotStep = {
  id: string;
  behoerde_id: string;
  aktion: string;
  status: 'pending' | 'in_progress' | 'confirmed' | 'failed';
  started_at?: string;
  completed_at?: string;
  letter_id?: string;
};

type Document = {
  id: string;
  typ: 'aufenthaltstitel' | 'geburtsurkunde' | 'meldebescheinigung' | 'steuerbescheid' | string;
  ausstellende_behoerde_id: string;
  ausgestellt_am: string;
  gueltig_bis?: string;
  qr_payload: string;
  eudi_compatible: boolean;
  watermark: '[MOCK]';
};

type Termin = {
  id: string;
  behoerde_id: string;
  vorgang_id?: string;
  datum: string;
  ort: { typ: 'praesenz' | 'video'; details: string };
  status: 'gebucht' | 'bestätigt' | 'abgesagt';
};
```

## Redesign data-model additions (2026-05-27)

The full-sweep redesign kept the runtime flow above unchanged (RSC/client → `api.ts` → persistence/autopilot; assistant via the SSE route, Approach B confirmed and in use). It added screen-specific read models and a few additive fields. New type files: `src/types/{dashboard,steuer,familie,datenschutz}.ts`. Additive fields: `Document.kategorie?`/`dokument_nr?` (+ `DocumentKategorie`); `Termin.buchungsreferenz?`/`vorbereitung?`/`kategorie?` (+ new `Reminder`, `ReminderKategorie`, `TerminVorbereitungItem`).

New `api` read/write methods (all `withLatency`, dispatched through `api.ts`):

```ts
// Dashboard
getDashboard(personaId, opts?): Promise<DashboardSnapshot>;   // resolves last_seen from bucket if omitted
getLastSeen(personaId): Promise<string | null>;
setLastSeen(personaId, iso): Promise<void>;                   // called by UI AFTER snapshot, never zeroes the diff
getCandidatesForTopActions(personaId): Promise<TopActionCandidateInput[]>;
getDsc(personaId): Promise<DscSnapshot>;
getLebenslagenHinweise(personaId): Promise<LebenslagenHinweis[]>;
getDashboardSortMode(personaId): Promise<DashboardSortMode>;  // default 'ki'
setDashboardSortMode(personaId, mode): Promise<void>;
// Reminders / Steuer / Familie / Datenschutz
getReminders(): Promise<Reminder[]>;                          // seed + derived from Vorgang.fristen[]
getSteuerUebersicht(personaId, steuerjahr): Promise<SteuerUebersicht>;
getFamilie(personaId): Promise<HaushaltView>;                 // read-only, derived from Persona
getDatenschutzEinwilligungen(personaId): Promise<DatenschutzEinwilligung[]>;
setDatenschutzEinwilligung(personaId, empfaenger, erteilt): Promise<void>; // persists + emits a UebermittlungsLogEntry (Art. 6/7 DSGVO)
getDatenquellen(personaId): Promise<DatenquellenEintrag[]>;
isVisionBannerDismissed(personaId): Promise<boolean>;
dismissVisionBanner(personaId): Promise<void>;
```

New persistence keys under `govtech-de:v1:`: `reminders`, `steuer`, `datenschutz:einwilligungen`, `datenschutz:vision-banner-dismissed`, `dashboard:last-seen`, `dashboard:sort-mode`. The Datenschutz activity timeline reuses the existing `stammdaten:uebermittlungs-log` bucket (no parallel log).

Seed-richness note (2026-05-28): the 6 redesign screens (Dashboard, Vorgänge, Termine, Steuer, Familie, Datenschutz) read all demo content through `api.ts`; no inline-hardcoded fallbacks are required for the active demo persona (Anna Petrov). To support this, the active persona's fixtures were enriched — `vorgaenge.json` carries a featured in-progress Umzug (`vg-anna-umzug-skalitzer-friedrichstr`, 6 steps: Bürgeramt/Finanzamt/Beitragsservice/KFZ confirmed → Bundesdruckerei in_progress → AOK pending), consistent with Anna's `mobilitaet.halter_adresse.via_umzug_vorgang_id` marker; `termine.json` adds the U7 Kinderarzt booking; `behoerden.json` adds `kinderarzt-prenzlauer-berg` (kategorie `privat`). No return TYPES changed — the `SteuerUebersicht`/`HaushaltView`/`DashboardSnapshot`/`Termin`/`Reminder` shapes already carried every field the screens need; the redesign components simply weren't reading them yet.

AI additions: read-only tool `preview_umzug` (proposes Umzug params without writing) feeding a confirm-gated UI flow — `starte_umzug` (irreversible) fires only after the user clicks; the gate is structural (`requiresConfirmation()` in `lib/ai/tool-schemas.ts`), not prompt-only. Separate one-shot surface `POST /api/dashboard/top-actions` (`prioritize_top_actions`) ranks the dashboard "Heute zu tun" list, with a deterministic Frist-fallback when no API key is present.

## Update protocol

When any of the following change, this file must be updated by the responsible agent in the same review pass:
- `src/lib/mock-backend/api.ts` public surface
- `src/types/*` shapes
- `src/app/api/assistant/route.ts` execution model
- Persistence key layout
