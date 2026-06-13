import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  CircleSlash,
  FileSignature,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

import type { AuditEventType } from '@/types';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface AuditEventMeta {
  /** i18n key under `orchestration.event.*`. */
  labelKey: string;
  Icon: LucideIcon;
  tone: Tone;
}

/**
 * Maps each engine `AuditEventType` to its DE label key, a decorative icon, and
 * a semantic tone. Tone drives only the (aria-hidden) icon colour — the row's
 * text label always carries the meaning, so colour is never the sole signal.
 */
export const AUDIT_EVENT_META: Record<AuditEventType, AuditEventMeta> = {
  SAGA_STARTED: { labelKey: 'saga_started', Icon: PlayCircle, tone: 'primary' },
  STEP_ENQUEUED: { labelKey: 'step_enqueued', Icon: ArrowDownToLine, tone: 'neutral' },
  STEP_STARTED: { labelKey: 'step_started', Icon: Send, tone: 'primary' },
  STEP_RECEIPT: { labelKey: 'step_receipt', Icon: FileSignature, tone: 'success' },
  STEP_RETRY_SCHEDULED: { labelKey: 'retry_scheduled', Icon: RefreshCw, tone: 'warning' },
  STEP_DEAD_LETTERED: { labelKey: 'dead_lettered', Icon: AlertTriangle, tone: 'danger' },
  STEP_COMPENSATING: { labelKey: 'compensating', Icon: Undo2, tone: 'warning' },
  STEP_COMPENSATED: { labelKey: 'compensated', Icon: RotateCcw, tone: 'warning' },
  BREAKER_OPENED: { labelKey: 'breaker_opened', Icon: ShieldAlert, tone: 'danger' },
  BREAKER_HALF_OPEN: { labelKey: 'breaker_half_open', Icon: CircleSlash, tone: 'warning' },
  BREAKER_CLOSED: { labelKey: 'breaker_closed', Icon: ShieldCheck, tone: 'success' },
  SAGA_COMPLETED: { labelKey: 'saga_completed', Icon: CheckCircle2, tone: 'success' },
  SAGA_COMPENSATED: { labelKey: 'saga_compensated', Icon: RotateCcw, tone: 'warning' },
  RECOVERY_REPLAYED: { labelKey: 'recovery_replayed', Icon: RotateCcw, tone: 'primary' },
};

export const AUDIT_TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-text-muted',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};
