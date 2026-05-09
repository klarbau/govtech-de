/**
 * Safety nets for the assistant.
 *
 * Two layers:
 *
 *   1. **Pre-call refusal patterns** — locale-agnostic regex/keyword detection
 *      on the user's last message. If a pattern matches, we short-circuit the
 *      call and ask the model to produce a refusal in the user's own language
 *      (we don't hard-code refusal text per locale; the model handles fluent
 *      phrasing — we only enforce the refusal *intent* via system prompt
 *      injection plus a static fallback string per locale, kept short).
 *
 *   2. **System-prompt-side refusal rules** (see `system-prompt.ts`). Belt
 *      and braces: even if a pattern slips past the regex, the system prompt
 *      tells the model to refuse legal advice / real-world contact / explicit
 *      content with a polite one-liner.
 *
 * The patterns intentionally over-match a little; the AI then phrases the
 * refusal politely. Better to over-refuse on a portfolio demo than to issue
 * fabricated legal advice.
 */

import type { SupportedLocale } from './language';

export type RefusalCategory =
  /** User asks for binding legal advice, paragraph interpretation, or court strategy. */
  | 'legal_advice'
  /**
   * User asks for an Erfolgsprognose / Aussichten-Bewertung — narrower variant
   * of legal_advice. RDG-/Smartlaw-line: success-forecast for Widerspruch /
   * Einspruch / Klage / Aussetzung der Vollziehung is reserved to licensed
   * legal services. Verifier-Auflage Probe #3 (posteingang spec §11).
   */
  | 'erfolgsprognose'
  /** User asks the assistant to actually contact a Behörde / employer / private party. */
  | 'real_world_action'
  /**
   * User pastes a real-looking Behörden-Brief into chat (Aktenzeichen-Format
   * without `[MOCK]` watermark). V1 has Brief-upload deaktiviert; the chat
   * surface must mirror that hard-refusal. Verifier-Auflage Probe #3 + spec §10.
   */
  | 'real_letter_paste'
  /** Sexual / hateful / self-harm / minors content. */
  | 'explicit_content';

export interface RefusalDetection {
  category: RefusalCategory;
  /** Tiny snippet of the matched pattern, useful for logs (NOT shown to user). */
  matched: string;
}

/**
 * Patterns deliberately mix locale-anchored keywords (DE/EN/RU/TR/UK/AR) with
 * neutral structural cues. They run case-insensitive on the message text. Each
 * pattern is small and fast — total cost per request is < 1 ms.
 */
const LEGAL_ADVICE_PATTERNS: RegExp[] = [
  // DE
  /\bsoll(?:te)?\s+ich\s+klagen\b/i,
  /\brechtsverbindlich(e|er|en)?\s+auskunft\b/i,
  /\bist\s+das\s+legal\b/i,
  /\b(welche\s+)?(klage|widerspruch|berufung)\s+(soll|muss)\s+ich\b/i,
  /\bbist\s+du\s+(ein\s+)?(anwalt|jurist)\b/i,
  /\bgib\s+mir\s+(rechts)?(beratung|rat)\b/i,
  // EN
  /\b(should|must|can)\s+i\s+sue\b/i,
  /\bgive\s+me\s+legal\s+advice\b/i,
  /\bare\s+you\s+a\s+lawyer\b/i,
  // RU / UK
  /юридическ(ая|ой|ую)\s+консультац/iu,
  /\bподавать\s+в\s+суд\b/iu,
  // TR
  /\bhukuki\s+tavsiye\b/i,
  /\bdava\s+aç(malı|ar\s+mıyım)\b/i,
];

/**
 * Erfolgsprognose-Trigger. Per spec §11 Risk row "RDG-Linie überschritten" +
 * Probe #3 system-prompt-constraint: explicit refusal pattern. Examples
 * caught: „Wird mein Einspruch Erfolg haben?", „Lohnt sich der Widerspruch?",
 * „Habe ich Aussichten?", „Will my appeal succeed?", „Стоит ли подавать
 * жалобу?". The model still receives the system-prompt rule; this regex is
 * the belt to the system-prompt's braces.
 */
const ERFOLGSPROGNOSE_PATTERNS: RegExp[] = [
  // DE: "Erfolg" / "Erfolgsaussichten" / "Aussichten" / "lohnt sich" + Verfahrens-Bezug
  /\b(erfolg(s)?(aussicht(en)?|chancen?|prognose)?|aussichten|lohnt\s+sich)\b.{0,40}\b(einspruch|widerspruch|klage|aussetzung|verfahren|antrag)\b/i,
  /\b(einspruch|widerspruch|klage|aussetzung)\b.{0,40}\b(erfolg|aussichten?|chance)/i,
  /\b(wie\s+stehen\s+(meine|die)\s+chancen|habe\s+ich\s+aussichten)\b/i,
  /\b(ist|wäre)\s+(der|ein|mein)\s+(einspruch|widerspruch|klage)\s+(erfolgversprechend|aussichtsreich|sinnvoll)\b/i,
  /\bist\s+(dieser|der)\s+bescheid\s+rechtmäßig\b/i,
  /\bsoll(?:te)?\s+ich\s+(einspruch|widerspruch|klage)\s+(einlegen|erheben)\b/i,
  // EN
  /\b(will|would|can)\s+(my|the)\s+(appeal|objection|complaint)\s+(succeed|win|work)\b/i,
  /\b(chances?|prospects?)\s+(of|for)\s+(success|winning|appeal)\b/i,
  /\bis\s+(this|the)\s+(decision|notice|assessment)\s+(legal|lawful|valid)\b/i,
  // RU / UK
  /\bкаков(ы)?\s+(шансы|перспектив)/iu,
  /\bстоит\s+ли\s+(подавать|обжаловать)/iu,
  // TR
  /\b(itiraz(ım)?\s+başarılı\s+olur\s+mu|kazanma\s+şans)/i,
];

const REAL_WORLD_ACTION_PATTERNS: RegExp[] = [
  // "actually call X" / "send a real letter" / "contact the Behörde for me"
  /\b(ruf|rufe|telefonier(e|st)?)\s+.*\b(an|behörd|amt)\b/i,
  /\bschick\s+wirklich\s+(eine?\s+)?email\b/i,
  /\b(send|email|call|fax)\s+(a\s+)?(real|actual)\s+(letter|email)\b/i,
  /\bsende\s+(echte|tatsächlich)\b/i,
  /\bкорпорат(ивн|ивно)\s+отправь/iu,
  /\bgerçekten\s+(ara|gönder)/i,
];

/**
 * Real-Brief-Paste-Trigger. Demo Briefe carry `[MOCK]` watermark inline; if
 * a long chunk of text in the user's message reads like an Aktenzeichen-bearing
 * Behörden-Brief and is missing `[MOCK]`, intercept. We're conservative: we
 * require BOTH (a) a plausible Aktenzeichen pattern OR Behörden-typische
 * Brief-Phrase, AND (b) absence of the watermark, AND (c) a minimum length
 * (≥ 200 chars) so single quoted lines don't trip it.
 *
 * Spec reference: posteingang.md §10 (Brief-Upload V1 OUT) + §8.1
 * `posteingang.disclaimer.mock_data`. The model is also instructed in the
 * system prompt; this regex provides a deterministic short-circuit.
 */
const REAL_LETTER_PASTE_HEURISTIC = {
  MIN_LENGTH: 200,
  /** Phrases typical of real Behörden-Briefe (DE only — synthetic mock briefs match too, but they carry the watermark). */
  STRUCTURE_PATTERNS: [
    /\bAktenzeichen\b\s*:?\s*[A-Z0-9./\-\s]{4,}/u,
    /\bGeschäftszeichen\b\s*:?\s*[A-Z0-9./\-\s]{4,}/u,
    /\bSteuernummer\b\s*:?\s*\d{2,3}\/\d{2,4}\/\d{4,5}/u,
    /\bSteuer-?ID\s*(Nr\.?)?\s*:?\s*\d{11}\b/iu,
    /\bSehr\s+geehrte[r]?\s+(Herr|Frau|Damen)/iu,
    /\bgegen\s+diesen\s+Bescheid\s+(kann|können\s+Sie)\s+innerhalb\s+(eines\s+Monats|einer\s+Frist)/iu,
    /\bRechtsbehelfsbelehrung\b/iu,
  ],
  WATERMARK: /\[MOCK\b/i,
};

const EXPLICIT_CONTENT_PATTERNS: RegExp[] = [
  // Deliberately conservative — we only block obvious solicitations.
  /\b(sexuell|porn(o|ografisch)|nackt(bild|foto)|erotisch)/i,
  /\b(porn|nude|sexual\s+content|nsfw|erotic)\b/i,
  /\b(порно|секс\s+истори)/iu,
  /\bçıplak\s+(fotoğraf|resim)/i,
  /\bself[\s-]?harm\b|\bsuizid|\bsamopovre/i,
];

/**
 * Detect a pasted real-looking Behörden-Brief: long body, contains a Brief
 * structure cue, but no `[MOCK]` watermark. Returns the matched cue snippet
 * for logging.
 */
function detectRealLetterPaste(text: string): string | undefined {
  if (text.length < REAL_LETTER_PASTE_HEURISTIC.MIN_LENGTH) return undefined;
  if (REAL_LETTER_PASTE_HEURISTIC.WATERMARK.test(text)) return undefined;
  for (const re of REAL_LETTER_PASTE_HEURISTIC.STRUCTURE_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return undefined;
}

/**
 * Run all refusal patterns against the user's most recent message. Returns
 * the first match (if any) in priority order:
 * real_letter_paste > explicit > erfolgsprognose > legal_advice > real_world_action.
 *
 * Order matters: real_letter_paste comes first so we don't half-process a
 * pasted real Brief by extracting a Frist out of it; erfolgsprognose comes
 * before generic legal_advice because it triggers a more specific, RDG-
 * conscious refusal text per Smartlaw-line.
 */
export function detectRefusal(text: string): RefusalDetection | undefined {
  if (!text) return undefined;

  const letterMatch = detectRealLetterPaste(text);
  if (letterMatch) {
    return { category: 'real_letter_paste', matched: letterMatch };
  }

  for (const re of EXPLICIT_CONTENT_PATTERNS) {
    const m = re.exec(text);
    if (m) return { category: 'explicit_content', matched: m[0] };
  }
  for (const re of ERFOLGSPROGNOSE_PATTERNS) {
    const m = re.exec(text);
    if (m) return { category: 'erfolgsprognose', matched: m[0] };
  }
  for (const re of LEGAL_ADVICE_PATTERNS) {
    const m = re.exec(text);
    if (m) return { category: 'legal_advice', matched: m[0] };
  }
  for (const re of REAL_WORLD_ACTION_PATTERNS) {
    const m = re.exec(text);
    if (m) return { category: 'real_world_action', matched: m[0] };
  }
  return undefined;
}

/**
 * Static fallback refusals per locale + category. Used when we want to bypass
 * the model entirely (e.g. on rate-limit or to keep latency crisp). The model
 * is still the preferred phrasing surface — these strings are conservative.
 */
const STATIC_REFUSALS: Record<RefusalCategory, Record<SupportedLocale, string>> = {
  legal_advice: {
    de: 'Ich darf in dieser Demo keine rechtsverbindliche Beratung geben. Bitte wenden Sie sich an die zuständige Behörde oder eine zugelassene Rechtsberatung.',
    en: 'In this prototype I cannot give legally binding advice. Please contact the responsible authority or a licensed legal advisor.',
    ru: 'В этой демонстрации я не могу давать юридически обязывающие консультации. Пожалуйста, обратитесь в соответствующее ведомство или к лицензированному юристу.',
    uk: 'У цьому прототипі я не можу надавати юридично обов’язкових консультацій. Зверніться до відповідного відомства або ліцензованого юриста.',
    ar: 'لا يمكنني تقديم استشارة قانونية ملزِمة في هذه النسخة التجريبية. يرجى التواصل مع الجهة المختصة أو مستشار قانوني مرخّص.',
    tr: 'Bu demoda bağlayıcı hukuki tavsiye veremem. Lütfen yetkili makama veya ruhsatlı bir hukuk danışmanına başvurun.',
  },
  // RDG-/Smartlaw-Linie: success-forecast for Einspruch / Widerspruch / Klage /
  // Aussetzung der Vollziehung. Verbatim-aligned with the system-prompt
  // constraint and `posteingang.disclaimer.no_legal_advice`.
  erfolgsprognose: {
    de: 'Eine Bewertung der Erfolgsaussichten ist Rechtsdienstleistung im Sinne des § 2 RDG und kann nur durch Rechtsanwält:innen, Verbraucherzentralen oder Sozialverbände (z. B. SoVD, VdK) erfolgen. Ich erkläre Ihnen gern Frist, Form und zuständige Stelle des Verfahrens — die Erfolgs-Prognose nicht.',
    en: 'Assessing the prospects of success is a legal service under § 2 RDG and is reserved to licensed lawyers, consumer-protection centres (Verbraucherzentrale), or social associations (SoVD, VdK). I can explain the procedural deadline, form, and responsible authority — but not the prospects of success.',
    ru: 'Оценка перспектив успеха обжалования относится к юридическим услугам по § 2 RDG и доступна только адвокатам, центрам защиты прав потребителей или общественным союзам (SoVD, VdK). Я охотно объясню Вам срок, форму и компетентный орган — но не прогноз исхода.',
    uk: 'Оцінка шансів на успіх є юридичною послугою за § 2 RDG і доступна лише адвокатам, центрам захисту прав споживачів або громадським спілкам (SoVD, VdK). Я охоче поясню Вам термін, форму та компетентний орган — але не прогноз результату.',
    ar: 'تقييم فرص النجاح هو خدمة قانونية بموجب § 2 RDG ولا يقدّمها إلا المحامون أو مراكز حماية المستهلك أو الجمعيات الاجتماعية (SoVD، VdK). يسعدني شرح المهلة والشكل والجهة المختصة — لكن ليس توقّع النتيجة.',
    tr: 'Başarı olasılığının değerlendirilmesi § 2 RDG kapsamında hukuki bir hizmettir ve yalnızca avukatlar, tüketici merkezleri (Verbraucherzentrale) veya sosyal dernekler (SoVD, VdK) tarafından sunulabilir. Süre, biçim ve yetkili makam konusunda yardımcı olurum — ancak sonucu tahmin etmem.',
  },
  // V1: Brief-Upload deaktiviert — Hard-refusal mirroring `posteingang.disclaimer.mock_data`.
  real_letter_paste: {
    de: 'Diese Demo verarbeitet keine echten Briefe. Bitte verwenden Sie die `[MOCK]`-Briefe im Posteingang. Brief-Upload ist in dieser Demo deaktiviert; senden Sie keine echten personenbezogenen Daten in den Chat.',
    en: 'This demo does not process real letters. Please use the `[MOCK]` letters in your inbox. Letter upload is disabled in this demo — do not paste real personal data into the chat.',
    ru: 'Эта демонстрация не обрабатывает настоящие письма. Используйте письма с пометкой `[MOCK]` во входящих. Загрузка писем в демо отключена — не вставляйте реальные персональные данные в чат.',
    uk: 'Ця демонстрація не обробляє справжніх листів. Використовуйте листи з позначкою `[MOCK]` у вхідних. Завантаження листів у демо вимкнено — не вставляйте справжні персональні дані в чат.',
    ar: 'هذا العرض التوضيحي لا يعالج رسائل حقيقية. يُرجى استخدام رسائل `[MOCK]` في صندوق الوارد. تحميل الرسائل معطّل في هذه النسخة التجريبية — لا تُدخل بيانات شخصية حقيقية في الدردشة.',
    tr: 'Bu demo gerçek mektupları işlemez. Lütfen gelen kutusundaki `[MOCK]` mektupları kullanın. Mektup yüklemesi bu demoda devre dışıdır — sohbete gerçek kişisel veriler yapıştırmayın.',
  },
  real_world_action: {
    de: 'Dieser Prototyp führt keine echten Aktionen aus — alle Daten und Behörden-Antworten sind simuliert.',
    en: 'This prototype performs no real-world actions — all data and authority responses are simulated.',
    ru: 'Этот прототип не выполняет реальных действий — все данные и ответы ведомств смоделированы.',
    uk: 'Цей прототип не виконує справжніх дій — усі дані та відповіді відомств змодельовані.',
    ar: 'لا يقوم هذا النموذج التجريبي بأي إجراءات حقيقية — جميع البيانات وردود الجهات محاكاة فقط.',
    tr: 'Bu prototip gerçek bir işlem yürütmez — tüm veriler ve makam yanıtları simülasyondur.',
  },
  explicit_content: {
    de: 'Diese Anfrage gehört nicht in den Anwendungsbereich dieser Demo. Ich helfe gern mit Behördengängen.',
    en: 'That request is outside the scope of this demo. I’m happy to help with administrative procedures.',
    ru: 'Этот запрос выходит за рамки данной демонстрации. Я охотно помогу с административными процедурами.',
    uk: 'Цей запит виходить за межі цієї демонстрації. Я охоче допоможу з адміністративними процедурами.',
    ar: 'هذا الطلب خارج نطاق هذه النسخة التجريبية. يسعدني مساعدتك في الإجراءات الإدارية.',
    tr: 'Bu talep bu demonun kapsamı dışındadır. İdari işlemler konusunda yardımcı olmaktan memnuniyet duyarım.',
  },
};

export function staticRefusal(
  category: RefusalCategory,
  locale: SupportedLocale,
): string {
  return STATIC_REFUSALS[category][locale];
}

/**
 * The mandatory disclaimer line. Appended by the model at the end of any
 * procedural reply (system prompt enforces this). We export it so the route
 * handler can validate / fall back if the model forgets — defensive, not
 * a primary mechanism.
 */
export const MANDATORY_DISCLAIMER_DE =
  'Hinweis: Dies ist ein Prototyp; in der echten Behörde gelten zusätzliche Anforderungen.';
