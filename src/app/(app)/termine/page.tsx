import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
import { TermineView } from '@/components/termine/TermineView';

export const dynamic = 'force-dynamic';

/**
 * Termine — Behördentermine, Erinnerungen & Buchungen. Das Mock-Backend lebt
 * im `localStorage`; `TermineView` lädt auf Mount via `api`. Die Page reicht
 * nur einen SSR-stabilen Demo-`nowIso` durch.
 *
 * `LiquidGlassScreen` markiert die Route (`data-lg-screen='termine'`) für die
 * Termine-Glasflächen (termine-liquid-glass.css) — mehrere Klassen hier sind mit
 * anderen Routen geteilt (`.vr-card` → Assistent/Dashboard, `.vg-search-input` →
 * /vorgaenge), das Screen-Gate hält jede Regel auf /termine.
 */
export default function TerminePage() {
  return (
    <>
      <LiquidGlassScreen name="termine" />
      <TermineView nowIso={new Date().toISOString()} />
    </>
  );
}
