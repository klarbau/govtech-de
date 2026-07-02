/**
 * Registry der funktionalen Lebenslagen (Spec `vorgaenge-functional.md` §2.1 +
 * §5.4). Mappt `slug → LebenslageConfig` und exportiert reine Helfer.
 *
 * Phase 1: NUR Daten + reine Lookups. Diese werden in Phase 2 in `api.ts`
 * (`getLebenslageConfig`, `getLebenslagen`) verdrahtet — hier KEINE Wiring an
 * `api`, kein Engine-Aufruf, keine Persistenz.
 *
 * Umzug erscheint als **display-only Stub** (§2.1): `engine: 'umzug-saga'`,
 * `href: '/vorgaenge/umzug/run'`. Der Stub läuft NIE durch die neue Cascade-
 * Engine — er hält den Katalog auf 9 Karten/eine Form, ohne die Spine zu berühren.
 */
import type { LebenslageConfig, LebenslageCatalogEntry } from './types';
import { geburtConfig } from './configs/geburt';
import { aufenthaltVerlaengerungConfig } from './configs/aufenthalt-verlaengerung';
import { kindergeldConfig } from './configs/kindergeld';
import { reisepassConfig } from './configs/reisepass';
import { bafoegConfig } from './configs/bafoeg';
import { pflegegradConfig } from './configs/pflegegrad';
import { wohngeldConfig } from './configs/wohngeld';
import { kinderzuschlagConfig } from './configs/kinderzuschlag';

/**
 * Umzug-Stub (§2.1): minimale Display-Felder + leere Cascade. Routing über
 * `engine: 'umzug-saga'` → `/vorgaenge/umzug/run`. Die echte Umzug-Logik bleibt
 * im bestehenden Saga-Engine + run-page; dieser Stub liefert nur die Katalog-
 * Kachel-Metadaten. KEIN Cascade-Schritt — die neue Engine ignoriert ihn.
 */
const umzugStub: LebenslageConfig = {
  slug: 'umzug',
  vorgangTyp: 'umzug',
  icon: 'truck',
  kategorie: 'wohnen',
  mode: 'hybrid',
  zukunft: false,
  engine: 'umzug-saga',
  href: '/vorgaenge/umzug/run',
  zustaendige_behoerden: [
    'buergeramt-berlin-mitte',
    'finanzamt-berlin-mitte-tiergarten',
    'kfz-berlin-labo',
    'familienkasse-berlin-brandenburg',
    'abh-berlin-lea',
  ],
  voraussetzungen_keys: [],
  benoetigte_dokumente_keys: [],
  formFields: [],
  rechtsgrundlagen: [
    { norm: '§ 17 BMG', bedeutung_key: 'lebenslagen.umzug.rechtsgrundlagen.bmg.bedeutung' },
  ],
  gebuehr: { gibt_es: false },
  cascade: [],
  value_receipt: {
    behoerdengaenge_gespart: 6,
    minuten_gespart: 180,
    hinweis_key: 'lebenslagen.umzug.value_receipt_hinweis',
  },
  // Ergebnis-Dossier „Gesamtergebnis"-Band (VorgangAbgeschlossen). Umzug hat kein
  // einzelnes fachliches Outcome-Datum wie „Pflegegrad 2", daher eine ehrliche
  // Prozess-Kennzahl (Ummeldung abgeschlossen) + die „ein Satz"-Aufwandsaussage
  // aus dem Value-Receipt. Dritte Zelle bleibt generisch „Beteiligte Stellen".
  ergebnis: {
    lead_key: 'lebenslagen.umzug.ergebnis.lead',
    kennzahl: {
      label_key: 'lebenslagen.umzug.ergebnis.kennzahl_label',
      wert: 'Abgeschlossen',
      sub_key: 'lebenslagen.umzug.ergebnis.kennzahl_sub',
      mock: false,
    },
    status: {
      label_key: 'lebenslagen.umzug.ergebnis.status_label',
      wert_key: 'lebenslagen.umzug.ergebnis.status_wert',
      sub_key: 'lebenslagen.umzug.ergebnis.status_sub',
    },
  },
};

/**
 * Slug → Config. Insertion-Reihenfolge spiegelt die Katalog-Default-Reihenfolge
 * (Umzug zuerst — der gelernte Hero —, dann die sieben funktionalen Lebenslagen).
 */
export const LEBENSLAGE_CONFIGS: Record<string, LebenslageConfig> = {
  umzug: umzugStub,
  geburt: geburtConfig,
  'aufenthalt-verlaengerung': aufenthaltVerlaengerungConfig,
  kindergeld: kindergeldConfig,
  reisepass: reisepassConfig,
  bafoeg: bafoegConfig,
  pflegegrad: pflegegradConfig,
  wohngeld: wohngeldConfig,
  kinderzuschlag: kinderzuschlagConfig,
};

/** Reiner Lookup: Config für einen Slug, sonst `null`. */
export function getLebenslageConfig(slug: string): LebenslageConfig | null {
  return LEBENSLAGE_CONFIGS[slug] ?? null;
}

/** i18n-Titel-Key-Konvention (Spec §6.1): `lebenslagen.{slug}.title`. */
function titleKey(slug: string): string {
  return `lebenslagen.${slug}.title`;
}

/** i18n-Lead-Key-Konvention (Spec §6.1): `lebenslagen.{slug}.lead`. */
function leadKey(slug: string): string {
  return `lebenslagen.${slug}.lead`;
}

/**
 * Reiner Katalog-Builder: schlanke Einträge für das `/lebenslagen`-Grid +
 * Routing. Reihenfolge = Insertion-Reihenfolge von `LEBENSLAGE_CONFIGS`.
 * (Phase 2 verdrahtet dies in `api.getLebenslagen()`.)
 */
export function getLebenslagenCatalog(): LebenslageCatalogEntry[] {
  return Object.values(LEBENSLAGE_CONFIGS).map((c) => ({
    slug: c.slug,
    vorgangTyp: c.vorgangTyp,
    icon: c.icon,
    kategorie: c.kategorie,
    mode: c.mode,
    zukunft: c.zukunft,
    href: c.href,
    engine: c.engine,
    title_key: titleKey(c.slug),
    lead_key: leadKey(c.slug),
    // Hub-Kachel-Metadaten: Schritt-/Behörden-Zahl direkt aus dem Config.
    // Umzug-Stub hat eine leere Cascade → schritte 0 (Hub zeigt „teilweise automatisch").
    schritte: c.cascade.length,
    behoerden: c.zustaendige_behoerden.length,
  }));
}

export type { LebenslageConfig, LebenslageCatalogEntry } from './types';
