import { PosteingangInbox } from '@/components/posteingang/PosteingangInbox';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Deep-Link auf einen einzelnen Brief. Rendert dieselbe Zwei-Spalten-Inbox wie
 * `/posteingang`, nur mit dem adressierten Brief vorausgewählt. Das Mock-Backend
 * lebt im `localStorage`; die Liste wird nach Hydration befüllt und die
 * `find ?? letters[0]`-Logik wählt den Deep-Link-Brief automatisch aus.
 */
export default async function LetterDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PosteingangInbox
      initial={{
        letters: [],
        behoerdenById: {},
        vorgaengeById: {},
        nowIso: new Date().toISOString(),
      }}
      initialSelectedLetterId={id}
    />
  );
}
