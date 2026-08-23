import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:15173", headless: true, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: `VITE_API_PROXY_TARGET=${process.env.E2E_API_PROXY_TARGET || "http://127.0.0.1:18080"} npm run dev -- --host 127.0.0.1 --port 15173`,
    port: 15173,
    reuseExistingServer: false,
  },
});
