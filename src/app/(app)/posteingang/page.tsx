import { LiquidGlassChrome } from '@/components/posteingang/LiquidGlassChrome';
import { PosteingangInbox } from '@/components/posteingang/PosteingangInbox';

export const dynamic = 'force-dynamic';

/**
 * Posteingang-Inbox. Server-Render liefert eine leere Initial-Liste; das
 * Mock-Backend lebt im `localStorage` und wird nach Hydration befüllt
 * (PosteingangInbox triggert auf Mount einen Refresh).
 *
 * `LiquidGlassChrome` applies the route-scoped Liquid-Glass skin (ambient
 * background + `data-lg` gate); the fully-wired inbox renders on top unchanged.
 */
export default function PosteingangPage() {
  return (
    <>
      <LiquidGlassChrome />
      <PosteingangInbox
        initial={{
          letters: [],
          behoerdenById: {},
          vorgaengeById: {},
          nowIso: new Date().toISOString(),
        }}
      />
    </>
  );
}
