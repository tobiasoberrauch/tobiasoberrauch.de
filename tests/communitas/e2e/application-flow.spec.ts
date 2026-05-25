import { test, expect } from '@playwright/test';

/**
 * US1 — application flow E2E.
 *
 * Skipped by default: the API endpoint requires a live Neon connection
 * (COMMUNITAS_DATABASE_URL) which is not available in the local test
 * environment. To run, start the dev server with a real DB and remove
 * the .skip below.
 *
 * TODO(phase-4): once Neon is wired in CI, drop the .skip and add a DB
 * cleanup step in afterEach.
 */
test.skip('Besucher kann sich bewerben und sieht die Danke-Seite', async ({ page }) => {
  await page.goto('/communitas/');
  await page.getByRole('link', { name: /Sich bewerben/i }).first().click();

  await page.waitForURL('**/communitas/bewerbung/');

  await page.getByLabel('Name').fill('Test Erika');
  await page.getByLabel('E-Mail').fill('test@example.com');
  await page.getByLabel('Deine Frage').fill('Was suche ich?');
  await page.getByLabel('Ich verstehe, dass die Communitas keine Therapie ersetzt.').check();

  await page.getByRole('button', { name: 'Absenden' }).click();

  await page.waitForURL('**/communitas/danke/');
  await expect(page.getByText('Deine Bewerbung ist eingegangen.')).toBeVisible();
});

test('Public landing page renders without trackers', async ({ page }) => {
  const blockedHosts = [
    'connect.facebook.net',
    'graph.facebook.com',
    'snap.licdn.com',
    'googletagmanager.com',
    'google-analytics.com',
  ];

  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));

  await page.goto('/communitas/');
  await expect(page.getByRole('heading', { name: 'Communitas Cotidiana' })).toBeVisible();

  for (const host of blockedHosts) {
    expect(requests.find((u) => u.includes(host))).toBeUndefined();
  }
});
