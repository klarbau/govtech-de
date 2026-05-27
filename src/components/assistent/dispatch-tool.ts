import type Anthropic from '@anthropic-ai/sdk';

import { api } from '@/lib/mock-backend';
import {
  validateUmzugToolInput,
  type PreviewUmzugInput,
} from '@/lib/ai/tool-schemas';
import type { UmzugInput } from '@/types';

/**
 * Client-side tool dispatcher (Approach B). Maps a streamed `tool_use` block
 * to a `lib/mock-backend/api.ts` call, executes it against the in-process mock
 * backend, and returns an Anthropic `tool_result` content block plus a short
 * human summary for the `<ToolCallCard>`.
 *
 * The irreversible-action gate (`starte_umzug`) is NOT handled here — the
 * orchestrator holds that block and only calls `dispatchStarteUmzug` after the
 * explicit confirm click. This module dispatches the read tools + the manual
 * `preview_umzug` execution.
 */

export interface PreviewResult {
  neue_adresse: UmzugInput['neue_adresse'];
  stichtag: string;
  umzugPreview: Awaited<ReturnType<typeof api.previewUmzug>>;
}

export interface ToolDispatchOutcome {
  /** The Anthropic content block to attach to the next user turn. */
  toolResult: Anthropic.ToolResultBlockParam;
  /** A short, localisation-free factual summary for the ToolCallCard. */
  summary?: string;
  /** Set for a successful starte_umzug so the card can link the cascade. */
  vorgangId?: string;
  /** Set by `preview_umzug` so the orchestrator can build the confirm card. */
  preview?: PreviewResult;
  ok: boolean;
}

function resultBlock(
  toolUseId: string,
  value: unknown,
  isError = false,
): Anthropic.ToolResultBlockParam {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: JSON.stringify(value),
    ...(isError ? { is_error: true } : {}),
  };
}

function errorOutcome(
  toolUseId: string,
  message: string,
): ToolDispatchOutcome {
  return {
    ok: false,
    toolResult: resultBlock(toolUseId, { error: message }, true),
  };
}

function asFilterMap(input: unknown): Record<string, unknown> | undefined {
  if (input && typeof input === 'object' && 'filter' in input) {
    const f = (input as { filter?: unknown }).filter;
    if (f && typeof f === 'object') return f as Record<string, unknown>;
  }
  return undefined;
}

function asLetterId(input: unknown): string | undefined {
  if (input && typeof input === 'object' && 'letterId' in input) {
    const v = (input as { letterId?: unknown }).letterId;
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function asVorgangId(input: unknown): string | undefined {
  if (input && typeof input === 'object' && 'vorgang_id' in input) {
    const v = (input as { vorgang_id?: unknown }).vorgang_id;
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

/**
 * Run a read-only tool. `preview_umzug` and `starte_umzug` are handled by the
 * orchestrator (confirm gate) and must NOT reach here, except `preview_umzug`
 * which IS executed here to feed the confirm card.
 */
export async function dispatchReadTool(
  name: string,
  input: unknown,
  toolUseId: string,
): Promise<ToolDispatchOutcome> {
  try {
    switch (name) {
      case 'lese_posteingang': {
        const filter = asFilterMap(input);
        const letters = await api.getLetters(
          filter as Parameters<typeof api.getLetters>[0] | undefined,
        );
        return {
          ok: true,
          toolResult: resultBlock(
            toolUseId,
            letters.map((l) => ({
              id: l.id,
              absender: l.absender_behoerde_id,
              aktenzeichen: l.aktenzeichen,
              betreff: l.betreff,
              status: l.status,
              eingang: l.empfangen_am,
            })),
          ),
          summary: String(letters.length),
        };
      }
      case 'hole_vorgang': {
        const id = asVorgangId(input);
        if (!id) return errorOutcome(toolUseId, 'vorgang_id fehlt.');
        const vorgang = await api.getVorgang(id);
        return { ok: true, toolResult: resultBlock(toolUseId, vorgang) };
      }
      case 'hole_profil': {
        const profil = await api.getProfile();
        return { ok: true, toolResult: resultBlock(toolUseId, profil) };
      }
      case 'liste_termine': {
        const termine = await api.getTermine();
        return {
          ok: true,
          toolResult: resultBlock(toolUseId, termine),
          summary: String(termine.length),
        };
      }
      case 'erklaere_brief':
      case 'extrahiere_frist':
      case 'vorschlage_naechsten_schritt': {
        const letterId = asLetterId(input);
        if (!letterId) return errorOutcome(toolUseId, 'letterId fehlt.');
        const aktion = await api.extrahiereAktion(letterId);
        if (name === 'extrahiere_frist') {
          return {
            ok: true,
            toolResult: resultBlock(toolUseId, { fristen: aktion.fristen }),
          };
        }
        if (name === 'vorschlage_naechsten_schritt') {
          return {
            ok: true,
            toolResult: resultBlock(toolUseId, {
              options: aktion.was_kann_ich_tun_options,
              disclaimer_key: 'posteingang.disclaimer.no_legal_advice',
            }),
          };
        }
        return { ok: true, toolResult: resultBlock(toolUseId, aktion) };
      }
      case 'preview_umzug': {
        return dispatchPreviewUmzug(input, toolUseId);
      }
      default:
        return errorOutcome(toolUseId, `Unbekanntes Werkzeug: ${name}`);
    }
  } catch (err) {
    return errorOutcome(
      toolUseId,
      err instanceof Error ? err.message : 'Werkzeug fehlgeschlagen.',
    );
  }
}

/** Execute `preview_umzug` (read-only) → UmzugPreview. */
export async function dispatchPreviewUmzug(
  input: unknown,
  toolUseId: string,
): Promise<ToolDispatchOutcome> {
  const validation = validateUmzugToolInput('preview_umzug', input);
  if (!validation.ok) {
    return errorOutcome(toolUseId, 'preview_umzug: ungültige Eingabe.');
  }
  const data = validation.data as PreviewUmzugInput;
  const preview = await api.previewUmzug({
    neue_adresse: data.neue_adresse,
    stichtag: data.stichtag_iso,
  });
  return {
    ok: true,
    toolResult: resultBlock(toolUseId, preview),
    preview: {
      neue_adresse: data.neue_adresse,
      stichtag: data.stichtag_iso,
      umzugPreview: preview,
    },
  };
}

/**
 * Execute the irreversible `starte_umzug` write. Called ONLY after the explicit
 * „Umzug starten" confirm click. Owns the client field mapping per
 * redesign-assistent.md §7.3: stichtag_iso→stichtag, block_b_consent→consents,
 * plus source:'assistant' + betroffene_personen:[activePersonaId].
 */
export async function dispatchStarteUmzug(args: {
  neue_adresse: UmzugInput['neue_adresse'];
  stichtag: string;
  blockBConsent: string[];
  activePersonaId: string;
  toolUseId: string;
}): Promise<ToolDispatchOutcome> {
  const { neue_adresse, stichtag, blockBConsent, activePersonaId, toolUseId } =
    args;
  try {
    const result = await api.startUmzug({
      neue_adresse,
      stichtag,
      consents: blockBConsent,
      betroffene_personen: [activePersonaId],
      source: 'assistant',
    });
    return {
      ok: true,
      vorgangId: result.vorgangId,
      toolResult: resultBlock(toolUseId, { vorgangId: result.vorgangId }),
    };
  } catch (err) {
    return errorOutcome(
      toolUseId,
      err instanceof Error ? err.message : 'Umzug konnte nicht gestartet werden.',
    );
  }
}
