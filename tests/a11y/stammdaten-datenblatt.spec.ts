/**
 * Stammdaten „Datenblatt" — Struktur- + axe-Abnahme
 * (Spec `stammdaten-datenblatt.md` § 13).
 *
 * Ersetzt `stammdaten-v3-redesign.spec.ts` + `redesign-stammdaten.spec.ts`.
 * Geprüft werden die maschinell prüfbaren Akzeptanzkriterien des Redesigns:
 * genau ein `h1`, genau EIN Header-Trigger, keine `v2-*`-Anker mehr, keine
 * Fortschritts-Grafik, die Subline-Zahl == gerenderte Wertzeilen, Blur-Budget
 * (kein `backdrop-filter` im `main`), sichtbare Statuswörter im Register-Modul,
 * Persona-Degradation und axe (WCAG 2.1 AA) in light + dark × 1280/390.
 *
 * NICHT hier: der `NEXT_PUBLIC_LG=0`-Durchlauf aus § 13 — der Kill-Switch ist
 * eine Server-Env-Variable, also ein eigener Lauf des a11y-testers gegen einen
 * mit `NEXT_PUBLIC_LG=0` gestarteten Dev-/Prod-Server, nicht per-Test schaltbar.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function setupPersona(page: Page, personaId: string, locale = 'de') {
  await page.context().addCookies([
    { name: LOCALE_COOKIE_NAME, value: locale, domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        window.localStorage.setItem(
          `${ns}meta`,
          JSON.stringify({
            version: 1,
            active_persona_id: id,
            seeded_at: new Date().toISOString(),
            reliable_mode: true,
          }),
        );
        for (const key of [
          'profile',
          'stammdaten:kontakt',
          'stammdaten:uebermittlungs-log',
        ]) {
          window.localStorage.removeItem(`${ns}${key}`);
        }
      } catch {
        // ignore
      }
    },
    [NS, personaId],
  );
}

async function warm(page: Page) {
  await page.goto('/stammdaten', { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="sd-datenblatt"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
  await page
    .locator('[data-testid="sd-protokoll"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
}

function blockers(results: { violations: Array<{ impact?: string | null }> }) {
  return results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
}

test.describe('Stammdaten Datenblatt — Struktur', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersona(page, 'anna-petrov');
    await warm(page);
  });

  test('genau ein h1 und eine sprungfreie Heading-Ordnung', async ({ page }) => {
    await expect(page.locator('main h1')).toHaveCount(1);

    const levels = await page
      .locator('main h1, main h2, main h3, main h4')
      .evaluateAll((nodes) =>
        nodes.map((n) => Number(n.tagName.replace('H', ''))),
      );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test('genau ein Header-Trigger, keine v2-Anker, keine Fortschritts-Grafik', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="sd-header-actions"] button'),
    ).toHaveCount(1);
    await expect(page.locator('main [data-testid^="v2-"]')).toHaveCount(0);
    await expect(page.locator('main svg[stroke-dasharray]')).toHaveCount(0);

    const mainText = (await page.locator('main').innerText()) ?? '';
    expect(mainText).not.toContain('%');
  });

  test('die Subline-Zahl entspricht den gerenderten Wertzeilen', async ({
    page,
  }) => {
    const subline = await page.locator('main .gt-page-head .sub').innerText();
    const angaben = Number(subline.match(/(\d+)\s+Angabe/)?.[1] ?? '0');
    expect(angaben).toBeGreaterThan(0);

    const identitaetRows = await page
      .locator('[data-testid="sd-identitaet-fakten"] dd')
      .count();
    const datenblattRows = await page
      .locator('[data-testid="sd-datenblatt"] dd')
      .count();
    /* Band 1 zählt ohne die Zeile „Führende Quelle" (Herkunft, keine Angabe).
       Ebenfalls draußen — und deshalb wird der Fakten-`dl` gezielt adressiert,
       nicht jedes `dd` in Band 1: die Dokument-Zeilen der eID-Karte
       (Ausweisdokument, ausstellende Behörde, Online-Ausweis) beschreiben das
       Credential, nicht die aus Registern geführten Angaben. */
    expect(angaben).toBe(identitaetRows - 1 + datenblattRows);
  });

  test('Blur-Budget: kein backdrop-filter im main', async ({ page }) => {
    const blurred = await page.locator('main *').evaluateAll((nodes) =>
      nodes.filter((n) => {
        const style = window.getComputedStyle(n as Element);
        const value =
          style.backdropFilter ||
          (style as CSSStyleDeclaration & { webkitBackdropFilter?: string })
            .webkitBackdropFilter ||
          'none';
        return value !== 'none' && value !== '';
      }).length,
    );
    expect(blurred).toBe(0);
  });

  test('jede Register-Zeile zeigt ihr Statuswort als sichtbaren Text', async ({
    page,
  }) => {
    const rows = page.locator('[data-testid="sd-register-panel"] li');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = (await rows.nth(i).innerText()).trim();
      expect(text).toMatch(
        /(synchronisiert|angebunden|in Anbindung \(2027-Vision\))/,
      );
    }
  });

  /* Blatt-Komposition (Spec `stammdaten-blatt-dense.md` § 5.2). */
  test('das Blatt ist ab 1280 zweispaltig', async ({ page }) => {
    const spalten = page.locator('[data-testid="sd-datenblatt"] .sd-blatt-col');
    await expect(spalten).toHaveCount(2);

    const box1 = await spalten.nth(0).boundingBox();
    const box2 = await spalten.nth(1).boundingBox();
    expect(box1?.width ?? 0).toBeGreaterThan(0);
    expect(box2?.width ?? 0).toBeGreaterThan(0);
    // Nebeneinander, nicht gestapelt.
    expect(box2!.x).toBeGreaterThanOrEqual(box1!.x + box1!.width - 1);
  });

  test('kein toter Quadrant: das Fußband spannt die volle Blattbreite', async ({
    page,
  }) => {
    const blatt = await page
      .locator('[data-testid="sd-datenblatt"]')
      .boundingBox();
    const protokoll = await page
      .locator('[data-testid="sd-protokoll"]')
      .boundingBox();
    /* Fiele das Protokoll je wieder in eine ~300px-Rail neben dem Blatt,
       schlägt der Test an — robuster als eine Leerflächenmessung. */
    expect(protokoll!.width).toBeGreaterThanOrEqual(blatt!.width - 2);
  });

  test('Anna: Aufenthaltstitel-Zeile ja, Personalausweis-Zeile nein', async ({
    page,
  }) => {
    const dokumente = page.locator(
      '[data-testid="sd-datenblatt-section-dokumente"]',
    );
    await expect(dokumente).toContainText('Aufenthaltstitel');
    await expect(dokumente).not.toContainText('Personalausweis');
  });
});

test('Familie Schmidt: keine Aufenthaltstitel-Zeile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setupPersona(page, 'markus-schmidt');
  await warm(page);
  const dokumente = page.locator(
    '[data-testid="sd-datenblatt-section-dokumente"]',
  );
  await expect(dokumente).toContainText('Personalausweis');
  await expect(dokumente).not.toContainText('Aufenthaltstitel');
});

test.describe('Stammdaten Datenblatt — axe', () => {
  for (const vp of [
    { width: 1280, height: 900, label: 'desktop' },
    { width: 390, height: 844, label: 'mobile' },
  ]) {
    test(`axe light @${vp.label}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await warm(page);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(
        blockers(results),
        JSON.stringify(blockers(results), null, 2),
      ).toHaveLength(0);
    });

    test(`axe dark @${vp.label}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await setupPersona(page, 'anna-petrov');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.addInitScript(() =>
        document.documentElement.classList.add('dark'),
      );
      await warm(page);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(
        blockers(results),
        JSON.stringify(blockers(results), null, 2),
      ).toHaveLength(0);
    });
  }
});

/* Text-Clipping-Gate (a11y-Report 2026-07-24, Befund A1): kein sichtbares
 * Element in main darf horizontal abschneiden — weder auf Desktop noch @320
 * (WCAG 1.4.10). `aria-hidden`-Deko (MRZ-Zeile der Credential-Karte) ist
 * ausgenommen; RU als Worst-Case-Locale (längste Registernamen) mitgeprüft. */
for (const locale of ['de', 'ru'] as const) {
  for (const width of [1280, 320] as const) {
    test(`kein horizontales Text-Clipping in main @${width} (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await setupPersona(page, 'anna-petrov', locale);
      await warm(page);
      const clipped = await page.evaluate(() => {
        /* Gehärtet nach Mutationstest des a11y-Re-Audits (M1/M2, 2026-07-24):
           geprüft wird jedes textführende Element gegen (a) sein eigenes
           Clipping (auch bei clientWidth 0 — der Totalkollaps-Fall) und
           (b) den nächsten clippenden Vorfahren (truncate auf dem Wrapper).
           sr-only wird über clip/clip-path erkannt, nicht über die 1px-Größe;
           aria-hidden-Deko (MRZ, Adler) bleibt ausgenommen. LTR-Annahme
           (Gate läuft in de+ru) — für RTL wäre die linke Kante zu prüfen. */
        const offenders: string[] = [];
        const main = document.querySelector('main');
        if (!main) return ['NO_MAIN'];
        const label = (el: HTMLElement, a: number, b: number) =>
          `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} ${a}/${b}`;
        for (const el of Array.from(main.querySelectorAll<HTMLElement>('*'))) {
          if (el.closest('[aria-hidden="true"]')) continue;
          const hasDirectText = Array.from(el.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim(),
          );
          if (!hasDirectText) continue;
          const cs = getComputedStyle(el);
          if (cs.clip !== 'auto' || cs.clipPath !== 'none') continue; // sr-only
          const clips = (v: string) => v === 'hidden' || v === 'clip';
          /* overflow-x auto/scroll ist ein legitimer Scrollbereich (WCAG
             1.4.10 erlaubt), nur hidden/clip verliert Information. */
          if (clips(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
            offenders.push(label(el, el.scrollWidth, el.clientWidth));
            continue;
          }
          /* (b) — der Text selbst clippt nicht, aber ein Wrapper schneidet ihn
             ab. Verglichen wird die PAINT-Kante des Textes (left + scrollWidth),
             nicht die Box-Kante: ein von Flex geschrumpftes Kind mit overflow
             visible hat elRight == wrapRight, der Text malt aber weiter
             (Re-Review-Mutationstest M2, 2026-07-25). Benigner Shrink, dessen
             Text noch in den Wrapper passt, bleibt grün. */
          let anc = el.parentElement;
          while (anc && main.contains(anc)) {
            const acs = getComputedStyle(anc);
            if (acs.overflowX !== 'visible') {
              if (clips(acs.overflowX)) {
                const textPaintRight =
                  el.getBoundingClientRect().left + el.scrollWidth;
                const ancRight = anc.getBoundingClientRect().right;
                if (textPaintRight > ancRight + 1) {
                  offenders.push(
                    label(el, Math.round(textPaintRight), Math.round(ancRight)),
                  );
                }
              }
              break;
            }
            anc = anc.parentElement;
          }
        }
        return offenders;
      });
      expect(clipped, clipped.join('\n')).toEqual([]);
    });
  }
}

/* i18n-Render-Gate: keine Locale darf rohe ICU-Quelle ins UI leaken
 * (MISSING_MESSAGE-Fallback rendert den unformatierten DE-String — nach dem
 * Datenblatt-Rollout auf TR live beobachtet, Wurzel war ein veralteter
 * Dev-Server-Modul-Cache; das Gate hält die Fehlerklasse dauerhaft fern). */
for (const locale of ['tr', 'ru', 'ar'] as const) {
  test(`kein roher ICU-String auf /stammdaten (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersona(page, 'anna-petrov', locale);
    await warm(page);
    const body = await page.locator('main').innerText();
    expect(body).not.toMatch(/\{[a-z_]+, plural/i);
    expect(body).not.toMatch(/\{(datum|count|angaben|register|behoerde|zeit)\b/);
  });
}

test('Mobile @390: alle interaktiven Ziele ≥ 44px hoch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPersona(page, 'anna-petrov');
  await warm(page);

  const targets = page.locator(
    '[data-testid="sd-header-actions"] button, main a[href="/vorgaenge/umzug/start"], main a[href="/dokumente"], [data-testid="sd-protokoll"] a[href="/datenschutz"], [data-testid="sd-datenhoheit"] a[href="/datenschutz"]',
  );
  const count = await targets.count();
  expect(count).toBe(5);
  for (let i = 0; i < count; i++) {
    const box = await targets.nth(i).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
