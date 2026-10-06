import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    use: {
        headless: true,
        baseURL: "http://127.0.0.1:8489",
        locale: "fi-FI",
        trace: "off",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
        command: "caddy file-server --listen 127.0.0.1:8489 --root .",
        url: "http://127.0.0.1:8489",
        stderr: "ignore",
        reuseExistingServer: !process.env.CI,
    },
});
