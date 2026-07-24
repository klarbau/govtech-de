'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Redirect-Shim. Die frühere Autopilot-Run-Ansicht ist entfallen — jede
 * Vorgangs-Ansicht läuft über die kanonische Akte `/vorgaenge/[id]`. Alt-URLs
 * (offene Tabs, Bookmarks, e2e-Direktnavigationen) leiten hierher weiter:
 * mit `?vorgangId` auf die Akte (`?reliable=1` durchgereicht), ohne auf den
 * Wizard. Kein UI.
 */
function UmzugRunRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vorgangId = searchParams?.get('vorgangId') ?? null;
  const reliable = searchParams?.get('reliable') === '1';

  useEffect(() => {
    if (vorgangId) {
      router.replace(
        `/vorgaenge/${encodeURIComponent(vorgangId)}${reliable ? '?reliable=1' : ''}`,
      );
    } else {
      router.replace('/vorgaenge/umzug/start');
    }
  }, [vorgangId, reliable, router]);

  return null;
}

export default function UmzugRunPage() {
  return (
    <Suspense fallback={null}>
      <UmzugRunRedirect />
    </Suspense>
  );
}
