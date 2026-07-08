/**
 * Liquid-Glass kill-switch. `NEXT_PUBLIC_LG=0` disables the whole app-wide
 * glass layer: `LiquidGlassChrome` (and `LiquidGlassScreen`, `BuergerkontoCard`,
 * `PosteingangTopSearch`) render null and set no `data-lg*` attribute, so no
 * rule in the LG stylesheets matches and the app falls back to the stock shell.
 * The cheapest full revert — no code removal needed.
 *
 * Read at module scope from a `NEXT_PUBLIC_*` var so it inlines into the client
 * bundle at build time.
 */
export const lgEnabled = process.env.NEXT_PUBLIC_LG !== '0';
