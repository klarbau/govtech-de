/**
 * Reply-Template-Picker-Order + Norm-Familie-Lookup (V1.5.1).
 *
 * Owner: mock-backend-coder. Frontend importiert ausschließlich die hier
 * exportierten Funktionen + Types und rendert daraus Picker-Reihenfolge,
 * Pre-Insertion-Modal-Variante und Frist-Cited-Format-Header.
 *
 * Architektur-Anker:
 *   - `docs/specs/posteingang-v1.5.1.md` § 6 (Master-Predicate + Picker-Order-Map)
 *   - `docs/specs/posteingang-v1.5.1.md` § 7 (Pre-Insertion-Modal + Norm-Familie)
 *   - `docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md` §§ 1, 2, 5
 *
 * Hard rules (verifier-locked, Spec § 11):
 *   - § 11.6 Visibility-Predicate ist *positive-allow*: Skelett-Templates erscheinen
 *     nur, wenn `letter.fristen[]` mind. einen Eintrag mit `typ ∈ {einspruch,
 *     widerspruch}` enthält. `aussetzung_vollziehung_skelett` zusätzlich gated
 *     auf das Triple-AND (steuerbescheid + einspruch + zahlung).
 *   - § 11.13 Pre-Insertion-Modal ist nicht skip-bar — der Lookup liefert
 *     immer eine Spec, niemals `null` (Frontend muss den Modal jedes Mal feuern).
 *   - `pickNormFamilie` wirft auf unhandled archetypes statt silent-fallback —
 *     Drift soll früh sichtbar werden, nicht in einem falschen Modal-Wortlaut
 *     landen.
 */
import type { Letter, ReplyTemplateId } from '@/types';

// ----------------------------------------------------------------------------
// Picker-Order-Variante (extended union — re-exported aus reply-templates.ts)
// ----------------------------------------------------------------------------

/**
 * Picker-Reihenfolge enthält neben den `ReplyTemplateId`-Werten auch
 * `'freitext'` als virtuellen Wert (wird im Frontend als Radio-Button mit
 * `null` als template_id gerendert). Das spiegelt die Resolver-Re-Export-
 * Convention aus `reply-templates.ts`.
 */
export type ReplyTemplateIdWithFreitext = ReplyTemplateId | 'freitext';

// ----------------------------------------------------------------------------
// Norm-Familie + PreInsertionModalSpec
// ----------------------------------------------------------------------------

/**
 * Vier aktive Norm-Familien für das Pre-Insertion-Modal (Domain-Doc § 1
 * Norm-Familie-Cluster) plus der OWiG-Hook (V2-Hook, kein V1.5.1-Render-Pfad).
 */
export type NormFamilie = 'ao' | 'sgg' | 'vwgo' | 'aussetzung_ao' | 'owig';

export interface PreInsertionModalSpec {
  /** i18n-Key des Modal-Title-Strings. */
  modal_title_key: string;
  /** i18n-Key der Modal-Body-String (verbatim Domain-Doc § 2). */
  modal_body_key: string;
  /**
   * Optional: zusätzliche conditional-rendered Erklärer-Sentence. In V1.5.1
   * exklusiv bei AO + Familienkasse-Bescheiden gesetzt (Domain-Doc § 2.1
   * Familienkasse-Zusatz-Sentence).
   */
  additional_explainer_key?: string;
  /** i18n-Key für „Skelett einfügen"-Primary-CTA. */
  cta_continue_key: string;
  /** i18n-Key für „Abbrechen"-Tertiary-CTA. */
  cta_cancel_key: string;
  /** i18n-Key des Pre-Insertion-Disclaimer (Domain-Doc § 4). */
  disclaimer_pre_insertion_key: string;
}

/**
 * Table-driven Lookup. Domain-Doc § 1 Norm-Familie-Mapping.
 *
 * Bei `templateId === 'aussetzung_vollziehung_skelett'` ist die Norm-Familie
 * IMMER `'aussetzung_ao'` (Hard-Line Domain-Doc § 1 letztes Bullet — Aussetzung
 * ist demoseitig auf AO-Familie beschränkt).
 */
export function pickNormFamilie(
  letter: Letter,
  templateId: ReplyTemplateId,
): NormFamilie {
  if (templateId === 'aussetzung_vollziehung_skelett') return 'aussetzung_ao';

  switch (letter.archetype) {
    case 'steuerbescheid':
    case 'familienkasse-nachweis':
      return 'ao';
    case 'krankenkasse-beitrag':
    case 'berufsgenossenschaft-beitrag':
      return 'sgg';
    case 'ihk-beitrag':
    case 'beitragsservice-mahnung':
    case 'abh-verlaengerung':
      return 'vwgo';
    // OWiG: V2-Hook (Code-Pfad ready, kein Mock-Letter heute).
    default:
      // Defensive: kein Skelett-Template hat diese Code-Path-Reichweite,
      // weil Master-Predicate (§ 5 Domain-Doc) die übrigen Archetypes
      // ausschließt (`buergeramt-meldung`, `standesamt-urkunde`, `sonstiges`).
      // Wir werfen statt silent-fallback, damit Drift früh sichtbar wird —
      // ein falsches Modal-Wortlaut wäre RDG-relevant.
      throw new Error(
        `pickNormFamilie: unhandled archetype "${letter.archetype}" for templateId "${templateId}"`,
      );
  }
}

/**
 * Liefert die Pre-Insertion-Modal-Spec für eine Norm-Familie + den konkreten
 * Letter (für die Familienkasse-Zusatz-Sentence-Konditionalität, Domain-Doc
 * § 2.1 + § 5 Hard-Rule 6).
 *
 * Wirft bei OWiG-Familie (V2-Hook, kein Render-Pfad in V1.5.1).
 */
export function getPreInsertionModalSpec(
  norm: NormFamilie,
  letter: Letter,
): PreInsertionModalSpec {
  // Familienkasse-AO-Erklärer ist mandatorisch, wenn AO + familienkasse-nachweis
  // + frist[].typ enthält 'einspruch' (Spec § 11.4, Domain-Doc § 5 Hard-Rule 6).
  // Hier conservative über (norm === 'ao' && archetype === 'familienkasse-nachweis')
  // — die Frist-Typ-Bedingung ist schon durch das Master-Predicate gefiltert,
  // bevor der Modal aufgerufen wird (Skelett-Templates erscheinen nicht ohne
  // einspruch-/widerspruch-Frist).
  const additional_explainer_key =
    norm === 'ao' && letter.archetype === 'familienkasse-nachweis'
      ? 'posteingang.compose.pre_insertion_modal.einspruch_ao_familienkasse_zusatz'
      : undefined;

  switch (norm) {
    case 'ao':
      return {
        modal_title_key:
          'posteingang.compose.pre_insertion_modal.einspruch_ao.title',
        modal_body_key:
          'posteingang.compose.pre_insertion_modal.einspruch_ao.body',
        additional_explainer_key,
        cta_continue_key:
          'posteingang.compose.pre_insertion_modal.einspruch_ao.cta_continue',
        cta_cancel_key:
          'posteingang.compose.pre_insertion_modal.einspruch_ao.cta_cancel',
        disclaimer_pre_insertion_key:
          'posteingang.compose.templates.rechtsbehelf_einspruch_skelett.disclaimer_pre_insertion',
      };
    case 'sgg':
      return {
        modal_title_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_sgg.title',
        modal_body_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_sgg.body',
        cta_continue_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_sgg.cta_continue',
        cta_cancel_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_sgg.cta_cancel',
        disclaimer_pre_insertion_key:
          'posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion',
      };
    case 'vwgo':
      return {
        modal_title_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.title',
        modal_body_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.body',
        cta_continue_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.cta_continue',
        cta_cancel_key:
          'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.cta_cancel',
        disclaimer_pre_insertion_key:
          'posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion',
      };
    case 'aussetzung_ao':
      return {
        modal_title_key:
          'posteingang.compose.pre_insertion_modal.aussetzung_ao.title',
        modal_body_key:
          'posteingang.compose.pre_insertion_modal.aussetzung_ao.body',
        cta_continue_key:
          'posteingang.compose.pre_insertion_modal.aussetzung_ao.cta_continue',
        cta_cancel_key:
          'posteingang.compose.pre_insertion_modal.aussetzung_ao.cta_cancel',
        disclaimer_pre_insertion_key:
          'posteingang.compose.templates.aussetzung_vollziehung_skelett.disclaimer_pre_insertion',
      };
    case 'owig':
      // V2-Hook — kein V1.5.1-Render-Pfad. Spec § 7.1 letzter Comment.
      throw new Error('OWiG-Familie ist V2-Hook; kein Render in V1.5.1.');
  }
}

// ----------------------------------------------------------------------------
// Picker-Order — Master-Predicate + table-driven Lookup
// ----------------------------------------------------------------------------

/**
 * Master-Predicate (Spec § 6.1, Domain-Doc § 5):
 * Skelett-Templates erscheinen *nur*, wenn `letter.fristen[]` mindestens einen
 * Eintrag mit `typ ∈ {'einspruch', 'widerspruch'}` enthält.
 */
function hasRechtsbehelfFrist(letter: Letter): boolean {
  return (letter.fristen ?? []).some(
    (f) => f.typ === 'einspruch' || f.typ === 'widerspruch',
  );
}

function hasFristTyp(letter: Letter, typ: string): boolean {
  return (letter.fristen ?? []).some((f) => f.typ === typ);
}

/**
 * `aussetzung_vollziehung_skelett` ist zusätzlich an das Triple-AND gebunden
 * (Spec § 6.1, Domain-Doc § 5 Hard-Rule 1):
 *   archetype === 'steuerbescheid'
 *   AND fristen[].typ enthält 'einspruch'
 *   AND fristen[].typ enthält 'zahlung'
 */
function isAussetzungEligible(letter: Letter): boolean {
  return (
    letter.archetype === 'steuerbescheid' &&
    hasFristTyp(letter, 'einspruch') &&
    hasFristTyp(letter, 'zahlung')
  );
}

/**
 * Table-driven Picker-Order-Lookup (Spec § 6.2). Liefert die Reihenfolge der
 * Reply-Templates, die im Picker erscheinen sollen. `output[0]` ist
 * default-highlighted im Picker.
 *
 * Output enthält zusätzlich `'freitext'` als virtuellen Eintrag (Frontend
 * rendert das als Radio-Button mit `template_id: null`).
 *
 * Wirft auf unhandled archetypes (Spec § 11 Drift-Hard-Line — wir wollen Drift
 * nicht silent als „leerer Picker" sehen).
 */
export function getReplyTemplatePickerOrder(
  letter: Letter,
): ReplyTemplateIdWithFreitext[] {
  const archetype = letter.archetype ?? 'sonstiges';
  const skelettAllowed = hasRechtsbehelfFrist(letter);
  const aussetzungAllowed = skelettAllowed && isAussetzungEligible(letter);

  switch (archetype) {
    case 'steuerbescheid': {
      if (aussetzungAllowed) {
        // steuerbescheid + einspruch + zahlung — Hero-Loom-Cut.
        return [
          'rechtsbehelf_einspruch_skelett',
          'aussetzung_vollziehung_skelett',
          'frist_verlaengerung',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      if (skelettAllowed) {
        // steuerbescheid + einspruch (z. B. Anna-Erstattungsbescheid 2025).
        return [
          'rechtsbehelf_einspruch_skelett',
          'frist_verlaengerung',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      // steuerbescheid + zahlung (oder ohne einspruch-Frist) — kein Skelett.
      return ['frist_verlaengerung', 'informative_rueckmeldung', 'freitext'];
    }

    case 'familienkasse-nachweis': {
      if (skelettAllowed) {
        // V2-Mock-Letter: familienkasse-nachweis + einspruch
        // (Aufhebungs-/Ablehnungsbescheid). Code-Pfad ready, kein V1.5.1-Letter.
        return [
          'rechtsbehelf_einspruch_skelett',
          'frist_verlaengerung',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      // V1.5.1-Default: familienkasse-nachweis + nachweis (Mitwirkungs-Aufforderung).
      return [
        'nachweis_einreichen',
        'frist_verlaengerung',
        'informative_rueckmeldung',
        'freitext',
      ];
    }

    case 'krankenkasse-beitrag': {
      if (skelettAllowed) {
        return [
          'rechtsbehelf_widerspruch_skelett',
          'frist_verlaengerung',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      // krankenkasse-beitrag ohne Frist (z. B. Mitgliedsbescheinigung,
      // Zuzahlungs-Übersicht).
      return ['informative_rueckmeldung', 'freitext'];
    }

    case 'berufsgenossenschaft-beitrag': {
      if (skelettAllowed) {
        return [
          'rechtsbehelf_widerspruch_skelett',
          'frist_verlaengerung',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      return ['informative_rueckmeldung', 'freitext'];
    }

    case 'ihk-beitrag': {
      if (skelettAllowed) {
        return [
          'rechtsbehelf_widerspruch_skelett',
          'frist_verlaengerung',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      return ['informative_rueckmeldung', 'freitext'];
    }

    case 'beitragsservice-mahnung': {
      if (skelettAllowed) {
        // Befreiungs-Nachweis bleibt sichtbar — Domain-Doc § 5 Tabelle.
        return [
          'rechtsbehelf_widerspruch_skelett',
          'nachweis_einreichen',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      return ['informative_rueckmeldung', 'freitext'];
    }

    case 'abh-verlaengerung': {
      if (skelettAllowed) {
        // V2-Mock-Letter: ABH-Ablehnungsbescheid mit Widerspruchs-Frist.
        return [
          'rechtsbehelf_widerspruch_skelett',
          'informative_rueckmeldung',
          'freitext',
        ];
      }
      // V1.5.1-Default: abh-verlaengerung + nachweis (Erinnerung Verlängerungsfrist).
      return [
        'nachweis_einreichen',
        'frist_verlaengerung',
        'informative_rueckmeldung',
        'freitext',
      ];
    }

    case 'standesamt-urkunde': {
      // Letters mit Frist (typ === 'antragstellung') = Termin-Vorschlag-Brief.
      if (hasFristTyp(letter, 'antragstellung')) {
        return ['termin_antwort', 'informative_rueckmeldung', 'freitext'];
      }
      return ['informative_rueckmeldung', 'freitext'];
    }

    case 'buergeramt-meldung':
      return ['informative_rueckmeldung', 'freitext'];

    case 'sonstiges':
      return ['informative_rueckmeldung', 'freitext'];

    default:
      // V1.5.0-Fallback (Spec § 6.2 `default`-Eintrag der Tabelle). Liefert
      // die volle V1.5.0-Picker-Auswahl ohne Skelett-Templates.
      return [
        'frist_verlaengerung',
        'nachweis_einreichen',
        'informative_rueckmeldung',
        'termin_antwort',
        'freitext',
      ];
  }
}
