'use client';

import { useEffect } from 'react';

import { api } from '@/lib/mock-backend';
import {
  __orchestrationInternals,
  __resetEngineDeterminism,
  verifyChainSync,
} from '@/lib/mock-backend/orchestration';

/**
 * Test-only window bridge for the six resilience e2e proofs (Spec § 7).
 *
 * Mounts ONLY when `NEXT_PUBLIC_ENABLE_ORCH_TEST === '1'` (set by the reliable
 * prod build the e2e runs against) — it is a no-op in the real demo. It exposes
 * the engine's ALREADY-EXPORTED deterministic test seams (force-fail, fake
 * clock, re-drain, audit tamper) on `window.__orchestrationTest` so Playwright
 * can drive faults deterministically rather than relying on the 5% rate.
 *
 * IMPORTANT: the clock + re-drive seams (`installFakeClock`/`tick`/`drain`)
 * delegate to `api.__orchestrationTest`, NOT to the bridge's own
 * `getEngine()`/`makeFakeClock()`. Under code-splitting the orchestration module
 * the bridge imports can resolve to a DIFFERENT engine/clock singleton than the
 * one `api.ts` wired `startUmzug`/`authorizeStep` onto — so a fake clock the
 * bridge installed itself, and a `drainAll` it ran itself, would not be the clock
 * the live saga reads nor the engine the live saga is on (proofs b/c/d could not
 * re-drive). `api.__orchestrationTest` is attached inside `api.ts`'s own module
 * scope and closes over the exact `getEngine()` singleton the cascade runs on, so
 * delegating through it drives the real instance. Only the SHARED-singleton seams
 * (`forceFail`/`clearFail` via the shared transport, `verify`/`tamper` via the
 * shared persistence port) stay bridge-local — those already reached the live
 * saga. `api` is imported statically so the seam is attached before first use.
 *
 * Production has no such bridge: the flag is unset, so nothing is installed and
 * `window.__orchestrationTest` is never defined. The `api.__orchestrationTest`
 * seam is itself flag-gated in api.ts, so this delegation is a no-op without it.
 */
export function OrchestrationTestBridge() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_ORCH_TEST !== '1') return;

    // Touch `api` so the mock-backend (and its engine hook wiring, plus the
    // `api.__orchestrationTest` seam this bridge delegates to) is loaded.
    void api;

    /** The real-instance clock/drive seam, attached in api.ts's own module scope. */
    function seam() {
      const s = api.__orchestrationTest;
      if (!s) {
        throw new Error(
          'api.__orchestrationTest is not attached — set NEXT_PUBLIC_ENABLE_ORCH_TEST=1 (or reliable mode).',
        );
      }
      return s;
    }

    const bridge = {
      forceFail(behoerdeId: string, mode: 'transient' | 'permanent') {
        __orchestrationInternals.getTransport().__forceFail(behoerdeId, mode);
      },
      clearFail(behoerdeId: string) {
        __orchestrationInternals.getTransport().__clearForceFail(behoerdeId);
      },
      installFakeClock() {
        seam().installFakeClock();
      },
      tick(ms: number) {
        seam().tick(ms);
      },
      async drain(sagaId: string) {
        await seam().drain(sagaId);
      },
      verify() {
        return verifyChainSync(
          __orchestrationInternals.persistencePort.readAuditLog(),
        );
      },
      /**
       * Tamper hook (proof (f)): splice one persisted audit entry's payload
       * WITHOUT recomputing hashes, so verifyChain breaks at that seq. Returns
       * the mutated seq. This path exists only behind this test flag.
       */
      tamper(seq?: number): number {
        const port = __orchestrationInternals.persistencePort;
        const log = port.readAuditLog();
        if (log.length === 0) return -1;
        const idx =
          typeof seq === 'number'
            ? log.findIndex((e) => e.seq === seq)
            : Math.min(1, log.length - 1);
        const target = idx >= 0 ? idx : 0;
        const entry = log[target];
        const mutated = {
          ...entry,
          payload: { ...entry.payload, __tampered: true },
        };
        const next = log.map((e, i) => (i === target ? mutated : e));
        port.writeAuditLog(next);
        return entry.seq;
      },
      reset() {
        __resetEngineDeterminism();
      },
    };

    (
      window as unknown as { __orchestrationTest?: typeof bridge }
    ).__orchestrationTest = bridge;
    window.dispatchEvent(new Event('orchestration-test-ready'));
  }, []);

  return null;
}
