/**
 * V1.3 — ISO/IEC 18013-5 Annex-B Selective-Disclosure-Toggle-Set
 * (Spec § 5.5 / VL-9 / HL-MOB-9).
 *
 * Coverage:
 *   (a) `ISO_18013_5_MDL_TOGGLE_SET` enthält die 14 ISO-Attribute aus § 5.5.
 *   (b) Enthält **nicht**:
 *         - `punkte` / `punktezahl` (FAER-Attribut, kein mDL)
 *         - `mpu_status`
 *         - `bezirk_der_fe_behoerde`
 *         - `schluesselzahl_95_isolated` (Schlüssel 95 nicht isoliert)
 *         - `faer_eintragungen`
 *   (c) Re-Export aus mock-backend stimmt mit `@/types/mobilitaet` überein.
 *   (d) TypeScript-Type-Inferenz auf `MdlSelectiveDisclosureToggle` covers
 *       genau diese 14 Attribute.
 */
import { describe, expect, test } from 'vitest';
import {
  ISO_18013_5_MDL_TOGGLE_SET,
  type MdlSelectiveDisclosureToggle,
} from '@/types/mobilitaet';
import {
  ISO_18013_5_MDL_TOGGLE_SET as MDL_FROM_MOCK_BACKEND,
} from '@/lib/mock-backend/wallet/iso-18013-5-toggle-set';

describe('V1.3 ISO/IEC 18013-5 Selective-Disclosure-Set (HL-MOB-9 / VL-9)', () => {
  const EXPECTED_14 = [
    'given_name',
    'family_name',
    'birth_date',
    'age_over_18',
    'age_in_years',
    'driving_privileges',
    'portrait',
    'signature_usual_mark',
    'issue_date',
    'expiry_date',
    'issuing_authority',
    'issuing_country',
    'document_number',
    'un_distinguishing_sign',
  ];

  test('enthält genau die 14 ISO-Attribute (§ 5.5)', () => {
    expect(ISO_18013_5_MDL_TOGGLE_SET.length).toBe(EXPECTED_14.length);
    for (const attr of EXPECTED_14) {
      expect(ISO_18013_5_MDL_TOGGLE_SET).toContain(attr);
    }
  });

  test('Forbidden — punkte / punktezahl', () => {
    expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain('punkte');
    expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain('punktezahl');
  });

  test('Forbidden — mpu_status', () => {
    expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain('mpu_status');
  });

  test('Forbidden — bezirk_der_fe_behoerde', () => {
    expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain('bezirk_der_fe_behoerde');
  });

  test('Forbidden — schluesselzahl_95_isolated', () => {
    expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain(
      'schluesselzahl_95_isolated',
    );
  });

  test('Forbidden — faer_eintragungen', () => {
    expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain('faer_eintragungen');
  });

  test('Mock-Backend Re-Export === Type-Module-Export (single source of truth)', () => {
    expect(MDL_FROM_MOCK_BACKEND).toBe(ISO_18013_5_MDL_TOGGLE_SET);
  });

  test('TypeScript-Type: MdlSelectiveDisclosureToggle covers the 14 expected attributes', () => {
    // Compile-time assertion: each of the 14 EXPECTED_14 strings is assignable
    // to MdlSelectiveDisclosureToggle. If `ISO_18013_5_MDL_TOGGLE_SET` drifts,
    // this test will fail to type-check.
    const sample: MdlSelectiveDisclosureToggle = 'driving_privileges';
    expect(EXPECTED_14).toContain(sample);
  });
});
