---
feature: stammdaten-fuehrerschein-kfz-mobilitaet
date: 2026-05-13
verifier: concept-verifier
verdict: PROCEED-with-Verifier-Locks
upstream:
  research: docs/research/2026-05-10-fuehrerschein-kfz.md (status: research-pending-domain-validation)
  domain:   docs/domain/fuehrerschein-kfz.md (VALIDATED-with-revisions)
inputs_reviewed:
  - docs/research/2026-05-10-fuehrerschein-kfz.md
  - docs/domain/fuehrerschein-kfz.md
  - docs/specs/stammdaten.md (V1)
  - docs/specs/stammdaten-v1-1-renten-kv.md (V1.1)
  - docs/specs/stammdaten-v1-1-kontakt-schicht.md (V1.2)
  - docs/reviews/2026-05-10-stammdaten-v1-final-revise.md
  - src/components/stammdaten/IbanSpeculativeBadge.tsx
  - src/components/stammdaten/IbanSpeculativePushModal.tsx
  - src/lib/i18n/locales/de.json (stammdaten.disclaimer.*)
  - https://transport.ec.europa.eu/news-events/news/modernised-eu-rules-driving-licences-and-driving-disqualifications-enter-force-2025-11-25_en (independent re-verify of RL 2025/2205 timeline)
  - CLAUDE.md mission constraints (Read-/Wegweiser-Schicht, [MOCK], Sie-Form, BITV 2.0)
---

## 1. TL;DR

**PROCEED — with 14 binding Verifier-Locks.** The combined research + domain output is the strongest pre-spec package this project has produced: every § citation in the research is corrected (six K-rows), the legal anchor for each Hard-Line is named, the speculative claims are time-honest (26.11.2028 / 26.11.2029 / ~2031), and the seven traps the domain-expert listed for the verifier are all real and worth locking. The package is **ready for product-architect** subject to the Verifier-Locks below — these are not new revisions of upstream artefacts, they are spec-level constraints the architect must not drop. No upstream re-loops required.

**Naming recommendation:** call this capability **V1.3 (Mobilität-Sektion)**, not V2, not V1.1 — see § 7 below.

## 2. Hard-Lines (copy-extend of domain-expert HL-V1.1-1 .. HL-V1.1-9)

Domain-expert nine Hard-Lines (HL-V1.1-1 through HL-V1.1-9) are accepted **verbatim**. They re-number as **HL-MOB-1 .. HL-MOB-9** in the V1.3 spec (because we are renaming away from the V1.1 label — § 7). The verifier adds five further Hard-Lines:

- **HL-MOB-10 — No FE-Nr or FIN written-fallback into Profile-Schema.** `Persona` and any `MobilitaetProfile` type must store FE-Nr / FIN strings **only** as Mock-Snapshot-Werte sourced from `seed.ts`; there must be no UI control that mutates them. Reason: in reality, FE-Nr / FIN are authoritative ZFER/ZFZR identifiers — the Bürger:in cannot edit them in any real Behörden-Online-Strecke either. Self-edit affordance would silently undermine the Read-/Wegweiser-Hard-Line. (Companion to HL-MOB-1.)
- **HL-MOB-11 — `punkte: number` MUST NOT exist as a persisted profile attribute.** On-demand pull only, lives in component-local state with TTL ≤ 5 minutes in-memory, never written to `localStorage` Persona-Migration. Domain-expert wrote this as a verifier-probe (§ "Was concept-verifier besonders jagen sollte" #3); this verifier elevates it to a hard schema-level lock. Persistence-migration test must include an assertion `expect(persona).not.toHaveProperty('mobilitaet.punkte')`.
- **HL-MOB-12 — Disclaimer-key naming convention.** All four new disclaimer strings (domain doc § "Legal disclaimer to surface in UI") live under `stammdaten.disclaimer.*` exactly as domain proposed: `fuehrerschein_lese_schicht`, `faer_punkte_on_demand`, `kfz_halter_adresse_speculative`, `eudi_mdl_speculative`. No `mobilitaet.*` parallel namespace — V1.2 (Kontakt) followup #2 already named this anti-pattern. Localizer parity 4 × 6 locales = 24 strings minimum (plus any UI copy keys).
- **HL-MOB-13 — Halter-Adresse FieldCard copy ban-list (Block-D-Wording-Trap).** The string `"Halter-Adresse aktualisiert"` is **forbidden** in every locale, every component prop, every Activity-Log enum's human-readable note, and every Mock-Brief body. Allowed wordings only: `"Adressänderung über Umzug-Vorgang ausgelöst"`, `"Pre-Fill der i-Kfz-Adressänderung bereit"`, `"§ 15 FZV-Mitteilung pre-filled"`, `"Bestätigung der Zulassungsstelle steht aus"`. CI lint or unit-test on i18n source must grep-deny `Halter[-_ ]?Adresse[-_ ]?aktualisiert` (case-insensitive) across all 6 locale files. Without a mechanical lock a downstream coder will reproduce the IBAN-Sync-Falle from V1.
- **HL-MOB-14 — "automatische Synchronisierung" / "automatic sync" Phrase-Ban.** Mirrors the V1 IBAN-speculative-pattern. The phrases `automatische[r]? Synchron(?:isation|isierung)`, `synchronisiert automatisch`, `automatically synchron[ize]d`, and their RU/UK/AR/TR equivalents are **CI-forbidden** in `de.json`, `en.json`, locale-files for ru/uk/ar/tr, all Mock-Brief bodies in `letters.json`, and all autopilot step-texts in `src/lib/mock-backend/autopilot/*.ts`. Existing Umzug Block-D string per domain doc § "Block-D Connection" must be re-locked at the same time. This is the single highest-impact wording-trap and the one a coder is most likely to type by reflex.

## 3. Probes & findings

### Probe 3.1 — Trap #1 from domain doc (mDL-Datierung)
**FINDING: confirmed and locked.** Independent re-verify against Mobility-and-Transport (EU 2025-11-25 news release): transposition 26.11.2028, application 26.11.2029, mDL-default ~Mai 2031 (54 months after first Implementing Act). Domain doc K6 correctly overwrites research's "H2 2028 Pflicht-Anwendung". The CLAUDE.md status line ("mDL-4-Jahre-Gap requires Vision-Banner") references the **2027 demo year vs. 2031 mDL-default = ~4 years gap** — that framing is honest. **Verifier-Lock**: every mDL-mock-Card must carry `stammdaten.disclaimer.eudi_mdl_speculative` (a Vision-Banner is not equivalent to a 2027-Vision-Pill alone — text must name *2029-2031*, not generic "Zukunft"). The architect must NOT reuse the V1 IBAN `2027_vision` badge-text on mDL cards; mDL needs a distinct `2029_vision` / `2031_default_vision` text variant. (See Verifier-Lock #VL-7.)

### Probe 3.2 — Trap #2 (FZV §-Nummerierung)
**FINDING: confirmed.** Research used 2011-FZV-Nummerierung (§§ 13, 32, 33); domain correctly migrated to 2023-FZV (§§ 15, 57, 60) — verified via gesetze-im-internet.de fzv_2023 links in the domain frontmatter. **Verifier-Lock**: NormZitatLookup extension test must assert that `§ 13 FZV` does NOT resolve to "Mitteilungspflicht" (it's "Zulassungsbescheinigung Teil I") and that `§ 15 FZV` does. Adversarial test, not happy-path. (See Verifier-Lock #VL-3.)

### Probe 3.3 — Trap #3 (Punkte als Profile-Stammdaten)
**FINDING: confirmed structural risk.** The Stammdaten V1 + V1.1 + V1.2 pattern is "Field appears in a Sektion → it has a `FieldCard` → it has a backing field on `Persona`." A naive coder will follow this for "Punktestand" and add `persona.mobilitaet.punkte: number` — and that would silently violate § 30 Abs. 8 StVG + § 30a StVG. Domain doc HL-V1.1-1 says "on-demand only"; this verifier upgrades the constraint to **schema-level** via HL-MOB-11 above. Mock-result data has TTL ≤ 5 min and lives in component-local `useState`, never persisted. **Verifier-Lock**: persistence-migration unit test asserts `'punkte' in persona.mobilitaet === false` after migration V1.2→V1.3. (VL-4.)

### Probe 3.4 — Trap #4 (`kategorie: land` for Fahrerlaubnisbehörde)
**FINDING: confirmed.** § 73 FeV is unambiguous (untere Verwaltungsbehörde = kommunal; Land = Aufsicht only). Stadtstaaten edge case (Berlin LABO, Hamburg, Bremen) collapses kommunal-und-Land — domain doc handles this correctly by labelling LABO Berlin as `kategorie: kommune` even though LABO is a Landesamt; the operative-classification is what counts under § 73. **Verifier-Lock**: every new `behoerden.json` entry added in this wave must declare `kategorie: 'kommune'` explicitly for FE-Behörde and Zulassungsstelle; a unit test asserts `behoerden.filter(b => /Fahrerlaubnis|Fahrerlaubnisstelle|Zulassungsstelle|Kfz-Zulassung/i.test(b.name)).every(b => b.kategorie === 'kommune')`. KBA is `kategorie: 'bund'`. (VL-5.)

### Probe 3.5 — Trap #5 (Block-D-Wording)
**FINDING: confirmed — this is the single highest demo-misleading risk in V1.3.** The existing Umzug autopilot Block-D currently exists as a Mock-Step that says "KFZ-Halter-Anschrift mit FZV-Register synchronisieren" (per domain doc § "Block-D Connection" finding) — that string was *already wrong* before V1.3 even shipped, and ratchets up in risk the moment V1.3 surfaces its effect inside a Stammdaten-Sektion. The wording fix is two-fold: (a) Block-D's autopilot-step strings must be rewritten to "Pre-Fill der i-Kfz-Adressänderung vorbereitet" (mock-backend-coder owns); (b) the new MobilitaetSektion FieldCard "Halter-Adresse" must show the Übergangs-Badge with text per domain doc § "Block-D Connection" exactly. **Verifier-Lock VL-13 (= HL-MOB-13 above)** is the mechanical enforcement.

### Probe 3.6 — Trap #6 (Selective-Disclosure ISO-Konformität)
**FINDING: confirmed.** Domain doc HL-V1.1-9 enumerates the ISO/IEC 18013-5 Annex-B-allowed mDL-attribute set. A toggle for "Nur Punkteanzahl offenbaren" or "Nur MPU-Status" must be **structurally impossible** in the WalletMdlAttestationPreviewModal — not just disclaimed-against but unreachable. **Verifier-Lock VL-9** below pins the closed enum.

### Probe 3.7 — Trap #7 ("automatische Synchronisierung"-Floskel)
**FINDING: confirmed.** This is the most-likely string a coder types from muscle-memory of the IBAN-V1-pattern. Domain-expert listed it last; verifier ranks it among the top three risks because it is invisible to manual review (passes type-check, passes a11y, passes Lighthouse) and only a CI-lint catches it. **VL-14** (= HL-MOB-14) is the lint.

### Probe 3.8 — Persona fit (verifier-additional probe)
**FINDING: domain doc's persona assignment is internally consistent and demo-load-bearing**, but two soft-issues need spec-clarification:

1. **Anna**: Klasse-B-Umschreibung 2018→2024 St. Petersburg→Berlin is correct under Anlage 11 FeV reciprocal-recognition. **Caveat**: research § 11 quotes "Anna Petrov — EU-Bürgerin"; domain doc § "Persona-Snapshots V1.1" repeats "EU-Bürgerin". Cross-check `src/data/personas.json`: Anna is listed as Russian citizen (post-2022 EU-displacement narrative per V1 docs). **Anna is NOT EU-Bürgerin — she has a humanitarian residency status (§ 24 AufenthG or similar)**. The Klasse-B-Umschreibung still works under Anlage 11 FeV (reciprocal recognition is by *country of issuing licence*, not by citizenship), but the persona-text must be corrected before architect inherits the wrong label. Spec must say "Drittstaatsangehörige mit humanitärem Aufenthalt" or whatever V1 personas.json says — not "EU-Bürgerin". This is a research-scout-and-domain-doc copy-paste-Bug that propagated. (See Open Question OQ-1.)

2. **Mehmet — eAT § 21 AufenthG + i-Kfz Stufe 4**: domain doc Open Question §1 confirms "ja, sofern eID auf eAT aktiviert" — this is the demo-load-bearing wow-hook because eAT-eID-Stufe-4 + i-Kfz-Adressänderung is the persona-narrative no other GovTech demo has shown. Spec MUST keep Mehmet as the i-Kfz-Demo-Hook. **Verifier-Lock VL-11.**

3. **Familie Schmidt — single-Halter UI pattern**: domain Open Question §2 correctly says "Halter ist eine Person, FZV § 6 — kein 'Familien-Halter'". V1.2 already migrated Schmidt to 2 children (per CLAUDE.md V1.0.1 followups). Vater = Halter, Mutter = Mitnutzerin with disclaimer-pill "rechtlich kein Halter, keine § 15 FZV-Pflicht". **Verifier-Lock VL-12.**

4. **Personas-without-FE**: domain doc gives every persona a FE — that is probably too symmetric. Mehmet realistic; Vater Schmidt realistic; **Anna with FE umgeschrieben 2024 is plausible but adds a third "alle haben einen Führerschein"-row that flattens the demo-tension**. Architect should consider an honest "Ich habe keinen Führerschein" empty-state for at least one of: Mutter Schmidt, the elder Schmidt-child (16y, no FE yet) — to demonstrate the wegweiser-quality "App weiß auch, wann sie nichts zeigen darf". Not a hard lock; flagged as **architect-discretion**.

### Probe 3.9 — mDL Vision-Banner positioning (verifier-additional)
**FINDING: domain doc names *when* the disclaimer fires but not *where*.** Vision-Banner must be **required** on:
- Every render of the new `<WalletMdlAttestationPreviewModal>` (Modal-Header level, not buried in tooltip).
- The Wallet-Subtab Card-row that surfaces the mDL-Mock-Attestation next to PID.
- Any Stammdaten-Hero or Sektion-Header text that uses the word "mDL" or "mobiler Führerschein".

Vision-Banner is **optional / suppressed** on:
- Mock-Briefe in `letters.json` (those are roleplay; the briefs themselves are dated and the brief-level [MOCK]-watermark already handles temporal-honesty).
- The Pflichtumtausch-Banner (which is about Plastikkarten-Umtausch, not mDL).

Naming convention: `stammdaten.disclaimer.eudi_mdl_speculative` (verbatim from domain doc). NOT `…mdl_vision`, NOT `…mdl_2027`, NOT `…wallet_mdl_speculative` — single key, exact name, locked at HL-MOB-12. **Verifier-Lock VL-7.**

### Probe 3.10 — Umzug-Block-D Bridge wording (verifier-additional)
**FINDING: domain doc § "Block-D Connection" gives the right wording in prose but does not produce the i18n-key naming the architect must instantiate.** The architect must declare the following keys upfront (DE source, EN/RU/UK/AR/TR follow):

- `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug` (the badge text)
- `stammdaten.aktivitaet.note.kfz_halter_adresse_prefilled_via_umzug` (Activity-Log note template; carries `template_id` / `vorgang_id` as token)
- `stammdaten.disclaimer.kfz_halter_adresse_speculative` (already in HL-MOB-12)

The Activity-Log note string must NOT say "synchronisiert"; it must say "pre-filled" / "vorbereitet" / "ausgelöst". Verifier-Lock VL-13. The Umzug Block-D step-string in `src/lib/mock-backend/autopilot/umzug.ts` (currently with the wrong "§ 32 FZV" + "automatische Synchronisierung" wording per domain doc) is **co-corrected in this wave** — not deferred to a followup. (VL-14.)

### Probe 3.11 — IBAN-Speculative-Push pattern reuse: FE-Nr and Halter-Adresse
**FINDING: NO — same UI pattern is forbidden for FE-Nr/Halter-Adresse, and domain doc is silent on this gap.**

The V1 `<IbanSpeculativePushModal>` is built around an action verb: *"IBAN an Familienkasse / Finanzamt / KK propagieren"*. The modal speculatively *writes* (mock) the IBAN into downstream Behörden — that is acceptable for IBAN because:
- IBAN is a Bürger:in-controlled financial endpoint (not a register-authoritative identifier).
- The mock-write is into a Stammdaten-app-internal seed only; no real ZAB/Familienkasse-write is implied.
- The Speculative-2027-Pill is unambiguous: "this would in 2027".

FE-Nr is **structurally different**: ZFER is a unidirectional authoritative-source register — the Bürger:in does not "push" a FE-Nr anywhere; the FE-Nr is *issued* by the FE-Behörde and *read out* of ZFER. A "FE-Nr push"-Modal is semantically nonsensical and would suggest the App can write into ZFER, which is the exact illusion HL-MOB-1 and HL-MOB-10 forbid. **Verifier-Lock VL-10: no `<FeNrSpeculativePushModal>` shall exist.** FE-Nr display is read-only with a Korrekturweg-CTA to the kommunale FE-Behörde. End of pattern.

Halter-Adresse is **subtly different again**: the Block-D-Bridge effect IS a kind of speculative-push (the App imagines pre-filling the Halter-Adressänderung). But the right UI pattern here is **not** an `IbanSpeculative…`-style push-modal — it is the Übergangs-Badge + Activity-Log-Eintrag inside the existing FieldCard that domain doc § "Block-D Connection" sketches. Reason: the IBAN-pattern fires when the citizen *changes a value in this app*; the Halter-Adresse-pattern fires when the citizen has already completed an Umzug elsewhere. Different trigger, different surface. **Verifier-Lock VL-13** pins the badge+log pattern; **no Speculative-Push-Modal** is to be added for Halter-Adresse.

**Domain doc gap (advisory, not blocking)**: domain doc § "Block-D Connection" does not explicitly rule out the IBAN-Push-Modal reuse; a coder might reach for it. This verifier closes that gap via VL-10 + VL-13.

### Probe 3.12 — Norm-Zitate Unit-Test coverage (verifier-additional)
**FINDING: must be explicit, not implicit.** Domain doc K1-K8 corrections + new norms (§§ 4, 28, 29, 30, 30a, 48, 65 StVG; §§ 73, 47 FeV; §§ 15, 57, 60 FZV; § 6 Abs. 7 FeV + Anlage 8a; RL (EU) 2025/2205) **all need a `normZitatLookup`-extension test** analogous to V1.1's `stammdaten-v1-1-norm-zitate-extension.test.ts`. The test must include **negative-assertions** as well as positive — i.e., `expect(lookup('§ 13 FZV')).not.toContain('Mitteilungspflicht')`. Spec must enumerate the additions; without enumeration the architect will pick "the relevant ones" and the negative-cases (which protect against research-scout's original wrong citations creeping back) will be dropped. **Verifier-Lock VL-3.**

### Probe 3.13 — Frist-Wording for § 15 FZV ("unverzüglich" vs. "7 Tage")
**FINDING: domain K4 correctly removes the "7 Tage"-number.** Verifier additionally confirms via gesetze-im-internet.de FZV-2023 § 15: text is "unverzüglich". 1-Woche-Faustregel is kommentar-rechtlich, not gesetzlich. **Verifier-Lock VL-2: the Frist-Banner copy and any Activity-Log note must say "unverzüglich (i.d.R. innerhalb einer Woche)" — never "7-Tage-Frist", never "Frist 7 Tage", never "1 Woche".** A failure here would propagate into the Block-D step-text. CI-grep `\b7[- ]Tage[- ]?Frist\b` and `\bFrist\s+7\s+Tage\b` denied.

### Probe 3.14 — Demo-Impact: 30-Sekunden-Wow?
**FINDING: yes, two distinct wows.** (a) **Pflichtumtausch-Frist-Banner** for Familie Schmidt (Vater, FE 2002, Stichtag 19.01.2027) — concrete deadline, concrete CTA, concrete Behörde-Wegweiser. (b) **Punktestand-on-demand-CTA** with eID-Reauth-Modal — the only place in any GovTech-prototype where "we *don't* show you something because legally we shouldn't" becomes a visible feature. Both wows ship in 30s. The mDL-Wallet-Sub-Tab is a third wow but **secondary** — recruiter-loom should not lead with it because it is speculative-3 layers deep (national digitaler-Führerschein vs. EU-mDL vs. our Aggregations-Vision). Lead with Pflichtumtausch + Punkte-on-demand; mDL as third Beat.

### Probe 3.15 — Effort/value
**FINDING: feasible in <1 week.** Scope: 1 new Sektion + ~9 components (per research § "Components-Hint") + 4 disclaimer-strings × 6 locales = 24 i18n keys + ~15 component-copy keys × 6 = ~90+ keys total + persistence-migration V1.2→V1.3 + 11 new Behörden entries (KBA + 3 FE-Behörden + Zulassungsstellen + IHK-Prüfausschuss out-of-scope) + Block-D-step-text correction + Norm-Zitat-Lookup-extension + ~5 new Mock-Briefe (1 Pflichtumtausch FE-Köln for Mehmet or Schmidt, 1 § 15 FZV Aufforderung KVR-München, 1 FAER-Auskunft-PDF-Mock). Estimated 4-5 working days. Risk: the WalletMdlAttestationPreviewModal Selective-Disclosure-Toggles + persistence-migration may eat the 5th day; consider deferring WalletMdl-Subtab-extension to V1.3.1 if architect lands the rest first. **Architect-discretion, not lock.**

### Probe 3.16 — Risk of misleading viewer
**FINDING: medium-high without the Verifier-Locks, low with.** Specific traps in viewer-perception:

- A Loom-viewer not reading disclaimers may believe "the app shows my live Punktestand" → kills credibility with any Datenschutz-aware viewer. Mitigation: on-demand-CTA + eID-Reauth + result-card-explicit-watermark "Stand: TT.MM.JJJJ HH:MM — gilt 5 Minuten". **VL-4.**
- A Loom-viewer may believe i-Kfz-Anschrifts-Sync-bei-Umzug is real today. Mitigation: explicit `kfz_halter_adresse_speculative` disclaimer + the Übergangs-Badge that names "Bestätigung der Zulassungsstelle steht aus". **VL-13.**
- A Loom-viewer may conflate national digitaler Führerschein (Ende 2026 real) with EU-mDL (~2031). Mitigation: HL-MOB-8 + VL-7 explicit-Trennung.

## 4. Open Questions for product-architect

- **OQ-1 (blocking until architect resolves)**: Anna's citizenship — domain doc says "EU-Bürgerin", `personas.json` likely says non-EU (humanitarian residence post-2022). Architect MUST cross-check `personas.json` first commit and align the V1.3 persona-snapshot accordingly. The Anlage-11-FeV-reciprocal-recognition works either way; only the persona-prose changes.
- **OQ-2**: Should there be at least one persona without FE? (Mutter Schmidt? Schmidt-Kind, 16 years, just started Begleitetes Fahren ab 17?) — would test the wegweiser-honesty "App weiß, wann sie nichts zeigen darf". Architect-discretion.
- **OQ-3**: Should Mehmet's FAER-Punktestand-Mock be 0 or 1? Domain proposed "1 P. seit 2024". A "1 P."-result is more interesting demo-wise than "0 P." — but a viewer might read "Mehmet hat einen Punkt, deshalb…". Risk vs. illustration trade-off; architect to pick.
- **OQ-4**: WalletMdlAttestationPreviewModal in V1.3 or deferred to V1.3.1? See Probe 3.15. Architect picks based on time-budget.
- **OQ-5**: Does the new Mobilität-Sektion show the existing Wallet-Sub-Tab (PID + mDL) as a child of itself, or stays the Wallet-Sub-Tab as a top-level Stammdaten-Sub-Tab with a new mDL-Card added? Domain doc implies the latter ("Wallet-Subtab-Erweiterung … fügt eine mDL-Mock-Attestation hinzu"). Architect should confirm and pin in spec § 3.

## 5. Decision: PROCEED

**PROCEED to product-architect.** No domain re-loop required. No research re-loop required. The 14 Verifier-Locks below are the binding constraints the architect cannot drop from the spec.

## 6. Verifier-Locks (binding — must appear in spec)

- **VL-1.** Domain-expert HL-V1.1-1 .. HL-V1.1-9 inherited verbatim as HL-MOB-1 .. HL-MOB-9.
- **VL-2.** § 15 FZV Frist-Wording: "unverzüglich (i.d.R. innerhalb einer Woche)". CI-grep denies `\b7[- ]Tage[- ]?Frist\b`, `\bFrist\s+7\s+Tage\b` across all locales + autopilot step-texts + Mock-Briefe.
- **VL-3.** `normZitatLookup`-extension unit test enumerates: §§ 4, 28, 29, 30, 30 Abs. 8, 30a, 48, 48 Abs. 2, 65 StVG; §§ 47, 73 FeV; §§ 15, 57, 60 FZV (2023); § 6 Abs. 7 FeV + Anlage 8a; § 4 IDNrG; RL (EU) 2025/2205. Includes **negative-assertions** that `§ 13 FZV` does not resolve to "Mitteilungspflicht" and `§ 32 FZV` does not resolve to "Halterdaten-Speicherung".
- **VL-4.** Persistence-migration V1.2→V1.3 unit test asserts: (a) no `persona.mobilitaet.punkte` field exists in the migrated schema; (b) the migration is idempotent (run twice = same result).
- **VL-5.** `behoerden.json` unit test: every entry matching `/Fahrerlaubnis|Fahrerlaubnisstelle|Zulassungsstelle|Kfz-Zulassung/i` has `kategorie === 'kommune'`; KBA entries have `kategorie === 'bund'`.
- **VL-6.** Pflichtumtausch-Banner renders only when `geburtsjahr && ausstellungsdatum` are both known (HL-MOB-6 enforcement); else stiller Hinweis.
- **VL-7.** mDL-Vision-Banner uses `stammdaten.disclaimer.eudi_mdl_speculative` (verbatim from domain doc) and appears on: WalletMdlAttestationPreviewModal header, Wallet-Sub-Tab mDL-Card row, any Hero/Sektion-Header that mentions "mDL" or "mobiler Führerschein". Naming distinct from V1 `2027_vision`-pill; mDL needs `2029_vision` or `2031_default_vision` semantic — NOT `2027_vision`.
- **VL-8.** Punktestand on-demand-only: component-local state, TTL ≤ 5 min, never written to `localStorage`. Activity-Log gets one entry per pull: `kfz_faer_punkte_pulled` with timestamp + result-snapshot (number, not "Punktestand"-string).
- **VL-9.** WalletMdlAttestationPreviewModal Selective-Disclosure-Toggles closed-enum from ISO/IEC 18013-5 Annex B only. Forbidden toggles: "Punktezahl", "Bezirk der FE-Behörde", "MPU-Status", "Schlüsselzahl 95 separat von übrigen Schlüsselzahlen", "FAER-Eintragungen". Unit test asserts the toggle-enum equals the ISO-allowed set.
- **VL-10.** **NO `<FeNrSpeculativePushModal>`.** FE-Nr is read-only, Korrekturweg via kommunale FE-Behörde. The IBAN-Speculative-Push-Pattern is not reused for ZFER/ZFZR-Identifier.
- **VL-11.** Mehmet persona keeps the eAT-§-21-AufenthG + eID-aktiviert hook for i-Kfz-Stufe-4-Demo-Fluss (this is the wow-anchor that Probe 3.8 #2 names).
- **VL-12.** Familie Schmidt = single-Halter (Vater) + Mutter as "Mitnutzerin, rechtlich kein Halter". UI pattern: one HalterCard, one MitnutzerinPill with disclaimer-Text "§ 15 FZV-Mitteilungspflicht trifft nur den Halter".
- **VL-13.** Block-D Bridge UI strings: Übergangs-Badge `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug` ("Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der Zulassungsstelle steht aus"); Activity-Log note key `stammdaten.aktivitaet.note.kfz_halter_adresse_prefilled_via_umzug`. **Forbidden** strings in any locale/Mock-Brief/autopilot-step: case-insensitive `Halter[-_ ]?Adresse[-_ ]?aktualisiert`, `synchronisiert`, `automatische[r]? Synchron`. Lint via grep-deny in CI.
- **VL-14.** Co-correction wave: in this same V1.3 ship, `src/lib/mock-backend/autopilot/umzug.ts` Block-D step-texts AND the de.json/en.json/ru.json/uk.json/ar.json/tr.json existing Block-D strings get rewritten away from "§ 32 FZV" + "automatische Synchronisierung" → "§ 15 FZV" + "Pre-Fill der i-Kfz-Adressänderung". This is NOT a V1.3.1 followup; it ships with V1.3 because the Mobilität-Sektion surfaces the effect.

## 7. Naming recommendation: V1.3 (not V1.1, not V2)

Recommend **V1.3**.

Reasoning:

- The label "Stammdaten V1.1" is already burned in CLAUDE.md status-line for Renten/KV (shipped 2026-05-10), even though the spec-filename says `stammdaten-v1-1-renten-kv.md`. The label "Stammdaten V1.2" is already burned for Kontakt-Schicht (shipped 2026-05-10), but the spec-filename also says `stammdaten-v1-1-kontakt-schicht.md` (a known naming-collision called out in CLAUDE.md prose). Calling Mobilität "V1.1" again would compound the collision; calling it "V1.2" would collide with Kontakt. **V1.3 is the next clean ordinal.**
- **V2 would be wrong.** V2-tier-bump signals a capability-class change (new artefact-type, new schema-tier, new Wallet-format). The mDL-Wallet-Sub-Tab extension is genuinely additive to the existing Wallet-Sub-Tab — it adds one new card to a structure that already supports PID-Mock + Selective-Disclosure. That is V1.x-incremental, not V2-tier. mDL is a new *attestation-type*, not a new *Stammdaten-tier*.
- Research and domain docs both call it "V1.1" — that is the original frame from before V1.1-Renten-KV and V1.2-Kontakt shipped. **The labels in research/domain frontmatter are obsolete and should be re-stamped at the spec stage.** Architect should write `docs/specs/stammdaten-v1-3-mobilitaet.md` and re-stamp the inherited frontmatter inside the spec.
- This implies one Verifier-Lock-by-implication: persistence-migration is `V12→V13` (per the V1.2-Kontakt-followup #2 cleanup-rename advice), not `V11→V12`. Migration unit-test asserts schema-version `'1.3'` after the migration.

**Sources independently re-verified by verifier**:

- RL (EU) 2025/2205 transposition 26.11.2028 / application 26.11.2029 — [Modernised EU rules on driving licences enter into force (transport.ec.europa.eu, 2025-11-25)](https://transport.ec.europa.eu/news-events/news/modernised-eu-rules-driving-licences-and-driving-disqualifications-enter-force-2025-11-25_en)
- § 15 FZV (2023) "unverzüglich" wording: gesetze-im-internet.de FZV-2023 (linked in domain frontmatter)
- § 30 Abs. 8 StVG (FAER-Selbstauskunft unentgeltlich): gesetze-im-internet.de (linked in domain frontmatter)
