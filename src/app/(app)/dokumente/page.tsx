import { DokumenteView } from '@/components/dokumente/DokumenteView';

export const dynamic = 'force-dynamic';

/**
 * Dokumenten-Vault. Das Mock-Backend lebt im `localStorage` und wird erst nach
 * Hydration befüllt — die Page liefert eine leere Initial-Liste + `nowIso`,
 * `DokumenteView` lädt auf Mount via `api.getDocuments()` / `api.getBehoerden()`.
 */
export default function DokumentePage() {
  return <DokumenteView nowIso={new Date().toISOString()} />;
}
