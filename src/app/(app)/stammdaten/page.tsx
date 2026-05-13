import { StammdatenView } from '@/components/stammdaten/StammdatenView';
import { KontaktSektionsWrapper } from '@/components/stammdaten/kontakt/KontaktSektionsWrapper';

export const dynamic = 'force-dynamic';

/**
 * Stammdaten-Page (Spec § 6 / § 11.19).
 *
 * RSC-Wrapper, der die View-Komponente mountet. `<StammdatenHero>`
 * rendert das einzige `<h1>` der Seite (id="stammdaten-hero-title").
 * Daten werden client-seitig über `api.getStammdaten()` etc. geladen,
 * weil das Mock-Backend in `localStorage` lebt (siehe
 * `docs/architecture.md`).
 *
 * V1.2 (Kontakt-Schicht, Spec stammdaten-v1-1-kontakt-schicht.md): Sektionen
 * 6 + 7 werden via `<KontaktSektionsWrapper>` unterhalb der V1-View
 * gemountet (Tab-Filter: nur auf `?tab=profil`).
 */
export default async function StammdatenPage() {
  const nowIso = new Date().toISOString();

  return (
    <div className="flex flex-col gap-4">
      <StammdatenView nowIso={nowIso} />
      <KontaktSektionsWrapper />
    </div>
  );
}
