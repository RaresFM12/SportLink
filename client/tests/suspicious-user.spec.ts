import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'https://10.154.238.55:5173';
const ATTEMPTS = Number(process.env.SUSPICIOUS_ATTEMPTS ?? 40);

function apiUrl(path: string): string {
  const url = new URL(APP_URL);
  url.port = '3001';
  url.pathname = path;
  url.search = '';
  url.hash = '';
  return url.toString();
}

test('simulates suspicious user behaviour for Gold demo', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto(`${APP_URL}/login`);
  await page.getByLabel('Username').fill('rares');
  await page.getByLabel('Password').fill('rares123');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/\/events/);

  const token = await page.evaluate(() => window.localStorage.getItem('sportlink.authToken'));
  const sid = await page.evaluate(() => window.localStorage.getItem('sportlink.sid'));
  expect(token).toBeTruthy();
  expect(sid).toBeTruthy();

  await page.evaluate(() => {
    const panel = document.createElement('div');
    panel.id = 'gold-suspicious-demo';
    panel.style.position = 'fixed';
    panel.style.inset = '24px auto auto 24px';
    panel.style.zIndex = '99999';
    panel.style.padding = '18px 20px';
    panel.style.border = '2px solid #dc2626';
    panel.style.borderRadius = '8px';
    panel.style.background = '#fff1f2';
    panel.style.color = '#7f1d1d';
    panel.style.font = '600 16px system-ui, sans-serif';
    panel.style.boxShadow = '0 12px 32px rgb(0 0 0 / 18%)';
    panel.textContent = 'Gold demo: starting suspicious behaviour simulation...';
    document.body.appendChild(panel);
  });

  for (let i = 1; i <= ATTEMPTS; i += 1) {
    await page.evaluate(
      ({ attempt, total }) => {
        const panel = document.getElementById('gold-suspicious-demo');
        if (panel) {
          panel.textContent = `Gold demo: USER is probing admin endpoint ${attempt}/${total}`;
        }
      },
      { attempt: i, total: ATTEMPTS }
    );

    const status = await page.evaluate(
      async ({ endpoint, authToken, sessionId }) => {
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'X-Session-Id': sessionId,
          },
          credentials: 'include',
        });
        return response.status;
      },
      {
        endpoint: apiUrl('/api/auth/users'),
        authToken: token,
        sessionId: sid ?? '',
      }
    );

    expect(status).toBe(403);
    await page.waitForTimeout(150);
  }

  await page.evaluate(() => {
    const panel = document.getElementById('gold-suspicious-demo');
    if (panel) {
      panel.textContent = 'Gold demo: suspicious sequence complete. Check Security as admin.';
      panel.style.borderColor = '#7c3aed';
      panel.style.background = '#f5f3ff';
      panel.style.color = '#4c1d95';
    }
  });

  await page.waitForTimeout(5000);
});
