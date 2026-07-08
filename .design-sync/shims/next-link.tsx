// design-sync shim: next/link → plain <a>. The claude.ai/design runtime has no
// Next router; a Link is just an anchor. Faithful for presentational previews.
import * as React from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string | { pathname?: string };
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, ...rest },
  ref,
) {
  const url = typeof href === "string" ? href : href?.pathname ?? "#";
  return React.createElement("a", { href: url, ref, ...rest }, children);
});

export default Link;
