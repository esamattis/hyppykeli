import { test, expect } from "@playwright/test";

async function openRefreshHarness(page) {
    await page.route("**/refresh-test", (route) =>
        route.fulfill({
            contentType: "text/html",
            body: `<script type="importmap">{"imports":{
                "#app/":"/src/",
                "@preact/signals":"/vendor/build/preact-signals.js",
                "preact":"/vendor/build/preact.js",
                "preact/hooks":"/vendor/build/preact-hooks.js"
            }}</script>`,
        }),
    );
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ status: 503 }),
    );
    await page.route("https://tie.digitraffic.fi/**", (route) =>
        route.fulfill({ status: 503 }),
    );
    await page.goto("/refresh-test");
}

for (const explicit of [false, true]) {
    test(`recovering FMI station updates forecast coordinates (explicit coordinates: ${explicit})`, async ({
        page,
    }) => {
        const forecastLocations = [];
        await page.route("https://opendata.fmi.fi/**", (route) => {
            const params = new URL(route.request().url()).searchParams;
            if (params.get("storedquery_id").includes("observations")) {
                return route.fulfill({
                    contentType: "application/xml",
                    path: "tests/fixtures/observations.xml",
                });
            }
            forecastLocations.push(params.get("latlon"));
            return route.fulfill({ status: 503 });
        });
        await openRefreshHarness(page);
        const result = await page.evaluate(async (explicit) => {
            const { QUERY_PARAMS } = await import("#app/app/settings.js");
            QUERY_PARAMS.value = {
                fmisid: "101339",
                roadsid: "5004",
                ...(explicit ? { lat: "61", lon: "24" } : {}),
            };
            const url =
                "https://tie.digitraffic.fi/api/weather/v1/stations/5004";
            const key =
                "hyppykeli:response:v1:" +
                JSON.stringify([
                    url,
                    "json",
                    { "Digitraffic-User": "hyppykeli.fi" },
                ]);
            localStorage.setItem(
                key,
                JSON.stringify({
                    data: {
                        geometry: { coordinates: [25, 60] },
                        properties: { names: { fi: "Cached road station" } },
                    },
                    hasData: true,
                    fetchedAt: Date.now(),
                    lastAttemptAt: Date.now(),
                    measurementAt: null,
                }),
            );
            const { updateWeatherData } =
                await import("#app/weather/refresh.js");
            await updateWeatherData();
            const { STATION_COORDINATES, FORECAST_COORDINATES } =
                await import("#app/weather/state.js");
            return {
                station: STATION_COORDINATES.value,
                forecast: FORECAST_COORDINATES.value,
            };
        }, explicit);
        expect(result.station).toBe("60.89839,26.94882");
        const expected = explicit ? "61,24" : result.station;
        expect(result.forecast).toBe(expected);
        expect(forecastLocations).toEqual([expected]);
    });
}

test("changing locations supersedes a blocked refresh without stale writes or errors", async ({
    page,
}) => {
    let release;
    const blocked = new Promise((resolve) => {
        release = resolve;
    });
    const requested = [];
    await page.route("https://opendata.fmi.fi/**", async (route) => {
        const coordinates = new URL(route.request().url()).searchParams.get(
            "latlon",
        );
        requested.push(coordinates);
        if (coordinates === "60,25") await blocked;
        await route.fulfill({
            contentType: "application/xml",
            path: "tests/fixtures/forecast.xml",
        });
    });
    await openRefreshHarness(page);
    await page.evaluate(async () => {
        const { QUERY_PARAMS } = await import("#app/app/settings.js");
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        window.cacheFailures = [];
        document.addEventListener("apicacheerror", (event) => {
            window.cacheFailures.push(event.detail.provider);
        });
        QUERY_PARAMS.value = { lat: "60", lon: "25" };
        window.oldRefresh = updateWeatherData();
    });
    await expect.poll(() => requested).toEqual(["60,25"]);
    // The second refresh must complete while the first response is still held.
    await page.evaluate(async () => {
        const { QUERY_PARAMS } = await import("#app/app/settings.js");
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        QUERY_PARAMS.value = { lat: "40", lon: "-74" };
        await updateWeatherData();
    });
    expect(requested).toEqual(["60,25", "40,-74"]);
    release();
    await page.evaluate(() => window.oldRefresh);
    const result = await page.evaluate(async () => {
        const { FORECAST_COORDINATES, FORECAST_SOURCE, LOADING } =
            await import("#app/weather/state.js");
        return {
            coordinates: FORECAST_COORDINATES.value,
            source: FORECAST_SOURCE.value,
            loading: LOADING.value,
            fmiFailures: window.cacheFailures.filter(
                (host) => host === "opendata.fmi.fi",
            ),
            oldCacheKeys: Object.keys(localStorage).filter((key) =>
                key.includes("fmi:forecast:60,25"),
            ),
        };
    });
    expect(result).toEqual({
        coordinates: "40,-74",
        source: "FMI",
        loading: 0,
        fmiFailures: [],
        oldCacheKeys: [],
    });
});

test("refreshing the same station preserves coordinates; switching stations clears them", async ({
    page,
}) => {
    await page.route("https://opendata.fmi.fi/**", (route) => {
        const query = new URL(route.request().url()).searchParams.get(
            "storedquery_id",
        );
        return query.includes("observations")
            ? route.fulfill({
                  contentType: "application/xml",
                  path: "tests/fixtures/observations.xml",
              })
            : route.fulfill({ status: 503 });
    });
    await openRefreshHarness(page);
    const result = await page.evaluate(async () => {
        const { QUERY_PARAMS } = await import("#app/app/settings.js");
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        const { STATION_COORDINATES } = await import("#app/weather/state.js");
        const { effect } = await import("@preact/signals");
        QUERY_PARAMS.value = { fmisid: "101339" };
        await updateWeatherData();
        const coordinates = [];
        const dispose = effect(() =>
            coordinates.push(STATION_COORDINATES.value),
        );
        await updateWeatherData();
        const sameStation = [...coordinates];
        QUERY_PARAMS.value = { lat: "61", lon: "24" };
        await updateWeatherData();
        dispose();
        return { sameStation, switchedStation: coordinates };
    });
    expect(result.sameStation).toEqual(["60.89839,26.94882"]);
    expect(result.switchedStation).toEqual(["60.89839,26.94882", null]);
});
