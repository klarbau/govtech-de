'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Square, Volume2 } from 'lucide-react';

import { useA11yPreferences } from '@/lib/a11y/use-a11y-preferences';
import { useSpeech } from '@/lib/a11y/use-speech';

interface Anchor {
  /** Viewport-relative left of the button (already clamped). */
  left: number;
  /** Viewport-relative top of the button (already clamped). */
  top: number;
  text: string;
}

const BUTTON_WIDTH = 132;
const BUTTON_HEIGHT = 36;
const EDGE = 8;
const GAP = 8;

/** True when the node (or its ancestors) is an editable field — there a
 * selection means editing, so the read-aloud button must not appear. */
function isEditableContext(node: Node | null): boolean {
  let el: HTMLElement | null =
    node instanceof HTMLElement
      ? node
      : (node?.parentElement ?? null);
  while (el) {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

function readSelection(): Anchor | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const text = selection.toString().trim();
  if (!text) return null;

  const range = selection.getRangeAt(0);
  if (isEditableContext(range.commonAncestorContainer)) return null;

  const rect = range.getBoundingClientRect();
  // A zero-area rect means there is nothing meaningful to anchor to.
  if (rect.width === 0 && rect.height === 0) return null;

  const rawLeft = rect.left + rect.width / 2 - BUTTON_WIDTH / 2;
  const left = Math.max(
    EDGE,
    Math.min(rawLeft, window.innerWidth - BUTTON_WIDTH - EDGE),
  );

  // Prefer just above the selection; fall back to just below if it would
  // clip the top of the viewport.
  let top = rect.top - BUTTON_HEIGHT - GAP;
  if (top < EDGE) {
    top = Math.min(
      rect.bottom + GAP,
      window.innerHeight - BUTTON_HEIGHT - EDGE,
    );
  }

  return { left, top, text };
}

/**
 * Opt-in floating "Vorlesen" button for the current text selection. Renders
 * nothing unless the user enabled `selectionReadAloud` AND the on-device Web
 * Speech engine is available. It never steals focus, never traps focus, and
 * leaves native copy / context-menu untouched. Mounted in the authed app shell
 * only — see `(app)/layout.tsx`.
 */
export function SelectionVorlesen() {
  const t = useTranslations('a11y');
  const { selectionReadAloud } = useA11yPreferences();
  const speech = useSpeech();
  const pathname = usePathname();

  const enabled = selectionReadAloud && speech.supported;

  const [anchor, setAnchor] = React.useState<Anchor | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const hide = React.useCallback(() => {
    setAnchor(null);
    speech.stop();
  }, [speech]);

  // Re-evaluate the current selection (debounced via the caller). Keeping the
  // button mounted while the user adjusts a selection would re-fire constantly,
  // so we recompute the anchor each time and let React reconcile.
  const refresh = React.useCallback(() => {
    if (containerRef.current) {
      const active = document.activeElement;
      // A selection change triggered by interacting with our own button must
      // not collapse the popover.
      if (active && containerRef.current.contains(active)) return;
    }
    setAnchor(readSelection());
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      setAnchor(null);
      return;
    }

    const scheduleRefresh = () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        refresh();
      }, 120);
    };

    const onSelectionChange = () => scheduleRefresh();
    const onPointerUp = () => scheduleRefresh();
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
        return;
      }
      scheduleRefresh();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && containerRef.current.contains(target)) {
        return;
      }
      // A press outside both the button and an active selection clears it.
      hide();
    };
    // Selection geometry is viewport-relative; any scroll/resize invalidates it.
    const onViewportChange = () => hide();

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [enabled, refresh, hide]);

  // Clear on route change and when the pref is turned off mid-session.
  React.useEffect(() => {
    setAnchor(null);
    speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!enabled || !anchor) return null;

  const speaking = speech.status === 'playing' || speech.status === 'paused';

  const handleClick = () => {
    if (speaking) {
      speech.stop();
    } else {
      speech.play(anchor.text);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{ left: anchor.left, top: anchor.top }}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={speaking ? t('vorlesen.stop') : t('selection.read')}
        title={t('vorlesen.privacy')}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-text-primary shadow-md transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        {speaking ? (
          <Square className="size-4" aria-hidden="true" />
        ) : (
          <Volume2 className="size-4" aria-hidden="true" />
        )}
        {speaking ? t('vorlesen.stop') : t('vorlesen.play')}
      </button>
      <span className="sr-only">{t('vorlesen.privacy')}</span>
    </div>
  );
}
