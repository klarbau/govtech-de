import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
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
 *
 * `LiquidGlassScreen name="posteingang"` markiert die Route mit demselben
 * Screen-Scope wie die Inbox-Page — der Standalone-Reader ist Zeichen für
 * Zeichen dasselbe `PosteingangInbox`-Markup (Archiv-Layout, Internal-Scroll-
 * Modell, Reader-Panel), also greift dieselbe verifizierte
 * `posteingang-liquid-glass.css` unverändert. Ohne diesen Gate blieb der
 * Direktaufruf ungestylt (die `lg-*`-Klassen sind alle unter
 * `html[data-lg][data-lg-screen='posteingang']` definiert).
 */
export default async function LetterDetailPage({ params }: PageProps) {
  const { id } = await params;
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
        initialSelectedLetterId={id}
      />
    </>
  );
}
