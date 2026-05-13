/**
 * UI-Frontend-co-located Helpers rund um den Pre-Insertion-Modal /
 * Picker-Order Lookup.
 *
 * Single Source of Truth für `pickNormFamilie` / `getPreInsertionModalSpec` /
 * `getReplyTemplatePickerOrder` ist `@/lib/mock-backend/reply-template-order`
 * (mock-backend-coder Eigentum). Wir re-exportieren von hier nur, um lokale
 * UI-Importe stabil zu halten und an einer Stelle Frontend-only-Helpers
 * (`pickFristCitedFormatKey`, `pickFristDatumForNormFamilie`,
 * `isCompanionSkelettSwitch`, `isSkelettTemplate`) anzudocken.
 */
import {
  getPreInsertionModalSpec,
  getReplyTemplatePickerOrder,
  pickNormFamilie,
  type NormFamilie,
  type PreInsertionModalSpec,
  type ReplyTemplateIdWithFreitext,
} from '@/lib/mock-backend/reply-template-order';
import type { Letter, ReplyTemplateId } from '@/types';

export {
  getPreInsertionModalSpec,
  getReplyTemplatePickerOrder,
  pickNormFamilie,
};
export type { NormFamilie, PreInsertionModalSpec, ReplyTemplateIdWithFreitext };

/** Alias für Frontend-Code — `ReplyTemplateChoice` liest sich im Sheet besser. */
export type ReplyTemplateChoice = ReplyTemplateIdWithFreitext;

/**
 * i18n-Key der Frist-Cited-Format-Zeile für eine Letter+Template-Kombination
 * (Spec § 9.2). Bei Norm = OWiG ist der Key der V2-Hook-Wert.
 */
export function pickFristCitedFormatKey(
  letter: Letter,
  templateId: ReplyTemplateId | 'freitext' | null,
): string | null {
  if (templateId === null || templateId === 'freitext') return null;
  let norm: NormFamilie;
  try {
    norm = pickNormFamilie(letter, templateId);
  } catch {
    return null;
  }
  switch (norm) {
    case 'ao':
      return 'frist_cited_format.einspruch_ao';
    case 'sgg':
      return 'frist_cited_format.widerspruch_sgg';
    case 'vwgo':
      return 'frist_cited_format.widerspruch_vwgo';
    case 'aussetzung_ao':
      return 'frist_cited_format.aussetzung_ao';
    case 'owig':
      return 'frist_cited_format.einspruch_owig';
  }
}

/**
 * Liefert das passende Frist-Datum (ISO `YYYY-MM-DD`) für die Norm-Familie
 * eines Skelett-Templates. Returns `null` wenn keine passende Frist im Letter
 * existiert.
 *
 * AO-Aussetzung verweist auf den laufenden Einspruch (Spec § 9.2 letzte Zeile);
 * eine eigene Aussetzungs-Frist gibt es nicht.
 */
export function pickFristDatumForNormFamilie(
  letter: Letter,
  norm: NormFamilie,
): string | null {
  const fristen = letter.fristen ?? [];
  switch (norm) {
    case 'ao':
      return fristen.find((f) => f.typ === 'einspruch')?.datum ?? null;
    case 'sgg':
    case 'vwgo':
      return fristen.find((f) => f.typ === 'widerspruch')?.datum ?? null;
    case 'aussetzung_ao':
      return fristen.find((f) => f.typ === 'einspruch')?.datum ?? null;
    case 'owig':
      return fristen.find((f) => f.typ === 'einspruch')?.datum ?? null;
  }
}

/**
 * Trigger-Logik für den 3-Button-Mode des `<ReplyTemplateSwitchConfirmDialog>`
 * (Spec § 8.1). True ↔ User schaltet zwischen Einspruch- und Aussetzung-Skelett
 * auf demselben Letter um.
 */
export function isCompanionSkelettSwitch(
  fromTemplate: ReplyTemplateId | 'freitext' | null,
  toTemplate: ReplyTemplateId | 'freitext' | null,
): boolean {
  if (fromTemplate === null || toTemplate === null) return false;
  if (fromTemplate === 'freitext' || toTemplate === 'freitext') return false;
  const pair = new Set([fromTemplate, toTemplate]);
  return (
    pair.has('rechtsbehelf_einspruch_skelett') &&
    pair.has('aussetzung_vollziehung_skelett')
  );
}

/** Skelett-Templates, die den Pre-Insertion-Modal feuern (Hard-Line § 11.13). */
export const SKELETT_TEMPLATE_IDS: ReadonlyArray<ReplyTemplateId> = [
  'rechtsbehelf_einspruch_skelett',
  'rechtsbehelf_widerspruch_skelett',
  'aussetzung_vollziehung_skelett',
];

export function isSkelettTemplate(
  templateId: ReplyTemplateId | 'freitext' | null,
): templateId is
  | 'rechtsbehelf_einspruch_skelett'
  | 'rechtsbehelf_widerspruch_skelett'
  | 'aussetzung_vollziehung_skelett' {
  if (templateId === null || templateId === 'freitext') return false;
  return (SKELETT_TEMPLATE_IDS as ReadonlyArray<string>).includes(templateId);
}
