import { test, expect, type Page } from "@playwright/test";
import { browserPassword } from "../browser-fixtures";
const origin = "http://127.0.0.1:3100";
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
for (const width of [320, 375, 430, 768, 1024, 1440]) {
  test(`${width}px: calendar, backlog, notifications and work logs`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Username", { exact: true }).fill("productivity");
    await page.getByLabel("Password", { exact: true }).fill(browserPassword);
    await page
      .getByRole("button", { name: "Sign in to your workspace" })
      .click();
    await expect(page).not.toHaveURL(/\/login$/);
    if (width < 1024) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("link", { name: "Calendar", exact: true }).click();
    } else
      await page.getByRole("link", { name: "Calendar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Calendar", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect(page.getByLabel("Loading calendar")).not.toBeVisible();
    await page.getByRole("button", { name: "New event" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Event title").fill(`Planning session ${width}`);
    await dialog
      .getByRole("combobox", { name: "Type", exact: true })
      .selectOption("meeting");
    await dialog.getByLabel("All-day event").check();
    await dialog
      .getByRole("combobox", { name: "Repeat", exact: true })
      .selectOption("weekly");
    await dialog.getByLabel("Location", { exact: true }).fill("Project room");
    await noOverflow(page);
    await dialog
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page
        .getByRole("button", { name: new RegExp(`Planning session ${width}`) })
        .first(),
    ).toBeVisible();
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath("calendar.png"),
        fullPage: true,
      });
    for (const view of ["week", "day", "agenda", "month"]) {
      await page
        .getByRole("combobox", { name: "Calendar view" })
        .selectOption(view);
      await expect(page.getByLabel("Loading calendar")).not.toBeVisible();
      await noOverflow(page);
    }
    await page
      .getByRole("button", { name: new RegExp(`Planning session ${width}`) })
      .first()
      .click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Location", { exact: true })).toHaveValue(
      "Project room",
    );
    await dialog.getByLabel("Event title").fill(`Updated planning ${width}`);
    await dialog.getByRole("button", { name: "Save event" }).click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole("button", { name: new RegExp(`Updated planning ${width}`) })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete event", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const title = `Backlog step ${width}`;
    const response = await page.request.post("/api/tasks", {
      headers: { origin },
      data: {
        title,
        description: "A queued action",
        priority: "medium",
        status: "new",
        categoryId: null,
        startsAt: null,
        dueAt: null,
        backlog: true,
      },
    });
    expect(response.status()).toBe(201);
    await page.goto("/backlogs");
    await expect(
      page.getByRole("heading", { name: "Backlogs", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await expect(
      page.getByText("Needs a fresh look", { exact: true }),
    ).toBeVisible();
    const card = page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card.getByRole("button", { name: "Make active" }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).not.toBeVisible();
    await page
      .getByRole("combobox", { name: "Age since created" })
      .selectOption("14");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Neglected planning task",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("A critical task needs your attention", { exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(
      page.getByRole("button", { name: "Mark unread" }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark unread" }).first().click();
    await page.getByLabel("Unread only", { exact: true }).check();
    await expect(
      page.getByText("Unread", { exact: true }).first(),
    ).toBeVisible();
    await noOverflow(page);
    await page.goto("/work-logs");
    await expect(
      page.getByRole("heading", { name: "Work logs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`Activated backlog task “${title}”`, { exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page.getByRole("button", { name: "Add work log" }).click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("What did you accomplish?")
      .fill(`Focused work ${width}`);
    await dialog.getByLabel("Duration (minutes, optional)").fill("25");
    await dialog.getByRole("button", { name: "Save work log" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(`Focused work ${width}`, { exact: true }),
    ).toBeVisible();
    for (const period of ["weekly", "monthly"]) {
      await page
        .getByRole("combobox", { name: "Period", exact: true })
        .selectOption(period);
      await page.getByRole("button", { name: "Apply filters" }).click();
      await expect(
        page.getByText(`Focused work ${width}`, { exact: true }),
      ).toBeVisible();
      await noOverflow(page);
    }
    const log = page.locator("li").filter({ hasText: `Focused work ${width}` });
    await log
      .getByRole("button", { name: "Edit work log", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("What did you accomplish?")
      .fill(`Edited work ${width}`);
    await dialog.getByRole("button", { name: "Save work log" }).click();
    await expect(dialog).not.toBeVisible();
    await page
      .locator("li")
      .filter({ hasText: `Edited work ${width}` })
      .getByRole("button", { name: "Edit work log", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete work log", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: "Remind before deadlines and events" })
      .selectOption("30");
    await page.getByRole("button", { name: "Save reminders" }).click();
    await expect(
      page.getByText("Reminder preferences saved", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("combobox", {
        name: "Remind before deadlines and events",
      }),
    ).toHaveValue("30");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await noOverflow(page);
    await page.setViewportSize({ width: 900, height: width });
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}
