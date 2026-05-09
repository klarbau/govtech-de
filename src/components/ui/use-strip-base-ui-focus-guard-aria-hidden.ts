'use client';

import * as React from 'react';

/**
 * WORKAROUND for `@base-ui/react@1.4.1` (current latest, 2026-05-09):
 * `<FocusGuard>` sentinels (`[data-base-ui-focus-guard]`) are rendered with
 * both `aria-hidden="true"` and `tabindex="0"` on non-Safari browsers, which
 * trips axe-core's `aria-hidden-focus` rule (WCAG 4.1.2). The guards are
 * intentionally focusable to detect Tab-out from a portal, but they should
 * not be `aria-hidden` — focusable hidden elements are an a11y anti-pattern.
 *
 * We strip the attribute after mount once the open state goes truthy.
 * The guards remain functional (focus still routes through them) and are
 * still visually hidden via inline `style="visibility:hidden"`.
 *
 * TODO(post-V1.5): track upstream issue + remove this hook once base-ui
 *   ships a fix. Keep the hook for graceful degradation.
 */
export function useStripBaseUiFocusGuardAriaHidden(active: boolean): void {
  React.useEffect(() => {
    if (!active) return;
    if (typeof document === 'undefined') return;

    function strip() {
      const guards = document.querySelectorAll<HTMLElement>(
        '[data-base-ui-focus-guard][aria-hidden="true"]',
      );
      guards.forEach((el) => {
        el.removeAttribute('aria-hidden');
      });
    }

    strip();

    const observer = new MutationObserver(() => strip());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-base-ui-focus-guard'],
    });
    return () => observer.disconnect();
  }, [active]);
}
