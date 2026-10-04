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

test("METAR cloud layers show distinct icons from highest to lowest", async ({
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

    const icons = layers.locator(".cloud-layer-icon > svg");
    await expect(icons).toHaveCount(4);
    for (const icon of await icons.all()) {
        await expect(icon).toBeVisible();
        await expect(icon.locator("path").first()).toHaveAttribute("d", /.+/);
    }
    const artwork = await icons
        .locator("g")
        .evaluateAll((groups) => groups.map((group) => group.innerHTML));
    expect(new Set(artwork).size).toBe(4);

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

test("obscured sky METAR shows the grumpy fog icon and vertical visibility", async ({
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
    await expect(layer.locator(".cloud-layer-icon svg")).toBeVisible();
    await expect(layer.locator(".cloud-layer-icon svg circle")).toHaveCount(2);
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

test("selecting a wind level changes the map's wind motion", async ({
    page,
}) => {
    const profile = page.locator("#dropzone-map");
    await page.evaluate(async () => {
        const { FORECAST_COORDINATES } = await import("/src/data.js");
        FORECAST_COORDINATES.value = "62.4,25.6";
    });
    await expect(profile.locator("canvas")).toBeAttached();
    await profile.scrollIntoViewIfNeeded();
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
        // Observe the actual drawn streak, including its direction and length.
        const canvas = document.querySelector(".map-wind-overlay canvas");
        const context = canvas.getContext("2d");
        const moveTo = context.moveTo.bind(context);
        const lineTo = context.lineTo.bind(context);
        let tail = [0, 0];
        context.moveTo = (x, y) => {
            tail = [x, y];
            moveTo(x, y);
        };
        context.lineTo = (x, y) => {
            canvas.dataset.vector = JSON.stringify([x - tail[0], y - tail[1]]);
            lineTo(x, y);
        };
    });

    const average = profile.getByRole("button", { name: /^≈ 4200-800 m/ });
    await expect(average).toHaveAttribute("aria-pressed", "true");
    for (const [label, speed, direction] of [
        ["≈ 4200 m", 1, 0],
        ["≈ 3000 m", 2, 90],
        ["≈ 1500 m", 3, 180],
        ["≈ 800 m", 4, 270],
        ["≈ 110 m", 5, 360],
        ["Maanpinta", 3.5, 194],
        ["≈ 4200-800 m", 12.5625, 246.25350981256466],
    ]) {
        const button = profile.getByRole("button", {
            name: new RegExp(`^${label}`),
        });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(
            profile.locator('.wind-level-button[aria-pressed="true"]'),
        ).toHaveCount(1);
        const radians = (direction * Math.PI) / 180;
        const length = 6 + speed * 2;
        await expect
            .poll(async () => {
                const vector = await profile
                    .locator("canvas")
                    .getAttribute("data-vector");
                if (!vector) return false;
                const [x, y] = JSON.parse(vector);
                return (
                    Math.abs(x + Math.sin(radians) * length) < 0.001 &&
                    Math.abs(y - Math.cos(radians) * length) < 0.001
                );
            })
            .toBe(true);
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
    await expect
        .poll(() =>
            profile.locator("canvas").evaluate((canvas) => {
                const pixels = canvas
                    .getContext("2d")
                    .getImageData(0, 0, canvas.width, canvas.height).data;
                return pixels.every((value) => value === 0);
            }),
        )
        .toBe(true);
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
