import type { Behoerde } from '@/types';
import type { UebermittlungsLogEntry } from '@/types/stammdaten';

/**
 * Pure, client-side register derivation for the Once-Only panel
 * (`<OnceOnlyRegisterPanel>`). No `api`, no `localStorage`, no server state —
 * the list, count and per-node status are all derived from the already-loaded
 * `getBehoerden()` array + the `Übermittlungslog`, so it stays
 * Vercel-serverless-safe and offline-graceful.
 *
 * Honesty rules baked in:
 * - A register node is only KEPT (and counted) when a matching `Behörde`
 *   actually exists in the persona's `behoerden` data, OR it is an explicit
 *   `in_anbindung` 2027-vision node (amber dot, EXCLUDED from the count).
 * - `synchronisiert` (green) is only claimed when a matching `Behörde` id shows
 *   up as absender/empfänger inside the visible log window — never faked.
 */

export type RegisterBaseStatus = 'angebunden' | 'in_anbindung';

/** Resolved per-node status used for the dot color + aria status word. */
export type RegisterNodeStatus =
  | 'synchronisiert'
  | 'angebunden'
  | 'in_anbindung';

export interface RegisterNodeModel {
  id: string;
  /** i18n key under `stammdaten.once_only.node_*`. */
  labelKey: string;
  status: RegisterNodeStatus;
}

interface CuratedRegister {
  id: string;
  labelKey: string;
  baseStatus: RegisterBaseStatus;
  match: (behoerde: Behoerde) => boolean;
}

const hasThema = (behoerde: Behoerde, ...themen: string[]): boolean =>
  behoerde.zustaendige_themen.some((t) => themen.includes(t));

/**
 * Curated map of the six registers the Stammdaten SSoT visibly draws from.
 * Order is the display order. `match` is grounded in real `behoerden.json`
 * `zustaendige_themen` / id patterns — never a hardcoded "always true".
 */
export const CURATED_REGISTERS: readonly CuratedRegister[] = [
  {
    id: 'melderegister',
    labelKey: 'node_melderegister',
    baseStatus: 'angebunden',
    match: (b) => hasThema(b, 'meldewesen', 'rueckmeldung'),
  },
  {
    id: 'kba',
    labelKey: 'node_kba',
    baseStatus: 'in_anbindung',
    match: (b) => hasThema(b, 'kfz_zulassung', 'halteranschrift'),
  },
  {
    id: 'drv',
    labelKey: 'node_drv',
    baseStatus: 'angebunden',
    match: (b) => b.id.startsWith('drv-') || hasThema(b, 'rentenversicherung'),
  },
  {
    id: 'gkv',
    labelKey: 'node_gkv',
    baseStatus: 'angebunden',
    match: (b) =>
      hasThema(b, 'krankenversicherung', 'gesetzliche_krankenversicherung'),
  },
  {
    id: 'finanzamt',
    labelKey: 'node_finanzamt',
    baseStatus: 'angebunden',
    match: (b) =>
      hasThema(b, 'einkommensteuer', 'lohnsteuer', 'steuerliche_zustaendigkeit'),
  },
  {
    id: 'bzst',
    labelKey: 'node_bzst',
    baseStatus: 'angebunden',
    match: (b) => b.id === 'bzst' || hasThema(b, 'steuer_identifikationsnummer'),
  },
] as const;

export interface DeriveRegisterNodesInput {
  behoerden: Behoerde[];
  log: UebermittlungsLogEntry[];
}

export interface DeriveRegisterNodesResult {
  nodes: RegisterNodeModel[];
  count: number;
}

/**
 * Derives the visible register nodes + the honest, node-grounded register
 * count.
 *
 * - A register is included when at least one matching `Behörde` exists in
 *   `behoerden` OR it is an `in_anbindung` 2027-vision node (always shown so the
 *   roadmap stays honest), but `in_anbindung` nodes are EXCLUDED from `count`.
 * - `synchronisiert` is granted only when a matching `Behörde` id appears as
 *   `absender_behoerde_id` or `empfaenger_id` somewhere in the visible log.
 */
export function deriveRegisterNodes({
  behoerden,
  log,
}: DeriveRegisterNodesInput): DeriveRegisterNodesResult {
  const activeIds = new Set<string>();
  for (const entry of log) {
    if (entry.absender_behoerde_id) activeIds.add(entry.absender_behoerde_id);
    if (entry.empfaenger_id) activeIds.add(entry.empfaenger_id);
  }

  const nodes: RegisterNodeModel[] = [];
  let count = 0;

  for (const register of CURATED_REGISTERS) {
    const matches = behoerden.filter((b) => register.match(b));

    if (register.baseStatus === 'in_anbindung') {
      nodes.push({
        id: register.id,
        labelKey: register.labelKey,
        status: 'in_anbindung',
      });
      continue;
    }

    if (matches.length === 0) continue;

    const isSynced = matches.some((b) => activeIds.has(b.id));
    nodes.push({
      id: register.id,
      labelKey: register.labelKey,
      status: isSynced ? 'synchronisiert' : 'angebunden',
    });
    count += 1;
  }

  return { nodes, count };
}
