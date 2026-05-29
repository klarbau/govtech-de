/**
 * Barrel-Export der Mock-Backend-Schicht.
 *
 * Stage 3 (HTTP-Migration): `api` ist hier der **Fetch-Client** (`./client`),
 * der jede Methode über `fetch('/api/mock')` / `EventSource('/api/mock/events')`
 * an die Server-Route-Handler delegiert. Komponenten importieren `api` von hier
 * und sprechen damit das echte HTTP-Backend an.
 *
 * WICHTIG: Server-Route-Handler (`src/app/api/mock/**`) und Unit-Tests dürfen
 * NICHT den Fetch-Client verwenden — sie importieren die In-Process-Core-`api`
 * direkt aus `./api` (bzw. spezifische Submodule). Dieser Index zeigt
 * ausschließlich auf den Client.
 */
export { apiClient as api } from './client';
export { getMockKanalForBehoerde, MockBackendError } from './api';
export type { MockBackendApi } from './api';
export type { MockBackendEvent, MockBackendEventListener } from '@/types/mock-event';
export { seedIfEmpty, reseedForActivePersona, getActivePersonaId } from './seed';
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
