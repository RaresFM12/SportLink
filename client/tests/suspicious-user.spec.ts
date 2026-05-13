import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'https://10.154.238.55:5173';

test('simulates suspicious user behaviour for Gold demo', async ({ page }) => {
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel('Username').fill('rares');
  await page.getByLabel('Password').fill('rares123');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/\/events/);

  const token = await page.evaluate(() => window.localStorage.getItem('sportlink.authToken'));
  const sid = await page.evaluate(() => window.localStorage.getItem('sportlink.sid'));
  expect(token).toBeTruthy();
  expect(sid).toBeTruthy();

  for (let i = 0; i < 40; i += 1) {
    await page.request.get(`${APP_URL.replace(':5173', ':3001')}/api/auth/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Session-Id': sid ?? '',
      },
    });
  }
});
