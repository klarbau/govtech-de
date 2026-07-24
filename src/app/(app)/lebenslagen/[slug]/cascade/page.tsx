'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

/**
 * Redirect-Shim. Die frühere Kaskaden-Ansicht ist entfallen — engine-gelaufene
 * Lebenslagen werden auf der kanonischen Akte `/vorgaenge/[id]` gezeigt. Alt-URLs
 * leiten hierher weiter: mit `?vorgangId` auf die Akte (`?reliable=1`
 * durchgereicht), ohne auf die Leistungsseite. Kein UI.
 */
function CascadeRedirect() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug ?? '';
  const vorgangId = searchParams?.get('vorgangId') ?? null;
  const reliable = searchParams?.get('reliable') === '1';

  useEffect(() => {
    if (vorgangId) {
      router.replace(
        `/vorgaenge/${encodeURIComponent(vorgangId)}${reliable ? '?reliable=1' : ''}`,
      );
    } else {
      router.replace(`/lebenslagen/${encodeURIComponent(slug)}`);
    }
  }, [vorgangId, reliable, slug, router]);

  return null;
}

export default function CascadeRedirectPage() {
  return (
    <Suspense fallback={null}>
      <CascadeRedirect />
    </Suspense>
  );
}
