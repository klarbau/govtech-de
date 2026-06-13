/**
 * Projektion SagaStep → AutopilotStep (Spec § 5.2).
 *
 * Der Engine schreibt `AutopilotStep.status` aus `SagaStep.status` über dieses
 * fixe Mapping, sodass die UI (`InlineCascade` `STATUS_VIZ`/`STATUS_LABEL_KEY`)
 * UNVERÄNDERT rendert. `compensated` reusiert `failed`, weil
 * `AutopilotStepStatus` kein `compensated`-Member hat (§ 5.2/§ 5.3); die
 * dedizierte „zurückgenommen"-Darstellung ist additive UI, gekeyt auf den
 * SAGA-Status (§ 6.4), nicht auf `AutopilotStepStatus`.
 */
import type { AutopilotStep, AutopilotStepStatus } from '@/types/vorgang';
import type { SagaStep } from '@/types/orchestration';

export function projectStatus(step: SagaStep): AutopilotStepStatus {
  switch (step.status) {
    case 'pending':
      // eID-gated + un-authorised → „Ihre Bestätigung nötig"; sonst „Ausstehend".
      if (step.gate === 'eid') return 'pending_eid_confirmation';
      return 'pending';
    case 'running':
      return 'in_progress';
    case 'succeeded':
      return 'confirmed';
    case 'failed':
      // retrying → keep the spinner (honest: still working).
      return 'in_progress';
    case 'compensating':
      return 'in_progress';
    case 'compensated':
      // no `compensated` member; the row shows it was rolled back (§ 5.2).
      return 'failed';
    case 'dead_lettered':
      return 'failed';
    default:
      return 'pending';
  }
}

/** Builds the AutopilotStep the engine upserts onto the Vorgang for this saga step. */
export function projectStep(step: SagaStep): AutopilotStep {
  const status = projectStatus(step);
  const out: AutopilotStep = {
    id: step.autopilotStepId,
    behoerde_id: step.behoerdeId,
    block: step.block,
    aktion: step.aktion ?? '',
    rechtsgrundlage: step.rechtsgrundlage,
    status,
    agent_label: step.agentLabel,
    datenkategorien: step.datenkategorien,
  };
  if (step.startedAt) out.started_at = step.startedAt;
  if (step.completedAt) out.completed_at = step.completedAt;
  if (step.letterId) out.letter_id = step.letterId;
  if (step.gate === 'eid') out.requires_eid = true;
  if (step.gate === 'consent') {
    out.requires_consent = true;
    if (step.startedAt) out.consent_given_at = step.startedAt;
  }
  if (step.status === 'dead_lettered' || step.status === 'compensated') {
    out.failure_reason =
      step.lastError?.message ??
      (step.status === 'compensated'
        ? 'Übermittlung zurückgenommen'
        : 'Übermittlung fehlgeschlagen');
  }
  return out;
}
