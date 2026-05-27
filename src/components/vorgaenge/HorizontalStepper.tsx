'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StepperNodeStatus = 'done' | 'active' | 'pending' | 'failed';

export interface StepperNode {
  id: string;
  behoerde: string;
  status: StepperNodeStatus;
  datum?: string;
}

interface HorizontalStepperProps {
  nodes: StepperNode[];
  /** Used for the accessible name of the ordered list. */
  vorgangTitel: string;
  className?: string;
}

const nodeStatusKey: Record<StepperNodeStatus, string> = {
  done: 'node_done',
  active: 'node_active',
  pending: 'node_pending',
  failed: 'node_failed',
};

export function HorizontalStepper({
  nodes,
  vorgangTitel,
  className,
}: HorizontalStepperProps) {
  const t = useTranslations('vorgaenge.stepper');
  const reducedMotion = useReducedMotion();

  if (nodes.length === 0) return null;

  return (
    <ol
      aria-label={t('aria', { titel: vorgangTitel })}
      className={cn('flex items-start gap-0', className)}
    >
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        // Connector after this node is "complete" once this node is done.
        const connectorDone = node.status === 'done';
        return (
          <li
            key={node.id}
            aria-current={node.status === 'active' ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center text-center"
          >
            <div className="flex w-full items-center">
              {/* Leading connector (hidden on first node) */}
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 flex-1',
                  index === 0
                    ? 'opacity-0'
                    : nodes[index - 1]?.status === 'done'
                      ? 'bg-success'
                      : 'bg-border',
                )}
              />
              <span className="relative flex shrink-0 items-center justify-center">
                {node.status === 'active' && !reducedMotion ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-accent-soft"
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-10 inline-flex size-8 items-center justify-center rounded-full border-2',
                    node.status === 'done' &&
                      'border-success bg-success text-white',
                    node.status === 'active' &&
                      'border-primary bg-accent-soft text-primary',
                    node.status === 'pending' &&
                      'border-border-strong bg-surface text-text-muted',
                    node.status === 'failed' &&
                      'border-danger bg-danger-soft text-danger',
                  )}
                >
                  {node.status === 'done' ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : node.status === 'failed' ? (
                    <AlertCircle className="size-4" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                  )}
                </span>
              </span>
              {/* Trailing connector (hidden on last node) */}
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 flex-1',
                  isLast
                    ? 'opacity-0'
                    : connectorDone
                      ? 'bg-success'
                      : 'bg-border',
                )}
              />
            </div>
            <span className="mt-2 line-clamp-2 px-1 text-xs font-medium text-text-secondary">
              {node.behoerde}
            </span>
            {node.datum ? (
              <span className="mt-0.5 text-xs text-text-muted tabular-nums">
                {node.datum}
              </span>
            ) : null}
            <span className="sr-only">
              {t(nodeStatusKey[node.status], { behoerde: node.behoerde })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
