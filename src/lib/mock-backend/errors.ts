/**
 * Synthetischer Fehler aus der Mock-Backend-Schicht. Wird per 5%-Wahrscheinlichkeit
 * von `withLatency` geworfen (außer bei `NEXT_PUBLIC_RELIABLE === '1'`) und kann
 * von Komponenten als „Behörde temporär nicht erreichbar" UI-Banner gerendert werden.
 */
export class MockBackendError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    options: { code?: string; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'MockBackendError';
    this.code = options.code ?? 'BEHOERDE_NICHT_ERREICHBAR';
    this.retryable = options.retryable ?? true;
  }
}
