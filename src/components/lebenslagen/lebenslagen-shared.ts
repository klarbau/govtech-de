import {
  Award,
  Baby,
  BadgeEuro,
  BookMarked,
  Building2,
  CalendarClock,
  Car,
  Euro,
  FileCheck,
  FileText,
  Globe,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  IdCard,
  Landmark,
  PiggyBank,
  ScrollText,
  Send,
  Shield,
  Tv,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { format, parseISO } from 'date-fns';

import type {
  CascadeStepConfig,
  LebenslageConfig,
} from '@/lib/mock-backend/lebenslagen/types';
import type {
  AutopilotStep,
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  BlockTyp,
  Vorgang,
} from '@/types';

/** Block-Rang für die Kaskaden-Reihenfolge A → D → B (C wird gefiltert). */
export const BLOCK_RANK: Record<BlockTyp, number> = { A: 0, D: 1, B: 2, C: 99 };

/** Drei Anzeige-Zustände eines Kaskaden-Knotens. */
export type NodeState = 'done' | 'current' | 'pending';

/**
 * Projiziert den Autopilot-Schritt-Status auf den Knoten-Anzeigezustand.
 * Bewusst ein erschöpfender `switch` mit `never`-Default: ein künftig neu
 * hinzugefügter `AutopilotStepStatus` bricht hier die Kompilierung, statt still
 * auf 'pending' abzubilden. Mapping: confirmed→done; in_progress | needs_eid |
 * pending_eid_confirmation→current; sonst→pending.
 */
export function nodeState(status: AutopilotStepStatus): NodeState {
  switch (status) {
    case 'confirmed':
      return 'done';
    case 'in_progress':
    case 'needs_eid':
    case 'pending_eid_confirmation':
      return 'current';
    case 'pending':
    case 'self_assigned':
    case 'failed':
      return 'pending';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Schritt ist bestätigt abgeschlossen. */
export function isDoneStep(status: AutopilotStepStatus): boolean {
  return status === 'confirmed';
}

/** Schritt wurde übersprungen (self_assigned). */
export function isSkippedStep(status: AutopilotStepStatus): boolean {
  return status === 'self_assigned';
}

/** Schritt wartet auf eine eID-Bestätigung. */
export function isEidWaiting(status: AutopilotStepStatus): boolean {
  return status === 'needs_eid' || status === 'pending_eid_confirmation';
}

/** Eine abgeleitete Kaskaden-Zeile (Schritt + zugehörige Config + Behördenname). */
export interface CascadeRowData {
  step: AutopilotStep;
  cfg?: CascadeStepConfig;
  behoerdeName: string;
}

/** `HH:mm` aus einem ISO-Zeitstempel; `null` bei fehlender/ungültiger Eingabe. */
export function formatHHmm(iso?: string): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return null;
  }
}

/** Zerlegt eine „§ … · Art. …"-Rechtsgrundlage in getrimmte, nicht-leere Teile. */
export function splitRechtsgrundlage(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Baut die Kaskaden-Zeilen: filtert Block-C-Schritte, sortiert A → D → B
 * (BLOCK_RANK, danach Einfüge-Index) und reichert je Schritt die Config (Key
 * `${vorgangId}:${c.id}`) sowie den aufgelösten Behördennamen an. Identische
 * Ableitung in beiden Dossier-Konsumenten — das Keying NICHT verändern.
 */
export function buildCascadeRows(
  vorgang: Vorgang,
  config: LebenslageConfig | null,
  vorgangId: string | null,
  behoerdenById: Record<BehoerdeId, Behoerde>,
): CascadeRowData[] {
  const cfgById: Record<string, CascadeStepConfig> = {};
  if (config && vorgangId) {
    for (const c of config.cascade) cfgById[`${vorgangId}:${c.id}`] = c;
  }
  return vorgang.schritte
    .map((step, insertionIndex) => ({ step, insertionIndex }))
    .filter(({ step }) => step.block !== 'C')
    .sort((a, b) => {
      const rank = BLOCK_RANK[a.step.block] - BLOCK_RANK[b.step.block];
      return rank !== 0 ? rank : a.insertionIndex - b.insertionIndex;
    })
    .map(({ step }) => ({
      step,
      cfg: cfgById[step.id],
      behoerdeName: behoerdenById[step.behoerde_id]?.name_de ?? step.behoerde_id,
    }));
}

/** Anteil erledigter Zeilen in Prozent (gerundet); leere Liste → 0. */
export function filledPctOf(rows: CascadeRowData[]): number {
  const done = rows.filter((r) => nodeState(r.step.status) === 'done').length;
  return Math.round((done / Math.max(rows.length, 1)) * 100);
}

export interface HeroBadge {
  label: string;
  variant: 'green' | 'red' | 'brand';
}

/**
 * Hero-Badge des Dossiers: abgeschlossen → grün, ein fehlgeschlagener Schritt →
 * rot, sonst „in Arbeit" (brand). Die drei Labels löst der Aufrufer auf
 * (neutraler i18n-Namespace `lebenslagen.detail.cascade.heroStatus`).
 */
export function heroBadgeOf(
  vorgang: Vorgang | null,
  rows: CascadeRowData[],
  labels: { confirmed: string; failed: string; in_progress: string },
): HeroBadge {
  if (vorgang?.status === 'abgeschlossen') {
    return { label: labels.confirmed, variant: 'green' };
  }
  if (rows.some((r) => r.step.status === 'failed')) {
    return { label: labels.failed, variant: 'red' };
  }
  return { label: labels.in_progress, variant: 'brand' };
}

/**
 * Genuiner „nicht gefunden"-Fehler (nicht wiederholbar, z. B. `VORGANG_NOT_FOUND`)
 * vs. transienter Latenzfehler. Das Mock-Backend wirft via `withLatency` mit 5%
 * Wahrscheinlichkeit einen `MockBackendError` mit `retryable: true`; echte
 * Not-Found-Fehler tragen `retryable: false`. Nur Letztere dürfen `notFound()`
 * auslösen.
 */
export function isGenuineNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { retryable?: boolean }).retryable === false
  );
}

/**
 * Lädt mit Wiederholung gegen die simulierte 5%-Mock-Backend-Fehlerquote.
 * Transiente Fehler (`retryable !== false`) werden bis zu `tries`-mal mit kurzem
 * Backoff wiederholt; ein genuiner Not-Found-Fehler schlägt SOFORT durch (kein
 * Retry), damit der Aufrufer korrekt `notFound()` rendern kann. Verhindert das
 * frühere Verhalten, bei dem ein transienter „Behörde nicht erreichbar"-Fehler
 * fälschlich als 404 interpretiert wurde (≈10% der Lebenslagen-Seitenaufrufe).
 */
export async function loadWithRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isGenuineNotFound(err)) throw err; // echter Not-Found: nicht wiederholen
      if (attempt < tries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/** lucide-Icon zum `config.icon`-Namen (Detail-Hero + Kacheln). */
const ICON_BY_NAME: Record<string, LucideIcon> = {
  baby: Baby,
  globe: Globe,
  'piggy-bank': PiggyBank,
  'book-marked': BookMarked,
  'graduation-cap': GraduationCap,
  'heart-handshake': HeartHandshake,
  home: Home,
};

export function iconForConfig(name: string): LucideIcon {
  return ICON_BY_NAME[name] ?? Landmark;
}

/** Behörden-Icon nach Namen (gleiche Heuristik wie die Umzug-Run-Kaskade). */
export function iconForBehoerde(behoerdeName: string): LucideIcon {
  const lower = behoerdeName.toLowerCase();
  if (lower.includes('familienkasse') || lower.includes('elterngeld')) return Users;
  if (
    lower.includes('bürger') ||
    lower.includes('burger') ||
    lower.includes('melde') ||
    lower.includes('standesamt')
  ) {
    return Landmark;
  }
  if (lower.includes('finanzamt') || lower.includes('bzst') || lower.includes('steuer')) return Euro;
  if (
    lower.includes('bundesdruckerei') ||
    lower.includes('ausweis') ||
    lower.includes('einwanderung') ||
    lower.includes('lea') ||
    lower.includes('bamf')
  ) {
    return Shield;
  }
  if (
    lower.includes('aok') ||
    lower.includes('krankenkasse') ||
    lower.includes('pflege') ||
    lower.includes('medizinisch') ||
    lower.startsWith('tk') ||
    lower.includes(' md')
  ) {
    return HeartPulse;
  }
  if (lower.includes('wohngeld')) return Home;
  if (lower.includes('werk') || lower.includes('hochschule') || lower.includes('ausbildung')) {
    return GraduationCap;
  }
  if (lower.includes('rente') || lower.includes('drv')) return Landmark;
  if (lower.includes('arbeitgeber') || lower.includes('software')) return Building2;
  if (lower.includes('familie')) return BadgeEuro;
  return Landmark;
}

/**
 * Semantisches Schritt-Icon nach Schlagwort im Schritt-Label (statt nach
 * Behörde): wenn eine Behörde mehrere Schritte ausführt (z. B. Pflegekasse 5
 * von 6 Zeilen), zeigt sonst jede Zeile dasselbe Icon. Greift auf das
 * Anzeige-Label (`cfg.kurzlabel ?? step.aktion`); Fallback `Landmark`.
 */
export function iconForStep(label: string): LucideIcon {
  const lower = label.toLowerCase();
  if (/antrag|einreich|erstantrag|stellen/.test(lower)) return FileText;
  if (/eingang|bestätig|quittung|empfang/.test(lower)) return FileCheck;
  if (/auftrag|beauftrag|weiterleit|übermittl/.test(lower)) return Send;
  if (/termin|hausbesuch|begutacht|vor[- ]?ort/.test(lower)) return CalendarClock;
  if (/bescheid|genehmig|bewillig/.test(lower)) return ScrollText;
  if (
    /folgeleistung|leistung|auszahl|pflegegeld|hilfsmittel|kindergeld|wohngeld|bafög|rente/.test(
      lower,
    )
  ) {
    return Award;
  }
  if (/ummeld|anmeld|adress|melde|wohnsitz/.test(lower)) return Home;
  if (/finanz|steuer/.test(lower)) return Euro;
  if (/versicher|kranken|gesundheit|pflege/.test(lower)) return HeartPulse;
  if (/ausweis|pass|reisepass|dokument|urkunde|fiktions/.test(lower)) return IdCard;
  if (/kfz|fahrzeug|zulassung/.test(lower)) return Car;
  if (/rundfunk|beitragsservice/.test(lower)) return Tv;
  return Landmark;
}

/**
 * Auflösung eines Dot-Pfads gegen ein Objekt (Once-Only-Prefill). Unterstützt
 * `a.b` und `a.b[0].c`. Gibt `undefined` bei fehlendem Pfad/Segment zurück —
 * der Aufrufer rendert dann ein leeres, genuines Eingabefeld.
 */
export function resolvePath(source: unknown, path: string | null): unknown {
  if (!path) return undefined;
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((s) => s.length > 0);
  let current: unknown = source;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Macht einen aufgelösten Wert anzeigbar: Adresse → einzeilig, primitive Werte
 * → String, alles andere → leer (kein „[object Object]").
 */
export function formatPrefillValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const a = value as Record<string, unknown>;
    const looksLikeAdresse =
      typeof a.strasse === 'string' || typeof a.plz === 'string' || typeof a.ort === 'string';
    if (looksLikeAdresse) {
      const line1 = [a.strasse, a.hausnummer, a.zusatz].filter((p) => typeof p === 'string').join(' ');
      const line2 = [a.plz, a.ort].filter((p) => typeof p === 'string').join(' ');
      return [line1, line2].filter((p) => p.length > 0).join(', ');
    }
  }
  return '';
}
