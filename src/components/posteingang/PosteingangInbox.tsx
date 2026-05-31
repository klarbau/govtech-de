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
  Euro,
  File as FileIcon,
  FileText,
  Filter,
  FolderInput,
  Landmark,
  MoreHorizontal,
  PenSquare,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/mock-backend';
import type { Behoerde, Letter, Vorgang } from '@/types';

import { NeuerVorgangAusBriefModal } from './NeuerVorgangAusBriefModal';
import { ReplySheet } from './ReplySheet';
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
  const [letters, setLetters] = React.useState<Letter[]>(initial.letters);
  const [behoerdenById, setBehoerdenById] = React.useState(initial.behoerdenById);
  const [hasLoaded, setHasLoaded] = React.useState(initial.letters.length > 0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [view, setView] = React.useState<'chronologisch' | 'vorgang'>('chronologisch');
  const [selectedLetterId, setSelectedLetterId] = React.useState<string | null>(
    initialSelectedLetterId ?? null,
  );
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterSelected, setFilterSelected] = React.useState<FilterKategorie[]>([]);

  const [replyLetter, setReplyLetter] = React.useState<Letter | null>(null);
  const [vorgangModalLetter, setVorgangModalLetter] = React.useState<Letter | null>(null);
  const [originalTextOpen, setOriginalTextOpen] = React.useState(false);

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
      } catch {
        // swallowed — UI shows an empty inbox.
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

  const grouped = React.useMemo(() => {
    const filtered = filteredLetters;

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
  }, [filteredLetters, nowIso]);

  const byVorgang = React.useMemo(() => {
    const groups = new Map<string, Letter[]>();
    const sonstige: Letter[] = [];
    for (const l of filteredLetters) {
      if (l.vorgang_id) {
        const bucket = groups.get(l.vorgang_id);
        if (bucket) bucket.push(l);
        else groups.set(l.vorgang_id, [l]);
      } else {
        sonstige.push(l);
      }
    }
    return { groups, sonstige };
  }, [filteredLetters]);

  const selectedLetter =
    letters.find((l) => l.id === selectedLetterId) ?? letters[0] ?? null;

  const selectedAbsender = selectedLetter
    ? behoerdenById[selectedLetter.absender_behoerde_id] ?? null
    : null;

  return (
    <>
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
            onAntwortVorbereiten={() => setReplyLetter(selectedLetter)}
            onEinspruch={() => setReplyLetter(selectedLetter)}
            onVorgangErstellen={() => setVorgangModalLetter(selectedLetter)}
            onOriginaltextToggle={() => setOriginalTextOpen((v) => !v)}
            originaltextOpen={originalTextOpen}
          />
        )}
      </div>

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

      {replyLetter && (
        <ReplySheet
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
        // Inline preview on ≥ lg: prevent navigation when modifier-less click,
        // so the right-pane detail updates without a full route change.
        if (
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
  onAntwortVorbereiten,
  onEinspruch,
  onVorgangErstellen,
  onOriginaltextToggle,
  originaltextOpen,
}: {
  letter: Letter;
  absender: Behoerde | null;
  onAntwortVorbereiten: () => void;
  onEinspruch: () => void;
  onVorgangErstellen: () => void;
  onOriginaltextToggle: () => void;
  originaltextOpen: boolean;
}) {
  const ai = letter.ai_summary?.post_open;
  const bullets = ai?.bullets?.slice(0, 3).map((b) => b.text) ?? [
    'Maßgeblich bleibt der Originaltext.',
    'Aktion innerhalb der genannten Frist möglich.',
    'Bei Rückfragen wenden Sie sich an die zuständige Behörde.',
  ];
  const headline =
    bullets[0] ??
    'Bitte den Originaltext prüfen.';
  const earliestFrist = (letter.fristen ?? [])
    .map((f) => f.datum)
    .sort()[0];
  const fristLabel = earliestFrist ? formatFristLabel(earliestFrist) : null;
  const fristTyp = letter.fristen?.[0]?.typ ?? 'Aktion';
  const bodyExcerpt = letter.body_de
    ? letter.body_de.split('\n').filter(Boolean).slice(2, 5).join(' ').slice(0, 280)
    : '';

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
            Verifiziert am {formatDDMMYYYY(parseISO(letter.empfangen_am))}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ height: '32px', width: '32px', padding: 0 }}
          aria-label="Weitere Optionen"
          disabled
          aria-disabled="true"
        >
          <MoreHorizontal />
        </button>
      </div>

      <h2>{letter.betreff}</h2>
      <div className="meta-row">
        <div>Aktenzeichen: {letter.aktenzeichen}</div>
        <div>
          Eingegangen: {formatDDMMYYYY(parseISO(letter.empfangen_am))}
        </div>
      </div>

      <div className="ai-card">
        <span className="icon-circle">
          <Sparkles />
        </span>
        <div>
          <div className="h">AI-Brief-Erklärer</div>
          <h4>{headline}</h4>
          <ul>
            {bullets.slice(1).map((b, i) => (
              <li key={i}>{b}</li>
            ))}
            {bullets.length <= 1 && (
              <li>Maßgeblich bleibt der Originaltext.</li>
            )}
          </ul>
        </div>
        <div className="illustration">
          <FileText />
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

      <div className="post-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAntwortVorbereiten}
        >
          <PenSquare />Antwort vorbereiten
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onVorgangErstellen}
        >
          <FolderInput />Vorgang erstellen
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOriginaltextToggle}
          aria-expanded={originaltextOpen}
        >
          <FileIcon />Originaltext anzeigen
        </button>
      </div>

      <div className="post-followups">
        <div className="lbl">Was kann ich tun?</div>
        <div className="chips">
          <button type="button" className="chip-btn" onClick={onEinspruch}>
            <Scale />Einspruch erklären
          </button>
          <button
            type="button"
            className="chip-btn"
            disabled
            aria-disabled="true"
            title="In diesem Prototyp nicht hinterlegt"
            style={{ opacity: 0.55, cursor: 'not-allowed' }}
          >
            <Euro />Zahlung prüfen
          </button>
          <Link
            href="/dokumente"
            className="chip-btn"
            style={{ textDecoration: 'none' }}
          >
            <FolderInput />Dokument ablegen
          </Link>
          <span style={{ flex: 1 }} />
          <ChevronRight aria-hidden="true" style={{ color: 'var(--ink-4)' }} />
        </div>
      </div>

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
    </div>
  );
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
