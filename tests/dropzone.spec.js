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
        "1829 m",
        "914 m",
        "457 m",
        "152 m",
    ]);
    await expect(layers.locator(".cloud-layer-coverage")).toHaveText([
        "8/8 taivaasta",
        "5–7/8 taivaasta",
        "3–4/8 taivaasta",
        "1–2/8 taivaasta",
    ]);

    const icons = layers.locator(".cloud-layer-icon svg");
    await expect(icons).toHaveCount(4);
    for (const icon of await icons.all()) {
        await expect(icon).toBeVisible();
        await expect(icon.locator("path").first()).toHaveAttribute("d", /.+/);
    }
    const artwork = await icons
        .locator("g")
        .evaluateAll((groups) => groups.map((group) => group.innerHTML));
    expect(new Set(artwork).size).toBe(4);

    await expect(card.locator(".cloud-warning")).toHaveText("Ukkospilviä", {
        useInnerText: true,
    });
    await expect(card.locator(".cloud-warning svg")).toBeVisible();
    await card.locator(".cloud-metar-details summary").click();
    const report = card.getByLabel("METAR", { exact: true });
    await expect(report).toBeVisible();
    await expect(report).toHaveText(metar);
});

test("map wind profile shows the developer average and ground wind", async ({
    page,
}) => {
    const profile = page.locator("#dropzone-map .wind-level");
    const average = profile.filter({
        has: page.getByText("4200-800 m", { exact: true }),
    });
    const ground = profile.filter({
        has: page.getByText("Maanpinta", { exact: true }),
    });
    await expect(average).toContainText("13 m/s 246°");
    await expect(ground).toContainText("4 m/s 194°");
    // Individual altitude forecasts are live data, with no DEV_ override.
});
