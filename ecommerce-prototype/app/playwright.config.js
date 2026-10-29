import { defineConfig, devices } from "@playwright/test";
const STORE_SERVER_PORT = "8711";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.js",
  timeout: 90000,
  workers: 2,
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", testIgnore: "equipo.spec.js", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      testIgnore: "equipo.spec.js",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    // The dashboard edits shared shipping rates, so it runs on a phone after the store specs finish.
    {
      name: "equipo",
      testMatch: "equipo.spec.js",
      dependencies: ["desktop", "mobile"],
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      // Started without the root .env: stub Pulso, test Wompi values and an in-memory database.
      command: "node --disable-warning=ExperimentalWarning src/index.js",
      cwd: "../server",
      url: `http://127.0.0.1:${STORE_SERVER_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: "test",
        PULSO_MODE: "stub",
        WOMPI_LOOKUP: "off",
        DB_PATH: ":memory:",
        PORT: STORE_SERVER_PORT,
        PUBLIC_URL: "http://127.0.0.1:4174",
        STORE_ID: "test",
        STORE_API_KEY: "",
        WOMPI_PUBLIC_KEY: "pub_test_x",
        WOMPI_PRIVATE_KEY: "prv_test_x",
        WOMPI_EVENTS: "test_events_x",
        WOMPI_INTEGRITY: "test_integrity_x",
      },
    },
    {
      command: "npm run dev -- --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      env: { STORE_SERVER_PORT },
    },
  ],
});
