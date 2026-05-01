import { test, expect } from "@playwright/test";

test("user cannot submit invalid event form", async ({ page }) => {
  await page.goto("/events/new");

  await expect(
    page.getByRole("heading", { name: /create new event/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /^create event$/i }).click();

  
  await expect(page).toHaveURL(/\/events\/new$/);

  await expect(page.locator("p.text-sm.text-red-600").first()).toBeVisible();
});