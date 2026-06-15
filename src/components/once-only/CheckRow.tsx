import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CheckRowProps {
  ok: boolean;
  /**
   * The affirmative check statement from i18n (e.g. „Signatur kryptografisch
   * geprüft", „Kette gegen Demo-Trust-Anchor gültig", „8 von 8
   * Bestätigungsfeldern vorhanden"). When the check passes, this phrasing is
   * itself the TEXT signal of success (the icon is decorative).
   */
  label: string;
  /**
   * Text shown next to the failure icon so a failed check is conveyed by TEXT,
   * not colour alone (axe 1.4.1). e.g. „Nicht verifiziert". Required because the
   * affirmative `label` would otherwise contradict a red ✗ icon for SR users.
   */
  notOkText: string;
}

/**
 * A single verification-check row for the Verifiable-Once-Only credential panel.
 * Mirrors the `CheckRow` inside `EudiReferencePidCard` (kept as a small, clearly
 * intentional duplication per spec §4a — `EudiReferencePidCard` is reference-only
 * and must not be refactored).
 *
 * a11y: the status icon is ALWAYS `aria-hidden` and paired with text — on pass,
 * the affirmative `label` ("…geprüft"/"…gültig"/"…vorhanden"); on fail, the
 * explicit `notOkText`. Never colour-only (axe 1.4.1). Rendered as a `<li>`.
 */
export function CheckRow({ ok, label, notOkText }: CheckRowProps) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      {ok ? (
        <span className="inline-flex min-w-0 items-baseline gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2
            className="size-3.5 shrink-0 self-center"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{label}</span>
        </span>
      ) : (
        <span className="inline-flex min-w-0 items-baseline gap-1.5 font-medium text-destructive">
          <AlertTriangle
            className="size-3.5 shrink-0 self-center"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">
            {label} — {notOkText}
          </span>
        </span>
      )}
    </li>
  );
}
