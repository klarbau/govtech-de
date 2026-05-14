/**
 * Phase 6c — Stammdaten UX-Refactor verification.
 *
 * Static/grep tests for the additions:
 *   - `StammdatenSectionNav` component exists and exports `StammdatenSectionNavKey`.
 *   - `MdlTeaserCard` component exists.
 *   - i18n source-of-truth (de.json) has all required keys.
 *   - V1.3 ban-list stays intact for any new strings introduced.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const DE_JSON = join(REPO_ROOT, 'src/lib/i18n/locales/de.json');
const NAV_FILE = join(
  REPO_ROOT,
  'src/components/stammdaten/StammdatenSectionNav.tsx',
);
const TEASER_FILE = join(
  REPO_ROOT,
  'src/components/stammdaten/MdlTeaserCard.tsx',
);
const MOBILITAET_FILE = join(
  REPO_ROOT,
  'src/components/stammdaten/mobilitaet/MobilitaetSektion.tsx',
);

interface KeyTree {
  [key: string]: string | KeyTree;
}

function loadDeRoot(): KeyTree {
  return JSON.parse(readFileSync(DE_JSON, 'utf-8')) as KeyTree;
}

function getByPath(root: KeyTree, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as KeyTree)) {
      return (acc as KeyTree)[segment];
    }
    return undefined;
  }, root);
}

describe('Phase 6c — file presence', () => {
  test('StammdatenSectionNav.tsx exists', () => {
    expect(existsSync(NAV_FILE)).toBe(true);
  });

  test('MdlTeaserCard.tsx exists', () => {
    expect(existsSync(TEASER_FILE)).toBe(true);
  });

  test('StammdatenSectionNav exports StammdatenSectionNavKey type', () => {
    const src = readFileSync(NAV_FILE, 'utf-8');
    expect(src).toMatch(/export type StammdatenSectionNavKey\s*=/);
  });

  test('StammdatenSectionNav exports the named component', () => {
    const src = readFileSync(NAV_FILE, 'utf-8');
    expect(src).toMatch(/export function StammdatenSectionNav/);
  });

  test('MdlTeaserCard exports the named component', () => {
    const src = readFileSync(TEASER_FILE, 'utf-8');
    expect(src).toMatch(/export function MdlTeaserCard/);
  });
});

describe('Phase 6c — i18n source-of-truth keys (de.json)', () => {
  test.each([
    'stammdaten.section_nav.label',
    'stammdaten.section_nav.items.identitaet',
    'stammdaten.section_nav.items.anschrift',
    'stammdaten.section_nav.items.familie',
    'stammdaten.section_nav.items.altersvorsorge',
    'stammdaten.section_nav.items.krankenversicherung_pflege',
    'stammdaten.section_nav.items.mobilitaet',
    'stammdaten.section_nav.items.dokumente',
    'stammdaten.section_nav.items.sperren_einstellungen',
    'stammdaten.mdl_teaser.title',
    'stammdaten.mdl_teaser.body',
    'stammdaten.mdl_teaser.cta',
    'stammdaten.mdl_teaser.vision_pill',
    'stammdaten.hero.disclaimer_section_label',
    'stammdaten.sektion.mobilitaet.preview_no_fe',
    'stammdaten.sektion.mobilitaet.preview_fe_classes',
    'stammdaten.sektion.mobilitaet.preview_fe_with_pflichtumtausch',
    'stammdaten.sektion.mobilitaet.preview_fe_only',
    'stammdaten.sektion.mobilitaet.preview_halter_count',
  ])('de.json defines %s', (path) => {
    const root = loadDeRoot();
    const value = getByPath(root, path);
    expect(value, `missing or non-string for ${path}`).toBeDefined();
    expect(typeof value).toBe('string');
  });
});

describe('Phase 6c — MobilitaetSektion uses the new preview helper', () => {
  test('uses buildSubtitlePreview() in collapsed-state', () => {
    const src = readFileSync(MOBILITAET_FILE, 'utf-8');
    expect(src).toMatch(/buildSubtitlePreview\(data, t\)/);
    expect(src).toMatch(/data-testid="mobilitaet-subtitle"/);
  });

  test('preview helper handles no-FE, pflichtumtausch and halter cases', () => {
    const src = readFileSync(MOBILITAET_FILE, 'utf-8');
    expect(src).toMatch(/preview_no_fe/);
    expect(src).toMatch(/preview_fe_with_pflichtumtausch/);
    expect(src).toMatch(/preview_fe_only/);
    expect(src).toMatch(/preview_halter_count/);
  });
});

describe('Phase 6c — V1.3 ban-list compliance for new strings', () => {
  // We only check the de.json values for the new Phase 6c sub-trees.
  // The full file is checked by stammdaten-v1-3-ban-list-grep.test.ts;
  // this test guards against future drift in the Phase 6c sub-trees.
  const FORBIDDEN_PHRASES = [
    /Halter[-_ ]?Adresse[-_ ]?aktualisiert/i,
    /automatische[r]?\s+Synchron(?:isation|isierung)/i,
    /synchronisiert\s+automatisch/i,
  ];

  test('section_nav sub-tree contains no banned phrases', () => {
    const root = loadDeRoot();
    const subtree = JSON.stringify(getByPath(root, 'stammdaten.section_nav'));
    for (const re of FORBIDDEN_PHRASES) {
      expect(subtree).not.toMatch(re);
    }
  });

  test('mdl_teaser sub-tree contains no banned phrases', () => {
    const root = loadDeRoot();
    const subtree = JSON.stringify(getByPath(root, 'stammdaten.mdl_teaser'));
    for (const re of FORBIDDEN_PHRASES) {
      expect(subtree).not.toMatch(re);
    }
  });

  test('mobilitaet preview keys contain no banned phrases', () => {
    const root = loadDeRoot();
    const mobilitaet = getByPath(root, 'stammdaten.sektion.mobilitaet');
    const subtree = JSON.stringify(mobilitaet);
    for (const re of FORBIDDEN_PHRASES) {
      expect(subtree).not.toMatch(re);
    }
  });
});

describe('Phase 6c — V1.3 mDL closed-list integrity (regression-guard)', () => {
  test('MdlTeaserCard does NOT render any mDL attribute (closed-list lives in Wallet)', () => {
    const src = readFileSync(TEASER_FILE, 'utf-8');
    // Per HL-MOB-9 / VL-9, the mDL ISO_18013_5_MDL_TOGGLE_SET attribute names
    // must only be rendered inside the Wallet-Sub-Tab. The teaser is just a
    // pointer; never display attributes here.
    const FORBIDDEN = [
      'given_name',
      'family_name',
      'birth_date',
      'driving_privileges',
      'issuing_authority',
      'issuing_country',
      'document_number',
      'issue_date',
      'expiry_date',
    ];
    for (const attr of FORBIDDEN) {
      expect(src, `MdlTeaserCard must not reference ${attr}`).not.toMatch(
        new RegExp(`\\b${attr}\\b`),
      );
    }
  });
});
