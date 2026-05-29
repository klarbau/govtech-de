# Fonts

GovTech DE uses **Source Sans 3** (SIL Open Font License, kommerziell + Demo frei).

## Why Source Sans 3

Tech-only justification — never frame as "BundesSans-Lookalike" (HL-DS-1):

1. SIL-OFL — no license fee, no contractor status needed.
2. 9 weights (200 → 900 + italics) — covers Display / Body / Caption / Numeric-Bold without stack swap.
3. Full German diacritics (ä ö ü ß ẞ) including the capital eszett (U+1E9E).
4. Largely covers DIN 91379 (Behörden personal-name characters).
5. High x-height, slashed zero, disambiguated 1 / l / I — critical for Aktenzeichen, FE-Nr, IBAN legibility.
6. Tabular numerals via OpenType `tnum` feature — no second font load.

## How it's loaded

- **In the live app** (Next.js): via `next/font/google` with a single `Source_Sans_3` import. The repo configures this in `src/app/layout.tsx`.
- **In design artefacts in this folder**: via the Google Fonts CDN, imported at the top of `colors_and_type.css`.

## Substitution note

The upstream repo does not ship .ttf/.woff2 font files (Next.js streams them from Google's CDN at build time). If you need self-hosted .woff2 files for offline use, download them from <https://fonts.google.com/specimen/Source+Sans+3> and drop them in this folder. Tell the user you've done this so they can verify the variants you picked.

## Arabic fallback

Source Sans 3's Arabic glyph coverage is limited. The AR locale switches stack to `"Source Sans 3", "Noto Sans Arabic", "Segoe UI", system-ui, …` via the `[lang="ar"]` selector in `colors_and_type.css`.

## Substitution flag

If a future direction calls for a different sans (e.g. Inter, BundesSans on real-government surfaces), update `--ds-font-sans` in `colors_and_type.css` and re-run the contrast + tabular-nums tests on Aktenzeichen / IBAN / FE-Nr fields.
