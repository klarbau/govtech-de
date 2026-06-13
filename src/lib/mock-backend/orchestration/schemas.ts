/**
 * Zod-Schemata für die `orchestration:*`-Buckets (Spec § 2.5).
 *
 * `persistence.read()` validiert beim Lesen; schlägt es fehl, wird NUR der
 * betroffene Bucket gelöscht + reseeded (kein globaler Crash). Ein korrupter
 * in-flight Saga-Snapshot wird also verworfen, nicht zum Boot-Crash (§ 9.2).
 *
 * Die Schemata sind absichtlich tolerant (`.passthrough()` / lockere Enums über
 * `z.string()` wo Vorwärtskompatibilität nützt), aber strukturtreu genug, um
 * echten Garbage zu erkennen.
 */
import { z } from 'zod';

const transportReceiptSchema = z
  .object({
    receiptId: z.string(),
    messageId: z.string(),
    behoerdeId: z.string(),
    quittung: z.string(),
    laufzettel: z.object({
      acceptedAt: z.string(),
      transportCode: z.string(),
    }),
    fromCache: z.boolean(),
    mock: z.literal(true),
  })
  .passthrough();

const transportEnvelopeSchema = z
  .object({
    messageId: z.string(),
    behoerdeId: z.string(),
    idempotencyKey: z.string(),
    intent: z.string(),
    datenkategorien: z.array(z.string()),
    mock: z.literal(true),
  })
  .passthrough();

const sagaStepSchema = z
  .object({
    stepId: z.string(),
    autopilotStepId: z.string(),
    behoerdeId: z.string(),
    block: z.string(),
    gate: z.string(),
    required: z.boolean(),
    idempotencyKey: z.string(),
    status: z.string(),
    attempts: z.number(),
    nextAttemptAt: z.string().optional(),
    lastError: z
      .object({ message: z.string(), permanent: z.boolean() })
      .optional(),
    receipt: transportReceiptSchema.optional(),
    compensatesWith: z.string().optional(),
    rechtsgrundlage: z.string(),
    agentLabel: z.string().optional(),
    datenkategorien: z.array(z.string()).optional(),
    aktion: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    letterId: z.string().optional(),
  })
  .passthrough();

export const sagaInstanceSchema = z
  .object({
    sagaId: z.string(),
    type: z.string(),
    vorgangId: z.string(),
    personaId: z.string(),
    status: z.string(),
    steps: z.array(sagaStepSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
    context: z.record(z.unknown()),
  })
  .passthrough();

export const sagasMapSchema = z.record(sagaInstanceSchema);

export const outboxEntrySchema = z
  .object({
    outboxId: z.string(),
    sagaId: z.string(),
    stepId: z.string(),
    idempotencyKey: z.string(),
    intent: z.string(),
    status: z.string(),
    attempts: z.number(),
    enqueuedAt: z.string(),
    nextDrainAt: z.string().optional(),
    envelope: transportEnvelopeSchema,
  })
  .passthrough();

export const outboxArraySchema = z.array(outboxEntrySchema);

export const auditLogEntrySchema = z
  .object({
    seq: z.number(),
    ts: z.string(),
    sagaId: z.string(),
    stepId: z.string().optional(),
    type: z.string(),
    payload: z.record(z.unknown()),
    prevHash: z.string(),
    hash: z.string(),
  })
  .passthrough();

export const auditLogArraySchema = z.array(auditLogEntrySchema);

export const dlqEntrySchema = z
  .object({
    dlqId: z.string(),
    sagaId: z.string(),
    stepId: z.string(),
    behoerdeId: z.string(),
    reason: z.string(),
    lastError: z.object({ message: z.string(), permanent: z.boolean() }),
    deadLetteredAt: z.string(),
    envelope: transportEnvelopeSchema,
    replayable: z.literal(true),
  })
  .passthrough();

export const dlqArraySchema = z.array(dlqEntrySchema);

export const breakerStateSchema = z
  .object({
    behoerdeId: z.string(),
    state: z.string(),
    consecutiveFailures: z.number(),
    openUntil: z.string().optional(),
    updatedAt: z.string(),
  })
  .passthrough();

export const breakersMapSchema = z.record(breakerStateSchema);

export const schemaVersionSchema = z.object({ version: z.number() });
