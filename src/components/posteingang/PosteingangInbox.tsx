'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Euro,
  File as FileIcon,
  Filter,
  FolderInput,
  Info,
  Landmark,
  ListChecks,
  MessageCircleQuestion,
  MoreHorizontal,
  PenSquare,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/mock-backend';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Behoerde, Letter, Vorgang } from '@/types';

import { NeuerVorgangAusBriefModal } from './NeuerVorgangAusBriefModal';
import { ReplyInlinePanel } from './ReplyInlinePanel';
import { ReplyModalSheet } from './ReplyModalSheet';
import { OriginaltextBlock } from './OriginaltextBlock';
import { VorgangsGruppe, SonstigeGruppe } from './VorgangsGruppe';
import { FilterSheet } from './FilterSheet';
import {
  filterKategorieToInternal,
  type FilterKategorie,
} from './FilterPopover';

interface InitialData {
  letters: Letter[];
  behoerdenById: Record<string, Behoerde>;
  vorgaengeById: Record<string, Vorgang>;
  nowIso: string;
}

interface PosteingangInboxProps {
  initial: InitialData;
  initialSelectedLetterId?: string | null;
}

type AvatarVariant = 'eagle' | 'aok' | 'ard' | 'lea' | 'jc' | 'default';
type SectionKey = 'neu' | 'frist7' | 'erledigt';
type StatusTab = 'alle' | 'ungelesen' | 'mit_frist' | 'wichtig';

/** Ein Brief ist „mit Frist", wenn mindestens ein offener Frist-Termin hinterlegt ist. */
function letterHasFrist(letter: Letter): boolean {
  return (letter.fristen ?? []).some((f) => Boolean(f.datum));
}

/**
 * „Wichtig" = nicht erledigt + Nachzahlungs- oder rechtsmittelfähiger Bescheid
 * mit naher Frist. Pragmatisch: offener Brief mit Frist innerhalb 7 Tagen ODER
 * mit fälliger Nachzahlung.
 */
function letterIsWichtig(letter: Letter, nowIso: string): boolean {
  if (letter.status === 'erledigt') return false;
  if (letter.betrag_richtung === 'nachzahlung') return true;
  const earliest = (letter.fristen ?? []).map((f) => f.datum).sort()[0];
  if (!earliest) return false;
  const days = differenceInCalendarDays(parseISO(earliest), parseISO(nowIso));
  return days >= 0 && days <= 7;
}

function matchesStatusTab(letter: Letter, tab: StatusTab, nowIso: string): boolean {
  switch (tab) {
    case 'ungelesen':
      return letter.status === 'ungelesen';
    case 'mit_frist':
      return letterHasFrist(letter);
    case 'wichtig':
      return letterIsWichtig(letter, nowIso);
    default:
      return true;
  }
}

/**
 * `<PosteingangInbox>` — literal port of `docs/design-prototype-v2/posteingang.html`.
 * Same DOM (`post-toolbar`, `post-layout`, `post-section`, `post-item`,
 * `post-detail`, `ai-card`, `frist-row`, `post-actions`, `post-followups`,
 * `auszug`); list data is wired through `api.getLetters()` and grouped into
 * Neu / Frist offen ≤ 7 Tagen / Erledigt. Detail panel renders the selected
 * letter; actions reuse the existing ReplySheet + NeuerVorgangAusBriefModal +
 * OriginaltextBlock helpers.
 */
export function PosteingangInbox({
  initial,
  initialSelectedLetterId,
}: PosteingangInboxProps) {
  const t = useTranslations('posteingang');
  const t3 = useTranslations('posteingang.mockup3');
  const tCommon = useTranslations('common');
  const [letters, setLetters] = React.useState<Letter[]>(initial.letters);
  const [behoerdenById, setBehoerdenById] = React.useState(initial.behoerdenById);
  const [hasLoaded, setHasLoaded] = React.useState(initial.letters.length > 0);
  // Distinguishes „erster Refresh noch unterwegs" von „Posteingang ist leer":
  // flippt erst, wenn der initiale Refresh abgeschlossen ist (Erfolg ODER Fehler).
  const [loaded, setLoaded] = React.useState(initial.letters.length > 0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusTab, setStatusTab] = React.useState<StatusTab>('alle');
  const [view, setView] = React.useState<'chronologisch' | 'vorgang'>('chronologisch');
  const [selectedLetterId, setSelectedLetterId] = React.useState<string | null>(
    initialSelectedLetterId ?? null,
  );
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterSelected, setFilterSelected] = React.useState<FilterKategorie[]>([]);

  const [replyLetter, setReplyLetter] = React.useState<Letter | null>(null);
  // Inline-Exit-Lifecycle (§4.1): beim Schließen läuft erst die Exit-Animation
  // (replyLetter bleibt gesetzt, damit `letter` gültig ist), dann clears `onClosed`.
  const [inlineReplyOpen, setInlineReplyOpen] = React.useState(false);
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);
  const [vorgangModalLetter, setVorgangModalLetter] = React.useState<Letter | null>(null);
  const [originalTextOpen, setOriginalTextOpen] = React.useState(false);

  // Inline (≥ 1100 px, Spec §6.2) vs. modaler Sheet (< 1100 px). SSR-sicher
  // (initial false → Modal), flippt nach Mount auf den echten Match.
  const inlineBreakpoint = useMediaQuery('(min-width: 1100px)');
  const inlineActive = replyLetter !== null && inlineBreakpoint;

  function openReply(letter: Letter, event?: React.SyntheticEvent) {
    const trigger = (event?.currentTarget ??
      (typeof document !== 'undefined'
        ? document.activeElement
        : null)) as HTMLElement | null;
    lastTriggerRef.current = trigger;
    setReplyLetter(letter);
    setInlineReplyOpen(true);
  }

  function requestCloseReply() {
    // Inline: Exit-Animation; `onClosed` clears danach. Modal: sofort clearen.
    if (inlineBreakpoint) {
      setInlineReplyOpen(false);
    } else {
      setReplyLetter(null);
    }
  }

  function handleInlineClosed() {
    setReplyLetter(null);
    const trigger = lastTriggerRef.current;
    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus();
    }
    lastTriggerRef.current = null;
  }

  const vorgaengeById = initial.vorgaengeById;

  React.useEffect(() => {
    if (hasLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const [next, behoerden] = await Promise.all([
          api.getLetters(),
          api.getBehoerden(),
        ]);
        if (cancelled) return;
        const map: Record<string, Behoerde> = {};
        for (const b of behoerden) map[b.id] = b;
        setLetters(next);
        setBehoerdenById(map);
        setHasLoaded(true);
        setLoaded(true);
      } catch {
        // swallowed — UI shows an empty inbox.
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasLoaded]);

  const nowIso = initial.nowIso;

  const filteredLetters = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeKategorien = new Set(
      filterSelected.flatMap((k) => filterKategorieToInternal(k)),
    );
    return letters.filter((l) => {
      const behoerde = behoerdenById[l.absender_behoerde_id];
      if (activeKategorien.size > 0) {
        if (!behoerde || !activeKategorien.has(behoerde.kategorie)) return false;
      }
      if (q.length < 3) return true;
      return (
        l.aktenzeichen.toLowerCase().includes(q) ||
        (behoerde?.name_de ?? '').toLowerCase().includes(q)
      );
    });
  }, [letters, behoerdenById, searchQuery, filterSelected]);

  const tabCounts = React.useMemo(
    () => ({
      alle: filteredLetters.length,
      ungelesen: filteredLetters.filter((l) => l.status === 'ungelesen').length,
      mit_frist: filteredLetters.filter((l) => letterHasFrist(l)).length,
      wichtig: filteredLetters.filter((l) => letterIsWichtig(l, nowIso)).length,
    }),
    [filteredLetters, nowIso],
  );

  const tabFilteredLetters = React.useMemo(
    () => filteredLetters.filter((l) => matchesStatusTab(l, statusTab, nowIso)),
    [filteredLetters, statusTab, nowIso],
  );

  const grouped = React.useMemo(() => {
    const filtered = tabFilteredLetters;

    const neu: Letter[] = [];
    const frist7: Letter[] = [];
    const erledigt: Letter[] = [];
    for (const l of filtered) {
      if (l.status === 'erledigt') {
        erledigt.push(l);
        continue;
      }
      const earliest = (l.fristen ?? [])
        .map((f) => f.datum)
        .sort()[0];
      if (earliest) {
        const days = differenceInCalendarDays(parseISO(earliest), parseISO(nowIso));
        if (days >= 0 && days <= 7) {
          frist7.push(l);
          continue;
        }
      }
      if (l.status === 'ungelesen') {
        neu.push(l);
      } else {
        neu.push(l);
      }
    }
    return { neu, frist7, erledigt };
  }, [tabFilteredLetters, nowIso]);

  const byVorgang = React.useMemo(() => {
    const groups = new Map<string, Letter[]>();
    const sonstige: Letter[] = [];
    for (const l of tabFilteredLetters) {
      if (l.vorgang_id) {
        const bucket = groups.get(l.vorgang_id);
        if (bucket) bucket.push(l);
        else groups.set(l.vorgang_id, [l]);
      } else {
        sonstige.push(l);
      }
    }
    return { groups, sonstige };
  }, [tabFilteredLetters]);

  const selectedLetter =
    letters.find((l) => l.id === selectedLetterId) ?? letters[0] ?? null;

  const selectedAbsender = selectedLetter
    ? behoerdenById[selectedLetter.absender_behoerde_id] ?? null
    : null;

  if (!loaded) {
    return <PosteingangInboxSkeleton loadingLabel={tCommon('loading')} />;
  }

  return (
    <>
      <div className={inlineActive ? 'post-content--reply-open' : undefined}>
      <div className="gt-page-head">
        <h1>Posteingang</h1>
        <div className="sub">Alle Behörden-Briefe an einem Ort. Verstehen statt verzweifeln.</div>
        <span className="gt-page-tag">Prototyp · Mock-Daten</span>
      </div>

      <div className="post-toolbar">
        <div className="input-icon">
          <Search />
          <input
            className="input"
            placeholder={t('search.placeholder')}
            aria-label={t('search.aria_label')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <div className="view-toggle" role="tablist" aria-label={t('search.view_aria')}>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'chronologisch'}
            className={view === 'chronologisch' ? 'active' : ''}
            onClick={() => setView('chronologisch')}
          >
            Chronologisch
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'vorgang'}
            className={view === 'vorgang' ? 'active' : ''}
            onClick={() => setView('vorgang')}
          >
            Nach Vorgang
          </button>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setFilterOpen(true)}
          aria-haspopup="dialog"
        >
          <Filter />Filter
          {filterSelected.length > 0 && (
            <span
              aria-label={`${filterSelected.length} Filter aktiv`}
              style={{
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                borderRadius: '9px',
                background: 'var(--brand-fill)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {filterSelected.length}
            </span>
          )}
        </button>
      </div>

      {view === 'chronologisch' && (
        <div
          className="post-tabs"
          role="tablist"
          aria-label={t3('tabs.aria_label')}
        >
          <StatusTabButton
            label={t3('tabs.alle')}
            count={tabCounts.alle}
            active={statusTab === 'alle'}
            onClick={() => setStatusTab('alle')}
          />
          <StatusTabButton
            label={t3('tabs.ungelesen')}
            count={tabCounts.ungelesen}
            active={statusTab === 'ungelesen'}
            onClick={() => setStatusTab('ungelesen')}
          />
          <StatusTabButton
            label={t3('tabs.mit_frist')}
            count={tabCounts.mit_frist}
            active={statusTab === 'mit_frist'}
            onClick={() => setStatusTab('mit_frist')}
          />
          <StatusTabButton
            label={t3('tabs.wichtig')}
            count={tabCounts.wichtig}
            active={statusTab === 'wichtig'}
            onClick={() => setStatusTab('wichtig')}
          />
        </div>
      )}

      <div className="post-layout">
        {view === 'chronologisch' ? (
          <div>
            <PostSection
              label="Neu"
              count={grouped.neu.length}
              countTone="brand"
            >
              {grouped.neu.map((l) => (
                <PostItemRow
                  key={l.id}
                  letter={l}
                  behoerde={behoerdenById[l.absender_behoerde_id]}
                  active={selectedLetter?.id === l.id}
                  nowIso={nowIso}
                  section="neu"
                  onSelect={() => setSelectedLetterId(l.id)}
                />
              ))}
            </PostSection>

            <PostSection
              label="Frist offen ≤ 7 Tagen"
              count={grouped.frist7.length}
              countTone="red"
            >
              {grouped.frist7.map((l) => (
                <PostItemRow
                  key={l.id}
                  letter={l}
                  behoerde={behoerdenById[l.absender_behoerde_id]}
                  active={selectedLetter?.id === l.id}
                  nowIso={nowIso}
                  section="frist7"
                  onSelect={() => setSelectedLetterId(l.id)}
                />
              ))}
            </PostSection>

            <PostSection
              label="Erledigt"
              count={grouped.erledigt.length}
              countTone="muted"
            >
              {grouped.erledigt.map((l) => (
                <PostItemRow
                  key={l.id}
                  letter={l}
                  behoerde={behoerdenById[l.absender_behoerde_id]}
                  active={selectedLetter?.id === l.id}
                  nowIso={nowIso}
                  section="erledigt"
                  onSelect={() => setSelectedLetterId(l.id)}
                />
              ))}
            </PostSection>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...byVorgang.groups.entries()].map(([vorgangId, vorgangLetters]) => (
              <VorgangsGruppe
                key={vorgangId}
                vorgangId={vorgangId}
                vorgangTitle={vorgaengeById[vorgangId]?.titel ?? vorgangId}
                letters={vorgangLetters}
                behoerdenById={behoerdenById}
                vorgaengeById={vorgaengeById}
                nowIso={nowIso}
                onCreateVorgang={(l) => setVorgangModalLetter(l)}
              />
            ))}
            {byVorgang.sonstige.length > 0 && (
              <SonstigeGruppe
                letters={byVorgang.sonstige}
                behoerdenById={behoerdenById}
                nowIso={nowIso}
                onCreateVorgang={(l) => setVorgangModalLetter(l)}
              />
            )}
            {byVorgang.groups.size === 0 && byVorgang.sonstige.length === 0 && (
              <p className="muted text-sm">Keine Briefe für diese Auswahl.</p>
            )}
          </div>
        )}

        {selectedLetter && (
          <PostDetail
            letter={selectedLetter}
            absender={selectedAbsender}
            replyLabel={t('sticky_action.cta_reply')}
            onAntwortVorbereiten={(e) => openReply(selectedLetter, e)}
            onVorgangErstellen={() => setVorgangModalLetter(selectedLetter)}
            onOriginaltextToggle={() => setOriginalTextOpen((v) => !v)}
            originaltextOpen={originalTextOpen}
          />
        )}

      </div>
      </div>

      {inlineActive && replyLetter && (
        <ReplyInlinePanel
          open={inlineReplyOpen}
          letter={replyLetter}
          empfaengerBehoerde={
            behoerdenById[replyLetter.absender_behoerde_id] ?? null
          }
          existingReply={null}
          onRequestClose={requestCloseReply}
          onClosed={handleInlineClosed}
        />
      )}

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        selected={filterSelected}
        onChange={setFilterSelected}
      />

      <NeuerVorgangAusBriefModal
        letter={vorgangModalLetter}
        open={vorgangModalLetter !== null}
        onOpenChange={(o) => {
          if (!o) setVorgangModalLetter(null);
        }}
        onCreated={() => {
          toast.success('Vorgang erstellt.');
          setVorgangModalLetter(null);
        }}
      />

      {replyLetter && !inlineBreakpoint && (
        <ReplyModalSheet
          letter={replyLetter}
          empfaengerBehoerde={behoerdenById[replyLetter.absender_behoerde_id] ?? null}
          existingReply={null}
          open={replyLetter !== null}
          onOpenChange={(o) => {
            if (!o) setReplyLetter(null);
          }}
        />
      )}
    </>
  );
}

export type { InitialData };

// ── PosteingangInboxSkeleton ────────────────────────────────────────────────

function PosteingangInboxSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{loadingLabel}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-80" />
      </div>
      <div className="post-toolbar">
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
      </div>
      <div className="post-layout">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

// ── StatusTabButton ─────────────────────────────────────────────────────────

function StatusTabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`post-tab${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {label}
      <span className="count">{count}</span>
    </button>
  );
}

// ── PostSection ─────────────────────────────────────────────────────────────

function PostSection({
  label,
  count,
  countTone,
  children,
}: {
  label: string;
  count: number;
  countTone: 'brand' | 'red' | 'muted';
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);
  const countStyle: React.CSSProperties =
    countTone === 'red'
      ? { background: 'var(--red-500)' }
      : countTone === 'muted'
        ? { background: 'var(--ink-4)' }
        : {};

  if (count === 0) return null;

  return (
    <div className="post-section">
      <button
        type="button"
        className="post-section-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', border: 0, background: 'transparent' }}
      >
        <span className="label">
          {label} <span className="count" style={countStyle}>{count}</span>
        </span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>
      {open && <div className="items">{children}</div>}
    </div>
  );
}

// ── PostItemRow ─────────────────────────────────────────────────────────────

function PostItemRow({
  letter,
  behoerde,
  active,
  nowIso,
  section,
  onSelect,
}: {
  letter: Letter;
  behoerde: Behoerde | undefined;
  active: boolean;
  nowIso: string;
  section: SectionKey;
  onSelect: () => void;
}) {
  const variant = avatarVariant(letter.absender_behoerde_id);
  const archetypeLabel = archetypeText(letter);
  const earliestFrist = (letter.fristen ?? [])
    .map((f) => f.datum)
    .sort()[0];
  const fristLabel = earliestFrist ? formatFristLabel(earliestFrist) : null;
  const eingangLabel = formatEingangLabel(letter.empfangen_am, nowIso);
  const behoerdeName = behoerde?.name_de ?? '';

  return (
    <Link
      href={`/posteingang/${letter.id}`}
      className={`post-item${active ? ' active' : ''}`}
      onClick={(e) => {
        // Inline preview on ≥ lg: prevent navigation on a modifier-less POINTER
        // click, so the right-pane detail updates without a full route change.
        // Keyboard activation (Enter) fires a synthetic click with `detail === 0`
        // — for those we let the real navigation happen, so keyboard users reach
        // the letter route (and deep-linking / back works). WCAG 2.1.1.
        if (
          e.detail !== 0 &&
          typeof window !== 'undefined' &&
          window.matchMedia('(min-width: 1024px)').matches &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey
        ) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <AvatarSquare variant={variant} />
      <div className="body">
        <div className="t">
          {behoerdeName ? `${behoerdeName} — ` : ''}
          {letter.betreff}
        </div>
        <div className="s">
          {archetypeLabel}
          <br />
          Aktenzeichen: {letter.aktenzeichen}
        </div>
      </div>
      <div className="meta">
        {section === 'erledigt' ? (
          <>
            Erledigt
            <br />
            {formatDDMMYYYY(parseISO(letter.empfangen_am))}
          </>
        ) : section === 'frist7' ? (
          <>
            {fristLabel && <div className="frist">Frist: {fristLabel}</div>}
            <span className="un red" />
          </>
        ) : (
          <>
            {eingangLabel}
            {letter.status === 'ungelesen' && <span className="un" />}
          </>
        )}
      </div>
    </Link>
  );
}

// ── PostDetail ──────────────────────────────────────────────────────────────

function PostDetail({
  letter,
  absender,
  replyLabel,
  onAntwortVorbereiten,
  onVorgangErstellen,
  onOriginaltextToggle,
  originaltextOpen,
}: {
  letter: Letter;
  absender: Behoerde | null;
  replyLabel: string;
  onAntwortVorbereiten: (e: React.SyntheticEvent) => void;
  onVorgangErstellen: () => void;
  onOriginaltextToggle: () => void;
  originaltextOpen: boolean;
}) {
  const t3 = useTranslations('posteingang.mockup3');
  const tWas = useTranslations('posteingang.was_kann_ich_tun');
  const [docTab, setDocTab] = React.useState<'original' | 'anhaenge' | 'verlauf'>(
    'original',
  );
  // Bei Briefwechsel: zurück auf den Default-Tab + Originaltext eingeklappt.
  React.useEffect(() => {
    setDocTab('original');
  }, [letter.id]);

  const ai = letter.ai_summary?.post_open;
  const bullets = ai?.bullets?.slice(0, 3).map((b) => b.text) ?? [];
  const worum = bullets[0] ?? t3('erklaerer.worum_fallback');

  const earliestFrist = (letter.fristen ?? [])
    .map((f) => f.datum)
    .sort()[0];
  const fristLabel = earliestFrist ? formatFristLabel(earliestFrist) : null;
  const fristTyp = letter.fristen?.[0]?.typ ?? 'Aktion';
  const bodyExcerpt = letter.body_de
    ? letter.body_de.split('\n').filter(Boolean).slice(2, 5).join(' ').slice(0, 280)
    : '';

  const betragText = formatBetragErklaerung(letter, t3);
  const bisWannText = fristLabel
    ? t3('erklaerer.bis_wann_template', { datum: fristLabel })
    : t3('erklaerer.bis_wann_keine');

  const bedeutung = formatBedeutung(letter, tWas, t3);
  const hasNachzahlung = letter.betrag_richtung === 'nachzahlung';

  const empfangenLabel = formatDDMMYYYY(parseISO(letter.empfangen_am));
  const kategorieLabel = absender
    ? t3(`detail.kategorie.${absender.kategorie}` as 'detail.kategorie.bund')
    : t3('detail.kategorie.unbekannt');

  return (
    <div className="post-detail">
      <div className="post-detail-head">
        <span className="av">
          <Landmark />
        </span>
        <div className="grow">
          <div className="who">{absender?.name_de ?? 'Behörde'}</div>
          <div className="what">Behördenbrief · {archetypeText(letter)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="verify">
            <ShieldCheck />Authentisch geprüft
          </div>
          <div className="muted text-xs">
            Verifiziert am {empfangenLabel}
          </div>
        </div>
      </div>

      <div className="post-detail-tools">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => downloadLetterAsText(letter)}
        >
          <Download />
          {t3('detail.herunterladen')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            if (typeof window !== 'undefined') window.print();
          }}
        >
          <Printer />
          {t3('detail.drucken')}
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ width: '32px', padding: 0 }}
          aria-label="Weitere Optionen"
          disabled
          aria-disabled="true"
        >
          <MoreHorizontal />
        </button>
      </div>

      <h2>{letter.betreff}</h2>
      <dl className="post-meta-grid">
        <div className="post-meta-cell">
          <dt>{t3('detail.meta_eingegangen')}</dt>
          <dd>{empfangenLabel}</dd>
        </div>
        <div className="post-meta-cell">
          <dt>{t3('detail.meta_behoerde')}</dt>
          <dd>{absender?.name_de ?? '—'}</dd>
        </div>
        <div className="post-meta-cell">
          <dt>{t3('detail.meta_kategorie')}</dt>
          <dd>{kategorieLabel}</dd>
        </div>
        <div className="post-meta-cell">
          <dt>{t3('detail.meta_aktenzeichen')}</dt>
          <dd>{letter.aktenzeichen}</dd>
        </div>
        <div className="post-meta-cell">
          <dt>{t3('detail.meta_frist')}</dt>
          <dd className={fristLabel ? 'has-frist' : undefined}>
            {fristLabel ?? t3('detail.meta_frist_keine')}
          </dd>
        </div>
      </dl>

      <div className="post-doc-tabs" role="tablist" aria-label={t3('detail.tabs_aria')}>
        <button
          type="button"
          role="tab"
          aria-selected={docTab === 'original'}
          className={`post-doc-tab${docTab === 'original' ? ' active' : ''}`}
          onClick={() => setDocTab('original')}
        >
          {t3('detail.tab_original')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={docTab === 'anhaenge'}
          className={`post-doc-tab${docTab === 'anhaenge' ? ' active' : ''}`}
          onClick={() => setDocTab('anhaenge')}
        >
          {t3('detail.tab_anhaenge')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={docTab === 'verlauf'}
          className={`post-doc-tab${docTab === 'verlauf' ? ' active' : ''}`}
          onClick={() => setDocTab('verlauf')}
        >
          {t3('detail.tab_verlauf')}
        </button>
      </div>

      {docTab === 'original' && (
        <>
          <div className="ai-card">
            <span className="icon-circle">
              <Sparkles />
            </span>
            <div className="ai-card-body">
              <div className="ai-card-top">
                <div className="h">{t3('erklaerer.title')}</div>
                <span className="ai-pill">
                  <Sparkles aria-hidden="true" />
                  {t3('erklaerer.pill')}
                </span>
              </div>
              <div className="ai-block">
                <div className="ai-block-q">{t3('erklaerer.worum_label')}</div>
                <p className="ai-block-a">{worum}</p>
              </div>
              <div className="ai-block">
                <div className="ai-block-q">{t3('erklaerer.betrag_label')}</div>
                <p className="ai-block-a">{betragText}</p>
              </div>
              <div className="ai-block">
                <div className="ai-block-q">{t3('erklaerer.bis_wann_label')}</div>
                <p className="ai-block-a">{bisWannText}</p>
              </div>
              <p className="ai-disclaimer">{t3('erklaerer.disclaimer')}</p>
            </div>
          </div>

          {fristLabel && (
            <div className="frist-row">
              <Clock style={{ color: 'var(--ink-3)', width: '16px', height: '16px' }} />
              <span>
                Frist: {fristTyp.charAt(0).toUpperCase() + fristTyp.slice(1)} bis {fristLabel}
              </span>
            </div>
          )}

          <section className="post-panel" aria-label={t3('bedeutung.title')}>
            <div className="post-panel-head">
              <Info aria-hidden="true" />
              <h3>{t3('bedeutung.title')}</h3>
            </div>
            <p>{bedeutung}</p>
          </section>

          <section className="post-panel" aria-label={t3('naechste_schritte.title')}>
            <div className="post-panel-head">
              <ListChecks aria-hidden="true" />
              <h3>{t3('naechste_schritte.title')}</h3>
            </div>
            <div className="post-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => onAntwortVorbereiten(e)}
              >
                <PenSquare />
                {t3('naechste_schritte.antwort')}
              </button>
              <Link
                href="/termine"
                className="btn btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                <Clock />
                {t3('naechste_schritte.frist_merken')}
              </Link>
              {hasNachzahlung && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled
                  aria-disabled="true"
                  title="In diesem Prototyp nicht hinterlegt"
                  style={{ opacity: 0.55, cursor: 'not-allowed' }}
                >
                  <Euro />
                  {t3('naechste_schritte.zahlung')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onVorgangErstellen}
              >
                <FolderInput />Vorgang erstellen
              </button>
            </div>
          </section>

          {!originaltextOpen ? (
            <div className="auszug">
              <button
                type="button"
                className="more"
                onClick={onOriginaltextToggle}
                style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
              >
                Mehr anzeigen <ChevronDown style={{ width: '12px', height: '12px' }} />
              </button>
              <div className="h">Auszug aus dem Originaltext</div>
              <div className="quote">„{bodyExcerpt || letter.body_de.slice(0, 220)}"</div>
            </div>
          ) : (
            <div style={{ marginTop: '18px' }}>
              <OriginaltextBlock body={letter.body_de} />
            </div>
          )}

          <Link href="/assistent" className="post-fragen" style={{ textDecoration: 'none' }}>
            <span className="icon-circle">
              <MessageCircleQuestion aria-hidden="true" />
            </span>
            <div className="post-fragen-body">
              <div className="t">{t3('fragen.title')}</div>
              <div className="s">{t3('fragen.sub')}</div>
            </div>
            <span className="post-fragen-cta">
              {t3('fragen.cta')}
              <ChevronRight aria-hidden="true" />
            </span>
          </Link>
        </>
      )}

      {docTab === 'anhaenge' && (
        <div className="post-doc-empty">
          <FileIcon aria-hidden="true" />
          <p>{t3('detail.anhaenge_empty')}</p>
        </div>
      )}

      {docTab === 'verlauf' && (
        <ol className="post-verlauf">
          <li>
            <span className="post-verlauf-dot" aria-hidden="true" />
            <span>{t3('detail.verlauf_empfangen_template', { datum: empfangenLabel })}</span>
          </li>
          <li>
            <span className="post-verlauf-dot" aria-hidden="true" />
            <span>{t3('detail.verlauf_verifiziert_template', { datum: empfangenLabel })}</span>
          </li>
        </ol>
      )}
    </div>
  );
}

/** Euro-Cent → lokalisierter „1.234,56 €"-String (de-DE). */
function formatBetragEuro(cent: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cent / 100);
}

function formatBetragErklaerung(
  letter: Letter,
  t3: ReturnType<typeof useTranslations>,
): string {
  if (typeof letter.betrag_cent !== 'number' || letter.betrag_cent <= 0) {
    return t3('erklaerer.betrag_keiner');
  }
  const betrag = formatBetragEuro(letter.betrag_cent);
  if (letter.betrag_richtung === 'erstattung') {
    return t3('erklaerer.betrag_erstattung_template', { betrag });
  }
  return t3('erklaerer.betrag_nachzahlung_template', { betrag });
}

function formatBedeutung(
  letter: Letter,
  tWas: ReturnType<typeof useTranslations>,
  t3: ReturnType<typeof useTranslations>,
): string {
  const hasFrist = (letter.fristen ?? []).some((f) => Boolean(f.datum));
  if (letter.betrag_richtung === 'nachzahlung') return tWas('hint_zahlung');
  if (hasFrist) return tWas('hint_frist');
  return t3('bedeutung.fallback');
}

/** Lädt den Brief-Originaltext als `.txt` herunter (client-only, kein Backend). */
function downloadLetterAsText(letter: Letter): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([letter.body_de], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${letter.aktenzeichen.replace(/[^\w.-]+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function AvatarSquare({ variant }: { variant: AvatarVariant }) {
  switch (variant) {
    case 'eagle':
      return (
        <span className="av eagle">
          <Landmark />
        </span>
      );
    case 'aok':
      return <span className="av aok">AOK</span>;
    case 'ard':
      return (
        <span className="av ard">ARD ZDF deutschland radio beitragsservice</span>
      );
    case 'lea':
      return <span className="av lea">LEA BERLIN</span>;
    case 'jc':
      return (
        <span className="av jc">
          <Briefcase />
        </span>
      );
    default:
      return <span className="av">··</span>;
  }
}

function avatarVariant(behoerdeId: string): AvatarVariant {
  if (behoerdeId.startsWith('finanzamt-')) return 'eagle';
  if (behoerdeId.startsWith('aok-')) return 'aok';
  if (behoerdeId.startsWith('ardzdf-') || behoerdeId.includes('beitragsservice'))
    return 'ard';
  if (
    behoerdeId.startsWith('lea-') ||
    behoerdeId.startsWith('landesamt-einwanderung') ||
    behoerdeId.includes('lea')
  )
    return 'lea';
  if (behoerdeId.startsWith('jobcenter-')) return 'jc';
  if (behoerdeId.startsWith('bundesdruckerei')) return 'eagle';
  if (behoerdeId.startsWith('familienkasse')) return 'jc';
  if (behoerdeId.startsWith('buergeramt-') || behoerdeId.startsWith('bezirksamt-'))
    return 'eagle';
  return 'default';
}

function archetypeText(letter: Letter): string {
  switch (letter.archetype) {
    case 'steuerbescheid':
      return 'Steuerbescheid';
    case 'krankenkasse-beitrag':
      return 'Abrechnung';
    case 'beitragsservice-mahnung':
      return 'Beitragsbescheid';
    case 'abh-verlaengerung':
      return 'Erinnerung';
    case 'familienkasse-nachweis':
      return 'Bewilligungsbescheid';
    case 'buergeramt-meldung':
      return 'Meldung';
    case 'ihk-beitrag':
      return 'Beitragsbescheid';
    case 'berufsgenossenschaft-beitrag':
      return 'Beitragsbescheid';
    case 'standesamt-urkunde':
      return 'Urkunde';
    case 'renteninfo':
      return 'Renteninformation';
    default:
      return 'Schreiben';
  }
}

function formatFristLabel(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatDDMMYYYY(d);
}

function formatEingangLabel(iso: string, nowIso: string): string {
  const days = differenceInCalendarDays(parseISO(nowIso), parseISO(iso));
  if (days <= 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return formatDDMMYYYY(parseISO(iso));
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}
