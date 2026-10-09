import {
    readMapQuery,
    writeMapQuery,
    mapQuerySnapshot,
    installMapQueryHelpers,
} from "./map-query-helpers.js";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
    await installMapQueryHelpers(page);
});

const manualPath =
    "/dz/?fmisid=137208&icaocode=EFJY&MANUAL_ground_obs=6.4%2C3.5%2C194%2C4.8%3B6.2%2C3.7%2C193%2C14.8%3B6.1%2C4%2C194%2C24.8%3B4%2C2.8%2C200%2C34.8%3B4.4%2C2.6%2C201%2C44.8%3B4.7%2C2.9%2C199%2C54.8&MANUAL_metar=METAR+EFJY+040720Z+AUTO+19007KT+160V220+9999+-SHRA+OVC005+%2F%2F%2F%2F%2F%2FCB+11%2F11+Q1014%3D";

// Explicit manual heights keep these winds available across polling ticks.
const uniformUpperWinds = [7000, 5500, 4200, 3000, 1500, 800, 110]
    .map((height) => `10,0,${height}`)
    .join(";");

/** @param {import("@playwright/test").Page} page */
async function setUniformFreefallWind(page) {
    await page.evaluate(async () => {
        // IndexedDB hydration is asynchronous; finish startup before injecting winds.
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
        const { QUERY_PARAMS, navigateQs } =
            await import("#app/app/settings.js");
        const params = QUERY_PARAMS.value;
        // Manual-placement tests supply a station only to make the map available.
        // Explicitly clear the run so the station fallback does not place it first.
        if (!params.lat && !params.lon && !params.map_run_start_lat) {
            navigateQs(
                { ...writeMapQuery("map_run_start", null) },
                { replace: true },
            );
        }
        const { STATION_COORDINATES, OM_DATA } =
            await import("#app/weather/state.js");
        STATION_COORDINATES.value = "62.4,25.6";
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const level of [
            "400",
            "500",
            "600",
            "700",
            "850",
            "925",
            "1000",
        ]) {
            hourly[`geopotential_height_${level}hPa`] = [
                {
                    400: 7000,
                    500: 5500,
                    600: 4200,
                    700: 3000,
                    850: 1500,
                    925: 800,
                    1000: 110,
                }[level],
            ];
            hourly[`windspeed_${level}hPa`] = [10];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });
}

/** @param {import("@playwright/test").Page} page */
async function middleOpening(page, landing = false) {
    return page.evaluate(async (landing) => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getCanopyDrift } = await import("#app/map/canopy.js");
        const {
            jumpRunCoordinates,
            getFreefallDrift,
            driftCoordinates,
            getJumpRunVelocity,
        } = await import("#app/map/freefall.js");
        const { latLng } = await import("leaflet");
        const params = new URL(location.href).searchParams;
        const settings = readMapQuery(
            Object.fromEntries(params),
            "map_run_settings",
        );
        const start = readMapQuery(Object.fromEntries(params), "map_run_start");
        const jumpers = readMapQuery(Object.fromEntries(params), "map_jumpers");
        const { freefallWinds: winds, canopyWinds } = getMapWindData();
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
                const opening = latLng(
                    driftCoordinates(exit, path[path.length - 1]),
                );
                const canopy = landing
                    ? getCanopyDrift(canopyWinds, jumper.openingHeight)?.at(-1)
                    : null;
                return canopy
                    ? latLng(driftCoordinates(opening, canopy))
                    : opening;
            },
        );
        const opening = latLng(
            (openings[0].lat + openings[1].lat) / 2,
            (openings[0].lng + openings[1].lng) / 2,
        );
        return { lat: opening.lat, lng: opening.lng };
    }, landing);
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {{ lat: number, lng: number }} target
 */
async function openingDistance(page, target, landing = false) {
    const opening = await middleOpening(page, landing);
    return page.evaluate(
        async ({ opening, target }) => {
            const { latLng } = await import("leaflet");
            return latLng(opening).distanceTo(target);
        },
        { opening, target },
    );
}

/** @param {import("@playwright/test").Page} page */
async function runCenter(page) {
    return page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { jumpRunCoordinates, getJumpRunVelocity } =
            await import("#app/map/freefall.js");
        const params = new URL(location.href).searchParams;
        const settings = readMapQuery(
            Object.fromEntries(params),
            "map_run_settings",
        );
        const start = readMapQuery(Object.fromEntries(params), "map_run_start");
        const jumpers = readMapQuery(Object.fromEntries(params), "map_jumpers");
        const velocity = getJumpRunVelocity(
            getMapWindData().freefallWinds,
            settings,
        );
        const [lat, lng] = jumpRunCoordinates(
            start,
            settings,
            (jumpers.length - 1) / 2,
            velocity.ground,
        );
        return { lat, lng };
    });
}

/** @param {import("@playwright/test").Page} page @param {{ lat: number, lng: number }} target */
async function runCenterDistance(page, target) {
    const center = await runCenter(page);
    return page.evaluate(
        async ({ center, target }) => {
            const { latLng } = await import("leaflet");
            return latLng(center).distanceTo(target);
        },
        { center, target },
    );
}

/** Keep the pivot visible when testing pointer gestures around it. */
async function centerMapOn(page, target) {
    await page.evaluate(async (target) => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs(
            {
                map_center_lat: String(target.lat),
                map_center_lon: String(target.lng),
            },
            { replace: true },
        );
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
    }, target);
}

/** Position of a geographic endpoint in the map's container, independent of run controls. */
async function mapPoint(page, coordinates) {
    return page.locator(".dz-map").evaluate(async (element, coordinates) => {
        const { CRS, latLng } = await import("leaflet");
        const params = new URL(location.href).searchParams;
        const zoom = Number(params.get("map_zoom"));
        const center = latLng(
            Number(params.get("map_center_lat")),
            Number(params.get("map_center_lon")),
        );
        const offset = CRS.EPSG3857.latLngToPoint(
            latLng(coordinates),
            zoom,
        ).subtract(CRS.EPSG3857.latLngToPoint(center, zoom));
        return {
            x: element.clientWidth / 2 + offset.x,
            y: element.clientHeight / 2 + offset.y,
        };
    }, coordinates);
}

const directionControls = {
    drag: "Kierrä vetämällä",
    intoWind: "Käännä valittuun tuuleen",
    clockwise: "Kierrä 90° oikealle",
    counterclockwise: "Kierrä 90° vasemmalle",
    reset: "Palauta oletussuunta",
};

/** @param {import("@playwright/test").Page} page */
function directionMenu(page) {
    return page.locator("#jump-run-direction-menu");
}

/** @param {import("@playwright/test").Page} page */
function directionTrigger(page) {
    return page.getByRole("button", {
        name: "Hyppylinjan suunta",
        exact: true,
    });
}

/**
 * Direction actions stay in the menu, including while it is closed.
 * @param {import("@playwright/test").Page} page
 * @param {string} name
 */
function directionControl(page, name) {
    return directionMenu(page).locator("button", { hasText: name });
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} name
 */
async function clickDirection(page, name) {
    const menu = directionMenu(page);
    if (!(await menu.evaluate((element) => element.matches(":popover-open"))))
        await directionTrigger(page).click();
    await expect(menu).toBeVisible();
    await directionControl(page, name).click();
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} label
 */
function windIcon(page, label) {
    return page.locator(
        `.wind-level-icons .wind-level-choice[aria-label^="${label}:"]`,
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
    for (const level of ["400", "500", "600", "700", "850", "925", "1000"]) {
        hourly_units[`windspeed_${level}hPa`] = "m/s";
        hourly[`windspeed_${level}hPa`] = time.map(() => 12);
        hourly[`winddirection_${level}hPa`] = time.map(() => 200);
        hourly[`cloud_cover_${level}hPa`] = time.map(() => 40);
        hourly[`geopotential_height_${level}hPa`] = time.map(
            () =>
                ({
                    1000: 110,
                    925: 800,
                    850: 1500,
                    700: 3000,
                    600: 4200,
                    500: 5500,
                    400: 7000,
                })[level],
        );
    }
    return { utc_offset_seconds: 0, hourly, hourly_units };
}

test.beforeEach(async ({ page, baseURL }) => {
    // These tests use MANUAL_ values only; live weather, tiles and analytics
    // must not make their results depend on external services.
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin === new URL(baseURL).origin) {
            return route.continue();
        }
        return route.abort();
    });
    await page.goto(manualPath);
    await expect(page.getByRole("status")).toContainText(
        "Manuaalitila käytössä.",
    );
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
    });
});

test("cloud source help opens METAR and Open-Meteo explanations", async ({
    page,
}) => {
    const card = page.locator("#clouds");
    await card.getByRole("button", { name: "METAR-sanoma" }).click();
    const metarDialog = card.getByRole("dialog");
    await expect(metarDialog).toBeVisible();
    await expect(metarDialog.locator(".metar-report")).toContainText(
        "METAR EFJY",
    );
    await metarDialog
        .getByRole("button", { name: "Sulje", exact: true })
        .click();
    await expect(metarDialog).not.toBeVisible();

    const modelHelp = card.getByRole("button", {
        name: "Open-Meteo · Mallinnetut pilvet",
    });
    await modelHelp.click();
    const modelDialog = card.getByRole("dialog");
    await expect(modelDialog).toBeVisible();
    await expect(modelDialog).toContainText("Mallinnettu tarkoittaa");
    await expect(modelDialog).toContainText("ei ole pilven ala- tai yläraja");
    await expect(modelDialog).toContainText("hyppypaikan maanpinnasta");
    await expect(modelDialog).toContainText("lähimpään 100 metriin");
    await page.keyboard.press("Escape");
    await expect(modelDialog).not.toBeVisible();
    await expect(modelHelp).toBeFocused();
});

test("zero-height wind selection prefers observations and falls back to the forecast", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const groundLabel = await page.evaluate(async () => {
        const { t } = await import("#app/translations.js");
        return t("map.ground");
    });
    await expect(windIcon(page, groundLabel)).toHaveCount(1);
    await expect(windIcon(page, "≈ 0 m")).toHaveCount(0);

    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        const { LIVE_OBSERVATIONS } = await import("#app/weather/state.js");
        navigateQs({ MANUAL_ground_obs: undefined });
        await updateWeatherData();
        LIVE_OBSERVATIONS.value = [];
    });
    await setUniformFreefallWind(page);
    const heights = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        return getMapWindData().canopyWinds.map((wind) => wind.height);
    });
    // The low forecast and ground endpoint remain in the calculation profile.
    expect(heights.slice(-2)).toEqual([110, 0]);
    await expect(windIcon(page, "≈ 0 m")).toHaveCount(1);
    await expect(windIcon(page, groundLabel)).toHaveCount(0);
});

test("satellite toggle switches tiles and attribution without changing the view", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const toggle = page.getByRole("button", { name: "Satelliittikuvat" });
    const map = page.locator(".dz-map");
    const streetTiles = map.locator(
        'img.leaflet-tile[src*="tile.openstreetmap.org"]',
    );
    const satelliteTiles = map.locator(
        'img.leaflet-tile[src*="World_Imagery/MapServer/tile/"]',
    );
    const attribution = map.locator(".leaflet-control-attribution");
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(streetTiles.first()).toBeAttached();
    await expect(satelliteTiles).toHaveCount(0);
    await expect(attribution).toContainText("OpenStreetMap");
    const initialUrl = page.url();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(satelliteTiles.first()).toBeAttached();
    await expect(streetTiles).toHaveCount(0);
    await expect(attribution).toContainText("Tiles © Esri");
    await expect(attribution).not.toContainText("OpenStreetMap");
    const satelliteUrl = new URL(page.url());
    expect(satelliteUrl.searchParams.get("map_satellite")).toBe("true");
    satelliteUrl.searchParams.delete("map_satellite");
    expect(satelliteUrl.href).toBe(initialUrl);

    await page.reload();
    await setUniformFreefallWind(page);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(satelliteTiles.first()).toBeAttached();
    await expect(attribution).toContainText("Tiles © Esri");

    // Recreating the map keeps the selected imagery and cleans up safely.
    await page.evaluate(async () => {
        const { STATION_COORDINATES } = await import("#app/weather/state.js");
        STATION_COORDINATES.value = "62.5,25.7";
    });
    await expect(satelliteTiles.first()).toBeAttached();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(streetTiles.first()).toBeAttached();
    await expect(satelliteTiles).toHaveCount(0);
    await expect(attribution).toContainText("OpenStreetMap");
    await expect(attribution).not.toContainText("Esri");
    expect(new URL(page.url()).searchParams.get("map_satellite")).toBe("false");
    await page.reload();
    await setUniformFreefallWind(page);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(streetTiles.first()).toBeAttached();
    expect(errors).toEqual([]);
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

for (const { name, predefinedName } of [
    { name: "EFUT", predefinedName: "EFUT" },
    { name: "Meripuisto", predefinedName: "Meripuisto" },
    { name: undefined, predefinedName: "EFJY" },
    { name: "Custom dropzone", predefinedName: undefined },
]) {
    test(`menu reset restores ${name ?? "the ICAO name"} and clears storage before reloading`, async ({
        page,
    }) => {
        await page.evaluate(async (name) => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({ name, map_zoom: "9" });
            localStorage.setItem("saved_dzs", '[{"name":"Saved dropzone"}]');
            localStorage.setItem("language", "en");
            localStorage.setItem("cached-test-data", "old data");
        }, name);

        const expectedSearch = predefinedName
            ? await page.evaluate(async (name) => {
                  const { completeDropzones, partialDropzones, dropzoneHref } =
                      await import("#app/dropzones.js");
                  const dropzone = [
                      ...completeDropzones,
                      ...partialDropzones,
                  ].find((dz) => dz.name === name);
                  return new URL(dropzoneHref(dropzone), location.href).search;
              }, predefinedName)
            : new URL(page.url()).search;

        // Capture storage and the URL before startup can repopulate caches or
        // update the query string with map defaults.
        await page.addInitScript(() => {
            sessionStorage.setItem(
                "reset-result",
                JSON.stringify({
                    search: location.search,
                    storage: { ...localStorage },
                }),
            );
        });
        await page
            .getByRole("button", { name: "Valikko", exact: true })
            .click();
        await Promise.all([
            page.waitForEvent("load"),
            page
                .getByRole("button", { name: "Palauta oletukset", exact: true })
                .click(),
        ]);

        const result = await page.evaluate(() =>
            JSON.parse(sessionStorage.getItem("reset-result")),
        );
        expect(result).toEqual({ search: expectedSearch, storage: {} });
        await expect(page.locator("#title .title-name")).toHaveText(
            name ?? "EFJY",
        );
    });
}

test("language can be changed live and persists", async ({ page }) => {
    await page.getByRole("button", { name: "Valikko", exact: true }).click();

    await expect(
        page.getByRole("button", { name: "Suomi", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Englanti", exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
        page.getByRole("button", { name: "Menu", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
        page.getByRole("heading", { name: "Winds", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("language"))).toBe(
        "en",
    );

    await page.reload();
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "English", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const finnish = page.getByRole("button", { name: "Finnish", exact: true });
    await expect(finnish).toHaveAttribute("aria-pressed", "false");
    await finnish.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "fi");
    await expect(
        page.getByRole("button", { name: "Valikko", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Valikko", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "Suomi", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
        page.getByRole("button", { name: "Englanti", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => localStorage.getItem("language"))).toBe(
        "fi",
    );
    await page.getByRole("button", { name: "Suomi", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "Valikko", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
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

test("ground wind shows the manual readings and hourly differences", async ({
    page,
}) => {
    const metrics = page.locator("#winds .latest-wind-cell");
    await expect(metrics.nth(0).locator(".latest-value")).toHaveText(
        /^6\s*m\/s$/,
    );
    await expect(metrics.nth(0).locator(".hourly-range")).toHaveText("Δ 2 m/s");
    await expect(metrics.nth(1).locator(".latest-value")).toHaveText(
        /^4\s*m\/s$/,
    );
    await expect(metrics.nth(1).locator(".hourly-range")).toHaveText("Δ 1 m/s");
    await expect(metrics.nth(2).locator(".direction-value")).toHaveText("194°");
    await expect(metrics.nth(2).locator(".hourly-range")).toHaveText("Δ 8°");
    await expect(page.getByLabel("METAR", { exact: true })).toHaveText(
        "METAR EFJY 040720Z AUTO 19007KT 160V220 9999 -SHRA OVC005 //////CB 11/11 Q1014=",
    );
});

test("ground wind variation warnings use precise thresholds and explain the change", async ({
    page,
}) => {
    const metrics = page.locator("#winds .latest-wind-cell");
    for (const [gust, direction, warning] of [
        [9.9, 99, false],
        [10, 100, true],
        [10.1, 101, true],
    ]) {
        const params = new URLSearchParams(manualPath.split("?")[1]);
        params.set("MANUAL_ground_obs", `${gust},4,${direction},0;2,3,0,10`);
        await page.goto(`/dz/?${params}`);
        const gustWarning = metrics.nth(0).locator(".wind-variation-warning");
        const directionWarning = metrics
            .nth(2)
            .locator(".wind-variation-warning");
        await expect(gustWarning).toHaveCount(warning ? 1 : 0);
        await expect(directionWarning).toHaveCount(warning ? 1 : 0);
        if (warning) {
            await expect(gustWarning).toHaveAttribute(
                "data-tooltip",
                new RegExp(`${(gust - 2).toFixed(1)} m/s.*vähintään 8 m/s`),
            );
            await expect(directionWarning).toHaveAttribute(
                "data-tooltip",
                new RegExp(`${direction.toFixed(1)}°.*vähintään 100°`),
            );
            await gustWarning.focus();
            await expect(page.getByRole("tooltip")).toContainText(
                "Varoitusraja: vähintään 8 m/s.",
            );
            await directionWarning.focus();
            await expect(page.getByRole("tooltip")).toContainText(
                "Varoitusraja: vähintään 100°.",
            );
        }
        await expect(
            metrics.nth(1).locator(".wind-variation-warning"),
        ).toHaveCount(0);
    }
});

test("ground direction variation crosses north without a false warning", async ({
    page,
}) => {
    const params = new URLSearchParams(manualPath.split("?")[1]);
    params.set("MANUAL_ground_obs", "4,3,350,0;4,3,10,10");
    await page.goto(`/dz/?${params}`);
    const metrics = page.locator("#winds .latest-wind-cell");
    await expect(metrics.nth(0).locator(".hourly-range")).toHaveText("Δ 0 m/s");
    await expect(metrics.nth(2).locator(".hourly-range")).toHaveText("Δ 20°");
    await expect(metrics.nth(2).locator(".hourly-range")).toHaveAttribute(
        "data-tooltip",
        /viimeisen tunnin.*pienimmän kaaren.*pohjoisen ylitys/,
    );
    await expect(metrics.nth(0).locator(".hourly-range")).toHaveAttribute(
        "data-tooltip",
        /suurin lukema miinus pienin lukema/,
    );
    await expect(metrics.locator(".wind-variation-warning")).toHaveCount(0);
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
    await expect(clouds.locator(".cloud-profile-layer").last()).toContainText(
        "4200 m",
    );
    await expect(clouds.locator(".cloud-profile-layer").last()).toHaveAttribute(
        "data-tooltip",
        /^40 % · 600 hPa · /,
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
    await expect(page.locator("#errors")).toContainText("opendata.fmi.fi");
    await expect(page.locator("#errors")).not.toContainText("Ei METAR-sanomaa");
    await expect(
        page.locator(".map-navigation-controls").getByRole("button", {
            name: "Näytä sääasema",
            exact: true,
        }),
    ).toHaveCount(0);
});

test("upper wind summary follows exit height while details show every altitude", async ({
    page,
}) => {
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    await page.goto(
        "/dz/?name=Wind+DZ&lat=40.7&lon=-74&elevation=49.0728&map_run_exit_height=4000",
    );
    const rows = page.locator(".upperwinds-compact tbody tr");
    // Keep the nearest pressure surface above exit, even at an exact height above 4000 m.
    await expect(rows).toHaveCount(5);
    await expect(
        rows.first().locator(".pressure-cell [data-tooltip]"),
    ).toHaveAttribute("data-tooltip", /600 hPa/);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ map_run_exit_height: "1000", elevation: "500" });
    });
    await expect(rows).toHaveCount(4);
    await expect(
        rows.first().locator(".pressure-cell [data-tooltip]"),
    ).toHaveAttribute("data-tooltip", /700 hPa/);
    await page
        .getByRole("button", { name: "Näytä tarkat tiedot", exact: true })
        .click();
    await expect(page.locator(".upperwinds-raw tbody tr")).toHaveCount(7);
    await expect(page.locator(".upperwinds-raw .time-header")).toHaveCount(49);
    await page
        .getByRole("button", { name: "Näytä kooste", exact: true })
        .click();
    await expect(rows).toHaveCount(4);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ map_run_exit_height: "3700" });
    });
    // A surface exactly at exit is retained along with the next one above it.
    await expect(rows).toHaveCount(6);
    await expect(
        rows.first().locator(".pressure-cell [data-tooltip]"),
    ).toHaveAttribute("data-tooltip", /500 hPa/);
});

test("Open-Meteo m/s winds keep their strength in the table and jump-run calculations", async ({
    page,
}) => {
    const response = openMeteoResponse();
    response.hourly.geopotential_height_600hPa = response.hourly.time.map(
        () => 4321.4,
    );
    for (const level of ["400", "500", "600", "700", "850", "925", "1000"]) {
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
    await page.goto(
        "/dz/?name=Wind+DZ&lat=40.7&lon=-74&map_run_exit_height=8000",
    );
    const request = await requestPromise;
    expect(new URL(request.url()).searchParams.get("wind_speed_unit")).toBe(
        "ms",
    );
    expect(new URL(request.url()).searchParams.get("forecast_hours")).toBe(
        "48",
    );
    expect(new URL(request.url()).searchParams.has("forecast_days")).toBe(
        false,
    );
    const fields = new URL(request.url()).searchParams.get("hourly").split(",");
    for (const pressure of [400, 500]) {
        expect(fields).toContain(`windspeed_${pressure}hPa`);
        expect(fields).toContain(`winddirection_${pressure}hPa`);
        expect(fields).toContain(`geopotential_height_${pressure}hPa`);
    }
    await expect(windIcon(page, "≈ 4500 m")).toHaveAttribute(
        "aria-label",
        /10 m\/s 270°/,
    );
    await expect(
        page.locator(".upperwinds-compact .wind-speed").first(),
    ).toHaveText("10 m/s");

    const summaryAltitude = page
        .locator(".upperwinds-compact .pressure-cell [data-tooltip]")
        .nth(2);
    await expect(summaryAltitude).toHaveText("4500 m");
    await summaryAltitude.focus();
    await expect(page.getByRole("tooltip")).toContainText("4321 m");
    await page.keyboard.press("Escape");
    await page
        .getByRole("button", { name: "Näytä tarkat tiedot", exact: true })
        .click();
    const rawAltitude = page
        .locator(".upperwinds-raw .pressure-cell [data-tooltip]")
        .nth(2);
    await expect(rawAltitude).toHaveText("4500 m");
    await rawAltitude.focus();
    await expect(page.getByRole("tooltip")).toContainText("4321 m");
    await page.keyboard.press("Escape");
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
    expect(result.speeds).toEqual([10, 10, 10, 10, 10, 10, 10]);
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
    for (const level of ["400", "500", "600", "700", "850", "925", "1000"])
        cached.hourly_units[`windspeed_${level}hPa`] = "km/h";
    await page.goto("/?no_redirect=1");
    await page.evaluate(async (cached) => {
        const { saveResponseCache } =
            await import("#app/shared/responseCache.js");
        await saveResponseCache("hyppykeli:response:v1:open-meteo:40.7,-74", {
            data: cached,
            hasData: true,
            fetchedAt: Date.now(),
            lastAttemptAt: Date.now(),
            measurementAt: null,
        });
    }, cached);
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    const requestPromise = page.waitForRequest("https://api.open-meteo.com/**");
    await page.goto("/dz/?name=Wind+DZ&lat=40.7&lon=-74");
    await requestPromise;
    await expect(windIcon(page, "≈ 4000 m")).toHaveAttribute(
        "aria-label",
        /12 m\/s 200°/,
    );
    const units = await page.evaluate(async () => {
        const { readResponseCache } =
            await import("#app/shared/responseCache.js");
        return (
            await readResponseCache("hyppykeli:response:v1:open-meteo:40.7,-74")
        ).data.hourly_units;
    });
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
        MANUAL_metar: "METAR KJFK 041200Z 18010G15KT 9999 FEW020 10/05 Q1014=",
    });
    await page.goto(`/dz/?${params}`);

    await expect(page.locator("#winds .source-note")).toHaveText(
        "Lähde: METAR",
    );
    await expect(page.locator("#observations-graph")).toHaveCount(0);
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
            MANUAL_metar:
                "METAR KJFK 041200Z 18010G15KT 9999 FEW020 10/05 Q1014=",
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
    await page.route("https://opendata.fmi.fi/**", (route) =>
        route.fulfill({
            contentType: "application/xml",
            path: new URL(route.request().url()).searchParams
                .get("storedquery_id")
                .includes("observations")
                ? "tests/fixtures/observations.xml"
                : "tests/fixtures/forecast.xml",
        }),
    );
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: openMeteoResponse() }),
    );
    let roadRequests = 0;
    page.on("request", (request) => {
        if (request.url().startsWith("https://tie.digitraffic.fi/"))
            roadRequests++;
    });
    await page.goto("/dz/?fmisid=101191&roadsid=5004");

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

    await page.goto("/dz/?fmisid=101191&lat=60.91&lon=26.95");
    const stationMarker = page.getByRole("button", {
        name: "FMI sääasema - Kouvola Utti lentoasema",
        exact: true,
    });
    await expect(stationMarker).toBeVisible();
    const callout = page.locator("#dropzone-map .weather-station-callout");
    await expect(callout).toHaveCount(0);
    await stationMarker.click();
    await expect(callout).toContainText(
        "FMI sääasema - Kouvola Utti lentoasema",
    );
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
    const stationMarker = page.getByRole("button", {
        name: "Fintraffic sääasema - Tieasema",
        exact: true,
    });
    await expect(stationMarker).toBeVisible();
    await expect(callout).toHaveCount(0);
    await stationMarker.hover();
    await expect(callout).toHaveCount(0);
    await stationMarker.click();
    await expect(callout).toContainText("Fintraffic sääasema - Tieasema");
    await expect(callout).toContainText("Etäisyys laskeutumisalueelle: 1.2 km");
    await callout.getByRole("button", { name: "Close popup" }).click();
    await expect(callout).toHaveCount(0);
    await stationMarker.focus();
    await stationMarker.press("Enter");
    await expect(callout).toContainText("Fintraffic sääasema - Tieasema");
    const locations = await page.evaluate(async () => {
        const { FORECAST_COORDINATES, STATION_COORDINATES } =
            await import("#app/weather/state.js");
        return {
            landing: FORECAST_COORDINATES.value,
            station: STATION_COORDINATES.value,
        };
    });
    expect(locations).toEqual({ landing: "60.21,24.91", station: "60.2,24.9" });

    await expect(page.locator("#info")).toContainText(
        /Havaintotiedot haettu havaintoasemalta Tieasema \(Digitraffic\)\.\s+Etäisyys havaintoasemalle 1\.2 km\.\s+Ennuste on tehty alueelle/,
    );
    const stationLink = page.locator("#info").getByRole("link", {
        name: "Tieasema (Digitraffic)",
        exact: true,
    });
    await expect(stationLink).toHaveAttribute("href", "#dropzone-map");
    await page.evaluate(async () => {
        const { Map, Marker } = await import("leaflet");
        window.stationNavigationEvents = [];
        document
            .querySelector("#info a[href='#dropzone-map']")
            .addEventListener(
                "click",
                () => {
                    window.stationNavigationEvents = [];
                },
                { capture: true },
            );
        document.addEventListener("scrollend", () => {
            window.stationNavigationEvents.push("scrollend");
        });
        const flyTo = Map.prototype.flyTo;
        const fire = Map.prototype.fire;
        Map.prototype.fire = function (type, ...args) {
            if (type === "moveend")
                window.stationNavigationEvents.push("moveend");
            return fire.call(this, type, ...args);
        };
        const openPopup = Marker.prototype.openPopup;
        Marker.prototype.openPopup = function (...args) {
            window.stationNavigationEvents.push("openPopup");
            return openPopup.apply(this, args);
        };
        Map.prototype.flyTo = function (...args) {
            window.stationNavigationEvents.push("flyTo");
            return flyTo.apply(this, args);
        };
    });
    await stationLink.click();
    await expect
        .poll(() => {
            const params = new URL(page.url()).searchParams;
            return {
                lat: Number(params.get("map_center_lat")),
                lng: Number(params.get("map_center_lon")),
                zoom: Number(params.get("map_zoom")),
            };
        })
        .toEqual({ lat: 60.2, lng: 24.9, zoom: 15 });
    await expect(callout).toBeVisible();
    const events = await page.evaluate(() => window.stationNavigationEvents);
    expect(events.indexOf("scrollend")).toBeGreaterThanOrEqual(0);
    expect(events.indexOf("flyTo")).toBeGreaterThan(
        events.indexOf("scrollend"),
    );
    expect(events.indexOf("moveend")).toBeGreaterThan(events.indexOf("flyTo"));
    expect(events.indexOf("openPopup")).toBeGreaterThan(
        events.indexOf("moveend"),
    );
    await expect
        .poll(() =>
            page.locator("#dropzone-map .dz-map").evaluate((element) => {
                const bounds = element.getBoundingClientRect();
                return bounds.top < innerHeight && bounds.bottom > 0;
            }),
        )
        .toBe(true);
    await callout.getByRole("button", { name: "Close popup" }).click();
    await centerMapOn(page, { lat: 60.21, lng: 24.91 });
    const stationButton = page
        .locator(".map-navigation-controls")
        .getByRole("button", {
            name: "Näytä sääasema",
            exact: true,
        });
    await expect(stationButton).toBeEnabled();
    await expect(stationButton).toHaveAttribute(
        "data-tooltip",
        "Näytä sääasema",
    );
    await page.evaluate(() => {
        const scrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (...args) {
            window.stationNavigationEvents.push("scrollIntoView");
            return scrollIntoView.apply(this, args);
        };
        document
            .querySelector(
                ".map-navigation-controls button[aria-label='Näytä sääasema']",
            )
            .addEventListener(
                "click",
                () => {
                    window.stationNavigationEvents = [];
                },
                { capture: true },
            );
    });
    await stationButton.click();
    await expect(callout).toBeVisible();
    await expect(callout).toContainText("Fintraffic sääasema - Tieasema");
    await expect
        .poll(() => {
            const params = new URL(page.url()).searchParams;
            return [
                Number(params.get("map_center_lat")),
                Number(params.get("map_center_lon")),
            ];
        })
        .toEqual([60.2, 24.9]);
    const buttonEvents = await page.evaluate(
        () => window.stationNavigationEvents,
    );
    expect(buttonEvents).not.toContain("scrollIntoView");
    expect(buttonEvents.indexOf("flyTo")).toBeGreaterThanOrEqual(0);
    expect(buttonEvents.indexOf("openPopup")).toBeGreaterThan(
        buttonEvents.indexOf("flyTo"),
    );
});

test("METAR cloud layers expose descriptions and original feet in tooltips", async ({
    page,
}) => {
    const metar =
        "METAR EFJY 041200Z 19007KT 9999 FEW005 SCT015 BKN030CB OVC060 11/08 Q1014=";
    const params = new URLSearchParams(manualPath.split("?")[1]);
    params.set("MANUAL_metar", metar);
    await page.goto(`/dz/?${params}`);
    const card = page.locator("#clouds");
    const layers = card.locator(".cloud-layer");
    await expect(layers).toHaveCount(4);
    const tooltips = [
        "Muutamia · Pilven alaraja: 500 ft",
        "Hajanaisia · Pilven alaraja: 1500 ft",
        "Rakoileva · Pilven alaraja: 3000 ft",
        "Täysi pilvikatto · Pilven alaraja: 6000 ft",
    ];
    for (const [index, tooltip] of tooltips.entries()) {
        await layers.nth(index).focus();
        await expect(page.getByRole("tooltip")).toHaveText(tooltip);
        await page.keyboard.press("Escape");
    }
    await expect(
        layers.getByRole("img", { name: "Ukkospilviä", exact: true }),
    ).toHaveCount(1);
    await expect(
        layers.nth(2).getByRole("img", { name: "Ukkospilviä", exact: true }),
    ).toBeVisible();
    await card.getByRole("button", { name: "METAR-sanoma" }).click();
    await expect(card.getByLabel("METAR", { exact: true })).toHaveText(metar);
});

test("METAR help explains the current report and closes with Escape", async ({
    page,
}) => {
    const card = page.locator("#clouds");
    const trigger = card.getByRole("button", {
        name: "METAR-sanoma",
    });
    await trigger.click();
    const dialog = card.locator("dialog[open]");
    await expect(dialog.getByLabel("METAR", { exact: true })).toHaveText(
        "METAR EFJY 040720Z AUTO 19007KT 160V220 9999 -SHRA OVC005 //////CB 11/11 Q1014=",
    );
    const group = (code) =>
        dialog.locator(".metar-group").filter({
            has: page.locator("dt", { hasText: new RegExp(`^${code}$`) }),
        });
    await expect(group("EFJY")).toContainText("ICAO-tunnus: EFJY");
    await expect(group("040720Z")).toContainText("07:20 UTC");
    await expect(group("19007KT")).toContainText("7 kt");
    await expect(group("160V220")).toContainText("160–220°");
    await expect(group("9999")).toContainText("vähintään 10 km");
    await expect(group("-SHRA")).toContainText("kuuroja");
    await expect(group("-SHRA")).toContainText("vesisade");
    await expect(group("OVC005")).toContainText("500 ft");
    await expect(group("//////CB")).toContainText("CB tarkoittaa");
    await expect(group("11/11")).toContainText("11 / 11 °C");
    await expect(group("Q1014")).toContainText("1014 hPa");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.evaluate(async () => {
        const { setLanguage } = await import("#app/translations.js");
        setLanguage("en");
    });
    await card.getByRole("button", { name: "METAR report" }).click();
    await expect(card.locator("dialog[open]")).toContainText("SH: showers");
    await expect(card.locator("dialog[open]")).toContainText(
        "above the reporting aerodrome",
    );
    await card
        .locator("dialog[open]")
        .getByRole("button", { name: "Close", exact: true })
        .click();
    await expect(card.locator("dialog[open]")).toHaveCount(0);
});

test("METAR explanations preserve unfamiliar groups and decode international variants", async ({
    page,
}) => {
    const sections = await page.evaluate(async () => {
        const { setLanguage } = await import("#app/translations.js");
        const { explainMetar } = await import("#app/weather/MetarHelp.js");
        setLanguage("en");
        return explainMetar(
            "SPECI COR KJFK 041200Z VRB03G15KT 1 1/2SM R04L/0600U BKN030TCU M02/M05 A2992 RERA TEMPO FM1230 00000KT CAVOK MYSTERY RMK AO2=",
        );
    });
    const description = (code) =>
        sections.find((section) => section.code === code)?.description;
    expect(description("SPECI")).toContain("special report");
    expect(description("COR")).toContain("Corrected");
    expect(description("VRB03G15KT")).toContain("variable wind direction");
    expect(description("VRB03G15KT")).toContain("gusts up to 15 kt");
    expect(description("1 1/2SM")).toContain("statute miles");
    expect(description("R04L/0600U")).toContain("Runway visual range");
    expect(description("BKN030TCU")).toContain("3000 ft");
    expect(description("BKN030TCU")).toContain("towering cumulus");
    expect(description("M02/M05")).toContain("-2 / -5 °C");
    expect(description("A2992")).toContain("29.92 inHg");
    expect(description("RERA")).toContain("recent weather");
    expect(description("TEMPO")).toContain("temporary conditions");
    expect(description("FM1230")).toContain("FM = from");
    expect(description("00000KT")).toContain("calm wind");
    expect(description("CAVOK")).toContain("no CB or TCU");
    expect(description("MYSTERY")).toContain("not decoded");
    expect(description("RMK AO2 =")).toContain("supplementary remarks");
});

test("CAVOK exposes its clear-weather explanation in a tooltip", async ({
    page,
}) => {
    const params = new URLSearchParams(manualPath.split("?")[1]);
    params.set("MANUAL_metar", "METAR EFJY 041200Z 00000KT CAVOK 10/05 Q1014=");
    await page.goto(`/dz/?${params}`);
    const clear = page.locator("#clouds .cloud-clear");
    await clear.focus();
    await expect(page.getByRole("tooltip")).toHaveText(
        "Ei pilviä alle 1500M (CAVOK)",
    );
});

test("unlocated thunderclouds expose wind-change and unknown-height help in a tooltip", async ({
    page,
}) => {
    const cb = page
        .locator("#clouds")
        .getByRole("img", { name: "Ukkospilviä" });
    await cb.focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
        "äkillisiä muutoksia tuulen nopeudessa ja suunnassa",
    );
    await expect(tooltip).toContainText(
        "Havainto ei kerro ukkospilvien peittävyyttä tai korkeutta.",
    );
});

test("obscured sky METAR exposes original vertical visibility in its tooltip", async ({
    page,
}) => {
    const params = new URLSearchParams(manualPath.split("?")[1]);
    params.set(
        "MANUAL_metar",
        "METAR EFJY 041200Z 00000KT 0200 FG VV002 08/08 Q1014=",
    );
    await page.goto(`/dz/?${params}`);
    const layer = page.locator("#clouds .cloud-layer");
    await expect(layer).toHaveCount(1);
    await layer.focus();
    await expect(page.getByRole("tooltip")).toHaveText(
        "SUMUA PERKELE · Pystynäkyvyys: 200 ft",
    );
});

test("manual banner opens the editor, applies METAR changes and restores live data", async ({
    page,
}) => {
    const banner = page.locator(".developer-banner");
    const edit = banner.getByRole("button", { name: "Muokkaa", exact: true });
    await expect(edit).toHaveAttribute("aria-controls", "developer-mode");
    await edit.click();

    const editor = page.getByRole("dialog", {
        name: "Manuaalitila",
        exact: true,
    });
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("checkbox")).toHaveCount(0);
    const metarInput = editor.getByRole("textbox", { name: "METAR-teksti" });
    const query = editor.getByRole("region", { name: "Kyselymerkkijono" });
    await expect(query).toContainText('"fmisid": "137208"');
    await expect(query).toContainText('"MANUAL_ground_obs"');
    await expect(metarInput).toHaveValue(
        new URL(page.url()).searchParams.get("MANUAL_metar"),
    );
    const metar =
        "METAR EFJY 041200Z 19007KT 9999 FEW005 SCT015 BKN030CB OVC060 11/08 Q1014=";
    await metarInput.fill(metar);
    await expect(query).toContainText(metar);
    await expect(page).toHaveURL(
        (url) => url.searchParams.get("MANUAL_metar") === metar,
    );
    await expect(page.locator("#clouds .map-cloud-height")).toHaveText([
        "200 m",
        "500 m",
        "900 m",
        "1800 m",
    ]);
    await editor.getByRole("button", { name: "Sulje", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await expect(edit).toBeFocused();

    await page.getByRole("button", { name: "Valikko", exact: true }).click();
    await page
        .locator(".side-menu")
        .getByRole("button", { name: "Manuaalitila", exact: true })
        .click();
    await expect(editor).toBeVisible();
    await expect(metarInput).toHaveValue(metar);
    await expect(page.locator("#developer-mode")).toHaveCount(1);

    await editor.getByRole("button", { name: "Sulje", exact: true }).click();
    await banner.getByRole("button", { name: "Palauta oikeat tiedot" }).click();
    await expect(page).toHaveURL(
        (url) =>
            ![...url.searchParams.keys()].some((key) =>
                key.startsWith("MANUAL_"),
            ) &&
            url.searchParams.get("fmisid") === "137208" &&
            url.searchParams.get("icaocode") === "EFJY",
    );
    await expect(banner).toHaveCount(0);
});

test("jump-run settings share the editable wind table with manual mode", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const params = () => new URL(page.url()).searchParams;
    const ground = params().get("MANUAL_ground_obs");
    const metar = params().get("MANUAL_metar");
    const readDrift = () =>
        page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const { getFreefallDrift } = await import("#app/map/freefall.js");
            return getFreefallDrift(getMapWindData().freefallWinds)?.at(-1);
        });
    const original = await readDrift();
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const openSettings = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    await openSettings.click();
    const section = settings.locator(":scope > section:last-child");
    const table = section.locator(".jump-run-wind-table");
    await expect(table.locator("tbody tr")).toHaveCount(7);
    await expect(section).toContainText(
        "Tuulet vaikuttavat lentokoneen maanopeuteen sekä arvioituun ajautumiseen vapaapudotuksessa ja varjon varassa.",
    );
    const speed = table.locator('[name="MANUAL_upper_winds_2_speed"]');
    await expect(speed).toHaveAttribute("placeholder", "10.0");
    await speed.fill("20");
    expect(await readDrift()).not.toEqual(original);
    const saved = params().get("MANUAL_upper_winds");
    const direction = table.locator('[name="MANUAL_upper_winds_2_direction"]');
    await direction.fill("361");
    await expect(section.getByRole("alert")).toBeVisible();
    expect(params().get("MANUAL_upper_winds")).toBe(saved);
    await direction.locator("..").getByRole("button").click();
    await expect(section.getByRole("alert")).toHaveCount(0);
    expect(await readDrift()).toBeDefined();
    await expect(direction).toHaveAttribute("placeholder", "0");
    await direction.fill("0");
    await settings.getByRole("button", { name: "Sulje", exact: true }).click();
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const manual = page.locator("#developer-mode");
    const manualSpeed = manual.locator('[name="MANUAL_upper_winds_2_speed"]');
    await expect(manualSpeed).toHaveValue("20");
    await manualSpeed.fill("24");
    const upper = params().get("MANUAL_upper_winds");
    await manual.locator('[name="MANUAL_ground_obs_0_gust"]').fill("8");
    expect(params().get("MANUAL_upper_winds")).toBe(upper);
    await manual.getByRole("button", { name: "Sulje", exact: true }).click();
    await openSettings.click();
    await expect(speed).toHaveValue("24");
    await setUniformFreefallWind(page);
    await section
        .getByRole("button", { name: "Palauta ennustetuulet" })
        .click();
    await expect(settings).toBeVisible();
    await expect(speed).toHaveValue("");
    await expect(speed).toHaveAttribute("placeholder", "10.0");
    expect(params().has("MANUAL_upper_winds")).toBe(false);
    expect(params().get("MANUAL_metar")).toBe(metar);
    expect(params().get("MANUAL_ground_obs")).not.toBe(ground);
});

test("old wind formats are ignored and editing creates seven ground-relative rows", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    for (const saved of [
        "42,0;30,0;15,0;8,0;1.1,0",
        "42,0,4200;30,0,3000;15,0,1500;8,0,800;1.1,0,110",
        Array(7).fill("42,0").join(";"),
    ]) {
        const result = await page.evaluate(async (saved) => {
            const { navigateQs } = await import("#app/app/settings.js");
            const { parseUpperWinds } =
                await import("#app/manual/overrides.js");
            const { getMapWindData } = await import("#app/map/windData.js");
            navigateQs({ MANUAL_upper_winds: saved });
            return {
                parsed: parseUpperWinds(saved),
                winds: getMapWindData().freefallWinds.map(
                    ({ height, speed }) => ({ height, speed }),
                ),
            };
        }, saved);
        expect(result.parsed).toBeUndefined();
        expect(result.winds).toEqual(
            [7000, 5500, 4200, 3000, 1500, 800, 110].map((height) => ({
                height,
                speed: 10,
            })),
        );
    }
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const table = page.locator(".developer-upper-winds");
    const speed = table.locator('[name="MANUAL_upper_winds_2_speed"]');
    await expect(speed).toHaveValue("");
    await expect(speed).toHaveAttribute("placeholder", "10.0");
    await speed.fill("22");
    expect(new URL(page.url()).searchParams.get("MANUAL_upper_winds")).toBe(
        ",,;,,;22,,;,,;,,;,,;,,",
    );
});

test("partial manual winds and capture preserve model-terrain exclusions", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        navigateQs({ elevation: "200" });
        OM_DATA.value = {
            ...OM_DATA.value,
            elevation: 300,
            hourly: {
                ...OM_DATA.value.hourly,
                geopotential_height_1000hPa: [250],
            },
        };
    });
    const read = () =>
        page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const { getCanopyDrift } = await import("#app/map/canopy.js");
            const data = getMapWindData();
            return {
                levels: data.freefallWinds.map((wind) => wind.id),
                canopy: getCanopyDrift(data.canopyWinds, 800)?.at(-1),
            };
        });
    const original = await read();
    expect(original.levels).not.toContain("1000");
    expect(original.canopy).toBeDefined();
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const editor = page.locator("#developer-mode");
    await editor.locator('[name="MANUAL_upper_winds_2_speed"]').fill("20");
    expect(await read()).toEqual(original);
    await editor
        .getByRole("button", {
            name: "Tallenna nykyiset arvot manuaaliarvoiksi",
        })
        .click();
    expect(await read()).toEqual(original);
    const height = editor.locator('[name="MANUAL_upper_winds_6_height"]');
    await expect(height).toHaveJSProperty("placeholder", "");
    // An explicit measurement can supply a level independently of model terrain.
    await height.fill("50");
    expect((await read()).levels).toContain("1000");
    await height.fill("");
    expect(await read()).toEqual(original);
});

for (const source of ["metar", "openmeteo", "stale-station"]) {
    test(`ground editor does not offer unavailable observation defaults (${source})`, async ({
        page,
    }) => {
        await expect
            .poll(() =>
                page.evaluate(
                    async () =>
                        (await import("#app/weather/state.js")).LOADING.value,
                ),
            )
            .toBe(0);
        const original = await page.evaluate(async (source) => {
            const { navigateQs, QUERY_PARAMS } =
                await import("#app/app/settings.js");
            const {
                LIVE_OBSERVATIONS,
                OPEN_METEO_CURRENT,
                LATEST_OBSERVATION,
            } = await import("#app/weather/state.js");
            navigateQs({
                MANUAL_ground_obs: undefined,
                MANUAL_metar:
                    source === "metar"
                        ? QUERY_PARAMS.value.MANUAL_metar
                        : undefined,
            });
            const { updateWeatherData } =
                await import("#app/weather/refresh.js");
            await updateWeatherData();
            const reading = {
                time: new Date(),
                gust: 8,
                speed: 5,
                direction: 180,
            };
            LIVE_OBSERVATIONS.value =
                source === "stale-station"
                    ? [
                          {
                              ...reading,
                              source: "fmi",
                              time: new Date(Date.now() - 2 * 3600000),
                          },
                      ]
                    : [];
            OPEN_METEO_CURRENT.value = { ...reading, source: "openmeteo" };
            const latest = LATEST_OBSERVATION.value;
            return { speed: latest.speed, direction: latest.direction };
        }, source);
        await page
            .getByRole("button", { name: "Valikko", exact: true })
            .click();
        await page
            .locator(".side-menu")
            .getByRole("button", { name: "Manuaalitila", exact: true })
            .click();
        const editor = page.locator("#developer-mode");
        const gust = editor.locator('[name="MANUAL_ground_obs_0_gust"]');
        const speed = editor.locator('[name="MANUAL_ground_obs_0_speed"]');
        const direction = editor.locator(
            '[name="MANUAL_ground_obs_0_direction"]',
        );
        for (const input of [gust, speed, direction]) {
            await expect(input).toHaveValue("");
            await expect(input).toHaveJSProperty("placeholder", "");
        }
        await gust.fill("9");
        await speed.fill("7");
        await speed.locator("..").getByRole("button").click();
        await expect(speed).toHaveJSProperty("placeholder", "");
        expect(
            await page.evaluate(async () => {
                const { OBSERVATIONS } = await import("#app/weather/state.js");
                return OBSERVATIONS.value[0].speed;
            }),
        ).toBeUndefined();
        await gust.locator("..").getByRole("button").click();
        expect(new URL(page.url()).searchParams.has("MANUAL_ground_obs")).toBe(
            false,
        );
        expect(
            await page.evaluate(async () => {
                const { LATEST_OBSERVATION } =
                    await import("#app/weather/state.js");
                const { speed, direction } = LATEST_OBSERVATION.value;
                return { speed, direction };
            }),
        ).toEqual(original);
    });
}

test("higher forecast levels supply exit winds and drift at 6000 metres", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const result = await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const { navigateQs } = await import("#app/app/settings.js");
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getFreefallDrift, getWindAtHeight, getJumpRunVelocity } =
            await import("#app/map/freefall.js");
        const settings = {
            exitHeight: 6000,
            direction: 0,
            speedKmh: 180,
            separationSeconds: 5,
        };
        navigateQs({ ...writeMapQuery("map_run_settings", settings) });
        OM_DATA.value.hourly.windspeed_400hPa = [30];
        OM_DATA.value.hourly.winddirection_400hPa = [270];
        OM_DATA.value.hourly.windspeed_500hPa = [20];
        OM_DATA.value.hourly.winddirection_500hPa = [90];
        const { freefallWinds: winds, averageWind } = getMapWindData();
        const lower = winds.filter((wind) => wind.height <= 4200);
        return {
            heights: winds.map((wind) => wind.height),
            exit: getWindAtHeight(winds, 6000),
            top: getWindAtHeight(winds, 7000),
            drift: getFreefallDrift(winds, 6000)?.at(-1),
            lowerDrift: getFreefallDrift(lower, 6000)?.at(-1),
            velocity: getJumpRunVelocity(winds, settings),
            averageWind,
        };
    });
    expect(result.heights).toEqual([7000, 5500, 4200, 3000, 1500, 800, 110]);
    expect(result.exit.east).toBeCloseTo(-20);
    expect(result.top.east).toBeCloseTo(30);
    expect(result.drift.east).not.toBeCloseTo(result.lowerDrift.east);
    expect(result.velocity.air.east).toBeCloseTo(20);
    expect(result.averageWind.label).toBe("≈ 6000-1000 m");
});

test("below-ground wind defaults remain visible and are excluded from drift", async ({
    page,
}) => {
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "200" });
    });
    await setUniformFreefallWind(page);
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const editor = page.locator("#developer-mode");
    const height = editor.locator('[name="MANUAL_upper_winds_6_height"]');
    const speed = editor.locator('[name="MANUAL_upper_winds_6_speed"]');
    await expect(height).toHaveValue("");
    await expect(height).toHaveAttribute("placeholder", "-90");
    await expect(speed).toHaveAttribute("placeholder", "10.0");
    await expect(editor).toContainText(
        "Maanpinnan tasolla tai sen alapuolella olevia rivejä ei käytetä ajautumislaskennassa.",
    );
    const read = () =>
        page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const data = getMapWindData();
            return {
                freefall: data.freefallWinds.map((wind) => wind.height),
                canopy: data.canopyWinds.map((wind) => wind.height),
            };
        });
    const original = await read();
    await editor
        .getByRole("button", {
            name: "Tallenna nykyiset arvot manuaaliarvoiksi",
        })
        .click();
    expect(
        new URL(page.url()).searchParams
            .get("MANUAL_upper_winds")
            .split(";")[6],
    ).toBe("10,0,-90");
    expect(await read()).toEqual(original);
    await page.reload();
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    await expect(height).toHaveValue("-90");
    expect(await read()).toEqual(original);
    await height.fill("100");
    expect((await read()).canopy).toEqual([
        ...original.canopy.slice(0, -1),
        100,
        0,
    ]);
});

test("manual table resets restore only their live values and keep the dialog open", async ({
    page,
}) => {
    await expect
        .poll(() =>
            page.evaluate(
                async () =>
                    (await import("#app/weather/state.js")).LOADING.value,
            ),
        )
        .toBe(0);
    await setUniformFreefallWind(page);
    await page.evaluate(async () => {
        const { LIVE_OBSERVATIONS } = await import("#app/weather/state.js");
        LIVE_OBSERVATIONS.value = [
            {
                source: "fmi",
                time: new Date(),
                gust: 3,
                speed: 2,
                direction: 180,
            },
        ];
    });
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const editor = page.locator("#developer-mode");
    const speed = editor.locator('[name="MANUAL_upper_winds_2_speed"]');
    const gust = editor.locator('[name="MANUAL_ground_obs_0_gust"]');
    const params = () => new URL(page.url()).searchParams;
    const metar = params().get("MANUAL_metar");
    await speed.fill("20");
    await gust.fill("99");
    const ground = params().get("MANUAL_ground_obs");
    await speed.fill("-1");
    await setUniformFreefallWind(page);
    await editor.getByRole("button", { name: "Palauta ennustetuulet" }).click();
    await expect(editor).toBeVisible();
    await expect(speed).toHaveValue("");
    await expect(speed).toHaveAttribute("placeholder", "10.0");
    await expect(gust).toHaveValue("99");
    expect(params().has("MANUAL_upper_winds")).toBe(false);
    expect(params().get("MANUAL_ground_obs")).toBe(ground);
    expect(params().get("MANUAL_metar")).toBe(metar);
    // Editing the other table must not reapply a reset override.
    await gust.fill("98");
    expect(params().has("MANUAL_upper_winds")).toBe(false);
    await speed.fill("21");
    const upper = params().get("MANUAL_upper_winds");
    await gust.fill("-1");
    await page.evaluate(async () => {
        const { LIVE_OBSERVATIONS } = await import("#app/weather/state.js");
        LIVE_OBSERVATIONS.value = [
            {
                source: "fmi",
                time: new Date(),
                gust: 3.4,
                speed: 2.6,
                direction: 180.5,
            },
        ];
    });
    await editor
        .getByRole("button", { name: "Palauta oikeat havainnot" })
        .click();
    await expect(editor).toBeVisible();
    await expect(gust).toHaveValue("");
    await expect(gust).toHaveAttribute("placeholder", "3.4");
    await expect(
        editor.locator('[name="MANUAL_ground_obs_0_speed"]'),
    ).toHaveAttribute("placeholder", "2.6");
    await expect(
        editor.locator('[name="MANUAL_ground_obs_0_direction"]'),
    ).toHaveAttribute("placeholder", "181");
    await expect(speed).toHaveValue("21");
    expect(params().has("MANUAL_ground_obs")).toBe(false);
    expect(params().get("MANUAL_upper_winds")).toBe(upper);
    expect(params().get("MANUAL_metar")).toBe(metar);
    await speed.fill("22");
    expect(params().has("MANUAL_ground_obs")).toBe(false);
    const clearAll = editor.getByRole("button", {
        name: "Tyhjennä manuaaliarvot",
    });
    await clearAll.click();
    expect([...params().keys()].some((key) => key.startsWith("MANUAL_"))).toBe(
        false,
    );
});

test("manual clear buttons restore live values and focus the input", async ({
    page,
}) => {
    await expect
        .poll(() =>
            page.evaluate(
                async () =>
                    (await import("#app/weather/state.js")).LOADING.value,
            ),
        )
        .toBe(0);
    await setUniformFreefallWind(page);
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const editor = page.locator("#developer-mode");
    const height = editor.locator('[name="MANUAL_upper_winds_2_height"]');
    await height.fill("4200");
    await height.locator("..").getByRole("button").click();
    await expect(height).toHaveValue("");
    await expect(height).toBeFocused();
    expect(new URL(page.url()).searchParams.has("MANUAL_upper_winds")).toBe(
        false,
    );
    await expect(height).toHaveAttribute("placeholder", "4200");
    await height.fill("4200");
    const direction = editor.locator('[name="MANUAL_upper_winds_2_direction"]');
    await direction.fill("361");
    await expect(editor.getByRole("alert")).toBeVisible();
    await direction.locator("..").getByRole("button").click();
    await expect(direction).toHaveValue("");
    await expect(editor.getByRole("alert")).toHaveCount(0);
    expect(
        new URL(page.url()).searchParams
            .get("MANUAL_upper_winds")
            .split(";")[2],
    ).toBe(",,4200");
    await expect(direction).toHaveAttribute("placeholder", "0");
    await page.evaluate(async () => {
        const { LIVE_OBSERVATIONS } = await import("#app/weather/state.js");
        LIVE_OBSERVATIONS.value = Array.from({ length: 6 }, (_, index) => ({
            source: "fmi",
            time: new Date(Date.now() - index * 10 * 60000),
            gust: 12.5,
            speed: 5,
            direction: 210,
        }));
    });
    const gust = editor.locator('[name="MANUAL_ground_obs_0_gust"]');
    await gust.locator("..").getByRole("button").click();
    await expect(gust).toHaveValue("");
    await expect(gust).toBeFocused();
    await expect(gust).toHaveAttribute("placeholder", "12.5");
    expect(
        await page.evaluate(
            async () =>
                (await import("#app/weather/state.js")).OBSERVATIONS.value[0]
                    .gust,
        ),
    ).toBe(12.5);
    expect(
        new URL(page.url()).searchParams
            .get("MANUAL_ground_obs")
            .split(";")[0]
            .split(",")[0],
    ).toBe("");
    await page.reload();
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    await expect(direction).toHaveValue("");
    await expect(gust).toHaveValue("");
    await editor
        .getByRole("button", { name: "Palauta oikeat havainnot", exact: true })
        .click();
    await gust.fill("25");
    expect(new URL(page.url()).searchParams.has("MANUAL_ground_obs")).toBe(
        true,
    );
    await gust.fill("");
    expect(new URL(page.url()).searchParams.has("MANUAL_ground_obs")).toBe(
        false,
    );
    // The sole upper override is also removed when cleared, after reload.
    await height.fill("");
    expect(new URL(page.url()).searchParams.has("MANUAL_upper_winds")).toBe(
        false,
    );
});

test("manual wind heights default above ground and preserve aircraft measurements", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        navigateQs({ elevation: "100", MANUAL_upper_winds: undefined });
        const heights = [7100.4, 5600.2, 4400.4, 3100.2, 1600.4, 900.3, 160.1];
        for (const [index, level] of [
            "400",
            "500",
            "600",
            "700",
            "850",
            "925",
            "1000",
        ].entries()) {
            OM_DATA.value.hourly[`geopotential_height_${level}hPa`] = [
                heights[index],
            ];
            OM_DATA.value.hourly[`windspeed_${level}hPa`] = [
                index === 2 ? 20 : 10,
            ];
        }
    });
    const read = () =>
        page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const { getFreefallDrift } = await import("#app/map/freefall.js");
            const { getCanopyDrift } = await import("#app/map/canopy.js");
            const data = getMapWindData();
            return {
                heights: data.freefallWinds.map((wind) => wind.height),
                freefall: getFreefallDrift(data.freefallWinds)?.at(-1),
                canopy: getCanopyDrift(data.canopyWinds, 800)?.at(-1),
            };
        });
    const original = await read();
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const editor = page.locator("#developer-mode");
    const height = (index) =>
        editor.locator(`[name="MANUAL_upper_winds_${index}_height"]`);
    for (const [index, expected] of [
        7000, 5500, 4300, 3000, 1500, 800, 60,
    ].entries()) {
        await expect(height(index)).toHaveValue("");
        await expect(height(index)).toHaveAttribute(
            "placeholder",
            String(expected),
        );
    }
    await editor
        .getByRole("button", {
            name: "Tallenna nykyiset arvot manuaaliarvoiksi",
        })
        .click();
    expect(await read()).toEqual(original);
    await height(2).fill("4600");
    const upperEdited = await read();
    expect(upperEdited.heights[2]).toBe(4600);
    expect(upperEdited.freefall).not.toEqual(original.freefall);
    // Moving a measurement past another row sorts the calculation profile.
    await height(6).fill("1200");
    const lowerEdited = await read();
    expect(lowerEdited.heights).toEqual([
        7000.4, 5500.2, 4600, 3000.2, 1500.4, 1200, 800.3,
    ]);
    expect(lowerEdited.canopy).not.toEqual(original.canopy);
    await height(2).fill("");
    expect((await read()).freefall).toBeDefined();
    await expect(height(2)).toHaveAttribute("placeholder", "4300");
    await height(2).fill("4600");
    // Entered AGL heights do not change when elevation or live forecasts change.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "200" });
    });
    expect(await read()).toEqual(lowerEdited);
    await page.reload();
    expect((await read()).heights).toEqual(lowerEdited.heights);
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    await expect(height(2)).toHaveValue("4600");
    await expect(height(6)).toHaveValue("1200");
});

test("manual altitude table updates drift and restores cleared values", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const readDrift = () =>
        page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const { getFreefallDrift } = await import("#app/map/freefall.js");
            const { getCanopyDrift } = await import("#app/map/canopy.js");
            const data = getMapWindData();
            return {
                winds: data.winds.slice(3, 8),
                mean: data.averageWind,
                freefall: getFreefallDrift(data.freefallWinds)?.at(-1),
                canopy: getCanopyDrift(data.canopyWinds, 800)?.at(-1),
            };
        });
    const original = await readDrift();
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs(
            { ...writeMapQuery("map_run_start", { lat: 62.4, lng: 25.6 }) },
            { replace: true },
        );
    });
    await expect(page.locator(".freefall-drift-line")).toHaveCount(1);
    await expect(page.locator(".parachute-drift-line")).toHaveCount(1);
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    const editor = page.locator("#developer-mode");
    const table = editor.locator(".developer-upper-winds");
    await expect(table.locator("tbody tr")).toHaveCount(7);
    await expect(table.locator("tbody th[scope='row']")).toHaveText([
        "400",
        "500",
        "600",
        "700",
        "850",
        "925",
        "1000",
    ]);
    await expect(
        editor.locator(
            '[name="MANUAL_map_speed"], [name="MANUAL_map_direction"]',
        ),
    ).toHaveCount(0);
    await expect(
        table.locator('[name="MANUAL_upper_winds_2_speed"]'),
    ).toHaveValue("");
    await expect(
        table.locator('[name="MANUAL_upper_winds_2_speed"]'),
    ).toHaveAttribute("placeholder", "10.0");
    await editor
        .getByRole("button", {
            name: "Tallenna nykyiset arvot manuaaliarvoiksi",
        })
        .click();
    await expect(page).toHaveURL(
        (url) =>
            url.searchParams.get("MANUAL_upper_winds") ===
            "10,0,7000;10,0,5500;10,0,4200;10,0,3000;10,0,1500;10,0,800;10,0,110",
    );
    await table.locator('[name="MANUAL_upper_winds_2_speed"]').fill("20");
    await table.locator('[name="MANUAL_upper_winds_2_direction"]').fill("270");
    const upperEdited = await readDrift();
    expect(upperEdited.mean.speed).toBeCloseTo(Math.hypot(8000, 26000) / 3000);
    expect(upperEdited.freefall.east).toBeGreaterThan(original.freefall.east);
    expect(upperEdited.canopy).toEqual(original.canopy);
    await table.locator('[name="MANUAL_upper_winds_6_speed"]').fill("30");
    await table.locator('[name="MANUAL_upper_winds_6_direction"]').fill("90");
    const lowerEdited = await readDrift();
    expect(lowerEdited.freefall).toEqual(upperEdited.freefall);
    expect(lowerEdited.canopy.east).toBeLessThan(upperEdited.canopy.east);
    const saved = new URL(page.url()).searchParams.get("MANUAL_upper_winds");
    await table.locator('[name="MANUAL_upper_winds_6_direction"]').fill("361");
    await expect(editor.getByRole("alert")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("MANUAL_upper_winds")).toBe(
        saved,
    );
    await table.locator('[name="MANUAL_upper_winds_6_direction"]').fill("");
    const missing = await readDrift();
    expect(missing.winds[4].direction).toBe(0);
    expect(missing.canopy).toBeDefined();
    await expect(page.locator(".parachute-drift-line")).toHaveCount(1);
    await expect(page.locator(".freefall-drift-line")).toHaveCount(1);
    await table.locator('[name="MANUAL_upper_winds_2_speed"]').fill("");
    await expect(page.locator(".freefall-drift-line")).toHaveCount(1);
    await expect(
        table.locator('[name="MANUAL_upper_winds_2_speed"]'),
    ).toHaveAttribute("placeholder", "10.0");
    await table.locator('[name="MANUAL_upper_winds_2_speed"]').fill("20");
    await expect(page.locator(".freefall-drift-line")).toHaveCount(1);
    await page.reload();
    await setUniformFreefallWind(page);
    expect((await readDrift()).winds).toEqual(missing.winds);
    await page
        .locator(".developer-banner")
        .getByRole("button", { name: "Muokkaa", exact: true })
        .click();
    await expect(
        table.locator('[name="MANUAL_upper_winds_6_direction"]'),
    ).toHaveValue("");
    await editor
        .getByRole("button", { name: "Tyhjennä manuaaliarvot" })
        .click();
    await expect(page).toHaveURL(
        (url) => !url.searchParams.has("MANUAL_upper_winds"),
    );
    await setUniformFreefallWind(page);
    expect((await readDrift()).winds).toEqual(original.winds);
});

test("map toolbar expands only the map in both modes and restores", async ({
    page,
}) => {
    const card = page.locator("#dropzone-map");
    const heading = card.getByRole("heading", { name: "Hyppylinja" });
    const help = card.getByRole("button", { name: "Ohje", exact: true });
    const expand = card.getByRole("button", {
        name: "Laajenna Hyppylinja koko ikkunaan",
    });
    await expect(heading).toBeVisible();
    await expect(help).toBeVisible();
    await expand.click();
    const frame = card.locator(".map-frame");
    await expect(
        card.getByRole("button", { name: "Palauta Hyppylinja", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(frame.locator(".freefall-toolbar .window-toggle")).toHaveCount(
        1,
    );
    await expect(
        frame.locator(":scope > h2, :scope > .wind-profile, .flight-details"),
    ).toHaveCount(0);
    const restore = card.getByRole("button", { name: "Palauta Hyppylinja" });
    await expect(restore).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator(".wind-profile")).toBeHidden();
    await expect(frame.locator(".wind-level-icons")).toBeVisible();
    await expect(windIcon(page, "≈ 4000-1000 m")).toBeVisible();
    await restore.click();
    await expect(heading).toBeVisible();
    await expect(help).toBeVisible();
    await expand.click();
    await expect(
        card.getByRole("button", { name: "Palauta Hyppylinja", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(expand).toHaveAttribute("aria-pressed", "false");
    await expect(heading).toBeVisible();
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
            page.getByRole("button", { name: "Lähennä karttaa" }),
        ).toBeVisible();

        const directionButton = directionControl(page, directionControls.drag);
        if (settingDirection) {
            await map.click({ position: { x: 100, y: 160 } });
            await page.getByRole("button", { name: "Avaus" }).click();
            await expect(map.locator(".jump-run-jumper").first()).toBeVisible();
            await clickDirection(page, directionControls.drag);
            await expect(directionButton).toHaveAttribute(
                "aria-checked",
                "true",
            );
            await expect(
                page.getByRole("button", {
                    name: "Lähennä karttaa",
                    includeHidden: true,
                }),
            ).toBeDisabled();
        }

        await page.evaluate(async () => {
            const { STATION_COORDINATES } =
                await import("#app/weather/state.js");
            STATION_COORDINATES.value = "62.5,25.7";
            await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
        });

        await expect(
            page.getByRole("button", { name: "Lähennä karttaa" }),
        ).toBeVisible();
        await expect(directionButton).toHaveAttribute("aria-checked", "false");
        await expect(
            page.getByRole("button", { name: "Lähennä karttaa" }),
        ).toBeEnabled();
        await page.getByRole("button", { name: "Lähennä karttaa" }).click();
        await expect
            .poll(() => new URL(page.url()).searchParams.get("map_zoom"))
            .toBe("15");
        expect(errors).toEqual([]);
    });
}

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
            "400",
            "500",
            "600",
            "700",
            "850",
            "925",
            "1000",
        ].entries()) {
            hourly[`geopotential_height_${level}hPa`] = [
                {
                    400: 7000,
                    500: 5500,
                    600: 4200,
                    700: 3000,
                    850: 1500,
                    925: 800,
                    1000: 110,
                }[level],
            ];
            hourly[`windspeed_${level}hPa`] = [Math.max(1, index - 1)];
            hourly[`winddirection_${level}hPa`] = [((index + 2) % 4) * 90];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });

    const average = windIcon(page, "≈ 4000-1000 m");
    await expect(average).toHaveAttribute("aria-pressed", "true");
    await expect(windIcon(page, "≈ 7000 m")).toHaveCount(0);
    await expect(windIcon(page, "≈ 5500 m")).toHaveCount(0);
    // The 4200 m layer is used at a 4000 m exit despite being above it.
    await expect(windIcon(page, "≈ 4000 m")).toHaveCount(1);
    await expect(
        windIcon(page, "≈ 4000 m").locator(".wind-level-speed"),
    ).toHaveText("1 m/s");
    await expect(
        windIcon(page, "≈ 3000 m").locator(".wind-level-speed"),
    ).toHaveText("2 m/s");
    await expect(
        windIcon(page, "Maanpinta").locator(".wind-level-speed"),
    ).toHaveText("4 m/s");
    await expect(windIcon(page, "≈ 0 m")).toHaveCount(0);
    for (const label of [
        "≈ 4000 m",
        "≈ 3000 m",
        "≈ 1500 m",
        "≈ 1000 m",
        "Maanpinta",
        "≈ 4000-1000 m",
    ]) {
        const button = windIcon(page, label);
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(
            profile.locator('.wind-level-choice[aria-pressed="true"]'),
        ).toHaveCount(1);
    }
    const altitude = windIcon(page, "≈ 4000 m");
    await altitude.focus();
    await page.keyboard.press("Enter");
    await expect(altitude).toHaveAttribute("aria-pressed", "true");
    // Raising the exit adds the nearest higher layers to the bar.
    await page.evaluate(async () => {
        const { QUERY_PARAMS, navigateQs } =
            await import("#app/app/settings.js");
        const settings =
            QUERY_PARAMS.value.map_run_direction !== undefined
                ? readMapQuery(QUERY_PARAMS.value, "map_run_settings")
                : {
                      direction: 0,
                      speedKmh: 157,
                      separationSeconds: 5,
                      exitHeight: 4000,
                  };
        navigateQs({
            ...writeMapQuery("map_run_settings", {
                ...settings,
                exitHeight: 6000,
            }),
        });
    });
    await expect(windIcon(page, "≈ 5500 m")).toHaveCount(1);
    await expect(windIcon(page, "≈ 7000 m")).toHaveCount(0);
    await page.evaluate(async () => {
        const { QUERY_PARAMS, navigateQs } =
            await import("#app/app/settings.js");
        const settings =
            QUERY_PARAMS.value.map_run_direction !== undefined
                ? readMapQuery(QUERY_PARAMS.value, "map_run_settings")
                : {
                      direction: 0,
                      speedKmh: 157,
                      separationSeconds: 5,
                      exitHeight: 4000,
                  };
        navigateQs({
            ...writeMapQuery("map_run_settings", {
                ...settings,
                exitHeight: 6500,
            }),
        });
    });
    await windIcon(page, "≈ 7000 m").click();
    await page.evaluate(async () => {
        const { QUERY_PARAMS, navigateQs } =
            await import("#app/app/settings.js");
        const settings =
            QUERY_PARAMS.value.map_run_direction !== undefined
                ? readMapQuery(QUERY_PARAMS.value, "map_run_settings")
                : {
                      direction: 0,
                      speedKmh: 157,
                      separationSeconds: 5,
                      exitHeight: 4000,
                  };
        navigateQs({
            ...writeMapQuery("map_run_settings", {
                ...settings,
                exitHeight: 4000,
            }),
        });
    });
    await expect(windIcon(page, "≈ 7000 m")).toHaveCount(0);
    await expect(average).toHaveAttribute("aria-pressed", "true");
    // Missing forecast heights cannot supply drift layers.
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = null;
    });
    await expect(windIcon(page, "600 hPa")).toHaveCount(0);
    await expect(average).toHaveAttribute("aria-label", /Ei tietoa/);
    await expect(average.locator(".wind-level-speed")).toHaveText("Ei tietoa");
    await expect(average).toHaveAttribute("aria-pressed", "true");
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
    expect(result.shear.north).toBeCloseTo(-1532);
    expect(result.wrap.north).toBeLessThan(-639);
    expect(result.calm).toEqual({ height: 800, east: 0, north: 0 });
    expect(result.missing).toBeNull();
    expect(result.custom.height).toBe(1200);
    expect(result.custom.north).toBeCloseTo(-353.25);
    expect(result.customShear.north).toBeCloseTo(
        -(1305 * 30 + 1050 * 15) / (240 / 3.6),
    );
    expect(result.invalid).toBeNull();
});

test("jump run converts true airspeed using nearest-level exit wind and ground track", async ({
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
    expect(result.shear.ground.north).toBeCloseTo(120 / 3.6 - 20);
    expect(result.wrap.east).toBeCloseTo(10 * Math.sin((10 * Math.PI) / 180));
    expect(result.wrap.north).toBeCloseTo(-10 * Math.cos((10 * Math.PI) / 180));
    expect(result.exact.north).toBeCloseTo(-10);
    expect(result.missing).toBeNull();
    expect(result.outside.ground.north).toBeCloseTo(120 / 3.6 - 10);
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

test("jump-run header explains why an initial automatic run cannot be drawn and clears after recovery", async ({
    page,
}) => {
    const settings = new URLSearchParams(
        writeMapQuery("map_run_settings", {
            direction: 0,
            speedKmh: 157,
            separationSeconds: 5,
            exitHeight: 4444,
        }),
    );
    await page.goto(
        `${manualPath}&lat=62.99765&lon=10.63477&elevation=517&${settings}`,
    );
    const error = page.locator(".card-heading .jump-run-header-error");
    await expect(error).toContainText("uloshyppykorkeuden tuulitieto puuttuu");
    await setUniformFreefallWind(page);
    await expect(error).toHaveCount(0);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        for (const level of [
            "400",
            "500",
            "600",
            "700",
            "850",
            "925",
            "1000",
        ]) {
            data.hourly[`windspeed_${level}hPa`] = [50];
            data.hourly[`winddirection_${level}hPa`] = [90];
        }
        OM_DATA.value = data;
        navigateQs(
            { ...writeMapQuery("map_run_start", undefined) },
            { replace: true },
        );
    });
    await expect(error).toContainText(
        "valittua suuntaa ei voi lentää tällä ilmanopeudella",
    );
    await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
    await setUniformFreefallWind(page);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.windspeed_600hPa = [11];
        OM_DATA.value = data;
    });
    await expect(error).toHaveCount(0);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
});

test("jump-run positions react to forecast changes and recover from missing or infeasible wind", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    const jumpers = page.locator(".jump-run-jumper");
    const arrows = page.locator(".freefall-drift-line");
    const unavailable = page.locator(".jump-run-unavailable");
    const length = page.locator(".jump-run-summary [data-tooltip]").nth(3);
    await expect(jumpers).toHaveCount(6);
    const initialLength = await length.innerText();
    const second = await jumpers.nth(1).getAttribute("d");
    const start = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        for (const level of ["600", "700", "850", "925"])
            data.hourly[`windspeed_${level}hPa`] = [20];
        OM_DATA.value = data;
    });
    await expect(jumpers.nth(1)).not.toHaveAttribute("d", second);
    await expect(length).not.toHaveText(initialLength);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(start);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.windspeed_600hPa = [null];
        OM_DATA.value = data;
    });
    await expect(unavailable).toBeVisible();
    await expect(length).toContainText("—");
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
    await page.getByRole("button", { name: "Avaus" }).click();
    await page.waitForTimeout(400);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(start);
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
                for (const level of [
                    "400",
                    "500",
                    "400",
                    "500",
                    "600",
                    "700",
                    "850",
                    "925",
                    "1000",
                ]) {
                    hourly[`geopotential_height_${level}hPa`] = time.map(
                        () =>
                            ({
                                400: 7000,
                                500: 5500,
                                600: 4200,
                                500: 5500,
                                400: 7000,
                                700: 3000,
                                850: 1500,
                                925: 800,
                                1000: 110,
                            })[level],
                    );
                    hourly[`windspeed_${level}hPa`] = time.map(
                        (_, index) => 11 + index,
                    );
                    hourly[`winddirection_${level}hPa`] = time.map(
                        (_, index) => 234 + index,
                    );
                }
                OM_DATA.value = { utc_offset_seconds: offset, hourly };
            }, offset);

            const altitude = windIcon(page, "≈ 4000 m");
            await expect(altitude).toHaveAttribute(
                "aria-label",
                /19 m\/s 242°/,
            );
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
            await expect(current.locator(".wind-direction")).toHaveAttribute(
                "data-tooltip",
                "Suunta: 242°",
            );
            await expect(raw.locator("th.time-header").first()).toHaveText(
                "8:00",
            );
        });
    }
});

test("jump run redraws all jumpers and applies individual settings immediately", async ({
    page,
    isMobile,
}) => {
    await page.goto(
        `${manualPath}&default_jump_group_count=1&default_jump_run_direction=0&MANUAL_upper_winds=${uniformUpperWinds}`,
    );
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    const summary = page.locator(".toolbar-summary");
    const length = summary.locator(".jump-run-summary [data-tooltip]").nth(3);
    await expect(summary).toContainText(/Hyppylinja\s*\d+° · 157 km\/h/);
    await expect(summary).toContainText(/157 km\/h · 5s · —/);
    const place = async (x = 100, y = 160) => {
        await map.scrollIntoViewIfNeeded();
        if (isMobile) await map.tap({ position: { x, y } });
        else await map.click({ position: { x, y } });
        await page.getByRole("button", { name: "Avaus" }).click();
    };
    await place();
    const run = map.locator(".jump-run-line");
    const jumpers = map.locator(".jump-run-jumper");
    const arrows = map.locator(".freefall-drift-line");
    await expect(jumpers).toHaveCount(1);
    await expect(length).toHaveText("0 m");
    const firstStart = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await place(100, 80);
    await expect
        .poll(() =>
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        )
        .not.toBe(firstStart);
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await expect(jumpers).toHaveCount(3);
    await expect(length).toHaveText("336 m");
    await expect(arrows).toHaveCount(3);
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    const first = settings.getByRole("row", {
        name: "Hyppääjä 1",
        exact: true,
    });
    const second = settings.getByRole("row", {
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
        settings.getByRole("spinbutton", { name: "Hyppääjien porrastus (s)" }),
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
    await expect(length).toHaveText("400 m");
    await expect(run).toHaveAttribute("d", runPath);
    await expect(arrows.nth(1)).not.toHaveAttribute("d", secondArrow);
    await settings
        .getByRole("spinbutton", { name: "Hyppääjien porrastus (s)" })
        .fill("10");
    await expect(summary).toContainText(/180 km\/h · 10s · 800 m/);
    await expect(length).toHaveText("800 m");
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
    const movedStart = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    if (!isMobile) {
        const bounds = await map.boundingBox();
        await page.mouse.move(bounds.x + 250, bounds.y + 200);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await expect(run).toHaveAttribute("d", moved);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBe(movedStart);
    }
    // Another click repositions the run and does not enter direction mode.
    await place(250, 200);
    await expect
        .poll(() =>
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        )
        .not.toBe(movedStart);
    await expect(
        directionControl(page, directionControls.drag),
    ).toHaveAttribute("aria-checked", "false");
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
    await expect(length).toHaveText("400 m");
    await expect(arrows).toHaveCount(2);
    await expect(
        second.getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("800");
    await page.keyboard.press("Escape");
    await edit.click();
    await expect(
        settings.getByRole("row", { name: /^Hyppääjä \d+$/ }),
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

for (const jumperCount of [1, 4]) {
    test(`direction controls preserve the predicted landing point for ${jumperCount} groups`, async ({
        page,
    }) => {
        const original = { lat: 62.42, lng: 25.6 };
        const settings = {
            direction: 0,
            speedKmh: 120,
            separationSeconds: 5,
            exitHeight: 4000,
        };
        const group = Array.from({ length: jumperCount }, (_, index) => ({
            speedKmh: index === 2 ? 240 : 180,
            openingHeight: index === 2 ? 1200 : 800,
        }));
        await page.goto(
            `${manualPath}&lat=62.4&lon=25.6&map_zoom=11&map_center_lat=62.4&map_center_lon=25.6&default_jump_run_direction=0&${new URLSearchParams(writeMapQuery("map_jumpers", group))}&${new URLSearchParams(writeMapQuery("map_run_start", original))}&${new URLSearchParams(writeMapQuery("map_run_settings", settings))}`,
        );
        await setUniformFreefallWind(page);
        const map = page.locator(".dz-map");
        await map.scrollIntoViewIfNeeded();
        await expect(map.locator(".parachute-drift-line")).toHaveCount(
            jumperCount,
        );
        const landing = await middleOpening(page, true);
        const expectLanding = async () =>
            expect(await openingDistance(page, landing, true)).toBeLessThan(1);
        await directionTrigger(page).click();
        for (const [control, directions] of [
            [directionControls.clockwise, [90, 180, 270, 0]],
            [directionControls.counterclockwise, [270, 180, 90, 0]],
        ]) {
            for (const direction of directions) {
                await directionControl(page, control).click();
                await expect(directionMenu(page)).toBeVisible();
                await expect(directionTrigger(page)).toHaveAttribute(
                    "aria-expanded",
                    "true",
                );
                await expect
                    .poll(
                        () =>
                            readMapQuery(
                                Object.fromEntries(
                                    new URL(page.url()).searchParams,
                                ),
                                "map_run_settings",
                            ).direction,
                    )
                    .toBe(direction);
                await expectLanding();
            }
        }
        await page.keyboard.press("Escape");
        await expect(directionMenu(page)).toBeHidden();
        await page
            .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
            .click();
        await page
            .getByRole("slider", { name: "Hyppylinjan suunta" })
            .fill("180");
        await expectLanding();
        await page.keyboard.press("Escape");
        await page.reload();
        await setUniformFreefallWind(page);
        await map.scrollIntoViewIfNeeded();
        await expectLanding();
        await clickDirection(page, directionControls.reset);
        await expectLanding();
    });
}

test("free rotation preserves the exit center across headings and reload", async ({
    page,
}) => {
    const jumperCount = 4;
    const settings = {
        direction: 0,
        speedKmh: 120,
        separationSeconds: 20,
        exitHeight: 4000,
    };
    const group = Array.from({ length: jumperCount }, (_, index) => ({
        speedKmh: index % 2 ? 240 : 180,
        openingHeight: index % 2 ? 1200 : 800,
    }));
    await page.goto(
        `${manualPath}&map_zoom=13&${new URLSearchParams(writeMapQuery("map_jumpers", group))}&${new URLSearchParams(writeMapQuery("map_run_start", { lat: 62.4, lng: 25.6 }))}&${new URLSearchParams(writeMapQuery("map_run_settings", settings))}`,
    );
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    const center = await runCenter(page);
    await centerMapOn(page, center);
    await clickDirection(page, directionControls.drag);
    for (let turn = 0; turn < 4; turn++) {
        const previous = readMapQuery(
            Object.fromEntries(new URL(page.url()).searchParams),
            "map_run_settings",
        ).direction;
        const direction = (previous + 90) % 360;
        const pivot = await mapPoint(page, center);
        const bounds = await map.boundingBox();
        const x = bounds.x + pivot.x;
        const y = bounds.y + pivot.y;
        await page.mouse.move(x + 70, y);
        await page.mouse.down();
        await page.mouse.move(x, y + 70, { steps: 5 });
        await page.mouse.up();
        const actual = readMapQuery(
            Object.fromEntries(new URL(page.url()).searchParams),
            "map_run_settings",
        ).direction;
        expect(
            Math.min(
                Math.abs(actual - direction),
                360 - Math.abs(actual - direction),
            ),
        ).toBeLessThan(1);
        expect(await runCenterDistance(page, center)).toBeLessThan(1);
    }
    await page.reload();
    await setUniformFreefallWind(page);
    expect(await runCenterDistance(page, center)).toBeLessThan(1);
});

test("jump run turns into the selected wind around the opening center", async ({
    page,
}) => {
    await page.goto(
        `${manualPath}&lat=62.4&lon=25.6&${new URLSearchParams(writeMapQuery("map_run_start", null))}&MANUAL_upper_winds=10,225,7000;10,225,5500;10,225,4200;10,270,3000;10,315,1500;10,360,800;10,90,110`,
    );
    const intoWind = directionControl(page, directionControls.intoWind);
    await expect(intoWind).toBeDisabled();
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    const opening = await middleOpening(page);
    for (const [label, direction] of [
        ["≈ 4000-1000 m", 284.97871603010344],
        ["4200 m", 225],
        ["3000 m", 270],
        ["1500 m", 315],
        ["800 m", 0],
        ["110 m", 90],
        ["Maanpinta", 194],
    ]) {
        const previous = mapQuerySnapshot(
            new URL(page.url()).searchParams,
            "map_run_settings",
        );
        await windIcon(page, label).click();
        expect(
            mapQuerySnapshot(
                new URL(page.url()).searchParams,
                "map_run_settings",
            ),
        ).toBe(previous);
        await clickDirection(page, directionControls.intoWind);
        expect(
            readMapQuery(
                Object.fromEntries(new URL(page.url()).searchParams),
                "map_run_settings",
            ).direction,
        ).toBeCloseTo(direction, 8);
        expect(await openingDistance(page, opening)).toBeLessThan(1);
    }

    await page
        .getByRole("button", {
            name: "Laajenna Hyppylinja koko ikkunaan",
        })
        .click();
    await windIcon(page, "1500 m").click();
    await clickDirection(page, directionControls.intoWind);
    expect(
        readMapQuery(
            Object.fromEntries(new URL(page.url()).searchParams),
            "map_run_settings",
        ).direction,
    ).toBe(315);
    expect(await openingDistance(page, opening)).toBeLessThan(1);
    await page.reload();
    await expect(page.locator(".toolbar-summary")).toContainText("315°");
    await expect(intoWind).toBeEnabled();
    await page.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(intoWind).toBeDisabled();
});

test("turning into wind requires a valid selected wind and uses refreshed data", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    await windIcon(page, "≈ 4000 m").click();
    const intoWind = directionControl(page, directionControls.intoWind);
    await expect(intoWind).toBeEnabled();
    for (const [speed, direction] of [
        [0, 90],
        [null, 90],
        [10, null],
        [10, NaN],
        [Infinity, 90],
        [10, -1],
        [10, 361],
        [10, 270],
    ]) {
        await page.evaluate(
            async ({ speed, direction }) => {
                const { OM_DATA } = await import("#app/weather/state.js");
                OM_DATA.value = {
                    ...OM_DATA.value,
                    hourly: {
                        ...OM_DATA.value.hourly,
                        windspeed_600hPa: [speed],
                        winddirection_600hPa: [direction],
                    },
                };
            },
            { speed, direction },
        );
        if (direction === 270) await expect(intoWind).toBeEnabled();
        else await expect(intoWind).toBeDisabled();
    }
    await clickDirection(page, directionControls.intoWind);
    expect(
        readMapQuery(
            Object.fromEntries(new URL(page.url()).searchParams),
            "map_run_settings",
        ).direction,
    ).toBe(270);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = null;
    });
    await expect(intoWind).toBeDisabled();
});

test("adding, removing, and undoing jumpers preserves the exit center", async ({
    page,
}) => {
    await page.goto(`${manualPath}&default_jump_group_count=1`);
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    const paths = map.locator(".freefall-drift-line");
    await expect(paths).toHaveCount(1);
    const runCenter = () =>
        page.evaluate(async () => {
            const { getMapWindData } = await import("#app/map/windData.js");
            const { jumpRunCoordinates, getJumpRunVelocity } =
                await import("#app/map/freefall.js");
            const params = new URL(location.href).searchParams;
            const settings = readMapQuery(
                Object.fromEntries(params),
                "map_run_settings",
            );
            const start = readMapQuery(
                Object.fromEntries(params),
                "map_run_start",
            );
            const group = readMapQuery(
                Object.fromEntries(params),
                "map_jumpers",
            );
            const velocity = getJumpRunVelocity(
                getMapWindData().freefallWinds,
                settings,
            );
            return jumpRunCoordinates(
                start,
                settings,
                (group.length - 1) / 2,
                velocity.ground,
            );
        });
    const target = await runCenter();
    const opening = await middleOpening(page);
    const expectCenter = async () => {
        const center = await runCenter();
        expect(center[0]).toBeCloseTo(target[0], 6);
        expect(center[1]).toBeCloseTo(target[1], 6);
    };
    const toolbar = page.locator(".freefall-toolbar");
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    await edit.click();
    const template = dialog.getByRole("group", {
        name: "Lisää hyppääjä",
    });
    await template
        .getByRole("spinbutton", { name: "Avauskorkeus (m)" })
        .fill("1200");
    await template.getByRole("button", { name: /^Freefly/ }).click();
    await template.getByRole("button", { name: "Lisää hyppääjä" }).click();
    await expect(paths).toHaveCount(2);
    await expectCenter();
    expect(await openingDistance(page, opening)).toBeGreaterThan(1);
    await page.keyboard.press("Escape");
    await toolbar
        .getByRole("button", { name: "Lisää hyppääjä", exact: true })
        .click();
    await expect(paths).toHaveCount(3);
    await expectCenter();
    await edit.click();
    await dialog
        .getByRole("button", { name: "Poista hyppääjä 2", exact: true })
        .click();
    await expect(paths).toHaveCount(2);
    await expectCenter();
    await page.keyboard.press("Escape");
    await toolbar.getByRole("button", { name: "Poista hyppääjä" }).click();
    await expect(paths).toHaveCount(1);
    await expectCenter();
});

test("rotation preserves the current opening after settings, group, and wind edits", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
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
        ["Hyppääjien porrastus (s)", "10"],
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
    const middleJumper = dialog.getByRole("row", {
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
        for (const level of ["400", "500", "600", "700", "850", "925", "1000"])
            data.hourly[`windspeed_${level}hPa`] = [15];
        OM_DATA.value = data;
    });
    opening = await middleOpening(page);
    await direction.fill(String(++degrees));
    expect(await openingDistance(page, opening)).toBeLessThan(1);
});

for (const input of ["mouse", "touch"]) {
    test(`direction ${input} dragging starts from the current heading without snapping`, async ({
        page,
    }) => {
        await expect(page.getByText(/Koordinaatit puuttuvat/)).toBeVisible();
        await page.clock.setFixedTime(new Date());
        await setUniformFreefallWind(page);
        await page.evaluate(async () => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({
                MANUAL_upper_winds:
                    "10,0,7000;10,0,5500;10,0,4200;10,0,3000;10,0,1500;10,0,800;10,0,110",
            });
        });
        const map = page.locator(".dz-map");
        await map.scrollIntoViewIfNeeded();
        await map.click({ position: { x: 120, y: 160 } });
        await page.getByRole("button", { name: "Avaus" }).click();
        await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
        await page
            .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
            .click();
        await page
            .getByRole("slider", { name: "Hyppylinjan suunta" })
            .fill("45");
        await page.keyboard.press("Escape");
        const center = await runCenter(page);
        await centerMapOn(page, center);
        const button = directionControl(page, directionControls.drag);
        await clickDirection(page, directionControls.drag);
        const bounds = await map.boundingBox();
        const pivot = await mapPoint(page, center);
        const x = bounds.x + pivot.x + 120;
        const y = bounds.y + pivot.y;
        const direction = () =>
            readMapQuery(
                Object.fromEntries(new URL(page.url()).searchParams),
                "map_run_settings",
            ).direction;
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
        await expect(button).toHaveAttribute("aria-checked", "true");
        await start();
        expect(direction()).toBeCloseTo(45, 0);
        await move(60);
        await expect
            .poll(direction)
            .toBeCloseTo(45 + (Math.atan2(60, 120) * 180) / Math.PI, 0);
        await release();
        await expect(button).toHaveAttribute("aria-checked", "true");
        expect(await runCenterDistance(page, center)).toBeLessThan(1);
        await touch?.detach();
    });
}

test("jump-run positioning requires confirmation and cancels on other clicks", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    const confirm = page.getByRole("button", {
        name: "Avaus",
    });
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 120, y: 160 } });
    await expect(confirm).toBeVisible();
    await expect(
        map.getByRole("button", { name: "Hyppylinja", exact: true }),
    ).toBeVisible();
    await expect(
        map.getByRole("button", { name: "Laskeutuminen" }),
    ).toBeVisible();
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe("null");
    await expect(map.locator(".jump-run-jumper")).toHaveCount(0);

    // Another map click dismisses the callout without choosing a new point.
    await map.click({ position: { x: 40, y: 340 } });
    await expect(confirm).toHaveCount(0);
    await page.waitForTimeout(400);
    await expect(confirm).toHaveCount(0);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe("null");

    await map.click({ position: { x: 120, y: 160 } });
    await confirm.click();
    const start = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    expect(start).not.toBeNull();
    await expect(map.locator(".jump-run-jumper")).toHaveCount(6);
    await expect(confirm).toHaveCount(0);

    // Controls and clicks outside the map also dismiss pending repositioning.
    for (const cancel of [
        () => page.getByRole("button", { name: "Lähennä karttaa" }).click(),
        () => page.locator(".toolbar-summary").click(),
        () => page.keyboard.press("Escape"),
    ]) {
        await map.scrollIntoViewIfNeeded();
        await map.click({ position: { x: 180, y: 200 } });
        await expect(confirm).toBeVisible();
        await cancel();
        await expect(confirm).toHaveCount(0);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBe(start);
    }
});

test("centering the jump run puts its middle exit at the tapped point", async ({
    page,
}) => {
    const jumperCount = 6;
    const target = { lat: 62.4, lng: 25.6 };
    await page.goto(
        `${manualPath}&default_jump_group_count=${jumperCount}&default_jump_run_direction=90&map_center_lat=${target.lat}&map_center_lon=${target.lng}`,
    );
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    await map.click({
        position: { x: bounds.width / 2, y: bounds.height / 2 },
    });
    await page.getByRole("button", { name: "Hyppylinja", exact: true }).click();
    await expect(map.locator(".jump-run-jumper")).toHaveCount(jumperCount);
    await expect(map.locator(".jump-run-placement")).toHaveCount(0);
    const distance = await page.evaluate(async (target) => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getJumpRunVelocity, jumpRunCoordinates } =
            await import("#app/map/freefall.js");
        const { latLng } = await import("leaflet");
        const params = new URL(location.href).searchParams;
        const settings = readMapQuery(
            Object.fromEntries(params),
            "map_run_settings",
        );
        const start = readMapQuery(Object.fromEntries(params), "map_run_start");
        const group = readMapQuery(Object.fromEntries(params), "map_jumpers");
        const velocity = getJumpRunVelocity(
            getMapWindData().freefallWinds,
            settings,
        );
        const last = latLng(
            jumpRunCoordinates(
                start,
                settings,
                group.length - 1,
                velocity.ground,
            ),
        );
        return latLng(
            (start.lat + last.lat) / 2,
            (start.lng + last.lng) / 2,
        ).distanceTo(target);
    }, target);
    // Map clicks are rounded to screen pixels at the current zoom.
    expect(distance).toBeLessThan(10);
    expect(await openingDistance(page, target)).toBeGreaterThan(100);
    const opening = await middleOpening(page);
    await clickDirection(page, directionControls.clockwise);
    expect(await openingDistance(page, opening)).toBeLessThan(1);
});

test("parachute landing at a tapped point reuses automatic positioning for the current group and direction", async ({
    page,
}) => {
    const target = { lat: 62.41, lng: 25.61 };
    const settings = {
        direction: 270,
        speedKmh: 157,
        exitHeight: 4000,
        separationSeconds: 5,
    };
    const group = [
        { speedKmh: 180, openingHeight: 800 },
        { speedKmh: 240, openingHeight: 1200 },
        { speedKmh: 80, openingHeight: 1500 },
        { speedKmh: 180, openingHeight: 800 },
    ];
    await page.goto(
        `${manualPath}&MANUAL_ground_obs=10,10,0,1&lat=62.4&lon=25.6&map_run_start_lat=null&map_run_start_lon=null&${new URLSearchParams(writeMapQuery("map_run_settings", settings))}&${new URLSearchParams(writeMapQuery("map_jumpers", group))}&map_center_lat=${target.lat}&map_center_lon=${target.lng}`,
    );
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    await map.click({
        position: { x: bounds.width / 2, y: bounds.height / 2 },
    });
    await page.getByRole("button", { name: "Laskeutuminen" }).click();
    await expect(map.locator(".jump-run-jumper")).toHaveCount(group.length);
    await expect(map.locator(".jump-run-placement")).toHaveCount(0);
    const params = new URL(page.url()).searchParams;
    expect(
        readMapQuery(Object.fromEntries(params), "map_run_settings"),
    ).toEqual(settings);
    expect(readMapQuery(Object.fromEntries(params), "map_jumpers")).toEqual(
        group,
    );
    expect(params.get("lat")).toBe("62.4");
    expect(params.get("lon")).toBe("25.6");
    const distance = await page.evaluate(async (target) => {
        const { startForAutomaticRun } =
            await import("#app/map/automaticPlacement.js");
        const { createJumpRunCalculator } = await import("#app/map/jumpRun.js");
        const { getMapWindData } = await import("#app/map/windData.js");
        const { latLng } = await import("leaflet");
        const params = new URL(location.href).searchParams;
        const settings = readMapQuery(
            Object.fromEntries(params),
            "map_run_settings",
        );
        const group = readMapQuery(Object.fromEntries(params), "map_jumpers");
        const { freefallWinds, canopyWinds } = getMapWindData();
        const expected = startForAutomaticRun(
            target,
            settings,
            group,
            createJumpRunCalculator()(freefallWinds, settings),
            canopyWinds,
        );
        return latLng(
            readMapQuery(Object.fromEntries(params), "map_run_start"),
        ).distanceTo(expected);
    }, target);
    expect(distance).toBeLessThan(10);
    await expectAutomaticOpeningsUpwind(page, target.lat);
    const opening = await middleOpening(page);
    await clickDirection(page, directionControls.clockwise);
    expect(await openingDistance(page, opening)).toBeLessThan(1);
});

for (const [description, ground] of [
    ["invalid", "10,-1,180,1"],
    ["stale", "10,10,0,61"],
    ["missing", ""],
]) {
    test(`parachute landing rejects ${description} lower winds and keeps the existing run`, async ({
        page,
    }) => {
        await page.goto(`${manualPath}&MANUAL_ground_obs=${ground}`);
        await setUniformFreefallWind(page);
        const map = page.locator(".dz-map");
        await map.scrollIntoViewIfNeeded();
        await map.click({ position: { x: 120, y: 160 } });
        await page
            .getByRole("button", { name: "Hyppylinja", exact: true })
            .click();
        const start = mapQuerySnapshot(
            new URL(page.url()).searchParams,
            "map_run_start",
        );
        expect(start).not.toBeNull();
        const errors = [];
        page.on("console", (message) => {
            if (
                message.type() === "error" &&
                message
                    .text()
                    .includes("Automaattinen sijoitus ei ole saatavilla")
            )
                errors.push(message.text());
        });
        await map.click({ position: { x: 180, y: 200 } });
        await page.getByRole("button", { name: "Laskeutuminen" }).click();
        const error = page.locator(".map-errors .jump-run-unavailable");
        await expect(error).toContainText(
            "Automaattinen sijoitus ei ole saatavilla",
        );
        const message = (await error.textContent()).trim();
        await expect.poll(() => errors).toEqual([message]);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBe(start);
        await page
            .getByRole("button", { name: "Laajenna Hyppylinja koko ikkunaan" })
            .click();
        await expect(error).toHaveCount(0);
        await page
            .getByRole("button", { name: "Virheet", exact: true })
            .click();
        const errorDialog = page.getByRole("dialog", {
            name: "Virheet",
            exact: true,
        });
        await expect(errorDialog).toBeVisible();
        await expect(
            errorDialog.getByRole("listitem").filter({ hasText: message }),
        ).toHaveText(message);
        await errorDialog
            .getByRole("button", { name: "Sulje", exact: true })
            .click();
        await expect(errorDialog).not.toBeVisible();
        await page.getByRole("button", { name: "Palauta Hyppylinja" }).click();
        await expect(error).toBeVisible();
        expect(errors).toEqual([message]);
        await map.scrollIntoViewIfNeeded();
        await map.click({ position: { x: 180, y: 200 } });
        await page.getByRole("button", { name: "Avaus" }).click();
        await expect(page.locator(".jump-run-unavailable")).toHaveCount(0);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).not.toBe(start);
        await map.click({ position: { x: 180, y: 200 } });
        await page.getByRole("button", { name: "Laskeutuminen" }).click();
        await expect(error).toBeVisible();
        await expect.poll(() => errors).toEqual([message, message]);
        await page.getByRole("button", { name: "Poista hyppylinja" }).click();
        await expect(page.locator(".map-errors")).toHaveCount(0);
    });
}

test("map clicks center a large group of jumpers", async ({ page }) => {
    const jumperCount = 14;
    const center = { lat: 62.4, lng: 25.6 };
    await page.goto(
        `${manualPath}&default_jump_group_count=${jumperCount}&default_jump_run_direction=90&map_center_lat=${center.lat}&map_center_lon=${center.lng}`,
    );
    await setUniformFreefallWind(page);

    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    await map.click({
        position: { x: bounds.width / 2, y: bounds.height / 2 },
    });
    await page.getByRole("button", { name: "Avaus" }).click();

    await expect(map.locator(".freefall-drift-line")).toHaveCount(jumperCount);
    const result = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { jumpRunCoordinates } = await import("#app/map/freefall.js");
        const { getFreefallDrift, driftCoordinates, getJumpRunVelocity } =
            await import("#app/map/freefall.js");
        const { latLng } = await import("leaflet");
        const params = new URL(location.href).searchParams;
        const settings = readMapQuery(
            Object.fromEntries(params),
            "map_run_settings",
        );
        const start = readMapQuery(Object.fromEntries(params), "map_run_start");
        const jumpers = readMapQuery(Object.fromEntries(params), "map_jumpers");
        const target = {
            lat: Number(params.get("map_center_lat")),
            lng: Number(params.get("map_center_lon")),
        };
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
    await page.goto(`${manualPath}&lat=62.4&lon=25.6`);
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

test("double-tap zoom preserves the positioned jump run", async ({
    page,
    isMobile,
}) => {
    await setUniformFreefallWind(page);
    const map = page.locator(".dz-map");
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 80, y: 100 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
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
    expect(mapQuerySnapshot(result, "map_run_start")).toBe(
        mapQuerySnapshot(initial, "map_run_start"),
    );
    await expect(hint).toHaveCount(0);
});

test("dragging sets jump run direction and clicking exits without moving the run", async ({
    page,
}) => {
    // Stale ground winds prevent automatic placement, but allow free rotation.
    await page.goto(
        `${manualPath}&MANUAL_ground_obs=10,10,180,61&lat=62.4&lon=25.6`,
    );
    await setUniformFreefallWind(page);
    await expect(
        page.getByRole("button", {
            name: "Hyppylinjan automaattinen sijoitus",
        }),
    ).toBeDisabled();
    await expect(page.locator(".map-errors")).toHaveCount(0);
    const errors = [];
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    const map = page.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    const jumper = map.locator(".jump-run-jumper").first();
    await expect(jumper).toBeVisible();
    const directionButton = directionControl(page, directionControls.drag);
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    await expect(hint).toHaveCount(0);
    await expect(directionButton).toHaveAttribute("aria-checked", "false");
    const center = await runCenter(page);
    await centerMapOn(page, center);
    const placed = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await clickDirection(page, directionControls.drag);
    await expect(hint).toBeVisible();
    await expect(directionButton).toHaveAttribute("aria-checked", "true");
    const bounds = await map.boundingBox();
    const pivot = await mapPoint(page, center);
    const originX = bounds.x + pivot.x;
    const originY = bounds.y + pivot.y;
    const settings = () =>
        readMapQuery(
            Object.fromEntries(new URL(page.url()).searchParams),
            "map_run_settings",
        );
    await page.mouse.move(originX, originY);
    await page.mouse.down();
    await page.mouse.move(originX + 120, originY, { steps: 8 });
    await expect
        .poll(() => settings().direction)
        .toBeCloseTo((Math.atan2(120, 40) * 180) / Math.PI, 0);
    await expect(hint).toHaveCount(0);
    expect(await runCenterDistance(page, center)).toBeLessThan(1);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).not.toBe(placed);
    await page.mouse.up();
    await expect(hint).toBeVisible();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    await expect(page.locator(".map-errors")).toHaveCount(0);
    expect(errors.filter((message) => message.includes("saatavilla"))).toEqual(
        [],
    );
    await expect(directionButton).toHaveAttribute("aria-checked", "true");
    const aimed = settings().direction;
    const start = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await page.mouse.move(originX, originY + 140);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(settings().direction).toBeCloseTo(aimed, 0);
    await map.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(400);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(start);
    await expect(hint).toHaveCount(0);
    expect(settings().direction).toBeCloseTo(aimed, 0);
    await expect(hint).toHaveCount(0);
    await expect(directionButton).toHaveAttribute("aria-checked", "false");
    await page.mouse.move(originX - 100, originY);
    await page.mouse.down();
    await page.mouse.move(originX - 100, originY + 80, { steps: 6 });
    await page.mouse.up();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(settings().direction).toBeCloseTo(aimed, 0);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(start);
    expect(await runCenterDistance(page, center)).toBeLessThan(1);
});

test("full-window desktop toolbar controls automatic updates", async ({
    page,
    isMobile,
}) => {
    const card = page.locator("#dropzone-map");
    const summary = card.locator(".toolbar-summary");
    const checkbox = summary.getByRole("checkbox", {
        name: "Päivitä automaattisesti",
    });
    await expect(checkbox).toHaveCount(0);
    await card
        .getByRole("button", { name: "Laajenna Hyppylinja koko ikkunaan" })
        .click();
    if (isMobile) {
        await expect(checkbox).toBeHidden();
    } else {
        await expect(checkbox).toBeVisible();
        await expect(checkbox).toBeChecked();
        await checkbox.uncheck();
        await expect
            .poll(() =>
                new URL(page.url()).searchParams.get("map_run_automatic"),
            )
            .toBe("false");
        await checkbox.check();
        await expect
            .poll(() =>
                new URL(page.url()).searchParams.get("map_run_automatic"),
            )
            .toBe("true");
        await checkbox.uncheck();
    }
    await page.keyboard.press("Escape");
    await expect(checkbox).toHaveCount(0);
    if (!isMobile)
        await expect(
            card
                .locator(".card-heading")
                .getByRole("checkbox", { name: "Päivitä automaattisesti" }),
        ).not.toBeChecked();
});

test("full-window cloud summary prefers METAR and falls back to current Open-Meteo layers", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    const card = page.locator("#dropzone-map");
    const summary = card.locator(".map-cloud-summary");
    await expect(summary).toHaveCount(0);
    await card
        .getByRole("button", { name: "Laajenna Hyppylinja koko ikkunaan" })
        .click();
    await expect(summary).toBeVisible();
    await expect(summary.locator(".map-cloud-source")).toContainText("METAR");
    await expect(summary.locator(".map-cloud-source .from-now")).toContainText(
        "sitten",
    );
    await expect(summary.locator(".map-cloud-layer").first()).toHaveText(
        /200 m/,
    );
    await expect(
        summary.getByRole("img", { name: "Ukkospilviä" }),
    ).toHaveAttribute(
        "data-tooltip",
        /Havainto ei kerro ukkospilvien peittävyyttä tai korkeutta\./,
    );
    await expect(summary).toHaveAttribute("aria-expanded", "true");
    await summary.click();
    await expect(summary).toHaveAttribute("aria-expanded", "false");
    await expect(summary).toHaveAccessibleName("Näytä pilviyhteenveto");
    await expect(summary.locator(".map-cloud-layers")).toHaveCount(0);
    await summary.click();
    await expect(summary).toHaveAttribute("aria-expanded", "true");
    await expect(summary.locator(".map-cloud-layer").first()).toContainText(
        "200 m",
    );
    await summary.press("Enter");
    await expect(summary).toHaveAttribute("aria-expanded", "false");
    await summary.press("Space");
    await expect(summary).toHaveAttribute("aria-expanded", "true");

    const forecast = openMeteoResponse();
    for (const level of ["1000", "925", "700", "600"]) {
        forecast.hourly[`cloud_cover_${level}hPa`] = forecast.hourly.time.map(
            () => null,
        );
    }
    forecast.hourly.cloud_cover_850hPa[0] = 99;
    await page.evaluate(async (forecast) => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = forecast;
    }, forecast);
    await expect(summary.locator(".map-cloud-source")).toContainText("METAR");

    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({
            MANUAL_metar: "METAR EFJY 041200Z 00000KT CAVOK 10/05 Q1014=",
        });
    });
    await expect(summary.locator(".map-cloud-layer")).toHaveText(["CAVOK"], {
        useInnerText: true,
    });
    await expect(summary.locator(".map-cloud-source")).toContainText("METAR");

    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({
            MANUAL_metar: "METAR EFJY 041200Z 00000KT 9999 10/05 Q1014=",
        });
    });
    await expect(summary.locator(".map-cloud-source")).toContainText(
        "Open-Meteo",
    );
    await expect(summary.locator(".map-cloud-layer")).toHaveText([/1500 m/]);

    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.cloud_cover_1000hPa.fill(20);
        data.hourly.cloud_cover_700hPa.fill(75);
        OM_DATA.value = data;
    });
    const modelLayers = summary.locator(".cloud-profile-layer");
    await expect(modelLayers).toHaveCount(3);
    for (const [index, pressure] of [1000, 850, 700].entries()) {
        await expect(modelLayers.nth(index)).toHaveAttribute(
            "data-tooltip",
            new RegExp(` · ${pressure} hPa · `),
        );
    }
    const mapTooltips = await modelLayers.evaluateAll((layers) =>
        layers.map((layer) => layer.getAttribute("data-tooltip")),
    );
    expect(
        await page
            .locator("#clouds .cloud-profile-layer")
            .evaluateAll((layers) =>
                layers.map((layer) => layer.getAttribute("data-tooltip")),
            ),
    ).toEqual(mapTooltips);

    await page.evaluate(async () => {
        const { LIVE_METARS, OM_DATA } = await import("#app/weather/state.js");
        const { navigateQs } = await import("#app/app/settings.js");
        LIVE_METARS.value = undefined;
        navigateQs({ MANUAL_metar: undefined });
        OM_DATA.value = { ...OM_DATA.value };
    });
    await expect(summary.locator(".map-cloud-source")).toContainText(
        "Open-Meteo",
    );
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = null;
    });
    await expect(summary).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(summary).toHaveCount(0);
});

test("full-window map compass collapses and restores on desktop", async ({
    page,
    isMobile,
}) => {
    // The compass needs a wide map with enough height for the wind selector.
    if (!isMobile) await page.setViewportSize({ width: 1280, height: 900 });
    const card = page.locator("#dropzone-map");
    await expect(card.locator(".map-compass")).toHaveCount(0);
    await card
        .getByRole("button", { name: "Laajenna Hyppylinja koko ikkunaan" })
        .click();
    const compass = card.locator(".map-compass");
    if (isMobile) {
        await expect(compass).toBeHidden();
    } else {
        await expect(compass).toBeVisible();
        await expect(compass).toHaveAttribute("aria-expanded", "true");
        const gust = compass.locator(".latest-gust");
        await expect(gust).toHaveText(/^6\s*m\/s$/);
        await expect(compass.locator(".map-compass-gust-label")).toHaveText(
            "Puuska maassa",
        );
        await expect(compass.locator(".map-compass-gust-age")).toHaveText(
            "5 minuuttia sitten",
        );
        await page.evaluate(async () => {
            const { HOVERED_OBSERVATION, LATEST_OBSERVATION } =
                await import("#app/weather/state.js");
            HOVERED_OBSERVATION.value = {
                ...LATEST_OBSERVATION.value,
                gust: 99,
            };
        });
        await expect(gust).toHaveText(/^6\s*m\/s$/);
        await page.evaluate(async () => {
            const { HOVERED_OBSERVATION } =
                await import("#app/weather/state.js");
            HOVERED_OBSERVATION.value = undefined;
        });
        await expect
            .poll(() =>
                compass
                    .locator("polygon.animated")
                    .evaluateAll(
                        (needles) =>
                            needles
                                .flatMap((needle) => needle.getAnimations())
                                .filter(
                                    (animation) =>
                                        animation.playState === "running",
                                ).length,
                    ),
            )
            .toBeGreaterThan(0);
        await compass.click();
        await expect(compass).toHaveAttribute("aria-expanded", "false");
        await expect(compass.locator("#map-compass")).toHaveCount(0);
        await expect(gust).toHaveCount(0);
        await compass.press("Enter");
        await expect(compass).toHaveAttribute("aria-expanded", "true");
        await expect(compass.locator("#map-compass")).toBeVisible();
        await expect(gust).toHaveText(/^6\s*m\/s$/);
    }
    await page.keyboard.press("Escape");
    await expect(compass).toHaveCount(0);
});

test("wheel zoom follows full-window mode and Escape exits direction mode first", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const card = page.locator("#dropzone-map");
    const map = card.locator(".dz-map");
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 100, y: 160 } });
    await page.getByRole("button", { name: "Avaus" }).click();
    const directionButton = directionControl(page, directionControls.drag);
    const zoom = () => new URL(page.url()).searchParams.get("map_zoom");
    const wheel = () => map.dispatchEvent("wheel", { deltaY: -500 });
    const initialZoom = zoom();
    await wheel();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(initialZoom);

    await clickDirection(page, directionControls.drag);
    await page.keyboard.press("Escape");
    await expect(directionButton).toHaveAttribute("aria-checked", "false");
    await card
        .getByRole("button", {
            name: "Laajenna Hyppylinja koko ikkunaan",
        })
        .click();
    await expect(
        card.getByRole("button", { name: "Palauta Hyppylinja", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const fittedZoom = zoom();
    await wheel();
    await expect.poll(zoom).not.toBe(fittedZoom);
    const expandedZoom = zoom();
    await clickDirection(page, directionControls.drag);
    await wheel();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(expandedZoom);

    await card
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(card.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card.getByRole("dialog")).not.toBeVisible();
    await expect(directionButton).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(directionButton).toHaveAttribute("aria-checked", "false");
    await expect(
        card.getByRole("button", { name: "Palauta Hyppylinja", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await wheel();
    await expect.poll(zoom).not.toBe(expandedZoom);
    await page.keyboard.press("Escape");
    await expect(
        card.getByRole("button", {
            name: "Laajenna Hyppylinja koko ikkunaan",
            exact: true,
        }),
    ).toHaveAttribute("aria-pressed", "false");
    const restoredZoom = zoom();
    await wheel();
    await page.waitForTimeout(400);
    expect(zoom()).toBe(restoredZoom);
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
    await page.getByRole("button", { name: "Avaus" }).click();
    const run = map.locator(".jump-run-line");
    const jumper = map.locator(".jump-run-jumper").first();
    await expect(jumper).toBeVisible();
    const directionButton = directionControl(page, directionControls.drag);
    const hint = page
        .getByRole("status")
        .filter({ hasText: "Vedä asettaaksesi hyppylinjan suunnan." });
    await clickDirection(page, directionControls.drag);
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
    await expect(directionButton).toHaveAttribute("aria-checked", "true");
    await expect(run).toHaveAttribute("d", preview);
    // Release keeps the aimed track and stays in direction mode.
    await page.mouse.move(bounds.x + 100, bounds.y + 280);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(run).toHaveAttribute("d", preview);
    await expect(hint).toBeVisible();
    const aimedStart = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: bounds.x + 80, y: bounds.y + 120 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await expect(hint).toHaveCount(0);
    await expect(directionButton).toHaveAttribute("aria-checked", "false");
    await expect(run).toHaveAttribute("d", preview);
    await page.waitForTimeout(400);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(aimedStart);
    await touch.detach();
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
    await page.getByRole("button", { name: "Avaus" }).click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(6);
    await toolbar
        .getByRole("button", { name: "Lisää hyppääjä", exact: true })
        .click();
    await expect(map.locator(".freefall-drift-line")).toHaveCount(7);
    await page.getByRole("button", { name: "Lähennä karttaa" }).click();
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_zoom"))
        .toBe("15");
    const setup = new URL(page.url());
    expect(setup.searchParams.has("map_run_settings")).toBe(false);
    expect(setup.searchParams.has("map_run_start")).toBe(false);
    expect(setup.searchParams.get("map_run_speed")).toBe("157");
    expect(setup.searchParams.get("map_run_separation")).toBe("5");
    expect(setup.searchParams.get("map_run_exit_height")).toBe("4000");
    expect(setup.searchParams.get("map_jumpers")).toBe(
        Array(7).fill("s180h800").join("_"),
    );
    for (const [key, value] of setup.searchParams) {
        if (key.startsWith("map_")) expect(value).not.toMatch(/[{}\[\]"]/);
    }
    expect(
        readMapQuery(Object.fromEntries(setup.searchParams), "map_jumpers"),
    ).toHaveLength(7);
    expect(
        readMapQuery(Object.fromEntries(setup.searchParams), "map_run_start"),
    ).toHaveProperty("lat");
    expect(
        readMapQuery(
            Object.fromEntries(setup.searchParams),
            "map_run_settings",
        ),
    ).toHaveProperty("direction");
    expect(
        Number.isFinite(Number(setup.searchParams.get("map_center_lat"))),
    ).toBe(true);
    expect(
        Number.isFinite(Number(setup.searchParams.get("map_center_lon"))),
    ).toBe(true);
    await toolbar.getByRole("button", { name: "Jaa hyppylinja" }).click();
    const shared = await page.evaluate(() => window.sharedMap);
    const sharedURL = new URL(shared.url);
    expect(sharedURL.searchParams.get("map_full_window")).toBe("true");
    setup.searchParams.set("map_full_window", "true");
    expect(sharedURL.href).toBe(setup.href);
    expect(new URL(page.url()).searchParams.get("map_full_window")).toBeNull();
    await page.goto(shared.url);
    await setUniformFreefallWind(page);
    await expect(
        toolbar.getByRole("button", { name: "Palauta Hyppylinja" }),
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
            map_run_start_lat: "[null]",
            map_run_start_lon: "[null]",
            map_jumpers: "{}",
            map_zoom: "1000",
            map_center_lat: '"broken"',
            map_center_lon: "200",
        });
    });
    await setUniformFreefallWind(page);
    const toolbar = page.locator(".freefall-toolbar");
    await expect(
        toolbar.getByRole("button", { name: "Palauta Hyppylinja" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Invalid run coordinates fall back to automatic placement at the station.
    await expect(page.locator(".freefall-drift-line")).toHaveCount(6);
    await page.goBack();
    await expect(
        toolbar.getByRole("button", {
            name: "Laajenna Hyppylinja koko ikkunaan",
        }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.goForward();
    await expect(
        toolbar.getByRole("button", { name: "Palauta Hyppylinja" }),
    ).toHaveAttribute("aria-pressed", "true");
});

test("cloud card shows METAR before the current Open-Meteo profile", async ({
    page,
}) => {
    const response = openMeteoResponse();
    response.elevation = 68;
    response.hourly.geopotential_height_600hPa = response.hourly.time.map(
        () => 4274,
    );
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
        MANUAL_metar: "METAR KJFK 041200Z 18010KT 9999 FEW020 10/05 Q1014=",
    });
    await page.goto(`/dz/?${params}`);
    const card = page.locator("#clouds");
    await expect(card.getByRole("tablist")).toHaveCount(0);
    await expect(card.locator(".cloud-layer")).toHaveCount(4);
    await expect(card.locator(".cloud-layer").first()).not.toHaveClass(
        /cloud-profile-layer/,
    );
    await expect(card.locator(".cloud-layer a")).toHaveCount(0);
    const rows = card.locator(".cloud-profile-layer");
    await expect(rows).toHaveCount(3);
    // The 20 m surface is below the model terrain at 68 m.
    await expect(rows.first()).toContainText("800 m");
    await expect(rows.nth(2)).toContainText("4300 m");
    const altitude = rows.nth(2);
    await altitude.focus();
    await expect(page.getByRole("tooltip")).toContainText("4274 m");
    await page.keyboard.press("Escape");

    await expect(rows.nth(1)).toContainText("3000 m");
    await rows.nth(1).focus();
    await expect(page.getByRole("tooltip")).toContainText("75 %");
    await expect(page.getByRole("tooltip")).toContainText("700 hPa");
    await page.keyboard.press("Escape");
    // Changing the URL elevation updates heights and filters levels below the DZ.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "1000.5" });
    });
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("2000 m");
    await expect(page.locator("#title")).toContainText("1001 m merenpinnasta");
    // Refocus the updated reading to reopen its tooltip after Escape.
    await rows.nth(1).focus();
    await rows.first().focus();
    await expect(page.getByRole("tooltip")).toHaveText(
        "75 % · 700 hPa · 2000 m",
    );
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: undefined });
    });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toContainText("3000 m");
    // Losing METAR leaves the model visible.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ icaocode: undefined, MANUAL_metar: undefined });
    });
    await expect(card.getByRole("tablist")).toHaveCount(0);
    await expect(card.locator(".cloud-profile-layer")).toHaveCount(3);
});

test("cloud card hides empty model levels, preserves CAVOK, and shows one sun without METAR", async ({
    page,
}) => {
    const response = openMeteoResponse();
    for (const level of [600, 700, 850, 925, 1000]) {
        response.hourly[`cloud_cover_${level}hPa`] = response.hourly.time.map(
            () => 0,
        );
    }
    response.hourly.cloud_cover_700hPa[1] = 5;
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: response }),
    );
    const params = new URLSearchParams({
        name: "Cloud DZ",
        lat: "40.7",
        lon: "-74",
        icaocode: "KJFK",
        MANUAL_metar: "METAR KJFK 041200Z 00000KT CAVOK 10/05 Q1014=",
    });
    await page.goto(`/dz/?${params}`);
    const card = page.locator("#clouds");
    await expect(card.locator(".cloud-profile-layer")).toHaveCount(1);
    await expect(card.locator(".cloud-profile-layer")).toHaveAttribute(
        "data-tooltip",
        /^5 % · 700 hPa · /,
    );
    await expect(card.locator(".cloud-clear")).toHaveCount(1);
    await expect(card.locator(".cloud-clear")).toHaveText("CAVOK", {
        useInnerText: true,
    });
    await expect(card).not.toContainText(
        "Mallinnettu pilvipeitto eri korkeuksilla",
    );

    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.cloud_cover_700hPa.fill(0);
        OM_DATA.value = data;
    });
    await expect(card.locator(".cloud-profile-layer")).toHaveCount(0);
    await expect(card.locator(".open-meteo-clouds")).toHaveCount(1);
    await expect(card.locator(".open-meteo-clouds")).toContainText(
        "Mallinnetut pilvet",
    );
    await expect(card.locator(".open-meteo-clouds")).toContainText(
        "Lähde: Open-Meteo",
    );
    await expect(card.locator(".open-meteo-clouds")).toContainText("Ei pilviä");
    await expect(card.locator(".cloud-clear")).toHaveCount(2);
    await expect(card.locator(".cloud-clear").first()).toHaveText("CAVOK", {
        useInnerText: true,
    });
    const modelClear = card.locator(".open-meteo-clouds .cloud-clear");
    await expect(modelClear).toHaveText("Ei pilviä", { useInnerText: true });
    await expect(
        modelClear.getByRole("img", { name: "Ei pilviä", exact: true }),
    ).toHaveCount(1);

    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        const clearData = structuredClone(OM_DATA.value);
        navigateQs({ icaocode: undefined, MANUAL_metar: undefined });
        await updateWeatherData();
        OM_DATA.value = clearData;
    });
    await expect(card.locator(".cloud-clear")).toHaveCount(1);
    await expect(card.locator(".cloud-clear")).toHaveText("Ei pilviä", {
        useInnerText: true,
    });
    await expect(card.locator(".cloud-clear").getByRole("img")).toHaveCount(1);

    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = null;
    });
    await expect(card.locator(".cloud-clear")).toHaveCount(0);
    await expect(card).toContainText(
        "Nykyisen tunnin pilviennuste ei ole saatavilla.",
    );
});

test("cloud summary stays at 24 hours while the detailed table shows 48 hourly entries", async ({
    page,
}) => {
    const labels = await page.evaluate(async () => {
        const { FORECASTS, FORECAST_SOURCE } =
            await import("#app/weather/state.js");
        const { formatClock } = await import("#app/shared/dates.js");
        const start = new Date();
        start.setMinutes(0, 0, 0);
        FORECASTS.value = Array.from({ length: 301 }, (_, index) => ({
            source: "forecast",
            time: new Date(start.getTime() + (index - 6) * 10 * 60 * 1000),
            speed: 5,
            gust: 8,
            direction: 180,
            lowCloudCover: 20,
        }));
        FORECAST_SOURCE.value = "FMI";
        return [
            formatClock(start),
            formatClock(new Date(start.getTime() + 47 * 60 * 60 * 1000)),
        ];
    });
    const forecast = page.locator("#clouds .cloud-forecast");
    await expect(forecast.getByRole("heading")).toHaveText(
        "Ennuste · 24 tuntia",
    );
    const headers = forecast
        .locator(":scope > .cloud-forecast-details .cloud-forecast-table")
        .getByRole("columnheader", { includeHidden: true });
    await expect(headers).toHaveCount(25);
    await expect(headers.nth(1)).toHaveText(labels[0]);
    await forecast
        .getByRole("button", {
            name: "Yksityiskohtainen pilviennuste taulukkona",
        })
        .click();
    const dialog = page.getByRole("dialog", {
        name: "Yksityiskohtainen pilviennuste",
    });
    const detailHeaders = dialog.getByRole("columnheader");
    await expect(detailHeaders).toHaveCount(49);
    await expect(detailHeaders.nth(1)).toHaveText(labels[0]);
    await expect(detailHeaders.last()).toHaveText(labels[1]);
    await expect(headers).toHaveCount(25);
});

test("compact cloud forecast opens detailed FMI and Open-Meteo table", async ({
    page,
}) => {
    const currentHourLabel = await page.evaluate(async () => {
        const { FORECASTS, FORECAST_SOURCE } =
            await import("#app/weather/state.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        const firstHour = new Date();
        firstHour.setMinutes(0, 0, 0);
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
        FORECASTS.value = [
            {
                source: "forecast",
                time: new Date(firstHour.getTime() - 60 * 60 * 1000),
                lowCloudCover: 99,
            },
            ...FORECASTS.value,
            {
                source: "forecast",
                time: new Date(firstHour.getTime() + 30 * 60 * 1000),
                lowCloudCover: 99,
            },
        ];
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
            700: 3074,
            600: 4200,
            500: 5500,
            400: 7000,
        })) {
            hourly[`windspeed_${level}hPa`] = hourlyTimes.map(() => 12);
            hourly[`winddirection_${level}hPa`] = hourlyTimes.map(() => 200);
            hourly[`cloud_cover_${level}hPa`] = hourlyTimes.map(() => 40);
            hourly[`geopotential_height_${level}hPa`] = hourlyTimes.map(
                () => height,
            );
        }
        hourly.cloud_cover_700hPa = [70, 10, 0];
        hourly.cloud_cover_600hPa = [100, 100, 100];
        hourly.cloud_cover_1000hPa[2] = 0;
        hourly.cloud_cover_925hPa[2] = 0;
        hourly.geopotential_height_925hPa[1] = 20;
        hourly.geopotential_height_850hPa[2] = null;
        OM_DATA.value = { utc_offset_seconds: 0, elevation: 68, hourly };
        const { formatClock } = await import("#app/shared/dates.js");
        return formatClock(firstHour);
    });

    const forecast = page.locator("#clouds .cloud-forecast");
    const compactTable = forecast.locator(
        ":scope > .cloud-forecast-details .cloud-forecast-table",
    );
    await expect(compactTable.getByRole("columnheader").nth(1)).toHaveText(
        currentHourLabel,
    );
    await expect(compactTable.getByRole("columnheader")).toHaveCount(4);
    await expect(compactTable.locator("tbody tr")).toHaveCount(2);
    await expect(compactTable.getByRole("rowheader")).toContainText([
        "0–2 km",
        "0–4 km",
    ]);
    await expect(compactTable.locator(".forecast-source-label")).toHaveText([
        "FMI",
        "Open-Meteo",
    ]);
    const compactRows = compactTable.locator("tbody tr");
    await expect(compactRows.nth(0).locator("td")).toHaveText([
        "10 %",
        "20 %",
        "30 %",
    ]);
    await expect(compactRows.nth(1).locator("td")).toHaveText([
        "100 %",
        "100 %",
        "100 %",
    ]);
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
    await expect(dialog.getByRole("columnheader").nth(1)).toHaveText(
        currentHourLabel,
    );
    await expect(dialog.getByRole("columnheader")).toHaveCount(4);
    await expect(dialog.locator("tbody tr")).toHaveCount(12);
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
        "0–4 km",
        "4000 m",
        "3000 m",
        "1500 m",
        "1000 m",
        "0 m",
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
        ["Pilvipeitto 0–4 km:n korkeudella", "Suurin Open-Meteon"],
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
    const summaryRow = dialog.getByRole("row").filter({
        has: page.getByRole("button", { name: /^Pilvipeitto 0–/ }),
    });
    await expect(summaryRow.locator("td")).toHaveText([
        "100 %",
        "100 %",
        "100 %",
    ]);
    const setExitHeight = async (exitHeight) => {
        await page.evaluate(async (exitHeight) => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({
                ...writeMapQuery("map_run_settings", {
                    direction: 0,
                    speedKmh: 157,
                    separationSeconds: 5,
                    exitHeight,
                }),
            });
        }, exitHeight);
    };
    await setExitHeight(1000);
    await expect(summaryRow.getByRole("rowheader")).toContainText("0–1 km");
    await expect(compactRows.nth(1).getByRole("rowheader")).toContainText(
        "0–1 km",
    );
    await expect(compactRows.nth(1).locator("td")).toHaveText([
        "40 %",
        "40 %",
        "0 %",
    ]);
    await expect(summaryRow.locator("td")).toHaveText(["40 %", "40 %", "0 %"]);
    // 3074 m is closer than 4200 m below the midpoint; ties use the lower level.
    for (const exitHeight of [3500, 3637]) {
        await setExitHeight(exitHeight);
        await expect(summaryRow.locator("td")).toHaveText([
            "70 %",
            "40 %",
            "0 %",
        ]);
        await expect(compactRows.nth(1).locator("td")).toHaveText([
            "70 %",
            "40 %",
            "0 %",
        ]);
    }
    await setExitHeight(3638);
    await expect(summaryRow.locator("td")).toHaveText([
        "100 %",
        "100 %",
        "100 %",
    ]);
    await setExitHeight(4200);
    await expect(summaryRow.getByRole("rowheader")).toContainText("0–4.2 km");
    await expect(summaryRow.locator("td")).toHaveText([
        "100 %",
        "100 %",
        "100 %",
    ]);
    await setExitHeight(-1);
    await expect(summaryRow.getByRole("rowheader")).toContainText("0–4 km");
    await expect(summaryRow.locator("td")).toHaveText([
        "100 %",
        "100 %",
        "100 %",
    ]);
    await setExitHeight(4000);

    const pressureRow = (level) =>
        dialog.locator(`tr:has(th[title="${level} hPa"])`);
    await expect(pressureRow(925).locator("td")).toHaveText([
        "40 %",
        "—",
        "0 %",
    ]);
    await expect(pressureRow(850).locator("td")).toHaveText([
        "40 %",
        "40 %",
        "—",
    ]);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "200.5" });
    });
    await expect(page.locator("#title")).toContainText("201 m merenpinnasta");
    const altitude = pressureRow(700)
        .getByRole("rowheader")
        .locator("[data-tooltip]");
    await altitude.focus();
    await expect(page.getByRole("tooltip")).toContainText("2874 m");
    await altitude.blur();

    await expect(pressureRow(700).getByRole("rowheader")).toHaveText("3000 m");
    await expect(pressureRow(925).getByRole("rowheader")).toHaveText("500 m");
    await expect(pressureRow(1000).locator("td")).toHaveText(["—", "—", "—"]);
    await expect(pressureRow(925).locator("td")).toHaveText([
        "40 %",
        "—",
        "0 %",
    ]);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "invalid" });
    });
    await expect(pressureRow(700).getByRole("rowheader")).toHaveText("3000 m");
    await expect(pressureRow(1000).locator("td")).toHaveText([
        "40 %",
        "40 %",
        "0 %",
    ]);
    await expect(page.locator("#title")).toContainText("0 m merenpinnasta");
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        OM_DATA.value = null;
    });
    await expect(summaryRow.locator("td")).toHaveText(["—", "—", "—"]);
});

for (const [axis, wind, speed, expected] of [
    [180, 0, 10, 0],
    [90, 0, 10, 90],
    [180, 0, 0, 180],
]) {
    test(`automatic jump-run positioning uses axis ${axis} into wind ${wind} at ${speed} m/s`, async ({
        page,
    }) => {
        await page.goto(
            `${manualPath}&MANUAL_ground_obs=10,10,0,1&lat=62.4&lon=25.6&default_jump_run_direction=${axis}&default_jump_group_count=4&MANUAL_upper_winds=${[7000, 5500, 4200, 3000, 1500, 800, 110].map((height) => `${speed},${wind},${height}`).join(";")}`,
        );
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBeNull();
        await setUniformFreefallWind(page);
        await expect(page.locator(".jump-run-jumper")).toHaveCount(4);
        const params = new URL(page.url()).searchParams;
        expect(
            readMapQuery(Object.fromEntries(params), "map_run_settings")
                .direction,
        ).toBe(expected);
        await expectAutomaticOpeningsUpwind(page);
        // A saved placement survives reload, even before fresh winds arrive.
        const start = mapQuerySnapshot(params, "map_run_start");
        await page.reload();
        await setUniformFreefallWind(page);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBe(start);
        await page.getByRole("button", { name: "Poista hyppylinja" }).click();
        await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
        await page.reload();
        await setUniformFreefallWind(page);
        await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
        await page
            .getByRole("button", {
                name: "Hyppylinjan automaattinen sijoitus",
            })
            .click();
        await expect(page.locator(".jump-run-jumper")).toHaveCount(4);
        const restoredParams = new URL(page.url()).searchParams;
        expect(
            readMapQuery(Object.fromEntries(restoredParams), "map_run_settings")
                .direction,
        ).toBe(expected);
        expect(mapQuerySnapshot(restoredParams, "map_run_start")).toBe(start);
        // Repositioning an existing run applies the same reversal to its
        // current axis.
        await page.evaluate(async (direction) => {
            const { navigateQs, QUERY_PARAMS } =
                await import("#app/app/settings.js");
            const settings =
                QUERY_PARAMS.value.map_run_direction !== undefined
                    ? readMapQuery(QUERY_PARAMS.value, "map_run_settings")
                    : {
                          direction: 0,
                          speedKmh: 157,
                          separationSeconds: 5,
                          exitHeight: 4000,
                      };
            navigateQs(
                {
                    ...writeMapQuery("map_run_settings", {
                        ...settings,
                        direction,
                    }),
                },
                { replace: true },
            );
        }, axis);
        await page
            .getByRole("button", {
                name: "Hyppylinjan automaattinen sijoitus",
            })
            .click();
        expect(
            readMapQuery(
                Object.fromEntries(new URL(page.url()).searchParams),
                "map_run_settings",
            ).direction,
        ).toBe(expected);
        await expectAutomaticOpeningsUpwind(page);
    });
}

test("map zoom buttons update the saved view and stop at zoom limits", async ({
    page,
}) => {
    await setUniformFreefallWind(page);
    const controls = page.locator(".map-navigation-controls");
    const zoomIn = controls.getByRole("button", { name: "Lähennä karttaa" });
    const zoomOut = controls.getByRole("button", { name: "Loitonna karttaa" });
    const zoom = () =>
        Number(new URL(page.url()).searchParams.get("map_zoom") ?? "14");
    const initialZoom = zoom();
    await zoomIn.click();
    await expect.poll(zoom).toBe(initialZoom + 1);
    await zoomOut.click();
    await expect.poll(zoom).toBe(initialZoom);
    for (const limit of [19, 0]) {
        await page.evaluate(async (limit) => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({ map_zoom: String(limit) }, { replace: true });
        }, limit);
        await expect(limit === 19 ? zoomIn : zoomOut).toBeDisabled();
        await expect(limit === 19 ? zoomOut : zoomIn).toBeEnabled();
    }
});

test("viewport positioning fits a saved run without landing coordinates and disables after clearing", async ({
    page,
}) => {
    const start = { lat: 62.4, lng: 25.6 };
    const params = new URLSearchParams({
        ...writeMapQuery("map_run_start", start),
        map_run_automatic: "false",
        map_center_lat: "60",
        map_center_lon: "20",
        map_zoom: "19",
    });
    await page.goto(`${manualPath}&${params}`);
    const fit = page.getByRole("button", {
        name: "Sovita karttanäkymä hyppylinjaan",
    });
    await expect(fit).toBeDisabled();
    await setUniformFreefallWind(page);
    await expect(fit).toBeEnabled();
    const original = new URL(page.url()).searchParams;
    await fit.click();
    await expect
        .poll(() => Number(new URL(page.url()).searchParams.get("map_zoom")))
        .not.toBe(Number(original.get("map_zoom")));
    const fitted = new URL(page.url()).searchParams;
    expect(mapQuerySnapshot(fitted, "map_run_start")).toBe(
        mapQuerySnapshot(original, "map_run_start"),
    );
    expect(mapQuerySnapshot(fitted, "map_run_settings")).toBe(
        mapQuerySnapshot(original, "map_run_settings"),
    );
    expect(fitted.get("map_jumpers")).toBe(original.get("map_jumpers"));
    const point = await mapPoint(page, start);
    const bounds = await page.locator(".dz-map").boundingBox();
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(bounds.width);
    expect(point.y).toBeGreaterThan(0);
    expect(point.y).toBeLessThan(bounds.height);
    await page.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(fit).toBeDisabled();
});

test("initial automatic positioning finishes fitting the flight paths", async ({
    page,
}) => {
    await page.goto(
        `${manualPath}&MANUAL_ground_obs=10,10,0,1&lat=62.4&lon=25.6&map_center_lat=62.4&map_center_lon=25.6&map_zoom=14&MANUAL_upper_winds=10,0,7000;10,0,5500;10,0,4200;10,0,3000;10,0,1500;10,0,800;10,0,110`,
    );
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    const start = readMapQuery(
        Object.fromEntries(new URL(page.url()).searchParams),
        "map_run_start",
    );
    const landing = await middleOpening(page, true);
    await expect
        .poll(async () => {
            const bounds = await page.locator(".dz-map").boundingBox();
            for (const coordinates of [start, landing]) {
                const point = await mapPoint(page, coordinates);
                if (
                    point.x <= 0 ||
                    point.x >= bounds.width ||
                    point.y <= 0 ||
                    point.y >= bounds.height
                )
                    return false;
            }
            return true;
        })
        .toBe(true);
});

test("viewport positioning keeps the flight path visible in a wide, short map", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 320 });
    const start = { lat: 62.4, lng: 25.6 };
    const params = new URLSearchParams({
        ...writeMapQuery("map_run_start", start),
        map_run_automatic: "false",
        map_zoom: "19",
        map_full_window: "true",
        ...writeMapQuery("map_run_settings", {
            exitHeight: 4000,
            speedKmh: 120,
            direction: 180,
            separationSeconds: 5,
        }),
        ...writeMapQuery("map_jumpers", [
            { speedKmh: 180, openingHeight: 800 },
        ]),
    });
    await page.goto(`${manualPath}&${params}`);
    await setUniformFreefallWind(page);
    const fit = page.getByRole("button", {
        name: "Sovita karttanäkymä hyppylinjaan",
    });
    await expect(fit).toBeEnabled();
    await fit.click();
    await expect
        .poll(() => Number(new URL(page.url()).searchParams.get("map_zoom")))
        .toBeGreaterThan(0);
    await expect
        .poll(() => Number(new URL(page.url()).searchParams.get("map_zoom")))
        .toBeLessThan(19);
    const bounds = await page.locator(".dz-map").boundingBox();
    for (const coordinates of [start, await middleOpening(page)]) {
        const point = await mapPoint(page, coordinates);
        expect(point.x).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(bounds.width);
        expect(point.y).toBeGreaterThan(0);
        expect(point.y).toBeLessThan(bounds.height);
    }
});

test("automatic positioning reverses the current axis into wind and reset restores the default axis", async ({
    page,
}) => {
    await page.goto(
        `${manualPath}&MANUAL_ground_obs=10,10,0,1&lat=62.4&lon=25.6&default_jump_run_direction=180&MANUAL_upper_winds=10,180,7000;10,180,5500;10,180,4200;10,180,3000;10,180,1500;10,0,800;10,0,110`,
    );
    await setUniformFreefallWind(page);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    await clickDirection(page, directionControls.clockwise);
    await page.evaluate(async () => {
        const { navigateQs, QUERY_PARAMS } =
            await import("#app/app/settings.js");
        const settings =
            QUERY_PARAMS.value.map_run_direction !== undefined
                ? readMapQuery(QUERY_PARAMS.value, "map_run_settings")
                : {
                      direction: 0,
                      speedKmh: 157,
                      separationSeconds: 5,
                      exitHeight: 4000,
                  };
        navigateQs(
            {
                MANUAL_upper_winds:
                    "10,0,7000;10,0,5500;10,0,4200;10,0,3000;10,0,1500;10,0,800;10,0,110",
                ...writeMapQuery("map_run_start", { lat: 62.41, lng: 25.61 }),
                ...writeMapQuery("map_run_settings", {
                    ...settings,
                    direction: 225,
                }),
            },
            { replace: true },
        );
    });
    const position = page.getByRole("button", {
        name: "Hyppylinjan automaattinen sijoitus",
    });
    // Altitude overrides remain usable during a weather refresh.
    await expect(position).toBeEnabled();
    await setUniformFreefallWind(page);
    await position.click();
    const positionedParams = new URL(page.url()).searchParams;
    const positionedSettings = readMapQuery(
        Object.fromEntries(positionedParams),
        "map_run_settings",
    );
    expect(positionedSettings.direction).toBe(45);
    expect(
        readMapQuery(Object.fromEntries(positionedParams), "map_run_start"),
    ).not.toEqual({
        lat: 62.41,
        lng: 25.61,
    });
    await expectAutomaticOpeningsUpwind(page);
    const opening = await middleOpening(page);
    const directionMode = directionControl(page, directionControls.drag);
    await clickDirection(page, directionControls.drag);
    await page.keyboard.press("Escape");
    await clickDirection(page, directionControls.reset);
    await expect(directionMode).toHaveAttribute("aria-checked", "false");
    const resetParams = new URL(page.url()).searchParams;
    expect(
        readMapQuery(Object.fromEntries(resetParams), "map_run_settings"),
    ).toEqual({
        ...positionedSettings,
        direction: 0,
    });
    expect(resetParams.get("map_jumpers")).toBe(
        positionedParams.get("map_jumpers"),
    );
    expect(resetParams.get("default_jump_run_direction")).toBe("180");
    expect(await openingDistance(page, opening)).toBeLessThan(1);
    await page.getByRole("button", { name: "Poista hyppylinja" }).click();
    await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
    await setUniformFreefallWind(page);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(0);
    await position.click();
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    expect(
        readMapQuery(
            Object.fromEntries(new URL(page.url()).searchParams),
            "map_run_settings",
        ).direction,
    ).toBe(0);
});

test("automatic positioning is disabled for an infeasible current direction and reset recovers", async ({
    page,
}) => {
    await page.goto(
        `${manualPath}&MANUAL_ground_obs=10,10,0,1&lat=62.4&lon=25.6&default_jump_run_direction=180&MANUAL_upper_winds=10,0,7000;10,0,5500;10,0,4200;10,180,3000;10,180,1500;10,90,800;10,0,110`,
    );
    await setUniformFreefallWind(page);
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    const errors = [];
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    await settings
        .getByRole("slider", { name: "Hyppylinjan suunta" })
        .fill("90");
    await settings
        .getByRole("spinbutton", { name: "Todellinen ilmanopeus (km/h)" })
        .fill("20");
    await page.keyboard.press("Escape");
    const position = page.getByRole("button", {
        name: "Hyppylinjan automaattinen sijoitus",
    });
    await expect(position).toBeDisabled();
    await expect(page.locator(".automatic-run-unavailable")).toHaveCount(0);
    const error = page.locator(".map-errors .jump-run-unavailable");
    await expect(error).toContainText(
        "Hyppylinjan paikat eivät ole saatavilla",
    );
    await expect
        .poll(() => errors)
        .toContain((await error.textContent()).trim());
    await clickDirection(page, directionControls.reset);
    await expect(position).toBeEnabled();
    await expect(page.locator(".map-errors")).toHaveCount(0);
    const run = readMapQuery(
        Object.fromEntries(new URL(page.url()).searchParams),
        "map_run_settings",
    );
    expect(run.direction).toBe(180);
    expect(run.speedKmh).toBe(20);
    await position.click();
    await expectAutomaticOpeningsUpwind(page);
});

async function expectAutomaticOpeningsUpwind(page, targetLat = 62.4) {
    const openings = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { createJumpRunCalculator } = await import("#app/map/jumpRun.js");
        const { jumpRunCoordinates, driftCoordinates } =
            await import("#app/map/freefall.js");
        const params = new URL(location.href).searchParams;
        const settings = readMapQuery(
            Object.fromEntries(params),
            "map_run_settings",
        );
        const start = readMapQuery(Object.fromEntries(params), "map_run_start");
        const group = readMapQuery(Object.fromEntries(params), "map_jumpers");
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
            (((lat - targetLat) * Math.PI) / 180) * 6371000,
        ).toBeGreaterThanOrEqual(50);
}

for (const [description, ground] of [
    ["invalid", "10,-1,180,1"],
    ["stale", "10,10,0,61"],
    ["missing", ""],
]) {
    test(`automatic placement waits for usable lower winds: ${description}`, async ({
        page,
    }) => {
        await page.goto(
            `${manualPath}&MANUAL_ground_obs=${ground}&lat=62.4&lon=25.6&default_jump_run_direction=0`,
        );
        await setUniformFreefallWind(page);
        const position = page.getByRole("button", {
            name: "Hyppylinjan automaattinen sijoitus",
        });
        await expect(position).toBeDisabled();
        await expect(page.locator(".automatic-run-unavailable")).toHaveCount(0);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBeNull();
        await page.evaluate(async () => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({ MANUAL_ground_obs: "10,10,0,0" }, { replace: true });
        });
        await setUniformFreefallWind(page);
        await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
        await expect(position).toBeEnabled();
        await expectAutomaticOpeningsUpwind(page);
    });
}

test("reload shows cached weather before refresh and retains it through failures until recovery", async ({
    page,
}) => {
    await page.clock.install();
    let mode = "fresh";
    let release;
    const blocked = new Promise((resolve) => {
        release = resolve;
    });
    let gust = 7;
    let upperWind = 12;
    await page.route("https://api.open-meteo.com/**", async (route) => {
        if (mode === "blocked") await blocked;
        if (mode === "failed") return route.fulfill({ status: 503 });
        const data = openMeteoResponse();
        data.hourly.windspeed_600hPa = data.hourly.windspeed_600hPa.map(
            () => upperWind,
        );
        return route.fulfill({ json: data });
    });
    await page.route("https://tie.digitraffic.fi/**", async (route) => {
        if (mode === "blocked") await blocked;
        if (mode === "failed") return route.fulfill({ status: 503 });
        const now = await page.evaluate(() => new Date().toISOString());
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/history")) {
            return route.fulfill({
                json: { values: [], dataUpdatedTime: now },
            });
        }
        if (url.pathname.endsWith("/data")) {
            return route.fulfill({
                json: {
                    dataUpdatedTime: now,
                    sensorValues: [
                        {
                            id: 1,
                            name: "MAKSIMITUULI",
                            value: gust,
                            measuredTime: now,
                        },
                        {
                            id: 2,
                            name: "KESKITUULI",
                            value: 4,
                            measuredTime: now,
                        },
                        {
                            id: 3,
                            name: "TUULENSUUNTA",
                            value: 180,
                            measuredTime: now,
                        },
                    ],
                },
            });
        }
        return route.fulfill({
            json: {
                geometry: { coordinates: [-74, 40.7] },
                properties: { names: { fi: "Cache station" } },
            },
        });
    });
    await page.goto("/dz/?name=Cache+DZ&roadsid=5004&lat=40.7&lon=-74");
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { LIVE_OBSERVATIONS, FORECASTS, OM_DATA } =
                    await import("#app/weather/state.js");
                return (
                    LIVE_OBSERVATIONS.value[0]?.gust === 7 &&
                    FORECASTS.value.length > 0 &&
                    OM_DATA.value !== null
                );
            }),
        )
        .toBe(true);
    await page.evaluate(async () => {
        const db = await new Promise((resolve) => {
            const request = indexedDB.open("hyppykeli-api-cache", 1);
            request.onsuccess = () => resolve(request.result);
        });
        const transaction = db.transaction("responses", "readwrite");
        const store = transaction.objectStore("responses");
        const request = store.openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            const record = cursor.value;
            record.entry.fetchedAt -= 60 * 60_000;
            record.entry.lastAttemptAt -= 60 * 60_000;
            cursor.update(record);
            cursor.continue();
        };
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onabort = () => reject(transaction.error);
        });
        db.close();
    });
    mode = "blocked";
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { LIVE_OBSERVATIONS, FORECASTS, OM_DATA } =
                    await import("#app/weather/state.js");
                return (
                    LIVE_OBSERVATIONS.value[0]?.gust === 7 &&
                    FORECASTS.value.length > 0 &&
                    OM_DATA.value?.hourly.windspeed_600hPa[0] === 12
                );
            }),
        )
        .toBe(true);
    await expect(windIcon(page, "≈ 4000 m")).toHaveAttribute(
        "aria-label",
        /12 m\/s/,
    );
    mode = "failed";
    release();
    await expect(page.locator("#errors")).toContainText(
        "Näytetään vanhentuneita välimuistin tietoja",
    );
    expect(
        await page.evaluate(async () => {
            const { LIVE_OBSERVATIONS } = await import("#app/weather/state.js");
            return LIVE_OBSERVATIONS.value[0]?.gust;
        }),
    ).toBe(7);
    // Wait for the failed refresh to finish before advancing its next poll.
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
    });
    mode = "fresh";
    gust = 9;
    upperWind = 22;
    await page.clock.runFor(60_000);
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { LIVE_OBSERVATIONS, OM_DATA } =
                    await import("#app/weather/state.js");
                return (
                    LIVE_OBSERVATIONS.value[0]?.gust === 9 &&
                    OM_DATA.value?.hourly.windspeed_600hPa[0] === 22
                );
            }),
        )
        .toBe(true);
    await expect(page.locator("#errors")).not.toContainText(
        "Näytetään vanhentuneita välimuistin tietoja",
    );
});

test("FMI XML caches survive reload and moving request times without refetching", async ({
    page,
}) => {
    let requests = 0;
    await page.route("https://opendata.fmi.fi/**", (route) => {
        requests++;
        const url = new URL(route.request().url());
        expect(url.searchParams.has("cch")).toBe(false);
        return route.fulfill({
            contentType: "application/xml",
            path: url.searchParams
                .get("storedquery_id")
                .includes("observations")
                ? "tests/fixtures/observations.xml"
                : "tests/fixtures/forecast.xml",
        });
    });
    await page.goto("/dz/?fmisid=101339");
    const ready = () =>
        page.evaluate(async () => {
            const { LIVE_OBSERVATIONS, FORECASTS, LOADING } =
                await import("#app/weather/state.js");
            return (
                LIVE_OBSERVATIONS.value.length > 0 &&
                FORECASTS.value.length > 0 &&
                LOADING.value === 0
            );
        });
    await expect.poll(ready).toBe(true);
    expect(requests).toBe(2);
    const timestamps = await page.evaluate(async () => {
        const db = await new Promise((resolve) => {
            const request = indexedDB.open("hyppykeli-api-cache", 1);
            request.onsuccess = () => resolve(request.result);
        });
        const records = await new Promise((resolve) => {
            const request = db
                .transaction("responses")
                .objectStore("responses")
                .getAll();
            request.onsuccess = () => resolve(request.result);
        });
        db.close();
        return records
            .filter((record) =>
                record.key.startsWith("hyppykeli:response:v1:fmi:"),
            )
            .map((record) => record.entry.measurementAt);
    });
    expect(timestamps.filter((time) => Number.isFinite(time))).toHaveLength(1);
    await page.reload();
    await expect.poll(ready).toBe(true);
    expect(requests).toBe(2);
});

test("automatic jump run follows new winds until edited and can be reenabled", async ({
    page,
}) => {
    await page.goto(
        `${manualPath}&MANUAL_ground_obs=10,10,0,1&lat=62.4&lon=25.6&MANUAL_upper_winds=10,0,7000;10,0,5500;10,0,4200;10,0,3000;10,0,1500;10,0,800;10,0,110`,
    );
    const automatic = page.getByRole("checkbox", {
        name: "Päivitä automaattisesti",
    });
    await expect(automatic).toBeChecked();
    await expect(page.locator(".jump-run-jumper")).toHaveCount(6);
    const first = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    const changeWind = async (speed) => {
        await page.evaluate(async (speed) => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs(
                {
                    MANUAL_upper_winds: `${speed},0,7000;${speed},0,5500;${speed},0,4200;10,0,3000;10,0,1500;10,0,800;10,0,110`,
                },
                { replace: true },
            );
        }, speed);
    };
    for (const fullWindow of [true, false]) {
        await centerMapOn(page, { lat: 60, lng: 20 });
        await page.evaluate(async (fullWindow) => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs(
                { map_full_window: String(fullWindow) },
                { replace: true },
            );
        }, fullWindow);
        await expect
            .poll(() =>
                Number(new URL(page.url()).searchParams.get("map_center_lat")),
            )
            .toBeGreaterThan(62);
        expect(
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        ).toBe(first);
    }
    // Wind updates refit even a viewport chosen by the user.
    await centerMapOn(page, { lat: 60, lng: 20 });
    // Only the highest layer changes: canopy winds remain the same.
    await changeWind(20);
    await expect
        .poll(() =>
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        )
        .not.toBe(first);
    await expectAutomaticOpeningsUpwind(page);
    await expect
        .poll(() =>
            Number(new URL(page.url()).searchParams.get("map_center_lat")),
        )
        .toBeGreaterThan(62);
    await clickDirection(page, directionControls.clockwise);
    await expect(automatic).not.toBeChecked();
    const edited = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await changeWind(15);
    await expect(automatic).not.toBeChecked();
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(edited);
    await automatic.check();
    await expect
        .poll(() =>
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        )
        .not.toBe(edited);
    const enabled = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await changeWind(25);
    await expect
        .poll(() =>
            mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
        )
        .not.toBe(enabled);
    await automatic.uncheck();
    const paused = mapQuerySnapshot(
        new URL(page.url()).searchParams,
        "map_run_start",
    );
    await changeWind(5);
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(paused);
    await page.reload();
    await expect(automatic).not.toBeChecked();
    expect(
        mapQuerySnapshot(new URL(page.url()).searchParams, "map_run_start"),
    ).toBe(paused);
});

test("elevated Utti dropzone keeps a 4000 m jump run when 600 hPa falls below exit", async ({
    page,
}) => {
    const response = openMeteoResponse();
    // Captured pressure-level heights and winds from the reported Utti case.
    for (const [level, height, speed, direction] of [
        [600, 4039, 23.93, 300],
        [700, 2852, 26.46, 295],
        [850, 1312, 23.37, 291],
        [925, 623, 17.93, 280],
        [1000, -25, 7, 270],
    ]) {
        response.hourly[`geopotential_height_${level}hPa`] =
            response.hourly.time.map(() => height);
        response.hourly[`windspeed_${level}hPa`] = response.hourly.time.map(
            () => speed,
        );
        response.hourly[`winddirection_${level}hPa`] = response.hourly.time.map(
            () => direction,
        );
    }
    response.elevation = 103;
    await page.route("https://api.open-meteo.com/**", (route) =>
        route.fulfill({ json: response }),
    );
    const requested = page.waitForRequest("https://api.open-meteo.com/**");
    await page.goto(
        "/dz/?fmisid=101191&icaocode=EFUT&lat=60.89755354967867&lon=26.926031112670902&map_zoom=14&default_jump_run_direction=78&default_jump_group_count=8&elevation=103.3272&map_center_lat=60.89755354967867&map_center_lon=26.92607402801514",
    );
    const fields = new URL((await requested).url()).searchParams
        .get("hourly")
        .split(",");
    expect(fields).toContain("windspeed_500hPa");
    await expect(windIcon(page, "≈ 4000 m")).toHaveAttribute(
        "aria-label",
        /24 m\/s 300°/,
    );
    await page.evaluate(async () => {
        const { LIVE_OBSERVATIONS } = await import("#app/weather/state.js");
        LIVE_OBSERVATIONS.value = [
            {
                source: "fmi",
                time: new Date(),
                speed: 7.2,
                gust: 10.1,
                direction: 267,
            },
        ];
    });
    await expect(page.locator(".freefall-drift-line")).toHaveCount(8);
    await expect(page.locator(".jump-run-line")).toHaveCount(1);
    const settings = readMapQuery(
        Object.fromEntries(new URL(page.url()).searchParams),
        "map_run_settings",
    );
    expect(settings.exitHeight).toBe(4000);
    const heights = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        return getMapWindData().freefallWinds.map((wind) => wind.height);
    });
    expect(heights[2]).toBeCloseTo(3935.6728, 4);
    // Missing wind at the nearest level must still suppress the calculation.
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.windspeed_600hPa.fill(null);
        OM_DATA.value = data;
    });
    await expect(page.locator(".freefall-drift-line")).toHaveCount(0);
});

test("flat map parameters restore individual settings and plain wind selections", async ({
    page,
}) => {
    await page.goto(
        `${manualPath}&lat=62.4&lon=25.6&MANUAL_upper_winds=${uniformUpperWinds}&map_run_automatic=false&map_run_exit_height=3500&map_run_separation=9&map_next_jumper_opening_height=1000&map_wind=700`,
    );
    await setUniformFreefallWind(page);
    await expect(
        page.getByRole("button", { name: /^3000 m:/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    await expect(
        dialog.getByRole("spinbutton", { name: "Uloshyppykorkeus (m)" }),
    ).toHaveValue("3500");
    await expect(
        dialog.getByRole("spinbutton", {
            name: "Todellinen ilmanopeus (km/h)",
        }),
    ).toHaveValue("157");
    await expect(
        dialog.getByRole("spinbutton", { name: "Hyppääjien porrastus (s)" }),
    ).toHaveValue("9");
    expect(
        await page.evaluate(async () =>
            (await import("#app/map/mapState.js")).getJumpRunExitHeight(),
        ),
    ).toBe(3500);
    await page.keyboard.press("Escape");
    await page
        .getByRole("button", { name: "Lisää hyppääjä", exact: true })
        .click();
    expect(new URL(page.url()).searchParams.get("map_jumpers")).toBe(
        "s180h800_s180h1000",
    );
    await page.reload();
    await setUniformFreefallWind(page);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(
        dialog.getByRole("spinbutton", { name: "Uloshyppykorkeus (m)" }),
    ).toHaveValue("3500");
    await expect(
        dialog
            .getByRole("row", { name: "Hyppääjä 2", exact: true })
            .getByRole("spinbutton", { name: "Avauskorkeus (m)" }),
    ).toHaveValue("1000");
});
