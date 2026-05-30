'use client';

import * as React from 'react';

/**
 * WORKAROUND for `@base-ui/react@1.5.0`: when a modal Dialog/AlertDialog/Sheet is
 * open, base-ui contains the background by setting `aria-hidden="true"` on every
 * element outside the popup — but NOT the real `inert` attribute. `aria-hidden`
 * removes nodes from the accessibility tree, yet leaves them in the Tab order, so
 * keyboard focus can still escape the modal into the skip-link / header / sidebar
 * (WCAG 2.4.3 Focus Order + 4.1.2; BITV 2.0). base-ui's FocusGuard sentinels pull
 * focus back eventually, so it is recoverable rather than a hard trap — but it is a
 * real focus-containment defect, and several leaking modals gate consent actions
 * (Versand, eID, DSGVO).
 *
 * base-ui already marks exactly the background elements with a `data-base-ui-inert`
 * marker attribute (see `floating-ui-react/utils/markOthers.js`: the marker set is
 * everything OUTSIDE `[floating, ...portalNodes]`, so the modal's own popup and
 * portal are never marked). We promote that marker to the real `inert` property,
 * which makes the background both untabbable AND removed from the a11y tree, and
 * remove it again on close.
 *
 * Correctness:
 * - `inert` lands only on `[data-base-ui-inert]` (the background), never on the
 *   modal popup — base-ui excludes the popup + portal from the marker set.
 * - Nested modals: the most-recently-opened modal's popup is excluded from the
 *   newest marker set, so its controls stay interactive while ancestors go inert.
 * - Cleanup: when `open` flips false (or the component unmounts) we clear the
 *   `inert` property from any element we set it on, so the app is never left inert.
 * - SSR-safe: all DOM access is inside `useEffect`, guarded on `document`.
 *
 * TODO(post-V1.5): remove once base-ui ships real-`inert` background containment.
 */
export function useInertOutsideModal(open: boolean): void {
  React.useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;
    if (!('inert' in HTMLElement.prototype)) return;

    const marked = new Set<HTMLElement>();

    function sync() {
      document
        .querySelectorAll<HTMLElement>('[data-base-ui-inert]')
        .forEach((el) => {
          if (!el.inert) {
            el.inert = true;
            marked.add(el);
          }
        });
      // An element that lost its marker (e.g. a nested modal closed and base-ui
      // un-marked it) must lose our `inert` too.
      marked.forEach((el) => {
        if (!el.hasAttribute('data-base-ui-inert')) {
          el.inert = false;
          marked.delete(el);
        }
      });
    }

    sync();

    const observer = new MutationObserver(() => sync());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-base-ui-inert'],
    });

    return () => {
      observer.disconnect();
      marked.forEach((el) => {
        el.inert = false;
      });
      marked.clear();
    };
  }, [open]);
}
