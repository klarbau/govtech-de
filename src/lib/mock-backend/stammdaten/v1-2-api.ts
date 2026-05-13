/**
 * V1.2 Stammdaten — Kontakt-Schicht API-Implementation.
 *
 * Spec: `docs/specs/stammdaten-v1-1-kontakt-schicht.md` § 5.1.
 * Hard-Lines § 11.31–§ 11.41 (verifier-locked).
 *
 * Diese Datei kapselt alle V1.2-Lese-/Schreib-Pfade hinter den sieben neuen
 * API-Methoden. `api.ts` re-exportiert sie nur durch (Delegate-Pattern wie V1
 * + V1.1).
 *
 *   getKontakt(personaId)
 *   getNotificationPraeferenzen(personaId)
 *   getBehoerdeAnbindung(behoerdeId)
 *   toggleNotificationPraeferenz(personaId, kategorie, kanal)
 *   simulatePostfachAktivierung(personaId)
 *   simulateMobilOtpFlow(personaId, args)
 *   simulateFamilienkasseFollowupLetter(personaId)
 *
 * Latenz: alle Methoden laufen durch `withLatency()` (300–800 ms + 5 % Fehler);
 * `simulateFamilienkasseFollowupLetter` zusätzlich mit deterministischer
 * Mindest-Verzögerung für die Loom-Cut-Choreografie.
 */
import type {
  BundidPostfachAnbindung,
  Letter,
  NotificationKanal,
  NotificationPraeferenzen,
  Persona,
  PersonaId,
  PersonaKontakt,
  ToggleNotificationPraeferenzResult,
  VorgangsKategorie,
} from '@/types';
import { MOCK_OTP_DEMO_CODE } from '@/types';
import { MockBackendError } from '../errors';
import { emit } from '../events';
import { uuid } from '../id';
import { withLatency } from '../latency';
import { lookupSavingsCounter } from '../notification/savings-lookup';
import {
  buildKontaktFromLegacyV1,
} from '../persistence-migrations';
import {
  read,
  readOrInit,
  write,
  type CollectionKey,
} from '../persistence';
import {
  behoerdenArraySchema,
  lettersArraySchema,
  personasArraySchema,
  stammdatenKontaktV2BucketSchema,
} from '../schemas';
import { appendLogEntry } from './api';

// ---------------------------------------------------------------------------
// Persona-Lookup
// ---------------------------------------------------------------------------

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
// Kontakt-Bucket (V1.2 — Spec § 5.4 `stammdaten:notification-praeferenzen`)
// ---------------------------------------------------------------------------

function loadKontaktBucket(): Record<PersonaId, PersonaKontakt> {
  const existing = read(
    'stammdaten:notification-praeferenzen' as CollectionKey,
    stammdatenKontaktV2BucketSchema,
  );
  if (existing) return existing as Record<PersonaId, PersonaKontakt>;
  // Default: leerer Bucket (Migration füllt ihn beim Boot).
  write(
    'stammdaten:notification-praeferenzen' as CollectionKey,
    {} as Record<PersonaId, PersonaKontakt>,
  );
  return {};
}

function saveKontaktBucket(
  bucket: Record<PersonaId, PersonaKontakt>,
): void {
  write('stammdaten:notification-praeferenzen' as CollectionKey, bucket);
}

/**
 * Liefert den Kontakt-Snapshot für eine Persona. Fallback-Chain:
 *   1. Bucket `stammdaten:notification-praeferenzen` (Source-of-Truth nach
 *      V1.2-Migration).
 *   2. Persona-Fixture-Block (`persona.kontakt`, falls bereits V1.2-shape).
 *   3. Build aus Legacy-V1-shape (`buildKontaktFromLegacyV1`).
 */
function getKontaktForPersona(personaId: PersonaId): PersonaKontakt {
  const bucket = loadKontaktBucket();
  if (bucket[personaId]) return bucket[personaId];

  const persona = loadPersonaById(personaId);
  const legacy = persona.kontakt as
    | (PersonaKontakt & { email?: string; mobil?: string })
    | undefined;

  // Wenn Persona-Block bereits V1.2-shape trägt, Bucket initialisieren.
  if (legacy?.bundid_email && legacy.bundid_postfach && legacy.notification_praeferenzen) {
    bucket[personaId] = {
      bundid_email: legacy.bundid_email,
      bundid_mobil: legacy.bundid_mobil,
      bundid_postfach: legacy.bundid_postfach,
      notification_praeferenzen: legacy.notification_praeferenzen,
    };
    saveKontaktBucket(bucket);
    return bucket[personaId];
  }

  // V1-shape oder undefined → Build über Migrations-Helper (Persona-spezifische
  // Defaults aus Spec § 4.5 zuerst, dann Legacy-Fallback).
  const built = buildKontaktFromLegacyV1(personaId, {
    email: legacy?.email,
    mobil: legacy?.mobil,
  });
  bucket[personaId] = built;
  saveKontaktBucket(bucket);
  return built;
}

// ---------------------------------------------------------------------------
// Behörde-Lookup
// ---------------------------------------------------------------------------

function loadBehoerdeById(behoerdeId: string) {
  const behoerden = readOrInit(
    'behoerden' as CollectionKey,
    behoerdenArraySchema,
    [],
  );
  return behoerden.find((b) => b.id === behoerdeId);
}

// ---------------------------------------------------------------------------
// Hard-Lock-Helpers
// ---------------------------------------------------------------------------

/**
 * Drittstaatsangehörigkeit-Test — Hard-Lock-Trigger für Mehmet (§ 3.3).
 * Personas mit `aufenthaltstitel`-Block sind drittstaatsangehörig im Sinne
 * der V1.2-Demo (Anna ist deutsche Staatsangehörige; Mehmet ist deutscher
 * Staatsangehöriger im V1-Persona-Setup, hat aber als Selbstständiger eine
 * eigene ABH-Sub-Picker-Card-Logik im Frontend; Hard-Lock greift NUR wenn
 * Persona einen `aufenthaltstitel` trägt — sonst sieht der Picker den Sub-
 * Card-Hinweis NICHT).
 */
function hasDrittstaatsAufenthalt(persona: Persona): boolean {
  return !!persona.aufenthaltstitel?.norm;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StammdatenV12Api {
  /**
   * Liefert den V1.2-Kontakt-Snapshot der Persona. Lazy-Init bei erstem
   * Aufruf (Bucket aus Persona-Fixture befüllen).
   */
  getKontakt(personaId: PersonaId): Promise<PersonaKontakt>;

  /** Liefert nur die Notification-Präferenzen (5-Kategorien-Map). */
  getNotificationPraeferenzen(
    personaId: PersonaId,
  ): Promise<NotificationPraeferenzen>;

  /**
   * Liefert den BundID-Postfach-Anbindungs-Status einer Behörde
   * (Pflicht-Feld `bundid_postfach_anbindung`; Hard-Line § 11.35).
   */
  getBehoerdeAnbindung(
    behoerdeId: string,
  ): Promise<BundidPostfachAnbindung>;

  /**
   * Wechselt die Notification-Präferenz für eine Kategorie. Bei Hero-Pfad
   * (`familie × postfach` bei Anna-Persona) wird zusätzlich `cascade`-Daten
   * zurückgegeben — Frontend triggert dann
   * `simulateFamilienkasseFollowupLetter` und die Cross-fade-Animation.
   *
   * Hard-Locks (Hard-Line § 11.35):
   * - Wenn Persona drittstaatsangehörig + Kategorie `sonstige` + Kanal !==
   *   `brief`: wirft `BUNDID_HARD_LOCK_ABH` (ABH ist `nicht_angebunden`).
   *
   * Activity-Log-Eintrag: Kategorie `speculative_2027` (Spec § 5.3).
   */
  toggleNotificationPraeferenz(
    personaId: PersonaId,
    kategorie: VorgangsKategorie,
    kanal: NotificationKanal,
  ): Promise<ToggleNotificationPraeferenzResult>;

  /**
   * Demo-Only: setzt status auf `teilaktiviert` → nach 1.4 s auf `aktiv`.
   * In V1.2 NICHT im UI als CTA verfügbar (Hard-Line § 11.32 — nur via
   * Test-Helper / DevTools).
   */
  simulatePostfachAktivierung(
    personaId: PersonaId,
  ): Promise<{ aktiviert_am: string }>;

  /**
   * Mock-OTP-Flow für Mobilfunk. Akzeptiert immer Code `124857`
   * (`MOCK_OTP_DEMO_CODE`); alle anderen Werte werfen `OTP_INVALID`.
   * Bei verified=true: Activity-Log Kategorie `app_aktivitaet`.
   */
  simulateMobilOtpFlow(
    personaId: PersonaId,
    args: { code: string },
  ): Promise<{ verified: boolean }>;

  /**
   * Hero-Demo-Specific: erzeugt nach Familie-Kategorie-Wechsel auf `postfach`
   * eine Mock-Postfach-Nachricht der Familienkasse als Bridge zum Posteingang.
   *
   * - Fügt einen seeded Letter (`letter-familienkasse-bewilligung-postfach-followup`)
   *   zum `letters`-Bucket hinzu, mit `kanal: 'postfach'`.
   * - 1 Activity-Log-Eintrag Kategorie `behoerde_zu_buerger`.
   * - Idempotent: bei Re-Aufruf wird der existing letter zurückgegeben (kein
   *   Doppel-Eintrag).
   */
  simulateFamilienkasseFollowupLetter(
    personaId: PersonaId,
  ): Promise<Letter>;
}

const NOW = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Followup-Letter-Builder
// ---------------------------------------------------------------------------

const FOLLOWUP_LETTER_ID = 'letter-familienkasse-bewilligung-postfach-followup';

function buildFollowupLetter(personaId: PersonaId, now: string): Letter {
  return {
    id: FOLLOWUP_LETTER_ID,
    absender_behoerde_id: 'familienkasse-berlin-brandenburg',
    empfaenger_persona_id: personaId,
    aktenzeichen: '[MOCK] FK-NACHWEIS-892017/2026-Q3',
    betreff:
      'Folgebescheid Kindergeld — Quartalsabrechnung Q3 2026 (Demo-Postfach-Bridge)',
    body_de:
      '[MOCK – Verwaltungsdemo, keine echten Daten]\n\n' +
      'Familienkasse Berlin-Brandenburg, 14460 Potsdam\n\n' +
      'Sehr geehrte Frau Petrov,\n\n' +
      'im Anschluss an unseren Bewilligungsbescheid vom 08.05.2026 ' +
      '(Aktenzeichen [MOCK] 115FK668412) erhalten Sie hier den Folgebescheid ' +
      'für das dritte Quartal 2026. Nach § 9 OZG erfolgt die Bekanntgabe durch ' +
      'Bereitstellung in Ihrem BundID-Postfach. Der Bescheid gilt am vierten ' +
      'Tag nach der Bereitstellung als bekannt gegeben (§ 9 Abs. 1 S. 3 OZG).\n\n' +
      '(Demo-Hinweis: Diese Nachricht wurde durch Ihre Notification-Präferenz-' +
      'Wechsel automatisch als Postfach-Eingang generiert.)\n\n' +
      'Mit freundlichen Grüßen\n' +
      'Familienkasse Berlin-Brandenburg\n' +
      'Az. [MOCK] FK-NACHWEIS-892017/2026-Q3',
    ai_summary: {
      de:
        'Quartalsabrechnung Q3 2026; identisch zur Q2-Abrechnung. ' +
        'Keine Aktion erforderlich.',
    },
    archetype: 'familienkasse-nachweis',
    auth_channel: 'zbp-bundid',
    fristen: [],
    was_kann_ich_tun_options: [],
    status: 'ungelesen',
    empfangen_am: now,
    kanal: 'postfach',
  };
}

// ---------------------------------------------------------------------------
// Public-API-Implementation
// ---------------------------------------------------------------------------

export const stammdatenV12Api: StammdatenV12Api = {
  getKontakt: (personaId: PersonaId) =>
    withLatency<PersonaKontakt>(
      () => getKontaktForPersona(personaId),
      { min: 200, max: 400 },
    ),

  getNotificationPraeferenzen: (personaId: PersonaId) =>
    withLatency<NotificationPraeferenzen>(
      () => getKontaktForPersona(personaId).notification_praeferenzen,
      { min: 150, max: 300 },
    ),

  getBehoerdeAnbindung: (behoerdeId: string) =>
    withLatency<BundidPostfachAnbindung>(
      () => {
        const beh = loadBehoerdeById(behoerdeId);
        if (!beh) {
          throw new MockBackendError(
            `Behörde "${behoerdeId}" nicht gefunden.`,
            { code: 'BEHOERDE_NOT_FOUND', retryable: false },
          );
        }
        return (
          (beh as { bundid_postfach_anbindung?: BundidPostfachAnbindung })
            .bundid_postfach_anbindung ?? 'nicht_angebunden'
        );
      },
      { min: 100, max: 300 },
    ),

  toggleNotificationPraeferenz: (
    personaId: PersonaId,
    kategorie: VorgangsKategorie,
    kanal: NotificationKanal,
  ) =>
    withLatency<ToggleNotificationPraeferenzResult>(
      () => {
        const persona = loadPersonaById(personaId);
        const kontakt = getKontaktForPersona(personaId);

        // Hard-Lock § 11.35 ABH (Mehmet drittstaatsangehörig × sonstige):
        // ABH/LEA ist `nicht_angebunden` — Frontend rendert Sub-Picker als
        // disabled; aber API-Aufruf von außen (Test-/Tool-Use) muss
        // ebenfalls verweigern.
        if (
          hasDrittstaatsAufenthalt(persona) &&
          kategorie === 'sonstige' &&
          kanal !== 'brief'
        ) {
          // ABH-Anbindung prüfen (Mehmet → abh-koeln; Anna-Persona hat
          // aufenthaltstitel.abh_behoerde_id `abh-berlin-lea` aber ist
          // nicht selbstständig + DE-staatsangehörig).
          const abhId = persona.aufenthaltstitel?.abh_behoerde_id;
          const abhBeh = abhId ? loadBehoerdeById(abhId) : undefined;
          const anbindung =
            (abhBeh as { bundid_postfach_anbindung?: BundidPostfachAnbindung } | undefined)
              ?.bundid_postfach_anbindung ?? 'nicht_angebunden';
          if (anbindung === 'nicht_angebunden') {
            throw new MockBackendError(
              'Aufenthalts-Bescheide nach §§ 86, 87 AufenthG kommen weiterhin per Postbrief — die zuständige ABH ist nicht an das BundID-Postfach angebunden.',
              { code: 'BUNDID_HARD_LOCK_ABH', retryable: false },
            );
          }
        }

        const vorher = kontakt.notification_praeferenzen[kategorie];
        const next: PersonaKontakt = {
          ...kontakt,
          notification_praeferenzen: {
            ...kontakt.notification_praeferenzen,
            [kategorie]: kanal,
          },
        };
        const bucket = loadKontaktBucket();
        bucket[personaId] = next;
        saveKontaktBucket(bucket);

        const counter = lookupSavingsCounter(kategorie, kanal);

        // Activity-Log: Kategorie `speculative_2027` (Spec § 5.3).
        const entryId = `log-${uuid()}`;
        const now = NOW();
        appendLogEntry(personaId, {
          id: entryId,
          timestamp: now,
          kategorie: 'speculative_2027',
          field_id: 'notification_praeferenz',
          sektion: 'sperren_einstellungen',
          zweck_i18n_key:
            'stammdaten.aktivitaet.zweck.spec_notification_praeferenz_geaendert',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO (2027-Vision)',
          note: `persona_id:${personaId}; field_id:notification_praeferenz; kategorie:${kategorie}; vorher:${vorher}; nachher:${kanal}; quelle:user_self_edit; mock:true`,
        });

        emit({
          type: 'stammdaten/notification-praeferenz-changed',
          persona_id: personaId,
          kategorie,
          vorher,
          nachher: kanal,
          counter,
        });

        // Hero-Cascade nur bei `familie × postfach` für Anna (Hard-Line § 11.31).
        let cascade: ToggleNotificationPraeferenzResult['cascade'];
        if (
          personaId === 'anna-petrov' &&
          kategorie === 'familie' &&
          kanal === 'postfach'
        ) {
          cascade = {
            ersparte_briefe_pro_jahr: counter.briefe_pro_jahr_gespart,
            ersparte_tage_pro_bescheid: counter.tage_frist_gespart,
            vorher_letter_id: 'letter-familienkasse-bewilligung',
            followup_letter_hint_id: FOLLOWUP_LETTER_ID,
          };
        }

        return { ok: true, counter, cascade };
      },
      { min: 400, max: 800 },
    ),

  simulatePostfachAktivierung: (personaId: PersonaId) =>
    withLatency<{ aktiviert_am: string }>(
      () => {
        const kontakt = getKontaktForPersona(personaId);
        const now = NOW();
        const next: PersonaKontakt = {
          ...kontakt,
          bundid_postfach: {
            aktiviert: true,
            status: 'aktiv',
            aktiviert_am: now.slice(0, 10),
          },
        };
        const bucket = loadKontaktBucket();
        bucket[personaId] = next;
        saveKontaktBucket(bucket);

        emit({
          type: 'stammdaten/postfach-activation-simulated',
          persona_id: personaId,
          new_status: 'aktiv',
        });
        return { aktiviert_am: now.slice(0, 10) };
      },
      { min: 1200, max: 1500 },
    ),

  simulateMobilOtpFlow: (personaId: PersonaId, args: { code: string }) =>
    withLatency<{ verified: boolean }>(
      () => {
        if (args.code !== MOCK_OTP_DEMO_CODE) {
          emit({
            type: 'stammdaten/bundid-mobil-otp-failed',
            persona_id: personaId,
          });
          throw new MockBackendError('OTP ungültig.', {
            code: 'OTP_INVALID',
            retryable: true,
          });
        }
        const kontakt = getKontaktForPersona(personaId);
        const now = NOW();
        const verifizierungsDatum = now.slice(0, 10);
        const next: PersonaKontakt = {
          ...kontakt,
          bundid_mobil: kontakt.bundid_mobil
            ? {
                ...kontakt.bundid_mobil,
                verified: true,
                verifiziert_am: verifizierungsDatum,
              }
            : {
                value: '[MOCK] +49 000 0000000',
                verified: true,
                quelle: 'bundid_self_attested',
                verifiziert_am: verifizierungsDatum,
              },
        };
        const bucket = loadKontaktBucket();
        bucket[personaId] = next;
        saveKontaktBucket(bucket);

        // Activity-Log: app_aktivitaet (Spec § 5.1).
        appendLogEntry(personaId, {
          id: `log-${uuid()}`,
          timestamp: now,
          kategorie: 'app_aktivitaet',
          field_id: 'bundid_mobil',
          sektion: 'identitaet',
          zweck_i18n_key:
            'stammdaten.aktivitaet.zweck.app_kontakt_geaendert',
          rechtsgrundlage:
            'Art. 6 Abs. 1 lit. b DSGVO (Vertrag App-Nutzung)',
          note: `persona_id:${personaId}; field_id:bundid_mobil; quelle:user_otp_verify; mock:true`,
        });

        emit({
          type: 'stammdaten/bundid-mobil-otp-verified',
          persona_id: personaId,
        });
        return { verified: true };
      },
      { min: 400, max: 800 },
    ),

  simulateFamilienkasseFollowupLetter: (personaId: PersonaId) =>
    withLatency<Letter>(
      () => {
        // Persona-Existenz validieren.
        loadPersonaById(personaId);

        // Idempotent: existiert der Followup-Letter bereits?
        const letters = readOrInit<Letter[]>(
          'letters' as CollectionKey,
          lettersArraySchema as unknown as import('zod').ZodType<Letter[]>,
          [] as Letter[],
        ) as Letter[];
        const existing = letters.find((l) => l.id === FOLLOWUP_LETTER_ID);
        if (existing) return existing;

        const now = NOW();
        const followup = buildFollowupLetter(personaId, now);
        letters.push(followup);
        write('letters' as CollectionKey, letters);

        // Activity-Log: behoerde_zu_buerger (Hard-Line § 11.40).
        appendLogEntry(personaId, {
          id: `log-${uuid()}`,
          timestamp: now,
          kategorie: 'behoerde_zu_buerger',
          field_id: 'posteingang',
          sektion: 'sperren_einstellungen',
          absender_behoerde_id: 'familienkasse-berlin-brandenburg',
          empfaenger_id: personaId,
          zweck_i18n_key:
            'stammdaten.aktivitaet.zweck.behoerde_zu_buerger_postfach_eingang',
          rechtsgrundlage: '§ 9 OZG i.V.m. § 41 Abs. 2a VwVfG',
          note: `persona_id:${personaId}; field_id:posteingang; kanal:postfach; letter_id:${FOLLOWUP_LETTER_ID}; quelle:familienkasse_followup_simulated; mock:true`,
        });

        emit({
          type: 'stammdaten/familienkasse-followup-letter-simulated',
          persona_id: personaId,
          letter_id: FOLLOWUP_LETTER_ID,
        });
        emit({ type: 'letter_received', letter: followup });
        return followup;
      },
      { min: 800, max: 1200 },
    ),
};
