import { getTranslations } from 'next-intl/server';

interface StammdatenLayoutProps {
  children: React.ReactNode;
}

/**
 * Stammdaten-Layout. Tab-Switch (Mein Profil / Wallet & Externe Empfänger)
 * rendert die Page-Komponente selbst, weil sie Client-State (Search-Param-Sync)
 * braucht.
 */
export default async function StammdatenLayout({
  children,
}: StammdatenLayoutProps) {
  const tNav = await getTranslations('nav');

  return (
    <div className="flex flex-col gap-4">
      <span className="sr-only">{tNav('stammdaten')}</span>
      {children}
    </div>
  );
}
