import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL).origin)
            return route.abort();
        return route.continue();
    });
    await page.addInitScript(() => {
        localStorage.setItem("language", "en");
        window.wakeLockRequests = 0;
        window.wakeLockReleases = 0;
        Object.defineProperty(navigator, "wakeLock", {
            configurable: true,
            value: {
                async request(type) {
                    if (type !== "screen") throw new Error("Wrong lock type");
                    window.wakeLockRequests++;
                    if (window.rejectWakeLock) throw new Error("Denied");
                    const sentinel = new EventTarget();
                    sentinel.released = false;
                    sentinel.release = async () => {
                        sentinel.released = true;
                        window.wakeLockReleases++;
                        sentinel.dispatchEvent(new Event("release"));
                    };
                    window.wakeLockSentinel = sentinel;
                    return sentinel;
                },
            },
        });
    });
});

test("page and full-window map share the wake lock and release it on request", async ({
    page,
}) => {
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    const header = page.locator(".page-header .wake-lock-toggle");
    await expect(
        page.locator(".map-navigation-controls .wake-lock-toggle"),
    ).toHaveCount(0);
    await header.click();
    await expect(header).toHaveAttribute("aria-pressed", "true");
    await page.locator(".window-toggle").click();
    const mapToggle = page.locator(
        ".map-navigation-controls .wake-lock-toggle",
    );
    await expect(mapToggle).toBeVisible();
    await expect(mapToggle).toHaveAccessibleName("Allow screen to sleep");
    await mapToggle.click();
    await expect(mapToggle).toHaveAttribute("aria-pressed", "false");
    await expect(header).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.wakeLockReleases)).toBe(1);
    await mapToggle.click();
    await page.locator(".window-toggle").click();
    await expect(header).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.wakeLockRequests)).toBe(2);
});

test("wake lock returns after the tab becomes visible, until switched off", async ({
    page,
}) => {
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    const toggle = page.locator(".page-header .wake-lock-toggle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(async () => {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
        await window.wakeLockSentinel.release();
    });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: false,
        });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.wakeLockRequests)).toBe(2);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
    );
    expect(await page.evaluate(() => window.wakeLockRequests)).toBe(2);
});

test("denied requests can be retried", async ({ page }) => {
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    await page.evaluate(() => {
        window.rejectWakeLock = true;
    });
    const toggle = page.locator(".page-header .wake-lock-toggle");
    await toggle.click();
    await expect(toggle).toHaveAccessibleName(
        "Unable to keep screen on. Try again.",
    );
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.evaluate(() => {
        window.rejectWakeLock = false;
    });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("unsupported browsers hide the wake lock buttons", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "wakeLock", { value: undefined });
    });
    await page.goto("/dz/?lat=62&lon=25&name=Test&map_full_window=true");
    await expect(page.locator(".map-navigation-controls")).toBeVisible();
    await expect(page.locator(".wake-lock-toggle")).toHaveCount(0);
});
