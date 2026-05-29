/**
 * Server-Session-Auflösung für die HTTP-Mock-Backend-Routen (Stage 2).
 *
 * Jede Browser-Session bekommt eine eigene `sessionId` (Cookie `mock_sid`) und
 * damit einen eigenen In-Memory-Store + Event-Bus auf dem Server. So sind
 * parallele Demo-Sessions (mehrere Tabs / Nutzer:innen) vollständig isoliert,
 * ohne dass irgendetwas im Browser-localStorage liegt.
 *
 * Cookie-Eigenschaften:
 *   - `httpOnly`  — kein JS-Zugriff; reine Session-Korrelation.
 *   - `sameSite: 'lax'` — same-origin-Fetches (unser Fall) tragen das Cookie.
 *   - `path: '/'` — gilt für `/api/mock` UND `/api/mock/events`.
 *   - kein `secure`-Hardcoding: in Prod (HTTPS) setzt Next/Browser es ohnehin
 *     sinnvoll; auf `http://localhost` würde `secure` das Cookie verschlucken.
 *
 * `cookies()` (next/headers) ist nur innerhalb des Request-Scopes verfügbar.
 * Lesen geht immer; Schreiben (`.set`) ist in Route-Handlern erlaubt — wir
 * setzen das Cookie zusätzlich als `Set-Cookie`-Header auf der `NextResponse`,
 * damit es auch dann ausgeliefert wird, wenn die Antwort ein Stream ist
 * (SSE-Route).
 */
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

/** Cookie-Name der Server-Session. Stage 3 (Client) muss denselben Namen kennen. */
export const SESSION_COOKIE_NAME = 'mock_sid';

/** Maximale Cookie-Lebensdauer (30 Tage) — reine Demo-Bequemlichkeit. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface ResolvedSession {
  sessionId: string;
  /** `true`, wenn in diesem Request neu erzeugt → Set-Cookie nötig. */
  isNew: boolean;
}

/**
 * Liest `mock_sid` aus dem Request-Cookie oder erzeugt eine neue ID.
 * Setzt das Cookie NICHT selbst auf die Response — der Aufrufer entscheidet das
 * (für Stream-Antworten via `attachSessionCookie`). Wir versuchen zusätzlich,
 * es über den `cookies()`-Store zu setzen (best effort), was für JSON-Antworten
 * ausreicht.
 */
export async function resolveSession(): Promise<ResolvedSession> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE_NAME)?.value;
  if (existing && existing.length > 0) {
    return { sessionId: existing, isNew: false };
  }
  const sessionId = crypto.randomUUID();
  try {
    jar.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
  } catch {
    // Manche Render-Pfade verbieten Cookie-Schreiben über den Store; der
    // Aufrufer setzt dann den Set-Cookie-Header explizit (s. attachSessionCookie).
  }
  return { sessionId, isNew: true };
}

/**
 * Hängt das Session-Cookie als `Set-Cookie`-Header an eine (ggf. Stream-)
 * Response. Robuster Pfad für SSE, wo der `cookies()`-Store-Write nicht
 * zuverlässig in die Streaming-Response gelangt.
 */
export function attachSessionCookie(
  res: NextResponse,
  sessionId: string,
): NextResponse {
  res.cookies.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
  return res;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
