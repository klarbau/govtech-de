import { PosteingangInbox } from '@/components/posteingang/PosteingangInbox';

export const dynamic = 'force-dynamic';

/**
 * Posteingang-Inbox. Server-Render liefert eine leere Initial-Liste; das
 * Mock-Backend lebt im `localStorage` und wird nach Hydration befüllt
 * (PosteingangInbox triggert auf Mount einen Refresh).
 */
export default function PosteingangPage() {
  return (
    <PosteingangInbox
      initial={{
        letters: [],
        behoerdenById: {},
        vorgaengeById: {},
        nowIso: new Date().toISOString(),
      }}
    />
  );
}
