import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const importMap = readFileSync("dz/index.html", "utf8").match(
    /<script type="importmap">[\s\S]*?<\/script>/,
)[0];

test("ground wind fallbacks preserve freshness, source priority, and automatic placement", async ({
    page,
}) => {
    await page.route("**/wind-test", (route) =>
        route.fulfill({ contentType: "text/html", body: importMap }),
    );
    await page.goto("/wind-test");
    const results = await page.evaluate(async () => {
        const { QUERY_PARAMS } = await import("#app/app/settings.js");
        const { LIVE_OBSERVATIONS, LIVE_METARS, OPEN_METEO_CURRENT } =
            await import("#app/weather/state.js");
        const { parseMetarMessages } =
            await import("#app/weather/metarMessages.js");
        const { getMapWindData } = await import("#app/map/windData.js");
        const { createJumpRunCalculator } = await import("#app/map/jumpRun.js");
        const { startForAutomaticRun } =
            await import("#app/map/automaticPlacement.js");
        const now = Date.now();
        QUERY_PARAMS.value = {
            elevation: "153.0096",
            MANUAL_upper_winds: [7000, 5500, 4200, 3000, 1500, 800, 110]
                .map((height) => `10,0,${height}`)
                .join(";"),
        };
        const metar = parseMetarMessages([
            "METAR EFLA 081200Z 18010KT 9999 SCT030 10/05 Q1013",
        ])[0];
        metar.time = new Date(now - 30 * 60_000);
        LIVE_METARS.value = [metar];
        const reading = { time: new Date(now), speed: 4, direction: 90 };
        const station = { ...reading, source: "fmi" };
        const model = { ...reading, source: "openmeteo" };
        LIVE_OBSERVATIONS.value = [station];
        OPEN_METEO_CURRENT.value = model;
        const read = () => {
            const data = getMapWindData(now);
            const settings = {
                direction: 0,
                speedKmh: 157,
                exitHeight: 4000,
                separationSeconds: 5,
                wingsuitGlideRatio: 1.6,
                wingsuitDescentRateMps: 80 / 3.6,
                canopyGlideRatio: 3,
                canopyDescentRateMps: 5,
            };
            const calculation = createJumpRunCalculator()(
                data.freefallWinds,
                settings,
            );
            return {
                source: data.ground?.source ?? null,
                speed: data.ground?.speed ?? null,
                endpoint: data.canopyWinds.at(-1).speed,
                placed: !!startForAutomaticRun(
                    { lat: 61.146406, lng: 25.693366 },
                    settings,
                    [{ speedKmh: 180, openingHeight: 800 }],
                    calculation,
                    data.canopyWinds,
                ),
            };
        };
        const results = [read()];
        LIVE_OBSERVATIONS.value = [
            { ...station, time: new Date(now - 2 * 3600_000) },
        ];
        results.push(read());
        LIVE_METARS.value = [
            { ...metar, wind: { ...metar.wind, direction: "VRB" } },
        ];
        results.push(read());
        LIVE_METARS.value = [{ ...metar, time: new Date(now - 2 * 3600_000) }];
        results.push(read());
        // Invalid newer observations must not hide a valid older station reading.
        LIVE_OBSERVATIONS.value = [
            { ...station, speed: NaN },
            { ...station, time: new Date(now - 60_000) },
        ];
        results.push(read());
        LIVE_OBSERVATIONS.value = [
            { ...station, speed: 0, direction: undefined },
        ];
        results.push(read());
        LIVE_OBSERVATIONS.value = [];
        OPEN_METEO_CURRENT.value = {
            ...model,
            time: new Date(now - 2 * 3600_000),
        };
        results.push(read());
        OPEN_METEO_CURRENT.value = {
            ...model,
            time: new Date(now + 2 * 3600_000),
        };
        results.push(read());
        // If the lowest valid wind is above 300 m, pattern entry also needs
        // the missing ground reading to interpolate that final layer.
        QUERY_PARAMS.value = {
            ...QUERY_PARAMS.value,
            MANUAL_upper_winds: QUERY_PARAMS.value.MANUAL_upper_winds.replace(
                "10,0,110",
                "10,0,0",
            ),
        };
        results.push(read());
        return results;
    });
    expect(results.map(({ source }) => source)).toEqual([
        "fmi",
        "metar",
        "openmeteo",
        "openmeteo",
        "fmi",
        "fmi",
        null,
        null,
        null,
    ]);
    expect(results[1].speed).toBeCloseTo(10 * 0.514444, 4);
    for (const result of results.slice(0, 6)) {
        expect(result.placed).toBe(true);
        expect(result.endpoint).toBe(result.speed);
    }
    expect(results[5].speed).toBe(0);
    for (const result of results.slice(6, 8)) {
        // A valid 110 m level brackets 300 m, so ground wind is unused.
        expect(result.placed).toBe(true);
        expect(result.endpoint).toBeNull();
    }
    expect(results[8].placed).toBe(false);
    expect(results[8].endpoint).toBeNull();
});
