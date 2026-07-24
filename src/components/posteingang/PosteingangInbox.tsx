'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  Archive,
  ArrowLeft,
  Bookmark,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Download,
  Euro,
  File as FileIcon,
  Filter,
  Folder,
  FolderInput,
  Forward,
  Info,
  Inbox,
  Landmark,
  Languages,
  Link2,
  ListChecks,
  Mail,
  Menu,
  MessageCircleQuestion,
  MoreHorizontal,
  PenSquare,
  Printer,
  Reply,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { api, MockBackendError } from '@/lib/mock-backend';
import { usePosteingangSearch } from '@/components/posteingang/posteingang-search-store';
import { useMockEvents } from '@/components/providers/LiveBackendProvider';
import { bridgeTargetForArchetype } from '@/lib/mock-backend/brief-bridge';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { Skeleton, SkeletonText } from '@/components/shared/Skeleton';
import { isLocale, type Locale } from '@/i18n/routing';
import type {
  Behoerde,
  BehoerdeKategorie,
  Letter,
  LetterAnhang,
  LetterFrist,
  LetterFristTyp,
  Vorgang,
} from '@/types';

import { deriveErklaererSlots } from './erklaerer-slots';
import { ErkannteAufgabePanel } from './ErkannteAufgabePanel';
import { ErklaererBulletList } from './ErklaererBulletList';
import { ErklaererLangToggle } from './ErklaererLangToggle';
import { LeichteSpracheReveal } from './LeichteSpracheReveal';
import { TranslationDisclaimerBadge } from './TranslationDisclaimerBadge';
import { seededLangsFor, useErklaererLang } from './use-erklaerer-lang';
import { downloadIcs } from './download-ics';
import { NeuerVorgangAusBriefModal } from './NeuerVorgangAusBriefModal';
import { ReplyInlinePanel } from './ReplyInlinePanel';
import { ReplyModalSheet } from './ReplyModalSheet';
import { OriginaltextBlock, type OriginaltextBlockHandle } from './OriginaltextBlock';
import { VorgangsGruppe, SonstigeGruppe } from './VorgangsGruppe';
import { FilterSheet } from './FilterSheet';
import {
  FILTER_KATEGORIEN,
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
/** Posteingang (alle offenen Briefe) vs. Archiv (status === 'erledigt'). */
type Mailbox = 'posteingang' | 'archiv';

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

/** Datenmodell-Kategorie → UI-Filter-Bucket (Inverse von `filterKategorieToInternal`). */
function internalToFilterKategorie(k: BehoerdeKategorie): FilterKategorie {
  switch (k) {
    case 'bund':
      return 'bund';
    case 'land':
      return 'land';
    case 'kommune':
      return 'kommunal';
    case 'sozialversicherung':
    case 'privat':
      return 'sonstige';
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
  const tNav = useTranslations('nav');
  const router = useRouter();
  const [letters, setLetters] = React.useState<Letter[]>(initial.letters);
  const [behoerdenById, setBehoerdenById] = React.useState(initial.behoerdenById);
  const [hasLoaded, setHasLoaded] = React.useState(initial.letters.length > 0);
  // Distinguishes „erster Refresh noch unterwegs" von „Posteingang ist leer":
  // flippt erst, wenn der initiale Refresh abgeschlossen ist (Erfolg ODER Fehler).
  const [loaded, setLoaded] = React.useState(initial.letters.length > 0);
  const searchQuery = usePosteingangSearch((s) => s.query);
  const setSearchQuery = usePosteingangSearch((s) => s.setQuery);
  const [statusTab, setStatusTab] = React.useState<StatusTab>('alle');
  const [mailbox, setMailbox] = React.useState<Mailbox>('posteingang');
  const [view, setView] = React.useState<'chronologisch' | 'vorgang'>('chronologisch');
  const [selectedLetterId, setSelectedLetterId] = React.useState<string | null>(
    initialSelectedLetterId ?? null,
  );
  // Reader-Sichtbarkeit: „Zurück"/✕ klappt den Brief ZU (Liste breitet sich
  // über die volle Breite aus); der nächste Karten-Klick öffnet ihn wieder.
  // Zwei Zustände für die Choreografie: `readerOpen` steuert den Mount (und
  // damit die framer-Exit-Animation), `listExpanded` flippt die Breiten-Klasse
  // erst NACH abgeschlossenem Exit (AnimatePresence onExitComplete) — sonst
  // würde die wachsende Liste den noch ausfahrenden Reader zerquetschen.
  const [readerOpen, setReaderOpen] = React.useState(true);
  const [listExpanded, setListExpanded] = React.useState(false);
  const openLetter = React.useCallback((id: string) => {
    setSelectedLetterId(id);
    setReaderOpen(true);
    setListExpanded(false);
  }, []);
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
  // Der Gutter folgt dem Öffnen-Lebenszyklus (nicht `replyLetter`), damit er
  // beim Schließen synchron zur Drawer-Exit-Animation einklappt statt erst,
  // wenn `replyLetter` nach `onClosed` geleert wird.
  const replyGutterOpen = inlineReplyOpen && inlineBreakpoint;

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

  // Beat 2 — Briefe kommen sichtbar live an. Nur NACH Mount per Event
  // eingetroffene Briefe tragen ~3 s die sanfte Frisch-Tönung (via `freshIds`);
  // der initiale Bestand bleibt ruhig.
  const [freshIds, setFreshIds] = React.useState<Set<string>>(() => new Set());
  const freshTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const markFresh = React.useCallback((id: string) => {
    setFreshIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const existing = freshTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setFreshIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      freshTimersRef.current.delete(id);
    }, 3000);
    freshTimersRef.current.set(id, timer);
  }, []);

  React.useEffect(() => {
    const timers = freshTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  useMockEvents((event) => {
    if (event.type === 'letter_received') {
      setLetters((prev) => {
        const idx = prev.findIndex((l) => l.id === event.letter.id);
        if (idx === -1) {
          markFresh(event.letter.id);
          return [event.letter, ...prev];
        }
        const next = [...prev];
        next[idx] = event.letter;
        return next;
      });
    }
    if (event.type === 'letter_status_changed') {
      setLetters((prev) =>
        prev.map((l) =>
          l.id === event.letterId ? { ...l, status: event.status } : l,
        ),
      );
    }
  });

  // Mailbox-Scope: Posteingang = alle nicht-erledigten Briefe, Archiv =
  // ausschließlich Briefe mit status === 'erledigt' (es gibt kein Folder-Modell;
  // „Archiv" ist die einzige echte zweite Mailbox, vgl. LetterStatus-Union).
  const mailboxLetters = React.useMemo(
    () =>
      letters.filter((l) =>
        mailbox === 'archiv'
          ? l.status === 'erledigt'
          : l.status !== 'erledigt',
      ),
    [letters, mailbox],
  );

  const mailboxCounts = React.useMemo(
    () => ({
      posteingang: letters.filter((l) => l.status !== 'erledigt').length,
      archiv: letters.filter((l) => l.status === 'erledigt').length,
    }),
    [letters],
  );

  // Ordner = echte Behörden-Kategorie-Buckets der aktuellen Mailbox, mit
  // realer Anzahl (keine erfundenen Entwürfe/Gesendet/Papierkorb-Zähler).
  const folders = React.useMemo(() => {
    const counts = new Map<FilterKategorie, number>();
    for (const l of mailboxLetters) {
      const behoerde = behoerdenById[l.absender_behoerde_id];
      if (!behoerde) continue;
      const key = internalToFilterKategorie(behoerde.kategorie);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return FILTER_KATEGORIEN.filter((k) => (counts.get(k) ?? 0) > 0).map(
      (k) => ({ kategorie: k, count: counts.get(k) ?? 0 }),
    );
  }, [mailboxLetters, behoerdenById]);

  const filteredLetters = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeKategorien = new Set(
      filterSelected.flatMap((k) => filterKategorieToInternal(k)),
    );
    return mailboxLetters.filter((l) => {
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
  }, [mailboxLetters, behoerdenById, searchQuery, filterSelected]);

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
    letters.find((l) => l.id === selectedLetterId) ??
    tabFilteredLetters[0] ??
    letters[0] ??
    null;

  const selectedAbsender = selectedLetter
    ? behoerdenById[selectedLetter.absender_behoerde_id] ?? null
    : null;

  if (!loaded) {
    return <PosteingangInboxSkeleton loadingLabel={tCommon('loading')} />;
  }

  return (
    <>
      <div className={replyGutterOpen ? 'post-content post-content--reply-open' : 'post-content'}>
      <div className="post-shell">
        <div className="post-main">
      {/* < 1280px ist die Brief-Route die Detail-Ansicht (Master→Detail über
          die URL): auf /posteingang/[id] zeigt `--mobile-reader` NUR den
          Reader, /posteingang nur die Liste. ≥ 1280px hat die Klasse keine
          Wirkung (Zwei-Spalten-Inline-Modell unverändert). */}
      <div
        className={[
          listExpanded || !selectedLetter ? 'post-layout post-layout--list-only' : 'post-layout',
          initialSelectedLetterId && readerOpen && selectedLetter
            ? 'post-layout--mobile-reader'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
      {/* Archive-faithful list COLUMN: header (menu · title + unread count ·
          filter), tabs and the scrolling card stream live inside the fixed
          396px column, so the reader panel rises to full height beside it.
          Mailbox/folder controls stay in the FilterSheet (filter button). */}
      <div className="lg-list-col">
      <div className="lg-list-head">
        <button
          type="button"
          className="lg-round-btn"
          aria-label={t('search.view_aria')}
          title={t('search.view_aria')}
          onClick={() => setView((v) => (v === 'chronologisch' ? 'vorgang' : 'chronologisch'))}
          aria-pressed={view === 'vorgang'}
        >
          <Menu aria-hidden="true" />
        </button>
        <div className="lg-list-title">
          <h1>{tNav('posteingang')}</h1>
          <p className="lg-list-sub">
            <span className="tabular-nums">{tabCounts.ungelesen}</span> {t3('tabs.ungelesen').toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          className="lg-square-btn"
          aria-label={t('filter.aria_label')}
          title={t('filter.aria_label')}
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal aria-hidden="true" />
          {filterSelected.length > 0 && (
            <span className="lg-filter-dot" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="lg-list-search input-icon">
        <Search aria-hidden="true" />
        <input
          className="input"
          placeholder={t('search.placeholder')}
          aria-label={t('search.aria_label')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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

      <div className="lg-list-scroll">
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
                  fresh={freshIds.has(l.id)}
                  onSelect={() => openLetter(l.id)}
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
                  fresh={freshIds.has(l.id)}
                  onSelect={() => openLetter(l.id)}
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
                  fresh={freshIds.has(l.id)}
                  onSelect={() => openLetter(l.id)}
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
      </div>
      </div>

        {/* Schließen in zwei Takten: erst gleitet der Reader raus (Exit, bleibt
            dabei im Flex-Fluss → Liste bleibt ruhig), dann flippt
            onExitComplete die Breiten-Klasse und die Liste wächst per CSS-
            Transition in den freien Raum. Öffnen läuft parallel (Liste
            schrumpft, Reader faded ein). */}
        <AnimatePresence initial={false} onExitComplete={() => setListExpanded(true)}>
          {readerOpen && selectedLetter && (
            <PostDetail
              key="reader"
              letter={selectedLetter}
              absender={selectedAbsender}
              nowIso={nowIso}
              onAntwortVorbereiten={(e) => openReply(selectedLetter, e)}
              onVorgangErstellen={() => setVorgangModalLetter(selectedLetter)}
              onOriginaltextToggle={() => setOriginalTextOpen((v) => !v)}
              originaltextOpen={originalTextOpen}
              onClose={() => {
                // < 1280px auf der Brief-Route: „Zurück" führt zur Liste
                // (eigene URL je Ansicht, Browser-Back bleibt konsistent).
                if (
                  initialSelectedLetterId &&
                  !window.matchMedia('(min-width: 1280px)').matches
                ) {
                  router.push('/posteingang');
                  return;
                }
                setReaderOpen(false);
              }}
            />
          )}
        </AnimatePresence>

      </div>
        </div>
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

// ── PostRail ────────────────────────────────────────────────────────────────

interface FolderEntry {
  kategorie: FilterKategorie;
  count: number;
}

function PostRail({
  mailbox,
  onMailboxChange,
  mailboxCounts,
  folders,
  activeFolders,
  onToggleFolder,
  onlyUnread,
  onOnlyUnreadChange,
  onOpenFilter,
  activeFilterCount,
}: {
  mailbox: Mailbox;
  onMailboxChange: (next: Mailbox) => void;
  mailboxCounts: { posteingang: number; archiv: number };
  folders: FolderEntry[];
  activeFolders: FilterKategorie[];
  onToggleFolder: (k: FilterKategorie) => void;
  onlyUnread: boolean;
  onOnlyUnreadChange: (next: boolean) => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}) {
  const t = useTranslations('posteingang.rail');
  const tKat = useTranslations('posteingang.filter.kategorie');

  return (
    <nav className="post-rail" aria-label={t('nav_aria')}>
      <div className="post-rail-head">
        <span className="ico" aria-hidden="true">
          <Mail />
        </span>
        <div>
          <h1>{t('title')}</h1>
          <p className="sub">{t('subtitle')}</p>
        </div>
      </div>

      <Link
        href="/assistent"
        className="btn btn-primary post-rail-write"
        aria-label={t('write_aria')}
        style={{ textDecoration: 'none' }}
      >
        <PenSquare />
        {t('write')}
      </Link>

      <div className="post-rail-group" role="group" aria-label={t('system_label')}>
        <div className="grp-label">{t('system_label')}</div>
        <button
          type="button"
          className={`post-rail-link${mailbox === 'posteingang' ? ' active' : ''}`}
          aria-current={mailbox === 'posteingang' ? 'page' : undefined}
          onClick={() => onMailboxChange('posteingang')}
        >
          <Inbox aria-hidden="true" />
          <span className="name">{t('posteingang')}</span>
          <span className="cnt">{mailboxCounts.posteingang}</span>
        </button>
        <button
          type="button"
          className={`post-rail-link${mailbox === 'archiv' ? ' active' : ''}`}
          aria-current={mailbox === 'archiv' ? 'page' : undefined}
          onClick={() => onMailboxChange('archiv')}
        >
          <Archive aria-hidden="true" />
          <span className="name">{t('archiv')}</span>
          <span className="cnt">{mailboxCounts.archiv}</span>
        </button>
      </div>

      <div className="post-rail-group" role="group" aria-label={t('ordner_label')}>
        <div className="grp-label">{t('ordner_label')}</div>
        {folders.length === 0 ? (
          <p className="grp-label" style={{ textTransform: 'none', fontWeight: 400 }}>
            {t('ordner_empty')}
          </p>
        ) : (
          folders.map((f) => {
            const active = activeFolders.includes(f.kategorie);
            return (
              <button
                key={f.kategorie}
                type="button"
                className={`post-rail-link${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => onToggleFolder(f.kategorie)}
              >
                <Folder aria-hidden="true" />
                <span className="name">{tKat(f.kategorie)}</span>
                <span className="cnt">{f.count}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="post-rail-group">
        <div className="grp-label">{t('filter_label')}</div>
        <label className="post-rail-link" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => onOnlyUnreadChange(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--brand-600)' }}
          />
          <span className="name">{t('nur_ungelesen')}</span>
        </label>
        <button
          type="button"
          className="post-rail-link"
          onClick={onOpenFilter}
          aria-haspopup="dialog"
        >
          <Filter aria-hidden="true" />
          <span className="name">{t('filter_open')}</span>
          {activeFilterCount > 0 && (
            <span className="cnt">{activeFilterCount}</span>
          )}
        </button>
      </div>
    </nav>
  );
}

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
  fresh = false,
  onSelect,
}: {
  letter: Letter;
  behoerde: Behoerde | undefined;
  active: boolean;
  nowIso: string;
  section: SectionKey;
  /** Beat 2: nach Mount live eingetroffen → ~3 s sanfte Frisch-Tönung + Einschub. */
  fresh?: boolean;
  onSelect: () => void;
}) {
  const tBadge = useTranslations('posteingang');
  const tCard = useTranslations('posteingang.card');
  const t3 = useTranslations('posteingang.mockup3');
  const variant = avatarVariant(letter.absender_behoerde_id);
  const earliestFrist = (letter.fristen ?? [])
    .map((f) => f.datum)
    .sort()[0];
  const hasFrist = Boolean(earliestFrist);
  const eingangLabel = formatEingangLabel(letter.empfangen_am, nowIso);
  const behoerdeName = behoerde?.name_de ?? letter.betreff;
  const kategorieLabel = t3(
    `detail.kategorie.${behoerde?.kategorie ?? 'unbekannt'}` as 'detail.kategorie.bund',
  );
  const isUnread = letter.status === 'ungelesen';

  // Mehrsprachiger Brief-Erklärer (Spec §4.1) — dezenter Affordance-Hinweis:
  // nur wenn UI-Locale ≠ de UND dieser Brief für genau diese Locale geseedet ist.
  const uiLocaleRaw = useLocale();
  const uiLocale: Locale = isLocale(uiLocaleRaw) ? uiLocaleRaw : 'de';
  const showSpracheHint =
    uiLocale !== 'de' &&
    (seededLangsFor(letter.ai_summary) as readonly string[]).includes(uiLocale);

  return (
    <Link
      href={`/posteingang/${letter.id}`}
      data-section={section}
      className={`post-item${active ? ' active' : ''}${fresh ? ' lw-fresh' : ''}`}
      onClick={(e) => {
        // Inline preview on ≥ lg: prevent navigation on a modifier-less POINTER
        // click, so the right-pane detail updates without a full route change.
        // Keyboard activation (Enter) fires a synthetic click with `detail === 0`
        // — for those we let the real navigation happen, so keyboard users reach
        // the letter route (and deep-linking / back works). WCAG 2.1.1.
        if (
          e.detail !== 0 &&
          typeof window !== 'undefined' &&
          window.matchMedia('(min-width: 1280px)').matches &&
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
      <div className="lg-card-body">
        <div className="lg-card-top">
          <span className="lg-card-name">{behoerdeName}</span>
          <span className="lg-card-time tabular-nums">{eingangLabel}</span>
        </div>
        <div className="lg-card-subject">
          <span className="lg-card-subject-text">{betreffOhneAz(letter)}</span>
          {isUnread && (
            <span
              className="lg-unread-dot"
              role="img"
              aria-label={t3('tabs.ungelesen')}
            />
          )}
        </div>
        <div className="lg-card-chips">
          {hasFrist && (
            <span className="lg-chip lg-chip--frist">{t3('tabs.mit_frist')}</span>
          )}
          {behoerde && <span className="lg-chip">{kategorieLabel}</span>}
          {letter.vorgang_id && (
            <span
              data-testid="post-item-linked-badge"
              className="lg-chip lg-chip--linked"
            >
              <Link2 aria-hidden="true" />
              {tBadge('linkedBadge')}
            </span>
          )}
          {showSpracheHint && (
            <span data-testid="post-item-sprache-hint" className="lg-chip">
              <Languages aria-hidden="true" />
              <span className="sr-only">{tCard('in_ihrer_sprache_hint')}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── PostDetail ──────────────────────────────────────────────────────────────

type ReaderPage = 'brief' | 'verstehen' | 'handeln';

function PostDetail({
  letter,
  absender,
  nowIso,
  onAntwortVorbereiten,
  onVorgangErstellen,
  onOriginaltextToggle,
  originaltextOpen,
  onClose,
}: {
  letter: Letter;
  absender: Behoerde | null;
  nowIso: string;
  onAntwortVorbereiten: (e: React.SyntheticEvent) => void;
  onVorgangErstellen: () => void;
  onOriginaltextToggle: () => void;
  originaltextOpen: boolean;
  onClose: () => void;
}) {
  const t3 = useTranslations('posteingang.mockup3');
  const tWas = useTranslations('posteingang.was_kann_ich_tun');
  const tPost = useTranslations('posteingang');
  const tErkl = useTranslations('posteingang.erklaerer');
  const tCommon = useTranslations('common');
  // prefers-reduced-motion: Slide-Offsets kollabieren auf reine Opacity-Fades.
  const reduceMotion = useReducedMotion();
  // Brief-Spread: horizontale Seiten „Brief · Verstehen · Handeln" statt der
  // vertikalen Tab-Stapel. `page` folgt dem Pager UND dem Swipe (bidirektional).
  const [page, setPage] = React.useState<ReaderPage>('brief');
  // Bei Briefwechsel: zurück auf die „Brief"-Seite.
  React.useEffect(() => {
    setPage('brief');
  }, [letter.id]);

  const pagesRef = React.useRef<HTMLDivElement>(null);
  const briefPageRef = React.useRef<HTMLDivElement>(null);
  const verstehenPageRef = React.useRef<HTMLDivElement>(null);
  const handelnPageRef = React.useRef<HTMLDivElement>(null);

  // Kanten-Maske: an der Seite, hinter der weitere Seiten liegen, blendet eine
  // Maske den harten Textschnitt aus. 'l'/'r' sind VISUELLE Seiten — für AR-RTL
  // über die computed direction normalisiert (Blink/Gecko: scrollLeft -max..0).
  const [edgeFade, setEdgeFade] = React.useState<'none' | 'l' | 'r' | 'lr'>('none');
  const updateEdgeFade = React.useCallback(() => {
    const el = pagesRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 8) {
      setEdgeFade('none');
      return;
    }
    const rtl = getComputedStyle(el).direction === 'rtl';
    const x = el.scrollLeft;
    const l = x > (rtl ? -max : 0) + 8;
    const r = x < (rtl ? 0 : max) - 8;
    setEdgeFade(l && r ? 'lr' : l ? 'l' : r ? 'r' : 'none');
  }, []);
  React.useEffect(() => {
    updateEdgeFade();
  }, [letter.id, updateEdgeFade]);
  React.useEffect(() => {
    window.addEventListener('resize', updateEdgeFade);
    return () => window.removeEventListener('resize', updateEdgeFade);
  }, [updateEdgeFade]);

  // Pager-Klick pinnt die Zielseite: auf dem Zwei-Seiten-Spread sind mehrere
  // Seiten gleichzeitig VOLL sichtbar — der Observer darf die explizite Wahl
  // nicht mit „erste gewinnt" überschreiben, solange die Zielseite sichtbar ist.
  const pinnedPageRef = React.useRef<ReaderPage | null>(null);

  // Pager-Klick: State setzen UND die Polosa zur Seite scrollen. Bei
  // prefers-reduced-motion ohne Smooth-Scroll (§2.2).
  const goToPage = React.useCallback(
    (target: ReaderPage) => {
      pinnedPageRef.current = target;
      setPage(target);
      const ref =
        target === 'brief'
          ? briefPageRef
          : target === 'verstehen'
            ? verstehenPageRef
            : handelnPageRef;
      const reduce =
        reduceMotion ||
        document.documentElement.classList.contains('a11y-reduce-motion');
      ref.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    },
    [reduceMotion],
  );

  // Aktiv-Zustand beim Swipen/Scrollen nachziehen: der Observer setzt NUR den
  // State, scrollt nie selbst (kein Re-Snap-Loop). Neu attachen bei Briefwechsel,
  // da die Polosa via key=letter.id remountet.
  React.useEffect(() => {
    const root = pagesRef.current;
    if (!root) return;
    pinnedPageRef.current = null;
    // Ratio-Stand ALLER Seiten (der Observer liefert nur Deltas): daraus die
    // erste Seite in Lesereihenfolge ≥0.6 als aktiven Pager-Zustand ableiten —
    // entspricht „visuell führend" in LTR wie RTL. Der Observer setzt NUR den
    // State, scrollt nie selbst (kein Re-Snap-Loop).
    const ratios: Partial<Record<ReaderPage, number>> = {};
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios[e.target.getAttribute('data-page') as ReaderPage] =
            e.intersectionRatio;
        }
        // Explizit gewählte Seite bleibt aktiv, solange sie sichtbar ist
        // (Spread: zwei Seiten voll sichtbar); erst beim Wegscrollen entpinnen.
        const pinned = pinnedPageRef.current;
        if (pinned && (ratios[pinned] ?? 0) >= 0.6) return;
        pinnedPageRef.current = null;
        const lead = (['brief', 'verstehen', 'handeln'] as const).find(
          (p) => (ratios[p] ?? 0) >= 0.6,
        );
        if (lead) setPage(lead);
      },
      { root, threshold: 0.6 },
    );
    for (const el of root.querySelectorAll<HTMLElement>('[data-page]')) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [letter.id]);

  // „Der Brief, der handelt" — Bridge-Ziel + Originaltext-Handle (scrollToZitat).
  const bridge = bridgeTargetForArchetype(letter.archetype);
  const originalRef = React.useRef<OriginaltextBlockHandle>(null);
  const [pendingZitat, setPendingZitat] = React.useState<string | null>(null);

  // „Im Original prüfen": ist der Originaltext zugeklappt, erst aufklappen, dann
  // nach Mount zum Zitat scrollen + hervorheben (RAF nach dem State-Flip).
  const handleScrollToZitat = React.useCallback(
    (zitat: string) => {
      // „Im Original prüfen" wohnt auf der „Brief"-Seite — erst dorthin
      // navigieren, dann aufklappen + zum Zitat scrollen (§2.1).
      goToPage('brief');
      if (originaltextOpen) {
        originalRef.current?.scrollToZitat(zitat);
      } else {
        setPendingZitat(zitat);
        onOriginaltextToggle();
      }
    },
    [originaltextOpen, onOriginaltextToggle, goToPage],
  );

  React.useEffect(() => {
    if (!originaltextOpen || !pendingZitat) return;
    const zitat = pendingZitat;
    const raf = requestAnimationFrame(() => {
      originalRef.current?.scrollToZitat(zitat);
      setPendingZitat(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [originaltextOpen, pendingZitat]);

  const handleAddToCalendar = React.useCallback(
    (frist: LetterFrist) => {
      // Defense-in-depth: das Panel verdrahtet diesen Handler strukturell nur im
      // `citation_match=true`-Zweig, aber wir verweigern den ICS-Export hier noch
      // einmal explizit, wenn die Frist nicht eindeutig belegt ist.
      if (frist.citation_match === false) {
        toast.error(tPost('erkannteAufgabe.calendar_disabled_a11y'));
        return;
      }
      downloadIcs(letter, frist);
      void api.protokolliereLetterAktivitaet(letter.id, 'frist_added_to_calendar');
    },
    [letter, tPost],
  );

  // Footer-CTA „Als erledigt markieren" — Status-Flip via Mock-Backend; die
  // Liste aktualisiert sich über das `letter_status_changed`-Event (Subscription
  // im Inbox-Root). Rein App-interner Ablage-Status, keine Behörden-Wirkung.
  const [erledigtBusy, setErledigtBusy] = React.useState(false);
  const handleErledigt = React.useCallback(async () => {
    setErledigtBusy(true);
    try {
      await api.markiereLetterErledigt(letter.id);
      toast.success(t3('detail.erledigt_toast'));
    } catch {
      toast.error(t3('detail.erledigt_fehler'));
    } finally {
      setErledigtBusy(false);
    }
  }, [letter.id, t3]);

  // KI-Erklärer-Zusammenfassung lazy laden (§6.2): 28/29 Seed-Briefe tragen ihre
  // hand-geprüften `post_open`-Bullets NUR in der Summaries-Map, nicht direkt am
  // Brief. Trägt der Prop-Brief bereits `post_open`, kein Fetch; sonst
  // `extrahiereAktion` → Re-Fetch (`getLetter`, hängt auch `translations` an) in
  // lokalen `loadedLetter`, der die Prop für Erklärer/Bedeutung überschreibt.
  // `SUMMARY_NOT_FOUND` (statische umzug2026-Bestätigungen, Laufzeit-Eingangs-
  // bestätigungen) → still degradieren auf abgeleitete Antworten, kein Fehler-UI.
  const hasPostOpen = Boolean(letter.ai_summary?.post_open);
  const [loadedLetter, setLoadedLetter] = React.useState<Letter | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState(false);
  const [summaryRetry, setSummaryRetry] = React.useState(0);
  React.useEffect(() => {
    setLoadedLetter(null);
    setSummaryError(false);
    if (hasPostOpen) {
      setSummaryLoading(false);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    void api
      .extrahiereAktion(letter.id)
      .then(() => api.getLetter(letter.id))
      .then((fresh) => {
        if (!cancelled) setLoadedLetter(fresh);
      })
      .catch((err) => {
        if (cancelled) return;
        // Kein Seed → keine authored Zusammenfassung, still degradieren.
        if (
          err instanceof MockBackendError &&
          err.code === 'SUMMARY_NOT_FOUND'
        ) {
          return;
        }
        setSummaryError(true);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [letter.id, hasPostOpen, summaryRetry]);

  // Frisch geladener Brief überschreibt die Prop für Erklärer/Bedeutung; der Rest
  // von PostDetail (Fristen, Betrag, Auszug) wartet NICHT auf diesen Fetch.
  // id-Guard: die Instanz überlebt Briefwechsel (statisches key="reader"), der
  // Reset in den Effect läuft erst nach dem Paint — ohne Guard wäre für einen
  // Frame die Summary des vorigen Briefs sichtbar.
  const effectiveLetter =
    loadedLetter?.id === letter.id ? loadedLetter : letter;

  // Mehrsprachiger Brief-Erklärer (Spec §4.2): locale-bewusste Bullet-Auswahl.
  // Die brief-lokale Sprachwahl folgt initial der UI-Locale (sofern geseedet),
  // ändert sie aber NICHT. `activeSummary` = übersetzte `post_open` ODER DE-Fallback.
  const dePostOpen = effectiveLetter.ai_summary?.post_open;
  const {
    activeLang,
    setActiveLang,
    options,
    activeSummary,
    isTranslated,
    isFallbackDe,
  } = useErklaererLang(effectiveLetter.ai_summary, dePostOpen);

  const ai = activeSummary;
  // „Worum geht es?" — Fallback-Kette: übersetzter/DE-Bullet[0] → strukturelle
  // Pre-Open-Zeile → Betreff. Nie ein generischer „bitte Original prüfen"-Füller.
  const worum =
    ai?.bullets?.[0]?.text ??
    effectiveLetter.ai_summary?.pre_open?.text ??
    effectiveLetter.betreff;

  // Fakten-Slots des Erklärers — brief-spezifisch (Betrag / Frist / Handeln)
  // statt starrer Zahlungs-Archetyp. Summary-unabhängig, wartet nicht auf Fetch.
  const factSlots = deriveErklaererSlots(letter);

  const earliestFrist = (letter.fristen ?? [])
    .map((f) => f.datum)
    .sort()[0];
  const fristLabel = earliestFrist ? formatFristLabel(earliestFrist) : null;
  // „(in N Tagen)"-Zusatz wie im Mockup — nur für zukünftige Fristen.
  const fristTage = earliestFrist
    ? differenceInCalendarDays(parseISO(earliestFrist), parseISO(nowIso))
    : null;
  const fristRelativ =
    fristTage !== null && fristTage >= 0
      ? t3('detail.frist_relativ_template', { tage: fristTage })
      : null;
  const fristTyp = letter.fristen?.[0]?.typ ?? 'Aktion';
  // Mockup-Auszug: ab der Grußzeile drei Absätze als normaler Brieftext
  // (statt Letterhead-Schnipsel in Anführungszeichen).
  const bodyLines = letter.body_de
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const greetIdx = bodyLines.findIndex((l) =>
    /^(sehr geehrte|guten tag|hallo)/i.test(l),
  );
  const excerptStart = greetIdx >= 0 ? greetIdx : Math.min(2, bodyLines.length - 1);
  const excerptAbsaetze = bodyLines.slice(excerptStart, excerptStart + 3);
  const anhaenge = letter.anhaenge ?? [];

  const bedeutung = formatBedeutung(letter, tWas, t3);
  // „Was bedeutet das" — Bullets ab Index 1 (Bullet 0 ist die „Worum"-Kurzfassung
  // oben im KI-Erklärer). Bei übersetzter Ansicht rendert `ErklaererBulletList`
  // diese Bullets locale-bewusst inkl. unübersetztem deutschem `original_zitat`,
  // `lang`/`dir`/`<bdi>` und [MOCK]-Watermark. Für die DE-Ansicht bleibt die
  // bestehende `.post-bullets`-Darstellung.
  const bedeutungSummary =
    ai && ai.bullets.length > 1
      ? {
          ...ai,
          bullets: ai.bullets.slice(1),
          // Citations auf den neuen 0-basierten Index der gesliceten Bullets mappen.
          citations: ai.citations
            .filter((c) => c.bullet_index >= 1)
            .map((c) => ({ ...c, bullet_index: c.bullet_index - 1 })),
        }
      : undefined;
  const bedeutungBullets = (ai?.bullets ?? [])
    .slice(1, 5)
    .map((b) => b.text)
    .filter((text) => text.trim().length > 0);
  const hasNachzahlung = letter.betrag_richtung === 'nachzahlung';

  const empfangenDate = parseISO(letter.empfangen_am);
  const empfangenLabel = formatDDMMYYYY(empfangenDate);
  // Mockup: Eingegangen-Zelle trägt auch die Uhrzeit („04.07.2026, 10:24").
  const empfangenMitZeit = `${empfangenLabel}, ${String(empfangenDate.getHours()).padStart(2, '0')}:${String(empfangenDate.getMinutes()).padStart(2, '0')}`;
  const kategorieLabel = absender
    ? t3(`detail.kategorie.${absender.kategorie}` as 'detail.kategorie.bund')
    : t3('detail.kategorie.unbekannt');

  return (
    <motion.div
      className="post-detail"
      initial={{ opacity: 0, x: reduceMotion ? 0 : 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduceMotion ? 0 : 32 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Archive reader toolbar: Zurück · Antworten · Herunterladen · Drucken ·
          Mehr … runder Schließen-Button. Icon-über-Label wie im Mockup; nur
          real verdrahtete Aktionen (kein totes „Weiterleiten"). */}
      <div className="lg-reader-toolbar">
        <button type="button" className="lg-tool" onClick={onClose}>
          <ArrowLeft aria-hidden="true" />
          <span>{t3('detail.zurueck')}</span>
        </button>
        <span className="lg-tool-divider" aria-hidden="true" />
        {/* Mockup: die Werkzeug-Gruppe spannt sich bis max. 560px auf
            (space-between); Weiterleiten/Mehr sind im Prototyp nicht
            hinterlegt → sichtbar deaktiviert statt tot verdrahtet. */}
        <div className="lg-tool-group">
          <button
            type="button"
            className="lg-tool"
            onClick={(e) => onAntwortVorbereiten(e)}
          >
            <Reply aria-hidden="true" />
            <span>{t3('detail.antworten')}</span>
          </button>
          <button
            type="button"
            className="lg-tool"
            disabled
            aria-disabled="true"
            title={t3('detail.nicht_verfuegbar')}
          >
            <Forward aria-hidden="true" />
            <span>{t3('detail.weiterleiten')}</span>
          </button>
          <button
            type="button"
            className="lg-tool"
            onClick={() => downloadLetterAsText(letter)}
          >
            <Download aria-hidden="true" />
            <span>{t3('detail.herunterladen')}</span>
          </button>
          <button
            type="button"
            className="lg-tool"
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
          >
            <Printer aria-hidden="true" />
            <span>{t3('detail.drucken')}</span>
          </button>
          <button
            type="button"
            className="lg-tool"
            disabled
            aria-disabled="true"
            title={t3('detail.nicht_verfuegbar')}
          >
            <MoreHorizontal aria-hidden="true" />
            <span>{t3('detail.mehr')}</span>
          </button>
        </div>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="lg-reader-close"
          aria-label={t3('detail.schliessen')}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {/* Kompakte Brief-Identität (§2.3): gepinnt über dem Pager, ein Textband
          statt 54px-Avatar + Adresse + 4-Zellen-Grid. Adresse steht im
          Originaltext. */}
      <div className="lg-reader-idbar">
        <div className="lg-idbar-line">
          <span className="av">
            <Landmark />
          </span>
          <span className="lg-idbar-who">{absender?.name_de ?? 'Behörde'}</span>
          <span className="verify lg-idbar-verify">
            <ShieldCheck aria-hidden="true" />
            {t3('detail.verifiziert')}
          </span>
          {letter.vorgang_id && (
            <span
              data-testid="post-detail-linked-badge"
              className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 align-middle text-[11px] font-medium text-muted-foreground"
            >
              <Link2 className="size-3" aria-hidden="true" />
              {tPost('linkedBadge')}
            </span>
          )}
        </div>
        <h2 className="lg-idbar-betreff">
          {betreffOhneAz(letter)}
          <span className="lg-reader-az tabular-nums"> · {letter.aktenzeichen}</span>
        </h2>
        <p className="lg-reader-metaline">
          <span>
            <span className="k">{t3('detail.meta_eingegangen')}</span>{' '}
            <span className="tabular-nums">{empfangenMitZeit}</span>
          </span>
          <span className="sep" aria-hidden="true">·</span>
          <span>
            <span className="k">{t3('detail.meta_kategorie')}</span> {kategorieLabel}
          </span>
          <span className="sep" aria-hidden="true">·</span>
          <span className={fristLabel ? 'has-frist' : undefined}>
            {fristLabel ? (
              <>
                <span className="k">{t3('detail.meta_frist')}</span> {fristLabel}
                {fristRelativ && (
                  <span className="lg-frist-relativ"> {fristRelativ}</span>
                )}
              </>
            ) : (
              // Ohne k-Label: „Frist Keine Frist" läse doppelt.
              t3('detail.meta_frist_keine')
            )}
          </span>
          <span className="sep" aria-hidden="true">·</span>
          <span className={letter.status === 'ungelesen' ? 'lg-status-neu' : undefined}>
            <span className="k">{t3('detail.meta_status')}</span>{' '}
            {t3(`detail.status_${letter.status}` as 'detail.status_ungelesen')}
          </span>
        </p>
      </div>

      {/* Pager aus .post-doc-tabs: Brief · Verstehen · Handeln. Kein
          role=tablist — alle Seiten leben gleichzeitig im A11y-Tree (§4);
          aria-current markiert die aktive Pille, der Anhänge-Zähler wandert auf
          „Brief". */}
      <div
        className="post-doc-tabs lg-reader-pager"
        role="group"
        aria-label={t3('detail.pager_aria')}
      >
        <button
          type="button"
          aria-current={page === 'brief' ? 'true' : undefined}
          className={`post-doc-tab${page === 'brief' ? ' active' : ''}`}
          onClick={() => goToPage('brief')}
        >
          {t3('detail.page_brief')}
          {anhaenge.length > 0 && (
            <span className="count tabular-nums">{anhaenge.length}</span>
          )}
        </button>
        <button
          type="button"
          aria-current={page === 'verstehen' ? 'true' : undefined}
          className={`post-doc-tab${page === 'verstehen' ? ' active' : ''}`}
          onClick={() => goToPage('verstehen')}
        >
          {t3('detail.page_verstehen')}
        </button>
        <button
          type="button"
          aria-current={page === 'handeln' ? 'true' : undefined}
          className={`post-doc-tab${page === 'handeln' ? ' active' : ''}`}
          onClick={() => goToPage('handeln')}
        >
          {t3('detail.page_handeln')}
        </button>
      </div>

      {/* Horizontale Scroll-Snap-Polosa (§2.2): 3 Seiten, jede vertikal
          scrollbar. Remount key=letter.id setzt beide Achsen zurück + Fade wie
          bisher. */}
      <motion.div
        key={letter.id}
        ref={pagesRef}
        className="lg-reader-pages"
        role="region"
        aria-label={t3('detail.pages_aria')}
        tabIndex={0}
        data-fade={edgeFade === 'none' ? undefined : edgeFade}
        onScroll={updateEdgeFade}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
      >
        {/* Seite „Brief": Auszug/Originaltext → Anhänge → Verlauf. */}
        <div className="lg-reader-page" data-page="brief" ref={briefPageRef}>
          {/* Der Brief öffnet zuerst als BRIEF — Textauszug-Card mit „Mehr
              anzeigen"; Anhänge + Verlauf folgen darunter. */}
          {!originaltextOpen ? (
            <div className="auszug">
              {excerptAbsaetze.map((absatz, i) => (
                <p key={i} className="lg-auszug-p">
                  {absatz}
                </p>
              ))}
              <div className="lg-auszug-foot">
                <button
                  type="button"
                  className="more"
                  onClick={onOriginaltextToggle}
                  style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                >
                  Mehr anzeigen <ChevronDown style={{ width: '12px', height: '12px' }} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '18px' }}>
              <OriginaltextBlock ref={originalRef} body={letter.body_de} />
            </div>
          )}

          {anhaenge.length > 0 && (
            <div className="lg-docs-card">
              <div className="lg-docs-title">{t3('detail.dokumente_title')}</div>
              <div className="lg-docs-rows">
                {anhaenge.map((anhang) => (
                  <AnhangRow
                    key={anhang.name}
                    anhang={anhang}
                    downloadLabel={t3('detail.herunterladen')}
                    metaLabel={t3('detail.anhang_meta_template', {
                      typ: anhangTyp(anhang),
                      kb: anhang.size_kb,
                    })}
                  />
                ))}
              </div>
            </div>
          )}

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
        </div>

        {/* Seite „Verstehen": Leichte Sprache → KI-Erklärer → Bedeutung. */}
        <div className="lg-reader-page" data-page="verstehen" ref={verstehenPageRef}>
          {/* Leichte-Sprache-Erläuterung (Spec §4.1): opt-in, der Originaltext
              auf der „Brief"-Seite bleibt führend. */}
          <div className="lg-ls-reveal">
            <LeichteSpracheReveal letter={letter} />
          </div>

          <div className="ai-card">
            <span className="icon-circle">
              <Sparkles />
            </span>
            <div className="ai-card-body">
              <div className="ai-card-top">
                <div className="h">{t3('erklaerer.title')}</div>
                <span className="flex items-center gap-2">
                  <ErklaererLangToggle
                    activeLang={activeLang}
                    options={options}
                    onChange={setActiveLang}
                  />
                  <span className="ai-pill">
                    <Sparkles aria-hidden="true" />
                    {t3('erklaerer.pill')}
                  </span>
                </span>
              </div>
              <p className="ai-intro">{t3('erklaerer.intro')}</p>
              {isFallbackDe && (
                <p
                  role="status"
                  className="mt-2 text-xs leading-relaxed text-muted-foreground"
                >
                  {tErkl('fallback_de_note')}
                </p>
              )}
              {isTranslated && activeLang !== 'de' && (
                <div className="mt-3">
                  <TranslationDisclaimerBadge activeLang={activeLang} />
                </div>
              )}
              {summaryLoading ? (
                <div role="status" aria-busy="true" className="mt-1">
                  <span className="sr-only">{tCommon('loading')}</span>
                  <SkeletonText lines={3} />
                </div>
              ) : (
                <div className="ai-blocks">
                  <div className="ai-block">
                    <div className="ai-block-q">
                      <Info aria-hidden="true" />
                      {t3('erklaerer.worum_label')}
                    </div>
                    <p
                      className="ai-block-a"
                      lang={isTranslated ? activeLang : undefined}
                      dir={isTranslated && activeLang === 'ar' ? 'rtl' : undefined}
                    >
                      {worum}
                    </p>
                  </div>
                  {factSlots.map((slot) => {
                    if (slot.kind === 'betrag') {
                      const betrag = formatBetragEuro(slot.betrag_cent);
                      const answer =
                        slot.richtung === 'erstattung'
                          ? t3('erklaerer.betrag_erstattung_template', { betrag })
                          : t3('erklaerer.betrag_nachzahlung_template', { betrag });
                      return (
                        <div className="ai-block" key="betrag">
                          <div className="ai-block-q">
                            <Euro aria-hidden="true" />
                            {t3('erklaerer.betrag_label')}
                          </div>
                          <p className="ai-block-a">{answer}</p>
                        </div>
                      );
                    }
                    if (slot.kind === 'frist') {
                      return (
                        <div className="ai-block" key="frist">
                          <div className="ai-block-q">
                            <Clock aria-hidden="true" />
                            {t3(
                              ERKLAERER_FRIST_FRAGE[slot.typ] as 'erklaerer.bis_wann_label',
                            )}
                          </div>
                          <p className="ai-block-a">
                            {t3('erklaerer.bis_wann_template', {
                              datum: formatFristLabel(slot.datum),
                            })}
                          </p>
                        </div>
                      );
                    }
                    const answer =
                      slot.antwort === 'cta'
                        ? t3('erklaerer.handeln_ja_template', { cta: slot.cta ?? '' })
                        : slot.antwort === 'bestaetigung'
                          ? t3('erklaerer.handeln_bestaetigung')
                          : t3('erklaerer.handeln_information');
                    return (
                      <div className="ai-block" key="handeln">
                        <div className="ai-block-q">
                          <ClipboardCheck aria-hidden="true" />
                          {t3('erklaerer.handeln_label')}
                        </div>
                        <p className="ai-block-a">{answer}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {summaryError && (
                <p
                  role="status"
                  className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground"
                >
                  {tPost('reader.summary_error')}
                  <button
                    type="button"
                    className="font-medium text-primary underline underline-offset-2 focus-visible:outline-solid"
                    onClick={() => setSummaryRetry((n) => n + 1)}
                  >
                    {tPost('reader.summary_error_retry')}
                  </button>
                </p>
              )}
              <div className="ai-foot">
                <p className="ai-disclaimer">{t3('erklaerer.disclaimer')}</p>
                <button
                  type="button"
                  className="ai-feedback"
                  aria-label={t3('erklaerer.feedback_aria')}
                  onClick={() => toast(t3('erklaerer.feedback_toast'))}
                >
                  <ThumbsUp aria-hidden="true" />
                  {t3('erklaerer.feedback')}
                </button>
              </div>
            </div>
          </div>

          <section className="post-panel" aria-label={t3('bedeutung.title')}>
            <div className="post-panel-head">
              <Info aria-hidden="true" />
              <h3>{t3('bedeutung.title')}</h3>
            </div>
            {isTranslated && bedeutungSummary ? (
              // Übersetzte Ansicht: locale-bewusste Bullets mit unübersetztem
              // deutschem `original_zitat` (CitationFootnote), lang/dir/<bdi> für
              // ar-RTL und [MOCK]-Watermark (Spec §4.2.3 / §4.2.4).
              <ErklaererBulletList
                summary={bedeutungSummary}
                activeLang={activeLang}
                isTranslated={isTranslated}
                onShowInOriginal={(c) => handleScrollToZitat(c.original_zitat)}
                className="post-bullets-erklaerer"
              />
            ) : bedeutungBullets.length > 1 ? (
              <ul className="post-bullets">
                {bedeutungBullets.map((text, i) => (
                  <li key={i}>
                    <Check aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{bedeutung}</p>
            )}
          </section>
        </div>

        {/* Seite „Handeln": Erkannte Aufgabe → Frist → Nächste Schritte →
            Fragen. */}
        <div className="lg-reader-page" data-page="handeln" ref={handelnPageRef}>
          <ErkannteAufgabePanel
            letter={letter}
            bridge={bridge}
            fristen={letter.fristen ?? []}
            provenanceLabel={archetypeText(letter)}
            onScrollToZitat={handleScrollToZitat}
            onAddToCalendar={handleAddToCalendar}
            embedded
            variant="post-panel"
          />

          {fristLabel && (
            <div className="frist-row">
              <Clock style={{ color: 'var(--ink-3)', width: '16px', height: '16px' }} />
              <span>
                Frist: {fristTyp.charAt(0).toUpperCase() + fristTyp.slice(1)} bis{' '}
              </span>
              <span className="frist-pill">{fristLabel}</span>
            </div>
          )}

          <section className="post-panel" aria-label={t3('naechste_schritte.title')}>
            <div className="post-panel-head">
              <ListChecks aria-hidden="true" />
              <h3>{t3('naechste_schritte.title')}</h3>
            </div>
            <div className="step-rows">
              <div className="step-row">
                <Check className="step-tick" aria-hidden="true" />
                <div className="step-text">
                  <div className="lbl">{t3('naechste_schritte.antwort')}</div>
                  <div className="sub">{t3('naechste_schritte.antwort_sub')}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(e) => onAntwortVorbereiten(e)}
                >
                  <PenSquare />
                  {t3('naechste_schritte.antwort')}
                </button>
              </div>

              <div className="step-row">
                <Check className="step-tick" aria-hidden="true" />
                <div className="step-text">
                  <div className="lbl">{t3('naechste_schritte.frist_merken')}</div>
                  <div className="sub">{t3('naechste_schritte.frist_merken_sub')}</div>
                </div>
                <Link
                  href="/termine"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <Clock />
                  {t3('naechste_schritte.frist_merken')}
                </Link>
              </div>

              {hasNachzahlung && (
                <div className="step-row">
                  <Check className="step-tick" aria-hidden="true" />
                  <div className="step-text">
                    <div className="lbl">{t3('naechste_schritte.zahlung')}</div>
                    <div className="sub">{t3('naechste_schritte.zahlung_sub')}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled
                    aria-disabled="true"
                    title="In diesem Prototyp nicht hinterlegt"
                    style={{ opacity: 0.55, cursor: 'not-allowed' }}
                  >
                    <Euro />
                    {t3('naechste_schritte.zahlung')}
                  </button>
                </div>
              )}

              <div className="step-row">
                <Check className="step-tick" aria-hidden="true" />
                <div className="step-text">
                  <div className="lbl">{t3('naechste_schritte.vorgang')}</div>
                  <div className="sub">{t3('naechste_schritte.vorgang_sub')}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onVorgangErstellen}
                >
                  <FolderInput />
                  {t3('naechste_schritte.vorgang')}
                </button>
              </div>
            </div>
          </section>

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
        </div>
      </motion.div>

      {/* Archive footer CTAs — unten am Glas-Panel gepinnt: irisierendes
          „Als erledigt markieren" + Glas-„In Vorgang überführen". */}
      <div className="lg-reader-cta">
        <button
          type="button"
          className="btn btn-primary lg-cta-main"
          onClick={handleErledigt}
          disabled={letter.status === 'erledigt' || erledigtBusy}
          aria-disabled={letter.status === 'erledigt' || erledigtBusy}
        >
          <Check aria-hidden="true" />
          {letter.status === 'erledigt'
            ? t3('detail.status_erledigt')
            : t3('detail.erledigt_markieren')}
        </button>
        <button
          type="button"
          className="btn btn-secondary lg-cta-secondary"
          onClick={onVorgangErstellen}
        >
          {t3('detail.in_vorgang')}
        </button>
        <button
          type="button"
          className="lg-cta-bookmark"
          aria-label={t3('detail.merken')}
          title={t3('detail.nicht_verfuegbar')}
          disabled
          aria-disabled="true"
        >
          <Bookmark aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Betreff ohne redundantes Aktenzeichen-Suffix — das Mockup zeigt das AZ als
 * eigene Zeile unter dem Titel, viele Seed-Betreffs führen es aber am Ende.
 */
function betreffOhneAz(letter: Letter): string {
  const azRaw = letter.aktenzeichen.replace(/^\[MOCK\]\s*/, '');
  let betreff = letter.betreff;
  if (azRaw && betreff.endsWith(azRaw)) {
    betreff = betreff.slice(0, -azRaw.length).trimEnd();
  }
  // Rest-Floskel „— Aktenzeichen [MOCK]" ohne die Nummer dahinter: seit das AZ
  // inline hinter dem Betreff steht, läse sie doppelt.
  return betreff.replace(/[—–-]?\s*Aktenzeichen\s*(\[MOCK\])?$/, '').trimEnd();
}

/** Datei-Typ-Label aus dem Anhang-Namen („PDF" aus „….pdf"). */
function anhangTyp(anhang: LetterAnhang): string {
  return anhang.name.split('.').pop()?.toUpperCase() ?? 'DATEI';
}

/** [MOCK]-Anhang: lädt einen Text-Stub statt einer echten PDF herunter. */
function downloadAnhangStub(anhang: LetterAnhang): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob(
    [`[MOCK] Demo-Anhang — kein echter Inhalt.\n${anhang.name} (${anhang.size_kb} KB)\n`],
    { type: 'text/plain;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${anhang.name}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Dokument-Zeile der „Wichtige Dokumente"-Card / des Anhänge-Tabs. */
function AnhangRow({
  anhang,
  downloadLabel,
  metaLabel,
}: {
  anhang: LetterAnhang;
  downloadLabel: string;
  metaLabel: string;
}) {
  return (
    <div className="lg-doc-row">
      <span className="lg-doc-icon" aria-hidden="true">
        <FileIcon />
      </span>
      <div className="lg-doc-body">
        <div className="lg-doc-name">{anhang.name}</div>
        <div className="lg-doc-meta tabular-nums">{metaLabel}</div>
      </div>
      <button
        type="button"
        className="lg-doc-action"
        aria-label={`${downloadLabel}: ${anhang.name}`}
        onClick={() => downloadAnhangStub(anhang)}
      >
        <Download aria-hidden="true" />
      </button>
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

/**
 * Erklärer-Frage je Fristtyp — die „Bis wann …?"-Frage folgt dem Fristtyp, damit
 * eine Einspruchs-/Nachweis-Frist nie unter der Zahlungs-Frage steht (Rechts-
 * Ehrlichkeit). `zahlung` teilt die bestehende `bis_wann_label`-Frage.
 */
const ERKLAERER_FRIST_FRAGE: Record<LetterFristTyp, string> = {
  zahlung: 'erklaerer.bis_wann_label',
  einspruch: 'erklaerer.frist_einspruch_label',
  widerspruch: 'erklaerer.frist_widerspruch_label',
  klage: 'erklaerer.frist_klage_label',
  nachweis: 'erklaerer.frist_nachweis_label',
  antragstellung: 'erklaerer.frist_antragstellung_label',
  sonstige: 'erklaerer.frist_sonstige_label',
};

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
      // Legible short monogram instead of the full name crammed into the
      // circle; inline style overrides the `.av.ard` cramming (9px/padding).
      return (
        <span className="av ard" style={{ fontSize: '12px', padding: 0, lineHeight: 1 }}>
          ARD
        </span>
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
