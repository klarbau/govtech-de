/**
 * Barrel-Export der Mock-Backend-Schicht.
 *
 * Deployment-Default (Browser): `api` ist hier die **In-Process-Core-`api`**
 * (`./api`). Sie schreibt/liest gegen den `LocalStorageStore` (Auflösung in
 * `store-context.ts` über `window.localStorage`) und streamt Events über den
 * In-Process-`EventBus` (`./events`). Damit ist der gesamte Demo-Zustand
 * client-seitig — robust auf Vercels zustandslosen Serverless-Funktionen, ohne
 * Server-Session-Affinität für die headline Umzug-Kaskade.
 *
 * Tool-Ausführung läuft ebenfalls client-seitig (z. B. `AssistentView` →
 * `api.previewUmzug`, `InlineCascade` → `api.bestaetigeAutopilotSchritt` /
 * `getVorgang` / `getLetterThread` / `subscribe`). `/api/assistant` ist nur der
 * zustandslose LLM-Proxy und unberührt.
 *
 * RETAINED, aber NICHT der Browser-Default: der HTTP/SSE-Fetch-Client
 * (`./client`) und die Server-Route-Handler (`src/app/api/mock/**`) bleiben im
 * Baum (für Tests / optionalen Server-Pfad). Wer den Server-Pfad braucht,
 * importiert `apiClient` direkt aus `./client`. Die Oberfläche beider ist
 * identisch (`MockBackendApi`, inkl. `subscribe`), das Re-Pointing ist drop-in.
 *
 * SSR-Sicherheit: `getCurrentStore()` (store-context.ts) guardet
 * `window.localStorage` und fällt unter SSR/Prerender auf einen
 * Prozess-`InMemoryStore` zurück; `api.subscribe` registriert nur einen
 * In-Memory-Listener (kein `window`-Zugriff) und ist damit no-op-sicher.
 */
export { api } from './api';
export { getMockKanalForBehoerde, MockBackendError } from './api';
export type { MockBackendApi } from './api';
export type { MockBackendEvent, MockBackendEventListener } from '@/types/mock-event';
export {
  seedIfEmpty,
  reseedForActivePersona,
  getActivePersonaId,
  syncReliableModeFromUrl,
} from './seed';
export {
  resolveReplyBody,
  resolveReplyBodySync,
  nachweisBezeichnungen,
} from './reply-templates';
export type {
  ResolveReplyBodyInput,
  ReplyTemplateId as ReplyTemplateIdResolver,
  ReplyTerminMode as ReplyTerminModeResolver,
} from './reply-templates';
// V1.5.1 — Picker-Order + Norm-Familie + Pre-Insertion-Modal-Spec.
export {
  getReplyTemplatePickerOrder,
  pickNormFamilie,
  getPreInsertionModalSpec,
} from './reply-template-order';
export type {
  NormFamilie,
  PreInsertionModalSpec,
  ReplyTemplateIdWithFreitext,
} from './reply-template-order';
