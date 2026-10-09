import { test, expect } from "@playwright/test";

const savePath =
    "/dz/?name=Vesis&lat=61.14567&lon=25.69214&elevation=150&roadsid=6001&save=1";

test("automatic saving creates and updates a single saved dropzone", async ({
    page,
    baseURL,
}) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
    await page.goto(savePath);
    await expect(page.locator("#winds .latest-wind-cell")).toHaveCount(3);
    expect(new URL(page.url()).searchParams.has("save")).toBe(false);
    await page.goto(savePath.replace("elevation=150", "elevation=160"));
    await expect(page.locator("#winds .latest-wind-cell")).toHaveCount(3);
    expect(new URL(page.url()).searchParams.has("save")).toBe(false);
    expect(
        await page.evaluate(() =>
            JSON.parse(localStorage.getItem("saved_dzs")),
        ),
    ).toEqual([
        {
            name: "Vesis",
            lat: "61.14567",
            lon: "25.69214",
            elevation: "160",
            roadsid: "6001",
        },
    ]);
});

test("automatic save failures leave weather usable and report the storage error", async ({
    page,
    baseURL,
}) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
    await page.addInitScript(() => {
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === "saved_dzs") {
                throw new DOMException("Storage is full", "QuotaExceededError");
            }
            setItem.call(this, key, value);
        };
    });
    await page.goto(savePath);
    await expect(page.locator("#winds .latest-wind-cell")).toHaveCount(3);
    await expect(
        page.getByText(/Hyppypaikan tallentaminen.*QuotaExceededError/),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.has("save")).toBe(false);
    expect(
        await page.evaluate(
            async () => (await import("#app/app/settings.js")).SAVED_DZs.value,
        ),
    ).toEqual([]);
    expect(errors).toEqual([]);
});

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
        if (url.hostname === "opendata.fmi.fi") {
            forecastRequests++;
            return route.fulfill({
                contentType: "application/xml",
                path: "tests/fixtures/forecast.xml",
            });
        }
        if (url.origin !== new URL(baseURL).origin) return route.abort();
        return route.continue();
    });
    await page.goto("/startup-test?lat=62&lon=25");
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
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
        const { FORECASTS, STALE_FORECASTS, LOADING, ERRORS } =
            await import("#app/weather/state.js");
        window.weatherChanges = [];
        for (const state of [FORECASTS, STALE_FORECASTS, LOADING, ERRORS]) {
            let initial = true;
            state.subscribe(() => {
                if (!initial) window.weatherChanges.push("changed");
                initial = false;
            });
        }
    });
    await page.clock.runFor(5_000);
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
    });
    expect(forecastRequests).toBe(1);
    expect(await page.evaluate(() => window.weatherChanges)).toEqual([]);
    // Expire the forecast cache before the next scheduled poll.
    const expired = await page.evaluate(() => Date.now() + 10 * 60_000);
    await page.clock.setSystemTime(expired);
    await page.clock.runFor(5_000);
    await expect.poll(() => forecastRequests).toBe(2);
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
    });
    // Focus, visibility, and page restoration all use the same cache rules.
    for (const event of ["focus", "visibilitychange", "pageshow"]) {
        const expired = await page.evaluate(() => Date.now() + 10 * 60_000);
        await page.clock.setSystemTime(expired);
        const previousRequests = forecastRequests;
        await page.evaluate((event) => {
            if (event === "visibilitychange") {
                Object.defineProperty(document, "visibilityState", {
                    configurable: true,
                    value: "visible",
                });
                document.dispatchEvent(new Event(event));
            } else if (event === "pageshow") {
                window.dispatchEvent(
                    new PageTransitionEvent(event, { persisted: true }),
                );
            } else {
                window.dispatchEvent(new Event(event));
            }
        }, event);
        await expect.poll(() => forecastRequests).toBe(previousRequests + 1);
        await page.evaluate(async () => {
            const { updateWeatherData } =
                await import("#app/weather/refresh.js");
            await updateWeatherData();
        });
    }
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
    await page.goto("/dz/?lat=62&lon=25", {
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
    await page.goto("/dz/?lat=62&lon=25");
    await expect(page.locator("#winds .latest-wind-cell")).toHaveCount(3);
    await page
        .locator("#dropzone-map")
        .getByRole("button", { name: "Yritä uudelleen" })
        .click();
    await expect(page.locator(".leaflet-container")).toHaveCount(1);
    expect(stylesheetRequests).toBe(2);
});
