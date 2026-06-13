/**
 * Reliable-Mode-Auflösung für den Engine-Fault-Injektor (Spec § 4.1, § 0.2).
 *
 * Spiegelt die bestehende Auflösung aus `latency.ts` / `autopilot/umzug.ts`:
 *   - Server-HTTP-Pfad: Request-Kontext-Flag hat Vorrang.
 *   - `NEXT_PUBLIC_RELIABLE=1` (Loom/Spine-Build).
 *   - Browser: `?reliable=1` oder sticky `meta.reliable_mode`.
 *
 * Im Reliable-Mode ist der Engine-Fault-Injektor AUS → die Spine bleibt
 * deterministisch grün. Tests treiben Fehler explizit über `__test.forceFail`,
 * nicht über eine Zufallsrate.
 */
import { getRequestContext } from '../store-context';

export function isReliableModeForEngine(): boolean {
  const reqCtx = getRequestContext();
  if (reqCtx) return reqCtx.reliable;

  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_RELIABLE === '1'
  ) {
    return true;
  }

  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reliable') === '1') return true;
      const meta = window.localStorage.getItem('govtech-de:v1:meta');
      if (meta) {
        const parsed = JSON.parse(meta) as { reliable_mode?: boolean };
        if (parsed?.reliable_mode === true) return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}
