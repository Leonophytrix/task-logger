import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    channel: "chromium",
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `"${process.execPath}" --import tsx scripts/e2e-server.ts`,
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
