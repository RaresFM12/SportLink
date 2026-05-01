import { test, expect } from "@playwright/test";

test("application stores user preference and activity in cookies", async ({ page }) => {
  await page.goto("/events");

  // schimbăm sportul preferat
  await page.getByText(/all sports/i).click();
  await page.getByRole("option", { name: "Football" }).click();

  // intrăm în detalii prin primul buton din rândul Football Match (eye)
  const footballRow = page.getByRole("row", { name: /football match/i });
  await expect(footballRow).toBeVisible();
  await footballRow.getByRole("button").nth(0).click();

  await expect(page).toHaveURL(/\/events\/1$/);

  const cookies = await page.context().cookies();

  expect(cookies.length).toBeGreaterThan(0);
});