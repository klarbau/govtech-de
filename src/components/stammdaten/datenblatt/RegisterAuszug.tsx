'use client';

import { useTranslations } from 'next-intl';

import type { RegisterNodeModel, RegisterNodeStatus } from './register-map';

interface RegisterAuszugProps {
  /** Derived by the caller (`deriveRegisterNodes`), which also states the count. */
  nodes: RegisterNodeModel[];
  count: number;
}

const STATUS_DOT: Record<RegisterNodeStatus, string> = {
  synchronisiert: 'bg-success',
  angebunden: 'bg-text-muted',
  in_anbindung: 'bg-warning',
};

const STATUS_KEY: Record<RegisterNodeStatus, string> = {
  synchronisiert: 'status_synchronisiert',
  angebunden: 'status_angebunden',
  in_anbindung: 'status_in_anbindung',
};

/**
 * „in Anbindung" is the one status that is not yet true today — it reads amber
 * (a token that flips in dark) instead of the quiet grey of the other two. The
 * dot stays as the redundant carrier; the word stays visible text.
 */
const STATUS_TEXT: Record<RegisterNodeStatus, string> = {
  synchronisiert: 'text-text-secondary',
  angebunden: 'text-text-secondary',
  in_anbindung: 'font-medium text-warning',
};

/**
 * „Register, die Ihre Daten führen" (Spec § 4.4a) — the third zone of the
 * identity band (`stammdaten-blatt-dense.md` § 3.2). Boxless: a
 * headline, the node-grounded register count, then six quiet hairline rows
 * `[● Register ··· Status]`. Rows instead of chips because six pills wrap into a
 * ragged badge cloud in a ~340px rail — and as a row the status word is visible
 * text, not just an `aria-label`, so colour stays pure redundancy.
 */
export function RegisterAuszug({ nodes, count }: RegisterAuszugProps) {
  const t = useTranslations('stammdaten.once_only');

  return (
    <section aria-labelledby="sd-register-title" data-testid="sd-register-panel">
      <h2
        id="sd-register-title"
        className="text-sm font-semibold text-text-primary"
      >
        {t('region_title')}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">{t('summary', { count })}</p>

      <ul className="mt-3">
        {nodes.map((node, idx) => (
          <li
            key={node.id}
            className={`flex items-start justify-between gap-x-3 gap-y-0.5 py-2 max-[340px]:flex-wrap ${
              idx > 0 ? 'border-t border-border/60' : ''
            }`}
          >
            <span className="flex min-w-0 items-start gap-2 text-sm text-text-primary">
              <span
                aria-hidden="true"
                className={`mt-[7px] size-1.5 shrink-0 rounded-full ${STATUS_DOT[node.status]}`}
              />
              {/* Wrap, never truncate — RU/UK register names are 2–3× the DE
                  length and a `truncate` here swallowed them entirely (WCAG
                  1.4.10, a11y report 2026-07-24 A1). */}
              <span className="min-w-0 break-words">{t(node.labelKey)}</span>
            </span>
            <span
              className={`pt-px text-end text-xs leading-5 ${STATUS_TEXT[node.status]}`}
            >
              {t(STATUS_KEY[node.status])}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-text-secondary">{t('pilot_note')}</p>
    </section>
  );
}
