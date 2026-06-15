'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';

import { A11yPreferencesProvider } from '@/components/providers/A11yPreferencesProvider';
import { MotionProvider } from '@/components/providers/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { seedIfEmpty, syncReliableModeFromUrl } from '@/lib/mock-backend';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Client-Boot der Mock-Backend-Schicht — läuft auf JEDER App-Seite (dieser
  // Provider umschließt alle Routen via RootLayout). Erst `seedIfEmpty` (legt
  // bei Bedarf den `meta`-Bucket an), DANN `syncReliableModeFromUrl` — so kann
  // ein Reseed das aus `?reliable=1` persistierte Sticky-Flag nicht abräumen,
  // und das Flag steht bereit, bevor die Kaskade /vorgaenge/umzug/run erreicht.
  useEffect(() => {
    try {
      seedIfEmpty();
    } catch {
      // Boot-Fehler dürfen das App-Shell-Rendering nicht blockieren.
    }
    syncReliableModeFromUrl();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <A11yPreferencesProvider>
        <MotionProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors closeButton />
          </TooltipProvider>
        </MotionProvider>
      </A11yPreferencesProvider>
    </ThemeProvider>
  );
}
