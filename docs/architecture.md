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
  // Autorisierungs-Flags (additiv, source of truth src/types/vorgang.ts):
  // requires_eid / requires_consent / requires_termin — steuern, welche Ein-Tap-
  // Autorisierung ein Bürger-Schritt verlangt (eID / DSGVO-Einwilligung /
  // Termin-Systemleistung, wenn physische Präsenz zwingend bleibt).
};

type Document = {
  id: string;
  typ: 'aufenthaltstitel' | 'geburtsurkunde' | 'meldebestaetigung' | 'steuerbescheid' | string;
  ausstellende_behoerde_id: string;
  ausgestellt_am: string;
  gueltig_bis?: string;
  // Synthetic QR payload. (For the Verifiable-Once-Only credential this is a
  // [MOCK] marker, NOT the token: minting + offline re-verify run server-side in
  // the verifyMeldebestaetigungCredential server action — node:crypto/jose must
  // never enter the client bundle.)
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
- **Backend issuance hook** (`src/lib/mock-backend/api.ts`): at the Umzug success point (Vorgang `abgeschlossen`, after all eID taps) the client-side backend persists a durable vault `Document` SHELL (`id: mb-vono-${vorgangId}`, `typ:'meldebestaetigung'`, `qr_payload` = a `[MOCK]` marker, `eudi_compatible:true`) → `document_added`, plus a "liegt vor" `Letter` → Posteingang. It does NOT mint the token — the issuer is server-only; minting + offline re-verify run in the `verifyMeldebestaetigungCredential` server action (which Beat 1/3 call), keeping `node:crypto`/`jose` out of the client bundle. Additive + idempotent (deterministic id; never breaks the cascade).

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

### Proaktiver Wohngeld-Anspruch-Hinweis (2026-06-27)

Supporting-track addition (Spec `docs/specs/proaktiver-wohngeld-anspruch.md` § 6). A proactive, data-triggered "you may be entitled to Wohngeld" card on the dashboard. **Honesty-locked**: the euro figure is a synthetic **[MOCK]** estimate, never seed-sourced; the whole concept is **[ZUKUNFT 2027]**.

New type file `src/types/wohngeld-estimate.ts` → `WohngeldAnspruchEstimate` (`qualifiziert`, `geschaetzt_min_eur`/`geschaetzt_max_eur` (range only, hard-capped €180–370), `mietstufe` 1–7, `haushaltsgroesse`, `trigger_label_i18n_key`, `rechtsgrundlage[]`, `zukunft: true`).

Additive **optional** `Persona` fields (no break): `wohnverhaeltnis?: 'miete' | 'eigentum'` and `wohngeld_indikation?: boolean` (a non-numeric heuristic flag — **never** an income/rent amount; there is no numeric income field anywhere in the Stammdaten). `DashboardSnapshot` gained optional `wohngeld_hinweis?: WohngeldAnspruchEstimate | null`, prefilled by `buildDashboard` so the card renders without a separate roundtrip.

Estimate + gate live in `src/lib/mock-backend/lebenslagen/wohngeld-estimate.ts` (single source of truth, shared between the snapshot path and the direct API call): `estimateWohngeldAnspruch(persona)` (pure predicate + derivations; non-qualifying persona → `null`, never a "kein Anspruch" payload), `resolveWohngeldHinweis(persona, now)` (estimate + suppression gate), plus the persisting mutators. The euro range is a deterministic function of `(haushaltsgroesse, mietstufe)` clamped to €180–370; Anna (HH 3, Mietstufe IV/4) yields **min 220 / max 340**. Mietstufe derives from the registered municipality ([MOCK] table: Berlin → 4, default → 3), not raw PLZ.

New `api` methods (all `withLatency` + `ensureBooted`, dispatched through `api.ts`):

```ts
getWohngeldHinweis(personaId): Promise<WohngeldAnspruchEstimate | null>; // null if not qualified OR consent revoked OR dismissed OR snooze in future
dismissWohngeldHinweis(personaId): Promise<void>;
snoozeWohngeldHinweis(personaId, tage): Promise<void>;
setWohngeldHinweisConsent(personaId, consent): Promise<void>;
```

New persistence keys under `govtech-de:v1:`: `wohngeld-hinweis:dismissed` (`Record<PersonaId, ISO>`), `wohngeld-hinweis:snoozed-until` (`Record<PersonaId, ISO>`), `wohngeld-hinweis:consent` (`Record<PersonaId, boolean>`, default `true` when absent). Seed: `anna-petrov` only carries `wohnverhaeltnis: 'miete'` + `wohngeld_indikation: true` (Schmidt/Mehmet are the negative path — no card).

## Protokoll-Modus — real Deutschland-Stack protocols behind a flag (ADR, 2026-07-02)

Spec: `docs/specs/protokoll-modus.md`. Program plan + claims matrix: `docs/specs/protocol-real-integration-plan.md`. Live evidence: `docs/research/protokoll-modus-live-evidence-2026-07-02.md`.

**Decision — ports & adapters, two adapters wrapped, one default.** The runtime keeps a single default path (components → `lib/mock-backend/api.ts` → localStorage, **Demo-Modus**, the only thing deployed to Vercel). Two flows gain a second, env-flagged adapter that speaks a real protocol server-side:

```
SubmissionPort      → FitConnectAdapter (FITKO TEST)   | localStorage/mock (default)
WalletVerifierPort  → Oid4vpAdapter (our own verifier)  | mock present-dialog (default)
RegisterPort        → mock only, permanently            | (sovereign — NOOTS, never a private app)
```

**Boundary (non-negotiable).** Real protocol clients run **only** in Next.js route handlers (`runtime='nodejs'`, `dynamic='force-dynamic'`); secrets and private JWKs never enter the client bundle. Heavy protocol deps (`@openid4vc/openid4vp`, the FIT-Connect REST core) are **dynamic-imported inside the flag-on branch** — mirroring the shipped `import('./rest-tier2')` — so the flag-off/deployed bundle stays lean and `next build` is green both ways. The client never sees a flag: it discovers availability via a **capability GET** (`{available}`), and every action route returns HTTP 404 when its flag is off.

**Flag model (server-only env, not `NEXT_PUBLIC`):**
- `FIT_CONNECT_LIVE=1` (+ sender/subscriber creds + `FIT_CONNECT_DESTINATION_ID` + `FIT_CONNECT_LEIKA_KEY` + local JWK paths) → Workstream A. Env contract: `docs/specs/fit-connect-tier2-live-roundtrip.md` §4.
- `EUDI_VP_LIVE=1` (+ `EUDI_VP_EXTERNAL_URL`, optional `EUDI_VP_SIGNING_JWK_PATH`) → Workstream B. `EUDI_VP_EXTERNAL_URL` is the public tunnel base and **rotates on tunnel restart → read at request time, never cached**.

**Workstream A — FIT-Connect (`src/app/api/protocol/fit-connect/*`, `src/lib/fit-connect/set-decode.ts`, `ProtokollInspector`).** Reuses the shipped Tier-2 round-trip (`rest-tier2.ts`): a click on the Umzug run page submits one i-Kfz leg to the FITKO TEST sandbox against **our own `[MOCK destination]` Zustellpunkt**, and the inspector renders the real `submissionId`/`caseId`, JWS-signed SETs decoded with per-SET signature verdict, and the sent JWE protected headers. The run-page dossier / `buildCascadeRows` is **not** rewired — Demo-Modus stays byte-identical; the inspector is the separate real-event view.

**Workstream B — EUDI OpenID4VP verifier (`src/app/api/eudi/vp/*`, `src/lib/eudi/vp/*`, `PresentCredentialProtokollPanel`).** Our own OpenID4VP 1.0 + DCQL verifier: create-session → `openid4vp://` QR (request-by-reference `request_uri`) → wallet fetches request (unsigned or x5c-signed demo cert) → `direct_post` response → verify SD-JWT VC with the shipped `verifyPidSdJwtVc` **plus** new KB-JWT key-binding verification (`vp/kb-jwt.ts` — the gap `verify.ts` defers). Claims requested = the same 3 the mock dialog shows (given_name/family_name/birthdate). A physical EU-reference wallet APK can scan it; `scripts/eudi-present-pid.mjs` is the phone-free proof (persona PID fixture + holder key from `.secrets/eudi/`).

**Session state.** VP sessions live in an in-memory `Map` with a 5-min TTL (`vp/session-store.ts`) — correct here because the feature is local-only (flag off on Vercel). A Map does not survive Vercel cold starts / multiple lambdas; the documented serverless swap is **Vercel KV behind the same interface** (not built — same "excluded from deployed build" stance as Tier-2).

**Honesty (structural, enforced in review vs. plan §2).** `mockDestination: true` (FIT-Connect) and `sandbox: true` (VP) are emitted markers — the code cannot produce a "real Behörde"/"production trust anchor" path. TEST ≠ prod everywhere; failures are framed as the TEST sandbox / our own destination, never a real authority; no eIDAS/production-RP claim. Register reads / Bringschuld stay simulated permanently (sovereign).

## Update protocol

When any of the following change, this file must be updated by the responsible agent in the same review pass:
- `src/lib/mock-backend/api.ts` public surface
- `src/types/*` shapes
- `src/app/api/assistant/route.ts` execution model
- Persistence key layout
