import { test, expect } from "@playwright/test";
import { browserPassword } from "../browser-fixtures";
test("Kanban responds to actual touch dragging and horizontal scrolling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("advanced");
  await page.getByLabel("Password", { exact: true }).fill(browserPassword);
  await page.getByRole("button", { name: "Sign in to your workspace" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  const title = "Touch verification";
  expect(
    (
      await page.request.post("/api/tasks", {
        headers: { origin: "http://127.0.0.1:3100" },
        data: {
          title,
          description: "",
          priority: "medium",
          status: "new",
          categoryId: null,
          startsAt: null,
          dueAt: null,
          backlog: false,
        },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/kanban?q=Touch");
  const handle = page.getByRole("button", {
    name: `Drag ${title}`,
    exact: true,
  });
  await expect(handle).toBeVisible();
  expect(
    await handle.evaluate((node) => getComputedStyle(node).touchAction),
  ).toBe("none");
  const target = page.getByRole("region", {
    name: "In Progress column",
    exact: true,
  });
  const a = await handle.boundingBox(),
    b = await target.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  const sx = a!.x + 22,
    sy = a!.y + 22,
    ex = b!.x + b!.width / 2;
  const cdp = await context.newCDPSession(page);
  const frame = () =>
    page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: sx, y: sy, id: 1, radiusX: 5, radiusY: 5, force: 1 }],
  });
  await page.waitForTimeout(220); // Long-press activation is intentional for touch dragging.
  await frame();
  for (let i = 1; i <= 20; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: sx + ((ex - sx) * i) / 20,
          y: sy,
          id: 1,
          radiusX: 5,
          radiusY: 5,
          force: 1,
        },
      ],
    });
    await frame();
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(
    target.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/kanban?q=Touch");
  const board = page.getByLabel("Kanban board", { exact: true });
  await board.scrollIntoViewIfNeeded();
  const rect = await board.boundingBox();
  const y = Math.max(120, Math.min(700, rect!.y + 100));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 290, y, id: 2, radiusX: 5, radiusY: 5, force: 1 }],
  });
  for (let i = 1; i <= 12; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 290 - (180 * i) / 12, y, id: 2, radiusX: 5, radiusY: 5, force: 1 },
      ],
    });
    await frame();
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => board.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
  await context.close();
});
