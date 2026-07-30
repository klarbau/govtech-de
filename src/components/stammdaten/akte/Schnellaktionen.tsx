'use client';

import Link from 'next/link';
import { CalendarDays, FileText, House, IdCard, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SchnellaktionenProps {
  /**
   * Rendered as the second pill when a presentable credential exists; otherwise
   * the pill becomes a link into the vault (Spec § 12 — Markus has no eAT).
   */
  onPresent?: () => void;
}

/* `white-space: normal` (Tailwind's default) is deliberate: the RU and AR
   labels are 2–3× the German length and must wrap inside the pill instead of
   being clipped. `min-h-11` keeps the tap target while they do.
   `border-white/40` is the floor, not a taste: on `--sd-ink` it measures
   3,79:1 and thus clears the 3:1 of WCAG 1.4.11 for the pill boundary
   (a11y-Report 2026-07-29, A-1 — `/28` landed at 2,82:1). */
const PILLE =
  'flex min-h-11 items-center gap-[7px] rounded-lg border border-white/40 bg-white/9 px-2.5 py-2 text-start text-[12px] font-medium leading-tight text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:text-[11px]';

const ICON = 'size-3.5 shrink-0 opacity-95';

/**
 * The one dark plane of the rail (Spec `stammdaten-akte-v2.md` § 4.7a): four
 * actions as a 2×2 pill grid. The screen's blur budget is spent on the shell
 * (0 `backdrop-filter` in `main`), so this surface is solid in both themes.
 *
 * Every target is real: the Lebenslagen hub, the present dialog (or the vault),
 * the appointments screen, the Umzug wizard. „Dokument hochladen" and „Notiz
 * hinzufügen" from the source mockup are gone — neither flow exists.
 *
 * Invariant: at most ONE `<button>` lives here (the present trigger) —
 * `stammdaten-modals.spec.ts` selects `button.first()` to test the dialog's
 * focus contract.
 */
export function Schnellaktionen({ onPresent }: SchnellaktionenProps) {
  const t = useTranslations('stammdaten.akte');

  return (
    <section
      aria-labelledby="sd-aktionen-title"
      data-testid="sd-aktionen"
      className="min-w-0 rounded-xl bg-[var(--sd-ink)] p-4 text-white ring-1 ring-white/10"
    >
      <div className="flex items-center justify-between gap-x-3">
        <h2
          id="sd-aktionen-title"
          className="text-[13.5px] font-semibold text-white"
        >
          {t('aktionen.title')}
        </h2>
        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-white/85" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-[7px]">
        <Link href="/lebenslagen" className={PILLE}>
          <FileText aria-hidden="true" className={ICON} />
          {t('aktionen.vorgang')}
        </Link>

        {onPresent ? (
          <button type="button" onClick={onPresent} className={PILLE}>
            <IdCard aria-hidden="true" className={ICON} />
            {t('aktionen.nachweis')}
          </button>
        ) : (
          <Link href="/dokumente" className={PILLE}>
            <IdCard aria-hidden="true" className={ICON} />
            {t('aktionen.nachweise_ansehen')}
          </Link>
        )}

        <Link href="/termine" className={PILLE}>
          <CalendarDays aria-hidden="true" className={ICON} />
          {t('aktionen.termine')}
        </Link>

        <Link href="/vorgaenge/umzug/start" className={PILLE}>
          <House aria-hidden="true" className={ICON} />
          {t('aktionen.adresse')}
        </Link>
      </div>
    </section>
  );
}
