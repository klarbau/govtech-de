import Link from 'next/link';
import { Info } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/shared/IconCircle';

export function IdentitaetSpekulativeNote() {
  return (
    <Card className="gap-3 border-transparent bg-accent-soft p-5">
      <div className="flex items-start gap-3">
        <IconCircle
          icon={<Info aria-hidden="true" />}
          tone="primary"
          size="md"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">
            Hinweis: Dies ist eine spekulative Demo
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Reale DeutschlandID- und EUDI-Wallet-Integrationen sind nicht
            aktiv. Alle Daten sind synthetisch (markiert mit [MOCK]) und
            werden ausschliesslich lokal in Ihrem Browser verarbeitet — keine
            Übermittlung an echte Behörden.
          </p>
          <Link
            href="/datenschutz"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span>Mehr erfahren</span>
            <span aria-hidden="true">›</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
