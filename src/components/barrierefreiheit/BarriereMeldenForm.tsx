'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

/**
 * „Barriere melden"-Formular der Erklärung zur Barrierefreiheit (Spec §4.3 ⟦C2⟧).
 *
 * Rein clientseitig: KEIN `api.*`, kein Netzwerk, keine Persistenz. Der Submit
 * zeigt nur die Bestätigung an und leert die Felder; die Bestätigung sagt
 * explizit, dass in dieser Demo nichts gesendet oder gespeichert wird. Fokus
 * landet nach dem Absenden auf der Bestätigung.
 */
export function BarriereMeldenForm() {
  const t = useTranslations('barrierefreiheit.melden');
  const [submitted, setSubmitted] = React.useState(false);
  const [beschreibung, setBeschreibung] = React.useState('');
  const [seite, setSeite] = React.useState('');
  const [kontakt, setKontakt] = React.useState('');
  const confirmationRef = React.useRef<HTMLParagraphElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBeschreibung('');
    setSeite('');
    setKontakt('');
    setSubmitted(true);
  };

  React.useEffect(() => {
    if (submitted) confirmationRef.current?.focus();
  }, [submitted]);

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p
          ref={confirmationRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm leading-relaxed text-text-primary"
        >
          {t('confirmation')}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSubmitted(false)}
        >
          {t('reset')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="baf-beschreibung"
          className="text-sm font-medium text-text-primary"
        >
          {t('beschreibung_label')}
        </label>
        <textarea
          id="baf-beschreibung"
          required
          rows={4}
          value={beschreibung}
          onChange={(event) => setBeschreibung(event.target.value)}
          placeholder={t('beschreibung_placeholder')}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="baf-seite"
          className="text-sm font-medium text-text-primary"
        >
          {t('seite_label')}
        </label>
        <input
          id="baf-seite"
          type="text"
          value={seite}
          onChange={(event) => setSeite(event.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="baf-kontakt"
          className="text-sm font-medium text-text-primary"
        >
          {t('kontakt_label')}
        </label>
        <input
          id="baf-kontakt"
          type="email"
          value={kontakt}
          onChange={(event) => setKontakt(event.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary"
        />
      </div>

      <Button type="submit" className="w-fit">
        {t('submit')}
      </Button>
    </form>
  );
}
