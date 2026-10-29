import { test, expect, type Page } from "@playwright/test";
import { browserPassword } from "../browser-fixtures";
async function login(page: Page, user = "browseradmin") {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(user);
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
  test(`${width}px: login, navigation, task CRUD, settings and themes`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await noOverflow(page);
    if (width === 320 || width === 1440)
      await page.screenshot({
        caret: "initial",
        path: testInfo.outputPath("login.png"),
        fullPage: true,
      });
    await login(page);
    await expect(
      page.getByRole("heading", { name: /Let’s make progress/ }),
    ).toBeVisible();
    await noOverflow(page);
    if (width === 320 || width === 1440)
      await page.screenshot({
        caret: "initial",
        path: testInfo.outputPath("dashboard.png"),
        fullPage: true,
      });
    if (width < 1024) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("link", { name: "My Tasks", exact: true }).click();
    } else {
      await page.getByRole("link", { name: "My Tasks", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: /My tasks/ })).toBeVisible();
    await noOverflow(page);
    if (width < 768)
      await page.getByRole("button", { name: "Quick add task" }).click();
    else
      await page
        .getByRole("button", { name: "New task", exact: true })
        .last()
        .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await noOverflow(page);
    await dialog.getByLabel("Task title").fill(`Responsive task ${width}`);
    await dialog
      .getByLabel("Description")
      .fill("Created by browser verification.");
    await dialog
      .getByRole("combobox", { name: "Priority", exact: true })
      .selectOption("high");
    if (width === 320)
      await page.screenshot({
        caret: "initial",
        path: testInfo.outputPath("task-dialog.png"),
        fullPage: true,
      });
    await dialog
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole("textbox", { name: "Search tasks" })
      .fill(`Responsive task ${width}`);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page
        .getByText(`Responsive task ${width}`, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page
      .getByRole("button", {
        name: `Edit Responsive task ${width}`,
        exact: true,
      })
      .filter({ visible: true })
      .click();
    await dialog
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("completed");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("Completed", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: `Delete Responsive task ${width}`,
        exact: true,
      })
      .filter({ visible: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete task", exact: true })
      .click();
    await expect(page.getByText("No tasks match these filters")).toBeVisible();
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await noOverflow(page);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await noOverflow(page);
    await page.setViewportSize({ width: 900, height: width });
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}
test("temporary password gate, private access, categories, account management and keyboard dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, "firstlogin");
  await expect(page).toHaveURL(/change-password/);
  await page.goto("/tasks");
  await expect(page).toHaveURL(/change-password/);
  await page
    .getByLabel("Current password", { exact: true })
    .fill(browserPassword);
  await page
    .getByLabel("New password", { exact: true })
    .fill("Replacement-browser-test-passphrase!");
  await page
    .getByLabel("Confirm new password")
    .fill("Replacement-browser-test-passphrase!");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.goto("/admin/users");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Add category" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Browser category");
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(
    page.getByText("Browser category", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Quick add task" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  await login(page);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "User management", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Username", { exact: true }).fill("browser-created");
  await dialog.getByLabel("Temporary password").fill(browserPassword);
  await dialog
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("browser-created", { exact: true }),
  ).toBeVisible();
});
