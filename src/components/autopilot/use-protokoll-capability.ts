'use client';

import { useEffect, useState } from 'react';

/**
 * Shared FIT-Connect capability probe (`unter-der-haube.md` § 6).
 *
 * The client NEVER sees the `FIT_CONNECT_LIVE` flag (server-only). It learns
 * liveness ONLY through the shipped `GET /api/protocol/fit-connect/capability`
 * route. HerkunftBadge, ProtokollMicroBeat and UnterDerHaubeLeiste all consume
 * this hook; the ONE fetch is memoised in a module-level promise (per page load)
 * so the three surfaces share a single request — no storm. Any error/timeout
 * resolves to `false`, quietly: never a false „echt"-signal.
 */

let capabilityPromise: Promise<boolean> | null = null;

function probeCapability(): Promise<boolean> {
  if (!capabilityPromise) {
    capabilityPromise = (async () => {
      try {
        const res = await fetch('/api/protocol/fit-connect/capability');
        if (!res.ok) return false;
        const data = (await res.json()) as { available?: boolean };
        return Boolean(data?.available);
      } catch {
        return false;
      }
    })();
  }
  return capabilityPromise;
}

/** `null` = not yet resolved; `true`/`false` = capability verdict. */
export function useProtokollCapability(): { available: boolean | null } {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void probeCapability().then((value) => {
      if (!cancelled) setAvailable(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { available };
}
