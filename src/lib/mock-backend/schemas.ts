/**
 * Zod-Schemas für die Validierung beim Lesen aus localStorage.
 * Bei Schema-Mismatch wird der jeweilige Storage-Bucket verworfen und neu geseedet.
 *
 * Wichtig: Die Schemas sind absichtlich permissiv (z. B. `passthrough()`),
 * damit additive Felder keinen Reseed auslösen — entfernte oder typ-veränderte
 * Pflichtfelder dagegen schon.
 */
import { z } from 'zod';

export const adresseSchema = z.object({
  strasse: z.string(),
  hausnummer: z.string(),
  zusatz: z.string().optional(),
  plz: z.string().regex(/^\d{5}$/),
  ort: z.string(),
  land: z.string().optional(),
});

export const bundidPostfachAnbindungSchema = z.enum([
  'angebunden',
  'in_pilotierung',
  'nicht_angebunden',
]);

export const behoerdeSchema = z
  .object({
    id: z.string(),
    name_de: z.string(),
    kategorie: z.enum([
      'bund',
      'land',
      'kommune',
      'sozialversicherung',
      'privat',
    ]),
    zustaendige_themen: z.array(z.string()),
    adresse: adresseSchema,
    online: z.object({
      portal_url: z.string().optional(),
      supports_eudi: z.boolean(),
    }),
    // V1.2 — Spec § 4.3 Pflicht-Feld. Behörden ohne expliziten Wert (alte
    // localStorage-Buckets aus V1/V1.1) werden beim Read durch
    // `migrateBehoerdenV11ToV12` mit `nicht_angebunden`-Default befüllt;
    // Schema-Validierung erzwingt den Wert ab V1.2-Boot.
    bundid_postfach_anbindung: bundidPostfachAnbindungSchema,
  })
  .passthrough();

export const aufenthaltstitelSchema = z
  .object({
    norm: z.string(),
    valid_until: z.string(),
    az: z.string(),
    abh_behoerde_id: z.string().optional(),
  })
  .passthrough();

const personaSchemaBase = z.object({
  id: z.string(),
  vorname: z.string(),
  nachname: z.string(),
  geburtsdatum: z.string(),
  staatsangehoerigkeit: z.string(),
  adresse: adresseSchema,
  steuer_id: z.string().optional(),
  rentenversicherungsnummer: z.string().optional(),
  aufenthaltstitel: aufenthaltstitelSchema.optional(),
  beschaeftigung: z
    .object({
      typ: z.enum(['angestellt', 'selbstaendig', 'beamt', 'student', 'arbeitssuchend', 'rente']),
      arbeitgeber: z.string().optional(),
      rolle: z.string().optional(),
      beginn: z.string().optional(),
    })
    .passthrough()
    .optional(),
  krankenversicherung: z
    .object({
      typ: z.enum(['gkv', 'pkv']),
      traeger: z.string(),
      versichertennummer: z.string().optional(),
    })
    .passthrough()
    .optional(),
  kfz_halter: z.boolean(),
  kindergeld_bezug: z.boolean(),
  wehrerfasst: z.boolean(),
  sprachen: z.array(z.string()),
  // V1 Stammdaten — additive optionale Felder (Spec § 4.3).
  fruehere_namen: z.array(z.string()).optional(),
  doktorgrad: z.string().optional(),
  geburtsort: z.string().optional(),
  geschlecht: z.enum(['m', 'w', 'd', 'x', 'unbestimmt']).optional(),
  religion: z.string().optional(),
  personalausweis_nr: z
    .object({ nummer: z.string(), gueltig_bis: z.string() })
    .passthrough()
    .optional(),
  reisepass: z
    .object({ nummer: z.string(), gueltig_bis: z.string() })
    .passthrough()
    .optional(),
  eat_can: z.string().optional(),
  azr_nr: z.string().optional(),
  // V1.2 Kontakt-Schicht — full rename aus V1 `{ email?, mobil? }` (Spec § 4.1).
  // Schema akzeptiert sowohl V1.1-shape (BundID-Postfach + notification_praeferenzen)
  // als auch Legacy-V1-shape — letztere wird durch `migrateKontaktV1ToV11` beim
  // ersten V1.2-Boot in den neuen Shape überführt (`persistence-migrations.ts`).
  // `passthrough` lässt zusätzliche Legacy-Felder (`email`, `mobil`) durch und
  // verhindert Reseed bei Pre-V1.2-localStorage.
  kontakt: z
    .object({
      bundid_email: z
        .object({
          value: z.string(),
          verified: z.boolean(),
          quelle: z.literal('bundid'),
          verifiziert_am: z.string().optional(),
        })
        .passthrough()
        .optional(),
      bundid_mobil: z
        .object({
          value: z.string(),
          verified: z.boolean(),
          quelle: z.literal('bundid_self_attested'),
          verifiziert_am: z.string().optional(),
        })
        .passthrough()
        .optional(),
      bundid_postfach: z
        .object({
          aktiviert: z.boolean(),
          status: z.enum(['aktiv', 'inaktiv', 'teilaktiviert']),
          aktiviert_am: z.string().optional(),
        })
        .passthrough()
        .optional(),
      notification_praeferenzen: z
        .object({
          steuer: z.enum(['postfach', 'email_pilot', 'sms_pilot', 'brief']),
          sozial: z.enum(['postfach', 'email_pilot', 'sms_pilot', 'brief']),
          familie: z.enum(['postfach', 'email_pilot', 'sms_pilot', 'brief']),
          verkehr: z.enum(['postfach', 'email_pilot', 'sms_pilot', 'brief']),
          sonstige: z.enum(['postfach', 'email_pilot', 'sms_pilot', 'brief']),
        })
        .passthrough()
        .optional(),
      // Legacy V1-shape (kept for migration source-detection — see
      // `persistence-migrations.ts:migrateKontaktV1ToV11`).
      email: z.string().optional(),
      mobil: z.string().optional(),
    })
    .passthrough()
    .optional(),
  eheschliessung: z
    .object({ datum: z.string(), ort: z.string(), az: z.string() })
    .passthrough()
    .optional(),
  // V1.1 — Renten/KV optionale Felder (Spec § 4.1). Alle additiv.
  renten_track: z.enum(['A', 'B', 'C']).optional(),
  renten_eckdaten_v1_1: z
    .object({
      grundlage_kurzauszug: z.object({
        beitragszeit_von: z.string(),
        beitragszeit_bis: z.string(),
        entgeltpunkte_aktuell: z.number(),
      }),
      em_rente_prognose_eur_monat: z.number(),
      regelalter_prognose_eur_monat: z.number(),
      anpassungs_wirkung: z.object({
        beispiel_prozent_p_a: z.number(),
        plus_eur_monat: z.number(),
      }),
      beitragsuebersicht: z.object({
        jahr: z.string(),
        gesamt_eur: z.number(),
        versicherter_anteil_eur: z.number(),
        arbeitgeber_anteil_eur: z.number(),
        oeffentliche_kassen_eur: z.number().optional(),
      }),
      stichtag: z.string(),
      quelle_letter_id: z.string(),
      abgelegt_am: z.string(),
    })
    .passthrough()
    .optional(),
  kvnr_v1_1: z
    .object({
      unveraenderbar: z.string(),
      veraenderbar: z.string(),
    })
    .passthrough()
    .optional(),
  familienversichert_ueber: z.string().optional(),
  familienversichert_bis: z.string().optional(),
  epa_status_v1_1: z
    .object({
      eingerichtet: z.boolean(),
      widerspruch_gesetzt: z.boolean(),
      eingerichtet_am: z.string().optional(),
      widerspruch_am: z.string().optional(),
    })
    .passthrough()
    .optional(),
  erezept_modus_v1_1: z.enum(['app', 'egk', 'papier']).optional(),
  pflegegrad_v1_1: z
    .object({
      grad: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ]),
      bewilligt_am: z.string(),
      pflegekasse_id: z.string(),
      begutachtung_stelle: z.enum(['md', 'medicproof']),
    })
    .passthrough()
    .optional(),
  anrechnungszeit_pflege_v1_1: z
    .object({
      monate: z.number().int().nonnegative(),
      pflegebeduerftige_person: z.string().optional(),
      rechtsgrundlage: z.string(),
    })
    .passthrough()
    .optional(),
  versorgungswerk_v1_1: z
    .object({ name: z.string(), mitgliedsnummer: z.string() })
    .passthrough()
    .optional(),
  // V1.3 — Mobilität (Spec § 5.1). Additive optional field; Zod-Schema unten.
  // Permissive `passthrough()`, weil das *persistierte* Persona-Schema mit
  // dem strict-Mode (HL-MOB-11 / VL-4) auf Top-Level kollidieren würde — der
  // strict-Punkte-Check läuft separat über `mobilitaetSchema.strict()`, das
  // Test-only auf `Mobilitaet`-Werte angewendet wird, nicht aufs Top-Level-
  // Persona-Schema.
  mobilitaet: z
    .object({
      fahrerlaubnis: z
        .object({
          fe_nr: z.string(),
          bundesland_kennzeichen: z.string().length(1),
          fe_behoerde_id: z.string(),
          klassen: z.array(
            z
              .object({
                klasse: z.string(),
                erteilt_am: z.string(),
                gueltig_bis: z.string().optional(),
                schluesselzahlen: z.array(z.string()),
              })
              .passthrough(),
          ),
          ausstellungsdatum: z.string(),
          pflichtumtausch_stichtag: z.string().optional(),
          pflichtumtausch_status: z.enum([
            'nicht_relevant',
            'frist_aktiv',
            'frist_abgelaufen_offen',
            'umtausch_erfolgt',
          ]),
          pflichtumtausch_erfolgt_am: z.string().optional(),
          fe_aktenzeichen: z.string(),
        })
        .passthrough()
        .optional(),
      halter: z.array(
        z
          .object({
            kennzeichen: z.string(),
            marke: z.string(),
            modell: z.string(),
            baujahr: z.string().regex(/^\d{4}$/),
            fin_voll: z.string(),
            fin_masked: z.string(),
            zulassungsstelle_id: z.string(),
            hu_bis: z.string(),
            evb_nummer: z.string(),
            zulassung_aktenzeichen: z.string(),
            mitnutzer: z
              .array(
                z.object({ vorname: z.string(), nachname: z.string() }),
              )
              .optional(),
          })
          .passthrough(),
      ),
      halter_adresse: z
        .object({
          strasse: z.string(),
          hausnummer: z.string(),
          plz: z.string().regex(/^\d{5}$/),
          ort: z.string(),
          uebergangs_marker_via_umzug: z.boolean(),
          uebergangs_marker_seit: z.string().optional(),
          via_umzug_vorgang_id: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

// Persona ist rekursiv (familie.partner: Persona). Wir typen das Feld
// als z.lazy() ein und akzeptieren beim Lesen den vollen Baum.
type PersonaShape = z.infer<typeof personaSchemaBase> & {
  familie: { partner?: PersonaShape; kinder: PersonaShape[] };
};

export const personaSchema: z.ZodType<PersonaShape> = personaSchemaBase
  .extend({
    familie: z.object({
      partner: z.lazy(() => personaSchema).optional(),
      kinder: z.array(z.lazy(() => personaSchema)),
    }),
  })
  .passthrough() as z.ZodType<PersonaShape>;

export const letterArchetypeSchema = z.enum([
  'steuerbescheid',
  'krankenkasse-beitrag',
  'beitragsservice-mahnung',
  'abh-verlaengerung',
  'familienkasse-nachweis',
  'buergeramt-meldung',
  'ihk-beitrag',
  'berufsgenossenschaft-beitrag',
  'standesamt-urkunde',
  // V1.1 — § 109 SGB VI Yellow-Letter (jährliche Renteninformation).
  'renteninfo',
  'sonstiges',
]);

// Compile-time guard: zod-Enum und TS-Union (`LetterArchetype` aus `@/types/letter`)
// müssen identisch sein. Drift → tsc-Fehler in dieser Datei.
import type { LetterArchetype as _LetterArchetypeTs } from '@/types/letter';
type _SchemaLetterArchetype = z.infer<typeof letterArchetypeSchema>;
type _AssertEqArchetype<A, B> = [A] extends [B]
  ? ([B] extends [A] ? true : never)
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _letterArchetypeDriftGuard: _AssertEqArchetype<
  _SchemaLetterArchetype,
  _LetterArchetypeTs
> = true;

export const letterAuthChannelSchema = z.enum([
  'briefpost',
  'mein-elster',
  'zbp-bundid',
  'krankenkassen-portal',
  'eingabe-buerger',
  'eudi-versiegelt',
]);

export const letterFristTypSchema = z.enum([
  'zahlung',
  'einspruch',
  'widerspruch',
  'klage',
  'nachweis',
  'antragstellung',
  'sonstige',
]);

export const letterFristSchema = z
  .object({
    typ: letterFristTypSchema,
    datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO-Datum YYYY-MM-DD'),
    original_zitat: z.string(),
    citation_match: z.boolean(),
    rechtsgrundlage: z.string().optional(),
    cta_label: z.string().optional(),
  })
  .passthrough();

export const letterCitationSchema = z
  .object({
    bullet_index: z.number().int().nonnegative(),
    original_zitat: z.string(),
    body_offset: z
      .object({ start: z.number().int(), end: z.number().int() })
      .optional(),
  })
  .passthrough();

export const letterAiSummaryPreOpenSchema = z
  .object({
    text: z
      .string()
      .max(80, 'Pre-Open-Summary darf maximal 80 Zeichen lang sein.'),
    generated_at: z.string(),
  })
  .passthrough();

export const letterAiSummaryPostOpenSchema = z
  .object({
    bullets: z
      .array(z.object({ text: z.string() }).passthrough())
      .min(1, 'Mindestens 1 Bullet erforderlich.')
      .max(10, 'Höchstens 10 Bullets erlaubt (Spec: 5–8).'),
    citations: z.array(letterCitationSchema),
    generated_at: z.string(),
    model: z.string(),
  })
  .passthrough();

export const letterAiSummarySchema = z
  .object({
    de: z.string(),
    en: z.string().optional(),
    ru: z.string().optional(),
    uk: z.string().optional(),
    ar: z.string().optional(),
    tr: z.string().optional(),
    pre_open: letterAiSummaryPreOpenSchema.optional(),
    post_open: letterAiSummaryPostOpenSchema.optional(),
    translations: z
      .record(
        z.object({
          pre_open: letterAiSummaryPreOpenSchema.optional(),
          post_open: letterAiSummaryPostOpenSchema.optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export const letterSchema = z
  .object({
    id: z.string(),
    absender_behoerde_id: z.string(),
    empfaenger_persona_id: z.string(),
    aktenzeichen: z.string(),
    aktenzeichen_weitere: z.array(z.string()).optional(),
    betreff: z.string(),
    body_de: z.string(),
    ai_summary: letterAiSummarySchema.optional(),
    required_action: z
      .object({
        typ: z.string(),
        frist: z.string(),
        cta: z.string(),
      })
      .passthrough()
      .optional(),
    fristen: z.array(letterFristSchema).optional(),
    archetype: letterArchetypeSchema.optional(),
    auth_channel: letterAuthChannelSchema.optional(),
    was_kann_ich_tun_options: z.array(z.string()).optional(),
    status: z.enum(['ungelesen', 'gelesen', 'erledigt']),
    empfangen_am: z.string(),
    vorgang_id: z.string().optional(),
    // V1.5.1 — Erlassdatum des Bescheids (Domain-Doc § 3, ISO-8601 YYYY-MM-DD).
    // Optional; nur bei Letter-Archetypes mit Bescheid-Charakter gepflegt.
    bescheid_dated_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO-Datum YYYY-MM-DD')
      .optional(),
    // V1.2 — Kanal (brief / postfach / email_pilot). Optional; existing letters
    // bleiben kompatibel (Default-Render = brief). Spec § 9.
    kanal: z.enum(['brief', 'postfach', 'email_pilot']).optional(),
  })
  .passthrough();

/**
 * Kanonische Liste der Activity-Log-Aktionen (App-intern).
 * Source-of-Truth: zod-Enum hier; `LetterActivityEvent` / `LetterActivityAktion`
 * in `src/types/letter.ts` werden über die nachstehende Compile-Time-Assertion
 * gegen Drift gesichert.
 */
export const letterActivityAktionSchema = z.enum([
  'opened_in_app',
  'summary_generated',
  'frist_added_to_calendar',
  'marked_read',
  'archived',
  // V1.5 — Antwort verfassen (verifier #6 + domain §5.D2). Template-ID wandert
  // ins bestehende `note`-Feld, nicht ins Enum (Verifier C2: Vermeidung der
  // Enum-Explosion 4 × N templates).
  'reply_compose_started',
  'reply_template_inserted',
  'reply_draft_saved',
  'reply_draft_deleted',
  'reply_sent_simulated',
]);

export const letterActivityLogEntrySchema = z
  .object({
    letter_id: z.string(),
    event: letterActivityAktionSchema,
    at: z.string(),
    by: z.literal('app_internal'),
    rechtsgrundlage: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();

// Compile-time guard: zod-Enum und TS-Union müssen identisch sein.
// Drift → tsc-Fehler in dieser Datei.
import type { LetterActivityAktion as _LetterActivityAktion } from '@/types/letter';
type _SchemaAktion = z.infer<typeof letterActivityAktionSchema>;
type _AssertEq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _letterActivityAktionDriftGuard: _AssertEq<
  _SchemaAktion,
  _LetterActivityAktion
> = true;

export const letterActivityLogSchema = z.record(
  z.array(letterActivityLogEntrySchema),
);

/**
 * Schema für `src/data/letter-summaries.json` — pre-baked AI-Summaries pro
 * Brief. Pre-Open + Post-Open + optional Vorschläge-Liste.
 */
export const letterSummaryEntrySchema = z
  .object({
    pre_open: letterAiSummaryPreOpenSchema,
    post_open: letterAiSummaryPostOpenSchema,
    vorschlaege: z
      .array(
        z
          .object({
            label: z.string(),
            type: z.enum(['info', 'action', 'norm']).optional(),
            i18n_key: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export const letterSummariesMapSchema = z.record(letterSummaryEntrySchema);

export const documentSchema = z
  .object({
    id: z.string(),
    typ: z.string(),
    titel: z.string(),
    ausstellende_behoerde_id: z.string(),
    ausgestellt_am: z.string(),
    gueltig_bis: z.string().optional(),
    qr_payload: z.string(),
    eudi_compatible: z.boolean(),
    watermark: z.literal('[MOCK]'),
    vorgang_id: z.string().optional(),
  })
  .passthrough();

export const autopilotStepSchema = z
  .object({
    id: z.string(),
    behoerde_id: z.string(),
    block: z.enum(['A', 'B', 'C', 'D']),
    aktion: z.string(),
    rechtsgrundlage: z.string(),
    status: z.enum([
      'pending',
      'in_progress',
      'needs_eid',
      'pending_eid_confirmation',
      'self_assigned',
      'confirmed',
      'failed',
    ]),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    letter_id: z.string().optional(),
    requires_eid: z.boolean().optional(),
    requires_consent: z.boolean().optional(),
    consent_given_at: z.string().optional(),
    eid_confirmed_at: z.string().optional(),
    failure_reason: z.string().optional(),
  })
  .passthrough();

export const vorgangSchema = z
  .object({
    id: z.string(),
    typ: z.string(),
    titel: z.string(),
    status: z.enum(['angelegt', 'in_pruefung', 'genehmigt', 'abgelehnt', 'abgeschlossen']),
    beteiligte_behoerden_ids: z.array(z.string()),
    schritte: z.array(autopilotStepSchema),
    fristen: z.array(
      z.object({ typ: z.string(), datum: z.string() }).passthrough(),
    ),
    angelegt_am: z.string(),
    abgeschlossen_am: z.string().optional(),
    persona_id: z.string(),
    context: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const terminSchema = z
  .object({
    id: z.string(),
    behoerde_id: z.string(),
    vorgang_id: z.string().optional(),
    datum: z.string(),
    ort: z.object({
      typ: z.enum(['praesenz', 'video', 'telefon']),
      details: z.string(),
    }),
    status: z.enum(['gebucht', 'bestaetigt', 'abgesagt']),
    betreff: z.string(),
  })
  .passthrough();

export const metaSchema = z.object({
  version: z.literal(1),
  active_persona_id: z.string(),
  seeded_at: z.string(),
  reliable_mode: z.boolean().optional(),
});

export const consentSchema = z.record(z.array(z.string()));

export const lettersArraySchema = z.array(letterSchema);
export const vorgaengeArraySchema = z.array(vorgangSchema);
export const documentsArraySchema = z.array(documentSchema);
export const termineArraySchema = z.array(terminSchema);
export const behoerdenArraySchema = z.array(behoerdeSchema);
export const personasArraySchema = z.array(personaSchema);

// ---------------------------------------------------------------------------
// V1.5 — Reply / ReplyDraft (Antwort verfassen)
// ---------------------------------------------------------------------------

export const replyTemplateIdSchema = z.enum([
  'frist_verlaengerung',
  'nachweis_einreichen',
  'informative_rueckmeldung',
  'termin_antwort',
  // V1.5.1 — Skelett-Templates (Domain-Doc § 3, RDG-clean):
  'rechtsbehelf_einspruch_skelett',
  'rechtsbehelf_widerspruch_skelett',
  'aussetzung_vollziehung_skelett',
]);

// Compile-time guard: zod-Enum und TS-Union (`ReplyTemplateId` aus
// `@/types/letter`) müssen identisch sein. Drift → tsc-Fehler in dieser Datei.
import type { ReplyTemplateId as _ReplyTemplateIdTs } from '@/types/letter';
type _SchemaReplyTemplateId = z.infer<typeof replyTemplateIdSchema>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _replyTemplateIdDriftGuard: _AssertEq<
  _SchemaReplyTemplateId,
  _ReplyTemplateIdTs
> = true;

export const replyTerminModeSchema = z.enum([
  'bestaetigen',
  'verschieben',
  'absagen',
]);

export const replyStatusSchema = z.enum(['draft', 'sent_simulated', 'deleted']);

export const letterAttachmentSchema = z
  .object({
    name: z.string().min(1),
    mime: z.string().min(1),
    size_bytes: z.number().int().nonnegative(),
    '[MOCK]_data': z.string().optional(),
  })
  .passthrough();

/**
 * Reply-Schema. Konditional:
 *  - `mode` ist Pflicht, wenn `template_id === 'termin_antwort'`, und muss
 *    sonst undefined sein.
 *  - `sent_at` und `kanal` sind `null` solange `status === 'draft'` und müssen
 *    im `sent_simulated`-Status gesetzt sein.
 *  - `receipt_text` ist seit V1.5.1 deprecated (Code-Review BLOCKER #3 vom
 *    2026-05-09): Die Empfangs-Bestätigungs-Prosa wird ausschließlich im
 *    Frontend aus `kanal` + `sent_at` + i18n-Template (Domain §7) gerendert.
 *    Hardcoded German strings im Storage verstoßen gegen die i18n-only-Regel
 *    (CLAUDE.md). Schema akzeptiert das Feld weiterhin als optional+nullable,
 *    damit Pre-V1.5.1-Replies beim Re-Read keinen Schema-Drift-Reseed auslösen.
 *
 * Wir bleiben permissiv genug, dass additive Felder keinen Reseed auslösen
 * (`passthrough`), erzwingen aber die Pflichtfelder hart.
 */
export const replySchema = z
  .object({
    id: z.string().min(1),
    letter_id: z.string().min(1),
    status: replyStatusSchema,
    template_id: replyTemplateIdSchema.nullable(),
    mode: replyTerminModeSchema.optional(),
    body_de: z.string(),
    attachments: z.array(letterAttachmentSchema),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
    sent_at: z.string().nullable(),
    kanal: z.string().nullable(),
    /**
     * @deprecated V1.5.1 — Pre-V1.5.1-Replies dürfen das Feld noch tragen,
     * neue Replies setzen es nicht. Frontend rendert die Prosa aus i18n.
     */
    receipt_text: z.string().nullable().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.template_id === 'termin_antwort') {
      if (!value.mode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Reply.mode ist Pflicht, wenn template_id === 'termin_antwort'.",
          path: ['mode'],
        });
      }
    } else if (value.mode !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Reply.mode darf nur gesetzt sein, wenn template_id === 'termin_antwort'.",
        path: ['mode'],
      });
    }
    if (value.status === 'sent_simulated') {
      if (!value.sent_at || !value.kanal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Bei status === 'sent_simulated' müssen sent_at und kanal gesetzt sein.",
          path: ['status'],
        });
      }
    }
  });

/**
 * V1.5.1 — Map letterId → Array von Replies (Cross-Template-Versand-Pfad
 * erzeugt zwei separate Reply-Records pro Letter; Spec V1.5.1 § 8.4).
 * V1.5.0-Storage (`Record<string, Reply>`) wird beim ersten V1.5.1-Boot über
 * `persistence-migrations.ts` zu Single-Element-Arrays migriert.
 */
export const letterRepliesMapSchema = z.record(z.array(replySchema));

/**
 * Legacy V1.5.0-Schema-Variant — wird ausschließlich in der Persistence-
 * Migration genutzt, um stored data im alten Shape zu erkennen und in den
 * neuen Shape zu überführen (siehe `persistence-migrations.ts`).
 */
export const letterRepliesMapV150Schema = z.record(replySchema);

// ---------------------------------------------------------------------------
// V1 — Stammdaten (Spec § 5.2)
// ---------------------------------------------------------------------------

export const stammdatenSektionIdSchema = z.enum([
  'identitaet',
  'anschrift',
  'familie',
  // V1.1 — additive Sektionen (Spec § 12).
  'altersvorsorge',
  'krankenversicherung_pflege',
  'dokumente',
  'sperren_einstellungen',
]);

export const stammdatenFieldEditabilitySchema = z.enum([
  'read_only',
  'self_edit',
  'self_edit_speculative_2027',
  'hidden_by_default',
  'self_edit_mock_pattern',
]);

export const stammdatenUebermittlungssperreIdSchema = z.enum([
  'religionsgesellschaften_42_3',
  'adressbuch_verlage_50_5',
  'wahlwerbung_50_1',
  'oeffentlich_rechtl_rundfunk_42',
]);

// Compile-time guards: Schema-Enums = TS-Unions (V1.5.0-Muster).
import type {
  StammdatenSektionId as _StammdatenSektionIdTs,
  StammdatenFieldEditability as _StammdatenFieldEditabilityTs,
  StammdatenUebermittlungssperreId as _StammdatenUebermittlungssperreIdTs,
} from '@/types/stammdaten';
type _SchemaStammdatenSektionId = z.infer<typeof stammdatenSektionIdSchema>;
type _SchemaStammdatenFieldEditability = z.infer<
  typeof stammdatenFieldEditabilitySchema
>;
type _SchemaStammdatenUebermittlungssperreId = z.infer<
  typeof stammdatenUebermittlungssperreIdSchema
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _stammdatenSektionIdDriftGuard: _AssertEq<
  _SchemaStammdatenSektionId,
  _StammdatenSektionIdTs
> = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _stammdatenFieldEditabilityDriftGuard: _AssertEq<
  _SchemaStammdatenFieldEditability,
  _StammdatenFieldEditabilityTs
> = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _stammdatenUebermittlungssperreIdDriftGuard: _AssertEq<
  _SchemaStammdatenUebermittlungssperreId,
  _StammdatenUebermittlungssperreIdTs
> = true;

export const uebermittlungsLogEntrySchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T/, 'ISO-8601 timestamp'),
    // V1.2 Hard-Line § 11.40: additiver 4. Wert `behoerde_zu_buerger` (Notification.gesendet,
    // Posteingang.eingegangen). Same Bucket — kein neuer Bucket.
    kategorie: z.enum([
      'behoerde_zu_behoerde',
      'app_aktivitaet',
      'speculative_2027',
      'behoerde_zu_buerger',
    ]),
    field_id: z.string().optional(),
    sektion: stammdatenSektionIdSchema.optional(),
    absender_behoerde_id: z.string().optional(),
    empfaenger_id: z.string().optional(),
    zweck_i18n_key: z.string().min(1),
    rechtsgrundlage: z.string().min(1),
    note: z.string().optional(),
  })
  .passthrough();

export const stammdatenSperrenSchema = z
  .object({
    auskunftssperre_aktiv: z.boolean(),
    auskunftssperre_begruendung: z.string().min(30).optional(),
    auskunftssperre_befristet_bis: z.string().optional(),
    uebermittlungssperren: z.array(stammdatenUebermittlungssperreIdSchema),
  })
  .passthrough();

export const stammdatenIbanSpeculativeSchema = z
  .object({
    iban: z.string().optional(),
    consented_pushes: z.object({
      familienkasse: z.boolean(),
      elster: z.boolean(),
      gkv: z.boolean(),
    }),
  })
  .passthrough();

export const stammdatenReligionConsentSchema = z
  .object({
    consent_session: z.boolean(),
    last_shown_at: z.string().optional(),
  })
  .passthrough();

/**
 * V1-Kontakt-Bucket (legacy shape). Bleibt für Backward-Compat erhalten:
 * V1-Daten mit `email` / `mobil` werden via `migrateKontaktV1ToV11` in den
 * V1.2-Bucket `stammdaten:notification-praeferenzen` überführt; das hier
 * persistierte `sprachpraeferenz`-Feld bleibt hingegen V1.x-stabil und wird
 * nicht migriert.
 */
export const stammdatenKontaktBucketSchema = z.record(
  z
    .object({
      email: z.string().optional(),
      mobil: z.string().optional(),
      sprachpraeferenz: z.string(),
    })
    .passthrough(),
);

// ---------------------------------------------------------------------------
// V1.2 — Kontakt-Schicht (Spec § 5.2). BundID-Postfach + E-Mail + Mobilfunk +
// Notification-Präferenzen. Hard-Lines § 11.31–§ 11.41.
// ---------------------------------------------------------------------------

export const notificationKanalSchema = z.enum([
  'postfach',
  'email_pilot',
  'sms_pilot',
  'brief',
]);

export const notificationPraeferenzenSchema = z
  .object({
    steuer: notificationKanalSchema,
    sozial: notificationKanalSchema,
    familie: notificationKanalSchema,
    verkehr: notificationKanalSchema,
    sonstige: notificationKanalSchema,
  })
  .passthrough();

export const bundIdEmailSchema = z
  .object({
    value: z.string().min(1),
    verified: z.boolean(),
    quelle: z.literal('bundid'),
    verifiziert_am: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'ISO-Datum')
      .optional(),
  })
  .passthrough();

export const bundIdMobilSchema = z
  .object({
    value: z.string().min(1),
    verified: z.boolean(),
    quelle: z.literal('bundid_self_attested'),
    verifiziert_am: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'ISO-Datum')
      .optional(),
  })
  .passthrough();

export const bundIdPostfachSchema = z
  .object({
    aktiviert: z.boolean(),
    status: z.enum(['aktiv', 'inaktiv', 'teilaktiviert']),
    aktiviert_am: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'ISO-Datum')
      .optional(),
  })
  .passthrough();

export const personaKontaktSchema = z
  .object({
    bundid_email: bundIdEmailSchema,
    bundid_mobil: bundIdMobilSchema.optional(),
    bundid_postfach: bundIdPostfachSchema,
    notification_praeferenzen: notificationPraeferenzenSchema,
  })
  .passthrough();

/**
 * V1.2 Kontakt-Bucket — `Record<PersonaId, PersonaKontakt>`. Persistiert in
 * `govtech-de:v1:stammdaten:notification-praeferenzen`. Schema-Version v2
 * (gebumpt aus V1 — Migration in `persistence-migrations.ts`).
 */
export const stammdatenKontaktV2BucketSchema = z.record(personaKontaktSchema);

// Compile-time guard: zod-Schema und TS-Interface müssen identisch sein.
import type {
  BundidPostfachAnbindung as _BundidPostfachAnbindungTs,
  NotificationKanal as _NotificationKanalTs,
} from '@/types/persona-kontakt';
type _SchemaBundidPostfachAnbindung = z.infer<typeof bundidPostfachAnbindungSchema>;
type _SchemaNotificationKanal = z.infer<typeof notificationKanalSchema>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _bundidPostfachAnbindungDriftGuard: _AssertEq<
  _SchemaBundidPostfachAnbindung,
  _BundidPostfachAnbindungTs
> = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _notificationKanalDriftGuard: _AssertEq<
  _SchemaNotificationKanal,
  _NotificationKanalTs
> = true;

export const stammdatenSperrenBucketSchema = z.record(stammdatenSperrenSchema);

export const stammdatenIbanSpeculativeBucketSchema = z.record(
  stammdatenIbanSpeculativeSchema,
);

export const stammdatenUebermittlungsLogBucketSchema = z.record(
  z.array(uebermittlungsLogEntrySchema),
);

// ---------------------------------------------------------------------------
// V1.1 — Renten/KV-Bucket-Schemas (Spec § 4.4)
// ---------------------------------------------------------------------------

/**
 * `RentenEckdaten` aus Yellow Letter (§ 109 Abs. 3 SGB VI; 5 Pflicht-Inhalte).
 * Persistiert in `govtech-de:v1:stammdaten:renten-eckdaten-v1-1` als
 * `Record<PersonaId, RentenEckdaten>` — überschrieben pro Bridge-Aufruf.
 */
export const rentenEckdatenSchema = z
  .object({
    grundlage_kurzauszug: z.object({
      beitragszeit_von: z.string(),
      beitragszeit_bis: z.string(),
      entgeltpunkte_aktuell: z.number(),
    }),
    em_rente_prognose_eur_monat: z.number(),
    regelalter_prognose_eur_monat: z.number(),
    anpassungs_wirkung: z.object({
      beispiel_prozent_p_a: z.number(),
      plus_eur_monat: z.number(),
    }),
    beitragsuebersicht: z.object({
      jahr: z.string(),
      gesamt_eur: z.number(),
      versicherter_anteil_eur: z.number(),
      arbeitgeber_anteil_eur: z.number(),
      oeffentliche_kassen_eur: z.number().optional(),
    }),
    stichtag: z.string(),
    quelle_letter_id: z.string(),
    abgelegt_am: z.string(),
  })
  .passthrough();

export const rentenEckdatenBucketSchema = z.record(rentenEckdatenSchema);

/**
 * Yellow-Letter-Bridge-applied-Bucket — Liste der bereits gebridgeten
 * `letter_id`s pro Persona. Hard-Line § 11.25 Idempotenz.
 *
 * Shape: `Record<PersonaId, string[]>`.
 */
export const yellowLetterBridgeAppliedBucketSchema = z.record(
  z.array(z.string()),
);

/**
 * `PflegegradConsent` — wird in **sessionStorage** gehalten (Hard-Line § 11.22),
 * NICHT in localStorage. Schema dient der Validierung des sessionStorage-Maps.
 */
export const pflegegradConsentSchema = z
  .object({
    consent_session: z.boolean(),
    last_shown_at: z.string().optional(),
  })
  .passthrough();

export const pflegegradConsentBucketSchema = z.record(pflegegradConsentSchema);

// ---------------------------------------------------------------------------
// V1.3 — Mobilität (Spec § 6.8). Hard-Lines § 11.1–§ 11.14 (verifier-locked).
// ---------------------------------------------------------------------------

/**
 * FE-Klasse-Schema. EU-Klassen-Code aus FeV: A1/A2/A/B/BE/C1/C/CE/D1/D/DE/T/L/AM.
 */
export const feKlasseSchema = z
  .object({
    klasse: z.string().regex(/^(A1|A2|A|B|BE|C1|C|CE|D1|D|DE|T|L|AM)$/),
    erteilt_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gueltig_bis: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    schluesselzahlen: z.array(z.string()),
  })
  .strict();

/**
 * Fahrerlaubnis-Schema. FE-Nr-Format: `[MOCK] <Bundesland-Buchstabe>` +
 * 3 numerische Behörden-Stellen + 6 alphanumerische lfd./Prüf-Stellen
 * (lfd. 5 Zeichen + Prüfziffer [0-9X] + Ausfertigung-Ziffer; insgesamt 11-12
 * Zeichen nach `[MOCK] `, je nachdem wie der Bundesland-Buchstabe-Suffix
 * abgebildet wird). Die Seed-Werte (Spec § 2) sind 12 Zeichen lang
 * (`F0727RRE2I50`, `J0512SCH08X1`, `N0428MEH47K2`), daher die etwas
 * permissive Regex.
 *
 * Format-Slot-Audit:
 *   - Pos. 1: Bundesland-Buchstabe `[A-Z]`
 *   - Pos. 2-5: Behörden-Code (3-4 alphanumerische Zeichen; je Bundesland)
 *   - Pos. 6-10: lfd. Nr. (alphanumerisch, 4-5 Zeichen)
 *   - Pos. 11-12: Prüfziffer + Ausfertigung-Ziffer (kombinierter Suffix)
 */
export const fahrerlaubnisSchema = z
  .object({
    fe_nr: z
      .string()
      .regex(/^\[MOCK\] [A-Z][A-Z0-9]{8,11}$/),
    bundesland_kennzeichen: z.string().length(1),
    fe_behoerde_id: z.string(),
    klassen: z.array(feKlasseSchema).min(1),
    ausstellungsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pflichtumtausch_stichtag: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    pflichtumtausch_status: z.enum([
      'nicht_relevant',
      'frist_aktiv',
      'frist_abgelaufen_offen',
      'umtausch_erfolgt',
    ]),
    pflichtumtausch_erfolgt_am: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fe_aktenzeichen: z.string(),
  })
  .strict();

/**
 * KFZ-Halter-Schema. FIN nach ISO 3779: 17 Zeichen (ohne I/O/Q).
 * HL-MOB-3 / HL-MOB-7: `fin_voll` muss `[MOCK] `-Prefix tragen; `fin_masked`
 * ist die UI-Default-Darstellung mit 4 letzten Stellen sichtbar.
 */
export const kfzHalterSchema = z
  .object({
    kennzeichen: z.string(),
    marke: z.string(),
    modell: z.string(),
    baujahr: z.string().regex(/^\d{4}$/),
    fin_voll: z.string().regex(/^\[MOCK\] [A-HJ-NPR-Z0-9]{17}$/),
    fin_masked: z.string(),
    zulassungsstelle_id: z.string(),
    hu_bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    evb_nummer: z.string(),
    zulassung_aktenzeichen: z.string(),
    mitnutzer: z
      .array(z.object({ vorname: z.string(), nachname: z.string() }).strict())
      .optional(),
  })
  .strict();

/**
 * Halter-Adresse-Schema mit Umzug-Bridge-Marker.
 */
export const halterAdresseSchema = z
  .object({
    strasse: z.string(),
    hausnummer: z.string(),
    plz: z.string().regex(/^\d{5}$/),
    ort: z.string(),
    uebergangs_marker_via_umzug: z.boolean(),
    uebergangs_marker_seit: z.string().optional(),
    via_umzug_vorgang_id: z.string().optional(),
  })
  .strict();

/**
 * Top-Level Mobilitaet-Schema. `.strict()` ist HL-MOB-11 / VL-4 critical:
 * `punkte` und andere Excess-Keys werden vom Schema **rejected**.
 *
 * Unit-Test:
 *   `tests/unit/stammdaten-v1-3-schema-no-punkte.test.ts`
 *   `mobilitaetSchema.parse({ punkte: 3, halter: [] })` muss `throw`en.
 */
export const mobilitaetSchema = z
  .object({
    fahrerlaubnis: fahrerlaubnisSchema.optional(),
    halter: z.array(kfzHalterSchema),
    halter_adresse: halterAdresseSchema.optional(),
  })
  .strict();

/**
 * Persistenz-Bucket `govtech-de:v1:stammdaten:mobilitaet` —
 * `Record<PersonaId, Mobilitaet>`. Strict-Mode wird auf die einzelnen
 * Werte angewandt (über `mobilitaetSchema` mit `.strict()`).
 */
export const stammdatenMobilitaetBucketSchema = z.record(mobilitaetSchema);

/**
 * Compile-time guard: Zod-Schema = TS-Interface.
 */
import type {
  Mobilitaet as _MobilitaetTs,
} from '@/types/mobilitaet';
type _SchemaMobilitaet = z.infer<typeof mobilitaetSchema>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _mobilitaetDriftGuard: _AssertEq<
  _SchemaMobilitaet,
  _MobilitaetTs
> = true;
