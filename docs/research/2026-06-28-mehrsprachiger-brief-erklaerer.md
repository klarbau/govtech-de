---
topic: Mehrsprachiger Brief-Erklärer — plain-language Behörden-letter explanation in the citizen's own language (RU/UK/AR/TR)
question: Is a multilingual (own-language) brief-explainer genuinely additive on top of the existing German plain-language explainer + 6-locale i18n? What is the honest legal framing for translating German Bescheide, and what prior art exists?
date: 2026-06-28
status: verified
confidence: high
---

## TL;DR

- **Genuinely additive.** The brief-explainer (`AISummaryBlock` / `AiErklaererCard`) renders the AI summary **content in German only**, regardless of UI locale. Only the chrome (headings, disclaimer, error states) is i18n'd via `next-intl`. The bullet text comes from a pre-baked German `post_open` summary and is never translated.
- **The data scaffold is half-built but dormant.** `LetterAiSummary` (`src/types/letter.ts`) already defines an **unused** `translations?: Partial<Record<'en'|'ru'|'uk'|'ar'|'tr', { pre_open?, post_open? }>>` field (and the legacy `en?/ru?/uk?/ar?/tr?` single-sentence fields). **Zero letters populate `translations`** (0 occurrences in `letters.json`) and **no component reads it**. So the type anticipates this feature, but neither data nor UI exists — net-new work, low-risk because the shape is pre-agreed.
- **Reuse is high.** The 6-locale machinery (`de/en/ru/uk/ar/tr`, RTL for `ar`), `useLocale()`, the citation/`original_zitat` pattern, the `RoterHinweisBanner` disclaimer, and the seeded-summary backend path are all already in place. This idea amplifies wow-backlog #6 rather than adding a new surface.
- **Legal framing is honest and has direct prior art.** German is the statutory Amtssprache (§ 23 Abs. 1 VwVfG: "Die Amtssprache ist deutsch"). A translated/plain-language explanation is a **comprehension aid, never the binding text** — exactly the EU eTranslation / Your-Europe disclaimer pattern ("authentic versions … available on Eur-Lex; no guarantee of accuracy, no liability"). The required label "Übersetzte Erläuterung — rechtsverbindlich ist das deutsche Original" is the correct, established framing.
- **Top quality flag (inherits #6):** an inbox-level gist already proxies trust before the user reads the original; a *translated* gist compounds that — a mistranslation of a Frist or a "Sie müssen …" line could cause a missed deadline. Mitigation: keep the per-bullet `original_zitat` citation, keep the German original one tap away, and attach the non-binding disclaimer to every translated view.

## Findings

### 1. Current code state of the brief-explainer + i18n (reuse vs net-new)

**Letter shape** (`src/types/letter.ts`, `src/data/letters.json`):
- `ai_summary` is an **object**, not a string: `{ de: string, en?/ru?/uk?/ar?/tr?: string, pre_open?, post_open?, translations? }`. In the seeded data, letters carry `ai_summary.de` (a 1-sentence pre-open gist). One letter (`letter-renteninfo-anna-2026-05`) additionally carries a full `pre_open` + `post_open` (5 bullets + citations + `model`) inline; the rest get `post_open` lazily.[^code-letters]
- Per-letter fields that already exist and are reusable for the "Das müssen Sie tun" line + deadline: `fristen[]` (each with `datum`, `original_zitat`, `citation_match`, `rechtsgrundlage`, optional `cta_label`), `required_action` (legacy `{ typ, frist, cta }`), `was_kann_ich_tun_options[]` (i18n-keyed catalog), `betreff`, `archetype`, `betrag_cent`/`betrag_richtung`.
- **17 letters** across **3 personas**: Anna Petrov (`anna-petrov`, migrant/Blue Card §18g AufenthG — incl. the ABH-Verlängerung letter), Markus Schmidt (`markus-schmidt`), Mehmet Yıldız (`mehmet-yildiz`, self-employed). The two target personas (Anna, Mehmet) already own the highest-Behördendeutsch letters (ABH renewal, ELSTER Steuerbescheid, IHK/VBG/AOK Festsetzungen).[^code-letters]

**How the summary is produced — seeded, not live-fetched at read time:**
- `extrahiereAktion(letterId)` in `src/lib/mock-backend/api.ts` (~L2545): cache-hit path returns `cached.ai_summary.post_open`; cold path pulls a **pre-baked** entry from `loadSummariesMap()` (`seed.post_open`), persists it onto `ai_summary.post_open` and writes a `summary_generated` activity-log entry (DSGVO Art. 6 lit. a + Art. 28 AVV note). It is a simulated-latency seeded lookup — **not** a call to the `/api/assistant` route.[^code-api]
- The `de` field is back-filled from the bullets (`existing.de || post.bullets.map(b => b.text).join(' ')`). Everything is German.

**How it renders — German content, i18n chrome:**
- `AISummaryBlock.tsx` and `AiErklaererCard.tsx` both take `summary: LetterAiSummaryPostOpen` and map `summary.bullets[].text` straight into the DOM. The only `useTranslations()` calls are for `posteingang.reader.*` (heading, skeleton hint, error), `posteingang.disclaimer.summary_footer_hint`, and `common.loading`. **The bullet content is never localized.**[^code-block]
- `LetterReader.tsx` reads `letter.ai_summary?.post_open ?? null` and sets it from `res.ai_summary_post_open`. It imports `date-fns/locale` `de` for date formatting but **never picks a locale-specific summary** and **never touches `translations`**.[^code-reader]
- Grep for `translations` across `src/components/posteingang` → the string appears only inside other words; **no component reads `ai_summary.translations`**. Grep in `letters.json` → **0** occurrences.

**i18n setup:** `src/i18n/routing.ts` defines `locales = ['de','en','ru','uk','ar','tr']`, `defaultLocale='de'`, `rtlLocales=['ar']`, cookie `govtech-de:v1:locale`. Source-of-truth `de.json`; sibling `en/ru/uk/ar/tr.json` + `_status.json`. Standard `next-intl` per-key structure (e.g. `posteingang.reader.*`, `posteingang.disclaimer.*`, `posteingang.was_kann_ich_tun.<archetype>.<option>`). The machinery to flip the whole UI to RU/UK/AR/TR already exists; what is missing is **translated summary content**, which lives in data, not in locale JSON.

### 2. Is the multilingual angle genuinely ADDITIVE? — Yes

- **Type-level:** `LetterAiSummary.translations` exists but is dormant. The comment even says "Originaltext (`Letter.body_de`) bleibt immer DE" — i.e. the author anticipated exactly this feature and pre-reserved the slot. **Additive, not a rewrite.**
- **Data-level:** no letter has a `translations` entry → all RU/UK/AR/TR summary content is net-new seed data.
- **UI-level:** `AISummaryBlock` / `AiErklaererCard` / `LetterReader` would need a locale-aware selection (`summary.translations?.[locale]?.post_open ?? summary.post_open`) plus a "Übersetzte Erläuterung — rechtsverbindlich ist das deutsche Original" badge. This is an amplification of the existing component, not a new screen.
- **Backend-level:** `extrahiereAktion` would return the locale-matched `post_open` (or fall back to `de`), reusing the same seeded-lookup path and `summaries` map shape. Citations (`original_zitat`) must stay German because they quote `body_de` verbatim.

### 3. Prior art

**Plain-language vs. translation are two complementary tracks (UK GDS framing).** GOV.UK guidance treats *plain English / easy-read* as the primary accessibility lever and translation as a secondary, controlled act — government translation "must be accurate, inclusive and secure, protecting dates, figures, names and formatting." Plain-English-first-then-translate is explicitly recommended; the NHS/Red Cross Emergency Multilingual Phrasebook (incl. AR/RU/UK/TR) is a canonical multilingual-government artefact.[^gov-translate][^gov-publish][^nhs]

**EU Single Digital Gateway / eTranslation — the directly transferable disclaimer pattern.** The Commission machine-translates Europa content with eTranslation but attaches a standing caveat: "*Don't use eTranslation to translate EU legislation. Authentic versions in the 24 official languages are available on Eur-Lex*" and "*The European Commission does not guarantee the accuracy and accepts no liability for possible errors.*" This is the exact "translation is a convenience, the original is authoritative" framing our badge must replicate.[^eu-mt]

**German context — momentum, but no consumer aggregator that translates Behörden-letters.** AI to make official letters comprehensible is described as a "game changer" for foreigners in visa/residence law; Brandenburg launched an "Aufenthalt Digital" AI pilot in Feb 2026; bpb documents growing AI use in migration management. (Single-source on the specific Brandenburg pilot — `confidence: single-source` for that detail.) The named SUMM AI (Leichte Sprache) / Integreat (multilingual municipal info) ecosystem exists but I could not confirm an own-language *letter-explainer* product in this pass — `not found`; this remains a genuine whitespace, consistent with the #6 research finding that no DE B2C player aggregates Behörden-letters + AI explanation.[^visaguard][^brandenburg][^bpb]

### 4. Legal / quality FLAGS

- **L-T1 — Translation is not the binding text (load-bearing).** § 23 Abs. 1 VwVfG: "Die Amtssprache ist deutsch." The German Bescheid/Brief is authoritative; an own-language explanation is a comprehension aid with no legal force. **Every translated view must carry the visible disclaimer** "Übersetzte Erläuterung — rechtsverbindlich ist das deutsche Original," and the German original must remain one tap away. Confidence: high (statute fetched).[^vwvfg-23]
- **L-T2 — Mistranslation of a Frist/action proxies trust (inherits verifier flag #6, compounded).** An inbox-level gist already shapes the user's understanding before they read the original; a *translated* gist does so in a language where the user cannot cross-check the German. A wrong date or a wrong "Sie müssen …" line could cause a missed statutory deadline (§ 240 AO Säumniszuschläge, § 70 VwGO Widerspruchsfrist). Mitigation: keep the German `original_zitat` citation visible next to each translated bullet (the user sees the exact German sentence the bullet is derived from); never translate the citation; show `citation_match=false` as "bitte selbst prüfen."
- **L-T3 — Do not imply real transmission/translation by an authority.** Everything `[MOCK]`/speculative-2027; the prototype must never suggest the Behörde translated, sent, or received anything. Translated explanation is generated client-side from mock data.
- **L-T4 — RDG line is unchanged but worth re-flagging.** Translating an *explanation* (information) stays erlaubnisfrei; translating into *einzelfallbezogene Rechtsberatung* ("in Ihrem Fall sollten Sie widersprechen, weil …") in another language is the same § 2 RDG line as in #6 — the translation must not cross from "explain" to "advise."
- **L-T5 — € amounts "geschätzt ca."; federalism labels precise** — unchanged guardrail; applies to any translated amount.
- **L-T6 — RTL (`ar`).** `rtlLocales=['ar']` already exists; the translated-summary block must inherit RTL and stay WCAG 2.1 AA / BITV 2.0 (mixed-direction with German citations needs `dir`/`bdi` care).

## Implications for our demo

- **Build as an amplification of the existing explainer, not a new screen.** Populate `ai_summary.translations.<locale>.{pre_open, post_open}` in the seed for a focused set (the Anna ABH-Verlängerung letter and a Mehmet Steuer/IHK letter are the highest-value demo letters), make `extrahiereAktion` + `AISummaryBlock`/`AiErklaererCard`/`LetterReader` locale-aware with `de` fallback, and add the non-binding badge.
- **Reuse, don't invent:** the dormant `translations` type field, the 6-locale `next-intl` setup + `useLocale()`, the `original_zitat` citation pattern, `RoterHinweisBanner`/`posteingang.disclaimer.*`, and the seeded-summary backend path.
- **Demo-spine fit:** target Anna (RU/UK) and Mehmet (TR) — Behördendeutsch × Sprachbarriere is their documented #1 pain (Taxfix/WORTLIGA 2024: 20% understand a Behördenbrief on first read, 75% feel overwhelmed; #6 research). Switching the locale to RU/TR and watching the ABH/Steuer letter explain itself in-language is a strong, honest wow that needs no new legal claim.
- **Hand-off to domain-expert:** confirm the disclaimer wording is sufficient under § 23 VwVfG framing, confirm the RDG "explain not advise" line holds across languages, and confirm that quoting the German `original_zitat` untranslated next to each translated bullet is the right anti-mistranslation safeguard.

## Open questions

- Which exact letter set should ship translated for the Loom (Anna ABH + Anna/Mehmet Steuerbescheid + IHK?) — product-architect call.
- Should the translated bullets be seeded (deterministic, demo-safe) or live-generated via `/api/assistant` for one hero letter? (Seeded is the spine-safe default; live is keyless-visitor-gated.)
- Is there a real DE own-language Behörden-letter explainer in market (SUMM AI / Integreat adjacency)? `not found` this pass — worth a deeper competitive check before claiming whitespace publicly.

## Sources

[^code-letters]: `src/data/letters.json` + `src/types/letter.ts` (`LetterAiSummary`, dormant `translations` field) — read 2026-06-28
[^code-api]: `src/lib/mock-backend/api.ts` `extrahiereAktion` (~L2545, seeded `loadSummariesMap()` path) — read 2026-06-28
[^code-block]: `src/components/posteingang/AISummaryBlock.tsx` + `AiErklaererCard.tsx` (bullets rendered untranslated; only chrome via `useTranslations`) — read 2026-06-28
[^code-reader]: `src/components/posteingang/LetterReader.tsx` (reads `ai_summary.post_open`, never `translations`) + `src/i18n/routing.ts` (6 locales, RTL ar) — read 2026-06-28
[^gov-translate]: [Translation into foreign languages — GOV.UK](https://www.gov.uk/government/speeches/translation-into-foreign-languages) — accessed 2026-06-28
[^gov-publish]: [How to publish on GOV.UK — Translations](https://www.gov.uk/guidance/how-to-publish-on-gov-uk/translations) — accessed 2026-06-28
[^nhs]: [Language interpreting and translation: migrant health guide — GOV.UK](https://www.gov.uk/guidance/language-interpretation-migrant-health-guide) — accessed 2026-06-28
[^eu-mt]: [Use of machine translation on Europa — European Commission](https://commission.europa.eu/languages-our-websites/use-machine-translation-europa_en) — accessed 2026-06-28 (fetched: "Authentic versions in the 24 official languages are available on Eur-Lex"; "does not guarantee the accuracy and accepts no liability")
[^visaguard]: [Use of AI by Berlin administration: Opportunities for residency rights? — visaguard.berlin](https://www.visaguard.berlin/en/post/use-of-ai-by-berlin-administration-opportunities-for-residency-rights) — accessed 2026-06-28
[^brandenburg]: [Pilotprojekt zum Einsatz von KI bei Ausländerbehörden gestartet — MIK Brandenburg (12.02.2026)](https://mik.brandenburg.de/mik/de/service/presse/pressemitteilungen/detail-pm-und-meldungen/~12-02-2026-pilotprojekt-zum-einsatz-von-ki-bei-auslaenderbehoerden-gestartet) — accessed 2026-06-28 (single-source for the pilot detail)
[^bpb]: [Künstliche Intelligenz im Migrationsmanagement — bpb.de](https://www.bpb.de/themen/migration-integration/kurzdossiers/migration-und-sicherheit/570377/kuenstliche-intelligenz-im-migrationsmanagement/) — accessed 2026-06-28
[^vwvfg-23]: [§ 23 VwVfG Amtssprache — dejure.org](https://dejure.org/gesetze/BVwVfG/23.html) — accessed 2026-06-28 (fetched: "Die Amtssprache ist deutsch")

## Domain validation (domain-expert, 2026-06-28)

**Verdict: realism SOUND with mandatory flags.** The multilingual plain-language explainer is defensible as a 2027 speculative comprehension aid, provided the disclaimers below are non-removable.

Statutes re-fetched independently (not trusting the scout's fetch):
- **§ 23 Abs. 1 VwVfG** — "Die Amtssprache ist deutsch." Confirmed verbatim (dejure.org). The German Bescheid/Brief is the sole authoritative text; the translated explanation has zero legal force. Load-bearing for the L-T1 disclaimer.
- **§ 2 Abs. 1 RDG** — "jede Tätigkeit in konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des Einzelfalls erfordert." Confirmed verbatim. Translating/explaining *information* stays erlaubnisfrei in any language; the line is crossed only when the output becomes einzelfallbezogene Rechtsberatung ("in Ihrem Fall sollten Sie widersprechen, weil …"). The bullets must stay descriptive ("Die Behörde fordert …", "Frist laut Schreiben: …"), never prescriptive-legal.

Honest framing confirmed: real authorities *do* publish multilingual info sheets / Merkblätter (BAMF, Integreat, many Ausländerbehörden), but never a binding translated Bescheid — so "Übersetzte Erläuterung, das deutsche Original ist rechtsverbindlich" mirrors established practice and will not draw a Sozialrecht/Verwaltung objection.

**Harm-bearing letter types (auto-translated action-line could mislead if subtly wrong):**
- **Rechtsbehelfsbelehrung / Widerspruchs-/Einspruchsfrist** — a wrong date or wrong addressee in any of the Bescheide carrying a Rechtsbehelf (`steuerbescheid` ×3, `krankenkasse-beitrag` Festsetzungen ×2, `beitragsservice-mahnung` ×3, `ihk-beitrag`, `berufsgenossenschaft-beitrag`) risks a missed statutory Frist (§ 355 AO, § 70 VwGO, § 84 SGG).
- **"aufschiebende Wirkung … entfällt"** (`letter-schmidt-krankenkasse-beitrag`, `letter-mehmet-krankenkasse-freiwillig`, § 86a SGG) — easiest line to invert in translation; a citizen must not be led to believe a Widerspruch suspends payment.
- **Money owed + Vollstreckung** (steuer Nachzahlung + § 240 AO Säumniszuschlag; "vollstreckbarer Titel" Beitragsservice) — wrong amount/date has financial consequences. Amounts must stay "geschätzt ca." and the figure is never re-rendered, only quoted from the German original.
- **Aufenthaltsrechtliche Frist** (`letter-abh-erinnerung-verlaengerung`, § 81 AufenthG) — highest stakes (Titelverlust). The existing `citation_match:false` + the letter's "wir empfehlen / Mitwirkungspflicht" framing means the translated line must remain a soft recommendation, never "Sie müssen bis … widersprechen".

**Anti-mistranslation safeguard — CONFIRMED correct and load-bearing:** keep the German `original_zitat` untranslated next to every translated bullet (it quotes `body_de` verbatim — the user always sees the exact German sentence the explanation derives from), and surface `citation_match:false` as a "bitte im deutschen Original prüfen" caveat rather than a confident translated claim. Never translate the citation, the Aktenzeichen, the € figure, or the Frist-Datum string — quote them.

**Safe-to-show ranking for the Loom:** safest = confirmation/no-Frist letters (`renteninfo`, `familienkasse-bewilligung`, `standesamt-urkunde`/Geburtsurkunde, `buergeramt-meldung`, AOK Mitgliedsbescheinigung) and the `familienkasse-nachweis` (Schulbescheinigung, `citation_match:true` — clean explicit deadline). Show-with-full-flags = the Rechtsbehelf-bearing Bescheide above (good demo value for Anna/Mehmet, but only with the disclaimer + untranslated citation + the per-bullet Rechtsgrundlage micro-line). The eservice/§86a "aufschiebende Wirkung entfällt" letters are the riskiest — show only if the translated bullet stays descriptive and the German original is one tap away.
