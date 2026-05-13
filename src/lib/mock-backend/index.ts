/**
 * Barrel-Export der Mock-Backend-Schicht. Komponenten und Server-Routen
 * importieren ausschließlich `api` von hier; interne Module (persistence,
 * schemas, …) bleiben Implementierungs-Details.
 */
export { api, getMockKanalForBehoerde, MockBackendError } from './api';
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
