import { test, expect } from "@playwright/test";

test("weather modules stay idle until startup and repeated startup polls only once", async ({
    page,
    baseURL,
}) => {
    let forecastRequests = 0;
    await page.clock.install();
    await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/startup-test") {
            return route.fulfill({
                contentType: "text/html",
                body: `<!doctype html><script type="importmap">{
                    "imports": {
                        "#app/": "/src/",
                        "@preact/signals": "/vendor/build/preact-signals.js",
                        "preact": "/vendor/build/preact.js",
                        "preact/hooks": "/vendor/build/preact-hooks.js"
                    }
                }</script>`,
            });
        }
        if (url.origin !== new URL(baseURL).origin) return route.abort();
        if (url.pathname === "/example_data/forecast.xml") forecastRequests++;
        return route.continue();
    });
    await page.goto("/startup-test?lat=62&lon=25&DEV_mock=1");
    await page.evaluate(async () => {
        await import("#app/weather/state.js");
        await import("#app/map/windData.js");
        await import("#app/app/start.js");
    });
    await page.clock.runFor(60_000);
    expect(forecastRequests).toBe(0);

    await page.evaluate(async () => {
        const { startApp } = await import("#app/app/start.js");
        startApp();
        startApp();
    });
    await expect.poll(() => forecastRequests).toBe(1);
    // Let the initial refresh finish before advancing the polling interval.
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { LOADING, FORECASTS } =
                    await import("#app/weather/state.js");
                return LOADING.value === 0 && FORECASTS.value.length > 0;
            }),
        )
        .toBe(true);
    await page.clock.runFor(60_000);
    await expect.poll(() => forecastRequests).toBe(2);
});

test("weather UI renders before the map module and waits for Leaflet styles", async ({
    page,
    baseURL,
}) => {
    let releaseModule;
    let releaseStyles;
    const moduleReady = new Promise((resolve) => {
        releaseModule = resolve;
    });
    const stylesReady = new Promise((resolve) => {
        releaseStyles = resolve;
    });
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(baseURL).origin) return route.abort();
        if (url.pathname === "/src/map/DropzoneMap.js") await moduleReady;
        if (url.pathname === "/vendor/build/leaflet.css") await stylesReady;
        return route.continue();
    });
    // DOMContentLoaded must not depend on the deferred map's module tree.
    await page.goto("/dz/?lat=62&lon=25&DEV_mock=1", {
        waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#winds .latest-wind-cell")).toHaveCount(3);
    await expect(page.locator("#dropzone-map")).toHaveAttribute(
        "aria-busy",
        "true",
    );
    releaseModule();
    await expect
        .poll(() =>
            page.evaluate(() =>
                performance
                    .getEntriesByType("resource")
                    .some((entry) =>
                        entry.name.endsWith("/src/map/DropzoneMap.js"),
                    ),
            ),
        )
        .toBe(true);
    await expect(page.locator(".dz-map")).toHaveCount(0);
    releaseStyles();
    await expect(page.locator(".dz-map")).toHaveCount(1);
    await expect(page.locator(".leaflet-container")).toHaveCount(1);
});

test("map stylesheet failures leave the weather usable and can be retried", async ({
    page,
    baseURL,
}) => {
    let stylesheetRequests = 0;
    await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(baseURL).origin) return route.abort();
        if (
            url.pathname === "/vendor/build/leaflet.css" &&
            ++stylesheetRequests === 1
        )
            return route.abort();
        return route.continue();
    });
    await page.goto("/dz/?lat=62&lon=25&DEV_mock=1");
    await expect(page.locator("#winds .latest-wind-cell")).toHaveCount(3);
    await page.getByRole("button", { name: "Yritä uudelleen" }).click();
    await expect(page.locator(".leaflet-container")).toHaveCount(1);
    expect(stylesheetRequests).toBe(2);
});
