import { test, expect } from "@playwright/test";

const developerPath =
    "/dz/?fmisid=137208&icaocode=EFJY&DEV_ground_obs=6.4%2C3.5%2C194%2C4.8%3B6.2%2C3.7%2C193%2C14.8%3B6.1%2C4%2C194%2C24.8%3B4%2C2.8%2C200%2C34.8%3B4.4%2C2.6%2C201%2C44.8%3B4.7%2C2.9%2C199%2C54.8&DEV_metar=METAR+EFJY+040720Z+AUTO+19007KT+160V220+9999+-SHRA+OVC005+%2F%2F%2F%2F%2F%2FCB+11%2F11+Q1014%3D&DEV_map_speed=12.5625&DEV_map_direction=246.25350981256466";

/** @param {import("@playwright/test").Page} page */
async function setUniformFreefallWind(page) {
    await page.evaluate(async () => {
        const { FORECAST_COORDINATES, OM_DATA } =
            await import("#app/weather/state.js");
        FORECAST_COORDINATES.value = "62.4,25.6";
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const level of ["600", "700", "850", "925", "1000"]) {
            hourly[`windspeed_${level}hPa`] = [10];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });
}

/** @param {import("@playwright/test").Page} page */
async function middleOpening(page) {
    return page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const {
            jumpRunCoordinates,
            getFreefallDrift,
            driftCoordinates,
            getJumpRunVelocity,
        } = await import("#app/map/freefall.js");
        const { latLng } = await import("leaflet");
        const params = new URL(location.href).searchParams;
        const settings = JSON.parse(params.get("map_run_settings") ?? "");
        const start = JSON.parse(params.get("map_run_start") ?? "");
        const jumpers = JSON.parse(params.get("map_jumpers") ?? "");
        const winds = getMapWindData().freefallWinds;
        const velocity = getJumpRunVelocity(winds, settings);
        const middleIndex = (jumpers.length - 1) / 2;
        const openings = [Math.floor(middleIndex), Math.ceil(middleIndex)].map(
            (index) => {
                const exit = latLng(
                    jumpRunCoordinates(start, settings, index, velocity.ground),
                );
                const jumper = jumpers[index];
                const path = getFreefallDrift(
                    winds,
                    settings.exitHeight,
                    jumper.speedKmh,
                    jumper.openingHeight,
                    velocity.air,
                );
                return latLng(driftCoordinates(exit, path[path.length - 1]));
            },
        );
        const opening = latLng(
            (openings[0].lat + openings[1].lat) / 2,
            (openings[0].lng + openings[1].lng) / 2,
        );
        return { lat: opening.lat, lng: opening.lng };
    });
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {{ lat: number, lng: number }} target
 */
async function openingDistance(page, target) {
    const opening = await middleOpening(page);
    return page.evaluate(
        async ({ opening, target }) => {
            const { latLng } = await import("leaflet");
            return latLng(opening).distanceTo(target);
        },
        { opening, target },
    );
}

function openMeteoResponse() {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() - 1);
    const time = Array.from({ length: 50 }, (_, index) =>
        new Date(start.getTime() + index * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16),
    );
    const hourly = {
        time,
        wind_speed_10m: time.map(() => 5),
        wind_gusts_10m: time.map(() => 9),
        wind_direction_10m: time.map(() => 180),
        temperature_2m: time.map(() => 10),
        dew_point_2m: time.map(() => 5),
        precipitation_probability: time.map(() => 10),
        cloud_cover_low: time.map(() => 20),
        cloud_cover_mid: time.map(() => 30),
    };
    const hourly_units = {
        time: "iso8601",
        wind_speed_10m: "m/s",
        wind_gusts_10m: "m/s",
    };
    for (const level of ["600", "700", "850", "925", "1000"]) {
        hourly_units[`windspeed_${level}hPa`] = "m/s";
        hourly[`windspeed_${level}hPa`] = time.map(() => 12);
        hourly[`winddirection_${level}hPa`] = time.map(() => 200);
        hourly[`cloud_cover_${level}hPa`] = time.map(() => 40);
        hourly[`geopotential_height_${level}hPa`] = time.map(
            () =>
                ({ 1000: 110, 925: 800, 850: 1500, 700: 3000, 600: 4200 })[
                    level
                ],
        );
    }
    return { utc_offset_seconds: 0, hourly, hourly_units };
}

test.beforeEach(async ({ page, baseURL }) => {
    // These tests use DEV_ values only; live weather, tiles and analytics
    // must not make their results depend on external services.
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin === new URL(baseURL).origin) {
            return route.continue();
        }
        return route.abort();
    });
    await page.goto(developerPath);
    await expect(page.getByRole("status")).toContainText(
        "Kehittäjätila käytössä.",
    );
});

test("menu opens and closes with its toggle", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "Valikko", exact: true });
    const menu = page.locator(".side-menu");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).not.toBeInViewport();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeInViewport();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).not.toBeInViewport();
});

test("language can be changed live and persists", async ({ page }) => {
    await page.getByRole("button", { name: "Valikko", exact: true }).click();

    const language = page.getByRole("combobox", { name: "Kieli" });
    await language.selectOption("en");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
        page.getByRole("heading", { name: "Dropzones" }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Winds", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("language"))).toBe(
        "en",
    );

    await page.reload();
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue(
        "en",
    );
});

test("name editor updates and removes the name query parameter", async ({
    page,
}) => {
    const editButton = page.getByRole("button", { name: "Muokkaa nimeä" });
    await editButton.click();

    const dialog = page.getByRole("dialog", { name: "Muokkaa nimeä" });
    const input = dialog.getByRole("textbox", { name: "Nimi" });
    await expect(input).toHaveValue("EFJY");
    await input.fill("Testikenttä");
    await dialog.getByRole("button", { name: "Tallenna" }).click();

    await expect(page.locator("#title .title-name")).toHaveText("Testikenttä");
    expect(new URL(page.url()).searchParams.get("name")).toBe("Testikenttä");

    await editButton.click();
    await input.fill("");
    await dialog.getByRole("button", { name: "Tallenna" }).click();

    await expect(page.locator("#title .title-name")).toHaveText("EFJY");
    expect(new URL(page.url()).searchParams.has("name")).toBe(false);
});

test("title falls back to FMI location and then coordinates", async ({
    page,
}) => {
    await page.goto("/dz/?fmisid=137208&DEV_mock=1");
    await expect(page.locator("#title .title-name")).toHaveText("Utti");

    await page.goto("/dz/?lat=40.7&lon=-74");
    await expect(page.locator("#title .title-name")).toHaveText(
        "40.7000, -74.0000",
    );
});

test("menu closes when clicking outside", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "Valikko", exact: true });
    await toggle.click();
    await expect(page.locator(".side-menu")).toBeInViewport();

    // The menu covers the heading's center on mobile; its left edge is exposed.
    await page.locator("#winds h2").click({ position: { x: 5, y: 10 } });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".side-menu")).not.toBeInViewport();
});

test("redesigned menu lists dropzones and removes obsolete tools", async ({
    page,
}) => {
    await page.getByRole("button", { name: "Valikko", exact: true }).click();
    const menu = page.locator(".side-menu");
    await expect(menu.locator(".dz-grid a")).toHaveCount(15);
    await expect(
        menu.getByRole("link", { name: "EFUT", exact: true }),
    ).toHaveAttribute(
        "href",
        "/dz/?fmisid=101191&icaocode=EFUT&lat=60.89755354967867&lon=26.926031112670902&map_zoom=14&default_jump_run_direction=78&default_jump_group_count=8",
    );
    await expect(menu.getByRole("heading")).toHaveText([
        "EFJY",
        "Hyppypaikat",
        "Kieli",
    ]);
    await expect(
        menu.locator('select[name="storedQuery"], .css-editor'),
    ).toHaveCount(0);
    await expect(
        menu.getByRole("button", { name: /^(Lataa|Jaa)$/ }),
    ).toHaveCount(0);

    await menu.getByRole("button", { name: "Sulje valikko" }).click();
    await expect(menu).not.toBeInViewport();
    await expect(menu).toHaveAttribute("inert", "");
});

test("ground wind shows the developer readings and hourly ranges", async ({
    page,
}) => {
    const metrics = page.locator("#winds .latest-wind-cell");
    await expect(metrics.nth(0).locator(".latest-value")).toHaveText(
        /^6\s*m\/s$/,
    );
    await expect(metrics.nth(0).locator(".hourly-range")).toHaveText("4–6 m/s");
    await expect(metrics.nth(1).locator(".latest-value")).toHaveText(
        /^4\s*m\/s$/,
    );
    await expect(metrics.nth(1).locator(".hourly-range")).toHaveText("3–4 m/s");
    await expect(metrics.nth(2).locator(".direction-value")).toHaveText("194°");
    await expect(metrics.nth(2).locator(".hourly-range")).toHaveText(
        "193–201°",
    );
    await expect(page.getByLabel("METAR", { exact: true })).toHaveText(
        "METAR EFJY 040720Z AUTO 19007KT 160V220 9999 -SHRA OVC005 //////CB 11/11 Q1014=",
    );
});

test("ground wind omits hourly ranges when rounded endpoints are equal", async ({
    page,
}) => {
    const params = new URLSearchParams(developerPath.split("?")[1]);
    params.set("DEV_ground_obs", "7.1,5.1,194,5;7.4,5.4,194,15");
    await page.goto(`/dz/?${params}`);

    const metrics = page.locator("#winds .latest-wind-cell");
    await expect(metrics.nth(0).locator(".latest-value")).toHaveText(
        /^7\s*m\/s$/,
    );
    await expect(metrics.nth(1).locator(".latest-value")).toHaveText(
        /^5\s*m\/s$/,
    );
    await expect(metrics.nth(2).locator(".direction-value")).toHaveText("194°");
    await expect(metrics.locator(".hourly-range")).toHaveCount(0);
});

test("coordinate-only dropzone uses Open-Meteo without an observations card or METAR error", async ({
    page,
}) => {
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    const requestPromise = page.waitForRequest("https://api.open-meteo.com/**");
    await page.goto("/dz/?name=World+DZ&lat=40.7&lon=-74");
    const request = await requestPromise;
    const fields = new URL(request.url()).searchParams.get("hourly").split(",");
    for (const level of ["1000", "925", "850", "700", "600"]) {
        expect(fields).toContain(`cloud_cover_${level}hPa`);
        expect(fields).toContain(`geopotential_height_${level}hPa`);
    }
    const clouds = page.locator("#clouds");
    await expect(clouds.getByRole("tablist")).toHaveCount(0);
    await expect(clouds.locator(".cloud-profile-layer")).toHaveCount(5);
    await expect(clouds.locator(".cloud-profile-layer").first()).toContainText(
        "4200 m",
    );
    await expect(clouds.locator(".cloud-profile-layer").first()).toContainText(
        "40 %",
    );

    await expect(page.locator("#winds .source-note")).toHaveText(
        "Lähde: Open-Meteo (mallinnettu)",
    );
    await expect(page.locator("#forecasts-graph .source-note")).toHaveText(
        "Lähde: Open-Meteo",
    );
    await expect(page.locator("#observations-graph")).toHaveCount(0);
    await expect(
        page.locator("#compass .compass-observations-gust"),
    ).toHaveText("9 m/s");
    await expect(page.locator("#errors")).toHaveCount(0);
});

test("Open-Meteo m/s winds keep their strength in the table and jump-run calculations", async ({
    page,
}) => {
    const response = openMeteoResponse();
    for (const level of ["600", "700", "850", "925", "1000"]) {
        response.hourly[`windspeed_${level}hPa`] = response.hourly.time.map(
            () => 10,
        );
        response.hourly[`winddirection_${level}hPa`] = response.hourly.time.map(
            () => 270,
        );
    }
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: response }),
    );
    const requestPromise = page.waitForRequest("https://api.open-meteo.com/**");
    await page.goto("/dz/?name=Wind+DZ&lat=40.7&lon=-74");
    const request = await requestPromise;
    expect(new URL(request.url()).searchParams.get("wind_speed_unit")).toBe(
        "ms",
    );
    await expect(
        page
            .locator("#dropzone-map")
            .getByRole("button", { name: /^≈ 4200 m/ }),
    ).toContainText("10 m/s 270°");
    await expect(
        page.locator(".upperwinds-compact .wind-speed").first(),
    ).toHaveText("10 m/s");
    const result = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getFreefallDrift, getJumpRunVelocity } =
            await import("#app/map/freefall.js");
        const winds = getMapWindData().freefallWinds;
        const velocity = getJumpRunVelocity(winds, {
            exitHeight: 4000,
            direction: 0,
            speedKmh: 120,
            separationSeconds: 5,
        });
        return {
            speeds: winds.map((wind) => wind.speed),
            windOnly: getFreefallDrift(winds).at(-1),
            velocity,
            jump: getFreefallDrift(winds, 4000, 180, 800, velocity.air).at(-1),
        };
    });
    expect(result.speeds).toEqual([10, 10, 10, 10]);
    // 3200 m / 50 m/s = 64 s of wind drift at 10 m/s.
    expect(result.windOnly.east).toBeCloseTo(640);
    expect(result.windOnly.north).toBeCloseTo(0);
    expect(result.velocity.air.east).toBeCloseTo(-10);
    expect(result.velocity.ground.north).toBeCloseTo(
        Math.sqrt((120 / 3.6) ** 2 - 10 ** 2),
    );
    // The exit takes time to accelerate downwind, but it must not use 10/3.6 m/s.
    expect(result.jump.east).toBeGreaterThan(600);
    expect(result.jump.east).toBeLessThan(640);
});

test("Open-Meteo refreshes cached winds with incompatible units", async ({
    page,
}) => {
    const cached = openMeteoResponse();
    for (const level of ["600", "700", "850", "925", "1000"])
        cached.hourly_units[`windspeed_${level}hPa`] = "km/h";
    await page.addInitScript((cached) => {
        localStorage.setItem("ECMWFWindAloft", JSON.stringify(cached));
        localStorage.setItem("ECMWFWindAloftTime", String(Date.now()));
        localStorage.setItem("ECMWFWindAloftCoordinates", "40.7,-74");
    }, cached);
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    const requestPromise = page.waitForRequest("https://api.open-meteo.com/**");
    await page.goto("/dz/?name=Wind+DZ&lat=40.7&lon=-74");
    await requestPromise;
    await expect(
        page
            .locator("#dropzone-map")
            .getByRole("button", { name: /^≈ 4200 m/ }),
    ).toContainText("12 m/s 200°");
    const units = await page.evaluate(
        () => JSON.parse(localStorage.getItem("ECMWFWindAloft")).hourly_units,
    );
    expect(units.windspeed_600hPa).toBe("m/s");
});

test("METAR supplies the compass when no station source is configured", async ({
    page,
}) => {
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    const params = new URLSearchParams({
        name: "METAR DZ",
        lat: "40.7",
        lon: "-74",
        icaocode: "KJFK",
        DEV_metar: "METAR KJFK 041200Z 18010G15KT 9999 FEW020 10/05 Q1014=",
    });
    await page.goto(`/dz/?${params}`);

    await expect(page.locator("#winds .source-note")).toHaveText(
        "Lähde: METAR",
    );
    await expect(page.locator("#observations-graph")).toHaveCount(0);
});

test("METAR average wind supplies the compass when gust is unavailable", async ({
    page,
}) => {
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    const params = new URLSearchParams({
        fmisid: "missing",
        icaocode: "EFLA",
        lat: "61.146406",
        lon: "25.693366",
        DEV_metar:
            "METAR EFLA 041150Z AUTO 22005KT 200V260 9999 -RA SCT007/// BKN009/// OVC014/// 12/11 Q1014 RERA=",
    });
    await page.goto(`/dz/?${params}`);

    await expect(page.locator("#winds .source-note")).toHaveText(
        "Lähde: METAR",
    );
    const gust = page.locator("#winds .latest-gust");
    await expect(gust).toHaveText(/^-\s*m\/s$/);
    await expect(
        page.locator("#winds .latest-gust + .hourly-range"),
    ).toHaveCount(0);
    await expect(page.locator("#winds .latest-wind").first()).toHaveText(
        /^3\s*m\/s$/,
    );
    await expect(
        page.locator("#compass .compass-observations-gust"),
    ).toHaveText("- m/s");
});

for (const stationParam of ["fmisid", "roadsid"]) {
    test(`METAR supplies the compass when ${stationParam} has no observations`, async ({
        page,
    }) => {
        await page.route("https://api.open-meteo.com/**", (route) =>
            route.fulfill({ json: openMeteoResponse() }),
        );
        const params = new URLSearchParams({
            name: "METAR fallback DZ",
            lat: "40.7",
            lon: "-74",
            icaocode: "KJFK",
            [stationParam]: "missing",
            DEV_metar: "METAR KJFK 041200Z 18010G15KT 9999 FEW020 10/05 Q1014=",
        });
        await page.goto(`/dz/?${params}`);

        await expect(page.locator("#winds .source-note")).toHaveText(
            "Lähde: METAR",
        );
    });
}

test("FMI takes priority over a configured Fintraffic station and supplies coordinates", async ({
    page,
}) => {
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    let roadRequests = 0;
    page.on("request", (request) => {
        if (request.url().startsWith("https://tie.digitraffic.fi/"))
            roadRequests++;
    });
    await page.goto("/dz/?fmisid=137208&roadsid=5004&DEV_mock=1");

    await expect(page.locator("#winds .source-note")).toHaveText("Lähde: FMI");
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { FORECAST_COORDINATES } =
                    await import("#app/weather/state.js");
                return FORECAST_COORDINATES.value;
            }),
        )
        .not.toBeNull();
    expect(roadRequests).toBe(0);
});

test("FMI map callout requires separate landing zone coordinates", async ({
    page,
}) => {
    await page.goto("/dz/?fmisid=137208&lat=62.4&lon=25.6&DEV_mock=1");
    const callout = page.locator("#dropzone-map .weather-station-callout");
    await expect(callout).toHaveText("FMI sääasema");
    const locations = await page.evaluate(async () => {
        const { FORECAST_COORDINATES, STATION_COORDINATES } =
            await import("#app/weather/state.js");
        return {
            landing: FORECAST_COORDINATES.value,
            station: STATION_COORDINATES.value,
        };
    });
    expect(locations.landing).toBe("62.4,25.6");
    expect(locations.station).not.toBe(locations.landing);

    await page.goto("/dz/?fmisid=137208&DEV_mock=1");
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { FORECAST_COORDINATES, STATION_COORDINATES } =
                    await import("#app/weather/state.js");
                return (
                    FORECAST_COORDINATES.value !== null &&
                    FORECAST_COORDINATES.value === STATION_COORDINATES.value
                );
            }),
        )
        .toBe(true);
    await expect(page.locator("#dropzone-map .leaflet-container")).toHaveCount(
        1,
    );
    await expect(callout).toHaveCount(0);
});

test("Fintraffic station supplies observations and fallback coordinates", async ({
    page,
}) => {
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    await page.route("https://tie.digitraffic.fi/**", (route) => {
        const url = new URL(route.request().url());
        const now = new Date().toISOString();
        if (url.pathname.endsWith("/data/history")) {
            return route.fulfill({
                json: { id: "5004", dataUpdatedTime: now, values: [] },
            });
        }
        if (url.pathname.endsWith("/data")) {
            const sensor = (id, name, value) => ({
                id,
                stationId: 5004,
                name,
                shortName: name,
                measuredTime: now,
                value,
                unit: "",
            });
            return route.fulfill({
                json: {
                    id: 5004,
                    dataUpdatedTime: now,
                    sensorValues: [
                        sensor(1, "MAKSIMITUULI", 8),
                        sensor(2, "KESKITUULI", 5),
                        sensor(3, "TUULENSUUNTA", 190),
                        sensor(4, "ILMA", 10),
                        sensor(5, "KASTEPISTE", 5),
                    ],
                },
            });
        }
        return route.fulfill({
            json: {
                type: "Feature",
                id: 5004,
                geometry: {
                    type: "Point",
                    coordinates: [24.9, 60.2, 0],
                },
                properties: {
                    names: { fi: "Tieasema", sv: "", en: "" },
                },
            },
        });
    });
    await page.goto("/dz/?roadsid=5004");

    await expect(page.locator("#winds .source-note")).toHaveText(
        "Lähde: Fintraffic",
    );
    await expect(page.locator("#title .title-name")).toHaveText("Tieasema");
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { FORECAST_COORDINATES } =
                    await import("#app/weather/state.js");
                return FORECAST_COORDINATES.value;
            }),
        )
        .toBe("60.2,24.9");
    const callout = page.locator("#dropzone-map .weather-station-callout");
    await expect(callout).toHaveCount(0);

    await page.goto("/dz/?roadsid=5004&lat=60.21&lon=24.91");
    await expect(callout).toHaveText("Fintraffic sääasema");
    const locations = await page.evaluate(async () => {
        const { FORECAST_COORDINATES, STATION_COORDINATES } =
            await import("#app/weather/state.js");
        return {
            landing: FORECAST_COORDINATES.value,
            station: STATION_COORDINATES.value,
        };
    });
    expect(locations).toEqual({ landing: "60.21,24.91", station: "60.2,24.9" });
});

test("METAR cloud layers show coverage, heights and conversion help", async ({
    page,
}) => {
    const metar =
        "METAR EFJY 041200Z 19007KT 9999 FEW005 SCT015 BKN030CB OVC060 11/08 Q1014=";
    const params = new URLSearchParams(developerPath.split("?")[1]);
    params.set("DEV_metar", metar);
    await page.goto(`/dz/?${params}`);

    const card = page.locator("#clouds");
    const layers = card.locator(".cloud-layer");
    await expect(layers).toHaveCount(4);
    await expect(layers.locator(".cloud-layer-name")).toHaveText([
        "Täysi pilvikatto",
        "Rakoileva",
        "Hajanaisia",
        "Muutamia",
    ]);
    await expect(layers.locator(".cloud-layer-base b")).toHaveText([
        "≈ 1850 m",
        "≈ 900 m",
        "≈ 450 m",
        "≈ 150 m",
    ]);
    await expect(layers.locator(".cloud-layer-coverage")).toHaveText([
        "8/8 taivaasta",
        "5–7/8 taivaasta",
        "3–4/8 taivaasta",
        "1–2/8 taivaasta",
    ]);

    const conversions = [
        { metar: "OVC060", conversion: "6000 ft = 1828,8 m" },
        { metar: "BKN030CB", conversion: "3000 ft = 914,4 m" },
        { metar: "SCT015", conversion: "1500 ft = 457,2 m" },
        { metar: "FEW005", conversion: "500 ft = 152,4 m" },
    ];
    for (const [index, expected] of conversions.entries()) {
        const layer = layers.nth(index);
        await layer.getByRole("button", { name: "Ohje", exact: true }).click();
        const help = layer.getByRole("dialog");
        await expect(help).toBeVisible();
        await expect(help.locator(".metar")).toHaveText(expected.metar);
        await expect(help.locator(".cloud-base-conversion")).toHaveText(
            expected.conversion,
        );
        if (expected.metar.endsWith("CB")) {
            await expect(help).toContainText("CB tarkoittaa cumulonimbusta", {
                useInnerText: true,
            });
            await expect(help).toContainText(
                "äkillisiä muutoksia tuulen nopeudessa ja suunnassa",
                { useInnerText: true },
            );
        }
        await help.getByRole("button", { name: "Sulje", exact: true }).click();
    }

    await expect(card.locator(".cloud-warning")).toHaveCount(0);
    await expect(
        layers.getByRole("img", { name: "Ukkospilviä", exact: true }),
    ).toHaveCount(1);
    await expect(
        layers.nth(1).getByRole("img", { name: "Ukkospilviä", exact: true }),
    ).toBeVisible();
    await card.locator(".cloud-metar-details summary").click();
    const report = card.getByLabel("METAR", { exact: true });
    await expect(report).toBeVisible();
    await expect(report).toHaveText(metar);
});

test("METAR cloud layers render when cloud types are unavailable", async ({
    page,
}) => {
    const metar =
        "METAR EFLA 041150Z AUTO 22005KT 200V260 9999 -RA SCT007/// BKN009/// OVC014/// 12/11 Q1014 RERA=";
    const params = new URLSearchParams(developerPath.split("?")[1]);
    params.set("DEV_metar", metar);
    await page.goto(`/dz/?${params}`);

    const layers = page.locator("#clouds .cloud-layer");
    await expect(layers).toHaveCount(3);
    await expect(layers.locator(".cloud-layer-name")).toHaveText([
        "Täysi pilvikatto",
        "Rakoileva",
        "Hajanaisia",
    ]);
    await expect(layers.locator(".cloud-layer-base b")).toHaveText([
        "≈ 450 m",
        "≈ 250 m",
        "≈ 200 m",
    ]);
});

test("unlocated thunderclouds show a separate warning with wind-change help", async ({
    page,
}) => {
    const card = page.locator("#clouds");
    await expect(card.locator(".cloud-layer")).toHaveCount(1);
    await expect(card.locator(".cloud-layer .cloud-lightning")).toHaveCount(0);
    const warning = card.locator(".cloud-warning");
    await expect(warning).toBeVisible();
    await expect(warning.locator("span")).toHaveText("Ukkospilviä");
    await warning.getByRole("button", { name: "Ukkospilvien ohje" }).click();
    const help = warning.getByRole("dialog");
    await expect(help).toBeVisible();
    await expect(help).toContainText(
        "äkillisiä muutoksia tuulen nopeudessa ja suunnassa",
        { useInnerText: true },
    );
    await expect(help).toContainText(
        "Havainto ei kerro ukkospilvien peittävyyttä tai korkeutta.",
        { useInnerText: true },
    );
    await expect(help.locator(".metar")).toHaveText("//////CB");
});

const thundercloudCases = [
    {
        name: "few CB",
        groups: "FEW005CB",
        layers: ["FEW005CB"],
        thunder: ["FEW005CB"],
        separate: false,
    },
    {
        name: "scattered CB",
        groups: "SCT015CB",
        layers: ["SCT015CB"],
        thunder: ["SCT015CB"],
        separate: false,
    },
    {
        name: "broken CB",
        groups: "BKN030CB",
        layers: ["BKN030CB"],
        thunder: ["BKN030CB"],
        separate: false,
    },
    {
        name: "overcast CB",
        groups: "OVC060CB",
        layers: ["OVC060CB"],
        thunder: ["OVC060CB"],
        separate: false,
    },
    {
        name: "multiple CB layers",
        groups: "FEW005CB SCT015CB BKN030CB OVC060CB",
        layers: ["OVC060CB", "BKN030CB", "SCT015CB", "FEW005CB"],
        thunder: ["OVC060CB", "BKN030CB", "SCT015CB", "FEW005CB"],
        separate: false,
    },
    {
        name: "ordinary clouds",
        groups: "FEW005 SCT015 BKN030 OVC060",
        layers: ["OVC060", "BKN030", "SCT015", "FEW005"],
        thunder: [],
        separate: false,
    },
    {
        name: "towering cumulus",
        groups: "SCT015TCU",
        layers: ["SCT015TCU"],
        thunder: [],
        separate: false,
    },
    {
        name: "unlocated CB without other layers",
        groups: "//////CB",
        layers: [],
        thunder: [],
        separate: true,
    },
    {
        name: "located and unlocated CB together",
        groups: "FEW005CB SCT015 //////CB",
        layers: ["SCT015", "FEW005CB"],
        thunder: ["FEW005CB"],
        separate: true,
    },
    {
        name: "CB with unknown base",
        groups: "BKN///CB",
        layers: ["BKN///CB"],
        thunder: ["BKN///CB"],
        separate: false,
    },
];

for (const scenario of thundercloudCases) {
    test(`thundercloud variation: ${scenario.name}`, async ({ page }) => {
        const params = new URLSearchParams(developerPath.split("?")[1]);
        params.set(
            "DEV_metar",
            `METAR EFJY 041200Z AUTO 19007KT 9999 ${scenario.groups} 11/08 Q1014=`,
        );
        await page.goto(`/dz/?${params}`);
        // Wait for the new report even in cases where zero layers are expected.
        await expect(page.getByLabel("METAR", { exact: true })).toHaveText(
            params.get("DEV_metar"),
        );

        const card = page.locator("#clouds");
        const layers = card.locator(".cloud-layer");
        await expect(layers).toHaveCount(scenario.layers.length);
        await expect(
            layers.getByRole("img", { name: "Ukkospilviä", exact: true }),
        ).toHaveCount(scenario.thunder.length);
        await expect(card.locator(".cloud-warning")).toHaveCount(
            scenario.separate ? 1 : 0,
        );
        if (scenario.separate)
            await expect(card.locator(".cloud-warning")).toBeVisible();

        for (const [index, code] of scenario.layers.entries()) {
            const layer = layers.nth(index);
            const isThundercloud = scenario.thunder.includes(code);
            const lightning = layer.getByRole("img", {
                name: "Ukkospilviä",
                exact: true,
            });
            if (isThundercloud) await expect(lightning).toBeVisible();
            else await expect(lightning).toHaveCount(0);
            await layer
                .getByRole("button", { name: "Ohje", exact: true })
                .click();
            const help = layer.getByRole("dialog");
            await expect(help.locator(".metar")).toHaveText(code);
            if (isThundercloud) {
                await expect(help).toContainText(
                    "äkillisiä muutoksia tuulen nopeudessa ja suunnassa",
                    { useInnerText: true },
                );
            } else {
                await expect(help).not.toContainText(
                    "CB tarkoittaa cumulonimbusta",
                    { useInnerText: true },
                );
            }
            if (code === "BKN///CB") {
                await expect(layer.locator(".cloud-layer-base b")).toHaveCount(
                    0,
                );
                await expect(
                    help.locator(".cloud-base-conversion"),
                ).toHaveCount(0);
            }
            await help
                .getByRole("button", { name: "Sulje", exact: true })
                .click();
        }
    });
}

test("obscured sky METAR shows vertical visibility and conversion help", async ({
    page,
}) => {
    const params = new URLSearchParams(developerPath.split("?")[1]);
    params.set(
        "DEV_metar",
        "METAR EFJY 041200Z 00000KT 0200 FG VV002 08/08 Q1014=",
    );
    await page.goto(`/dz/?${params}`);

    const layer = page.locator("#clouds .cloud-layer");
    await expect(layer).toHaveCount(1);
    await expect(layer.locator(".cloud-layer-name")).toHaveText(
        "SUMUA PERKELE",
    );
    await expect(layer.locator(".cloud-layer-coverage")).toHaveText(
        "Taivas peittynyt",
    );
    await expect(layer.locator(".cloud-layer-base b")).toHaveText("≈ 50 m");
    await expect(layer.locator(".cloud-base-label")).toHaveText(
        "Pystynäkyvyys",
    );
    await layer.getByRole("button", { name: "Ohje", exact: true }).click();
    const help = layer.getByRole("dialog");
    await expect(help).toBeVisible();
    await expect(help.locator(".metar")).toHaveText("VV002");
    await expect(help.locator(".cloud-base-conversion")).toHaveText(
        "200 ft = 60,96 m",
    );
});

test("developer banner opens the editor and applies METAR changes", async ({
    page,
}) => {
    const banner = page.locator(".developer-banner");
    const edit = banner.getByRole("button", { name: "Muokkaa", exact: true });
    await expect(edit).toHaveAttribute("aria-controls", "developer-mode");
    await edit.click();

    const editor = page.getByRole("dialog", {
        name: "Kehittäjätila",
        exact: true,
    });
    await expect(editor).toBeVisible();
    const metarInput = editor.getByRole("textbox", { name: "METAR-teksti" });
    const query = editor.getByRole("region", { name: "Kyselymerkkijono" });
    await expect(query).toContainText('"fmisid": "137208"');
    await expect(query).toContainText('"DEV_map_speed": "12.5625"');
    await expect(metarInput).toHaveValue(
        new URL(page.url()).searchParams.get("DEV_metar"),
    );
    const metar =
        "METAR EFJY 041200Z 19007KT 9999 FEW005 SCT015 BKN030CB OVC060 11/08 Q1014=";
    await metarInput.fill(metar);
    await expect(query).toContainText(metar);
    await expect(page).toHaveURL(
        (url) => url.searchParams.get("DEV_metar") === metar,
    );
    await expect(page.locator("#clouds .cloud-layer-base b")).toHaveText([
        "≈ 1850 m",
        "≈ 900 m",
        "≈ 450 m",
        "≈ 150 m",
    ]);
    await editor.getByRole("button", { name: "Sulje", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await expect(edit).toBeFocused();

    await page.getByRole("button", { name: "Valikko", exact: true }).click();
    await page
        .locator(".side-menu")
        .getByRole("button", { name: "Kehittäjätila", exact: true })
        .click();
    await expect(editor).toBeVisible();
    await expect(metarInput).toHaveValue(metar);
    await expect(page.locator("#developer-mode")).toHaveCount(1);
});

test("map toolbar expands only the map in both modes and restores", async ({
    page,
}) => {
    const card = page.locator("#dropzone-map");
    const heading = card.getByRole("heading", { name: "Tuulikartta" });
    const help = card.getByRole("button", { name: "Ohje", exact: true });
    const expand = card.getByRole("button", {
        name: "Laajenna Tuulikartta koko ikkunaan",
    });
    await expect(heading).toBeVisible();
    await expect(help).toBeVisible();
    await expand.click();
    const frame = card.locator(".map-frame");
    await expect(frame).toHaveClass(/full-window/);
    await expect(frame).toHaveCSS("position", "fixed");
    await expect(frame.locator(".freefall-toolbar .window-toggle")).toHaveCount(
        1,
    );
    await expect(
        frame.locator(":scope > h2, .wind-profile, .flight-details"),
    ).toHaveCount(0);
    const bounds = await frame.boundingBox();
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(page.viewportSize().width);
    expect(bounds.height).toBe(page.viewportSize().height);
    const restore = card.getByRole("button", { name: "Palauta Tuulikartta" });
    await expect(restore).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator(".wind-level-button").first()).toBeVisible();
    await restore.click();
    await expect(heading).toBeVisible();
    await expect(help).toBeVisible();
    await expand.click();
    await expect(frame).toHaveClass(/full-window/);
    await page.keyboard.press("Escape");
    await expect(expand).toHaveAttribute("aria-pressed", "false");
    await expect(heading).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("map help separates instructions and explains forecast limitations", async ({
    page,
}) => {
    const card = page.locator("#dropzone-map");
    await card.getByRole("button", { name: "Ohje", exact: true }).click();

    const help = card.getByRole("dialog");
    await expect(help).toBeVisible();
    await expect(
        help.getByRole("heading", {
            name: "Tuulitiedot ja niiden rajoitukset",
        }),
    ).toBeVisible();
    await expect(
        help.getByRole("heading", { name: "Kartan käyttäminen" }),
    ).toBeVisible();
    await expect(
        help.getByRole("heading", { name: "Hyppylinja" }),
    ).toBeVisible();
    await expect(help).toContainText("ajautumisnuoli");
    await expect(help).toContainText(
        "eivät ole hyppypaikalla mitattuja arvoja",
    );
    await expect(help).toContainText("säämallin tuntiennusteita");
    await expect(help).toContainText(
        "todellinen tuuli voi poiketa ennusteesta",
    );
    await expect(help).toContainText("äläkä tee operatiivisia päätöksiä");
});

for (const settingDirection of [false, true]) {
    test(`map recreates safely when forecast coordinates change ${settingDirection ? "during direction setting" : "while idle"}`, async ({
        page,
    }) => {
        await setUniformFreefallWind(page);
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const map = page.locator(".dz-map");
        await expect(
            map.getByRole("button", { name: "Zoom in" }),
        ).toBeVisible();

        const directionButton = page.getByRole("button", {
            name: "Kierrä hyppylinjaa vapaasti vetämällä",
        });
        if (settingDirection) {
            await map.click({ position: { x: 100, y: 160 } });
            await page
                .getByRole("button", { name: "Pudota hyppääjät tähän" })
                .click();
            await expect(map.locator(".jump-run-jumper").first()).toBeVisible();
            await directionButton.click();
            await expect(directionButton).toHaveAttribute(
                "aria-pressed",
                "true",
            );
            await expect(
                map.getByRole("button", { name: "Zoom in" }),
            ).toHaveAttribute("aria-disabled", "true");
        }

        await page.evaluate(async () => {
            const { FORECAST_COORDINATES } =
                await import("#app/weather/state.js");
            FORECAST_COORDINATES.value = "62.5,25.7";
            await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
        });

        await expect(
            map.getByRole("button", { name: "Zoom in" }),
        ).toBeVisible();
        await expect(directionButton).toHaveAttribute("aria-pressed", "false");
        await expect(
            map.getByRole("button", { name: "Zoom in" }),
        ).toHaveAttribute("aria-disabled", "false");
        await map.getByRole("button", { name: "Zoom in" }).click();
        await expect
            .poll(() => new URL(page.url()).searchParams.get("map_zoom"))
            .toBe("15");
        expect(errors).toEqual([]);
    });
}

test("map wind profile shows the developer average and ground wind", async ({
    page,
}) => {
    const profile = page.locator("#dropzone-map .wind-level");
    const average = profile.filter({
        has: page.getByText("≈ 4200-800 m", { exact: true }),
    });
    const ground = profile.filter({
        has: page.getByText("Maanpinta", { exact: true }),
    });
    await expect(average).toContainText("13 m/s 246°");
    await expect(ground).toContainText("4 m/s 194°");
    // Individual altitude forecasts are live data, with no DEV_ override.
});

test("upper-wind forecast help explains how forecast readings are received", async ({
    page,
}) => {
    const section = page.locator("#high-winds-today");
    await section.getByRole("button", { name: "Ohje", exact: true }).click();

    const help = section.getByRole("dialog");
    await expect(help).toBeVisible();
    await expect(help).toContainText(
        "Nämä ovat ennusteita, eivät mittaushavaintoja",
    );
    await expect(help).toContainText("Open-Meteon rajapinnasta");
    await expect(help).toContainText("painepinnoilta");
    await expect(help).toContainText("kolmen tunnin jaksot");
    await expect(help).toContainText("selaimen välimuistissa");
});

test("wind level selection supports clicks, keyboard and forecast refreshes", async ({
    page,
}) => {
    const profile = page.locator("#dropzone-map");
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const [index, level] of [
            "600",
            "700",
            "850",
            "925",
            "1000",
        ].entries()) {
            hourly[`windspeed_${level}hPa`] = [index + 1];
            hourly[`winddirection_${level}hPa`] = [index * 90];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });

    const average = profile.getByRole("button", { name: /^≈ 4200-800 m/ });
    await expect(average).toHaveAttribute("aria-pressed", "true");
    for (const label of [
        "≈ 4200 m",
        "≈ 3000 m",
        "≈ 1500 m",
        "≈ 800 m",
        "≈ 110 m",
        "Maanpinta",
        "≈ 4200-800 m",
    ]) {
        const button = profile.getByRole("button", {
            name: new RegExp(`^${label}`),
        });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(
            profile.locator('.wind-level-button[aria-pressed="true"]'),
        ).toHaveCount(1);
    }
    const altitude = profile.getByRole("button", { name: /^≈ 4200 m/ });
    await altitude.focus();
    await page.keyboard.press("Enter");
    await expect(altitude).toHaveAttribute("aria-pressed", "true");
    // A forecast refresh updates the selected level instead of resetting it.
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = null;
    });
    await expect(altitude).toContainText("Ei tietoa");
    await expect(altitude).toHaveAttribute("aria-pressed", "true");
});

test("freefall drift integrates altitude winds from 4000 to 800 metres", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { getFreefallDrift } = await import("#app/map/freefall.js");
        const winds = [4200, 3000, 1500, 800].map((height) => ({
            height,
            label: "",
            speed: 10,
            direction: 0,
        }));
        const north = getFreefallDrift(winds);
        const east = getFreefallDrift(
            winds.map((wind) => ({ ...wind, direction: 90 })),
        );
        const shear = getFreefallDrift(
            winds.map((wind) => ({ ...wind, speed: wind.height / 100 })),
        );
        const wrap = getFreefallDrift(
            winds.map((wind, index) => ({
                ...wind,
                direction: index % 2 ? 359 : 1,
            })),
        );
        return {
            custom: getFreefallDrift(winds, 3555, 240, 1200).at(-1),
            customShear: getFreefallDrift(
                winds.map((wind) => ({ ...wind, speed: wind.height / 100 })),
                3555,
                240,
                1200,
            ).at(-1),
            invalid: getFreefallDrift(winds, 800, 180, 1000),
            start: north[0],
            end: north.at(-1),
            east: east.at(-1),
            shear: shear.at(-1),
            wrap: wrap.at(-1),
            calm: getFreefallDrift(
                winds.map((wind) => ({ ...wind, speed: 0 })),
            ).at(-1),
            missing: getFreefallDrift(
                winds.map((wind, index) => ({
                    ...wind,
                    speed: index === 3 ? null : 10,
                })),
            ),
        };
    });
    expect(result.start).toEqual({ height: 4000, east: 0, north: 0 });
    expect(result.end.height).toBe(800);
    expect(result.end.north).toBeCloseTo(-640);
    expect(result.end.east).toBeCloseTo(0);
    expect(result.east.east).toBeCloseTo(-640);
    expect(result.east.north).toBeCloseTo(0);
    expect(result.shear.north).toBeCloseTo(-1536);
    expect(result.wrap.north).toBeLessThan(-639);
    expect(result.calm).toEqual({ height: 800, east: 0, north: 0 });
    expect(result.missing).toBeNull();
    expect(result.custom.height).toBe(1200);
    expect(result.custom.north).toBeCloseTo(-353.25);
    expect(result.customShear.north).toBeCloseTo(
        -(3555 ** 2 - 1200 ** 2) / (200 * (240 / 3.6)),
    );
    expect(result.invalid).toBeNull();
});

test("jump run converts true airspeed using interpolated exit wind and ground track", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { getJumpRunVelocity, getWindAtHeight } =
            await import("#app/map/freefall.js");
        const { jumpRunCoordinates } = await import("#app/map/freefall.js");
        const { latLng } = await import("leaflet");
        const winds = [4200, 3000, 1500, 800].map((height) => ({
            height,
            label: "",
            speed: 10,
            direction: 0,
        }));
        const settings = {
            exitHeight: 4000,
            direction: 0,
            speedKmh: 120,
            separationSeconds: 5,
        };
        const start = latLng(62.4, 25.6);
        const cases = [0, 180, 90].map((direction) => {
            const run = { ...settings, direction };
            const velocity = getJumpRunVelocity(winds, run);
            return {
                ...velocity,
                distance: start.distanceTo(
                    latLng(jumpRunCoordinates(start, run, 1, velocity.ground)),
                ),
            };
        });
        const shear = winds.map((wind, index) => ({
            ...wind,
            speed: index === 0 ? 20 : 8,
        }));
        const wrap = winds.map((wind, index) => ({
            ...wind,
            direction: index === 0 ? 350 : 10,
        }));
        const missing = winds.map((wind, index) => ({
            ...wind,
            speed: index === 0 ? null : 10,
        }));
        return {
            cases,
            shear: getJumpRunVelocity(shear, settings),
            wrap: getWindAtHeight(wrap, 3600),
            exact: getWindAtHeight(missing, 3000),
            missing: getJumpRunVelocity(missing, settings),
            outside: getJumpRunVelocity(winds, {
                ...settings,
                exitHeight: 5000,
            }),
            crosswindTooStrong: getJumpRunVelocity(winds, {
                ...settings,
                direction: 90,
                speedKmh: 18,
            }),
            headwindTooStrong: getJumpRunVelocity(winds, {
                ...settings,
                speedKmh: 18,
            }),
        };
    });
    expect(result.cases[0].distance).toBeCloseTo((120 / 3.6 - 10) * 5);
    expect(result.cases[1].distance).toBeCloseTo((120 / 3.6 + 10) * 5);
    expect(result.cases[2].distance).toBeCloseTo(
        Math.sqrt((120 / 3.6) ** 2 - 100) * 5,
    );
    expect(result.cases[2].ground.north).toBeCloseTo(0);
    expect(result.cases[2].air.north).toBeCloseTo(10);
    for (const velocity of result.cases)
        expect(Math.hypot(velocity.air.east, velocity.air.north)).toBeCloseTo(
            120 / 3.6,
        );
    expect(result.shear.ground.north).toBeCloseTo(120 / 3.6 - 18);
    expect(result.wrap.east).toBeCloseTo(0);
    expect(result.wrap.north).toBeCloseTo(-10 * Math.cos((10 * Math.PI) / 180));
    expect(result.exact.north).toBeCloseTo(-10);
    expect(result.missing).toBeNull();
    expect(result.outside).toBeNull();
    expect(result.crosswindTooStrong).toBeNull();
    expect(result.headwindTooStrong).toBeNull();
});

test("jump-run forward throw decays with drag without counting exit wind twice", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { getJumpRunVelocity, getFreefallDrift } =
            await import("#app/map/freefall.js");
        const winds = [4200, 3000, 1500, 800].map((height) => ({
            height,
            label: "",
            speed: 10,
            direction: 0,
        }));
        const settings = {
            exitHeight: 4000,
            direction: 90,
            speedKmh: 120,
            separationSeconds: 5,
        };
        const velocity = getJumpRunVelocity(winds, settings);
        const path = getFreefallDrift(winds, 4000, 180, 800, velocity.air);
        const headwind = getJumpRunVelocity(winds, {
            ...settings,
            direction: 0,
        });
        const calm = winds.map((wind) => ({ ...wind, speed: 0 }));
        return {
            path,
            air: velocity.air,
            ground: velocity.ground,
            headwind: getFreefallDrift(winds, 4000, 180, 800, headwind.air).at(
                -1,
            ),
            calm: getFreefallDrift(calm, 4000, 180, 800, headwind.air).at(-1),
            windOnly: getFreefallDrift(winds).at(-1),
            short: getFreefallDrift(
                winds,
                4000,
                180,
                4000 - 0.5 * 9.80665 * 0.001 ** 2,
                velocity.air,
            ).at(-1),
            invalid: getFreefallDrift(winds, 4000, 180, 800, {
                east: NaN,
                north: 0,
            }),
        };
    });
    // Independently integrate coupled horizontal/vertical motion using Euler
    // steps, stopping at opening altitude instead of assuming terminal speed.
    let forwardSpeed = 120 / 3.6;
    let downSpeed = 0;
    let distance = 0;
    let height = 4000;
    let elapsed = 0;
    const step = 0.0001;
    while (height > 800) {
        const resistance =
            (9.80665 / 2500) * Math.hypot(forwardSpeed, downSpeed);
        const seconds = downSpeed
            ? Math.min(step, (height - 800) / downSpeed)
            : step;
        distance += forwardSpeed * seconds;
        height -= downSpeed * seconds;
        forwardSpeed -= resistance * forwardSpeed * seconds;
        downSpeed += (9.80665 - resistance * downSpeed) * seconds;
        elapsed += seconds;
    }
    const end = result.path.at(-1);
    expect(end.height).toBe(800);
    expect(end.east).toBeCloseTo((distance * result.air.east) / (120 / 3.6), 1);
    expect(end.north).toBeCloseTo(
        -10 * elapsed + (distance * result.air.north) / (120 / 3.6),
        1,
    );
    expect(result.headwind.north).toBeCloseTo(
        result.calm.north - 10 * elapsed,
        1,
    );
    expect(result.calm.north).toBeGreaterThan(170);
    expect(result.calm.north).toBeLessThan(230);
    expect(result.windOnly.north).toBeCloseTo(-640);
    expect(result.short.east / 0.001).toBeCloseTo(result.ground.east, 1);
    expect(result.short.north / 0.001).toBeCloseTo(result.ground.north, 1);
    // The first quarter-second retains most of the initial ground velocity and
    // falls only about 30 cm, rather than instantly descending at 50 m/s.
    expect(result.path[1].east).toBeGreaterThan(
        result.ground.east * 0.25 * 0.97,
    );
    expect(result.path[1].north).toBeLessThan(0);
    expect(result.path[1].north).toBeGreaterThan(-0.1);
    expect(4000 - result.path[1].height).toBeGreaterThan(0.25);
    expect(4000 - result.path[1].height).toBeLessThan(0.35);
    const offsets = result.path.map((point) => point.east);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    const increments = offsets
        .slice(1)
        .map((value, index) => value - offsets[index]);
    expect(increments[0]).toBeGreaterThan(increments.at(-1));
    expect(result.invalid).toBeNull();
});

test("jump exit retains forward speed and responds gradually to changing wind", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { getFreefallDrift } = await import("#app/map/freefall.js");
        const calm = [4200, 3000, 1500, 800].map((height) => ({
            height,
            label: "",
            speed: 0,
            direction: 0,
        }));
        const air = { east: 157 / 3.6, north: 0 };
        const full = getFreefallDrift(calm, 4000, 180, 800, air);
        const accelerated = full.at(-1);
        const shallow = getFreefallDrift(calm, 4000, 180, 3999, air);
        const shear = calm.map((wind) => ({
            ...wind,
            speed: wind.height <= 3000 ? 10 : 0,
            direction: 0,
        }));
        const sheared = getFreefallDrift(shear, 4000, 180, 800, air);
        const slower = getFreefallDrift(calm, 4000, 180, 800, {
            east: 120 / 3.6,
            north: 0,
        });
        const faster = getFreefallDrift(calm, 4000, 180, 800, {
            east: 193 / 3.6,
            north: 0,
        });
        return {
            accelerated,
            shallow: shallow.at(-1),
            sheared: sheared.at(-1),
            slower: slower.at(-1),
            faster: faster.at(-1),
            zeroAir: getFreefallDrift(calm, 4000, 180, 800, {
                east: 0,
                north: 0,
            }).at(-1),
            windOnlyShear: getFreefallDrift(shear).at(-1),
        };
    });
    // One metre of descent takes about 0.46 s from a level exit. At 157 km/h
    // most forward speed remains, giving approximately 19 metres of carry.
    expect(result.shallow.east).toBeGreaterThan(18);
    expect(result.shallow.east).toBeLessThan(21);
    expect(result.accelerated.east).toBeGreaterThan(210);
    expect(result.accelerated.north).toBe(0);
    expect(result.faster.east).toBeGreaterThan(result.accelerated.east);
    expect(result.accelerated.east).toBeGreaterThan(result.slower.east);
    expect(result.sheared.north).toBeLessThan(0);
    // Unlike instantaneous entrainment, finite drag delays the response to a
    // strengthening wind. Constant terminal speed remains the standalone model.
    expect(result.sheared.north).toBeGreaterThan(result.windOnlyShear.north);
    expect(result.zeroAir).toEqual({ height: 800, east: 0, north: 0 });
});

test("jump-run positions react to forecast changes and recover from missing or infeasible wind", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    const jumpers = page.locator(".jump-run-jumper");
    const arrows = page.locator(".freefall-drift-line");
    const unavailable = page.locator(".jump-run-unavailable");
    await expect(jumpers).toHaveCount(6);
    const second = await jumpers.nth(1).getAttribute("d");
    const start = new URL(page.url()).searchParams.get("map_run_start");
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        for (const level of ["600", "700", "850", "925"])
            data.hourly[`windspeed_${level}hPa`] = [20];
        OM_DATA.value = data;
    });
    await expect(jumpers.nth(1)).not.toHaveAttribute("d", second);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(start);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.windspeed_600hPa = [null];
        OM_DATA.value = data;
    });
    await expect(unavailable).toBeVisible();
    await expect(jumpers).toHaveCount(0);
    await expect(arrows).toHaveCount(0);
    await setUniformFreefallWind(page);
    await expect(jumpers).toHaveCount(6);
    await expect(unavailable).toHaveCount(0);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.windspeed_925hPa = [null];
        OM_DATA.value = data;
    });
    await expect(arrows).toHaveCount(0);
    await expect(page.locator(".freefall-drift-summary")).toBeVisible();
    await expect(jumpers).toHaveCount(6);
    await setUniformFreefallWind(page);
    await expect(arrows).toHaveCount(6);
    await expect(page.locator(".freefall-drift-summary")).toHaveCount(0);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await page
        .getByRole("dialog")
        .getByRole("spinbutton", { name: "Todellinen ilmanopeus (km/h)" })
        .fill("18");
    await page.keyboard.press("Escape");
    await expect(unavailable).toBeVisible();
    await expect(jumpers).toHaveCount(0);
    await map.click({ position: { x: 180, y: 200 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await page.waitForTimeout(400);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(start);
});

test.describe("upper wind forecast timezones", () => {
    test.use({ timezoneId: "Europe/Helsinki" });
    for (const offset of [0, 3 * 60 * 60]) {
        test(`upper wind views agree in Finland with forecast offset ${offset}`, async ({
            page,
        }) => {
            await page.clock.install({
                time: new Date("2026-07-04T08:30:00Z"),
            });
            await page.reload();
            await page.evaluate(async (offset) => {
                const { OM_DATA } = await import("#app/weather/state.js");
                const start = Date.parse("2026-07-04T00:00:00Z");
                const time = Array.from({ length: 48 }, (_, index) =>
                    new Date(start + index * 3600000 + offset * 1000)
                        .toISOString()
                        .slice(0, 16),
                );
                const hourly = { time };
                for (const level of ["600", "700", "850", "925", "1000"]) {
                    hourly[`windspeed_${level}hPa`] = time.map(
                        (_, index) => 11 + index,
                    );
                    hourly[`winddirection_${level}hPa`] = time.map(
                        (_, index) => 234 + index,
                    );
                }
                OM_DATA.value = { utc_offset_seconds: offset, hourly };
            }, offset);

            const altitude = page.locator("#dropzone-map .wind-level").filter({
                has: page.getByText("≈ 4200 m", { exact: true }),
            });
            await expect(altitude).toContainText("19 m/s 242°");
            const compact = page.locator(".upperwinds-compact");
            await expect(compact.locator("th.current-column")).toHaveText(
                "11:00",
            );
            const row = compact.locator("tbody tr").first();
            await expect(row.locator(".current-column .wind-speed")).toHaveText(
                "19 m/s",
            );
            // Local 12–15 is UTC 09–12, and tomorrow 00–03 starts at UTC 21.
            const headerTexts = await compact
                .locator("th.time-header")
                .allTextContents();
            await expect(
                row
                    .locator("td")
                    .nth(headerTexts.indexOf("12-15"))
                    .locator(".wind-speed"),
            ).toHaveText("21 m/s");
            await expect(
                row
                    .locator("td")
                    .nth(headerTexts.indexOf("00-03"))
                    .locator(".wind-speed"),
            ).toHaveText("33 m/s");

            await page
                .getByRole("button", { name: "Näytä tarkat tiedot" })
                .click();
            const raw = page.locator(".upperwinds-raw");
            await expect(raw.locator("th.current-column")).toHaveText("11:00");
            const current = raw
                .locator("tbody tr")
                .first()
                .locator(".current-column");
            await expect(current.locator(".wind-speed")).toHaveText("19 m/s");
            await expect(current.locator(".direction-degrees")).toHaveText(
                "242°",
            );
            await expect(raw.locator("th.time-header").first()).toHaveText(
                "8:00",
            );
        });
    }
});

test("upper wind forecast omits empty time columns and day headings", async ({
    page,
}) => {
    await page.clock.install({ time: new Date("2026-07-04T08:30:00Z") });
    await page.reload();
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const time = ["2026-07-04T12:00"];
        const hourly = { time };
        for (const level of ["600", "700", "850", "925", "1000"]) {
            hourly[`windspeed_${level}hPa`] = [3];
            hourly[`winddirection_${level}hPa`] = [225];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });

    const table = page.locator(".upperwinds-compact");
    await expect(table.locator(".wind-table-title")).toHaveText(["Tänään"]);
    await expect(table.locator(".wind-table-title")).toHaveAttribute(
        "colspan",
        "1",
    );
    await expect(table.locator("th.time-header")).toHaveText(["12-15"]);
    await expect(table.locator("tbody tr").first().locator("td")).toHaveCount(
        1,
    );
});

test("jump run redraws all jumpers and applies individual settings immediately", async ({
    page,
    isMobile,
}) => {
    await page.goto(`${developerPath}&default_jump_group_count=1`);
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    const summary = page.locator(".toolbar-summary");
    await expect(summary).toContainText(/Hyppylinja\s*\d+° · 157 km\/h/);
    const place = async (x = 100, y = 160) => {
        await map.scrollIntoViewIfNeeded();
        if (isMobile) await map.tap({ position: { x, y } });
        else await map.click({ position: { x, y } });
        await page
            .getByRole("button", { name: "Pudota hyppääjät tähän" })
            .click();
    };
    await place();
    const run = map.locator(".jump-run-line");
    const jumpers = map.locator(".jump-run-jumper");
    const arrows = map.locator(".freefall-drift-line");
    await expect(jumpers).toHaveCount(1);
    const firstStart = await jumpers.first().getAttribute("d");
    await place(100, 80);
    await expect(jumpers.first()).not.toHaveAttribute("d", firstStart);
    const lineBounds = await run.boundingBox();
    const mapBounds = await map.boundingBox();
    expect(lineBounds.y).toBeLessThan(mapBounds.y);
    expect(lineBounds.y + lineBounds.height).toBeGreaterThan(
        mapBounds.y + mapBounds.height,
    );
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await expect(jumpers).toHaveCount(3);
    await expect(arrows).toHaveCount(3);
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    const first = settings.getByRole("group", {
        name: "Hyppääjä 1",
        exact: true,
    });
    const second = settings.getByRole("group", {
        name: "Hyppääjä 2",
        exact: true,
    });
    const initial = await arrows.evaluateAll((lines) =>
        lines.map((line) => line.getAttribute("d")),
    );
    await edit.click();
    await expect(
        settings.getByRole("button", { name: /^(Tallenna|Peruuta)$/ }),
    ).toHaveCount(0);
    await expect(
        settings.getByRole("spinbutton", { name: "Hyppääjien väli (s)" }),
    ).toHaveValue("5");
    await first
        .getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" })
        .fill("240");
    await expect(arrows.nth(0)).not.toHaveAttribute("d", initial[0]);
    await expect(arrows.nth(1)).toHaveAttribute("d", initial[1]);
    const firstPath = await arrows.nth(0).getAttribute("d");
    await second
        .getByRole("spinbutton", { name: "Avauskorkeus (m)" })
        .fill("1200");
    await expect(arrows.nth(0)).toHaveAttribute("d", firstPath);
    await expect(arrows.nth(1)).not.toHaveAttribute("d", initial[1]);
    await expect(arrows.nth(2)).toHaveAttribute("d", initial[2]);
    const beforeExit = await arrows.evaluateAll((lines) =>
        lines.map((line) => line.getAttribute("d")),
    );
    const exit = settings.getByRole("spinbutton", {
        name: "Uloshyppykorkeus (m)",
    });
    await exit.fill("1200");
    for (let i = 0; i < 3; i++)
        await expect(arrows.nth(i)).toHaveAttribute("d", beforeExit[i]);
    await exit.fill("3500");
    for (let i = 0; i < 3; i++)
        await expect(arrows.nth(i)).not.toHaveAttribute("d", beforeExit[i]);
    const runPath = await run.getAttribute("d");
    const secondArrow = await arrows.nth(1).getAttribute("d");
    const speed = settings.getByRole("spinbutton", {
        name: "Todellinen ilmanopeus (km/h)",
    });
    await speed.fill("0");
    await expect(summary).toContainText(/Hyppylinja\s*\d+° · 157 km\/h/);
    await expect(run).toHaveAttribute("d", runPath);
    await speed.fill("180");
    await expect(summary).toContainText(/Hyppylinja\s*\d+° · 180 km\/h/);
    await expect(run).toHaveAttribute("d", runPath);
    await expect(arrows.nth(1)).not.toHaveAttribute("d", secondArrow);
    await settings
        .getByRole("spinbutton", { name: "Hyppääjien väli (s)" })
        .fill("10");
    await page.keyboard.press("Escape");
    const previous = await run.getAttribute("d");
    await place(170, 200);
    await expect(run).not.toHaveAttribute("d", previous);
    await expect(run).toHaveCount(1);
    await expect(jumpers).toHaveCount(3);
    await expect(arrows).toHaveCount(3);
    const direction = page
        .locator(".jump-run-controls")
        .getByRole("slider", { name: "Hyppylinjan suunta" });
    await expect(direction).toHaveCount(0);
    const moved = await run.getAttribute("d");
    const movedStart = new URL(page.url()).searchParams.get("map_run_start");
    if (!isMobile) {
        const bounds = await map.boundingBox();
        await page.mouse.move(bounds.x + 250, bounds.y + 200);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await expect(run).toHaveAttribute("d", moved);
        expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(
            movedStart,
        );
    }
    // Another click repositions the run and does not enter direction mode.
    await place(250, 200);
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_run_start"))
        .not.toBe(movedStart);
    await expect(
        page.getByRole("button", {
            name: "Kierrä hyppylinjaa vapaasti vetämällä",
        }),
    ).toHaveAttribute("aria-pressed", "false");
    const repositioned = await run.getAttribute("d");
    if (!isMobile) {
        const bounds = await map.boundingBox();
        await page.mouse.move(bounds.x + 170, bounds.y + 280);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await expect(run).toHaveAttribute("d", repositioned);
    }
    await edit.click();
    await expect(exit).toHaveValue("3500");
    await expect(
        first.getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" }),
    ).toHaveValue("240");
    await expect(
        second.getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("1200");
    await settings
        .getByRole("button", { name: "Poista hyppääjä 2", exact: true })
        .click();
    await expect(jumpers).toHaveCount(2);
    await expect(arrows).toHaveCount(2);
    await expect(
        second.getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("800");
    await page.keyboard.press("Escape");
    await edit.click();
    await expect(
        settings.getByRole("group", { name: /^Hyppääjä \d+$/ }),
    ).toHaveCount(2);
    await settings
        .getByRole("button", { name: "Poista hyppääjä 1", exact: true })
        .click();
    await settings
        .getByRole("button", { name: "Poista hyppääjä 1", exact: true })
        .click();
    await expect(jumpers).toHaveCount(0);
    await expect(arrows).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await expect(jumpers).toHaveCount(1);
    await expect(map.locator(".leaflet-tooltip")).toHaveCount(0);
    const distances = await page.evaluate(async () => {
        const { jumpRunCoordinates } = await import("#app/map/freefall.js");
        const { getJumpRunVelocity } = await import("#app/map/freefall.js");
        const { latLng } = await import("leaflet");
        const start = latLng(62.4, 25.6);
        const winds = [4200, 3000, 1500, 800].map((height) => ({
            height,
            label: "",
            speed: 0,
            direction: 0,
        }));
        return [0, 90, 180, 270].map((direction) => {
            const settings = {
                direction,
                speedKmh: 180,
                separationSeconds: 10,
                exitHeight: 4000,
            };
            const end = latLng(
                jumpRunCoordinates(
                    start,
                    settings,
                    2,
                    getJumpRunVelocity(winds, settings).ground,
                ),
            );
            return {
                distance: start.distanceTo(end),
                lat: end.lat - start.lat,
                lon: end.lng - start.lng,
            };
        });
    });
    for (const value of distances) expect(value.distance).toBeCloseTo(1000, 3);
    expect(distances[0].lat).toBeGreaterThan(0);
    expect(distances[1].lon).toBeGreaterThan(0);
    expect(distances[2].lat).toBeLessThan(0);
    expect(distances[3].lon).toBeLessThan(0);
    await page.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(run).toHaveCount(0);
    await place();
    await expect(jumpers).toHaveCount(1);
    await expect(arrows).toHaveCount(1);
});

test("jump run heading displays whole degrees without changing its precision", async ({
    page,
}) => {
    const runSettings = {
        direction: 16.6,
        speedKmh: 120,
        separationSeconds: 5,
        exitHeight: 4000,
    };
    await page.goto(
        `${developerPath}&map_run_settings=${encodeURIComponent(JSON.stringify(runSettings))}`,
    );
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    await expect(settings.locator(".direction-value")).toHaveText("17°");
    expect(
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
            .direction,
    ).toBe(16.6);
});

test("quarter-turn buttons rotate both ways around the opening center", async ({
    page,
}) => {
    const runSettings = {
        direction: 316.6,
        speedKmh: 120,
        separationSeconds: 5,
        exitHeight: 4000,
    };
    await page.goto(
        `${developerPath}&map_run_settings=${encodeURIComponent(JSON.stringify(runSettings))}`,
    );
    await setUniformFreefallWind(page);
    const toolbar = page.locator(".freefall-toolbar");
    const clockwise = toolbar.getByRole("button", {
        name: "Kierrä hyppylinjaa 90° myötäpäivään",
    });
    const counterclockwise = toolbar.getByRole("button", {
        name: "Kierrä hyppylinjaa 90° vastapäivään",
    });
    await expect(clockwise).toBeDisabled();
    await expect(counterclockwise).toBeDisabled();
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    const opening = await middleOpening(page);
    for (const [button, direction] of [
        [clockwise, 46.6],
        [counterclockwise, 316.6],
        [counterclockwise, 226.6],
        [counterclockwise, 136.6],
        [counterclockwise, 46.6],
        [counterclockwise, 316.6],
    ]) {
        await button.click();
        expect(
            JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
                .direction,
        ).toBeCloseTo(direction, 8);
        await expect(toolbar.locator(".toolbar-summary")).toContainText(
            `${Math.round(direction)}° · 120 km/h`,
        );
        expect(await openingDistance(page, opening)).toBeLessThan(1);
    }
    await toolbar.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(clockwise).toBeDisabled();
    await expect(counterclockwise).toBeDisabled();
});

test("default direction is used only when creating a jump run", async ({
    page,
}) => {
    await page.goto(`${developerPath}&default_jump_run_direction=180`);
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(page.locator(".freefall-drift-line")).toHaveCount(6);
    const opening = await middleOpening(page);
    const beforeTurn = new URL(page.url()).searchParams.get("map_run_start");
    expect(
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
            .direction,
    ).toBe(180);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();

    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    const direction = settings.getByRole("slider", {
        name: "Hyppylinjan suunta",
    });
    const defaultDirection = settings.getByRole("slider", {
        name: "Hyppylinjan oletussuunta",
    });
    await expect(direction).toHaveValue("180");
    await expect(defaultDirection).toHaveCount(0);
    await direction.fill("225");

    await expect(settings.locator(".direction-value")).toHaveText("225°");
    expect(await openingDistance(page, opening)).toBeLessThan(20);
    expect(new URL(page.url()).searchParams.get("map_run_start")).not.toBe(
        beforeTurn,
    );
    expect(
        new URL(page.url()).searchParams.get("default_jump_run_direction"),
    ).toBe("180");
    expect(
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
            .direction,
    ).toBe(225);

    await page.keyboard.press("Escape");
    const start = new URL(page.url()).searchParams.get("map_run_start");
    await map.click({ position: { x: 200, y: 120 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_run_start"))
        .not.toBe(start);
    expect(
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
            .direction,
    ).toBe(225);
});

test("adding, removing, and undoing jumpers preserves the opening center", async ({
    page,
}) => {
    await page.goto(`${developerPath}&default_jump_group_count=1`);
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    const paths = map.locator(".freefall-drift-line");
    await expect(paths).toHaveCount(1);
    const target = await middleOpening(page);
    const toolbar = page.locator(".freefall-toolbar");
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    await edit.click();
    const template = dialog.getByRole("group", {
        name: "Lisättävän hyppääjän asetukset",
    });
    await template
        .getByRole("spinbutton", { name: "Avauskorkeus (m)" })
        .fill("1200");
    await template.getByRole("button", { name: /^Freefly/ }).click();
    await template.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await expect(paths).toHaveCount(2);
    expect(await openingDistance(page, target)).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await toolbar
        .getByRole("button", { name: "Lisää hyppääjä", exact: true })
        .click();
    await expect(paths).toHaveCount(3);
    expect(await openingDistance(page, target)).toBeLessThan(1);
    await edit.click();
    await dialog
        .getByRole("button", { name: "Poista hyppääjä 2", exact: true })
        .click();
    await expect(paths).toHaveCount(2);
    expect(await openingDistance(page, target)).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await toolbar.getByRole("button", { name: "Poista hyppääjä" }).click();
    await expect(paths).toHaveCount(1);
    expect(await openingDistance(page, target)).toBeLessThan(1);
});

test("rotation preserves the current opening after settings, group, and wind edits", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    await edit.click();
    const direction = dialog.getByRole("slider", {
        name: "Hyppylinjan suunta",
    });
    let degrees = 0;
    for (const [name, value] of [
        ["Hyppääjien väli (s)", "10"],
        ["Todellinen ilmanopeus (km/h)", "180"],
        ["Uloshyppykorkeus (m)", "3500"],
    ]) {
        const before = await middleOpening(page);
        await dialog.getByRole("spinbutton", { name, exact: true }).fill(value);
        expect(await openingDistance(page, before)).toBeGreaterThan(1);
        const opening = await middleOpening(page);
        await direction.fill(String(++degrees));
        expect(await openingDistance(page, opening)).toBeLessThan(1);
    }
    const middleJumper = dialog.getByRole("group", {
        name: "Hyppääjä 3",
        exact: true,
    });
    await middleJumper
        .getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" })
        .fill("240");
    let opening = await middleOpening(page);
    await direction.fill(String(++degrees));
    expect(await openingDistance(page, opening)).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await page
        .locator(".freefall-toolbar")
        .getByRole("button", { name: "Lisää hyppääjä", exact: true })
        .click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(7);
    opening = await middleOpening(page);
    await edit.click();
    await direction.fill(String(++degrees));
    expect(await openingDistance(page, opening)).toBeLessThan(1);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        for (const level of ["600", "700", "850", "925", "1000"])
            data.hourly[`windspeed_${level}hPa`] = [15];
        OM_DATA.value = data;
    });
    opening = await middleOpening(page);
    await direction.fill(String(++degrees));
    expect(await openingDistance(page, opening)).toBeLessThan(1);
});

test("a feasible selected direction allows placement after the default track fails", async ({
    page,
}) => {
    await page.goto(
        `${developerPath}&default_jump_run_direction=0&map_run_settings=${encodeURIComponent(JSON.stringify({ direction: 0, speedKmh: 20, separationSeconds: 5, exitHeight: 4000 }))}`,
    );
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(page.locator(".jump-run-unavailable")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBeNull();
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await page.getByRole("slider", { name: "Hyppylinjan suunta" }).fill("180");
    await page.keyboard.press("Escape");
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    await expect(page.locator(".jump-run-unavailable")).toHaveCount(0);
    expect(
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
            .direction,
    ).toBe(180);
});

test("rotation recovers its opening after an infeasible heading", async ({
    page,
}) => {
    await page.goto(
        `${developerPath}&default_jump_run_direction=180&map_run_settings=${encodeURIComponent(JSON.stringify({ direction: 180, speedKmh: 20, separationSeconds: 5, exitHeight: 4000 }))}`,
    );
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    const opening = await middleOpening(page);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    const direction = page.getByRole("slider", { name: "Hyppylinjan suunta" });
    await direction.fill("0");
    await expect(map.locator(".freefall-drift-line")).toHaveCount(0);
    await direction.fill("170");
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    expect(await openingDistance(page, opening)).toBeLessThan(1);
});

for (const input of ["mouse", "touch"]) {
    test(`direction ${input} dragging starts from the current heading without snapping`, async ({
        page,
    }) => {
        await expect(page.getByText(/Koordinaatit puuttuvat/)).toBeVisible();
        await page.clock.setFixedTime(new Date());
        await setUniformFreefallWind(page);
        const map = page.locator(".dz-map");
        await map.scrollIntoViewIfNeeded();
        await map.click({ position: { x: 120, y: 160 } });
        await page
            .getByRole("button", { name: "Pudota hyppääjät tähän" })
            .click();
        await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
        await page
            .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
            .click();
        await page
            .getByRole("slider", { name: "Hyppylinjan suunta" })
            .fill("45");
        await page.keyboard.press("Escape");
        const opening = await middleOpening(page);
        const button = page.getByRole("button", {
            name: "Kierrä hyppylinjaa vapaasti vetämällä",
        });
        await button.click();
        const bounds = await map.boundingBox();
        const x = bounds.x + 240;
        const y = bounds.y + 160;
        const direction = () =>
            JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
                .direction;
        const touch =
            input === "touch" ? await page.context().newCDPSession(page) : null;
        const start = async () => {
            if (touch)
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchStart",
                    touchPoints: [{ x, y }],
                });
            else {
                await page.mouse.move(x, y);
                await page.mouse.down();
            }
        };
        const move = async (offset) => {
            if (touch)
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchMove",
                    touchPoints: [{ x, y: y + offset }],
                });
            else await page.mouse.move(x, y + offset);
            await page.evaluate(() => new Promise(requestAnimationFrame));
        };
        const release = async () => {
            if (touch)
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchEnd",
                    touchPoints: [],
                });
            else await page.mouse.up();
        };
        await start();
        expect(direction()).toBe(45);
        await move(2);
        expect(direction()).toBe(45);
        await move(20);
        await expect.poll(direction).toBeGreaterThan(45);
        expect(direction()).toBeLessThan(56);
        await move(60);
        await expect
            .poll(direction)
            .toBeCloseTo(45 + (Math.atan2(60, 120) * 180) / Math.PI, 0);
        await move(0);
        await expect.poll(direction).toBeCloseTo(45, 0);
        await release();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await start();
        expect(direction()).toBeCloseTo(45, 0);
        await move(60);
        await expect
            .poll(direction)
            .toBeCloseTo(45 + (Math.atan2(60, 120) * 180) / Math.PI, 0);
        await release();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        expect(await openingDistance(page, opening)).toBeLessThan(1);
        await touch?.detach();
    });
}

test("direction dragging coalesces movements and commits the final position on release", async ({
    page,
}) => {
    await expect(page.getByText(/Koordinaatit puuttuvat/)).toBeVisible();
    await page.clock.setFixedTime(new Date());
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    // Invalidate the original target, then exercise the drag path as well as the slider.
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await page
        .getByRole("spinbutton", { name: "Hyppääjien väli (s)" })
        .fill("10");
    await page.keyboard.press("Escape");
    const opening = await middleOpening(page);
    await page
        .getByRole("button", { name: "Kierrä hyppylinjaa vapaasti vetämällä" })
        .click();
    const writes = await map.evaluate(async (element) => {
        const original = history.replaceState;
        let writes = 0;
        history.replaceState = function (...args) {
            writes++;
            return original.apply(this, args);
        };
        const bounds = element.getBoundingClientRect();
        const send = (type, x, y) =>
            element.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    pointerId: 1,
                    pointerType: "mouse",
                    button: 0,
                    clientX: bounds.left + x,
                    clientY: bounds.top + y,
                }),
            );
        try {
            send("pointerdown", 120, 160);
            for (let i = 0; i < 20; i++) send("pointermove", 140 + i, 160);
            const beforeFrame = writes;
            await new Promise(requestAnimationFrame);
            const afterFrame = writes;
            const frameSettings = new URL(location.href).searchParams.get(
                "map_run_settings",
            );
            // These events happen in the same task: release must flush the latest point.
            send("pointermove", 160, 200);
            send("pointermove", 120, 250);
            send("pointerup", 120, 250);
            const afterRelease = writes;
            const settings = new URL(location.href).searchParams.get(
                "map_run_settings",
            );
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
            return {
                beforeFrame,
                afterFrame,
                frameSettings,
                afterRelease,
                afterIdle: writes,
                settings,
                finalSettings: new URL(location.href).searchParams.get(
                    "map_run_settings",
                ),
            };
        } finally {
            history.replaceState = original;
        }
    });
    expect(writes.beforeFrame).toBe(0);
    expect(writes.afterFrame).toBe(1);
    expect(writes.afterRelease).toBe(2);
    expect(writes.afterIdle).toBe(2);
    expect(writes.finalSettings).toBe(writes.settings);
    expect(JSON.parse(writes.settings).direction).not.toBe(
        JSON.parse(writes.frameSettings).direction,
    );
    expect(await openingDistance(page, opening)).toBeLessThan(1);
});

test("jump-run positioning requires confirmation and cancels on other clicks", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    const confirm = page.getByRole("button", {
        name: "Pudota hyppääjät tähän",
    });
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await expect(confirm).toBeVisible();
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBeNull();
    await expect(map.locator(".jump-run-jumper")).toHaveCount(0);

    // Another map click dismisses the callout without choosing a new point.
    await map.click({ position: { x: 40, y: 250 } });
    await expect(confirm).toHaveCount(0);
    await page.waitForTimeout(400);
    await expect(confirm).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBeNull();

    await map.click({ position: { x: 120, y: 160 } });
    await confirm.click();
    const start = new URL(page.url()).searchParams.get("map_run_start");
    expect(start).not.toBeNull();
    await expect(map.locator(".jump-run-jumper")).toHaveCount(6);
    await expect(confirm).toHaveCount(0);

    // Controls and clicks outside the map also dismiss pending repositioning.
    for (const cancel of [
        () => map.getByRole("button", { name: "Zoom in" }).click(),
        () => page.locator(".toolbar-summary").click(),
        () => page.keyboard.press("Escape"),
    ]) {
        await map.scrollIntoViewIfNeeded();
        await map.click({ position: { x: 180, y: 200 } });
        await expect(confirm).toBeVisible();
        await cancel();
        await expect(confirm).toHaveCount(0);
        expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(
            start,
        );
    }
});

for (const jumperCount of [1, 13, 14]) {
    test(`jump run centers ${jumperCount} jumpers on a map click`, async ({
        page,
    }) => {
        const center = { lat: 62.4, lng: 25.6 };
        await page.goto(
            `${developerPath}&default_jump_group_count=${jumperCount}&default_jump_run_direction=90&map_center_lat=${center.lat}&map_center_lon=${center.lng}`,
        );
        await setUniformFreefallWind(page);

        const map = page.locator(".dz-map");
        await map.scrollIntoViewIfNeeded();
        const bounds = await map.boundingBox();
        await map.click({
            position: { x: bounds.width / 2, y: bounds.height / 2 },
        });
        await page
            .getByRole("button", { name: "Pudota hyppääjät tähän" })
            .click();

        await expect(map.locator(".freefall-drift-line")).toHaveCount(
            jumperCount,
        );
        const result = await page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const { jumpRunCoordinates } = await import("#app/map/freefall.js");
            const { getFreefallDrift, driftCoordinates, getJumpRunVelocity } =
                await import("#app/map/freefall.js");
            const { latLng } = await import("leaflet");
            const params = new URL(location.href).searchParams;
            const settings = JSON.parse(params.get("map_run_settings"));
            const start = JSON.parse(params.get("map_run_start"));
            const jumpers = JSON.parse(params.get("map_jumpers"));
            const target = {
                lat: Number(params.get("map_center_lat")),
                lng: Number(params.get("map_center_lon")),
            };
            const winds = getMapWindData().freefallWinds;
            const velocity = getJumpRunVelocity(winds, settings);
            const middleIndex = (jumpers.length - 1) / 2;
            const openings = [
                Math.floor(middleIndex),
                Math.ceil(middleIndex),
            ].map((index) => {
                const exit = latLng(
                    jumpRunCoordinates(start, settings, index, velocity.ground),
                );
                const jumper = jumpers[index];
                const path = getFreefallDrift(
                    winds,
                    settings.exitHeight,
                    jumper.speedKmh,
                    jumper.openingHeight,
                    velocity.air,
                );
                return latLng(driftCoordinates(exit, path[path.length - 1]));
            });
            const opening = latLng(
                (openings[0].lat + openings[1].lat) / 2,
                (openings[0].lng + openings[1].lng) / 2,
            );
            return {
                direction: settings.direction,
                jumperCount: jumpers.length,
                openingDistance: opening.distanceTo(target),
            };
        });
        expect(result.direction).toBe(90);
        expect(result.jumperCount).toBe(jumperCount);
        expect(result.openingDistance).toBeLessThan(20);
    });
}

test("two-finger navigation retains loaded tiles and saves the completed view", async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, "Requires mobile touch input");
    await page.route("https://tile.openstreetmap.org/**", (route) =>
        route.fulfill({
            contentType: "image/png",
            body: Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aShoAAAAASUVORK5CYII=",
                "base64",
            ),
        }),
    );
    await page.goto(`${developerPath}&lat=62.4&lon=25.6`);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await expect
        .poll(() =>
            map
                .locator("img.leaflet-tile")
                .evaluateAll((tiles) =>
                    tiles.some(
                        (tile) => tile.complete && tile.naturalWidth > 0,
                    ),
                ),
        )
        .toBe(true);
    // Switching back from wheel input must retain fractional touch zoom.
    await map.dispatchEvent("wheel", { deltaY: -20 });
    const tile = await map.locator("img.leaflet-tile").first().elementHandle();
    const initial = new URL(page.url());
    const bounds = await map.boundingBox();
    const scroll = await page.evaluate(() => scrollY);
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
            { id: 1, x: bounds.x + 100, y: bounds.y + 160 },
            { id: 2, x: bounds.x + 200, y: bounds.y + 160 },
        ],
    });
    // Slight changes in finger spacing happen even when intending to pan.
    for (const offset of [10, 20, 30]) {
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
                { id: 1, x: bounds.x + 100 + offset, y: bounds.y + 180 },
                { id: 2, x: bounds.x + 201 + offset, y: bounds.y + 180 },
            ],
        });
        await page.evaluate(() => new Promise(requestAnimationFrame));
        expect(await tile.evaluate((element) => element.isConnected)).toBe(
            true,
        );
    }
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await expect(page).toHaveURL(initial.href);
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await expect(page).toHaveURL(
        (url) =>
            url.searchParams.get("map_center_lon") !==
                initial.searchParams.get("map_center_lon") &&
            Number(url.searchParams.get("map_zoom")) >
                Number(initial.searchParams.get("map_zoom")),
    );
    expect(await tile.evaluate((element) => element.isConnected)).toBe(true);
    await touch.detach();
});

test("one finger on the map scrolls the page without changing the map view", async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, "Requires mobile touch input");
    await page.goto(`${developerPath}&lat=62.4&lon=25.6`);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    const initial = page.url();
    const scroll = await page.evaluate(() => scrollY);
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: bounds.x + 100, y: bounds.y + 200 }],
    });
    for (const offset of [20, 40, 60, 80]) {
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: bounds.x + 100, y: bounds.y + 200 - offset }],
        });
    }
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(scroll);
    await expect(page).toHaveURL(initial);
    await touch.detach();
});

for (const placement of ["unplaced", "positioned"]) {
    test(`double-tap zoom preserves the ${placement} jump run`, async ({
        page,
        isMobile,
    }) => {
        await setUniformFreefallWind(page);
        const map = page.locator(".dz-map");
        const hint = page
            .getByRole("status")
            .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
        if (placement === "positioned") {
            await map.scrollIntoViewIfNeeded();
            await map.click({ position: { x: 80, y: 100 } });
            await page
                .getByRole("button", { name: "Pudota hyppääjät tähän" })
                .click();
            await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
        }
        await map.scrollIntoViewIfNeeded();
        const initial = new URL(page.url()).searchParams;
        if (isMobile) {
            const bounds = await map.boundingBox();
            const touch = await page.context().newCDPSession(page);
            for (let tap = 0; tap < 2; tap++) {
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchStart",
                    touchPoints: [{ x: bounds.x + 150, y: bounds.y + 220 }],
                });
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchEnd",
                    touchPoints: [],
                });
                if (tap === 0) await page.waitForTimeout(60);
            }
            await touch.detach();
        } else {
            await map.dblclick({ position: { x: 150, y: 220 }, delay: 60 });
        }
        await expect(page).toHaveURL(
            (url) =>
                Number(url.searchParams.get("map_zoom")) >
                Number(initial.get("map_zoom")),
        );
        // Allow the single-click delay to expire to detect late placement.
        await page.waitForTimeout(400);
        const result = new URL(page.url()).searchParams;
        expect(result.get("map_run_start")).toBe(initial.get("map_run_start"));
        await expect(hint).toHaveCount(0);
    });
}

test("dragging sets jump run direction and clicking exits without moving the run", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    const jumper = map.locator(".jump-run-jumper").first();
    await expect(jumper).toBeVisible();
    const directionButton = page.getByRole("button", {
        name: "Kierrä hyppylinjaa vapaasti vetämällä",
    });
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    await expect(hint).toHaveCount(0);
    await expect(directionButton).toHaveAttribute("aria-pressed", "false");
    const opening = await middleOpening(page);
    const placed = new URL(page.url()).searchParams.get("map_run_start");
    await directionButton.click();
    await expect(hint).toBeVisible();
    await expect(directionButton).toHaveAttribute("aria-pressed", "true");
    const bounds = await map.boundingBox();
    const originX = bounds.x + 100;
    const originY = bounds.y + 160;
    const settings = () =>
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"));
    await page.mouse.move(originX, originY);
    await page.mouse.down();
    await page.mouse.move(originX + 120, originY, { steps: 8 });
    await expect
        .poll(() => settings().direction)
        .toBeCloseTo((Math.atan2(120, 40) * 180) / Math.PI, 0);
    await expect(hint).toHaveCount(0);
    expect(await openingDistance(page, opening)).toBeLessThan(20);
    expect(new URL(page.url()).searchParams.get("map_run_start")).not.toBe(
        placed,
    );
    await page.mouse.up();
    await expect(hint).toBeVisible();
    await expect(directionButton).toHaveAttribute("aria-pressed", "true");
    const aimed = settings().direction;
    const start = new URL(page.url()).searchParams.get("map_run_start");
    await page.mouse.move(originX, originY + 140);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(settings().direction).toBeCloseTo(aimed, 0);
    await map.click({ position: { x: 40, y: 80 } });
    await page.waitForTimeout(400);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(start);
    await expect(hint).toHaveCount(0);
    expect(settings().direction).toBeCloseTo(aimed, 0);
    await expect(hint).toHaveCount(0);
    await expect(directionButton).toHaveAttribute("aria-pressed", "false");
    await page.mouse.move(originX - 100, originY);
    await page.mouse.down();
    await page.mouse.move(originX - 100, originY + 80, { steps: 6 });
    await page.mouse.up();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(settings().direction).toBeCloseTo(aimed, 0);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(start);
    expect(await openingDistance(page, opening)).toBeLessThan(20);
});

test("wheel zoom follows full-window mode and Escape exits direction mode first", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const card = page.locator("#dropzone-map");
    const map = card.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    const directionButton = card.getByRole("button", {
        name: "Kierrä hyppylinjaa vapaasti vetämällä",
    });
    const zoom = () => new URL(page.url()).searchParams.get("map_zoom");
    const wheel = () => map.dispatchEvent("wheel", { deltaY: -500 });
    const initialZoom = zoom();
    await wheel();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(initialZoom);

    await directionButton.click();
    await page.keyboard.press("Escape");
    await expect(directionButton).toHaveAttribute("aria-pressed", "false");
    await card
        .getByRole("button", {
            name: "Laajenna Tuulikartta koko ikkunaan",
        })
        .click();
    const frame = card.locator(".map-frame");
    await wheel();
    await expect.poll(zoom).not.toBe(initialZoom);
    const expandedZoom = zoom();
    await directionButton.click();
    await wheel();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(expandedZoom);

    await card
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(card.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card.getByRole("dialog")).not.toBeVisible();
    await expect(directionButton).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(directionButton).toHaveAttribute("aria-pressed", "false");
    await expect(frame).toHaveClass(/full-window/);
    await wheel();
    await expect.poll(zoom).not.toBe(expandedZoom);
    await page.keyboard.press("Escape");
    await expect(frame).not.toHaveClass(/full-window/);
    const restoredZoom = zoom();
    await wheel();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(restoredZoom);
});

test("small wheel movements zoom by a full level after a fractional touch view", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs(
            { map_zoom: "14.25", map_full_window: "true" },
            { replace: true },
        );
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
    });
    const map = page.locator(".dz-map");
    await expect(page.locator(".map-frame")).toHaveClass(/full-window/);
    await map.dispatchEvent("wheel", {
        deltaY: -20,
        clientX: 200,
        clientY: 200,
    });
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_zoom"))
        .toBe("15");
});

test("map zoom is disabled during jump run direction setting and restored afterward", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".jump-run-jumper").first()).toBeVisible();
    const directionButton = page.getByRole("button", {
        name: "Kierrä hyppylinjaa vapaasti vetämällä",
    });
    await directionButton.click();
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    await expect(hint).toBeVisible();
    const zoom = () => new URL(page.url()).searchParams.get("map_zoom");
    const initialZoom = zoom();
    const zoomIn = map.locator(".leaflet-control-zoom-in");
    const zoomOut = map.locator(".leaflet-control-zoom-out");
    await expect(zoomIn).toHaveAttribute("aria-disabled", "true");
    await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
    await zoomIn.click({ force: true });
    await zoomOut.click({ force: true });
    await map.focus();
    await page.keyboard.press("+");
    await page.keyboard.press("-");
    // A dblclick event must not zoom while the direction preview is active.
    await map.dispatchEvent("dblclick", {
        clientX: 150,
        clientY: 220,
        detail: 2,
    });
    const bounds = await map.boundingBox();
    await page.mouse.move(bounds.x + 150, bounds.y + 220);
    await page.mouse.wheel(0, -500);
    await page.keyboard.down("Shift");
    await page.mouse.move(bounds.x + 100, bounds.y + 160);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 200, bounds.y + 260, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
            { id: 1, x: bounds.x + 100, y: bounds.y + 200 },
            { id: 2, x: bounds.x + 200, y: bounds.y + 200 },
        ],
    });
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
            { id: 1, x: bounds.x + 50, y: bounds.y + 200 },
            { id: 2, x: bounds.x + 250, y: bounds.y + 200 },
        ],
    });
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await touch.detach();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(initialZoom);
    await expect(hint).toBeVisible();
    const currentBounds = await map.boundingBox();
    await map.dispatchEvent("click", {
        clientX: currentBounds.x + 200,
        clientY: currentBounds.y + 160,
        detail: 1,
    });
    await page.waitForTimeout(400);
    await expect(hint).toHaveCount(0);
    expect(zoom()).toBe(initialZoom);
    await expect(hint).toHaveCount(0);
    await expect(zoomIn).toHaveAttribute("aria-disabled", "false");
    await expect(zoomOut).toHaveAttribute("aria-disabled", "false");
    await zoomIn.click();
    await expect.poll(zoom).not.toBe(initialZoom);
    const buttonZoom = zoom();
    await map.focus();
    await page.keyboard.press("+");
    await expect.poll(zoom).not.toBe(buttonZoom);
});

test("full-window one-finger pan pauses while jump run direction mode is on", async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, "Requires mobile touch input");
    await setUniformFreefallWind(page);
    await page
        .getByRole("button", { name: "Laajenna Tuulikartta koko ikkunaan" })
        .click();
    const map = page.locator(".dz-map");
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    const directionButton = page.getByRole("button", {
        name: "Kierrä hyppylinjaa vapaasti vetämällä",
    });
    const touch = await page.context().newCDPSession(page);
    const view = () => {
        const params = new URL(page.url()).searchParams;
        return [params.get("map_center_lat"), params.get("map_center_lon")];
    };
    const drag = async () => {
        const bounds = await map.boundingBox();
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x: bounds.x + 100, y: bounds.y + 200 }],
        });
        for (const offset of [20, 40, 60, 80]) {
            await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [
                    { x: bounds.x + 100 + offset, y: bounds.y + 200 - offset },
                ],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
        }
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
    };
    const initial = view();
    await drag();
    await expect.poll(view).not.toEqual(initial);
    await expect(hint).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBeNull();
    await map.tap({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".jump-run-jumper").first()).toBeVisible();
    await expect(hint).toHaveCount(0);
    const beforeDirection = view();
    const start = new URL(page.url()).searchParams.get("map_run_start");
    await directionButton.click();
    await expect(hint).toBeVisible();
    const beforeSettings = new URL(page.url()).searchParams.get(
        "map_run_settings",
    );
    await drag();
    await expect(hint).toBeVisible();
    expect(view()).toEqual(beforeDirection);
    const aimedStart = new URL(page.url()).searchParams.get("map_run_start");
    expect(aimedStart).not.toBe(start);
    expect(new URL(page.url()).searchParams.get("map_run_settings")).not.toBe(
        beforeSettings,
    );
    await directionButton.click();
    await expect(hint).toHaveCount(0);
    await drag();
    await expect.poll(view).not.toEqual(beforeDirection);
    await expect(hint).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(
        aimedStart,
    );
    await touch.detach();
});

test("jump run direction follows touch dragging and stays on after release", async ({
    page,
    isMobile,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    if (isMobile) await map.tap({ position: { x: 100, y: 160 } });
    else await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    const run = map.locator(".jump-run-line");
    const jumper = map.locator(".jump-run-jumper").first();
    await expect(jumper).toBeVisible();
    const directionButton = page.getByRole("button", {
        name: "Kierrä hyppylinjaa vapaasti vetämällä",
    });
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    await directionButton.click();
    await expect(hint).toBeVisible();
    const originalDirection = await run.getAttribute("d");
    const bounds = await map.boundingBox();
    const scroll = await page.evaluate(() => scrollY);
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: bounds.x + 100, y: bounds.y + 160 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: bounds.x + 200, y: bounds.y + 230 }],
    });
    await expect(run).not.toHaveAttribute("d", originalDirection);
    await expect(hint).toHaveCount(0);
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    const preview = await run.getAttribute("d");
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await expect(hint).toBeVisible();
    await expect(directionButton).toHaveAttribute("aria-pressed", "true");
    await expect(run).toHaveAttribute("d", preview);
    // Release keeps the aimed track and stays in direction mode.
    await page.mouse.move(bounds.x + 100, bounds.y + 280);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(run).toHaveAttribute("d", preview);
    await expect(hint).toBeVisible();
    const aimedStart = new URL(page.url()).searchParams.get("map_run_start");
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: bounds.x + 80, y: bounds.y + 120 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await expect(hint).toHaveCount(0);
    await expect(directionButton).toHaveAttribute("aria-pressed", "false");
    await expect(run).toHaveAttribute("d", preview);
    await page.waitForTimeout(400);
    expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(
        aimedStart,
    );
    await touch.detach();
});

test("jump run adds jumpers using immediately applied template settings", async ({
    page,
    isMobile,
}) => {
    await setUniformFreefallWind(page);
    const template = page.locator(".toolbar-summary");
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    await expect(page.getByRole("button", { name: /Muokkaa:/ })).toHaveCount(0);
    await expect(template).toContainText("4000 m");
    await edit.click();
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    const dialog = settings.getByRole("group", {
        name: "Lisättävän hyppääjän asetukset",
    });
    await expect(
        settings.getByRole("button", { name: /^(Tallenna|Peruuta)$/ }),
    ).toHaveCount(0);
    await expect(
        dialog.getByRole("spinbutton", { name: "Uloshyppykorkeus (m)" }),
    ).toHaveCount(0);
    const opening = dialog.getByRole("spinbutton", {
        name: "Avauskorkeus (m)",
    });
    await opening.fill("4000");
    await expect(template).toContainText("800 m");
    await opening.fill("1200");
    await dialog.getByRole("button", { name: /^Freefly/ }).click();
    await expect(template).toContainText("1200 m");
    await expect(template).toContainText("240 km/h");
    await dialog.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await expect(settings).toBeVisible();
    const first = settings.getByRole("group", {
        name: "Hyppääjä 1",
        exact: true,
    });
    const second = settings.getByRole("group", {
        name: "Hyppääjä 2",
        exact: true,
    });
    await expect(
        first.getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" }),
    ).toHaveValue("180");
    await expect(
        first.getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("800");
    await expect(
        second.getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" }),
    ).toHaveValue("240");
    await expect(
        second.getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("1200");
    await settings
        .getByRole("spinbutton", { name: "Uloshyppykorkeus (m)" })
        .fill("3500");
    await page.keyboard.press("Escape");
    await edit.click();
    await opening.fill("3500");
    await expect(template).toContainText("1200 m");
    await opening.fill("1500");
    await dialog.getByRole("button", { name: /^Wingsuit/ }).click();
    await expect(template).toContainText("1500 m");
    await expect(template).toContainText("80 km/h");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    if (isMobile) await map.tap({ position: { x: 100, y: 160 } });
    else await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(3);
    if (isMobile) await map.tap({ position: { x: 180, y: 160 } });
    else await map.click({ position: { x: 180, y: 160 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await edit.click();
    await expect(
        second.getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" }),
    ).toHaveValue("240");
    const third = settings.getByRole("group", {
        name: "Hyppääjä 3",
        exact: true,
    });
    await expect(
        third.getByRole("spinbutton", { name: "Vapaapudotusnopeus (km/h)" }),
    ).toHaveValue("80");
    await expect(
        third.getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("1500");
    await page.keyboard.press("Escape");
});

test("map setup survives URL reload and shares in full-window mode", async ({
    page,
    isMobile,
}) => {
    await page.evaluate(() => {
        Object.defineProperty(navigator, "share", {
            configurable: true,
            value: async (data) => {
                window.sharedMap = data;
            },
        });
    });
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    const toolbar = page.locator(".freefall-toolbar");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 140, y: 180 } });
    await page.getByRole("button", { name: "Pudota hyppääjät tähän" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    await toolbar
        .getByRole("button", { name: "Lisää hyppääjä", exact: true })
        .click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(7);
    await map.getByRole("button", { name: "Zoom in" }).click();
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_zoom"))
        .toBe("15");
    const setup = new URL(page.url());
    expect(JSON.parse(setup.searchParams.get("map_jumpers"))).toHaveLength(7);
    expect(JSON.parse(setup.searchParams.get("map_run_start"))).toHaveProperty(
        "lat",
    );
    expect(
        JSON.parse(setup.searchParams.get("map_run_settings")),
    ).toHaveProperty("direction");
    expect(
        Number.isFinite(Number(setup.searchParams.get("map_center_lat"))),
    ).toBe(true);
    expect(
        Number.isFinite(Number(setup.searchParams.get("map_center_lon"))),
    ).toBe(true);
    await toolbar.getByRole("button", { name: "Jaa kartta" }).click();
    const shared = await page.evaluate(() => window.sharedMap);
    const sharedURL = new URL(shared.url);
    expect(sharedURL.searchParams.get("map_full_window")).toBe("true");
    setup.searchParams.set("map_full_window", "true");
    expect(sharedURL.href).toBe(setup.href);
    expect(new URL(page.url()).searchParams.get("map_full_window")).toBeNull();
    await page.goto(shared.url);
    await setUniformFreefallWind(page);
    await expect(
        toolbar.getByRole("button", { name: "Palauta Tuulikartta" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(map.locator(".freefall-drift-line")).toHaveCount(7);
    await expect(map.locator(".freefall-drift-line")).toHaveCount(7);
    await toolbar.getByRole("button", { name: "Poista hyppääjä" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    await toolbar.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(0);
    await expect(map.locator(".freefall-drift-line")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_full_window"))
        .toBe("false");
});

test("map query state handles invalid input and browser history", async ({
    page,
}) => {
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({
            map_full_window: "true",
            map_run_start: "[null]",
            map_jumpers: "{}",
            map_zoom: "1000",
            map_center_lat: '"broken"',
            map_center_lon: "200",
        });
    });
    await setUniformFreefallWind(page);
    const toolbar = page.locator(".freefall-toolbar");
    await expect(
        toolbar.getByRole("button", { name: "Palauta Tuulikartta" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".freefall-drift-line")).toHaveCount(0);
    await page.goBack();
    await expect(
        toolbar.getByRole("button", {
            name: "Laajenna Tuulikartta koko ikkunaan",
        }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.goForward();
    await expect(
        toolbar.getByRole("button", { name: "Palauta Tuulikartta" }),
    ).toHaveAttribute("aria-pressed", "true");
});

test("cloud source tabs switch between METAR and the current Open-Meteo profile", async ({
    page,
}) => {
    const response = openMeteoResponse();
    response.elevation = 68;
    // The preceding and future hours differ, so selecting the current hour matters.
    response.hourly.cloud_cover_700hPa = response.hourly.time.map((_, index) =>
        index === 1 ? 75 : 5,
    );
    response.hourly.cloud_cover_850hPa = response.hourly.time.map(() => null);
    response.hourly.geopotential_height_1000hPa = response.hourly.time.map(
        () => 20,
    );
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: response }),
    );
    const params = new URLSearchParams({
        name: "Cloud DZ",
        lat: "40.7",
        lon: "-74",
        icaocode: "KJFK",
        DEV_metar: "METAR KJFK 041200Z 18010KT 9999 FEW020 10/05 Q1014=",
    });
    await page.goto(`/dz/?${params}`);
    const card = page.locator("#clouds");
    const metarTab = card.getByRole("tab", { name: "METAR", exact: true });
    const modelTab = card.getByRole("tab", { name: "Open-Meteo", exact: true });
    await expect(metarTab).toHaveAttribute("aria-selected", "true");
    await expect(card.locator(".cloud-layer")).toHaveCount(1);
    await modelTab.click();
    await expect(modelTab).toHaveAttribute("aria-selected", "true");
    await expect(card.locator(".cloud-layer a")).toHaveCount(0);
    const rows = card.getByRole("tabpanel").locator(".cloud-profile-layer");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toContainText("3000 m");
    await expect(rows.nth(1)).toContainText("75 %");
    await rows
        .nth(1)
        .getByRole("button", { name: "Ohje", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toContainText("700 hPa");
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Sulje", exact: true })
        .click();
    await modelTab.press("ArrowLeft");
    await expect(metarTab).toBeFocused();
    await expect(metarTab).toHaveAttribute("aria-selected", "true");
    await expect(card.locator(".cloud-layer")).toHaveCount(1);
    await metarTab.press("End");
    await expect(modelTab).toBeFocused();
    await expect(rows).toHaveCount(3);
    // Losing METAR must also remove the tabs and leave the model visible.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ icaocode: undefined, DEV_metar: undefined });
    });
    await expect(card.getByRole("tablist")).toHaveCount(0);
    await expect(card.locator(".cloud-profile-layer")).toHaveCount(3);
});

test("compact cloud forecast opens detailed FMI and Open-Meteo table", async ({
    page,
}) => {
    await page.evaluate(async () => {
        const { FORECASTS, FORECAST_SOURCE } =
            await import("#app/weather/state.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        const firstHour = new Date();
        firstHour.setMinutes(0, 0, 0);
        firstHour.setHours(firstHour.getHours() + 1);
        const times = Array.from(
            { length: 3 },
            (_, index) =>
                new Date(firstHour.getTime() + index * 60 * 60 * 1000),
        );
        FORECASTS.value = times.map((time, index) => ({
            source: "forecast",
            time,
            speed: 5,
            gust: 8,
            direction: 180,
            totalCloudCover: 50 + index * 10,
            lowCloudCover: 10 + index * 10,
            middleOnlyCloudCover: 20 + index * 10,
            highCloudCover: 30 + index * 10,
            middleCloudCover: 40 + index * 10,
            temperature: 10,
            dewPoint: 5,
        }));
        FORECAST_SOURCE.value = "FMI";

        const hourlyTimes = times.map((time) =>
            time.toISOString().slice(0, 16),
        );
        const hourly = {
            time: hourlyTimes,
            wind_speed_10m: hourlyTimes.map(() => 5),
            wind_gusts_10m: hourlyTimes.map(() => 8),
            wind_direction_10m: hourlyTimes.map(() => 180),
            temperature_2m: hourlyTimes.map(() => 10),
            dew_point_2m: hourlyTimes.map(() => 5),
            precipitation_probability: hourlyTimes.map(() => 0),
            cloud_cover_low: hourlyTimes.map(() => 20),
            cloud_cover_mid: hourlyTimes.map(() => 30),
        };
        for (const [level, height] of Object.entries({
            1000: 110,
            925: 800,
            850: 1500,
            700: 3024,
            600: 4200,
        })) {
            hourly[`windspeed_${level}hPa`] = hourlyTimes.map(() => 12);
            hourly[`winddirection_${level}hPa`] = hourlyTimes.map(() => 200);
            hourly[`cloud_cover_${level}hPa`] = hourlyTimes.map(() => 40);
            hourly[`geopotential_height_${level}hPa`] = hourlyTimes.map(
                () => height,
            );
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });

    const forecast = page.locator("#clouds .cloud-forecast");
    const compactTable = forecast.locator(
        ":scope > .forecast-scroll .cloud-forecast-table",
    );
    await expect(compactTable.locator("tbody tr")).toHaveCount(1);
    await expect(compactTable).not.toContainText("Tiivistymiskorkeus");
    await forecast
        .getByRole("button", {
            name: "Yksityiskohtainen pilviennuste taulukkona",
        })
        .click();

    const dialog = page.getByRole("dialog", {
        name: "Yksityiskohtainen pilviennuste",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("tbody tr")).toHaveCount(11);
    await expect(dialog).toContainText("Kokonaispilvipeite");
    await expect(dialog).toContainText("Matalat pilvet");
    await expect(dialog).toContainText("Keskipilvet");
    await expect(dialog).toContainText("Korkeat pilvet");
    await expect(dialog).toContainText("Keski- ja alapilvet");
    await expect(dialog).toContainText("Tiivistymiskorkeus");
    await expect(dialog.locator(".forecast-source-label")).toHaveText([
        "FMI",
        "Open-Meteo",
    ]);
    await expect(dialog.getByRole("rowheader")).toContainText([
        "Tiivistymiskorkeus",
        "Kokonaispilvipeite",
        "Korkeat pilvet",
        "Keskipilvet",
        "Keski- ja alapilvet",
        "Matalat pilvet",
        "4200 m",
        "3000 m",
        "1500 m",
        "800 m",
        "100 m",
    ]);
    await expect(dialog.locator(".cloud-forecast-altitude")).toHaveCount(0);

    for (const [label, explanation] of [
        ["Tiivistymiskorkeus", "lämpötilasta ja kastepisteestä"],
        ["Kokonaispilvipeite", "kaikki pilvikerrokset"],
        ["Korkeat pilvet", "ei sisällä keski- tai alapilviä"],
        ["Keskipilvet", "pelkkien keskipilvien"],
        [
            "Keski- ja alapilvet",
            "ei ole keski- ja alapilvien erillisten prosenttien summa",
        ],
        ["Matalat pilvet", "ei pilven alarajan korkeutta"],
    ]) {
        const button = dialog.getByRole("button", {
            name: `${label}: Ohje`,
            exact: true,
        });
        await button.click();
        const help = page.locator("dialog:modal").last();
        await expect(
            help.getByRole("heading", { name: label, exact: true }),
        ).toBeVisible();
        await expect(help).toContainText(explanation);
        await help.getByRole("button", { name: "Sulje", exact: true }).click();
        await expect(dialog).toBeVisible();
        await expect(button).toBeFocused();
    }
});

test("wind tables omit cloud cover and condensation level columns", async ({
    page,
}) => {
    await page
        .getByRole("button", { name: "Ennuste taulukkona", exact: true })
        .click();
    const forecastDialog = page.getByRole("dialog", {
        name: "Ennuste",
        exact: true,
    });
    await expect(forecastDialog.getByRole("columnheader")).toHaveCount(6);
    await expect(
        forecastDialog.getByText("Pilvet L", { exact: true }),
    ).toHaveCount(0);
    await expect(
        forecastDialog.getByText("Pilvet ML", { exact: true }),
    ).toHaveCount(0);
    await expect(forecastDialog.getByText("TK", { exact: true })).toHaveCount(
        0,
    );
    await forecastDialog
        .getByRole("button", { name: "Sulje", exact: true })
        .click();

    await page
        .getByRole("button", { name: "Havainnot taulukkona", exact: true })
        .click();
    const observationsDialog = page.getByRole("dialog", {
        name: "Havainnot",
        exact: true,
    });
    await expect(observationsDialog.getByRole("columnheader")).toHaveCount(5);
    await expect(
        observationsDialog.getByText("TK", { exact: true }),
    ).toHaveCount(0);
});

test("missing current Open-Meteo cloud data shows an unavailable message", async ({
    page,
}) => {
    const response = openMeteoResponse();
    for (const level of ["1000", "925", "850", "700", "600"]) {
        response.hourly[`cloud_cover_${level}hPa`] = response.hourly.time.map(
            () => null,
        );
    }
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: response }),
    );
    await page.goto("/dz/?name=Cloud+DZ&lat=40.7&lon=-74");
    const card = page.locator("#clouds");
    await expect(card.getByRole("tablist")).toHaveCount(0);
    await expect(card.locator(".open-meteo-clouds")).toContainText(
        "Nykyisen tunnin pilviennuste ei ole saatavilla.",
    );
    await expect(card.locator(".cloud-profile-layers")).toHaveCount(0);
});

for (const [axis, wind, speed, expected] of [
    [180, 0, 10, 0],
    [30, 350, 10, 30],
    [90, 0, 10, 90],
    [180, 0, 0, 180],
]) {
    test(`automatic jump-run positioning uses axis ${axis} into wind ${wind} at ${speed} m/s`, async ({
        page,
    }) => {
        await page.goto(
            `${developerPath}&DEV_ground_obs=10,10,0,1&lat=62.4&lon=25.6&default_jump_run_direction=${axis}&default_jump_group_count=4&DEV_map_direction=${wind}&DEV_map_speed=${speed}`,
        );
        expect(
            new URL(page.url()).searchParams.get("map_run_start"),
        ).toBeNull();
        await setUniformFreefallWind(page);
        await expect(page.locator(".jump-run-jumper")).toHaveCount(4);
        const params = new URL(page.url()).searchParams;
        expect(JSON.parse(params.get("map_run_settings")).direction).toBe(
            expected,
        );
        await expectAutomaticOpeningsUpwind(page);
        // A saved placement survives reload, even before fresh winds arrive.
        const start = params.get("map_run_start");
        await page.reload();
        await setUniformFreefallWind(page);
        expect(new URL(page.url()).searchParams.get("map_run_start")).toBe(
            start,
        );
    });
}

test("manual default positioning restores the landing target and chooses direction using current average wind", async ({
    page,
}) => {
    await page.goto(
        `${developerPath}&DEV_ground_obs=10,10,0,1&lat=62.4&lon=25.6&default_jump_run_direction=180&DEV_map_direction=180`,
    );
    await setUniformFreefallWind(page);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs(
            {
                DEV_map_direction: "0",
                map_run_start: JSON.stringify({ lat: 62.41, lng: 25.61 }),
            },
            { replace: true },
        );
    });
    const position = page.getByRole("button", {
        name: "Hyppylinjan automaattinen sijoitus",
    });
    // Changing the developer wind triggers a weather refresh; restore the
    // fixture after that refresh reports the blocked network request.
    await expect(position).toBeDisabled();
    await setUniformFreefallWind(page);
    await position.click();
    expect(
        JSON.parse(new URL(page.url()).searchParams.get("map_run_settings"))
            .direction,
    ).toBe(0);
    await expectAutomaticOpeningsUpwind(page);
    await page.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
    await setUniformFreefallWind(page);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
    await position.click();
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
});

async function expectAutomaticOpeningsUpwind(page) {
    const openings = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { createJumpRunCalculator } = await import("#app/map/jumpRun.js");
        const { jumpRunCoordinates, driftCoordinates } =
            await import("#app/map/freefall.js");
        const params = new URL(location.href).searchParams;
        const settings = JSON.parse(params.get("map_run_settings"));
        const start = JSON.parse(params.get("map_run_start"));
        const group = JSON.parse(params.get("map_jumpers"));
        const calculation = createJumpRunCalculator()(
            getMapWindData().freefallWinds,
            settings,
        );
        return group.map((jumper, index) => {
            const [lat, lng] = jumpRunCoordinates(
                start,
                settings,
                index,
                calculation.velocity.ground,
            );
            return driftCoordinates(
                { lat, lng },
                calculation.drift(jumper).at(-1),
            );
        });
    });
    for (const [lat] of openings)
        expect(
            (((lat - 62.4) * Math.PI) / 180) * 6371000,
        ).toBeGreaterThanOrEqual(50);
}

for (const [description, ground] of [
    ["opposing", "10,10,180,1"],
    ["stale", "10,10,0,61"],
    ["missing", ""],
]) {
    test(`automatic placement waits for usable lower winds: ${description}`, async ({
        page,
    }) => {
        await page.goto(
            `${developerPath}&DEV_ground_obs=${ground}&lat=62.4&lon=25.6&default_jump_run_direction=0`,
        );
        await setUniformFreefallWind(page);
        const position = page.getByRole("button", {
            name: "Hyppylinjan automaattinen sijoitus",
        });
        await expect(position).toBeDisabled();
        await expect(page.locator(".automatic-run-unavailable")).toBeVisible();
        expect(
            new URL(page.url()).searchParams.get("map_run_start"),
        ).toBeNull();
        await page.evaluate(async () => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({ DEV_ground_obs: "10,10,0,0" }, { replace: true });
        });
        await setUniformFreefallWind(page);
        await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
        await expect(position).toBeEnabled();
        await expectAutomaticOpeningsUpwind(page);
    });
}
