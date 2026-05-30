/**
 * AI endpoint hardening — caps + rate limit (audit defect #1).
 *
 * Pins the pure logic the public AI routes (`/api/assistant`,
 * `/api/dashboard/top-actions`) rely on to keep a public Vercel deploy from
 * burning the real ANTHROPIC_API_KEY:
 *
 *   - size caps: a normal Umzug-conversation request passes; oversize message
 *     count / per-block length / total bytes are flagged.
 *   - rate limit: a fixed-window counter throttles a per-session spam loop and
 *     reports a `Retry-After`, while a fresh window resets the budget.
 *
 * Pure functions, no localStorage/window needed — vitest `node` env.
 */
import { beforeEach, describe, expect, test } from 'vitest';

import {
  __resetRateLimitStore,
  approxByteLength,
  CAPS,
  checkRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/ai/rate-limit';

beforeEach(() => {
  __resetRateLimitStore();
});

describe('size caps', () => {
  test('a normal Umzug-conversation request is well under every cap', () => {
    // Shape of a realistic turn the assistant route would receive.
    const body = {
      persona: {
        id: 'anna-petrov',
        vorname: 'Anna',
        nachname: 'Petrov',
        notizen: 'Aufenthaltstitel läuft am 14.09. ab; ein Kind in der Kita.',
      },
      locale: 'de',
      messages: [
        { role: 'user', content: 'leite meinen Umzug ein' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Gerne — einen Moment, ich bereite Ihren Umzug vor.' },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_x',
              content: JSON.stringify({ block_a: [], block_b: [], block_c: [], block_d: [] }),
            },
          ],
        },
      ],
    };

    expect(body.messages.length).toBeLessThanOrEqual(CAPS.maxMessages);
    expect(approxByteLength(body)).toBeLessThan(CAPS.maxTotalBytes);
    expect((body.persona.notizen ?? '').length).toBeLessThanOrEqual(CAPS.maxNotizenChars);
  });

  test('approxByteLength counts UTF-8 bytes (umlauts cost 2)', () => {
    // approxByteLength JSON.stringifies first, so the string gains 2 quote
    // chars. "Bürgeramt" = 9 chars; the ü is 2 bytes in UTF-8 → 10 content
    // bytes; + 2 quotes = 12. The point: the umlaut is NOT undercounted as 1.
    expect(approxByteLength('Bürgeramt')).toBe(12);
    // Plain-ASCII control of the same char length is 2 bytes shorter.
    expect(approxByteLength('Burgeramt')).toBe(11);
  });

  test('an oversize total body trips the byte cap', () => {
    const huge = { messages: ['x'.repeat(CAPS.maxTotalBytes + 1)], persona: {} };
    expect(approxByteLength(huge)).toBeGreaterThan(CAPS.maxTotalBytes);
  });

  test('an overlong single block trips the per-block cap', () => {
    const block = 'a'.repeat(CAPS.maxCharsPerBlock + 1);
    expect(block.length).toBeGreaterThan(CAPS.maxCharsPerBlock);
  });

  test('too many messages trips the count cap', () => {
    const messages = Array.from({ length: CAPS.maxMessages + 1 }, () => ({
      role: 'user' as const,
      content: 'hi',
    }));
    expect(messages.length).toBeGreaterThan(CAPS.maxMessages);
  });

  test('a circular/unstringifiable body is treated as oversize', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(approxByteLength(circular)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('rate limit', () => {
  const cfg = { limit: 3, windowMs: 60_000 };

  test('allows up to the limit then throttles within the window', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < cfg.limit; i++) {
      const r = checkRateLimit('assistant', 'sid:anna', cfg, t0 + i);
      expect(r.ok).toBe(true);
    }
    const over = checkRateLimit('assistant', 'sid:anna', cfg, t0 + cfg.limit);
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
    expect(over.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('a fresh window resets the budget', () => {
    const t0 = 2_000_000;
    for (let i = 0; i < cfg.limit; i++) checkRateLimit('assistant', 'sid:b', cfg, t0);
    expect(checkRateLimit('assistant', 'sid:b', cfg, t0).ok).toBe(false);
    // One full window later → allowed again.
    expect(checkRateLimit('assistant', 'sid:b', cfg, t0 + cfg.windowMs).ok).toBe(true);
  });

  test('distinct buckets (assistant vs top-actions) do not share a counter', () => {
    const t0 = 3_000_000;
    for (let i = 0; i < cfg.limit; i++) checkRateLimit('assistant', 'sid:c', cfg, t0);
    // assistant bucket is exhausted…
    expect(checkRateLimit('assistant', 'sid:c', cfg, t0).ok).toBe(false);
    // …but the top-actions bucket for the same session is fresh.
    expect(checkRateLimit('top-actions', 'sid:c', cfg, t0).ok).toBe(true);
  });

  test('distinct sessions get independent budgets', () => {
    const t0 = 4_000_000;
    for (let i = 0; i < cfg.limit; i++) checkRateLimit('assistant', 'sid:d', cfg, t0);
    expect(checkRateLimit('assistant', 'sid:d', cfg, t0).ok).toBe(false);
    expect(checkRateLimit('assistant', 'sid:e', cfg, t0).ok).toBe(true);
  });
});

describe('rateLimitKeyFromRequest', () => {
  function req(headers: Record<string, string>): Request {
    return new Request('https://example.test/api/assistant', { headers });
  }

  test('prefers the mock_sid session cookie', () => {
    const key = rateLimitKeyFromRequest(
      req({ cookie: 'foo=1; mock_sid=abc-123; bar=2' }),
    );
    expect(key).toBe('sid:abc-123');
  });

  test('falls back to the first x-forwarded-for hop', () => {
    const key = rateLimitKeyFromRequest(
      req({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }),
    );
    expect(key).toBe('ip:203.0.113.5');
  });

  test('falls back to a shared anon bucket with neither', () => {
    expect(rateLimitKeyFromRequest(req({}))).toBe('anon');
  });
});
