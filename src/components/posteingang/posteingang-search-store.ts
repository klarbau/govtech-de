import { create } from 'zustand';

interface PosteingangSearchState {
  query: string;
  setQuery: (q: string) => void;
}

/**
 * Backing store for the Posteingang in-list search field. Since the app-wide
 * „Suchen ⌘K" pill was generalised into `GlobalSearch` (which navigates
 * rather than filtering the inbox), this store is written and read only by the
 * in-list search field in `PosteingangInbox` to filter the letter list. It is
 * kept as a module-level Zustand store (rather than local `useState`) so the
 * query survives the field's re-renders. Only /posteingang uses it.
 */
export const usePosteingangSearch = create<PosteingangSearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));
