# Personas

To be expanded by domain-expert during the first pipeline run. The personas listed here are the initial canonical set; their full data graph (Stammdaten, family, employment, residency, document vault) will live in `src/data/personas.json` once mock-backend-coder seeds it.

---

## Anna Petrov, 28

- **Status**: Blue Card EU, §18g AufenthG, valid until 2027-09-14. *(Korrigiert 2026-05-08 von §18b AufenthG: seit der AufenthG-Reform 2023 ist die Blue Card EU in §18g AufenthG geregelt; §18b betrifft heute Hochqualifizierte/Niederlassungserlaubnis-Sonderfälle. Carry-forward von domain-expert + concept-verifier.)*
- **Origin**: St Petersburg → Berlin (2023).
- **Family**: partner (DE staatsangehörig), 1 child (geboren 2024-11-03, currently in Eingewöhnung Kita).
- **Employment**: Senior software engineer, employed at a Mittelstand company in Berlin-Mitte.
- **Languages**: RU (native), DE (B2), EN (fluent).
- **Pain points**:
  - Aufenthaltstitel-Verlängerung in 2027 — needs to start 4 months ahead.
  - Did not know that birthday of child triggers Kindergeld application; missed first 3 months retroactively-claimable window.
  - Anmeldung after Umzug took 5 weeks to get a Termin.
  - Tax return as Blue Card holder with foreign-source income is opaque.

**Why she is the primary persona for the demo**: she represents the foreign-skilled-worker cohort the German government most actively wants to attract and retain; her pain is acute and well-documented; the project owner shares much of her lived experience.

---

## Familie Schmidt

- **Constellation**: Markus (38), Lena (35), Felix (4), Mia (geboren in 2 Wochen — der zweite Vorgang im Demo).
- **Wohnort**: Hamburg-Eimsbüttel.
- **Beschäftigung**: Markus angestellt, Lena selbstständig (Architektin).
- **Languages**: DE (native), EN (B2).
- **Pain points**:
  - Mias Geburt löst ~7 separate Anträge aus (Geburtsurkunde, Krankenkassenanmeldung, Elterngeld, Elterngeld-Plus, Kindergeld, Steuer-ID-Eintragung, Kita-Voranmeldung).
  - Lenas selbstständiger Status macht Elterngeld-Berechnung kompliziert.
  - Markus weiß nicht, dass Familienkasse zentral Kindergeld zahlt, nicht das Finanzamt.

**Why this persona**: showcases the `kindergeburt` autopilot — the single most compressible bureaucratic event in a typical DE family's life.

---

## Mehmet Yıldız, 34

- **Status**: deutsch-türkisch (eingebürgert 2018), in Köln.
- **Background**: angestellt seit 12 Jahren, will Gewerbe anmelden (Beratung im Bereich erneuerbarer Energien).
- **Family**: verheiratet, 2 Kinder (8 und 5).
- **Languages**: DE (native), TR (native), EN (B1).
- **Pain points**:
  - Gewerbeanmeldung beim Gewerbeamt löst Folgeprozesse aus, die selten erklärt werden: Finanzamt-Fragebogen zur steuerlichen Erfassung, IHK-Pflichtmitgliedschaft, ggf. Berufsgenossenschaft, Krankenkassen-Statuswechsel.
  - Statuswechsel bei Krankenkasse (gesetzlich → freiwillig versichert oder privat) ist eine der teuersten Entscheidungen seines Lebens — keine zentrale Beratung.
  - Steuerlicher Erfassungsbogen ist 8 Seiten lang.

**Why this persona**: demonstrates the `gewerbeanmeldung` autopilot and the AI assistant's role in explaining cascading decisions in a language the user is comfortable in (TR + DE).

---

## Onboarding flow

The onboarding screen lets viewers pick one of these three personas to "log in as", since real DeutschlandID doesn't exist yet. Each persona pre-seeds the demo state with their realistic letters, vorgaenge, documents, and termine — so the dashboard immediately looks lived-in.

The onboarding flow itself is a stylised mock of DeutschlandID + EUDI Wallet pairing — fake QR code, fake biometric tap, brief disclaimer about the prototype nature.
