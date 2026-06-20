/**
 * Datenschutz-Cockpit Mock-Backend-API (`redesign-datenschutz.md` § 6).
 *
 * Die Einwilligungs-Toggles sind funktional + persistiert (echter
 * localStorage-Write-Pfad). Jede Toggle-Mutation emittiert einen
 * `UebermittlungsLogEntry` in den BESTEHENDEN `stammdaten:uebermittlungs-log`-
 * Bucket (über `appendLogEntry`) — kein paralleler Log. Datenquellen werden
 * read-only abgeleitet.
 *
 * Alle Methoden laufen durch `withLatency()`.
 */
import type {
  DatenquellenEintrag,
  DatenschutzEinwilligung,
  EinwilligungEmpfaenger,
  Persona,
  PersonaId,
} from '@/types';
import { MockBackendError } from '../errors';
import { emit } from '../events';
import { uuid } from '../id';
import { withLatency } from '../latency';
import { readOrInit, write, type CollectionKey } from '../persistence';
import {
  datenschutzEinwilligungenBucketSchema,
  datenschutzVisionBannerDismissedBucketSchema,
  personasArraySchema,
} from '../schemas';
import { appendLogEntry } from '../stammdaten/api';

// ---------------------------------------------------------------------------
// Seed-Defaults (Prototyp): drei hoheitlich/vertraglich gekoppelte Empfänger
// Ein, private Empfänger Aus (rendert Inaktiv / Toggle off).
// ---------------------------------------------------------------------------

function defaultEinwilligungen(): DatenschutzEinwilligung[] {
  return [
    {
      empfaenger: 'krankenkasse',
      erteilt: true,
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    },
    {
      empfaenger: 'arbeitgeber',
      erteilt: true,
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    },
    {
      empfaenger: 'familienkasse',
      erteilt: true,
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    },
    {
      empfaenger: 'private',
      erteilt: false,
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
    },
  ];
}

type EinwilligungenBucket = Record<PersonaId, DatenschutzEinwilligung[]>;

function loadEinwilligungenBucket(): EinwilligungenBucket {
  return readOrInit(
    'datenschutz:einwilligungen' as CollectionKey,
    datenschutzEinwilligungenBucketSchema,
    {} as EinwilligungenBucket,
  );
}

function saveEinwilligungenBucket(bucket: EinwilligungenBucket): void {
  write('datenschutz:einwilligungen' as CollectionKey, bucket);
}

/** Lazy-Init aus Seed-Defaults bei erstem Zugriff für eine Persona. */
function ensureEinwilligungen(personaId: PersonaId): DatenschutzEinwilligung[] {
  const bucket = loadEinwilligungenBucket();
  if (!bucket[personaId] || bucket[personaId].length === 0) {
    bucket[personaId] = defaultEinwilligungen();
    saveEinwilligungenBucket(bucket);
  }
  return bucket[personaId];
}

function loadPersonaById(personaId: PersonaId): Persona {
  const personas = readOrInit<Persona[]>(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    [] as Persona[],
  );
  const persona = personas.find((p) => p.id === personaId);
  if (!persona) {
    throw new MockBackendError(`Persona "${personaId}" nicht gefunden.`, {
      code: 'PERSONA_NOT_FOUND',
      retryable: false,
    });
  }
  return persona;
}

// ---------------------------------------------------------------------------
// Vision-Banner-Dismissed-Bucket
// ---------------------------------------------------------------------------

type BannerDismissedBucket = Record<PersonaId, boolean>;

function loadBannerDismissedBucket(): BannerDismissedBucket {
  return readOrInit(
    'datenschutz:vision-banner-dismissed' as CollectionKey,
    datenschutzVisionBannerDismissedBucketSchema,
    {} as BannerDismissedBucket,
  );
}

function saveBannerDismissedBucket(bucket: BannerDismissedBucket): void {
  write('datenschutz:vision-banner-dismissed' as CollectionKey, bucket);
}

// ---------------------------------------------------------------------------
// Datenquellen-Ableitung (read-only)
// ---------------------------------------------------------------------------

function buildDatenquellen(
  persona: Persona,
  einwilligungen: DatenschutzEinwilligung[],
): DatenquellenEintrag[] {
  const krankenkasseErteilt =
    einwilligungen.find((e) => e.empfaenger === 'krankenkasse')?.erteilt ??
    false;

  const out: DatenquellenEintrag[] = [
    {
      // Meldebehörde (hoheitlich, automatisch synchronisiert via § 36 BMG).
      behoerde_id: 'buergeramt-berlin-friedrichshain-kreuzberg',
      zugriffsart: 'automatisch_synchronisiert',
      rechtsgrundlage: '§ 36 BMG',
      aktualitaet: 'aktuell',
    },
    {
      // Finanzamt (Steuer-ID-Zuordnung, hoheitlich).
      behoerde_id: 'finanzamt-koerperschaften-i-berlin',
      zugriffsart: 'automatisch_synchronisiert',
      rechtsgrundlage: '§ 36 BMG i.V.m. § 139b AO',
      aktualitaet: 'aktuell',
    },
    {
      // Beitragsservice (Rundfunkbeitrag, hoheitliche Meldedaten-Empfänger).
      behoerde_id: 'beitragsservice-koeln',
      zugriffsart: 'automatisch_synchronisiert',
      rechtsgrundlage: '§ 11 Abs. 4 RBStV i.V.m. § 36 BMG',
      aktualitaet: 'aktuell',
    },
  ];

  // Krankenkasse: einwilligungsbasiert, gekoppelt an Einwilligungs-Toggle.
  if (persona.krankenversicherung) {
    out.push({
      behoerde_id: 'aok-nordost',
      zugriffsart: 'einwilligungsbasiert',
      rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO',
      aktualitaet: krankenkasseErteilt ? 'aktuell' : '—',
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DatenschutzApi {
  getDatenschutzEinwilligungen(
    personaId: PersonaId,
  ): Promise<DatenschutzEinwilligung[]>;
  setDatenschutzEinwilligung(
    personaId: PersonaId,
    empfaenger: EinwilligungEmpfaenger,
    erteilt: boolean,
  ): Promise<void>;
  getDatenquellen(personaId: PersonaId): Promise<DatenquellenEintrag[]>;
  isVisionBannerDismissed(personaId: PersonaId): Promise<boolean>;
  dismissVisionBanner(personaId: PersonaId): Promise<void>;
}

export const datenschutzApi: DatenschutzApi = {
  getDatenschutzEinwilligungen: (personaId: PersonaId) =>
    withLatency<DatenschutzEinwilligung[]>(() => [
      ...ensureEinwilligungen(personaId),
    ]),

  setDatenschutzEinwilligung: (
    personaId: PersonaId,
    empfaenger: EinwilligungEmpfaenger,
    erteilt: boolean,
  ) =>
    withLatency<void>(() => {
      const bucket = loadEinwilligungenBucket();
      const list = bucket[personaId] ?? defaultEinwilligungen();
      const now = new Date().toISOString();
      // Bei Erteilung Art. 6 lit. a; bei Widerruf Art. 7 Abs. 3 DSGVO.
      const rechtsgrundlage = erteilt
        ? 'Art. 6 Abs. 1 lit. a DSGVO'
        : 'Art. 7 Abs. 3 DSGVO';
      let found = false;
      const next = list.map((e) => {
        if (e.empfaenger !== empfaenger) return e;
        found = true;
        return { ...e, erteilt, geaendert_am: now, rechtsgrundlage };
      });
      if (!found) {
        next.push({ empfaenger, erteilt, geaendert_am: now, rechtsgrundlage });
      }
      bucket[personaId] = next;
      saveEinwilligungenBucket(bucket);

      // UebermittlungsLogEntry in den BESTEHENDEN uebermittlungs-log-Bucket.
      const entry = {
        id: `log-${uuid()}`,
        timestamp: now,
        kategorie: 'app_aktivitaet' as const,
        field_id: 'datenschutz_einwilligung',
        sektion: 'sperren_einstellungen' as const,
        empfaenger_id: empfaenger,
        zweck_i18n_key: 'datenschutz.log.einwilligung_geaendert',
        rechtsgrundlage,
        note: `persona_id:${personaId};empfaenger:${empfaenger};erteilt:${erteilt};mock:true`,
      };
      appendLogEntry(personaId, entry);
      emit({
        type: 'stammdaten/log-entry-appended',
        persona_id: personaId,
        entry,
      });
    }),

  getDatenquellen: (personaId: PersonaId) =>
    withLatency<DatenquellenEintrag[]>(() => {
      const persona = loadPersonaById(personaId);
      const einwilligungen = ensureEinwilligungen(personaId);
      return buildDatenquellen(persona, einwilligungen);
    }),

  isVisionBannerDismissed: (personaId: PersonaId) =>
    withLatency<boolean>(
      () => loadBannerDismissedBucket()[personaId] ?? false,
      { min: 100, max: 250 },
    ),

  dismissVisionBanner: (personaId: PersonaId) =>
    withLatency<void>(
      () => {
        const bucket = loadBannerDismissedBucket();
        bucket[personaId] = true;
        saveBannerDismissedBucket(bucket);
      },
      { min: 100, max: 250 },
    ),
};
