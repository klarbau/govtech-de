---
topic: Public GitHub/GitLab repository landscape relevant to GovTech DE concept demo
question: Which open-source repos can we cite as prior art, harvest data/components from, or borrow patterns from — and what is already covered by official actors?
date: 2026-05-08
status: draft
confidence: high
---

## TL;DR

- **DigitalService GmbH (`digitalservicebund`)** is the closest official analogue and ships shadcn-grade tooling: `elterngeldrechner` (Tailwind + TS, EUPL-1.2, actively shipping in May 2026)[^1], `a2j-rechtsantragstelle` (TS multi-step wizard for justice services, MIT)[^2], and the `accessibility-personas-extension` (MIT)[^3]. Their old `style-dictionary` is **deprecated** — they explicitly recommend KERN now[^4].
- **KERN UX-Standard** is the federal design system but lives on **GitLab opencode.de**, not GitHub[^5]. Pattern library is open-source, Figma kit at v2.0.0-beta. Tech-stack details aren't visible from the org page — needs deeper exploration before we commit to using its tokens.
- **KoliBri (`public-ui/kolibri`)** is the ITZBund's accessible web-component library, EUPL-1.2, framework-agnostic, **explicitly supports Next.js**, 259 stars, latest release v4.1.4 on 2026-04-28[^6][^7]. Strong reference / potential adoption candidate.
- **EU Digital Identity Wallet (`eu-digital-identity-wallet`)** has a full reference implementation: Android UI (263⭐, Kotlin)[^8], iOS, libraries for OpenID4VCI / ISO 18013-5, and architecture docs (700⭐ on the doc repo)[^9]. We can cite, learn the consent + selective-disclosure flows, but won't reuse code directly (mobile-only).
- **Germany's national EUDI Wallet project** is on `gitlab.opencode.de/bmi/eudi-wallet/eidas-2.0-architekturkonzept` — CC-BY 4.0, **architecture docs only, no production code yet**[^10]. This is a citable document, not a code dependency.
- **Comparable foreign citizen portals** with public source: France's `betagouv/DNC` ("Mon Espace Numérique de Confiance") is the **closest conceptual sibling** but was **archived 2026-01-26**[^11] — major signal that even motivated public actors are still struggling with this exact concept; Amsterdam's `mijn-amsterdam-frontend` is actively shipped (v5.31.0, 2026-04-28, MPL-2.0)[^12]; Singapore's `opengovsg/FormSG` and `mockpass` give us patterns for forms + auth mocking[^13].
- **No serious German competitor demo found.** The one academic match (`NurNils/citizen-portal-with-artificial-intelligence`) is a 2-star DHBW thesis from 2021, Angular + Brain.js, 2 commits[^14] — useful as evidence the niche is empty, not as competition.
- **Useful adjacent libs**: `@faker-js/faker` supports German IBAN + addresses but **not Steuer-ID / Sozialversicherungsnummer** — we'll need a small custom generator[^15]. PLZ datasets are abundant (`yetzt/postleitzahlen`, `juliuste/german-administrative-areas`, `isellsoap/deutschlandGeoJSON`)[^16]. `bundesAPI/deutschland` (1.4k⭐) gives weather, alerts, transport — but **no central Behörden directory**, this is a real data gap[^17].

## Findings

### Axis 1 — Official DE GovTech repos

#### DigitalService GmbH — `https://github.com/digitalservicebund`

The most directly comparable official organisation. Pinned and actively maintained repos as of 2026-05-08[^1][^2][^3][^4][^18]:

| Repo | Purpose | License | Last activity | Relevance |
|---|---|---|---|---|
| `elterngeldrechner` | Parental benefit calculator widget on Familienportal | **EUPL-1.2** | 2026-05-04 (release 56) | **High** — Tailwind + TS, real federal benefit, public-grade quality. Reference-class code. |
| `a2j-rechtsantragstelle` | Powers `service.justiz.de`, multi-step wizard for legal aid applications | **MIT** | 2026-05-08 | **High** — same pattern stack as us (React+TS+Vite+Playwright+Storybook), preserves German legal terminology, multi-step + summary + conditional logic. |
| `accessibility-personas-extension` | Chrome extension simulating a11y impairments | **MIT** | 2026-05-08 | **Medium** — install during a11y testing of our demo; pattern reference for our own a11y story. |
| `digitalcheck-dito` | `digitalcheck.bund.de` — checks regulations for digital-fitness | **MIT** | very active | **Medium** — TS + React Router + Vitest + Playwright + Axe. Same testing stack as us; useful CI/CD pattern. |
| `ris-backend-service` / `ris-search` | Federal case-law search backend | **GPL-3.0** | 2026-05-08, 43⭐ | **Low for us** (Java) — but cite as evidence DE government ships serious open source. |
| `style-dictionary` | "Angie Design System" tokens, npm `@digitalservice4germany/style-dictionary` | **MIT** | **Deprecated** — last release v2.0.0 (2023-04-11), README points users to KERN[^4] | **Avoid** — historical artifact only. |
| `grundsteuer` | Property-tax declaration tool | TS, **archived** | dormant | **Cite, don't fork** — evidence of "vorausgefüllte Erklärung" pattern at federal scale. |

Concrete next-actions:
- Read `elterngeldrechner` and `a2j-rechtsantragstelle` source for: form-state management, validation, summary-page pattern, German error copy, SCSS module/Tailwind structure.
- **Cite both** in our README under "Inspirierende Vorbilder".
- Consider matching their CI: pnpm + Vitest + Playwright + Axe.

#### Tech4Germany — `https://github.com/tech4germany`

Fellowship cohort projects, 32 repos but mostly archived[^19]:

| Repo | Purpose | Last commit | Relevance |
|---|---|---|---|
| `elterngeldplaner` | Parental-benefit planner (different from DigitalService's calc) | 2025-07-03 | Cite |
| `Siteseeker` | Telecom site acquisition aggregator | 2024-11-18 | Low |
| `bmjv-justizportal` | Justice ministry portal | 2023-01-17 | Cite |
| `rechtsinfo_api` | Federal legal-info API (30⭐) | 2022-12 | Cite |
| `rotationsplaner` | Diplomat rotation tool | 2023-02 | Low |
| `open-data-process-guide` | 2020 Open Data Portal team output | older | Cite |

**Implication**: most fellowship code is dormant, and many newer DigitalService projects (e.g. `elterngeldrechner`) are NOT under `tech4germany` — they're under `digitalservicebund`. The fellowship is a **content vehicle, not a maintained code repository** — useful for our README's "wir wissen, wo das Erbe liegt" line, but not for live dependencies.

#### bundesAPI / Bundesstelle für Open Data — `https://github.com/bundesAPI`

Initiated by Lilith Wittmann, focused on documenting federal APIs[^17][^20]:

| Repo | Purpose | License | Stars | Last activity |
|---|---|---|---|---|
| `deutschland` | "Most important APIs of Germany" (Python wrapper) | Apache-2.0 | **1.4k** | 2026-04-28 |
| `handelsregister` | Commercial registry API | – | 412 | 2025-12-07 |
| `jobsuche-api` | Bundesagentur für Arbeit jobs | – | 132 | 2026-04-02 |
| `sofortmassnahmen` | Public participation on 2nd Open Data Act | – | 98 | – |
| `dip-bundestag-api` | Parliament documentation system | – | 25 | 2025-09-18 |

**Important gap**: `bundesAPI/deutschland` covers Bundesanzeiger, Handelsregister, Polizei, Verkehr, Jobsuche, Wetter, NINA — **but no Behörden directory**. We will have to assemble Behörden + addresses ourselves from `data.gv` + Wikipedia + state-level OZG pages.

#### Other DE official actors

- **`Governikus/AusweisApp`** — official eID client of the federation, **EUPL-1.2**[^21]. v2.5.1 released 2026-04-12. Highly relevant as visual + UX reference for the eID consent flow we mock in our `(auth)/onboarding` route.
- **FIT-Connect** — lives on `git.fitko.de/fit-connect` and `gitlab.opencode.de/fitko/`[^22]. Not GitHub. Mostly server-to-server messaging — not directly mockable in a frontend demo, but **must be named in our architecture doc** as the real pipe between Behörden.
- **PVOG (Portalverbund Onlinegateway)** — `gitlab.opencode.de/fitko/pvog`[^23]. The actual nationwide service-discovery API. We can mock this as our `getZustaendigeBehoerde(plz, thema)` call.
- **ZenDIS / openDesk / openCode** — sovereignty workspace, `opencode.de` is the umbrella GitLab[^24]. Not directly usable but cite as evidence the German state takes open source seriously.
- **ITZBund's KoliBri** — see Axis 5 below for full treatment.

### Axis 2 — EUDI Wallet ecosystem

#### `eu-digital-identity-wallet` org — `https://github.com/eu-digital-identity-wallet`

Official EU-funded reference implementation. Most-active repos as of 2026-05-08[^8][^9][^25]:

| Repo | Purpose | Stars | Last activity |
|---|---|---|---|
| `eudi-doc-architecture-and-reference-framework` | The ARF spec | **700** | pinned |
| `eudi-app-android-wallet-ui` | Android wallet UI prototype (Kotlin) | 263 | 2026-05-08 |
| `eudi-app-ios-wallet-ui` | iOS wallet UI prototype (Swift) | 75 | 2026-05-07 |
| `eudi-lib-android-wallet-core` | Android core lib | 51 | 2026-05-08 |
| `eudi-lib-ios-wallet-kit` | iOS core lib | 36 | 2026-05-07 |
| `eudi-lib-ios-openid4vci-swift` | OpenID4VCI protocol | 15 | 2026-05-08 |
| `eudi-lib-ios-iso18013-data-transfer` | mDL data transfer | 7 | 2026-05-08 |

**License**: EUPL-1.2 across the board. **Tech**: 99%+ Kotlin/Swift, no web reference impl — so we won't reuse code, but we will mirror their **screens**: PIN setup, dashboard with Home/Documents tabs, document detail view, request-attribute selection, in-person sharing via QR.

UX patterns worth replicating in our `dokumente/` and onboarding routes[^25]:
1. Issuance dual-flow: **wallet-initiated** (browse credentials) vs **issuer-initiated** (scan QR).
2. **Selective-disclosure consent screen** — list of attributes with checkboxes, "share only what's needed" framing.
3. PIN before every presentation.
4. Optional biometric step.

#### Germany — `gitlab.opencode.de/bmi/eudi-wallet/...`[^10][^26]

The federal EUDI Wallet project lives on opencode.de under BMI:
- `eidas-2.0-architekturkonzept` — architecture concept (CC-BY 4.0, 137 commits, 45 releases — actively iterated).
- `wallet-development-documentation-public` — public dev docs.

**Status**: documentation only, no production code yet. Sandbox opened in 2026, public start 2027-01-02 per BMDS announcement. **Implication for us**: we can confidently call our project a "speculative 2027 demo on top of DEUDI Wallet" without contradicting reality, because there is no shipped DE wallet UI to compare to.

#### SD-JWT-VC libraries — relevant if we mock credentials[^27]

| Repo | Purpose | Stack |
|---|---|---|
| `Meeco/sd-jwt-vc` | Issuer/Holder/Verifier classes | TypeScript |
| `openwallet-foundation-labs/sd-jwt-vc-dm` | SD-JWT + W3C VC Data Model | TypeScript |
| `transmute-industries/vc-jwt-sd` | Experimental | TypeScript |

For our demo we won't actually verify signatures, but if we want a credible-looking `qr_payload` field on `Document`, we can borrow the JWT shape from these. Low priority.

### Axis 3 — Other countries' citizen-portal source code

| Project | Repo | License | Status | Relevance |
|---|---|---|---|---|
| **GOV.UK Frontend** | `alphagov/govuk-frontend` | MIT | **1.4k⭐**, v6.1.0 on 2026-03-02, very active[^28] | **Cite as primary visual + IA inspiration**. Already in our CLAUDE.md as the visual register. |
| **GOV.UK Prototype Kit** | `alphagov/govuk-prototype-kit` | MIT | active[^29] | Pattern reference for "step-by-step" service flows. |
| **Démarches Simplifiées (FR)** | `betagouv/demarches-simplifiees.fr` | **AGPL** | active, Ruby on Rails[^30] | Pattern reference for the form-as-administrative-procedure model — but AGPL means we can't copy code into our MIT/EUPL demo. |
| **Mon Espace Numérique de Confiance / DNC (FR)** | `betagouv/DNC` | – | **Archived 2026-01-26**, source code never went public[^11] | **Critical signal**: closest conceptual sibling — "tell us once" + "see all your data from administrations" — and even DINUM with full institutional backing closed the project. We should call this out in our pitch as: "France tried, the time wasn't right, here's a concept demo of what could have been + what now becomes possible with EUDI Wallet." |
| **France Connect** | `france-connect/sources`, `france-connect/service-provider-example` | – | active[^31] | Cite as the **identity federation** model we mirror with DeutschlandID. |
| **Mijn Amsterdam (NL)** | `Amsterdam/mijn-amsterdam-frontend` | **MPL-2.0** | v5.31.0 on 2026-04-28, very active[^12] | **Strongest reference for the "city portal" pattern**: React + TS + Vite + BFF + OIDC (DigiD/eHerkenning), aggregates city services into one citizen UI. Tech stack and architecture map almost 1:1 onto our plan. |
| **NL Design System** | `nl-design-system/*` (49 repos) | **EUPL-1.2** | active[^32] | The reference for "design-system-as-architecture": one core, many themed forks (Den Haag, Utrecht, Rotterdam, RVO). Cite. |
| **DigiD source (NL)** | `MinBZK/woo-besluit-broncode-digid`, `MinBZK/woo-besluit-broncode-digid-app` | – | published 2023-2024 under WOO[^33] | Cite as evidence even hard-security gov code can be made public. |
| **X-Road (EE/FI)** | `nordic-institute/X-Road` | **MIT** | active, NIIS-managed[^34] | Cite as the canonical "secure data exchange between agencies" — the architectural ancestor of FIT-Connect. |
| **borger.dk + MitID (DK)** | – no public source repos found[^35] | – | – | DIGST released helper libs under MPL-1.1 long ago, but no modern public source for the borger.dk frontend. **Cite "Mit Overblik" as the closest functional precedent for our dashboard.** |
| **Singapore: FormSG** | `opengovsg/FormSG` | – | 346⭐, very active[^13] | Cite — best-in-class example of government form builder. |
| **Singapore: mockpass** | `opengovsg/mockpass` | – | 108⭐ | **Direct steal**: mock SingPass/CorpPass/MyInfo server. We will mirror this pattern for our DeutschlandID + EUDI Wallet mock auth. |
| **Singapore: starter-kit** | `opengovsg/starter-kit` | – | 66⭐ | Reference for product-team boilerplate. |

### Axis 4 — Speculative / concept / portfolio demos

This was the highest-priority axis. Findings:

- **`NurNils/citizen-portal-with-artificial-intelligence`**[^14] — German DHBW Stuttgart bachelor thesis, 2021, Angular 12 + Brain.js LSTM + MongoDB, 2 stars, 2 commits, MIT, Baden-Württemberg COVID-19 dashboard, dormant. **Confidence: high that this is the only direct German "citizen portal with AI" public demo.** Useful precedent only insofar as it shows how shallow prior work is; we are not in danger of accidentally cloning it. A reviewer comparing the two will see ours as serious next-generation work.
- **No Tech4Germany or Work4Germany cohort has shipped a "unified citizen interaction layer" demo as of 2026-05-08**. The closest cohort projects are siloed (parental benefits, justice portal, telecom site selection) — none take on the umbrella thesis.
- **No DigitalService project exists in this exact niche** either. Their portfolio is single-Vorgang (Steuererklärung, Elterngeld) plus underlying infrastructure (BundesIdent — discontinued after pilot[^36]).
- **No shadcn/ui-based citizen-portal concept demo found in the German space** despite shadcn being the dominant 2026 React UI choice — direct opening for our positioning[^37].
- **France's archived `betagouv/DNC`** is the strongest evidence that this idea is "obviously good but politically/technically hard" — we lean into that gap.

**Conclusion for the user**: there is no serious German GovTech "all-in-one autopilot" portfolio demo on GitHub as of 2026-05-08. We are entering an empty market on the demo side, with credible institutional precedent (Mijn Amsterdam, GOV.UK, Mon FranceConnect) to point at.

### Axis 5 — Useful adjacent repos

#### Design systems we could borrow tokens or components from

| Repo | License | Tech | Status | Relevance |
|---|---|---|---|---|
| **KERN UX-Standard** `gitlab.opencode.de/kern-ux/pattern-library`[^5][^38] | not stated on org page (likely EUPL) | unknown framework, Figma kit v2.0.0-beta | 1,221 commits, active | **Highest priority for tokens** — it's the federal standard. Needs a separate research pass to confirm framework and check if tokens are exportable to Tailwind. |
| **KoliBri** `public-ui/kolibri`[^6][^7] | **EUPL-1.2** | Web Components (Stencil), explicit Next.js/React/Astro/Angular adapters | 259⭐, v4.1.4 on 2026-04-28 | **Could literally use it**. Framework-agnostic, generic WCAG/BITV reference impl. Worth a focused try-out spike. |
| **DigitalService `style-dictionary`**[^4] | MIT | Tailwind preset | **deprecated** | Skip. |
| **GOV.UK Frontend**[^28] | MIT | Nunjucks + SCSS | very active | Visual register reference; tokens partially borrowable. |
| **NL Design System** `nl-design-system/*`[^32] | EUPL-1.2 | React + Design Tokens | active | Architecturally the model we should match. |

#### German-realistic data libs

| Resource | Purpose | License | Notes |
|---|---|---|---|
| `@faker-js/faker` (de_DE locale)[^15][^39] | Names, addresses, IBAN(DE) | MIT | **No Steuer-ID, no Sozialversicherungsnummer** — gap. |
| `yetzt/postleitzahlen`[^16] | German PLZ + areas | – | `opendata.json`, ready to consume. |
| `juliuste/german-administrative-areas` | Admin boundaries as GeoJSON | – | If we ever map Behörden geographically. |
| `isellsoap/deutschlandGeoJSON` | DE borders multi-LOD | – | Same. |
| `WZBSocialScienceCenter/plz_geocoord` | PLZ → coordinates | – | Useful if we put a Behörden map in the demo. |
| `bundesAPI/deutschland`[^17] | Federal API wrapper (Python) | Apache-2.0 | For inspiration / data shape. We're TS-only so not a runtime dependency. |
| `forensicgato/germany-open-data` | Curated list of DE open data sources | – | Index/discovery. |

**Action item**: write a small `lib/mock-data/de-identifiers.ts` that generates plausible Steuer-ID (11 digits, specific algorithm), Sozialversicherungsnummer, and Aktenzeichen patterns since faker doesn't ship them. Always watermarked `[MOCK]`.

#### Awesome lists worth following

- `codedust/awesome-egov-de`[^40] — best-curated DE eGov list. Categories: identity, APIs, OZG, design (Design-System.SH, KoliBri), open-source citizen platforms (Formularium, IRIS Connect), standards (publiccode.yml).
- `bundestag/awesome-germany`[^41] — broader civic tech list. Light maintenance.
- `technologiestiftung/berlin-open-source-portal`[^42] — Berlin state showcase, MPL-2.0, 2,784 commits, active.

## Implications for our demo

1. **Position confidently**. There is no serious shadcn-based, Next.js, AI-driven, German-language citizen-portal concept demo on public GitHub as of 2026-05-08. The conceptually closest project (France's `betagouv/DNC`) was archived four months ago. We are not late, we are early.
2. **Borrow code patterns, not code, from `digitalservicebund/elterngeldrechner` and `digitalservicebund/a2j-rechtsantragstelle`**. They give us a stylistic and structural template that ranking GovTech reviewers will recognise instantly. Match their CI (pnpm + Vitest + Playwright + Axe).
3. **The KERN tokens question deserves its own research pass.** If KERN exports usable design tokens (CSS variables, Style Dictionary JSON, or a Tailwind preset), we should adopt them. If not, we draft our own minimalist tokens in the GOV.UK + DigitalService aesthetic. *Open question for next research-scout pass.*
4. **Consider KoliBri for one or two truly accessibility-critical components** (e.g. the consent dialog in `(auth)/onboarding` and the Frist countdown) — it's the only DE federal a11y component lib with explicit Next.js support and EUPL licence. Adopting even one component lets us cite "uses ITZBund-published KoliBri" in the README, which carries weight.
5. **Mirror EUDI Wallet UI flows** for `dokumente/` and onboarding (PIN → consent → attribute selection → biometric option). These are the patterns reviewers will look for.
6. **Mirror Mijn Amsterdam architecture** for the BFF concept: aggregate multiple Behörden APIs behind one citizen-facing model. Even though our backend is mocked, the conceptual layering should be similar — that's what makes the demo defensibly "real".
7. **Steal `opengovsg/mockpass`'s pattern** for our fake DeutschlandID/EUDI auth provider. It's the cleanest reference for "this is what a mock identity provider looks like in a demo".
8. **Build a small de-identifiers util** to fill the faker.js gap (Steuer-ID, Sozialversicherungsnummer, Aktenzeichen).
9. **Make `betagouv/DNC` a centerpiece of the README pitch.** "Frankreich hat es 2024–2026 versucht und das Projekt eingestellt. Mit DEUDI-Wallet und Once-Only-Technical-System ab 2027 wird die technische Grundlage zum ersten Mal tragfähig — hier ist ein Konzept-Demo, wie das in Deutschland aussehen könnte."
10. **Cite GOV.UK + Mijn Amsterdam + DigitalService DE in the README** as the visual + architectural register, in that order.

## Open questions

- Does **KERN UX-Standard** export design tokens that work with Tailwind v4? Framework? License confirmation? — *Needs a fresh research pass focused on the GitLab repo content.*
- Is there a **Berlin Design System** as a code repo, or only as a Figma file? — *Search returned NL Design System results, did not surface a Berlin counterpart.*
- Are there **Bayern / NRW EUDI Wallet pilot repositories** with citable code? — *AKDB pilot exists per stmd.bayern.de but no public repo found in this pass.*
- Did any **DigitalService GmbH internal project** ever attempt the "unified citizen layer" pattern? Their site lists projects; only BundesIdent was cross-cutting and that was discontinued[^36]. Worth a follow-up by checking `digitalservicebund/public_documents` and their press archive.

## Recommended cite-list for our README

In this order, with a one-sentence "warum" each:

1. **`alphagov/govuk-frontend`** — visual + linguistic register.
2. **`digitalservicebund/elterngeldrechner`** — federal-grade reference for a single-Vorgang Tailwind + TS app with real legal compliance.
3. **`digitalservicebund/a2j-rechtsantragstelle`** — federal-grade reference for multi-step wizard + summary patterns in citizen self-service.
4. **`Amsterdam/mijn-amsterdam-frontend`** — architectural reference for aggregating multiple government services behind one citizen UI.
5. **`eu-digital-identity-wallet/eudi-app-android-wallet-ui`** — UX reference for selective-disclosure consent + credential dashboards.
6. **`public-ui/kolibri`** — federal a11y component library, BITV-aligned.
7. **`betagouv/DNC` (archived)** — explicit acknowledgment that the unified-citizen-layer idea was attempted and shelved in France; positions our work as "what becomes possible with EUDI + Once-Only".
8. **`nl-design-system/*`** — design-system-as-architecture pattern we would want to mirror if this scaled beyond a demo.

## Sources

[^1]: [digitalservicebund/elterngeldrechner](https://github.com/digitalservicebund/elterngeldrechner) — accessed 2026-05-08
[^2]: [digitalservicebund/a2j-rechtsantragstelle](https://github.com/digitalservicebund/a2j-rechtsantragstelle) — accessed 2026-05-08
[^3]: [digitalservicebund/accessibility-personas-extension](https://github.com/digitalservicebund/accessibility-personas-extension) — accessed 2026-05-08
[^4]: [digitalservicebund/style-dictionary](https://github.com/digitalservicebund/style-dictionary) — accessed 2026-05-08
[^5]: [KERN UX-Standard / Pattern Library on opencode.de](https://gitlab.opencode.de/kern-ux/pattern-library) — accessed 2026-05-08
[^6]: [public-ui/kolibri (GitHub)](https://github.com/public-ui/kolibri) — accessed 2026-05-08
[^7]: [KoliBri docs site](https://public-ui.github.io/en/) — accessed 2026-05-08
[^8]: [eu-digital-identity-wallet/eudi-app-android-wallet-ui](https://github.com/eu-digital-identity-wallet/eudi-app-android-wallet-ui) — accessed 2026-05-08
[^9]: [eu-digital-identity-wallet org overview](https://github.com/eu-digital-identity-wallet) — accessed 2026-05-08
[^10]: [BMI / EUDI-Wallet / eIDAS 2.0 Architecture Concept](https://gitlab.opencode.de/bmi/eudi-wallet/eidas-2.0-architekturkonzept) — accessed 2026-05-08
[^11]: [betagouv/DNC (Mon Espace Numérique de Confiance, archived 2026-01-26)](https://github.com/betagouv/DNC) — accessed 2026-05-08
[^12]: [Amsterdam/mijn-amsterdam-frontend](https://github.com/Amsterdam/mijn-amsterdam-frontend) — accessed 2026-05-08
[^13]: [opengovsg (Open Government Products Singapore)](https://github.com/opengovsg) — accessed 2026-05-08
[^14]: [NurNils/citizen-portal-with-artificial-intelligence](https://github.com/NurNils/citizen-portal-with-artificial-intelligence) — accessed 2026-05-08
[^15]: [Faker.js Finance API docs](https://fakerjs.dev/api/finance) — accessed 2026-05-08
[^16]: [yetzt/postleitzahlen](https://github.com/yetzt/postleitzahlen) — accessed 2026-05-08
[^17]: [bundesAPI/deutschland](https://github.com/bundesAPI/deutschland) — accessed 2026-05-08
[^18]: [digitalservicebund GitHub org](https://github.com/digitalservicebund) — accessed 2026-05-08
[^19]: [tech4germany GitHub org](https://github.com/tech4germany) — accessed 2026-05-08
[^20]: [bundesAPI / Bundesstelle für Open Data](https://github.com/bundesAPI) — accessed 2026-05-08
[^21]: [Governikus/AusweisApp](https://github.com/Governikus/AusweisApp) — accessed 2026-05-08
[^22]: [FIT-Connect on FITKO GitLab](https://git.fitko.de/fit-connect) — accessed 2026-05-08
[^23]: [PVOG on opencode.de](https://gitlab.opencode.de/fitko/pvog) — accessed 2026-05-08
[^24]: [openCode platform overview (allthingsopen.org)](https://allthingsopen.org/articles/zendis-opendesk-opencode-public-sector-open-source) — accessed 2026-05-08
[^25]: [eu-digital-identity-wallet/.github reference implementation profile](https://github.com/eu-digital-identity-wallet/.github/blob/main/profile/reference-implementation.md) — accessed 2026-05-08
[^26]: [German national EUDI Wallet project page (BMI on opencode.de)](https://bmi.usercontent.opencode.de/eudi-wallet/eidas2/en/start/) — accessed 2026-05-08
[^27]: [Meeco/sd-jwt-vc](https://github.com/Meeco/sd-jwt-vc) — accessed 2026-05-08
[^28]: [alphagov/govuk-frontend](https://github.com/alphagov/govuk-frontend) — accessed 2026-05-08
[^29]: [alphagov/govuk-prototype-kit](https://github.com/alphagov/govuk-prototype-kit) — accessed 2026-05-08
[^30]: [betagouv/demarches-simplifiees.fr](https://github.com/betagouv/demarches-simplifiees.fr) — accessed 2026-05-08
[^31]: [france-connect GitHub org](https://github.com/france-connect) — accessed 2026-05-08
[^32]: [nl-design-system GitHub org](https://github.com/nl-design-system) — accessed 2026-05-08
[^33]: [MinBZK/woo-besluit-broncode-digid](https://github.com/MinBZK/woo-besluit-broncode-digid) — accessed 2026-05-08
[^34]: [X-Road (NIIS) on x-road.global](https://x-road.global/) — accessed 2026-05-08
[^35]: [DIGST: Mit Overblik on borger.dk](https://en.digst.dk/digital-services/borgerdk-national-citizen-portal/mit-overblik/) — accessed 2026-05-08
[^36]: [DigitalService — Digital identities project page](https://digitalservice.bund.de/en/projects/digital-identities) — accessed 2026-05-08
[^37]: [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — accessed 2026-05-08
[^38]: [KERN UX-Standard official site](https://www.kern-ux.de/) — accessed 2026-05-08
[^39]: [Faker.js de_DE locale (Python doc, mirrors JS)](https://faker.readthedocs.io/en/master/locales/de_DE.html) — accessed 2026-05-08
[^40]: [codedust/awesome-egov-de](https://github.com/codedust/awesome-egov-de) — accessed 2026-05-08
[^41]: [bundestag/awesome-germany](https://github.com/bundestag/awesome-germany) — accessed 2026-05-08
[^42]: [technologiestiftung/berlin-open-source-portal](https://github.com/technologiestiftung/berlin-open-source-portal) — accessed 2026-05-08
