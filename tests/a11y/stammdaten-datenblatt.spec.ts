/**
 * Stammdaten — Struktur- + axe-Abnahme (Spec `stammdaten-akte.md` § 13).
 *
 * Fortschreibung der Datenblatt-Abnahme auf die Register-Komposition: Hero
 * (Porträt + Fakten), vier Tabs, Rail. Geprüft werden die maschinell prüfbaren
 * Akzeptanzkriterien: genau ein `h1`, genau EIN Header-Trigger, keine
 * `v2-*`-Anker, keine Fortschritts-Grafik, die Subline-Zahl == gerenderte
 * Wertzeilen, Blur-Budget (kein `backdrop-filter` im `main`), sichtbare
 * Statuswörter im Register-Modul, Tab-Semantik, die Wortsperre „Akte", das
 * datenfreie Porträt, genau EIN Zeitstempel, Persona-Degradation und axe
 * (WCAG 2.1 AA) in light + dark × 1280/390.
 *
 * NICHT hier: der `NEXT_PUBLIC_LG=0`-Durchlauf — der Kill-Switch ist eine
 * Server-Env-Variable, also ein eigener Lauf des a11y-testers gegen einen mit
 * `NEXT_PUBLIC_LG=0` gestarteten Server, nicht per-Test schaltbar.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOCALE_COOKIE_NAME = 'govtech-de:v1:locale';
const NS = 'govtech-de:v1:';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type TabId = 'ueberblick' | 'persoenlich' | 'dokumente' | 'verlauf';
const TABS: TabId[] = ['ueberblick', 'persoenlich', 'dokumente', 'verlauf'];

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
    .locator('[data-testid="sd-akte-hero"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
  await page
    .locator('[data-testid="sd-panel-ueberblick"]')
    .waitFor({ state: 'visible', timeout: 15_000 });
}

async function openTab(page: Page, id: TabId) {
  await page.locator(`[data-testid="sd-tab-${id}"]`).click();
  await page
    .locator(`[data-testid="sd-panel-${id}"]`)
    .waitFor({ state: 'visible', timeout: 15_000 });
}

function blockers(results: { violations: Array<{ impact?: string | null }> }) {
  return results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
}

test.describe('Stammdaten — Struktur', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupPersona(page, 'anna-petrov');
    await warm(page);
  });

  test('genau ein h1 und eine sprungfreie Heading-Ordnung — in jedem Register', async ({
    page,
  }) => {
    for (const id of TABS) {
      await openTab(page, id);
      await expect(page.locator('main h1')).toHaveCount(1);

      const levels = await page
        .locator('main h1, main h2, main h3, main h4')
        .evaluateAll((nodes) =>
          nodes.map((n) => Number(n.tagName.replace('H', ''))),
        );
      expect(levels[0], id).toBe(1);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i - 1], `${id} @${i}`).toBeLessThanOrEqual(1);
      }
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

  test('die Zahl der Servicezeile entspricht den gerenderten Wertzeilen', async ({
    page,
  }) => {
    const service = await page
      .locator('[data-testid="sd-service-line"]')
      .innerText();
    const angaben = Number(service.match(/(\d+)\s+Angabe/)?.[1] ?? '0');
    expect(angaben).toBeGreaterThan(0);

    const faktenRows = await page
      .locator('[data-testid="sd-fakten"] dd')
      .count();
    await openTab(page, 'persoenlich');
    const datenblattRows = await page
      .locator('[data-testid="sd-datenblatt"] dd')
      .count();
    /* Seit akte-v2 trägt die Fakten-Karte keine „Führende Quelle" mehr (sie
       steht im Porträt-Fuß, und das Modell baut die Zeile seit dem Review
       2026-07-29 gar nicht mehr). Ungezählt bleibt dort also genau EINE
       gerenderte Zeile: „Sprachen" — Selbstauskunft, kein Register führt sie
       (Spec § 7.3). */
    expect(angaben).toBe(faktenRows - 1 + datenblattRows);
  });

  test('Blur-Budget: kein backdrop-filter im main — in jedem Register', async ({
    page,
  }) => {
    for (const id of TABS) {
      await openTab(page, id);
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
      expect(blurred, id).toBe(0);
    }
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

  test('Rail und Hauptspalte stehen ab 1280 nebeneinander', async ({ page }) => {
    const hero = await page.locator('[data-testid="sd-akte-hero"]').boundingBox();
    const rail = await page.locator('[data-testid="sd-rail"]').boundingBox();
    expect(rail!.x).toBeGreaterThanOrEqual(hero!.x + hero!.width - 1);
  });

  /* Layout-Nachtrag (Spec § 14): die Registerzeile steht in der Identitäts-
     spalte neben der Platte, der Registerinhalt beginnt dicht unter dem
     Porträt. Gemessen statt an der Klasse geprüft — unter dem Hero stehend
     erzeugte die Zeile @1300 einen 131px-Abstand zwischen Porträt-Unterkante
     und erster Karte (User-Befund 2026-07-29), daneben stehend 63–78px. */
  test('die Registerzeile steht in der Identitätsspalte, die erste Karte dicht unter dem Porträt', async ({
    page,
  }) => {
    const portraet = (await page
      .locator('[data-testid="sd-portraet"]')
      .boundingBox())!;
    const tabs = (await page.locator('[data-testid="sd-tabs"]').boundingBox())!;
    const panel = (await page
      .locator('[data-testid="sd-panel-ueberblick"]')
      .boundingBox())!;

    expect(tabs.x).toBeGreaterThanOrEqual(portraet.x + portraet.width - 1);

    const restluft = panel.y - (portraet.y + portraet.height);
    expect(restluft, `Porträt-Unterkante → erste Karte: ${restluft}px`).toBeLessThanOrEqual(120);
    expect(restluft).toBeGreaterThan(0);
  });

  test('Tabs: ←/→ wechselt das Panel, aria-selected folgt, der Fokus bleibt auf dem Tab', async ({
    page,
  }) => {
    const first = page.locator('[data-testid="sd-tab-ueberblick"]');
    await first.focus();
    await expect(first).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    const second = page.locator('[data-testid="sd-tab-persoenlich"]');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('[data-testid="sd-panel-persoenlich"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') ?? '',
      ),
    ).toBe('sd-tab-persoenlich');

    // Home springt an den Anfang, End ans Ende (Wrap-Muster DokumenteView).
    await page.keyboard.press('End');
    await expect(page.locator('[data-testid="sd-tab-verlauf"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Home');
    await expect(first).toHaveAttribute('aria-selected', 'true');
  });

  test('nur genau ein role=tabpanel ist sichtbar', async ({ page }) => {
    for (const id of TABS) {
      await openTab(page, id);
      const panels = page.locator('main [role="tabpanel"]');
      await expect(panels).toHaveCount(TABS.length);
      let sichtbar = 0;
      for (let i = 0; i < TABS.length; i++) {
        if (await panels.nth(i).isVisible()) sichtbar++;
      }
      expect(sichtbar, id).toBe(1);
    }
  });

  /* M3 — der Screen darf keine „Akte" behaupten: die Akte hat im deutschen
     Verwaltungsrecht die Behörde (§ 29 VwVfG), und diese Seite aggregiert
     sichtbar fünf Register statt eine Akte zu sein. */
  test('Wortsperre: kein „Akte"/„Dossier" in sichtbarem Text oder ARIA', async ({
    page,
  }) => {
    await expect(page.locator('main h1')).toHaveText('Stammdaten');

    for (const id of TABS) {
      await openTab(page, id);
      const text = await page.locator('main').innerText();
      expect(text, `${id} innerText`).not.toMatch(/\bAkten?\b/i);
      expect(text, `${id} innerText`).not.toMatch(/\bDossier\b/i);

      const aria = await page
        .locator('main [aria-label], main [title]')
        .evaluateAll((nodes) =>
          nodes.map(
            (n) =>
              `${n.getAttribute('aria-label') ?? ''} ${n.getAttribute('title') ?? ''}`,
          ),
        );
      for (const value of aria) {
        expect(value, `${id} aria`).not.toMatch(/\bAkten?\b/i);
        expect(value, `${id} aria`).not.toMatch(/\bDossier\b/i);
      }
    }
  });

  /* M1 — das Porträt trägt seit akte-v2 genau ZWEI Fußfelder (Herkunft der
     Daten), und beide hat JEDE Persona. Kein Aktenzeichen (nur Nicht-Deutsche
     hätten eins), keine Interaktion, kein drittes Feld; die `[MOCK]`-Legende
     ist eine Aussage über das Artefakt und liegt außerhalb der Karte. */
  test('das Porträt trägt genau die zwei Fußfelder', async ({ page }) => {
    const portraet = page.locator('[data-testid="sd-portraet"]');
    await expect(portraet.locator('button, a, input')).toHaveCount(0);
    await expect(portraet.locator('dl')).toHaveCount(1);
    await expect(portraet.locator('dl dt')).toHaveCount(2);
    await expect(portraet.locator('dl dd')).toHaveCount(2);

    const text = (await portraet.innerText()).trim();
    expect(text).not.toContain('ABH-');
    expect(text).not.toContain('Aktenzeichen');
    expect(text).not.toContain('[MOCK]');

    const legende = page.locator('[data-testid="sd-portraet-legende"]');
    await expect(legende).toHaveText(
      '[MOCK] Synthetisches Lichtbild — kein Passbild, keine reale Person.',
    );
    expect(
      await legende.evaluate((el) =>
        Boolean(el.closest('[data-testid="sd-portraet"]')),
      ),
    ).toBe(false);
  });

  /* Schützt den Fokus-Vertrag von `stammdaten-modals.spec.ts`, das den
     Present-Dialog über `[data-testid="sd-aktionen"] button` erster Ordnung
     öffnet: kommt ein zweiter Button dazu, testet es lautlos etwas anderes. */
  test('in den Schnellaktionen steht genau ein <button>', async ({ page }) => {
    await expect(
      page.locator('[data-testid="sd-aktionen"] button'),
    ).toHaveCount(1);
  });

  /* WCAG 1.4.1 — der Statuspunkt ist Farbe. Das Wort dazu muss im
     zugänglichen Namen der Zeile stehen, auch wenn es nur `sr-only` sichtbar
     ist. */
  test('jede Vorgangszeile trägt ein Statuswort im zugänglichen Namen', async ({
    page,
  }) => {
    const namen = await page
      .locator('[data-testid="sd-vorgaenge"] li a')
      .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''));
    expect(namen.length).toBeGreaterThan(0);
    for (const name of namen) {
      expect(name, name).toMatch(/(läuft|abgeschlossen|Genehmigt|Abgelehnt)/);
    }
  });

  /* WCAG 2.4.3 — der Inhalt erscheint weit weg vom Auslöser; die Tastatur muss
     mitkommen. Der Auslöser selbst verschwindet dabei NICHT. */
  test('„Alle Aktivitäten" öffnet das Register Verlauf und setzt den Fokus dorthin', async ({
    page,
  }) => {
    await page.locator('[data-testid="sd-verlauf-kurz"] button').click();
    await expect(page.locator('[data-testid="sd-panel-verlauf"]')).toBeVisible();
    await expect(page.locator('[data-testid="sd-protokoll"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') ?? '',
      ),
    ).toBe('sd-tab-verlauf');
  });

  test('das Aktenzeichen steht genau einmal im main — und nicht im Hero', async ({
    page,
  }) => {
    const mainText = await page.locator('main').innerText();
    const treffer = mainText.match(/ABH-B-2024\/IV-A-1782/g) ?? [];
    expect(treffer).toHaveLength(1);

    const heroText = await page
      .locator('[data-testid="sd-akte-hero"]')
      .innerText();
    expect(heroText).not.toContain('ABH-B-2024/IV-A-1782');
    await expect(
      page.locator('[data-testid="sd-status-block"]'),
    ).toContainText('ABH-B-2024/IV-A-1782');
  });

  /* M2 — genau EIN Zeitstempel. Bewusst auf die Uhrzeit geprüft, nicht auf ein
     Datum: Geburtsdatum, „gültig bis" und Vorgangsdaten sind legitime
     Datumsangaben, und das Geburtsdatum steht im Hero. Seit akte-v2 steht er
     im Porträt-Fuß statt in einer Kopf-Subline. */
  test('eine Uhrzeit im main — die des Porträt-Fußes', async ({ page }) => {
    const mainText = await page.locator('main').innerText();
    const zeiten = mainText.match(/\d{1,2}:\d{2}\s*Uhr/g) ?? [];
    expect(zeiten).toHaveLength(1);
    await expect(page.locator('[data-testid="sd-portraet"]')).toContainText(
      zeiten[0] ?? '',
    );
  });

  test('Anna: Aufenthaltstitel-Zeile ja, Personalausweis-Zeile nein', async ({
    page,
  }) => {
    await openTab(page, 'persoenlich');
    const dokumente = page.locator(
      '[data-testid="sd-datenblatt-section-dokumente"]',
    );
    await expect(dokumente).toContainText('Aufenthaltstitel');
    await expect(dokumente).not.toContainText('Personalausweis');
  });
});

test('Familie Schmidt: keine Aufenthaltstitel-Zeile, Ausweis-Variante im Status-Block', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setupPersona(page, 'markus-schmidt');
  await warm(page);

  /* Persona-Symmetrie (§ 11): das Porträt ist identisch, das Aktenzeichen
     entfällt ersatzlos — es wird nicht durch einen Platzhalter ersetzt. */
  await expect(page.locator('[data-testid="sd-portraet"]')).toBeVisible();
  const status = page.locator('[data-testid="sd-status-block"]');
  await expect(status).toContainText('Personalausweis');
  await expect(status).not.toContainText('Aktenzeichen');
  await expect(status).not.toContainText('AufenthG');

  await openTab(page, 'persoenlich');
  const dokumente = page.locator(
    '[data-testid="sd-datenblatt-section-dokumente"]',
  );
  await expect(dokumente).toContainText('Personalausweis');
  await expect(dokumente).not.toContainText('Aufenthaltstitel');
});

test('das Blatt ist erst ab 1536 zweispaltig', async ({ page }) => {
  await setupPersona(page, 'anna-petrov');
  await page.setViewportSize({ width: 1600, height: 900 });
  await warm(page);
  await openTab(page, 'persoenlich');

  const spalten = page.locator('[data-testid="sd-datenblatt"] .sd-blatt-col');
  await expect(spalten).toHaveCount(2);
  let box1 = await spalten.nth(0).boundingBox();
  let box2 = await spalten.nth(1).boundingBox();
  expect(box2!.x).toBeGreaterThanOrEqual(box1!.x + box1!.width - 1);

  /* Bei 1280 nimmt die Rail die Breite, die eine zweite Blattspalte bräuchte —
     dort steht das Blatt gestapelt (Spec § 4.10 / § 16.4). */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  box1 = await spalten.nth(0).boundingBox();
  box2 = await spalten.nth(1).boundingBox();
  expect(Math.abs(box2!.x - box1!.x)).toBeLessThanOrEqual(1);
  expect(box2!.y).toBeGreaterThan(box1!.y);
});

test('weite Viewports: Fakten dreispaltig, Status-Block erst ab 1700 zweispaltig', async ({
  page,
}) => {
  await setupPersona(page, 'anna-petrov');
  await page.setViewportSize({ width: 2000, height: 1100 });
  await warm(page);

  /* Ab 1536 trägt die Identitätsspalte die Maße, für die die Mockup-
     Proportionen gezeichnet sind: fünf Fakten in EINER Reihe (Spec akte-v2
     § 4.4). Darunter greift das auto-fit-Raster, weil fünf Spalten dort
     ~56px schmal wären. */
  const fakten = page.locator('[data-testid="sd-fakten"]');
  const spalten = await fakten.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
  );
  expect(spalten).toBe(5);

  const zeilen = page.locator('[data-testid="sd-status-block"] dl > div');
  const oben = await zeilen.nth(0).boundingBox();
  const daneben = await zeilen.nth(1).boundingBox();
  expect(daneben!.x).toBeGreaterThanOrEqual(oben!.x + oben!.width - 1);

  /* Das Aktenzeichen bleibt in einer Zeile — ein Umbruch mitten in der Kennung
     wäre genau die Fehlerklasse, wegen der die zweite Spalte erst ab 1700
     aufgeht. */
  const az = page.locator('[data-testid="sd-status-block"] dd').last();
  const azZeilen = await az.evaluate(
    (el) =>
      el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
  );
  expect(azZeilen).toBeLessThan(1.6);

  await page.setViewportSize({ width: 1536, height: 960 });
  await page.waitForTimeout(200);
  const gestapelt1 = await zeilen.nth(0).boundingBox();
  const gestapelt2 = await zeilen.nth(1).boundingBox();
  expect(Math.abs(gestapelt2!.x - gestapelt1!.x)).toBeLessThanOrEqual(1);
  expect(gestapelt2!.y).toBeGreaterThan(gestapelt1!.y);
});

/* Kongruenz-Gate (a11y-Report 2026-07-29, Befund F-1 / WCAG 2.4.3): der Screen
 * stapelt ≤767 exakt in DOM-Reihenfolge — Hero (der die Registerzeile seit dem
 * Layout-Nachtrag § 14 als letztes Kind der Identitätsspalte trägt) → Register-
 * Inhalt → Schnellaktionen → restliche Rail. Die vier `order`-Deklarationen,
 * die die Schnellaktionen vor die Register zogen, sind über den Escape-Hatch
 * der Spec (§ 9) ersatzlos entfernt: sie erzeugten beim Tabben Fokus-Sprünge
 * über den Fold. Kehrt eine `order`-Vorziehung zurück (oder driftet der DOM),
 * bricht dieses Gate — deshalb steht das Panel MIT in der Folge: die Tabzeile
 * allein liegt seit dem Nachtrag im Hero und würde eine Vorziehung der
 * Schnellaktionen über den Registerinhalt nicht mehr sehen. */
test('≤767: visuelle Stapelfolge == DOM-Reihenfolge (Hero → Tabs → Panel → Schnellaktionen → Rail-Rest)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPersona(page, 'anna-petrov');
  await warm(page);

  const REIHE = [
    'sd-akte-hero',
    'sd-tabs',
    'sd-panel-ueberblick',
    'sd-aktionen',
    'sd-rail-rest',
  ] as const;

  const domFolge = await page.evaluate((ids) => {
    const nodes = ids.map((id) => document.querySelector(`[data-testid="${id}"]`));
    if (nodes.some((n) => n === null)) return 'MISSING';
    return nodes
      .slice(0, -1)
      .map((a, i) =>
        Boolean(
          a!.compareDocumentPosition(nodes[i + 1]!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      )
      .join('|');
  }, [...REIHE]);
  expect(domFolge).toBe('true|true|true|true');

  /* Die Tabzeile liegt IM Hero (Identitätsspalte) — für sie allein wäre die
     DOM-Folge oben schon durch die Verschachtelung erfüllt. Der Anker prüft
     deshalb die Struktur direkt: rutscht die Zeile zurück unter den Hero,
     bricht dieses Gate, nicht erst das Auge. */
  expect(
    await page.evaluate(() =>
      Boolean(
        document
          .querySelector('[data-testid="sd-tabs"]')
          ?.closest('[data-testid="sd-akte-hero"]'),
      ),
    ),
  ).toBe(true);

  const ys: number[] = [];
  for (const id of REIHE) {
    ys.push((await page.locator(`[data-testid="${id}"]`).boundingBox())!.y);
  }
  for (let i = 1; i < ys.length; i += 1) {
    expect(
      ys[i],
      `${REIHE[i]} muss unter ${REIHE[i - 1]} liegen (${ys.join(' → ')})`,
    ).toBeGreaterThan(ys[i - 1]!);
  }
});

test.describe('Stammdaten — axe', () => {
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

  for (const id of ['persoenlich', 'dokumente', 'verlauf'] as const) {
    test(`axe light @desktop — Register „${id}"`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupPersona(page, 'anna-petrov');
      await warm(page);
      await openTab(page, id);
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
 * ausgenommen; RU als Worst-Case-Locale (längste Registernamen) mitgeprüft.
 * Das Blatt ist der historische Verursacher und wird deshalb mitgeöffnet. */
async function clippingOffenders(page: Page) {
  return page.evaluate(() => {
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
      if (el.closest('[hidden]')) continue;
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
}

for (const locale of ['de', 'ru'] as const) {
  for (const width of [1280, 320] as const) {
    test(`kein horizontales Text-Clipping in main @${width} (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await setupPersona(page, 'anna-petrov', locale);
      await warm(page);
      const ueberblick = await clippingOffenders(page);
      expect(ueberblick, ueberblick.join('\n')).toEqual([]);

      await openTab(page, 'persoenlich');
      const blatt = await clippingOffenders(page);
      expect(blatt, blatt.join('\n')).toEqual([]);
    });
  }
}

/* Kollisions-Gate (a11y-Report 2026-07-28, Befund A1): das Clipping-Gate oben
 * kann Grid-Zellen-Übermalung strukturell nicht sehen — eine Zelle mit
 * `overflow: visible` malt über ihre Nachbarin, ohne dass `scrollWidth` gegen
 * `clientWidth`, einen clippenden Vorfahren oder die Seitenbreite anschlägt.
 * Geprüft wird deshalb die PAINT-Ausdehnung der Fakten-Labels gegeneinander
 * (WCAG 1.4.10): `STAATSANGEHÖRIGKEIT` malte @320 24px über `FAMILIENSTAND`.
 * de als Worst Case (das einzige Locale ohne Mehrwort-Umbruch), LTR-Annahme
 * wie beim Clipping-Gate. */
for (const width of [320, 360] as const) {
  test(`die Fakten-Labels überlappen sich nicht @${width} (de)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupPersona(page, 'anna-petrov');
    await warm(page);

    const labels = page.locator('[data-testid="sd-fakten"] dt');
    expect(await labels.count()).toBeGreaterThan(1);

    const kollisionen = await page.evaluate(() => {
      const boxen = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="sd-fakten"] dt'),
      ).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          text: (el.textContent ?? '').trim(),
          left: rect.left,
          /* Nicht die Box-, sondern die Malkante: ein nicht umbrechendes Wort
             überragt seine Zelle, ohne die Box zu verbreitern. */
          right: rect.left + Math.max(rect.width, el.scrollWidth),
          top: rect.top,
          bottom: rect.bottom,
        };
      });

      const treffer: string[] = [];
      for (let i = 0; i < boxen.length; i++) {
        for (let j = i + 1; j < boxen.length; j++) {
          const a = boxen[i];
          const b = boxen[j];
          const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (dx > 1 && dy > 1) {
            treffer.push(
              `${a.text} ↔ ${b.text}: ${Math.round(dx)}×${Math.round(dy)}px`,
            );
          }
        }
      }
      return treffer;
    });

    expect(kollisionen, kollisionen.join('\n')).toEqual([]);
  });
}

/* Trennstrich-Gate (code-review 2026-07-28): der Kollisions-Fix darf die
 * Übermalung nicht gegen einen Wortbruch mitten im Wort eintauschen —
 * `overflow-wrap: break-word` allein malte `STAATSANGEHÖRIGKEI` / `T`.
 * Gemessen statt kosmetisch geprüft: bricht ein EINWORTIGES Label auf mehrere
 * Zeilen, muss die Summe der Zeilenbreiten die natürliche Einzeilenbreite
 * desselben Textes um mindestens eine Trennstrich-Breite übersteigen —
 * Chromium malt den Trennstrich zusätzlich (gemessen +5…6px bei zwei
 * Trennungen), ein Bruch ohne Trennstrich liefert exakt 0. Die drei Desktop-
 * Breiten sind die im Review belegten Fundstellen. */
for (const width of [320, 360, 390, 1280, 1440] as const) {
  test(`einwortige Fakten-Labels brechen nur mit Trennstrich um @${width} (de)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupPersona(page, 'anna-petrov');
    await warm(page);

    const befunde = await page.evaluate(() => {
      const treffer: string[] = [];
      for (const dt of Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="sd-fakten"] dt'),
      )) {
        const text = (dt.textContent ?? '').trim();
        if (!text || /\s/.test(text)) continue;

        const range = document.createRange();
        range.selectNodeContents(dt);
        const zeilen = Array.from(range.getClientRects()).filter(
          (r) => r.width > 0,
        );
        if (zeilen.length < 2) continue;

        /* Natürliche Einzeilenbreite: derselbe Knoten, dieselbe Typografie,
           nur ohne Umbruch. `position: absolute` macht den Block
           shrink-to-fit, sonst misst man die Zellbreite. */
        const probe = dt.cloneNode(true) as HTMLElement;
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.whiteSpace = 'nowrap';
        probe.style.width = 'auto';
        probe.style.maxWidth = 'none';
        dt.parentElement?.appendChild(probe);
        const natuerlich = probe.getBoundingClientRect().width;
        probe.remove();

        const gemalt = zeilen.reduce((summe, r) => summe + r.width, 0);
        if (gemalt - natuerlich < 1.5) {
          treffer.push(
            `${text}: umgebrochen in ${zeilen.length} Zeilenkästen, aber ohne Trennstrich (gemalt ${Math.round(gemalt)}px = natürlich ${Math.round(natuerlich)}px)`,
          );
        }
      }
      return treffer;
    });

    expect(befunde, befunde.join('\n')).toEqual([]);
  });
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

    for (const id of ['ueberblick', 'dokumente'] as const) {
      await openTab(page, id);
      const body = await page.locator('main').innerText();
      expect(body, id).not.toMatch(/\{[a-z_]+, plural/i);
      expect(body, id).not.toMatch(
        /\{(datum|count|angaben|register|behoerde|zeit|name|sprache|norm|titel|tage)\b/,
      );
    }
  });
}

test('Mobile @390: alle interaktiven Ziele ≥ 44px hoch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPersona(page, 'anna-petrov');
  await warm(page);

  const targets = page.locator(
    [
      '[data-testid="sd-header-actions"] button',
      '[data-testid="sd-tabs"] [role="tab"]',
      '[data-testid="sd-status-block"] button',
      '[data-testid="sd-aktionen"] a, [data-testid="sd-aktionen"] button',
      '[data-testid="sd-doks"] a, [data-testid="sd-doks"] button',
      '[data-testid="sd-verlauf-kurz"] button',
      '[data-testid="sd-vorgaenge"] a[href^="/vorgaenge/"]',
      'main a[href]',
    ].join(', '),
  );
  const count = await targets.count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < count; i++) {
    const target = targets.nth(i);
    if (!(await target.isVisible())) continue;
    const box = await target.boundingBox();
    const beschreibung =
      (await target.getAttribute('href')) ??
      (await target.getAttribute('data-testid')) ??
      (await target.innerText());
    expect(box?.height ?? 0, beschreibung).toBeGreaterThanOrEqual(44);
  }

  const hrefs = await page
    .locator('main a[href]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href') ?? ''));
  for (const href of [
    '/lebenslagen',
    '/dokumente',
    '/termine',
    '/vorgaenge',
    '/vorgaenge/umzug/start',
    '/datenschutz',
  ]) {
    expect(hrefs, href).toContain(href);
  }
});
