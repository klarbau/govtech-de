/**
 * `[MOCK]` Transport-Adapter (Spec § 4).
 *
 * ════════════════════════════════════════════════════════════════════════════
 * OSCI/XTA-INSPIRIERT — KEIN echtes OSCI/XTA, kein FIT-Connect, kein NOOTS.
 * ════════════════════════════════════════════════════════════════════════════
 * Die Form (Laufzettel = routing slip, positive/negative Quittung = receipt)
 * ist der OSCI-Semantik nachempfunden, aber jeder Send, jede Quittung, jeder
 * Laufzettel ist synthetisch. Dies ist der EINE Swap-Point: ein späterer
 * Commit mit echtem Transport berührte nur diese Datei (§ 9.3 out-of-scope).
 *
 * Garantie: at-least-once Transport, exactly-once Effekt. Ein `deliver()` mit
 * gesehenem `idempotencyKey` gibt die gespeicherte Quittung mit
 * `fromCache: true` zurück und führt den Effekt NICHT erneut aus.
 *
 * Fault-Injektor: NICHT die 5%-Zufallsrate (die bleibt für die UI-Pfade in
 * latency.ts). Tests treiben Fehler deterministisch über `forceFail()`. Im
 * Reliable-Mode ist das Zufalls-Fault aus → die Spine bleibt deterministisch.
 */
import type {
  Quittung,
  TransportEnvelope,
  TransportReceipt,
} from '@/types/orchestration';
import { getEngineClock, getIdSource, getEngineRandom } from './clock';

export interface Transport {
  deliver(env: TransportEnvelope): Promise<TransportReceipt>;
  /** Test/diagnostic: clears the dedupe cache (fresh process simulation). */
  __clearCache(): void;
  /** Force the NEXT delivery to a Behörde to fail (test fault knob). */
  __forceFail(behoerdeId: string, mode: 'transient' | 'permanent'): void;
  /** Clear any forced-fail for a Behörde. */
  __clearForceFail(behoerdeId: string): void;
}

type ForceMode = 'transient' | 'permanent';

/**
 * In-memory dedupe map (§ 4.1): `idempotencyKey → receipt`. In-memory is
 * acceptable — after a crash the engine re-derives idempotency from the
 * persisted step's stored positive receipt, so a re-send returns that.
 */
interface MockTransportState {
  processedKeys: Map<string, TransportReceipt>;
  forced: Map<string, ForceMode>;
}

function createState(): MockTransportState {
  return { processedKeys: new Map(), forced: new Map() };
}

/**
 * The fault gate. `reliable` (Loom/spine) AND no forced-fail → always positive.
 * The random rate is OFF by default for the engine (faults are explicit) to
 * keep proofs deterministic; the optional `randomFailRate` exists for parity
 * with the legacy 5% behaviour but the engine wires it to 0.
 */
export interface MockTransportConfig {
  /** When true, the random fault is disabled (spine/Loom). Default true. */
  reliable: () => boolean;
  /** Random transient-fail probability when NOT reliable. Default 0. */
  randomFailRate?: number;
}

export function createMockTransport(config: MockTransportConfig): Transport {
  const state = createState();
  const randomFailRate = config.randomFailRate ?? 0;

  function buildReceipt(
    env: TransportEnvelope,
    quittung: Quittung,
    fromCache: boolean,
  ): TransportReceipt {
    const ids = getIdSource();
    const clock = getEngineClock();
    return {
      receiptId: ids.receiptId(env.behoerdeId),
      messageId: env.messageId,
      behoerdeId: env.behoerdeId,
      quittung,
      laufzettel: {
        acceptedAt: clock.now(),
        transportCode:
          quittung === 'positive' ? 'ausgefuehrt' : 'nicht_zustellbar',
      },
      fromCache,
      mock: true,
    };
  }

  return {
    async deliver(env: TransportEnvelope): Promise<TransportReceipt> {
      // ── Idempotenz: gesehener Key → gespeicherte Quittung, kein Re-Effekt.
      const cached = state.processedKeys.get(env.idempotencyKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      // ── Fault-Gate (deterministisch über forceFail; sonst optional random).
      const forced = state.forced.get(env.behoerdeId);
      let fail = false;
      let permanent = false;
      if (forced) {
        fail = true;
        permanent = forced === 'permanent';
      } else if (!config.reliable() && randomFailRate > 0) {
        fail = getEngineRandom()() < randomFailRate;
      }

      if (fail) {
        // Negative Quittung — NICHT in den Dedupe-Cache (Effekt ist nicht
        // eingetreten; ein Retry muss den echten Send wiederholen können).
        const receipt = buildReceipt(env, 'negative', false);
        const message = permanent
          ? `${env.behoerdeId}: Empfänger unbekannt — keine Zustellung möglich`
          : `${env.behoerdeId}: temporär nicht erreichbar`;
        const err = new TransportError(message, permanent, receipt);
        throw err;
      }

      // ── Positive Quittung — Effekt eingetreten, in den Dedupe-Cache.
      const receipt = buildReceipt(env, 'positive', false);
      state.processedKeys.set(env.idempotencyKey, receipt);
      return receipt;
    },

    __clearCache() {
      state.processedKeys.clear();
    },

    __forceFail(behoerdeId, mode) {
      state.forced.set(behoerdeId, mode);
    },

    __clearForceFail(behoerdeId) {
      state.forced.delete(behoerdeId);
    },
  };
}

/** Thrown by `deliver()` on a negative Quittung; carries the permanent flag. */
export class TransportError extends Error {
  public readonly permanent: boolean;
  public readonly receipt: TransportReceipt;
  constructor(message: string, permanent: boolean, receipt: TransportReceipt) {
    super(message);
    this.name = 'TransportError';
    this.permanent = permanent;
    this.receipt = receipt;
  }
}
