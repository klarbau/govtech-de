import { create } from 'zustand';

interface GlobalSearchState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * Cross-tree bridge for the app-wide search — v1.1 uses it only for the MOBILE
 * search bar. The magnifier (`GlobalSearchMobileButton`) and the search bar
 * (rendered by `GlobalSearch`) sit in different branches of the `TopNav`; this
 * module-level Zustand store lets the magnifier drop the bar without threading
 * props through the layout (precedent: `posteingang-search-store.ts`). The
 * desktop pill's focus/expand + dropdown state is local to `GlobalSearch`.
 */
export const useGlobalSearch = create<GlobalSearchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
