import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarClock, MapPin, Video } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { Behoerde, Termin } from '@/types';

interface TerminCardProps {
  termin: Termin;
  behoerde: Pick<Behoerde, 'name_de'>;
}

export function TerminCard({ termin, behoerde }: TerminCardProps) {
  const date = parseISO(termin.datum);
  const dateLabel = format(date, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", {
    locale: de,
  });
  const Icon = termin.ort.typ === 'video' ? Video : MapPin;

  return (
    <Card size="sm" className="border-l-4 border-l-primary/60">
      <CardContent className="flex items-start gap-3">
        <CalendarClock
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {behoerde.name_de}
          </p>
          <p className="text-xs text-muted-foreground">{termin.betreff}</p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={termin.datum}>{dateLabel}</time>
          </p>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className="size-3" aria-hidden="true" />
            <span>{termin.ort.details}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
