import { expect, test } from "@playwright/test";

const label = "Hyppypaikan korkeus merenpinnasta (m)";
const dz =
    "/dz/?fmisid=101191&MANUAL_ground_obs=2,2,0,1&MANUAL_upper_winds=42,0;30,0;15,0;8,0;1.1,0";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
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
});

test("elevation input persists in the URL and clears back to the default", async ({
    page,
}) => {
    await page.goto(`${dz}&elevation=100.5`);
    const open = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    await open.click();
    const elevation = dialog.getByRole("spinbutton", {
        name: label,
        exact: true,
    });
    await expect(elevation).toHaveValue("100.5");
    const exit = dialog.getByRole("spinbutton", {
        name: "Uloshyppykorkeus (m)",
        exact: true,
    });
    await expect(exit).not.toHaveAttribute("max");
    await elevation.fill("150");
    expect(new URL(page.url()).searchParams.get("elevation")).toBe("150");
    await expect(exit).not.toHaveAttribute("max");
    await page.reload();
    await open.click();
    await expect(elevation).toHaveValue("150");
    await elevation.fill("-1");
    expect(new URL(page.url()).searchParams.get("elevation")).toBe("150");
    await elevation.fill("");
    expect(new URL(page.url()).searchParams.has("elevation")).toBe(false);
    await expect(exit).not.toHaveAttribute("max");
    await page.reload();
    await open.click();
    await expect(elevation).toHaveValue("0");
});

test("elevation adjusts freefall, exit wind and canopy heights", async ({
    page,
}) => {
    await page.goto(`${dz}&elevation=200`);
    const result = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getFreefallDrift, getWindAtHeight } =
            await import("#app/map/freefall.js");
        const { getCanopyDrift } = await import("#app/map/canopy.js");
        const { navigateQs } = await import("#app/app/settings.js");
        const adjusted = getMapWindData();
        const path = getFreefallDrift(adjusted.freefallWinds);
        const canopy = getCanopyDrift(adjusted.canopyWinds, 800);
        const exit = getWindAtHeight(adjusted.freefallWinds, 4000);
        const extended = getFreefallDrift(adjusted.freefallWinds, 4001);
        navigateQs({ elevation: undefined });
        const original = getMapWindData();
        navigateQs({ elevation: "invalid" });
        const invalid = getMapWindData().freefallWinds.map(
            (wind) => wind.height,
        );
        return {
            heights: adjusted.freefallWinds.map((wind) => wind.height),
            canopyHeights: adjusted.canopyWinds.map((wind) => wind.height),
            path: path.at(-1),
            original: getFreefallDrift(original.freefallWinds).at(-1),
            canopyEnd: canopy.at(-1),
            exit,
            extended,
            invalid,
        };
    });
    expect(result.heights).toEqual([4000, 2800, 1300, 600]);
    expect(result.canopyHeights).toEqual([4000, 2800, 1300, 600, 0]);
    // Each nearest-level region is integrated at 50 m/s.
    expect(result.path.height).toBe(800);
    expect(result.path.north).toBeCloseTo(-1668, 5);
    expect(result.original.north).toBeCloseTo(-1532, 5);
    expect(result.exit.east).toBeCloseTo(0);
    expect(result.exit.north).toBe(-42);
    expect(result.canopyEnd.height).toBe(0);
    expect(result.canopyEnd.north).toBeCloseTo(-920, 5);
    expect(result.extended.at(-1).north).toBeCloseTo(-1668 - 42 / 50, 5);
    expect(result.invalid).toEqual([4200, 3000, 1500, 800]);
});

test("landing form includes elevation in the dropzone URL", async ({
    page,
}) => {
    await page.goto("/?no_redirect");
    await page.locator('[name="fmisid"]').fill("101191");
    await page
        .getByRole("spinbutton", { name: label, exact: true })
        .fill("123.5");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await expect(page).toHaveURL(/elevation=123.5/);
    expect(new URL(page.url()).searchParams.get("elevation")).toBe("123.5");
});

test("forecast heights drive map labels, wind calculations and unrestricted exit heights", async ({
    page,
}) => {
    await page.goto(
        `${dz}&elevation=200.5&map_wind=${encodeURIComponent(JSON.stringify("≈ 3000 m"))}`,
    );
    const result = await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getFreefallDrift, getJumpRunVelocity } =
            await import("#app/map/freefall.js");
        const { getCanopyDrift } = await import("#app/map/canopy.js");
        navigateQs({
            MANUAL_upper_winds: undefined,
            MANUAL_ground_obs: "0,0,0,1",
        });
        // Finish the weather refresh caused by changing the ground override first.
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const [level, altitude] of Object.entries({
            600: 4350.75,
            700: 3100.25,
            850: 1620.5,
            925: 970.5,
            1000: 130.5,
        })) {
            hourly[`geopotential_height_${level}hPa`] = [altitude];
            hourly[`windspeed_${level}hPa`] = [(altitude - 200.5) / 100];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        OM_DATA.value = { utc_offset_seconds: 0, elevation: 100, hourly };
        const data = getMapWindData();
        return {
            heights: data.freefallWinds.map((wind) => wind.height),
            drift: getFreefallDrift(data.freefallWinds)?.at(-1),
            canopy: getCanopyDrift(data.canopyWinds, 800)?.at(-1),
            aircraft: getJumpRunVelocity(data.freefallWinds, {
                exitHeight: 4000,
                speedKmh: 180,
                direction: 0,
                separationSeconds: 5,
            }),
        };
    });
    expect(result.heights).toEqual([4150.25, 2899.75, 1420, 770]);
    expect(result.drift.north).toBeCloseTo(
        -(475 * 41.5025 + 1365.125 * 28.9975 + 1064.875 * 14.2 + 295 * 7.7) /
            50,
        5,
    );
    expect(result.canopy.north).toBeCloseTo((-415 * 7.7) / 5, 5);
    expect(result.aircraft.ground.north).toBeCloseTo(50 - 41.5025, 5);
    const map = page.locator("#dropzone-map");
    await expect(map).toContainText("Hyppypaikka 201 m merenpinnasta");
    const selected = map.locator('.wind-level-choice[aria-pressed="true"]');
    // Old URLs selecting the nominal 3000 m label still select 700 hPa.
    await expect(selected).toHaveAttribute("aria-label", /^≈ 3000 m:/);
    await expect(selected).toHaveAttribute("data-tooltip", /^2900 m:/);
    await selected.focus();
    await expect(page.getByRole("tooltip")).toContainText("2900 m");
    await page.keyboard.press("Escape");

    await expect(map.locator(".wind-level-choice")).toHaveCount(6);
    await expect(
        map.locator('.wind-level-choice[aria-label^="≈ 4000-1000 m:"]'),
    ).toHaveAttribute("data-tooltip", /^4150-770 m:/);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    const exit = dialog.getByRole("spinbutton", {
        name: "Uloshyppykorkeus (m)",
        exact: true,
    });
    await expect(exit).not.toHaveAttribute("max");
    await exit.fill("4151");
    expect(
        JSON.parse(
            new URL(page.url()).searchParams.get("map_run_settings") ?? "{}",
        ).exitHeight,
    ).toBe(4151);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("#app/weather/state.js");
        const data = structuredClone(OM_DATA.value);
        data.hourly.geopotential_height_600hPa = [4400.5];
        data.hourly.geopotential_height_700hPa = [3165.5];
        OM_DATA.value = data;
    });
    await expect(exit).not.toHaveAttribute("max");
    await dialog.getByRole("button", { name: "Sulje", exact: true }).click();
    await expect(selected).toHaveAttribute("aria-label", /^≈ 3000 m:/);
    await expect(selected).toHaveAttribute("data-tooltip", /^2965 m:/);
    await selected.click();
    expect(JSON.parse(new URL(page.url()).searchParams.get("map_wind"))).toBe(
        "700",
    );
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "250.5" });
    });
    await expect(selected).toHaveAttribute("aria-label", /^≈ 3000 m:/);
    await expect(selected).toHaveAttribute("data-tooltip", /^2915 m:/);
    // A forecast above the old 4200 m ceiling can be used and shared.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ elevation: "0" });
    });
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(exit).not.toHaveAttribute("max");
    await exit.fill("4350");
    await dialog.getByRole("button", { name: "Sulje", exact: true }).click();
    await page.reload();
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(exit).toHaveValue("4350");
});

test("model terrain and missing forecast heights never fall back to nominal heights", async ({
    page,
}) => {
    await page.goto(`${dz}&elevation=200`);
    const result = await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { OM_DATA } = await import("#app/weather/state.js");
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getFreefallDrift } = await import("#app/map/freefall.js");
        navigateQs({ MANUAL_upper_winds: undefined });
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const [level, height] of Object.entries({
            600: 4300,
            700: 3100,
            850: 1600,
            925: 1000,
            1000: 250,
        })) {
            hourly[`geopotential_height_${level}hPa`] = [height];
            hourly[`windspeed_${level}hPa`] = [10];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        const data = { utc_offset_seconds: 0, elevation: 300, hourly };
        OM_DATA.value = data;
        const aboveTerrain = getMapWindData();
        // Forecast levels below opening remain available for nearest-height selection.
        OM_DATA.value = {
            ...data,
            elevation: 0,
            hourly: { ...hourly, geopotential_height_925hPa: [1100] },
        };
        const fiveLevels = getMapWindData();
        OM_DATA.value = {
            ...data,
            hourly: { ...hourly, geopotential_height_700hPa: [null] },
        };
        const missing = getMapWindData();
        navigateQs({ MANUAL_upper_winds: "42,0;30,0;15,0;8,0;1.1,0" });
        const manual = getMapWindData();
        return {
            ids: aboveTerrain.winds.map((wind) => wind.id),
            ground: aboveTerrain.canopyWinds.at(-1).height,
            fiveHeights: fiveLevels.freefallWinds.map((wind) => wind.height),
            fiveDrift: getFreefallDrift(fiveLevels.freefallWinds)?.at(-1),
            missingDrift: getFreefallDrift(missing.freefallWinds),
            manualHeights: manual.freefallWinds.map((wind) => wind.height),
            rawTop: OM_DATA.value.hourly.geopotential_height_600hPa[0],
        };
    });
    expect(result.ids).not.toContain("1000");
    expect(result.ground).toBe(0);
    expect(result.fiveHeights).toEqual([4100, 2900, 1400, 900, 50]);
    expect(result.fiveDrift.north).toBeCloseTo(-640, 5);
    expect(result.missingDrift).toBeNull();
    expect(result.manualHeights).toEqual([4000, 2800, 1300, 600]);
    expect(result.rawTop).toBe(4300);
});
