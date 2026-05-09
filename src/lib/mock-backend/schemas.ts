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
  'sonstiges',
]);

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
]);

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

/** Map letterId → Reply (genau eine Reply pro Brief). */
export const letterRepliesMapSchema = z.record(replySchema);
