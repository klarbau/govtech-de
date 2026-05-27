import type { UmzugInput, UmzugPreview } from '@/types';

/** Status of a single tool call rendered inside an assistant turn. */
export type ToolCallStatus = 'running' | 'done' | 'error';

/** A tool call surfaced as a `<ToolCallCard>` inside an assistant turn. */
export interface ChatToolCall {
  id: string;
  name: string;
  status: ToolCallStatus;
  /** Optional one-line human summary of the result, e.g. "3 Briefe gelesen". */
  resultSummary?: string;
  /** Set on a successful `starte_umzug` so the card can link to the cascade. */
  vorgangId?: string;
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
  /** True while this assistant turn is still streaming. */
  streaming?: boolean;
  /** Stream-level error attached to this turn. */
  error?: boolean;
}
