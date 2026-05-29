/**
 * Test-facing barrel für die **In-Process-Core**-`api` (Stage 3).
 *
 * Der öffentliche Index (`./index`) exportiert seit Stage 3 den HTTP-Fetch-
 * Client als `api` (Komponenten sprechen darüber das echte Backend an). Die
 * Unit-Tests testen aber die In-Process-Implementierung direkt und dürfen NICHT
 * über `fetch` laufen (kein Server in der Vitest-Umgebung). Dieser Barrel gibt
 * den Tests dieselben Symbole wie der alte Index — aber mit der Core-`api`.
 *
 * Symbol-Set = exakt das, was die Unit-Tests aus dem Index importiert hatten:
 *   api, MockBackendError, reseedForActivePersona, resolveReplyBodySync.
 */
export { api, MockBackendError } from './api';
export { reseedForActivePersona } from './seed';
export { resolveReplyBodySync } from './reply-templates';
