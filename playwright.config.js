import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    use: {
        headless: true,
        baseURL: "http://127.0.0.1:8489",
        locale: "fi-FI",
        trace: "retain-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
        command: "python3 -m http.server 8489 --bind 127.0.0.1",
        url: "http://127.0.0.1:8489",
        stderr: "ignore",
        reuseExistingServer: !process.env.CI,
    },
});
