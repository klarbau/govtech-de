/**
 * V1.2 — Stammdaten Kontakt-Schicht (BundID-Postfach, E-Mail, Mobilfunk,
 * Notification-Präferenzen). Spec: `docs/specs/stammdaten-v1-1-kontakt-schicht.md`
 * § 4.1 / § 4.2 (V1 → V1.1-shape full rename).
 *
 * Hard-Lines (verbatim aus § 11 der Spec):
 *   - § 11.31 Familienkasse-Wechsel-Cascade als V1.1-Wow-Mechanik
 *   - § 11.32 § 9 OZG primary norm für BundID-Postfach-Bekanntgabe
 *   - § 11.33 Einwilligung pro Verwaltungsleistung — niemals Master-Toggle
 *   - § 11.34 Föderalismus-Card-Disclaimer prominent
 *   - § 11.35 Per-Behörde `bundid_postfach_anbindung` Pflicht-Feld
 *   - § 11.36 Vision-Modus mit erneutem Save-Confirm pro Mutation
 *   - § 11.37 SMS/Push niemals als Bekanntgabe-Kanal
 *   - § 11.38 Sozialdaten-Hard-Lock (SGB X §§ 67ff.)
 *   - § 11.40 Aktivitätsprotokoll-Bucket Richtung-Filter
 *   - § 11.41 Mehmet-Selbstständigen-Disclaimer
 */

/**
 * BundID-verifizierte E-Mail-Adresse. Quelle: BundID self-service Magic-Link-
 * Verifikation beim Account-Anlegen (research-scout R-4 + verifier C-3).
 *
 * Hard-Line: NICHT als hoheitlich-attestiertes Identitäts-Attribut darstellen —
 * `verified=true` heißt nur „Adresse existierte zum Verifikations-Zeitpunkt
 * und Account-Inhaber:in hatte Zugriff". Drittbehörden, die NICHT an BundID
 * angebunden sind (Service-BW, Mein-Servicekonto-Berlin, NRW-Konto,
 * BayernID, HH-Servicekonto) nutzen diese E-Mail NICHT — Disclaimer-Marker
 * `bundid_email_only_for_bundid_attached_behoerden`.
 */
export interface BundIdEmail {
  /** [MOCK]-Format. */
  value: string;
  /** `true` = Magic-Link bestätigt. */
  verified: boolean;
  quelle: 'bundid';
  /** ISO-8601 (YYYY-MM-DD). */
  verifiziert_am?: string;
}

/**
 * Self-attested Mobilfunknummer. KEIN hoheitliches Register hält Mobilfunknummern
 * in DE (research-scout R-4 + verifier C-3-Differenzierung).
 *
 * 2FA-Verfahren bei BundID ist primär eID, nicht SMS-OTP — Mobilfunk hier ist
 * nur „bequemer Notification-Träger", keine Bekanntgabe-Authentifizierung
 * (§§ 41 Abs. 2a VwVfG / 9 OZG verlangen Authentifizierung, die SMS nicht
 * bietet — domain-expert C-4 + Hard-Line § 11.37).
 */
export interface BundIdMobil {
  /** [MOCK]-Format. */
  value: string;
  /** `true` = Mock-OTP-Flow durchlaufen. */
  verified: boolean;
  quelle: 'bundid_self_attested';
  /** ISO-8601 (YYYY-MM-DD). */
  verifiziert_am?: string;
}

/**
 * BundID-Postfach-Status. Drei Zustände möglich:
 * - `aktiv`: Bürger:in hat Postfach unter id.bund.de aktiviert
 * - `inaktiv`: Postfach noch nicht aktiviert (per-Account opt-in nach § 9 OZG;
 *   Aktivierung erfolgt im id.bund.de-Konto, NICHT in unserer App)
 * - `teilaktiviert`: Aktivierung läuft (Account-Sync-Mock; Demo-Pattern)
 *
 * Hard-Line § 11.32: Aktivierung wird in unserer App NICHT angeboten.
 * Wegweiser-Pointer auf id.bund.de/de/postfach.
 */
export interface BundIdPostfach {
  /** Shorthand für `status === 'aktiv'`. */
  aktiviert: boolean;
  status: 'aktiv' | 'inaktiv' | 'teilaktiviert';
  /** ISO-8601 (YYYY-MM-DD). */
  aktiviert_am?: string;
}

/**
 * BundID-Postfach-Anbindungs-Status einer Behörde (Stand 2026, Mock).
 *
 * Spec § 4.3 Pflicht-Feld an `Behoerde`. UI-Picker und Cards lesen
 * ausschließlich aus diesem Feld (Hard-Line § 11.35).
 */
export type BundidPostfachAnbindung =
  | 'angebunden'        // Picker enabled, kein zusätzlicher Disclaimer
  | 'in_pilotierung'    // Picker enabled mit Note "Pilot-Phase"
  | 'nicht_angebunden'; // Picker hard-locked auf 'brief' mit Reason-Tooltip

/**
 * Notification-Kanal pro Vorgangs-Kategorie. SMS und Push sind NIE als
 * Bescheid-Kanal darstellbar — sie sind reine Notification-über-Postfach-
 * Eingang-Kanäle (Hard-Line § 11.37; verifier H-3, domain-expert C-4).
 *
 * Sozialdaten-Inhalt darf NIE in SMS/Push-Renderings rendern (Hard-Line
 * § 11.38; verifier H-7, domain-expert C-8).
 */
export type NotificationKanal =
  | 'postfach'        // BundID-Postfach via § 9 OZG (4-Tage-Bekanntgabe-Fiktion)
  | 'email_pilot'     // BundID-E-Mail-Notification (informatorisch, kein Bescheid)
  | 'sms_pilot'       // SMS als Notification-Hinweis (nie als Bekanntgabe)
  | 'brief';          // Postbrief via § 41 Abs. 2 VwVfG (rechtssicher Default)

/**
 * Vorgangs-Kategorie-Schlüssel der Notification-Präferenzen. **Genau 5
 * Kategorien** (verifier-Hard-Cap, sonst Cockpit-Falle).
 */
export type VorgangsKategorie =
  | 'steuer'    // Finanzamt / BZSt → Norm: § 122a Abs. 4 AO
  | 'sozial'    // DRV / GKV / Bürgergeld → Norm: § 36a SGB I + § 41 Abs. 2a VwVfG
  | 'familie'   // Familienkasse / Elterngeld / Wohngeld → Norm: § 9 OZG
  | 'verkehr'   // KFZ / Bußgeld / Führerschein → Norm: § 41 Abs. 2 VwVfG (postalisch)
  | 'sonstige'; // Bürgeramt / Aufenthalt / sonstige → Norm: § 9 OZG

/**
 * Notification-Präferenz pro Vorgangs-Kategorie. **Speculative-2027** —
 * diese Funktion existiert in DE 2026 nicht (verifier H-9; orchestrator-
 * decision D2).
 *
 * 5 Kategorien (Hard-Cap). ABH-Aspekt der Mehmet-Persona ist als Sub-Picker-
 * Card UNTER `sonstige` (hard-locked auf `brief`); keine eigene 6.
 * Kategorie (verifier-Hard-Cap; siehe Hard-Line § 11.34).
 */
export interface NotificationPraeferenzen {
  steuer: NotificationKanal;
  sozial: NotificationKanal;
  familie: NotificationKanal;
  verkehr: NotificationKanal;
  sonstige: NotificationKanal;
}

/**
 * Top-Level Kontakt-State einer Persona. Spec § 4.1 V1.1-shape (full rename
 * aus V1 `Persona.kontakt: { email?, mobil? }`).
 */
export interface PersonaKontakt {
  bundid_email: BundIdEmail;
  /** `undefined` = Persona hat keine Mobilfunk-Nummer hinterlegt. */
  bundid_mobil?: BundIdMobil;
  bundid_postfach: BundIdPostfach;
  notification_praeferenzen: NotificationPraeferenzen;
}

/**
 * Aliase für die Spec-Symbole `KontaktState` (siehe § 4.2). `KontaktState`
 * ist Briefing-Sprech für `PersonaKontakt`.
 */
export type KontaktState = PersonaKontakt;

/**
 * Hero-Cascade-Result, das `toggleNotificationPraeferenz` beim Wechsel auf
 * `familie` × `postfach` (oder analog) zurückgibt. Counter-Werte stammen aus
 * `notification/savings-lookup.ts`.
 *
 * Spec § 5.1 + § 11.31 (Hero-Wow). Frontend rendert den Counter inline und
 * triggert beim Hero-Pfad zusätzlich `simulateFamilienkasseFollowupLetter`.
 */
export interface FamilienkasseCascade {
  /**
   * Briefe pro Jahr, die durch den Wechsel auf `postfach` ersparbar wären.
   * Hero-Wert für `familie × postfach` ist verbindlich `8` (Hard-Line § 11.31).
   */
  ersparte_briefe_pro_jahr: number;
  /**
   * Tage Bekanntgabe-Frist je Bescheid (§ 9 OZG vs. § 41 Abs. 2 VwVfG).
   * Hero-Wert ist verbindlich `4` (§ 9 Abs. 1 S. 3 OZG-Bekanntgabe-Fiktion).
   */
  ersparte_tage_pro_bescheid: number;
  /** Vorher-Frame: existing letter-id mit `kanal: 'brief'`. */
  vorher_letter_id?: string;
  /**
   * Nachher-Frame: synthetische Postfach-Followup-Letter-ID. Wird im
   * Hero-Pfad durch `simulateFamilienkasseFollowupLetter` materialisiert
   * (§ 5.1) — hier nur Hint für die UI.
   */
  followup_letter_hint_id?: string;
}

/**
 * Ergebnis eines `toggleNotificationPraeferenz`-Aufrufs.
 *
 * `cascade` ist nur gesetzt bei der Hero-Kombination `familie × postfach`
 * (Anna-Persona) oder vergleichbaren cascade-relevanten Kombinationen.
 * Frontend nutzt das Feld als Trigger für die Cascade-Animation.
 */
export interface ToggleNotificationPraeferenzResult {
  ok: true;
  /**
   * Counter-Daten (Briefe/Jahr-gespart + Tage/Frist-gespart) — kommen aus
   * `SAVINGS_LOOKUP[kategorie][kanal]`. Frontend rendert den Live-Counter
   * inline auch wenn beide Werte `0` sind (kein-savings-Fall, § 6.9).
   */
  counter: {
    briefe_pro_jahr_gespart: number;
    tage_frist_gespart: number;
  };
  /**
   * Hero-Cascade-Daten — nur für Anna × `familie` × `postfach` gesetzt.
   * Frontend rendert die `<FamilienkasseWechselCascade>`-Animation und ruft
   * `simulateFamilienkasseFollowupLetter()` auf.
   */
  cascade?: FamilienkasseCascade;
}

/**
 * Mock-OTP-Demo-Code (Hard-Line § 11.37 Demo-Pattern). Akzeptiert immer den
 * Code `124857`; alle anderen Werte werfen `OTP_INVALID`.
 */
export const MOCK_OTP_DEMO_CODE = '124857' as const;
