/**
 * Reply / ReplyDraft Round-Trip-Tests (V1.5).
 *
 * Coverage:
 *  - Save → fetch → Schema-Validierung
 *  - Delete → fetch returns null + Activity-Log enthält reply_draft_deleted
 *  - sendReplySimulated → status sent_simulated, kanal/sent_at gesetzt,
 *    Activity-Log enthält reply_sent_simulated. Hinweis: `receipt_text` wurde
 *    in V1.5.1 entfernt (Code-Review BLOCKER #3, 2026-05-09) — Bestätigungs-
 *    Prosa wird im Frontend aus i18n-Template gerendert.
 *  - 50-MiB-Anhang (über MAX_BYTES_PER_FILE) → MockBackendError
 *  - 25 Anhänge (über MAX_FILES) → MockBackendError
 *
 * Setup: vitest läuft in `node`-Environment. Wir injizieren ein In-Memory-
 * localStorage und ein `window`-Stub, damit die persistence-Schicht aktiv
 * wird. `?reliable=1`-Trick aus latency.ts nutzen wir, um die 5%-Fehler-
 * injektion zu deaktivieren.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import {
  LETTER_ATTACHMENT_LIMITS,
  type LetterAttachment,
  type Reply,
  type ReplyDraft,
} from '@/types';

// --------------------------------------------------------------------------
// localStorage + window Stubs (vor dem Import von api.ts!)
// --------------------------------------------------------------------------

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

beforeAll(() => {
  const storage = new MemoryStorage();
  // Reliable-Mode für Tests aktivieren (NEXT_PUBLIC_RELIABLE = '1' deaktiviert
  // die 5%-MockBackendError-Injektion in latency.ts).
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  // window-Stub mit localStorage + leerer location.search.
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: storage,
      location: { search: '' },
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
});

let api: typeof import('@/lib/mock-backend').api;
let MockBackendError: typeof import('@/lib/mock-backend').MockBackendError;
let reseedForActivePersona: typeof import('@/lib/mock-backend').reseedForActivePersona;

beforeAll(async () => {
  // Erst nach dem window-Stub laden, sonst greift die isBrowser-No-op.
  const mod = await import('@/lib/mock-backend');
  api = mod.api;
  MockBackendError = mod.MockBackendError;
  reseedForActivePersona = mod.reseedForActivePersona;
});

beforeEach(() => {
  // Vor jedem Test: Persona zurücksetzen → leerer Reply-Bucket.
  // Anna Petrov ist die Default-Persona, sie hat den neuen Termin-Vorschlag-Brief.
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  // Reply-Bucket explizit aufräumen, damit Tests sich nicht beeinflussen.
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('govtech-de:v1:letter-replies');
    window.localStorage.removeItem('govtech-de:v1:letter-activity-log');
  }
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const ANNA_LETTER = 'letter-anna-standesamt-eheschliessung-termin';

function makeAttachment(name: string, size: number, mime = 'application/pdf'): LetterAttachment {
  return {
    name,
    mime,
    size_bytes: size,
    '[MOCK]_data': '[MOCK] data:application/pdf;base64,…',
  };
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('Reply round-trip — saveReplyDraft → getReplyDraft', () => {
  test('persisted draft has expected shape and validates', async () => {
    const saved = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'termin_antwort',
      mode: 'bestaetigen',
      body_de:
        'Sehr geehrte Damen und Herren,\n\nich bestätige hiermit den vorgeschlagenen Trauungstermin am 22.06.2026, 14:00 Uhr.\n\nMit freundlichen Grüßen',
      attachments: [],
    });

    expect(saved).toMatchObject({
      letter_id: ANNA_LETTER,
      status: 'draft',
      template_id: 'termin_antwort',
      mode: 'bestaetigen',
      sent_at: null,
      kanal: null,
    });
    // V1.5.1: receipt_text ist optional/deprecated — neue Drafts setzen es nicht.
    expect(saved.receipt_text).toBeUndefined();
    expect(saved.id).toMatch(/^reply-/);
    expect(saved.created_at).toBeTruthy();
    expect(saved.updated_at).toBeTruthy();

    const fetched = await api.getReplyDraft(ANNA_LETTER);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(saved.id);
    expect(fetched?.body_de).toBe(saved.body_de);
  });

  test('idempotent on rapid double-save (upsert semantics)', async () => {
    const a = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'frist_verlaengerung',
      body_de: 'erste Version',
    });
    const b = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'frist_verlaengerung',
      body_de: 'zweite Version',
    });

    expect(b.id).toBe(a.id);
    expect(b.body_de).toBe('zweite Version');
    expect(b.created_at).toBe(a.created_at);
  });

  test('freitext mode (template_id: null) does not require mode', async () => {
    const saved = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: null,
      body_de: 'Eigener Text der Bürgerin.',
    });
    expect(saved.template_id).toBeNull();
    expect(saved.mode).toBeUndefined();
  });
});

describe('Reply round-trip — deleteReplyDraft', () => {
  test('delete removes draft and writes reply_draft_deleted activity', async () => {
    await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'nachweis_einreichen',
      body_de: 'Anbei finden Sie den Nachweis.',
    });
    expect(await api.getReplyDraft(ANNA_LETTER)).not.toBeNull();

    await api.deleteReplyDraft(ANNA_LETTER);

    expect(await api.getReplyDraft(ANNA_LETTER)).toBeNull();

    const activity = await api.getLetterAktivitaet(ANNA_LETTER);
    const aktionen = activity.map((e) => e.event);
    expect(aktionen).toContain('reply_draft_deleted');
  });

  test('delete on a non-existing draft is a no-op (no throw)', async () => {
    await expect(api.deleteReplyDraft(ANNA_LETTER)).resolves.toBeUndefined();
  });
});

describe('Reply round-trip — sendReplySimulated', () => {
  test('flips status to sent_simulated, sets kanal + sent_at (no stored receipt_text)', async () => {
    const draft = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'termin_antwort',
      mode: 'bestaetigen',
      body_de: 'Termin bestätigt.',
      attachments: [],
    });

    const sent = await api.sendReplySimulated(ANNA_LETTER, draft);

    expect(sent.status).toBe('sent_simulated');
    expect(sent.sent_at).toBeTruthy();
    expect(sent.kanal).toBeTruthy();
    // V1.5.1 (Code-Review BLOCKER #3): receipt_text wird nicht mehr persistiert.
    // Bestätigungs-Prosa rendert das Frontend aus kanal + sent_at + i18n-Template
    // (posteingang.compose.confirmation.full_receipt_template).
    expect(sent.receipt_text).toBeUndefined();

    // Standesamt Berlin Mitte ist `kommune` → Service-Portal des Bundeslandes.
    expect(sent.kanal).toBe('Service-Portal des Bundeslandes');

    const activity = await api.getLetterAktivitaet(ANNA_LETTER);
    const aktionen = activity.map((e) => e.event);
    expect(aktionen).toContain('reply_sent_simulated');

    // After send, getReplyByLetterId returns the sent reply
    const persisted = await api.getReplyByLetterId(ANNA_LETTER);
    expect(persisted?.status).toBe('sent_simulated');
    // getReplyDraft returns null because status is no longer 'draft'
    expect(await api.getReplyDraft(ANNA_LETTER)).toBeNull();
  });
});

describe('Reply round-trip — ELSTER attachment limits', () => {
  test('attachment > MAX_BYTES_PER_FILE (e.g. 50 MB) throws REPLY_ATTACHMENT_TOO_LARGE', async () => {
    const draft = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'nachweis_einreichen',
      body_de: 'Anbei.',
      attachments: [],
    });

    const oversizeDraft: ReplyDraft = {
      ...draft,
      attachments: [makeAttachment('huge.pdf', 50 * 1024 * 1024)],
    };

    await expect(api.sendReplySimulated(ANNA_LETTER, oversizeDraft)).rejects.toThrow(
      MockBackendError,
    );
    try {
      await api.sendReplySimulated(ANNA_LETTER, oversizeDraft);
    } catch (err) {
      expect(err).toBeInstanceOf(MockBackendError);
      expect((err as InstanceType<typeof MockBackendError>).code).toBe(
        'REPLY_ATTACHMENT_TOO_LARGE',
      );
    }
  });

  test('count > MAX_FILES (25 attachments) throws REPLY_ATTACHMENT_TOO_MANY', async () => {
    const draft = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'nachweis_einreichen',
      body_de: 'Anbei.',
      attachments: [],
    });

    const tooMany: ReplyDraft = {
      ...draft,
      attachments: Array.from({ length: 25 }, (_, i) =>
        makeAttachment(`scan-${i}.pdf`, 100 * 1024),
      ),
    };

    await expect(api.sendReplySimulated(ANNA_LETTER, tooMany)).rejects.toThrow(
      MockBackendError,
    );
    try {
      await api.sendReplySimulated(ANNA_LETTER, tooMany);
    } catch (err) {
      expect(err).toBeInstanceOf(MockBackendError);
      expect((err as InstanceType<typeof MockBackendError>).code).toBe(
        'REPLY_ATTACHMENT_TOO_MANY',
      );
    }
  });

  test('total bytes > MAX_BYTES_TOTAL (5 × 8 MB = 40 MB) throws REPLY_ATTACHMENT_TOO_LARGE', async () => {
    const draft = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'nachweis_einreichen',
      body_de: 'Anbei.',
      attachments: [],
    });

    const overTotal: ReplyDraft = {
      ...draft,
      attachments: Array.from({ length: 5 }, (_, i) =>
        makeAttachment(`scan-${i}.pdf`, 8 * 1024 * 1024),
      ),
    };

    await expect(api.sendReplySimulated(ANNA_LETTER, overTotal)).rejects.toThrow(
      MockBackendError,
    );
  });

  test('disallowed MIME (text/plain) throws REPLY_ATTACHMENT_MIME_INVALID', async () => {
    const draft = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'nachweis_einreichen',
      body_de: 'Anbei.',
      attachments: [],
    });

    const wrongMime: ReplyDraft = {
      ...draft,
      attachments: [makeAttachment('scan.txt', 1024, 'text/plain')],
    };

    await expect(api.sendReplySimulated(ANNA_LETTER, wrongMime)).rejects.toThrow(
      MockBackendError,
    );
    try {
      await api.sendReplySimulated(ANNA_LETTER, wrongMime);
    } catch (err) {
      expect(err).toBeInstanceOf(MockBackendError);
      expect((err as InstanceType<typeof MockBackendError>).code).toBe(
        'REPLY_ATTACHMENT_MIME_INVALID',
      );
    }
  });

  test('boundary: exactly MAX_BYTES_PER_FILE per file is allowed', async () => {
    const draft = await api.saveReplyDraft(ANNA_LETTER, {
      template_id: 'nachweis_einreichen',
      body_de: 'Anbei.',
      attachments: [],
    });

    const okDraft: ReplyDraft = {
      ...draft,
      attachments: [
        makeAttachment('scan.pdf', LETTER_ATTACHMENT_LIMITS.MAX_BYTES_PER_FILE),
      ],
    };
    const sent: Reply = await api.sendReplySimulated(ANNA_LETTER, okDraft);
    expect(sent.status).toBe('sent_simulated');
  });
});
