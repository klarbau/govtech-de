/**
 * V1.2 — Familienkasse-Wechsel-Counter Lookup-Tabelle (Spec § 5.5).
 *
 * Briefe/Jahr-Hochrechnungen aus Behörden-typischer Korrespondenz-Frequenz
 * (Mock-Annahmen für Demo; nicht echt-belegt). `toggleNotificationPraeferenz`
 * liest aus dieser Tabelle und gibt `{ counter }` zurück — die UI rendert den
 * Counter inline (siehe `<LiveCounter>`-Component, Spec § 6.9).
 *
 * Hard-Line § 11.31 (Hero-Wert): `familie × postfach` ist verbindlich
 * `{ briefe_pro_jahr_gespart: 8, tage_frist_gespart: 4 }`.
 *
 * Tage-Frist-Gespart-Logik: Differenz zwischen § 41 Abs. 2 VwVfG (3-Tage-
 * Postbrief-Bekanntgabe-Fiktion) und § 9 Abs. 1 S. 3 OZG (4-Tage-Postfach-
 * Bekanntgabe-Fiktion); de facto ergibt der Postfach-Kanal eine ZU-VOR-
 * Verfügbarkeit von 3-4 Tagen, weil der Bescheid bereits am Tag der
 * Bereitstellung gelesen werden kann (vs. Postlauf 1-3 Tage zzgl. 3-Tages-
 * Fiktion). Demo-Wert `4` ist die kommunikative Formel „4 Tage je Bescheid".
 */
import type {
  NotificationKanal,
  VorgangsKategorie,
} from '@/types/persona-kontakt';

export interface SavingsCounter {
  briefe_pro_jahr_gespart: number;
  tage_frist_gespart: number;
}

/**
 * Lookup-Tabelle: Kategorie × Kanal → Counter. **Alle 5 × 4 = 20
 * Kombinationen sind definiert** (kein `undefined` im Lookup; Spec § 15.1
 * test).
 *
 * Werte gelten für den Wechsel **auf** den jeweiligen Kanal (Default ist
 * `brief`; Wechsel zurück auf `brief` ergibt `0/0`). E-Mail-Pilot und SMS-
 * Pilot ändern NUR die Notification-Adresse, NICHT den Bekanntgabe-Kanal —
 * deshalb stets `0/0` (Hard-Line § 11.37).
 */
export const SAVINGS_LOOKUP: Record<
  VorgangsKategorie,
  Record<NotificationKanal, SavingsCounter>
> = {
  steuer: {
    // Steuer-Folgejahr-Bescheide; § 122a Abs. 4 AO ELSTER-Posteingang läuft
    // separat zum BundID-Postfach — Demo-Wert berücksichtigt nur den
    // BundID-relevanten Teil (Bescheid-Korrespondenz Finanzamt).
    postfach: { briefe_pro_jahr_gespart: 4, tage_frist_gespart: 4 },
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  sozial: {
    // DRV/GKV-Folgebescheide. Demo-Wert nimmt 6 Briefe/Jahr an (DRV-Yellow-
    // Letter, GKV-Beitragsbescheid, GKV-Mitgliedsbescheinigungen,
    // Pflegekasse-Korrespondenz, etc.).
    postfach: { briefe_pro_jahr_gespart: 6, tage_frist_gespart: 4 },
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  familie: {
    // HERO-WERT: Familienkasse-Folgezyklus. Hard-Line § 11.31 verbindlich:
    // 8 Briefe/Jahr (≈ 1 Bescheid je 6 Wo) und 4 Tage Bekanntgabe-Frist je
    // Bescheid (§ 9 Abs. 1 S. 3 OZG vs. § 41 Abs. 2 VwVfG).
    postfach: { briefe_pro_jahr_gespart: 8, tage_frist_gespart: 4 },
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  verkehr: {
    // KFZ-Behörden 2026 nicht an BundID-Postfach angebunden — Picker bleibt
    // einstellbar (Speculative-Vision), aber kein Live-Counter > 0
    // (kommunikative Klarheit — § 41 Abs. 2 VwVfG bleibt einschlägig).
    postfach: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  sonstige: {
    // Bürgeramt + sonstige Bundesleistungen. Mock: 2 Briefe/Jahr.
    postfach: { briefe_pro_jahr_gespart: 2, tage_frist_gespart: 4 },
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
};

/**
 * Liefert den Counter für eine `(kategorie, kanal)`-Kombination. Niemals
 * `undefined` (Spec § 15.1) — fällt im Worst-Case auf `0/0` zurück.
 */
export function lookupSavingsCounter(
  kategorie: VorgangsKategorie,
  kanal: NotificationKanal,
): SavingsCounter {
  return (
    SAVINGS_LOOKUP[kategorie]?.[kanal] ?? {
      briefe_pro_jahr_gespart: 0,
      tage_frist_gespart: 0,
    }
  );
}
