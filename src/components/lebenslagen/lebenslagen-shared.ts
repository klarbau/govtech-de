import {
  Baby,
  BadgeEuro,
  BookMarked,
  Building2,
  Euro,
  Globe,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { BlockTyp } from '@/types';

/** Block-Rang für die Kaskaden-Reihenfolge A → D → B (C wird gefiltert). */
export const BLOCK_RANK: Record<BlockTyp, number> = { A: 0, D: 1, B: 2, C: 99 };

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
