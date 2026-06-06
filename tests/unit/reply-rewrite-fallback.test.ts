/**
 * KI-Umformulieren — graceful offline fallback
 * (posteingang-antwort-verfassen-reskin.md §4.3).
 *
 * Pins the HARD guarantee that the demo never breaks offline: with no
 * `ANTHROPIC_API_KEY` set, `rewriteReplyBody` returns the ORIGINAL body
 * unchanged with `source: 'fallback'` and never throws — purely, no network.
 *
 * Also confirms the new `REPLY_REWRITE_RATE_LIMIT` bucket + `maxReplyBodyChars`
 * cap exist (the route relies on both), and that the action union type-checks.
 *
 * Pure functions, no localStorage/window/network — vitest `node` env.
 */
import { beforeEach, describe, expect, test } from 'vitest';

import { CAPS, REPLY_REWRITE_RATE_LIMIT } from '@/lib/ai/rate-limit';
import {
  rewriteReplyBody,
  type ReplyRewriteAction,
} from '@/lib/ai/reply-rewrite';

beforeEach(() => {
  // Force the no-key path: `getAnthropicClient()` reads `process.env` lazily,
  // so deleting the var here exercises the offline fallback without any
  // network call. (The SDK client is never constructed.)
  delete process.env.ANTHROPIC_API_KEY;
});

describe('rewriteReplyBody — offline fallback (no API key)', () => {
  const ORIGINAL =
    'Sehr geehrte Damen und Herren,\n\nbezugnehmend auf Ihr Schreiben (Az. ABC-123/2026) teile ich Ihnen meine neue Anschrift mit.\n\nMit freundlichen Grüßen';

  const ACTIONS: ReplyRewriteAction[] = [
    'umformulieren',
    'kuerzer',
    'formeller',
    'einfacher',
  ];

  test('returns the original body unchanged with source:"fallback"', async () => {
    const result = await rewriteReplyBody({
      body: ORIGINAL,
      action: 'umformulieren',
    });
    expect(result.source).toBe('fallback');
    expect(result.body).toBe(ORIGINAL);
  });

  test('every action falls back to the unchanged original when the key is unset', async () => {
    for (const action of ACTIONS) {
      const result = await rewriteReplyBody({ body: ORIGINAL, action });
      expect(result.source).toBe('fallback');
      expect(result.body).toBe(ORIGINAL);
    }
  });

  test('never throws — resolves cleanly even with no key', async () => {
    await expect(
      rewriteReplyBody({ body: ORIGINAL, action: 'formeller' }),
    ).resolves.toMatchObject({ source: 'fallback' });
  });

  test('an empty body short-circuits to fallback (no spend, no throw)', async () => {
    const result = await rewriteReplyBody({ body: '   ', action: 'kuerzer' });
    expect(result.source).toBe('fallback');
    expect(result.body).toBe('   ');
  });
});

describe('rate-limit additive exports for /api/reply/rewrite', () => {
  test('REPLY_REWRITE_RATE_LIMIT bucket exists with a sane budget', () => {
    expect(REPLY_REWRITE_RATE_LIMIT).toBeDefined();
    expect(REPLY_REWRITE_RATE_LIMIT.limit).toBeGreaterThan(0);
    expect(REPLY_REWRITE_RATE_LIMIT.windowMs).toBeGreaterThan(0);
  });

  test('CAPS.maxReplyBodyChars caps the rewrite body', () => {
    expect(CAPS.maxReplyBodyChars).toBeGreaterThan(0);
    // Comfortable for a real Behörden-Antwort (a page or two of plain text).
    expect(CAPS.maxReplyBodyChars).toBeGreaterThanOrEqual(4_000);
  });
});
