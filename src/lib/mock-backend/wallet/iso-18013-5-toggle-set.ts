/**
 * VL-9 / HL-MOB-9 closed-enum re-export.
 *
 * Die Source-of-Truth ist `src/types/mobilitaet.ts` (`ISO_18013_5_MDL_TOGGLE_SET`);
 * dieses Mock-Backend-Modul re-exportiert die Konstante nur, damit Backend-
 * interne Aufrufer (z. B. `getMdlAttestation`) sie ohne Type-Cross-Cut nutzen
 * können.
 *
 * Spec: `docs/specs/stammdaten-v1-3-mobilitaet.md` § 5.5.
 *
 * Forbidden Toggles (verifier-locked):
 *   - punkte / punktezahl (FAER — kein mDL-Attribut)
 *   - bezirk_der_fe_behoerde
 *   - mpu_status
 *   - schluesselzahl_95_isolated
 *   - faer_eintragungen
 *
 * Unit-test enforcement:
 *   `tests/unit/stammdaten-v1-3-iso-mdl-toggle-enum.test.ts`
 */
export {
  ISO_18013_5_MDL_TOGGLE_SET,
  type MdlSelectiveDisclosureToggle,
} from '@/types/mobilitaet';
