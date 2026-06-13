/**
 * Ambient typing for the test-only window seam exposed by
 * <OrchestrationTestBridge> (src/components/orchestration/OrchestrationTestBridge.tsx)
 * when NEXT_PUBLIC_ENABLE_ORCH_TEST=1. Only the resilience e2e uses it; it is
 * never present in the real demo build.
 */
interface OrchestrationTestBridgeApi {
  forceFail(behoerdeId: string, mode: 'transient' | 'permanent'): void;
  clearFail(behoerdeId: string): void;
  installFakeClock(): void;
  tick(ms: number): void;
  drain(sagaId: string): Promise<void>;
  verify(): { ok: boolean; brokenAtSeq?: number; count: number };
  tamper(seq?: number): number;
  reset(): void;
}

interface Window {
  __orchestrationTest?: OrchestrationTestBridgeApi;
}
