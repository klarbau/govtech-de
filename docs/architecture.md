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

## Update protocol

When any of the following change, this file must be updated by the responsible agent in the same review pass:
- `src/lib/mock-backend/api.ts` public surface
- `src/types/*` shapes
- `src/app/api/assistant/route.ts` execution model
- Persistence key layout
