const { test, expect } = require('@playwright/test');

// Provider receipts are checked in Tally separately. Browser tests never cast votes.
test.beforeEach(async ({ page }) => {
  await page.route('https://tally.so/**', route => route.fulfill({
    contentType: 'text/html', body: '<p>Form provider test boundary</p>'
  }));
  await page.route('https://tally.so/widgets/embed.js', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.Tally = { loadEmbeds() {} };'
  }));
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
});

for (const variant of ['4', '3']) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`variant ${variant} at ${viewport.width} preserves content, navigation and ballot attribution`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/?variant=${variant}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your next hand of Pinochle.');
      await expect(page.locator('[data-product-description]')).toContainText(variant === '3' ? 'three-hand (cutthroat)' : 'four-hand');
      await expect(page.locator('[data-store-link]')).toHaveAttribute('href', variant === '3'
        ? 'https://apps.apple.com/us/app/3-hand-pinochle/id916432421'
        : 'https://apps.apple.com/us/app/pinochle-pro/id567644839');
      await page.screenshot({ path: test.info().outputPath(`home-${variant}-${viewport.width}.png`) });
      const frame = page.locator('[data-feature-votes]');
      const frameURL = new URL(await frame.getAttribute('src'));
      expect(frameURL.origin + frameURL.pathname).toBe('https://tally.so/embed/Z9oDao');
      expect(frameURL.searchParams.get('app_variant')).toBe(variant === '3' ? 'pinochlepro3' : 'pinochlepro');
      expect(frameURL.searchParams.get('dynamicHeight')).toBe('1');
      await expect(page.locator('[data-form-link]')).toHaveAttribute('href', `https://tally.so/r/Z9oDao?app_variant=${variant === '3' ? 'pinochlepro3' : 'pinochlepro'}`);
      await expect(page.locator('[data-scene-media] video')).toHaveJSProperty('paused', true);
      const scenes = page.getByRole('navigation', { name: 'Scenes', exact: true });
      await scenes.getByRole('link', { name: 'Your house rules' }).click();
      const lastRule = page.getByRole('button', { name: variant === '3' ? 'Three-hand play' : '60 meld', exact: true });
      await lastRule.click();
      await expect(lastRule).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-rules-image]')).toHaveAttribute('src', variant === '3'
        ? 'assets/home/frames/3-hand/hand.png' : 'assets/home/rules/4-hand/meld-sixty.png');
      await expect(page.locator('[data-rule-detail]')).toContainText(variant === '3' ? 'Kitty and discard' : 'Total meld, 60.');
      await page.screenshot({ path: test.info().outputPath(`rules-${variant}-${viewport.width}.png`) });
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Our story' }).click();
      await expect(page).toHaveURL(`http://127.0.0.1:4173/?variant=${variant}#our-story`);
      await frame.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByText('Preview', { exact: true })).toHaveCount(0);
      await expect(page.locator('[data-feedback-ui]')).toHaveCount(0);
      expect(errors).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`form-${variant}-${viewport.width}.png`) });
    });
  }
}

test('public root remains indexable and other public pages and rule anchors work', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://pinochlepro.com/');
  await expect(page.locator('meta[name=robots]')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Rules', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/rules.html');
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Three-hand rules' }).click();
  await expect(page).toHaveURL(/rules.html#three-hand$/);
  await expect(page.locator('#three-hand')).toBeVisible();
  for (const route of ['history.html', 'support.html', 'faq.html', 'contact.html', 'robots.txt', 'sitemap.xml', 'app-ads.txt']) {
    expect((await request.get('/' + route)).status()).toBe(200);
  }
  expect((await request.get('/next/')).status()).toBe(404);
});

test('missing or invalid variants default to four-hand and do not inject iframe parameters', async ({ page }) => {
  await page.goto('/?variant=invalid&app_variant=untrusted');
  await expect(page.locator('[data-product-description]')).toContainText('four-hand');
  const url = new URL(await page.locator('[data-feature-votes]').getAttribute('src'));
  expect(url.searchParams.getAll('app_variant')).toEqual(['pinochlepro']);
  expect(url.searchParams.has('variant')).toBe(false);
});

test('story and both attributed form links remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { name: 'Features coming soon' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the form in a new tab' })).toHaveAttribute('href', 'https://tally.so/r/Z9oDao?app_variant=pinochlepro');
  await expect(page.getByRole('link', { name: 'open the three-hand form' })).toHaveAttribute('href', 'https://tally.so/r/Z9oDao?app_variant=pinochlepro3');
  await context.close();
});
