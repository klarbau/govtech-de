'use client';

import { useTranslations } from 'next-intl';

import {
  GuillocheGround,
  PortraitField,
} from '@/components/onboarding/EidCredentialCard';

interface PortraitKarteProps {
  /**
   * `{datum}, {zeit}` — already localized. Omitted when the transmission log is
   * empty: the pair then disappears instead of showing a placeholder.
   */
  aktualisiertWert?: string;
  /** Meldebehörde am Wohnort, sonst der generische Fallback — nie leer. */
  quelleWert: string;
}

/**
 * The portrait plate of the identity hero (Spec `stammdaten-akte-v2.md` § 4.2) —
 * the same laser-engraved blank the eID credential carries, on the same
 * Waldgrün ground, now closed by a dark info foot on the SAME plane.
 *
 * The foot carries exactly the two fields EVERY persona has: when the record
 * was last touched, and which authority leads it. No Aktenzeichen (domain
 * MANDATORY M1 — only non-Germans would get one stamped under their face), no
 * third field, no interactive element. The `[MOCK]` caption is no longer part
 * of the card: it is a statement ABOUT the artifact and renders as a grey line
 * underneath it (Spec § 4.2), which also keeps the plate byte-identical for
 * every persona.
 *
 * The plate fills its column: the width lives on the hero's portrait column, so
 * the caption underneath cannot be wider than the plate above it.
 */
export function PortraitKarte({
  aktualisiertWert,
  quelleWert,
}: PortraitKarteProps) {
  const t = useTranslations('stammdaten.akte');

  return (
    <div
      data-testid="sd-portraet"
      className="w-full overflow-hidden rounded-xl bg-[var(--sd-ink)] text-white shadow-sm ring-1 ring-white/10"
    >
      <div className="relative aspect-[3/4] w-full">
        <GuillocheGround className="pointer-events-none absolute inset-0 size-full text-white" />
        <PortraitField className="absolute inset-0 size-full" />
      </div>

      <dl
        data-testid="sd-portraet-fuss"
        className="border-t border-white/12 px-4 py-3"
      >
        {aktualisiertWert ? (
          <>
            <dt className="text-[12px] leading-tight text-white/75 md:text-[10.5px]">
              {t('portraet.aktualisiert_label')}
            </dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-snug md:text-[12.5px]">
              {aktualisiertWert}
            </dd>
          </>
        ) : null}
        <dt
          className={`text-[12px] leading-tight text-white/75 md:text-[10.5px] ${
            aktualisiertWert ? 'mt-2.5' : ''
          }`}
        >
          {t('portraet.quelle_label')}
        </dt>
        <dd className="mt-0.5 text-[13px] font-semibold leading-snug md:text-[12.5px]">
          {quelleWert}
        </dd>
      </dl>
    </div>
  );
}
