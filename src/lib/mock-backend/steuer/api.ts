/**
 * Steuer Mock-Backend-API (`redesign-steuer.md` § 6). Liefert die
 * vorausgefüllte Steuer-Übersicht der aktiven Persona für ein Jahr aus dem
 * Seed-Bucket `govtech-de:v1:steuer`.
 *
 * Latenz: durch `withLatency()` (300–800 ms + 5 % Fehler).
 *
 * Hand-off note für assistant-engineer: künftiges Tool `get_steuer_uebersicht`
 * spiegelt `getSteuerUebersicht(steuerjahr)`.
 */
import type { PersonaId, SteuerUebersicht } from '@/types';
import { MockBackendError } from '../errors';
import { withLatency } from '../latency';
import { readOrInit, type CollectionKey } from '../persistence';
import { steuerBucketSchema } from '../schemas';

type SteuerBucket = Record<string, Record<string, SteuerUebersicht>>;

function loadSteuerBucket(): SteuerBucket {
  return readOrInit(
    'steuer' as CollectionKey,
    steuerBucketSchema as unknown as import('zod').ZodType<SteuerBucket>,
    {} as SteuerBucket,
  );
}

export interface SteuerApi {
  getSteuerUebersicht(
    personaId: PersonaId,
    steuerjahr: number,
  ): Promise<SteuerUebersicht>;
}

export const steuerApi: SteuerApi = {
  getSteuerUebersicht: (personaId: PersonaId, steuerjahr: number) =>
    withLatency<SteuerUebersicht>(() => {
      const bucket = loadSteuerBucket();
      const perPersona = bucket[personaId];
      const eintrag = perPersona?.[String(steuerjahr)];
      if (eintrag) return eintrag;
      // Personas führen unterschiedliche Entwurfs-Jahre (Anna: 2024 offen;
      // Markus: 2024 beschieden → Entwurf 2025). Die Page kennt die Persona
      // nicht (localStorage erst nach Hydration) und fragt ein Default-Jahr an
      // — fehlt es, liefern wir das NEUESTE vorhandene Jahr der Persona statt
      // eines Fehlers; die Anzeige nutzt `uebersicht.steuerjahr`.
      const jahre = Object.keys(perPersona ?? {}).sort((a, b) => Number(b) - Number(a));
      const neuestes = jahre[0] ? perPersona?.[jahre[0]] : undefined;
      if (!neuestes) {
        throw new MockBackendError(
          `Kein Steuer-Entwurf für Persona "${personaId}", Jahr ${steuerjahr}.`,
          { code: 'STEUER_JAHR_NOT_FOUND', retryable: false },
        );
      }
      return neuestes;
    }),
};
