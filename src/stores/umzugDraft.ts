'use client';

import { create } from 'zustand';

import type { Adresse } from '@/types';

interface WohnungsgeberDraft {
  filename: string | null;
  isDemo: boolean;
}

interface UmzugDraftState {
  neueAdresse: Adresse | null;
  stichtagIso: string | null;
  wohnungsgeber: WohnungsgeberDraft;
  setDraft: (next: {
    neueAdresse: Adresse;
    stichtagIso: string;
    wohnungsgeber: WohnungsgeberDraft;
  }) => void;
  clear: () => void;
}

const emptyWohnungsgeber: WohnungsgeberDraft = { filename: null, isDemo: false };

export const useUmzugDraft = create<UmzugDraftState>((set) => ({
  neueAdresse: null,
  stichtagIso: null,
  wohnungsgeber: emptyWohnungsgeber,
  setDraft: ({ neueAdresse, stichtagIso, wohnungsgeber }) =>
    set({ neueAdresse, stichtagIso, wohnungsgeber }),
  clear: () =>
    set({
      neueAdresse: null,
      stichtagIso: null,
      wohnungsgeber: emptyWohnungsgeber,
    }),
}));
