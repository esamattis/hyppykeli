import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    use: {
        headless: true,
        baseURL: "http://127.0.0.1:8491",
        locale: "fi-FI",
        trace: "off",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        {
            name: "mobile",
            // These calculations run in Node and do not depend on the device.
            testIgnore: [
                "**/automatic-placement.spec.js",
                "**/canopy.spec.js",
                "**/jump-run.spec.js",
                "**/metar.spec.js",
            ],
            use: { ...devices["Pixel 7"] },
        },
    ],
    webServer: {
        command: "caddy file-server --listen 127.0.0.1:8491 --root .",
        url: "http://127.0.0.1:8491",
        stderr: "ignore",
        reuseExistingServer: !process.env.CI,
    },
});
