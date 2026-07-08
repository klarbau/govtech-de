import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
import { PosteingangInbox } from '@/components/posteingang/PosteingangInbox';

export const dynamic = 'force-dynamic';

/**
 * Posteingang-Inbox. Server-Render liefert eine leere Initial-Liste; das
 * Mock-Backend lebt im `localStorage` und wird nach Hydration befüllt
 * (PosteingangInbox triggert auf Mount einen Refresh).
 *
 * The app-wide Liquid-Glass shell is set in `(app)/layout.tsx`;
 * `LiquidGlassScreen` marks this route (`data-lg-screen='posteingang'`) so the
 * inbox/reader-specific 100vh archive model applies here only.
 */
export default function PosteingangPage() {
  return (
    <>
      <LiquidGlassScreen name="posteingang" />
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
