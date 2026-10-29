import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { browserPassword } from "../browser-fixtures";
const origin = "http://127.0.0.1:3100";
const base = {
  description: "",
  priority: "medium",
  status: "new",
  categoryId: null,
  startsAt: null,
  dueAt: null,
  backlog: false,
};
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("advanced");
  await page.getByLabel("Password", { exact: true }).fill(browserPassword);
  await page.getByRole("button", { name: "Sign in to your workspace" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
for (const width of [320, 375, 430, 768, 1024, 1440]) {
  test(`${width}px: advanced tasks, recurrence, Kanban, reports and preferences`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto("/tasks?display=list");
    await page
      .getByRole("button", { name: "New task", exact: true })
      .filter({ visible: true })
      .last()
      .click();
    const dialog = page.getByRole("dialog");
    const title = `Phase 3 task ${width}`;
    await dialog.getByLabel("Task title", { exact: true }).fill(title);
    await dialog.getByLabel("Private notes").fill("Keep this note private");
    await dialog.getByLabel("Tags (comma-separated)").fill("Focus, phase3");
    await dialog.getByLabel("Due date & time").fill("2030-01-31T09:00");
    await dialog
      .getByRole("combobox", { name: "Repeat task", exact: true })
      .selectOption("monthly");
    await dialog.getByLabel("New item title").fill("Plan the work");
    await dialog.getByRole("button", { name: "Add item", exact: true }).click();
    await dialog.getByLabel("Complete item 1", { exact: true }).check();
    await dialog
      .getByRole("combobox", { name: "New item type", exact: true })
      .selectOption("checklist");
    await dialog.getByLabel("New item title").fill("Review the result");
    await dialog.getByRole("button", { name: "Add item", exact: true }).click();
    await noOverflow(page);
    await dialog
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.goto("/kanban");
    const newColumn = page.getByRole("region", {
      name: "New column",
      exact: true,
    });
    let card = newColumn
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card
      .getByRole("combobox", { name: `Move ${title} to status` })
      .selectOption("completed");
    const completedColumn = page.getByRole("region", {
      name: "Completed column",
      exact: true,
    });
    await expect(
      completedColumn.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      newColumn.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    card = newColumn
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card.getByRole("button", { name: "Details", exact: true }).click();
    await expect(
      dialog.getByLabel("Complete item 1", { exact: true }),
    ).not.toBeChecked();
    await expect(dialog.getByLabel("Tags (comma-separated)")).toHaveValue(
      /focus/,
    );
    await expect(dialog.getByLabel("Private notes")).toHaveValue(
      "Keep this note private",
    );
    await expect(dialog.getByLabel("Due date & time")).toHaveValue(
      "2030-03-31T09:00",
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath("kanban.png"),
        fullPage: true,
      });
    const bulkTitle = `Bulk action ${width}`;
    expect(
      (
        await page.request.post("/api/tasks", {
          headers: { origin },
          data: { ...base, title: bulkTitle },
        })
      ).status(),
    ).toBe(201);
    await page.goto("/tasks?display=list");
    await page
      .getByRole("button", { name: "Bulk actions", exact: true })
      .click();
    await dialog.getByLabel(bulkTitle, { exact: true }).check();
    await dialog
      .getByRole("combobox", { name: "New value", exact: true })
      .selectOption("pending");
    await dialog.getByRole("button", { name: "Apply to 1 tasks" }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("textbox", { name: "Filter by tag" }).fill("focus");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page
        .getByText(title, { exact: true })
        .filter({ visible: true })
        .first()
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(page.getByText(bulkTitle, { exact: true })).not.toBeVisible();
    await page.goto("/reports");
    await expect(
      page.getByRole("heading", { name: "Reports & analytics" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tasks by status", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await expect(
      page.getByText(title, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Group completions by" })
      .selectOption("week");
    await page.getByRole("button", { name: "Update report" }).click();
    await expect(
      page.getByText(title, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Group completions by" })
      .selectOption("month");
    await page.getByRole("button", { name: "Update report" }).click();
    await expect(
      page.getByText(title, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "CSV", exact: true }).click();
    const download = await downloadPromise;
    expect(readFileSync((await download.path())!, "utf8")).toContain(title);
    const jsonPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "JSON", exact: true }).click();
    const json = JSON.parse(
      readFileSync((await (await jsonPromise).path())!, "utf8"),
    );
    expect(json.records.some((r: { title: string }) => r.title === title)).toBe(
      true,
    );
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath("reports.png"),
        fullPage: true,
      });
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("header")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Accomplishments", exact: true }),
    ).toBeVisible();
    await page.emulateMedia({ media: "screen" });
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: "Timezone", exact: true })
      .selectOption("America/New_York");
    await page
      .getByRole("combobox", { name: "Date format", exact: true })
      .selectOption("yyyy-MM-dd");
    await page
      .getByRole("combobox", { name: "Default task view", exact: true })
      .selectOption("kanban");
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect(
      page.getByText("Workspace preferences saved", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Timezone", exact: true }),
    ).toHaveValue("America/New_York");
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/kanban$/);
    await page.goto("/calendar");
    await expect(
      page.getByText("Tasks, deadlines and plans · America/New_York"),
    ).toBeVisible();
    await noOverflow(page);
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: "Timezone", exact: true })
      .selectOption("Asia/Manila");
    await page
      .getByRole("combobox", { name: "Date format", exact: true })
      .selectOption("medium");
    await page
      .getByRole("combobox", { name: "Default task view", exact: true })
      .selectOption("list");
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect(
      page.getByText("Workspace preferences saved", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await noOverflow(page);
    await page.setViewportSize({ width: 900, height: width });
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}
test("Kanban supports pointer drag handles and touch scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const title = "Drag verification";
  expect(
    (
      await page.request.post("/api/tasks", {
        headers: { origin },
        data: { ...base, title },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/kanban?q=Drag");
  const handle = page.getByRole("button", {
    name: `Drag ${title}`,
    exact: true,
  });
  const target = page.getByRole("region", {
    name: "In Progress column",
    exact: true,
  });
  const start = await handle.boundingBox(),
    end = await target.boundingBox();
  expect(start).not.toBeNull();
  expect(end).not.toBeNull();
  await page.mouse.move(start!.x + 20, start!.y + 20);
  await page.mouse.down();
  await page.mouse.move(start!.x + 30, start!.y + 25, { steps: 5 });
  await page.mouse.move(end!.x + end!.width / 2, end!.y + 100, { steps: 20 });
  await page.mouse.up();
  await expect(
    target.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
});
