'use client';

import * as React from 'react';
import Link from 'next/link';
import { parseISO } from 'date-fns';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Home,
  IdCard,
  Landmark,
  Lock,
  Pencil,
  PiggyBank,
  PlusCircle,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type {
  Behoerde,
  Persona,
  Stammdaten,
  UebermittlungsLogEntry,
  WalletAttestation,
} from '@/types';

interface StammdatenViewProps {
  nowIso: string;
}

interface Loaded {
  persona: Persona;
  stammdaten: Stammdaten;
  log: UebermittlungsLogEntry[];
  wallet: WalletAttestation[];
  behoerdenById: Record<string, Behoerde>;
}

/**
 * `<StammdatenView>` — literal port of `docs/design-prototype-v2/stammdaten.html`.
 * Same DOM (`verify-chips`, `sd-grid`, `sd-card`, `kv-row`, `doc-row`,
 * `timeline-card`, `sd-foot`); data wired via `api.getProfile()` +
 * `api.getStammdaten()` + `api.getUebermittlungsLog()` + `api.getWalletAttestations()`.
 */
type AddFlow = { title: string; body: string };

/**
 * Shared Behörden-Hinweis: in this 2027-vision prototype, Stammdaten are a
 * read-only single source of truth. Changes don't happen here — they flow
 * through the responsible Behörde and sync back automatically.
 */
const BEHOERDEN_HINWEIS =
  'In dieser Demo sind Stammdaten ein read-only Single-Source-of-Truth: Änderungen nehmen Sie nicht hier vor, sondern bei der zuständigen Behörde – die aktualisierten Daten fließen anschließend automatisch in Ihr Profil zurück.';

export function StammdatenView(_props: StammdatenViewProps) {
  const [data, setData] = React.useState<Loaded | null>(null);
  const [addFlow, setAddFlow] = React.useState<AddFlow | null>(null);
  const [editFlow, setEditFlow] = React.useState<AddFlow | null>(null);
  const [protokollOpen, setProtokollOpen] = React.useState(false);
  const [fullLog, setFullLog] = React.useState<UebermittlungsLogEntry[] | null>(null);

  const personaId = data?.persona.id ?? null;

  const openProtokoll = React.useCallback(() => {
    setProtokollOpen(true);
    if (fullLog !== null || !personaId) return;
    void (async () => {
      try {
        const log = await api.getUebermittlungsLog(personaId, { limit: 50 });
        setFullLog(log);
      } catch {
        setFullLog([]);
      }
    })();
  }, [fullLog, personaId]);

  React.useEffect(() => {
    let cancelled = false;
    /* Mock-backend injects a 5% error per call; with 4 parallel calls a fresh
     * mount fails ~19% of the time. Retry the whole bundle up to 3× with a
     * short backoff so the demo doesn't get stuck on the loading state. */
    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const persona = await api.getProfile();
          const [stammdaten, log, wallet, behoerden] = await Promise.all([
            api.getStammdaten(persona.id),
            api.getUebermittlungsLog(persona.id, { limit: 5 }),
            api.getWalletAttestations(persona.id),
            api.getBehoerden(),
          ]);
          if (cancelled) return;
          const map: Record<string, Behoerde> = {};
          for (const b of behoerden) map[b.id] = b;
          setData({ persona, stammdaten, log, wallet, behoerdenById: map });
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <>
        <div className="gt-page-head">
          <h1>Stammdaten</h1>
          <div className="sub">Persönliche Daten, Kontakte und Nachweise an einem Ort.</div>
        </div>
        <div className="muted" style={{ marginTop: '12px' }}>Daten werden geladen …</div>
      </>
    );
  }

  const { persona, stammdaten, log, wallet } = data;
  const fullName = `${stammdaten.identitaet.vornamen} ${stammdaten.identitaet.familienname}`;
  const geburt = formatDDMMYYYY(parseISO(stammdaten.identitaet.geburtsdatum));
  const staatsangehoerigkeit = stammdaten.identitaet.staatsangehoerigkeit;
  const familienstand = stammdaten.familie.partner ? 'verheiratet' : 'ledig';
  const email =
    persona.kontakt?.bundid_email.value ?? stammdaten.kontakt.email ?? '—';
  const emailVerifiziert = Boolean(persona.kontakt?.bundid_email.verified);
  const mobil =
    persona.kontakt?.bundid_mobil?.value ?? stammdaten.kontakt.mobil ?? '—';
  const mobilVerifiziert = Boolean(persona.kontakt?.bundid_mobil?.verified);
  const anschrift = stammdaten.anschrift_aktuell;
  const reisepass = stammdaten.dokumente_refs.reisepass;
  const personalausweis = stammdaten.dokumente_refs.personalausweis;
  const aufenthalt = persona.aufenthaltstitel;
  const kk = persona.krankenversicherung;
  const kvnr =
    persona.kvnr_v1_1?.unveraenderbar ??
    persona.krankenversicherung?.versichertennummer;
  const kinder = stammdaten.familie.kinder;
  const aufenthaltGueltig =
    aufenthalt && parseISO(aufenthalt.valid_until).getTime() > Date.now();
  const walletVerbunden = wallet.length > 0;
  const anschriftBestaetigtIso = log.find((e) => e.sektion === 'anschrift')
    ?.timestamp;

  return (
    <>
      <div className="gt-page-head">
        <h1>Stammdaten</h1>
        <div className="sub">Persönliche Daten, Kontakte und Nachweise an einem Ort.</div>
        <div className="verify-chips" style={{ marginTop: '14px' }}>
          <span className="verify-chip">
            <CheckCircle2 />Adresse bestätigt
          </span>
          {walletVerbunden && (
            <span className="verify-chip">
              <CheckCircle2 />Wallet verbunden
            </span>
          )}
          {aufenthaltGueltig && (
            <span className="verify-chip">
              <CheckCircle2 />Aufenthalt gültig
            </span>
          )}
        </div>
      </div>

      <div className="sd-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="sd-card">
            <div className="sd-card-head">
              <div className="title">
                <User />Persönliches Profil
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setEditFlow({
                    title: 'Persönliches Profil ändern',
                    body: `Name, Geburtsdatum, Staatsangehörigkeit und Familienstand werden von der zuständigen Behörde (Standesamt bzw. Bürgeramt) geführt. ${BEHOERDEN_HINWEIS}`,
                  })
                }
              >
                <Pencil />Bearbeiten
              </button>
            </div>
            <div className="kv-row">
              <div className="k">Name</div>
              <div className="v">{fullName}</div>
            </div>
            <div className="kv-row">
              <div className="k">Geburtsdatum</div>
              <div className="v">{geburt}</div>
            </div>
            <div className="kv-row">
              <div className="k">Staatsangehörigkeit</div>
              <div className="v">{capitalize(staatsangehoerigkeit)}</div>
            </div>
            <div className="kv-row">
              <div className="k">Familienstand</div>
              <div className="v">{familienstand}</div>
            </div>
          </div>

          <div className="sd-card">
            <div className="sd-card-head">
              <div className="title">
                <User />Kontakt
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setEditFlow({
                    title: 'Kontaktdaten ändern',
                    body: `E-Mail und Telefonnummer werden zentral über Ihr DeutschlandID-Konto verwaltet und nach jeder Änderung neu verifiziert. ${BEHOERDEN_HINWEIS}`,
                  })
                }
              >
                <Pencil />Bearbeiten
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
              }}
            >
              <div>
                <div className="muted text-xs">E-Mail</div>
                <div className="fw-500">{email}</div>
              </div>
              {emailVerifiziert && (
                <span className="badge green">
                  <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                  Verifiziert
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div>
                <div className="muted text-xs">Telefonnummer</div>
                <div className="fw-500">{mobil}</div>
              </div>
              {mobilVerifiziert && (
                <span className="badge green">
                  <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                  Verifiziert
                </span>
              )}
            </div>
          </div>

          <div className="sd-card">
            <div className="sd-card-head">
              <div className="title">
                <Users />Familie &amp; Bezugspersonen
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setEditFlow({
                    title: 'Familie & Bezugspersonen ändern',
                    body: `Familienstand und Bezugspersonen ergeben sich aus den beim Standesamt geführten Personenstandsdaten. ${BEHOERDEN_HINWEIS}`,
                  })
                }
              >
                <Pencil />Bearbeiten
              </button>
            </div>
            <div className="muted text-xs" style={{ marginBottom: '8px' }}>
              Kinder
            </div>
            {kinder.length === 0 ? (
              <div className="muted text-sm" style={{ padding: '10px 0' }}>
                Keine Kinder hinterlegt.
              </div>
            ) : (
              kinder.map((kind) => (
                <div
                  key={`${kind.vorname}-${kind.geburtsdatum}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 0',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span className="avatar green">{initials(kind.vorname, kind.nachname)}</span>
                  <div className="grow">
                    <div className="fw-600">{kind.vorname} {kind.nachname}</div>
                    <div className="muted text-xs">
                      Geburtsdatum &nbsp; {formatDDMMYYYY(parseISO(kind.geburtsdatum))}
                    </div>
                  </div>
                  <div className="text-sm muted">
                    Verwandtschaft
                    <br />
                    <span style={{ color: 'var(--ink)' }} className="fw-500">Kind</span>
                  </div>
                  <ChevronRight style={{ color: 'var(--ink-4)' }} />
                </div>
              ))
            )}
            <button
              type="button"
              className="add-link"
              style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
              onClick={() =>
                setAddFlow({
                  title: 'Weitere Person hinzufügen',
                  body: 'Das Hinterlegen weiterer Bezugspersonen (Kinder, betreute Personen) ist eine 2027-Vision dieser Demo. In der echten App würde hier ein geführter Dialog mit DeutschlandID-Verknüpfung und Nachweis-Upload starten.',
                })
              }
            >
              <PlusCircle />Weitere Person hinzufügen
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="sd-card">
            <div className="sd-card-head">
              <div className="title">
                <Home />Anschrift
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setEditFlow({
                    title: 'Anschrift ändern',
                    body: `Ihre Meldeanschrift wird vom Bürgeramt im Melderegister geführt. Eine Adressänderung erfolgt über die Ummeldung – in dieser Demo als Umzug-Autopilot abgebildet. ${BEHOERDEN_HINWEIS}`,
                  })
                }
              >
                <Pencil />Ändern
              </button>
            </div>
            <div className="muted text-xs">Aktuelle Anschrift</div>
            <div
              style={{
                marginTop: '4px',
                fontWeight: 500,
                lineHeight: 1.55,
              }}
            >
              {anschrift.strasse} {anschrift.hausnummer}
              <br />
              {anschrift.plz} {anschrift.ort}
              <br />
              Deutschland
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border)',
                marginTop: '14px',
                paddingTop: '12px',
              }}
            >
              <span className="muted text-xs">
                zuletzt bestätigt am{' '}
                {anschriftBestaetigtIso
                  ? formatDDMMYYYY(parseISO(anschriftBestaetigtIso))
                  : '22.03.2026'}
              </span>
              <span className="badge green">Bestätigt</span>
            </div>
          </div>

          <div className="sd-card">
            <div className="sd-card-head">
              <div className="title">
                <IdCard />Identitätsdokumente
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setEditFlow({
                    title: 'Identitätsdokumente verwalten',
                    body: `Reisepass, Personalausweis und Aufenthaltstitel werden von der ausstellenden Behörde geführt. Neuausstellung oder Verlängerung erfolgt dort. ${BEHOERDEN_HINWEIS}`,
                  })
                }
              >
                <Settings />Verwalten
              </button>
            </div>
            {reisepass && (
              <div className="doc-row">
                <span className="icon-square">
                  <Globe />
                </span>
                <div className="body">
                  <div className="t">Reisepass</div>
                  <div className="s">
                    Nummer {reisepass.nummer} · Gültig bis{' '}
                    {formatDDMMYYYY(parseISO(reisepass.gueltig_bis))}
                  </div>
                </div>
                <span className="badge green">Gültig</span>
              </div>
            )}
            {personalausweis && (
              <div className="doc-row">
                <span className="icon-square">
                  <IdCard />
                </span>
                <div className="body">
                  <div className="t">Personalausweis</div>
                  <div className="s">
                    Nummer {personalausweis.nummer} · Gültig bis{' '}
                    {formatDDMMYYYY(parseISO(personalausweis.gueltig_bis))}
                  </div>
                </div>
                <span className="badge green">Gültig</span>
              </div>
            )}
            {aufenthalt && (
              <div className="doc-row">
                <span className="icon-square">
                  <IdCard />
                </span>
                <div className="body">
                  <div className="t">Aufenthaltstitel</div>
                  <div className="s">
                    {aufenthalt.norm} · Gültig bis{' '}
                    {formatDDMMYYYY(parseISO(aufenthalt.valid_until))}
                  </div>
                </div>
                <span className="badge green">Gültig</span>
              </div>
            )}
            <Link className="add-link" href="/dokumente">
              <PlusCircle />Dokument hinzufügen
            </Link>
          </div>

          <div className="sd-card">
            <div className="sd-card-head">
              <div className="title">
                <Shield />Versicherung &amp; Vorsorge
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setEditFlow({
                    title: 'Versicherung & Vorsorge ändern',
                    body: `Krankenkasse und Rentenversicherung werden von den jeweiligen Trägern geführt. Ein Kassenwechsel oder eine Statusänderung wird dort beantragt. ${BEHOERDEN_HINWEIS}`,
                  })
                }
              >
                <Pencil />Bearbeiten
              </button>
            </div>
            {kk && (
              <div className="doc-row">
                <span
                  className="avatar green"
                  style={{ width: '36px', height: '36px', fontSize: '11px' }}
                >
                  {kk.traeger.slice(0, 3).toUpperCase()}
                </span>
                <div className="body">
                  <div className="t">Krankenkasse</div>
                  <div className="s">
                    {kk.traeger}
                    {kvnr ? ` · Versichertennummer ${kvnr}` : ''}
                  </div>
                </div>
                <span className="badge green">Aktiv</span>
              </div>
            )}
            {persona.rentenversicherungsnummer && (
              <div className="doc-row">
                <span className="icon-square">
                  <PiggyBank />
                </span>
                <div className="body">
                  <div className="t">Altersvorsorge</div>
                  <div className="s">
                    Gesetzliche Rentenversicherung · Nr. {persona.rentenversicherungsnummer}
                  </div>
                </div>
                <span className="badge green">Aktiv</span>
              </div>
            )}
            <button
              type="button"
              className="add-link"
              style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
              onClick={() =>
                setAddFlow({
                  title: 'Weitere Vorsorge hinzufügen',
                  body: 'Das Verknüpfen weiterer Vorsorge- und Versicherungsverhältnisse (private Altersvorsorge, Zusatzversicherungen) ist eine 2027-Vision dieser Demo. In der echten App würde hier ein Anbieter-Abgleich über die EUDI-Wallet starten.',
                })
              }
            >
              <PlusCircle />Weitere Vorsorge hinzufügen
            </button>
          </div>
        </div>

        <div className="sd-card timeline-card">
          <div className="sd-card-head">
            <div className="title">
              <Clock />Änderungsprotokoll
            </div>
          </div>
          <div className="muted text-xs" style={{ marginBottom: '12px' }}>
            Letzte Änderungen an Ihren Stammdaten
          </div>
          {log.slice(0, 6).map((entry) => {
            const variant = timelineAvatarVariant(entry.absender_behoerde_id ?? '');
            const cls = variant === 'ard' ? 'item ard' : variant === 'aok' ? 'item aok' : 'item';
            const ts = parseISO(entry.timestamp);
            return (
              <div key={entry.id} className={cls}>
                <span className="av">{timelineAvatarContent(variant)}</span>
                <div>
                  <div className="t">{timelineTitle(entry)}</div>
                  <div className="s">
                    {behoerdenName(entry, data.behoerdenById)}
                    {entry.note ? `\n${entry.note}` : ''}
                  </div>
                </div>
                <div className="when">
                  {formatDDMMYYYY(ts)}
                  <br />
                  {formatHHMM(ts)} Uhr
                </div>
              </div>
            );
          })}
          {log.length === 0 && (
            <div className="muted text-sm" style={{ padding: '14px 0' }}>
              Keine Änderungen in den letzten 30 Tagen.
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '16px', width: '100%' }}
            onClick={openProtokoll}
          >
            <FileText />Vollständiges Protokoll anzeigen
          </button>
        </div>
      </div>

      <div className="sd-foot">
        <span className="icon-circle">
          <Shield />
        </span>
        <div className="body">
          <div className="t">Sie haben die Hoheit über Ihre Daten</div>
          <div className="s">
            Ihre Stammdaten werden nur mit Ihrer Zustimmung an Behörden und Dienste weitergegeben.
            Sie entscheiden, wer welche Informationen einsehen darf.{' '}
            <Link href="/datenschutz">Mehr zu Ihren Rechten und zur Datenverwendung.</Link>
          </div>
        </div>
        <Link href="/datenschutz" className="btn btn-secondary">
          <Lock />Datennutzung verwalten
        </Link>
      </div>

      <Dialog
        open={addFlow !== null}
        onOpenChange={(open) => {
          if (!open) setAddFlow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addFlow?.title ?? ''}</DialogTitle>
            <DialogDescription>{addFlow?.body ?? ''}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">[MOCK] — Demo-Funktion, demnächst verfügbar.</p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddFlow(null)}
            >
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editFlow !== null}
        onOpenChange={(open) => {
          if (!open) setEditFlow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFlow?.title ?? ''}</DialogTitle>
            <DialogDescription>{editFlow?.body ?? ''}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            [MOCK] — Geführte Behörden-Änderung in Vorbereitung.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditFlow(null)}
            >
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={protokollOpen} onOpenChange={setProtokollOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vollständiges Änderungsprotokoll</DialogTitle>
            <DialogDescription>
              Alle Änderungen und Übermittlungen Ihrer Stammdaten.
            </DialogDescription>
          </DialogHeader>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {fullLog === null ? (
              <p className="muted text-sm" style={{ padding: '14px 0' }}>
                Wird geladen …
              </p>
            ) : fullLog.length === 0 ? (
              <p className="muted text-sm" style={{ padding: '14px 0' }}>
                Keine Änderungen vorhanden.
              </p>
            ) : (
              fullLog.map((entry) => {
                const ts = parseISO(entry.timestamp);
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 0',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div className="fw-600">{timelineTitle(entry)}</div>
                      <div className="muted text-xs">
                        {behoerdenName(entry, data.behoerdenById)}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </div>
                    </div>
                    <div className="muted text-xs" style={{ whiteSpace: 'nowrap' }}>
                      {formatDDMMYYYY(ts)}
                      <br />
                      {formatHHMM(ts)} Uhr
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProtokollOpen(false)}
            >
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function initials(vorname: string, nachname: string): string {
  return `${vorname.charAt(0)}${nachname.charAt(0)}`.toUpperCase();
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function formatHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function timelineAvatarVariant(
  behoerdeId: string,
): 'default' | 'ard' | 'aok' | 'eagle' {
  if (behoerdeId.startsWith('ardzdf-') || behoerdeId.includes('beitragsservice'))
    return 'ard';
  if (behoerdeId.startsWith('aok-')) return 'aok';
  if (
    behoerdeId.startsWith('buergeramt-') ||
    behoerdeId.startsWith('bezirksamt-') ||
    behoerdeId.startsWith('finanzamt-')
  )
    return 'eagle';
  return 'default';
}

function timelineAvatarContent(
  variant: 'default' | 'ard' | 'aok' | 'eagle',
): React.ReactNode {
  if (variant === 'ard')
    return (
      <>
        ARD
        <br />
        ZDF
      </>
    );
  if (variant === 'aok') return 'AOK';
  if (variant === 'eagle') return <Landmark />;
  return <User />;
}

function timelineTitle(entry: UebermittlungsLogEntry): string {
  if (entry.zweck_i18n_key.includes('adresse')) return 'Adresse bestätigt';
  if (entry.zweck_i18n_key.includes('kontakt') || entry.zweck_i18n_key.includes('email'))
    return 'E-Mail-Adresse geändert';
  if (entry.zweck_i18n_key.includes('mobil') || entry.zweck_i18n_key.includes('telefon'))
    return 'Telefonnummer bestätigt';
  if (entry.zweck_i18n_key.includes('rundfunk') || entry.zweck_i18n_key.includes('beitragsservice'))
    return 'Rundfunkbeitrag aktualisiert';
  if (entry.zweck_i18n_key.includes('krankenkasse') || entry.zweck_i18n_key.includes('kv'))
    return 'Krankenkasse bestätigt';
  return 'Stammdaten aktualisiert';
}

function behoerdenName(
  entry: UebermittlungsLogEntry,
  behoerdenById: Record<string, Behoerde>,
): string {
  const id = entry.absender_behoerde_id ?? '';
  if (!id) return 'Über die GovTech DE App';
  return behoerdenById[id]?.name_de ?? id;
}
