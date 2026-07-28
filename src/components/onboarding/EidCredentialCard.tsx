'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';

const MRZ_WIDTH = 30;

/** Letters that Unicode NFD does not decompose into ASCII + combining mark. */
const MRZ_LETTER_MAP: Record<string, string> = {
  ß: 'SS',
  Æ: 'AE',
  Ø: 'O',
  Ð: 'D',
  Þ: 'TH',
  Ł: 'L',
  ı: 'I',
  İ: 'I',
};

/** Folds one already-uppercased token to bare ASCII letters for the MRZ. */
function foldToAscii(token: string): string {
  let out = '';
  for (const ch of token) {
    if (MRZ_LETTER_MAP[ch] !== undefined) {
      out += MRZ_LETTER_MAP[ch];
      continue;
    }
    const stripped = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += stripped.replace(/[^A-Z]/g, '');
  }
  return out;
}

/**
 * Builds a machine-readable-zone-style identity line for a credential card, e.g.
 * `IDD<<PETROV<<ANNA<<<<<<<<<<<<`. Decorative: surname then given name, folded
 * to bare ASCII, joined and padded with `<` to a fixed width. Not a valid ICAO
 * MRZ — a recognizable detail only. `docCode` mirrors the document class
 * (`ID` Personalausweis, `AR` Aufenthaltstitel).
 */
export function formatMrz(name: string, docCode: 'ID' | 'AR' = 'ID'): string {
  const parts = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const surname = foldToAscii(parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? '');
  const given = foldToAscii(parts.slice(0, -1).join('<<')) || foldToAscii(parts[0] ?? '');
  const core = `${docCode}D<<${surname}<<${given}`;
  return core.length >= MRZ_WIDTH
    ? core.slice(0, MRZ_WIDTH)
    : core + '<'.repeat(MRZ_WIDTH - core.length);
}

/** Black/red/gold horizontal flag stripe. Decorative — the non-infringing nod. */
function FlagMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-[11px] w-4 flex-col overflow-hidden rounded-[2px] ring-1 ring-black/10',
        className,
      )}
    >
      <span className="flex-1 bg-[#000000]" />
      <span className="flex-1 bg-[#DD0000]" />
      <span className="flex-1 bg-[#FFCE00]" />
    </span>
  );
}

interface EidCredentialCardBaseProps {
  name: string;
}

/**
 * The credential the eID function actually sits on. `personalausweis` carries it
 * per § 18 PAuswG, the electronic residence permit per § 78 AufenthG — a foreign
 * passport never does, so it is deliberately not a variant here.
 */
export interface EidDocument {
  kind: 'personalausweis' | 'eat';
  /** Issuing authority, already resolved to its `name_de`. Omitted ⇒ no row. */
  issuer?: string;
}

interface EidCredentialHeroProps extends EidCredentialCardBaseProps {
  variant: 'hero';
  nationality: string;
  /** Four-digit birth year — fallback when no full `birthdate` is supplied. */
  birthYear: string;
  /** Full German civilian birthdate (e.g. `22.03.1997`); preferred over `birthYear`. */
  birthdate?: string;
  /** Optional document facts. Without it the card renders as before. */
  document?: EidDocument;
}

type EidCredentialCardProps = EidCredentialHeroProps;

/**
 * A credible digital-ID credential rendered as a real artifact — flag stripe,
 * engraved portrait, security-print ground, MRZ line, honest `[MOCK]` stamp.
 * The authenticity is document detailing, not effect. `hero` is the single
 * variant: the full dark credential anchoring the transparency screen and the
 * Stammdaten hero.
 */
export function EidCredentialCard(props: EidCredentialCardProps) {
  const t = useTranslations('onboarding.eid_card');

  return (
    <EidCredentialHero
      {...props}
      kindLabel={t('label')}
      footerLabel={t('footer')}
      mockLabel={t('mock')}
    />
  );
}

/**
 * Faint Bundesadler-adjacent crest silhouette for the hero's lower-right
 * corner — a quiet authenticity detail at very low opacity, never a logo.
 * Decorative only.
 */
function EagleWatermark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
    >
      <path d="M32 6c2 0 3.4 1.4 3.6 3.2C40 8.6 44 10 46.4 13.4c2.6-1 5.2-.8 7 .4-1.4 1-2 2.6-1.8 4.2 3 .6 5.4 2.6 6.4 5.4-1.8-.4-3.6 0-5 1 2 1.6 3.2 3.8 3.4 6.2-2-1.2-4.2-1.6-6.4-1.2 1.4 2 1.8 4.4 1.2 6.6-1.6-1.6-3.6-2.6-5.8-2.8 1 2 1 4.2.2 6.2-1.4-1.8-3.4-3-5.6-3.4l-1 2.4c2.2 1.4 3.6 3.8 3.8 6.4-2-1.4-4.4-2-6.8-1.8v3.2c2 .4 3.6 2 4 4-1.8-.8-3.8-1-5.6-.4v3.4h6v3h-6v3h-2v-3h-6v-3h6v-3.4c-1.8-.6-3.8-.4-5.6.4.4-2 2-3.6 4-4v-3.2c-2.4-.2-4.8.4-6.8 1.8.2-2.6 1.6-5 3.8-6.4l-1-2.4c-2.2.4-4.2 1.6-5.6 3.4-.8-2-.8-4.2.2-6.2-2.2.2-4.2 1.2-5.8 2.8-.6-2.2-.2-4.6 1.2-6.6-2.2-.4-4.4 0-6.4 1.2.2-2.4 1.4-4.6 3.4-6.2-1.4-1-3.2-1.4-5-1 1-2.8 3.4-4.8 6.4-5.4.2-1.6-.4-3.2-1.8-4.2 1.8-1.2 4.4-1.4 7-.4C20 10 24 8.6 28.4 9.2 28.6 7.4 30 6 32 6z" />
    </svg>
  );
}

/**
 * Guilloche security-print ground: interleaved flowing strokes + two rosette
 * arcs at ~5% white, the way real credentials carry fine-line print under the
 * data. Stretches with the card (`preserveAspectRatio="none"`). Decorative.
 */
function GuillocheGround({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 200"
      preserveAspectRatio="none"
      fill="none"
      className={className}
      focusable="false"
    >
      <g stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.75">
        <path d="M-10 36 C 50 8, 110 62, 170 36 S 280 8, 340 40" />
        <path d="M-10 52 C 50 24, 110 78, 170 52 S 280 24, 340 56" />
        <path d="M-10 68 C 50 40, 110 94, 170 68 S 280 40, 340 72" />
        <path d="M-10 128 C 60 100, 130 154, 200 128 S 300 100, 340 132" />
        <path d="M-10 144 C 60 116, 130 170, 200 144 S 300 116, 340 148" />
        <path d="M-10 160 C 60 132, 130 186, 200 160 S 300 132, 340 164" />
        <circle cx="286" cy="42" r="64" />
        <circle cx="286" cy="42" r="50" />
        <circle cx="286" cy="42" r="36" />
      </g>
    </svg>
  );
}

/**
 * The photo field of the credential — a laser-engraved-style bust silhouette
 * on a guilloche ground with a horizontal raster, never a face. A real portrait
 * (or an AI-generated one) would claim a person the mock data does not have;
 * the engraved-blank look is the honest artifact and still reads as an ID
 * document at a glance. Decorative → `aria-hidden`: the identity is stated as
 * text right next to it.
 */
function PortraitField({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 70 90"
      className={className}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9EFEA" />
          <stop offset="100%" stopColor="#C3D0C8" />
        </linearGradient>
        <clipPath id={`${uid}-frame`}>
          <rect width="70" height="90" rx="4" />
        </clipPath>
        <clipPath id={`${uid}-bust`}>
          <path d="M35 19.5c7.4 0 13.2 6 13.2 13.6 0 5.3-2.5 10-6.2 12.3.2 2.3 1.1 3.9 3.6 4.9 10.6 2.7 17.9 10.7 19 22.5L65.2 90H4.8l.6-17.2c1.1-11.8 8.4-19.8 19-22.5 2.5-1 3.4-2.6 3.6-4.9-3.7-2.3-6.2-7-6.2-12.3 0-7.6 5.8-13.6 13.2-13.6z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-frame)`}>
        <rect width="70" height="90" fill={`url(#${uid}-bg)`} />
        {/* Fine-line print behind the portrait, echoing the card ground. */}
        <g fill="none" stroke="#0F3D2E" strokeOpacity="0.08" strokeWidth="0.5">
          <circle cx="35" cy="46" r="34" />
          <circle cx="35" cy="46" r="27" />
          <circle cx="35" cy="46" r="20" />
          <path d="M-4 14 C 16 4, 40 24, 74 10" />
          <path d="M-4 80 C 20 70, 44 90, 74 76" />
        </g>
        {/* The engraved bust … */}
        <g clipPath={`url(#${uid}-bust)`}>
          <rect width="70" height="90" fill="#35564A" />
          {/* … with its raster: horizontal engraving lines, the way laser
              portraits are printed on polycarbonate cards. */}
          <g stroke="#DCE6DF" strokeOpacity="0.35" strokeWidth="0.6">
            {Array.from({ length: 29 }, (_, i) => (
              <line key={i} x1="2" x2="68" y1={19 + i * 2.5} y2={19 + i * 2.5} />
            ))}
          </g>
        </g>
        <rect
          x="0.5"
          y="0.5"
          width="69"
          height="89"
          rx="3.5"
          fill="none"
          stroke="#0F3D2E"
          strokeOpacity="0.25"
        />
      </g>
    </svg>
  );
}

/** One document fact: micro-label above its value — the ID-card field idiom. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[13px] font-medium leading-snug text-zinc-100">
        {children}
      </dd>
    </div>
  );
}

function EidCredentialHero({
  name,
  nationality,
  birthYear,
  birthdate,
  document: doc, // local alias — the prop name shadows the global `document` (review nit #8)
  kindLabel,
  footerLabel,
  mockLabel,
}: EidCredentialHeroProps & {
  kindLabel: string;
  footerLabel: string;
  mockLabel: string;
}) {
  /* The document block resolves its own labels — passing five more strings
     through the wrapper would say nothing the namespace doesn't already. */
  const t = useTranslations('onboarding.eid_card');
  const mrz = formatMrz(name, doc?.kind === 'eat' ? 'AR' : 'ID');
  const birthValue = birthdate ?? birthYear;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0F3D2E] text-white shadow-sm ring-1 ring-white/10">
      {/* Security-print ground + light: guilloche, a soft top-left sheen and a
          crisp top hairline — depth from layered print and a light edge, not
          from effects. All decorative, all behind the data. */}
      <GuillocheGround className="pointer-events-none absolute inset-0 h-full w-full text-white" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_15%_-5%,rgba(255,255,255,0.09),transparent_55%)]"
      />
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/25" />
      <EagleWatermark className="pointer-events-none absolute -bottom-4 -right-3 size-32 text-white/[0.05]" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlagMark />
            {/* 9px + moderate tracking: the DE label must fit ONE line beside
                the MOCK pill in the 300px Stammdaten column — a broken
                „(EID)"-orphan reads as a layout bug on a document. */}
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-200">
              {kindLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#1E5C46] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white ring-1 ring-white/15">
            {mockLabel}
          </span>
        </div>

        {/* Photo left, identity right — the ID-1 arrangement, not decoration. */}
        <div className="mt-5 flex items-center gap-4">
          <PortraitField className="h-[82px] w-16 shrink-0 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.3)] ring-1 ring-white/25 sm:h-[92px] sm:w-[72px]" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-wide text-white sm:text-xl">
              {name}
            </p>
            <p className="mt-0.5 text-[13px] text-zinc-300">
              {t('nationality_birth', { nationality, datum: birthValue })}
            </p>
          </div>
        </div>

        {doc ? (
          <dl className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-3.5">
            <Field label={t('doc_kind_label')}>
              {t(doc.kind === 'eat' ? 'doc_eat' : 'doc_personalausweis')}
            </Field>
            {doc.issuer ? (
              <Field label={t('doc_issuer_label')}>{doc.issuer}</Field>
            ) : null}
            <Field label={t('doc_funktion_label')}>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-emerald-400"
                />
                {t('doc_funktion_value', {
                  norm: t(
                    doc.kind === 'eat'
                      ? 'doc_eat_norm'
                      : 'doc_personalausweis_norm',
                  ),
                })}
              </span>
            </Field>
          </dl>
        ) : null}

        <p
          aria-hidden="true"
          className="mt-4 overflow-hidden whitespace-nowrap font-mono text-[10px] leading-relaxed tracking-[0.18em] text-zinc-400"
          dir="ltr"
        >
          {mrz}
        </p>

        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-zinc-300">
          {footerLabel}
          <Info className="size-3 shrink-0" aria-hidden="true" />
        </p>
      </div>
    </div>
  );
}
