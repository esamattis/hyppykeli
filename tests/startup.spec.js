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
        await import("/src/weather/state.js");
        await import("/src/map/windData.js");
        await import("/src/app/start.js");
    });
    await page.clock.runFor(60_000);
    expect(forecastRequests).toBe(0);

    await page.evaluate(async () => {
        const { startApp } = await import("/src/app/start.js");
        startApp();
        startApp();
    });
    await expect.poll(() => forecastRequests).toBe(1);
    // Let the initial refresh finish before advancing the polling interval.
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { LOADING, FORECASTS } =
                    await import("/src/weather/state.js");
                return LOADING.value === 0 && FORECASTS.value.length > 0;
            }),
        )
        .toBe(true);
    await page.clock.runFor(60_000);
    await expect.poll(() => forecastRequests).toBe(2);
});
