/**
 * Client-side helper for the Klartext-Rückkanal restatement tool
 * (klartext-rueckkanal.md §7) — the typed callable the frontend
 * (`RechtsbehelfFaktenCapture`) uses to reach `POST /api/reply/sachverhalt`.
 *
 * Mirrors the `KiAktionenChips` fetch pattern (`POST /api/reply/rewrite`) so the
 * frontend wires this the same way. Browser-safe: NO `@anthropic-ai/sdk` import,
 * NO `process.env`, NO server-only code — just `fetch` + a typed contract.
 *
 * HARD guarantee (Correction #9): this helper NEVER throws and NEVER returns
 * silent legal phrasing. On any network/transport failure it resolves with the
 * citizen's raw text unchanged and `source: 'fallback'`, so the caller can drop
 * the raw text into the `begruendung_kurz` slot for manual editing and surface
 * the "Text unverändert übernommen" hint.
 */

import type { SachverhaltNormFamilie, SachverhaltResult } from './sachverhalt';

export type { SachverhaltNormFamilie, SachverhaltResult } from './sachverhalt';

/**
 * Restate the citizen's own plain-language facts into a neutral Sachverhalt for
 * the `begruendung_kurz` slot.
 *
 * @param rohtext     the citizen's own words — what is wrong on the Bescheid.
 * @param normFamilie MECHANICALLY derived from `letter.archetype` via
 *                    `pickNormFamilie` (NEVER inferred from the free text,
 *                    Correction #5) — only shapes the restatement tone.
 *
 * Always resolves. On any failure → `{ sachverhalt: <rohtext verbatim>,
 * source: 'fallback' }`.
 */
export async function requestSachverhalt(
  rohtext: string,
  normFamilie: SachverhaltNormFamilie,
): Promise<SachverhaltResult> {
  // Empty input short-circuits without a network call (mirrors the server cap).
  if (!rohtext || rohtext.trim().length === 0) {
    return { sachverhalt: rohtext, source: 'fallback' };
  }

  try {
    const res = await fetch('/api/reply/sachverhalt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rohtext, norm_familie: normFamilie }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Partial<SachverhaltResult>;
    if (
      typeof data.sachverhalt !== 'string' ||
      (data.source !== 'ki' && data.source !== 'fallback')
    ) {
      throw new Error('malformed');
    }
    return { sachverhalt: data.sachverhalt, source: data.source };
  } catch {
    // Transport failure → drop the raw text verbatim, never silent legal phrasing.
    return { sachverhalt: rohtext, source: 'fallback' };
  }
}
