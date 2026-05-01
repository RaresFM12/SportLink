import { test, expect } from "@playwright/test";

async function goToEventsPage(page: import("@playwright/test").Page) {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: /all events/i })).toBeVisible();
}

test.describe("Sport events matchmaking app", () => {
  test("user can create a new event", async ({ page }) => {
  await goToEventsPage(page);

  await page
    .getByRole("main")
    .getByRole("link", { name: /create event/i })
    .click();

  await expect(
    page.getByRole("heading", { name: /create new event/i })
  ).toBeVisible();

  await page.getByLabel(/event title/i).fill("Padel Night");
  await page.getByLabel(/city/i).fill("Cluj-Napoca");
  await page.getByLabel(/date/i).fill("2026-04-20");
  await page.getByLabel(/start time/i).fill("18:30");
  await page.getByLabel(/duration/i).fill("2 hours");
  await page.getByLabel(/location/i).fill("Iulius Sports Center");
  await page.getByLabel(/maximum participants/i).fill("8");
  await page.getByLabel(/description/i).fill("Friendly padel event.");

  await page.getByLabel(/sport/i).click();
  await page.getByRole("option", { name: "Other" }).click();

  await page.getByRole("button", { name: /^create event$/i }).click();

  await expect(page).toHaveURL(/\/events$/);

  await page.getByRole("button", { name: "2" }).click();

  await expect(page.getByText("Padel Night")).toBeVisible();
});

  test("user can update an existing event", async ({ page }) => {
    await goToEventsPage(page);

    const footballRow = page.getByRole("row", { name: /football match/i });
    await expect(footballRow).toBeVisible();

    await footballRow.getByRole("button").nth(1).click();

    await expect(page).toHaveURL(/\/events\/1\/edit$/);
    await expect(page.getByRole("heading", { name: /edit event/i })).toBeVisible();

    await page.getByLabel(/event title/i).fill("Updated Football Match");
    await page.getByLabel(/city/i).fill("Cluj-Napoca");
    await page.getByLabel(/date/i).fill("2026-04-10");
    await page.getByLabel(/start time/i).fill("18:00");
    await page.getByLabel(/duration/i).fill("2 hours");
    await page.getByLabel(/location/i).fill("Central Park");
    await page.getByLabel(/maximum participants/i).fill("10");
    await page.getByLabel(/description/i).fill("Updated description.");

    await page.getByLabel(/sport/i).click();
    await page.getByRole("option", { name: "Football" }).click();

    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByText(/updated football match/i)).toBeVisible();
  });

  test("user can join and leave an event", async ({ page }) => {
    await page.goto("/events/1");

    await expect(
      page.getByRole("heading", { name: /football match/i })
    ).toBeVisible();

    const joinButton = page.getByRole("button", { name: /join event/i });
    const leaveButton = page.getByRole("button", { name: /leave event/i });

    await expect(joinButton).toBeVisible();
    await joinButton.click();
    await expect(leaveButton).toBeVisible();

    await leaveButton.click();
    await expect(joinButton).toBeVisible();
  });
});