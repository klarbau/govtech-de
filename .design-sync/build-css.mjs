// Scoped Tailwind v4 input generator + note. Transforms the app's globals.css
// into a design-system stylesheet whose utility generation is scoped to ONLY
// the synced primitives (ui/ + shared/) and their authored previews — so the
// emitted CSS carries no out-of-scope utilities/tokens/fonts. Recompile after
// authoring previews (they add utility classes):
//   node .ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs \
//     -i .design-sync/.cache/tw-input.css -o .design-sync/.cache/app.css
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

let css = readFileSync("src/app/globals.css", "utf8");
const scoped = `@import "tailwindcss" source(none);
@source "../../src/components/ui";
@source "../../src/components/shared";
@source "../../.design-sync/ds-entry.tsx";
@source "../previews";
`;
css = css.replace(/@import\s+['"]tailwindcss['"]\s*;/, scoped);
mkdirSync(".design-sync/.cache", { recursive: true });
writeFileSync(".design-sync/.cache/tw-input.css", css);
console.log("wrote tw-input.css; source(none) present:", /source\(none\)/.test(css));
