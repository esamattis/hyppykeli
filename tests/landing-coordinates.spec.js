import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
});

test("landing coordinates react to query and station changes without mixing coordinate pairs", async ({
    page,
}) => {
    // Import state without starting weather refreshes that reset station metadata.
    await page.goto("/");
    const result = await page.evaluate(async () => {
        const { QUERY_PARAMS } = await import("#app/app/settings.js");
        const {
            STATION_COORDINATES,
            LANDING_COORDINATES,
            FORECAST_COORDINATES,
        } = await import("#app/weather/state.js");
        const forecasts = [];
        const readCoordinates = () => {
            forecasts.push(FORECAST_COORDINATES.value);
            return LANDING_COORDINATES.value;
        };
        QUERY_PARAMS.value = {};
        STATION_COORDINATES.value = null;
        const missing = readCoordinates();
        STATION_COORDINATES.value = "64.93,25.35";
        const station = readCoordinates();
        QUERY_PARAMS.value = { lat: "62.4", lon: "25.6" };
        const explicit = readCoordinates();
        STATION_COORDINATES.value = "60.2,24.9";
        const overridden = readCoordinates();
        QUERY_PARAMS.value = { lat: "62.4" };
        const incomplete = readCoordinates();
        QUERY_PARAMS.value = { lat: " ", lon: "25.6" };
        const blank = readCoordinates();
        QUERY_PARAMS.value = { lat: "0", lon: "0" };
        const zero = readCoordinates();
        QUERY_PARAMS.value = { lat: "invalid", lon: "25.6" };
        const invalid = readCoordinates();
        QUERY_PARAMS.value = {};
        STATION_COORDINATES.value = "91,25";
        const invalidStation = readCoordinates();
        STATION_COORDINATES.value = ",25";
        const blankStation = readCoordinates();
        return {
            forecasts,
            positions: {
                missing,
                station,
                explicit,
                overridden,
                incomplete,
                blank,
                zero,
                invalid,
                invalidStation,
                blankStation,
            },
        };
    });
    expect(result.positions).toEqual({
        missing: null,
        station: { lat: 64.93, lng: 25.35 },
        explicit: { lat: 62.4, lng: 25.6 },
        overridden: { lat: 62.4, lng: 25.6 },
        incomplete: { lat: 60.2, lng: 24.9 },
        blank: { lat: 60.2, lng: 24.9 },
        zero: { lat: 0, lng: 0 },
        invalid: { lat: 60.2, lng: 24.9 },
        invalidStation: null,
        blankStation: null,
    });
    expect(result.forecasts).toEqual([
        null,
        "64.93,25.35",
        "62.4,25.6",
        "62.4,25.6",
        "60.2,24.9",
        "60.2,24.9",
        "0,0",
        "60.2,24.9",
        null,
        null,
    ]);
});

test("automatic placement waits for station coordinates and uses them as the landing target", async ({
    page,
}) => {
    await page.goto(
        "/dz/?name=EFOU&MANUAL_ground_obs=10,10,0,1&MANUAL_upper_winds=10,0;10,0;10,0;10,0;10,0",
    );
    await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
    await page.evaluate(async () => {
        const { STATION_COORDINATES } = await import("#app/weather/state.js");
        STATION_COORDINATES.value = "64.93,25.35";
    });
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    const result = await page.evaluate(async () => {
        const { LANDING_COORDINATES } = await import("#app/weather/state.js");
        const { getMapWindData } = await import("#app/map/windData.js");
        const { startForAutomaticRun } =
            await import("#app/map/automaticPlacement.js");
        const { createJumpRunCalculator } = await import("#app/map/jumpRun.js");
        const params = new URL(location.href).searchParams;
        const settings = JSON.parse(params.get("map_run_settings"));
        const group = JSON.parse(params.get("map_jumpers"));
        const { freefallWinds, canopyWinds } = getMapWindData();
        return {
            start: JSON.parse(params.get("map_run_start")),
            expected: startForAutomaticRun(
                LANDING_COORDINATES.value,
                settings,
                group,
                createJumpRunCalculator()(freefallWinds, settings),
                canopyWinds,
            ),
            explicitCoordinates: params.has("lat") || params.has("lon"),
        };
    });
    expect(result.start).toEqual(result.expected);
    expect(result.explicitCoordinates).toBe(false);
});
