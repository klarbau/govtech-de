import { create } from 'zustand';

interface PosteingangSearchState {
  query: string;
  setQuery: (q: string) => void;
}

/**
 * Cross-tree bridge for the Posteingang search box. The mockup puts search in
 * the app header (`PosteingangTopSearch`, hosted in the global `TopNav`) while
 * the list it filters lives in `PosteingangInbox`, rendered as the route's page
 * children — siblings across the app-shell boundary that cannot share React
 * state directly. This module-level Zustand store connects them without
 * threading props through the layout. Only /posteingang reads or writes it.
 */
export const usePosteingangSearch = create<PosteingangSearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));
