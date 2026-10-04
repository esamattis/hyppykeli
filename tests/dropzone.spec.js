import { test, expect } from "@playwright/test";

const developerPath =
    "/dz/?fmisid=137208&icaocode=EFJY&DEV_ground_obs=6.4%2C3.5%2C194%2C4.8%3B6.2%2C3.7%2C193%2C14.8%3B6.1%2C4%2C194%2C24.8%3B4%2C2.8%2C200%2C34.8%3B4.4%2C2.6%2C201%2C44.8%3B4.7%2C2.9%2C199%2C54.8&DEV_metar=METAR+EFJY+040720Z+AUTO+19007KT+160V220+9999+-SHRA+OVC005+%2F%2F%2F%2F%2F%2FCB+11%2F11+Q1014%3D&DEV_map_speed=12.5625&DEV_map_direction=246.25350981256466";

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
    ).toHaveAttribute("href", "/dz/?fmisid=101191&icaocode=EFUT");
    await expect(menu.getByRole("heading")).toHaveText([
        "EFJY",
        "Ennustepäivä",
        "Hyppypaikat",
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

test("forecast shortcut selects tomorrow without losing weather settings", async ({
    page,
}) => {
    const toggle = page.getByRole("button", { name: "Valikko", exact: true });
    await toggle.click();
    await page
        .locator(".side-menu")
        .getByRole("link", { name: "Huomenna", exact: true })
        .click();
    await expect(page).toHaveURL(/forecast_day=1/);
    expect(new URL(page.url()).searchParams.get("fmisid")).toBe("137208");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(
        page
            .locator(".side-menu")
            .getByRole("link", { name: "Huomenna", exact: true }),
    ).toHaveAttribute("aria-current", "date");
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
    await expect(metarInput).toHaveValue(
        new URL(page.url()).searchParams.get("DEV_metar"),
    );
    const metar =
        "METAR EFJY 041200Z 19007KT 9999 FEW005 SCT015 BKN030CB OVC060 11/08 Q1014=";
    await metarInput.fill(metar);
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

test("wind card expands, hides its heading and help, and restores", async ({
    page,
}) => {
    const card = page.locator("#dropzone-map");
    const heading = card.getByRole("heading", { name: "Ylätuulet" });
    const help = card.getByRole("button", { name: "Ohje", exact: true });
    const expand = card.getByRole("button", {
        name: "Laajenna Ylätuulet koko ikkunaan",
    });
    await expect(heading).toBeVisible();
    await expect(help).toBeVisible();
    await expand.click();
    await expect(heading).toBeHidden();
    await expect(help).toBeHidden();
    const restore = card.getByRole("button", { name: "Palauta Ylätuulet" });
    await expect(restore).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator(".wind-level-button").first()).toBeVisible();
    await restore.click();
    await expect(heading).toBeVisible();
    await expect(help).toBeVisible();
    await expand.click();
    await page.keyboard.press("Escape");
    await expect(expand).toHaveAttribute("aria-pressed", "false");
    await expect(heading).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

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

test("wind level selection supports clicks, keyboard and forecast refreshes", async ({
    page,
}) => {
    const profile = page.locator("#dropzone-map");
    await page.evaluate(async () => {
        const { OM_DATA } = await import("/src/om.js");
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
            hourly[`windspeed_${level}hPa`] = [(index + 1) * 3.6];
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
        const { OM_DATA } = await import("/src/om.js");
        OM_DATA.value = null;
    });
    await expect(altitude).toContainText("Ei tietoa");
    await expect(altitude).toHaveAttribute("aria-pressed", "true");
});

test("freefall drift integrates altitude winds from 4000 to 800 metres", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { getFreefallDrift } = await import("/src/freefall.js");
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

test("freefall arrows retain settings, evict the oldest at ten, and clear together", async ({
    page,
    isMobile,
}) => {
    await page.evaluate(async () => {
        const { FORECAST_COORDINATES } = await import("/src/data.js");
        const { OM_DATA } = await import("/src/om.js");
        FORECAST_COORDINATES.value = "62.4,25.6";
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const level of ["600", "700", "850", "925", "1000"]) {
            hourly[`windspeed_${level}hPa`] = [36];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });
    const map = page.locator(".dz-map");
    const line = map.locator(".freefall-drift-line");
    const undo = page.getByRole("button", { name: "Poista viimeisin nuoli" });
    const clear = page.getByRole("button", { name: "Tyhjennä nuolet" });
    const place = async (x = 100) => {
        await map.scrollIntoViewIfNeeded();
        if (isMobile) await map.tap({ position: { x, y: 140 } });
        else await map.click({ position: { x, y: 140 } });
    };
    await expect(undo).toBeDisabled();
    await place();
    await expect(line).toHaveCount(1);
    const firstPath = await line.first().getAttribute("d");
    await clear.focus();
    await page.keyboard.press("Tab");
    await expect(map).toBeFocused();
    await expect(line).toHaveCount(2);
    const centeredPath = await line.last().getAttribute("d");
    const toolbar = page.getByRole("group", { name: "Vapaapudotuksen arvot" });
    const edit = toolbar.getByRole("button", {
        name: "Muokkaa: Vapaapudotuksen asetukset",
    });
    await edit.click();
    const dialog = page.getByRole("dialog", {
        name: "Vapaapudotuksen asetukset",
    });
    await expect(
        dialog.getByRole("button", { name: /^(Tallenna|Peruuta)$/ }),
    ).toHaveCount(0);
    const exit = dialog.getByRole("spinbutton", {
        name: "Uloshyppykorkeus (m)",
    });
    const opening = dialog.getByRole("spinbutton", {
        name: "Avauskorkeus (m)",
    });
    const speed = dialog.getByRole("spinbutton", {
        name: "Vapaapudotusnopeus (km/h)",
    });
    await exit.fill("3000");
    await expect(toolbar).toContainText("3000 m");
    await opening.fill("3200");
    await expect(toolbar.locator(".value-number").nth(1)).toHaveText("800 m");
    await opening.fill("1000");
    await speed.fill("200");
    await expect(toolbar).toContainText("1000 m");
    await expect(toolbar).toContainText("200 km/h");
    await expect(toolbar).toContainText("36 s");
    await expect(line.first()).toHaveAttribute("d", firstPath);
    await expect(line.last()).toHaveAttribute("d", centeredPath);
    await page.keyboard.press("Escape");
    await place();
    await expect(line).toHaveCount(3);
    await expect(line.last()).not.toHaveAttribute("d", firstPath);
    let latestPath = await line.last().getAttribute("d");
    for (const [preset, value, seconds] of [
        ["Freefly", "240", "30"],
        ["Wingsuit", "80", "90"],
        ["FS", "180", "40"],
    ]) {
        await edit.click();
        await dialog
            .getByRole("button", { name: new RegExp(`^${preset}`) })
            .click();
        await expect(speed).toHaveValue(value);
        await expect(toolbar).toContainText(`${value} km/h`);
        await expect(toolbar).toContainText(`${seconds} s`);
        await expect(line.last()).toHaveAttribute("d", latestPath);
        await page.keyboard.press("Escape");
        const count = await line.count();
        await place();
        await expect(line).toHaveCount(count + 1);
        await expect(line.last()).not.toHaveAttribute("d", latestPath);
        latestPath = await line.last().getAttribute("d");
    }
    await edit.click();
    await speed.fill("0");
    await expect(toolbar).toContainText("180 km/h");
    await speed.fill("");
    await opening.fill("1200");
    await expect(toolbar).toContainText("1200 m");
    await page.keyboard.press("Escape");
    await edit.click();
    await expect(speed).toHaveValue("180");
    await expect(opening).toHaveValue("1200");
    await expect(exit).toHaveValue("3000");
    await page.keyboard.press("Escape");
    await expect(edit).toBeFocused();
    while ((await line.count()) < 10)
        await place(120 + (await line.count()) * 5);
    const secondOldest = await line.nth(1).getAttribute("d");
    if (isMobile) await page.waitForTimeout(350);
    await place(200);
    await expect(line).toHaveCount(10);
    await expect(line.first()).toHaveAttribute("d", secondOldest);
    await undo.click();
    await expect(line).toHaveCount(9);
    await clear.click();
    await expect(line).toHaveCount(0);
    await expect(map.locator("marker")).toHaveCount(0);
    await expect(undo).toBeDisabled();
    await expect(clear).toBeDisabled();
    await place();
    await expect(line).toHaveCount(1);
    await page.evaluate(async () => {
        const { OM_DATA } = await import("/src/om.js");
        OM_DATA.value = {
            ...OM_DATA.value,
            hourly: { ...OM_DATA.value.hourly, windspeed_925hPa: [null] },
        };
    });
    await expect(line).toHaveCount(0);
    await expect(page.locator(".freefall-drift-summary")).toContainText(
        "ylätuulitietoja puuttuu",
    );
    await undo.click();
    await expect(page.locator(".freefall-drift-summary")).toHaveCount(0);
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
                const { OM_DATA } = await import("/src/om.js");
                const start = Date.parse("2026-07-04T00:00:00Z");
                const time = Array.from({ length: 48 }, (_, index) =>
                    new Date(start + index * 3600000 + offset * 1000)
                        .toISOString()
                        .slice(0, 16),
                );
                const hourly = { time };
                for (const level of ["600", "700", "850", "925", "1000"]) {
                    hourly[`windspeed_${level}hPa`] = time.map(
                        (_, index) => (11 + index) * 3.6,
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
            await expect(
                row.locator("td").nth(4).locator(".wind-speed"),
            ).toHaveText("21 m/s");
            await expect(
                row.locator("td").nth(8).locator(".wind-speed"),
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

test("jump run redraws all jumpers and applies individual settings immediately", async ({
    page,
    isMobile,
}) => {
    await page.evaluate(async () => {
        const { FORECAST_COORDINATES } = await import("/src/data.js");
        const { OM_DATA } = await import("/src/om.js");
        FORECAST_COORDINATES.value = "62.4,25.6";
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const level of ["600", "700", "850", "925", "1000"]) {
            hourly[`windspeed_${level}hPa`] = [36];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });
    const map = page.locator(".dz-map");
    const toggle = page.getByRole("button", {
        name: "Hyppylinja",
        exact: true,
    });
    await toggle.click();
    const place = async (x = 100, y = 160) => {
        await map.scrollIntoViewIfNeeded();
        if (isMobile) await map.tap({ position: { x, y } });
        else await map.click({ position: { x, y } });
    };
    await place();
    const run = map.locator(".jump-run-line");
    const jumpers = map.locator(".jump-run-jumper");
    const arrows = map.locator(".freefall-drift-line");
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
    const speed = settings.getByRole("spinbutton", {
        name: "Hyppylinjan nopeus (km/h)",
    });
    await speed.fill("0");
    await expect(run).toHaveAttribute("d", runPath);
    await speed.fill("180");
    await expect(run).not.toHaveAttribute("d", runPath);
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
    const direction = page.getByRole("slider", { name: "Hyppylinjan suunta" });
    const moved = await run.getAttribute("d");
    await direction.fill("90");
    await expect(page.locator(".jump-run-controls output")).toHaveText("90°");
    await expect(run).not.toHaveAttribute("d", moved);
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
    await expect(settings.getByRole("group")).toHaveCount(2);
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
        const { jumpRunCoordinates } = await import("/src/DropzoneMap.js");
        const { latLng } = await import("leaflet");
        const start = latLng(62.4, 25.6);
        return [0, 90, 180, 270].map((direction) => {
            const end = latLng(
                jumpRunCoordinates(
                    start,
                    { direction, speedKmh: 180, separationSeconds: 10 },
                    2,
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
    await page.getByRole("button", { name: "Tyhjennä nuolet" }).click();
    await expect(run).toHaveCount(0);
    await toggle.click();
    await expect(direction).toHaveCount(0);
    await place();
    await expect(arrows).toHaveCount(1);
});

test("jump run adds jumpers using immediately applied template settings", async ({
    page,
    isMobile,
}) => {
    await page.evaluate(async () => {
        const { FORECAST_COORDINATES } = await import("/src/data.js");
        const { OM_DATA } = await import("/src/om.js");
        FORECAST_COORDINATES.value = "62.4,25.6";
        const hourly = {
            time: [new Date().toISOString().slice(0, 13) + ":00"],
        };
        for (const level of ["600", "700", "850", "925", "1000"]) {
            hourly[`windspeed_${level}hPa`] = [36];
            hourly[`winddirection_${level}hPa`] = [0];
        }
        OM_DATA.value = { utc_offset_seconds: 0, hourly };
    });
    await page.getByRole("button", { name: "Hyppylinja", exact: true }).click();
    const template = page.getByRole("button", {
        name: "Muokkaa: Lisättävän hyppääjän asetukset",
    });
    await expect(template).not.toContainText("Uloshyppy");
    await template.click();
    const dialog = page.getByRole("dialog", {
        name: "Lisättävän hyppääjän asetukset",
    });
    await expect(
        dialog.getByRole("button", { name: /^(Tallenna|Peruuta)$/ }),
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
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Lisää hyppääjä" }).click();
    const edit = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const settings = page.getByRole("dialog", {
        name: "Hyppylinjan asetukset",
    });
    await edit.click();
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
    await template.click();
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
    await expect(map.locator(".jump-run-jumper")).toHaveCount(3);
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
