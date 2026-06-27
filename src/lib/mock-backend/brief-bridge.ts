/**
 * Brief-Bridge — Archetype → Lebenslage-Deep-Link-Map.
 *
 * Feature „Der Brief, der handelt" (docs/specs/brief-der-handelt.md §6.1).
 * Ein Action-Brief im Posteingang verweist auf den passenden, vorbereiteten
 * Lebenslage-Vorgang. Diese Map ist die *einzige* Quelle der Wahrheit für die
 * Bridge: nur Archetypen mit einem echten, ehrlichen Lebenslage-Pfad sind
 * aktiv. Unmapped Archetypen ⇒ Panel rendert Frist/Action, aber keinen
 * Deep-Link (graceful, State `action + no-slug`).
 *
 * KONSERVATIV: derzeit ist genau EIN Eintrag aktiv (`abh-verlaengerung`).
 * Weitere Archetypen (steuerbescheid, familienkasse-nachweis, …) sind bewusst
 * deferred (Spec §6.1, §10) — ein Bescheid/Nachweis-Brief impliziert keinen
 * neuen Folge-Vorgang, also kein Deep-Link.
 *
 * Cycle-Hinweis: `ErstelleVorgangAusBriefTyp` wird per `import type` aus `./api`
 * geholt (wird beim Kompilieren restlos entfernt). `api.ts` importiert den
 * Laufzeit-Wert `bridgeTargetForArchetype` aus dieser Datei — die einzige
 * Laufzeit-Kante verläuft also api → brief-bridge, kein Zyklus.
 */
import type { LetterArchetype } from '@/types/letter';
import type { ErstelleVorgangAusBriefTyp } from './api';

export interface BriefBridgeTarget {
  /** Lebenslage-Slug (= `<config>.slug`); baut den Deep-Link `/lebenslagen/<slug>`. */
  slug: string;
  /** Vorgangstyp für `erstelleVorgangAusBrief`, falls der Brief noch kein `vorgang_id` trägt. */
  vorgangsTyp: ErstelleVorgangAusBriefTyp;
  /** Vollständiger Deep-Link (= `<config>.href`). */
  href: string;
  /** i18n-CTA-Schlüssel im Namespace `posteingang.erkannteAufgabe.*` (Spec §8). */
  ctaKey: 'cta_vorgang_oeffnen' | 'cta_antrag_vorbereiten' | 'cta_termin_vormerken';
  /** Honesty-Linse — niemals `'antragslos'`. Aufenthalt-Verlängerung ist antragspflichtig. */
  lens: 'proaktiv';
}

/**
 * Archetype → Bridge-Ziel. Nur valide, in den Lebenslage-Configs existierende
 * Slugs eintragen (Spec §9.8 — defensiv: kein toter Deep-Link).
 */
export const ARCHETYPE_BRIDGE: Partial<Record<LetterArchetype, BriefBridgeTarget>> = {
  // bestätigt gegen aufenthaltVerlaengerungConfig (slug/href/vorgangTyp).
  'abh-verlaengerung': {
    slug: 'aufenthalt-verlaengerung',
    vorgangsTyp: 'aufenthaltstitel-verlaengerung',
    href: '/lebenslagen/aufenthalt-verlaengerung',
    ctaKey: 'cta_termin_vormerken',
    lens: 'proaktiv',
  },
  // Weitere Archetypen bewusst deferred (Spec §6.1):
  //   familienkasse-nachweis · steuerbescheid · buergeramt-meldung · …
  //   → Nachweis/Bescheid ohne ehrlichen Folge-Vorgang, daher kein Deep-Link.
};

/**
 * Liefert das Bridge-Ziel für einen Archetype oder `null`, wenn keiner gemappt
 * ist (auch bei fehlendem Archetype). Konsumenten rendern dann den graceful
 * `action + no-slug`-State.
 */
export function bridgeTargetForArchetype(
  archetype?: LetterArchetype,
): BriefBridgeTarget | null {
  if (!archetype) return null;
  return ARCHETYPE_BRIDGE[archetype] ?? null;
}
