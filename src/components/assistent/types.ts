import type { UmzugInput, UmzugPreview, VorgangTyp } from '@/types';

/** Status of a single tool call rendered inside an assistant turn. */
export type ToolCallStatus = 'running' | 'done' | 'error';

/** A tool call surfaced as a `<ToolCallCard>` inside an assistant turn. */
export interface ChatToolCall {
  id: string;
  name: string;
  status: ToolCallStatus;
  /** Optional one-line human summary of the result, e.g. "3 Briefe gelesen". */
  resultSummary?: string;
  /** Set on a successful `starte_umzug`/`starte_lebenslage` so the card can dock the cascade. */
  vorgangId?: string;
  /**
   * Run kind of the started Vorgang (`'umzug'` for `starte_umzug`, the config
   * `vorgangTyp` e.g. `'kindergeld'` for `starte_lebenslage`). Passed to
   * `<InlineCascade>` so it gates the Umzug-only decorations and seeds the
   * minimal fallback vorgang correctly before the live record arrives.
   */
  vorgangTyp?: VorgangTyp;
}

/**
 * Pending Umzug proposal — drives `<UmzugConfirmCard>`. The preview is the
 * read-only result of `preview_umzug`; the address + Stichtag come from the
 * tool input. `starte_umzug` is dispatched ONLY when the citizen confirms.
 */
export interface UmzugProposal {
  /** The `tool_use.id` of the held `starte_umzug` block, if the model emitted one. */
  toolUseId?: string;
  neue_adresse: UmzugInput['neue_adresse'];
  stichtag: string;
  /** behoerde_id values the citizen consented to for Block B. */
  blockBConsent: string[];
  preview: UmzugPreview;
  /** Resolved once the citizen acts so the card freezes. */
  resolution?: 'started' | 'cancelled';
}

/**
 * Pending antragslose-Lebenslage proposal — drives `<LebenslageConfirmCard>`.
 * Assembled by `buildProposalFromStarteLebenslage` (assistant flow) from
 * `api.getLebenslageConfig(slug)` (beteiligte Behörden + `zukunft`) and
 * `api.getProfile()` (masked IBAN). `starte_lebenslage` is dispatched ONLY when
 * the citizen confirms. Deliberately NOT reusing `UmzugProposal`: no address,
 * no Stichtag, no Block-B; it carries a [ZUKUNFT 2027] chip + masked-IBAN
 * confirmation Umzug does not have (Spec § 5.3).
 */
export interface LebenslageProposal {
  /** e.g. `'kindergeld'`. */
  slug: string;
  /**
   * The config `vorgangTyp` (e.g. `'kindergeld'`). Carried so `onConfirmLebenslage`
   * can seed the started `ChatToolCall.vorgangTyp` → `<InlineCascade>` without a
   * second `getLebenslageConfig` round-trip. Distinct from `slug` in the general
   * case (they coincide for kindergeld).
   */
  vorgangTyp: VorgangTyp;
  /** Ordered behoerde ids (4 for kindergeld: Standesamt, Meldebehörde, BZSt, Familienkasse). */
  beteiligteBehoerden: string[];
  /** True → render the [ZUKUNFT 2027] + Verfahrensstand chips (speculative-2027 flow). */
  zukunft: boolean;
  /** `'DE.. •••• 4711'` — Stufe-1 CONFIRMATION preview of a known account; never the full IBAN. */
  maskedIban?: string;
  /** Cascade-step ids the citizen consented to (kindergeld has none → `[]`). */
  consents: string[];
  /** The `tool_use.id` of the held `starte_lebenslage` block, if the model emitted one. */
  toolUseId?: string;
  /** Resolved once the citizen acts so the card freezes. */
  resolution?: 'started' | 'cancelled';
}

/** UI-only chat message view-model. Not all entries map to LLM `messages`. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** Rendered text (markdown-lite). For assistant turns this grows while streaming. */
  text: string;
  /** ISO timestamp for the bubble. */
  at: string;
  /** True for the client-composed greeting — never sent back to the LLM. */
  uiOnly?: boolean;
  /** Tool calls emitted within this assistant turn. */
  toolCalls?: ChatToolCall[];
  /** Present iff this assistant turn proposed an Umzug awaiting confirmation. */
  umzugProposal?: UmzugProposal;
  /** Present iff this assistant turn proposed an antragslose Lebenslage awaiting confirmation. */
  lebenslageProposal?: LebenslageProposal;
  /** True while this assistant turn is still streaming. */
  streaming?: boolean;
  /** Stream-level error attached to this turn. */
  error?: boolean;
}
