import type { Document } from './document';
import type { Letter } from './letter';
import type { AutopilotStep, VorgangStatus } from './vorgang';

/**
 * Events, die die Mock-Backend-Schicht an die UI publiziert.
 * Subscribers via `api.subscribe(listener)`.
 */
export type MockBackendEvent =
  | { type: 'letter_received'; letter: Letter }
  | { type: 'letter_status_changed'; letterId: string; status: Letter['status'] }
  | { type: 'vorgang_created'; vorgangId: string }
  | { type: 'vorgang_status_changed'; vorgangId: string; status: VorgangStatus }
  | { type: 'autopilot_step'; vorgangId: string; step: AutopilotStep }
  | { type: 'document_added'; document: Document };

export type MockBackendEventListener = (event: MockBackendEvent) => void;
