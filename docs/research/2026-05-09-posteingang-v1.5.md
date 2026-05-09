---
topic: Posteingang V1.5 — letter-reply UX prior art + inbox restructure precedent
question: How do peer products handle (a) citizen-composed replies to authority letters and (b) inbox layout/filter ergonomics? What concrete patterns should we adopt for V1.5?
date: 2026-05-09
status: draft
confidence: medium-high
---

## TL;DR

- **Reply is real legal terrain in DE 2026, not just UX.** The BundID Postfach (Zentrales Bürgerpostfach / ZBP) and Mein Unternehmenskonto Postfach 2.0 already implement bidirektionale Kommunikation — but only "sofern die Behörde dies zulässt" (per-authority opt-in). Reply is delivered as **structured response forms** + free-text + multi-attachment, **not** an open mail editor[^1][^2][^3]. Our V1.5 must adopt the same "reply only when supported" gate.
- **The dominant peer pattern (e-Boks/Digital Post DK, 19+ years of iteration) is "Besvar" only when the authority allows it; otherwise nudge into 'Skriv ny besked' (new message) with mandatory recipient + category picker.** Reply attaches the original letter to the thread automatically; drafts (kladde) are supported; sent mail lives implicitly via the thread, not a separate "Sent" folder[^4][^5][^6].
- **ELSTER "Sonstige Nachricht" is the closest existing DE precedent and tells us hard limits**: attachments capped at 20 files / 10 MB each / 36.91 MB total / 100 PDF pages each — and this is plainly published. We should use ELSTER's numbers as the realism anchor for our mock backend[^7].
- **Top reply-UX recommendation**: a **side-sheet ("Antwort verfassen")** triggered from the LetterReader with three modes — "Vorlage wählen" (templates: Fristverlängerung, Unterlagen nachreichen, Rückfrage, Widerspruchs-Hinweis), free-text, attachments. Disclaimer banner: "Diese Antwort ist **kein** Widerspruch im Sinne § 70 VwGO. [Mehr dazu]" — keeps us on the right side of the RDG line we set in V1.
- **Top inbox-restructure recommendations**: (1) collapse the always-visible filter sidebar into a **filter button + chip row** (MOJ-style "Selected filters" chips + "Clear filters")[^8] — frees ~260 px on desktop and is mobile-first by default; (2) drop the redundant "Status: Neu / Frist ≤ 7 d / Frist > 7 d" filter checkboxes since those duplicate the chronological grouping headers; (3) adopt the **GOV.UK Task List visual idiom** for letter rows (sentence-case status tag, full-row link) which is mature, BITV-compliant, and already informs our Vorgang detail screens[^9]; (4) for mobile, switch from grouped list to **tab-per-status** with badges (Neu • Frist • Erledigt) following the e-Boks/Digital Post mobile model[^4][^10]; (5) introduce HEY-style **"Imbox vs Feed"** mental model only conceptually — split *transactional Bescheide* from *informational Anschreiben* via a primary toggle[^11].
- **Cross-cutting**: BundID/ZBP's reply is **forms-based**, not free-mail. Our V1.5 framing must lean into structured templates (DE-Verwaltungsprache convention) rather than freeform email mimicry — both for realism and to prevent the user from drafting something that looks like a Widerspruch but isn't (RDG/§ 70 VwGO risk).

## Findings

### Axis 1 — Letter-reply UX prior art

#### Comparison table

| Product | Reply offered? | Templates / forms? | Attachments | Sent / draft folder? | Security/legal framing | Visual treatment |
|---|---|---|---|---|---|---|
| **Digital Post (DK) / e-Boks** | Yes — only if authority enabled it; otherwise "Skriv ny besked"[^4][^5] | Recipient + (optional) **category picker per authority** as a structured-form gate before free-text[^6] | Yes, multi-file; type/size not publicly specified[^6] | **Drafts ("kladde") supported**; reply auto-attaches original letter to thread; no explicit "Sent" folder, just thread view[^5] | "digital communication … is secure. … no one but you and the relevant authority are able to read your Digital Post."[^4] | Toolbar button "Besvar" / "Reply" inside opened message; full message thread view |
| **mit.dk (DK)** | Yes (mirrors Digital Post) | Same as above | Yes | Same as above; recent update: "improved display of recipient and subject when using 'Reply'" + repositioned "New Message" button[^4][^10] | Same secure-channel framing | Mobile-first; toolbar buttons in opened message |
| **ELSTER "Sonstige Nachricht"** (DE) | Yes — but it is the *only* free-text channel; functions as a one-way submission, not a thread[^12][^7] | Aktenzeichen field optional (Grundsteuer only); body is free text | **20 files max · 10 MB each · 36.91 MB total · 100 PDF pages each**; over-limit files are deleted without notification[^7] | Drafts saved in personal area; inbox shows received Bescheide; sent items appear in `Übersicht der versandten Formulare`[^13] | "Sichere elektronische Kommunikation" framing; legally counts only when ELSTER-authenticated | Full-page form route; not a modal |
| **Mein Unternehmenskonto Postfach 2.0** (DE) | Yes since 07/2023 — **bidirektional** but per-authority opt-in[^2] | Reply messages from authorities **include a link to a structured response form** (e.g., Widerspruchs-Formular, Unterlagen-nachreichen-Formular) — citizen does not freeform-write the legal act[^3][^2] | "Antwort … mit mehreren Anhängen versehen"[^2] | Postfach is the canonical sent/received view; replies live in the original Vorgang | "Sofern die Behörde dies zulässt" — UI must communicate per-authority capability | Inline reply + attached form; lives within Postfach |
| **BundID ZBP (Zentrales Bürgerpostfach)** | "In future" (planned for full bidirektionalität in 2026) — currently authorities can deliver, citizens reply via ELSTER directory routing[^1][^14] | Same forms-based pattern as Mein Unternehmenskonto[^14] | Yes (planned) | Postfach view; status monitor for submitted applications planned for 2026[^14] | Legally-valid delivery (Bekanntgabe-fähig) | UI not yet finalized publicly |
| **eesti.ee (EE)** | Yes — every citizen has an `@eesti.ee` address; "Queries sent via the portal are answered directly by user support or passed on to the relevant department"[^15][^16] | Free-text; no public template gallery | Yes | Mailbox + forwarding to private email; no explicit Sent folder doc | "secure, convenient … gateway to the Estonian state's e-services"[^16] | Mailbox model (email-like) |
| **mijn.amsterdam.nl** | **No reply UX** — Mijn Amsterdam shows status of submitted requests; new requests go via amsterdam.nl forms; municipality replies "usually by letter"[^17] | n/a | n/a | View of submitted requests, not a 2-way inbox | No explicit framing | Read-only personal page |
| **GOV.UK One Login** | **No citizen-facing reply inbox.** GOV.UK Notify can have inbound SMS replies but that's an outbound-tooling feature for service teams, not a citizen mailbox[^18][^19] | n/a (GOV.UK has no consumer Posteingang yet — issue #298 in design-system-backlog requests one[^20]) | n/a | n/a | n/a | n/a |
| **TK App / Meine AOK** (Krankenkasse, DE) | Yes — but this is not Behörde, it's body-of-public-law Selbstverwaltung; pattern is "Thema wählen + freie Nachricht"[^21][^22] | **Topic picker** as structured gate ("wählen das entsprechende Thema dazu aus")[^21]; AOK: "Belege via App einreichen" | Yes (TK 5.000 char limit per message[^21]; AOK: invoices etc.) | Personal Postfach in app | "sicher" / encrypted framing | Bottom sheet / full route in app |
| **mon.service-public.fr** | Indirect — secure document holder + procedure-bound exchanges; 190.000 user messages processed in 2025[^23] | Procedure-specific forms | Yes (porte-documents) | Personal account | FranceConnect SSO framing | Procedure-driven, not inbox-driven |

#### Concrete recommendations for our V1.5 reply UX

1. **Per-authority gate ("Antworten" only when supported).** Mirror Digital Post and Mein Unternehmenskonto: not every Behörde has bidirektional capability. On the LetterCard and inside LetterReader, show "Antworten" only when `letter.reply_supported === true`; otherwise show "Neue Nachricht an Behörde verfassen" CTA that opens a recipient picker. Mock-backend must add a `reply_supported: boolean` plus `reply_kind: 'frei' | 'formular_link' | 'keine'` per letter, defaulting to `'keine'` for ~50% of seed-letters to demo the gate.
2. **Template-first reply, not freeform.** Adopt the structured-form pattern from Mein Unternehmenskonto (Antwort enthält Link zu Antwortformular). Offer 4–5 templates as the **first step** of the Antwort-Flow:
   - **Fristverlängerung beantragen** (informativ, kein § 109 AO-Antrag — Disclaimer pflicht)
   - **Unterlagen nachreichen** (file upload primary, free text secondary)
   - **Rückfrage stellen** (free text + Aktenzeichen prefilled)
   - **Adresse oder Bankverbindung korrigieren** (structured field + free-text Begründung)
   - **Freie Nachricht** (escape hatch — last in list, subordinate visual weight)
   Each template prefills Aktenzeichen, Behörde, Bezug ("Ihr Schreiben vom dd.mm.yyyy"). This sidesteps the "user accidentally drafts a Widerspruch" RDG risk.
3. **Disclaimer copy that frames legal liability.** Persistent banner inside the reply sheet, citing real basis: *"Diese Antwort ist eine **informelle Mitteilung**. Sie ersetzt keinen formalen Widerspruch (§ 70 VwGO), keinen Einspruch (§ 357 AO) und keine fristgebundene Erklärung. Bei rechtlich relevanten Schritten konsultieren Sie bitte eine zugelassene Person nach Rechtsdienstleistungsgesetz."* Same register as our V1 disclaimer set; new key: `posteingang.reply.disclaimer.no_legal_act`.
4. **Attachment limits cribbed from ELSTER.** Use **20 files · 10 MB each · 36 MB total · PDF/PNG/JPG only** as our mock-backend constants. These are the public realism anchor[^7]. Reject above-limit at the client with explicit error states, not silent deletion.
5. **Drafts as a first-class object.** Adopt Digital Post's "kladde" model: every reply is auto-saved as a draft after 2 s idle. Drafts surface (a) inline on the originating LetterCard ("Entwurf · zuletzt bearbeitet vor 3 Min · Weiter schreiben"), (b) in a new **"Entwürfe (N)"** group at the top of the chronological list. **No separate "Sent" folder** — instead, sent replies appear inside the LetterReader thread (parent letter → reply chain), matching e-Boks's information architecture. New types: `Reply` and `ReplyDraft`, both linked to `letter_id`.
6. **Visual treatment: side-sheet, not modal, not full-route.** Modal blocks the original letter (citizen-respectful constraint: original is authoritative — they must be able to consult while replying). Full-route loses the LetterReader context. A **right-side `Sheet`** (shadcn/ui) at 480 px desktop / full-screen mobile preserves the side-by-side. On AR-RTL the sheet flips to the left automatically (Tailwind `rtl:` variants); reply input area itself stays LTR-DE since the recipient parses German.

### Axis 2 — Inbox restructure precedent

#### Comparison table

| Product | Layout (desktop) | Scanning aids | Filter UX | Mobile | Notable |
|---|---|---|---|---|---|
| **e-Boks / Digital Post (DK)** | Two-pane (folders + list) on desktop; thread on click | Folder system ("Ny mappe"), unread bold, Notes "Tilføj note" for personal reminders[^6] | Recipient + category picker on compose; **search by recipient & category in 2025 update**[^10] | Card-tabbed model (per GOV.UK issue #298 reference: "tabbed navigation with card components representing discrete messages for mobile")[^20] | 19+ years of iteration; folders survived; status grouping ≠ folders |
| **GOV.UK Design System (Task List + Filter)** | "Task List" pattern: full-row link, sentence-case status tag (`govuk-tag--blue`), `aria-describedby` for status[^9] | Plain black for "Completed", colored tag for in-progress[^9] | MOJ Filter component: applied filters as **removable chips** under "Selected filters" + "Clear filters" link, with "Apply filters" button at bottom (forces explicit apply, screen-reader friendly)[^8] | Filter collapses to button + sheet (responsive form behavior; horizontal layout still researched)[^8] | No GOV.UK consumer inbox component exists yet (#298 open backlog issue)[^20] |
| **MOJ Filter** | Sidebar with grouped checkboxes + counts ("Blue (18)") | Counts visible per option | Active-filter chips on top of list with "Remove this filter" SR text[^8] | Same component, responsive | Pattern explicitly designed for "case lists" — closest match to our Vorgang-Brief shape |
| **KERN UX-Standard (DE)** | Provides **Task List**, **Card**, **Tabs**, **Badge**, **Alert**, **Description List** primitives — no specific "Inbox" pattern but the building blocks are all present[^24] | Badge for status; Description List for letter metadata; Card for letter | No filter pattern documented; uses native HTML5 controls; AA-BITV compliance built-in[^24] | Native-HTML-first → responsive by default | Mandatory in DE federal admin services |
| **Berlin Designsystem** | Atomic design with "Verticals" — basic layout + variations[^25] | Standard typographic hierarchy | Not documented in publicly indexed content | Responsive | Mandatory for Berlin admin sites — relevant for our Behörden-Realismus |
| **HEY (Basecamp)** | **Three-stream model: Imbox / Feed / Paper Trail**[^11] | Per-sender once-and-done categorization (manual screen) | Category is the filter — not facets | Same on mobile | Strong precedent for *separating transactional from informational* inside one inbox |
| **Superhuman** | Split Inbox = user-defined workstreams (filter-as-folder) | Keyboard shortcuts (E mark done, R reply); AI auto-summarize[^26] | Filters become persistent splits | Tabbed splits | Optimizes triage speed; relevant for power-user mode but not gov-default |
| **Trade Republic Postbox (Timeline)** | Single chronological feed, PDF-per-entry[^27] | Push notification on new doc; "Postbox (Timeline)" framing as historical record | Minimal — chronological only | Mobile-native pattern | Tax-relevant docs surfaced; no reply (one-way) |
| **eesti.ee** | Personalized dashboard + inbox; entrepreneur view shows obligations + most-used services[^28] | Life-event-shaped surfacing | Personalization-driven, not facet-driven | Responsive | Useful precedent for Vorgang-led navigation, less for filter UX |

#### Concrete recommendations for our inbox restructure

1. **Collapse the always-on filter sidebar into a button + chip strip.** Replace the 260 px left sidebar with:
   - A `Filter` button (top-left of `LetterListHeader`, next to the tab switcher) → opens a sheet on mobile, popover on desktop ≥ md.
   - An **"Aktive Filter"** chip row directly below the search bar, mirroring the **MOJ "Selected filters"** pattern[^8]: each applied filter as a chip with `×` and an "Alle Filter zurücksetzen" link.
   - Frees ~260 px of horizontal real estate, fixes the mobile dialog kludge currently in `PosteingangInbox.tsx` lines 300-314.
2. **Eliminate the duplicate "Status" filter group.** The current `FilterStatus` checkboxes (Neu / Frist ≤ 7d / Frist > 7d / Erledigt / Archiv) duplicate exactly the Status-Group headers in the chronological list. Two competing controls produce the same effect — UX critique confirmed. Keep only the **Behörden-Kategorie** facet in the Filter popover. Status remains a *grouping affordance* in the chronological view, not a filter. (Archiv stays as a filter because it's a hide/show, not a grouping.)
3. **Adopt GOV.UK Task List visual idiom for the LetterCard.** Currently each card has 5+ chips (Behörde-Badge, Frist-Chip, Aktenzeichen, Vorgang-Tag, Authentizitäts-Badge, Datenschutz-Link). Per GOV.UK research[^9]:
   - Make the **whole card a single click target** (already true via the cover-Link, good — keep).
   - Move secondary chips (Authentizitäts-Badge, Datenschutz-Link) into the **LetterReader** rather than every card. Rationale: scanning-mode user does not need to see "Datenschutz-Cockpit" on every card; they need it once they have decided to engage. Keep on-card: Behörde, archetype, Frist, Aktenzeichen, Vorgang-Tag (max 4 visible elements).
   - Use sentence-case status text (already the case post-2023 GOV.UK iteration[^9]).
4. **Primary toggle: "Bescheide / Anschreiben / Alle" — a HEY-inspired transactional-vs-informational split.** Behördenbriefe legally split into Verwaltungsakte (Bescheide, frist-bewehrt) and reine Information (Anschreiben, keine Frist). Today our chronological view mixes both. Add a primary toggle above the existing tabs (or as a third tab segment) — `Bescheide (3) | Anschreiben (4) | Alle (7)`. The mental model "actionable vs background" reduces cognitive load far more than yet another facet[^11]. Maps cleanly onto our existing `letter.archetype` field.
5. **Mobile-first: drop the Vorgangs-tab on small screens, surface as a chip-filter instead.** On mobile (≤ md), the `Chronologisch / Nach Vorgang` tab competes with the Status-Group headers in tight vertical real estate. Better pattern (per Digital Post mobile model[^4][^10]): mobile shows a single chronological list, but the "Aktive Filter" chip row includes a `Vorgang: Umzug 2026 ×` chip that the user can apply from the LetterReader (`Diesem Vorgang folgen`) or from the `Vorgänge` page. Cleaner, fewer competing controls.

### Cross-axis: how the two interact

- **Reply trigger lives in LetterReader, not LetterCard.** Per Digital Post, GOV.UK Task List, and Mein Unternehmenskonto, the reply CTA is consistently *inside* the opened message, not on the list row. Keeps cards scannable, keeps reply intent deliberate.
- **"Entwürfe (N)"-Gruppe at top of chronological list, above "Neu"**. This is the one cross-cutting addition the inbox-restructure must expose. Drafts created in the reply sheet become first-class inbox objects, sorted ahead of unread Behörden-Briefe.
- **Reply sheet is a `Sheet` (right side, 480 px), not a `Dialog` (modal) and not a route.** Keeps user oriented in their inbox; supports "save draft and exit" gracefully; preserves AR-RTL via Tailwind `rtl:` automatic flip.
- **Mobile: reply sheet becomes full-screen route-like (`Sheet` with `inset-0`)** — the side-by-side principle does not apply at small viewports, so the LetterReader is briefly replaced by the reply form; back button returns the user with draft persisted.
- **Filter chip row coexists peacefully with `Bescheide/Anschreiben/Alle` toggle**: chips show *applied facets*, toggle shows *primary slice*. No conflict. Clear filters does not reset the toggle.

## Implications for our demo

- **Mock-backend additions** (`src/lib/mock-backend/api.ts`):
  - `Letter.reply_supported: boolean`, `Letter.reply_kind: 'frei' | 'formular_link' | 'keine'`.
  - New types `Reply` and `ReplyDraft` (id, letter_id, vorgang_id, template_kind, body, attachments[], status, created_at, updated_at, sent_at?).
  - New endpoints: `getDrafts()`, `getRepliesForLetter(id)`, `saveDraft(input)`, `submitReply(input)`.
  - Seed: half the letters opt-out of reply (`reply_kind: 'keine'`) → demonstrates the gate.
  - Attachment validation constants from ELSTER: `MAX_FILES = 20`, `MAX_FILE_BYTES = 10 * 1024 * 1024`, `MAX_TOTAL_BYTES = 36 * 1024 * 1024`, `ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg']`.
- **Components** to add in `src/components/posteingang/`:
  - `ReplySheet.tsx` (the `Sheet`-based reply UI with template picker / free-text / attachments).
  - `ReplyTemplatePicker.tsx` (Card-grid of 5 templates).
  - `ReplyDisclaimer.tsx` (the § 70 VwGO / § 357 AO banner).
  - `ActiveFilterChips.tsx` (MOJ-style applied-filter chip row).
  - `FilterPopover.tsx` (replaces the always-visible sidebar).
  - `DraftLetterRow.tsx` (entwurfs-zeile in chronological list).
  - `BescheidVsAnschreibenToggle.tsx` (the HEY-inspired primary toggle).
- **Strings** (i18n new keys; DE source-of-truth): `posteingang.reply.*`, `posteingang.filter.active_chips.*`, `posteingang.list.toggle_bescheide_anschreiben.*`, `posteingang.draft.*`. ~25 new keys.
- **Decisions for product-architect to lock**:
  - Templates: **5 fixed**, no LLM-generated reply text in V1.5 (RDG line). LLM only suggests *which* template fits, with explicit citation to the original letter.
  - Authentizitäts-Badge: keep on LetterCard for the demo, move to LetterReader-only after a11y user-test on cognitive load. (Verifier should weigh in.)
  - Whether `reply_supported` defaults to `false` or `true` for unknown Behörden → recommend `false` as the safer realism default.

## Open questions

- **What is the precise legal status of an "informelle Mitteilung" submitted via our reply UX?** Domain-expert must answer: when does a free-text reply via BundID/ZBP cross into a binding Erklärung (e.g., implied Antrag § 22 SGB X)? V1 disclaimer wording must be re-checked against this.
- **Does KERN UX-Standard ship a "Postfach" / inbox component in 2026 we should align with rather than invent fresh?** Their public component list[^24] does not show one as of the search date — worth a follow-up direct request to KERN's GitLab[^29].
- **Authentizitäts-Stufen for sent replies.** When *we* send the reply (mock), what's the equivalent of "EUDI-Wallet-versiegelt"? Is it `eingabe_durch_buerger:in` (V2 stub)? Needs decision.
- **AR-RTL behavior in reply sheet.** Reply *body* must be writable in any of our 6 locales but recipient parses German — do we offer a "Diese Nachricht ist auf Deutsch zu verfassen" hint when the user types in non-Latin script? UX risk worth piloting.
- **Mein Unternehmenskonto exposes "Antwort enthält Link zu Antwortformular" — is the form rendered inline, or via redirect?** Could not confirm from public docs — would change our mock.

## Sources

[^1]: [BundID — Wikipedia](https://de.wikipedia.org/wiki/BundID) — accessed 2026-05-09
[^2]: [Bidirektionale Kommunikation über Mein Unternehmenskonto](https://info.mein-unternehmenskonto.de/bidirektionalekommunikation/) — accessed 2026-05-09
[^3]: [Whitepaper „Zentrales Postfach im Kontext der Nutzerkonten" (IT-Planungsrat 2022)](https://www.it-planungsrat.de/fileadmin/beschluesse/2022/Beschluss2022-04_Zentrales_Buergerpostfach_Whitepaper.pdf) — accessed 2026-05-09
[^4]: [Digital Post — lifeindenmark.dk](https://lifeindenmark.borger.dk/apps-and-digital-services/Digital-Post) — accessed 2026-05-09
[^5]: [Digital Post — borger.dk Funktioner i Digital Post](https://www.borger.dk/hjaelp-og-vejledning/hvad-har-du-brug-for-hjaelp-til/digital-post/funktioner-i-digital-post) — accessed 2026-05-09
[^6]: [Digital Post on borger.dk — Digitaliseringsstyrelsen](https://en.digst.dk/digital-services/borgerdk-national-citizen-portal/digital-post-on-borgerdk/) — accessed 2026-05-09
[^7]: [ELSTER — Hilfe Sonstige Nachricht an das Finanzamt](https://www.elster.de/eportal/helpGlobal?themaGlobal=help_eing_sonstnachr) — accessed 2026-05-09
[^8]: [MOJ Design System — Filter component](https://design-patterns.service.justice.gov.uk/components/filter/) — accessed 2026-05-09
[^9]: [GOV.UK Design System — Task List](https://design-system.service.gov.uk/components/task-list/) — accessed 2026-05-09
[^10]: [Digital Post — Apps on Google Play (release notes)](https://play.google.com/store/apps/details?id=dk.digst.DigitalPost) — accessed 2026-05-09
[^11]: [HEY — The Imbox feature](https://www.hey.com/features/the-imbox/) and [HEY — Paper Trail](https://www.hey.com/features/paper-trail/) — accessed 2026-05-09
[^12]: [ELSTER — Sonstige Nachricht an das Finanzamt (Formular)](https://www.elster.de/eportal/formulare-leistungen/alleformulare/eingsonstnachr) — accessed 2026-05-09
[^13]: [Mein ELSTER — Posteingang FAQ (Bayerisches Landesamt für Steuern)](https://www.lfst.bayern.de/elster?f=lfst%2F) — accessed 2026-05-09
[^14]: [BundID wird 2026 zum Pflichtwerkzeug für Bürger — ad-hoc-news](https://www.ad-hoc-news.de/boerse/news/ueberblick/bundid-wird-2026-zum-pflichtwerkzeug-fuer-buerger/68444056) — accessed 2026-05-09 (single-source for "ZBP bidirectional 2026" timing — corroborate with BMI)
[^15]: [State Portal eesti.ee — ID.ee](https://www.id.ee/en/article/state-portal-eesti-ee/) — accessed 2026-05-09
[^16]: [State Portal eesti.ee — RIA](https://www.ria.ee/en/state-information-system/personal-services/state-portal-eestiee) — accessed 2026-05-09
[^17]: [Mijn Amsterdam — gemeente Amsterdam](https://www.amsterdam.nl/contact/mijn-amsterdam/) — accessed 2026-05-09
[^18]: [GOV.UK Notify — Receive text messages](https://www.notifications.service.gov.uk/using-notify/receive-text-messages) — accessed 2026-05-09
[^19]: [GOV.UK One Login — Sign in](https://www.gov.uk/using-your-gov-uk-one-login) — accessed 2026-05-09
[^20]: [GOV.UK Design System backlog — Issue #298 "Inbox pattern for mail, tasks or notifications"](https://github.com/alphagov/govuk-design-system-backlog/issues/298) — accessed 2026-05-09
[^21]: [TK App — Postfach](https://www.tk.de/techniker/leistungen-und-mitgliedschaft/online-services-versicherte/tk-app/tk-app-nachrichten-2023648) — accessed 2026-05-09
[^22]: [Meine AOK — Onlineportal und App](https://www.aok.de/pk/versichertenservice/onlineportal-meine-aok/) — accessed 2026-05-09
[^23]: [Service Public en 2025 — DILA actualité](https://www.dila.gouv.fr/actualites/presse/communiques/article/service-public-en-2025-des-ameliorations-continues-pour-les-usagers) — accessed 2026-05-09
[^24]: [KERN UX-Standard — Komponenten](https://www.kern-ux.de/komponenten/) — accessed 2026-05-09
[^25]: [Designsystem Berlin.de — Einleitung](https://designsystem.berlin.de/) — accessed 2026-05-09
[^26]: [Superhuman — What is email triage](https://blog.superhuman.com/email-triage/) — accessed 2026-05-09
[^27]: [Trade Republic Kundenvereinbarung (Postbox/Timeline)](https://assets.traderepublic.com/assets/files/CA_DE-de.pdf) — accessed 2026-05-09
[^28]: [Estonian state portal eesti.ee launches new entrepreneur view — ERR](https://news.err.ee/1608806203/estonian-state-portal-eesti-ee-launches-new-entrepreneur-view) — accessed 2026-05-09
[^29]: [KERN UX-Standard — GitLab pattern-library](https://gitlab.opencode.de/kern-ux/pattern-library) — accessed 2026-05-09

## Out-of-scope / risks (patterns we explicitly should NOT borrow)

- **Russian-Gosuslugi inbox aesthetic** (per `CLAUDE.md`): coloured icon-rich avatars per Behörde, large status pill stacks, overpopulated cards with 6+ chips. Our restructure goes the opposite direction (3-4 visible elements per card, quiet typography).
- **AI-generated reply drafts** (Superhuman/Hey AI auto-reply pattern[^26]): explicitly out-of-scope per V1 spec § 3 success criteria — RDG-line. LLM may *suggest a template choice* but must not generate German Verwaltungssprache that the user blindly sends.
- **Open free-text mailbox without per-authority opt-in** (eesti.ee-style `@eesti.ee` mail address): legally inappropriate for DE 2026 — no DE Behörde currently accepts unstructured mail as a binding submission. Forces us into informal-channel UX which contradicts demo realism.
- **Marking a citizen-sent reply as "Widerspruch" or "Einspruch" in the UI**: explicit UX redline. Our copy must say "informelle Mitteilung" or template-specific names ("Frist­verlängerung anfragen"); domain-expert must validate every template label.
- **"Read receipt" wording**: already redlined in V1 (Probe #4) — sent replies must NOT show "gelesen von Behörde" / "Behörde hat geöffnet". App-internal status only.
- **Auto-archive after N days** (Gmail-style): contradicts the citizen-respectful framing. User explicitly archives.
- **Notification badges on the OS app icon for every Anschreiben**: would train users to tune out — only Bescheide with active Frist should drive push.
