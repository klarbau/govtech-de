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
│  src/app/api/assistant/route.ts  (STATELESS LLM  │
│                                    proxy only)   │
│                                                  │
│  ┌────────────────────────────────────────┐      │
│  │ @anthropic-ai/sdk                      │      │
│  │ model: claude-haiku-4-5-20251001       │      │
│  │ system: cached prompt (ephemeral)      │      │
│  │ tools: [starte_umzug, … ]              │      │
│  │ stream: true → SSE → client            │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  Tool execution loop (Approach B):               │
│   - streams tool_use blocks to the client        │
│   - CLIENT dispatches against in-process api.ts  │
│   - client posts next turn back with tool_result │
│   - until stop_reason !== 'tool_use'             │
└──────────────────────────────────────────────────┘

(Optional, NOT the browser default) A second server-side mock-backend exists at
`/api/mock` (RPC) + `/api/mock/events` (SSE), backed by a per-session in-memory
store. The HTTP/SSE fetch-client (`mock-backend/client.ts`) can target it, but the
deployed browser path does not — see "Mock-backend deployment topology" below.
```

### Mock-backend deployment topology

**Deployed default = client-side state.** The barrel `src/lib/mock-backend/index.ts`
re-exports the **in-process core `api`** (`mock-backend/api.ts`). Every component's
`api.*` call therefore runs in the browser: reads/writes hit a `LocalStorageStore`
(resolved by `mock-backend/store-context.ts` when `window.localStorage` exists) and
events stream over an in-process `EventBus` (`mock-backend/events.ts`). The headline
Umzug cascade — `api.previewUmzug`, `api.startUmzug`, `api.bestaetigeAutopilotSchritt`,
`api.getVorgang`, `api.getLetterThread`, `api.subscribe` — runs entirely client-side,
so it needs no server session affinity.

**Tools are executed client-side** (Approach B). `/api/assistant` is a *stateless* LLM
proxy that streams `tool_use` blocks back; the client dispatches them against the
in-process `api` (`src/components/assistent/dispatch-tool.ts`). The assistant route
holds no application state.

**Retained but not the default:** the HTTP/SSE fetch-client (`mock-backend/client.ts`)
and the server route handlers under `src/app/api/mock/**` remain in the tree for tests
and an optional server-store path. They expose the identical `MockBackendApi` surface
(including `subscribe`), so swapping the barrel back to `apiClient` is a one-line change.

**SSR-safety:** `getCurrentStore()` guards `window.localStorage` and falls back to a
process-wide `InMemoryStore` during prerender/SSR; `api.subscribe` only registers an
in-memory listener (no `window` access). Importing `api` from a Server Component or
during prerender is therefore safe, and `subscribe` no-ops gracefully under SSR.

### Vercel deployment

Because all application state is client-side (`localStorage` + in-process event bus),
the demo is robust on Vercel's stateless serverless functions — there is no server
session to lose between cold starts. The only server piece is `/api/assistant`, which
needs `ANTHROPIC_API_KEY` to drive the conversational assistant; without it the
assistant degrades gracefully (the rest of the demo, including the Umzug cascade
triggered from the Vorgänge flow, is unaffected because tool execution is client-side).

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

**Decision: Approach B — client-executes-tools** (see the dated decision note below).
The two approaches that were on the table:

### Approach A — server-side mirror (NOT chosen)

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
  typ: 'aufenthaltstitel' | 'geburtsurkunde' | 'meldebestaetigung' | 'steuerbescheid' | string;
  ausstellende_behoerde_id: string;
  ausgestellt_am: string;
  gueltig_bis?: string;
  // Synthetic QR payload — OR, for the Verifiable-Once-Only credential, the real
  // ES256 SD-JWT VC string the Demo-Issuer minted (re-verifiable in-place).
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

## Verifiable Once-Only — Demo-Issuer + SD-JWT-VC return path (2026-06-14)

The EUDI Tier-1 module (`src/lib/eudi`, SERVER-ONLY) gained an OUTGOING half: a synthetic **Demo-Issuer** that mints the amtliche Meldebestätigung (§ 24 Abs. 2 BMG) as a real ES256 **SD-JWT VC** and re-verifies it offline with the SAME verifier (`verifyPidSdJwtVc`) against an injected **Demo-Trust-Anchor** — ZERO changes to `verify.ts`. `[reference-ecosystem]` (format + signature real) + `[ZUKUNFT]` (authority Demo, not a German Meldebehörde).

- **PKI (vendored, server-only):** `src/lib/eudi/fixtures/once-only-issuer.ts` carries `DEMO_ONCE_ONLY_CA_PEM` (the trust anchor), the leaf DS cert as base64-DER `x5c`, and the issuer's PKCS#8 signing key. Generated reproducibly + offline by `scripts/once-only-gen-pki.mjs` (copies under `docs/research/once-only-pki/`). No `.env`, no `fs`/network at runtime — Vercel- and Loom-safe, exactly like the verifier.
- **Issuer:** `src/lib/eudi/issue.ts` — `issueMeldebestaetigungSdJwtVc(claims, opts?)` / `issueMeldebestaetigungForPersona(personaId, vorgangId, ctx, opts?)`. Header `{alg:'ES256', typ:'dc+sd-jwt', x5c:[…]}`, payload `{iss, iat, exp(~90d), vct:'govtech-de.example/credentials/meldebestaetigung/1', _sd:[…], _sd_alg:'sha-256'}`, the (up to) 8 § 24 Abs. 2 fields as object-property `_sd` disclosures, NO KB-JWT, NO PID padding. Returns `<issuerJwt>~<d1>~…~`.
- **Readout adapter:** `src/lib/eudi/meldebestaetigung-readout.ts` — `toMeldebestaetigungReadout(PidVerificationResult)` → `MeldebestaetigungVerificationResult` (a distinct type that never carries `mandatoryPresent`/`MANDATORY_PID_ATTRS`; "N von 8 Bestätigungsfeldern", never "PID-Pflichtattribute").
- **Server actions** (`src/app/actions/eudi.ts`): `verifyMeldebestaetigungCredential(personaId?, vorgangId?)` (mint + re-verify) and `presentMeldebestaetigungSubset(fields, …)` (selective re-presentation = literal Datenminimierung proof). Deterministic + offline.
- **Backend issuance hook** (`src/lib/mock-backend/api.ts`): at the Umzug success point (Vorgang `abgeschlossen`, after all eID taps) the backend mints a `Document` (`id: mb-vono-${vorgangId}`, `typ:'meldebestaetigung'`, `qr_payload` = the SD-JWT VC token, `eudi_compatible:true`) → `document_added`, plus a "liegt vor" `Letter` → Posteingang. Additive + idempotent (deterministic id; never breaks the cascade).

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

Autopilot-Katalog teaser fields (2026-06-13): `AutopilotKatalogEntry` (`src/types/value-receipt.ts`, served by `api.getAutopilotKatalog`) gained two required `ca.`-teaser estimates — `behoerden_count` and `geschaetzte_zeitersparnis_min` — for the dashboard catalog preview cards; these are intentionally distinct from the realized `ValueReceipt` numbers of a completed run and are always rendered with „ca.".

## Update protocol

When any of the following change, this file must be updated by the responsible agent in the same review pass:
- `src/lib/mock-backend/api.ts` public surface
- `src/types/*` shapes
- `src/app/api/assistant/route.ts` execution model
- Persistence key layout
