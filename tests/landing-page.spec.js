import { expect, test } from "@playwright/test";

test("static landing copy follows the detected language", async ({ page }) => {
    await page.goto("/?no_redirect");

    await expect(page.locator('[data-language="fi"] p').first()).toBeVisible();
    await expect(page.locator('[data-language="en"] p').first()).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("lang", "fi");
});

test("static landing copy defaults to English without JavaScript", async ({
    browser,
    baseURL,
}) => {
    const context = await browser.newContext({
        javaScriptEnabled: false,
        locale: "fi-FI",
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/?no_redirect`);

    await expect(page.locator('[data-language="en"] p').first()).toBeVisible();
    await expect(page.locator('[data-language="fi"] p').first()).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await context.close();
});

test("landing page map selects the DZ coordinates", async ({ page }) => {
    await page.goto("/?no_redirect");

    const form = page
        .getByRole("heading", { name: "Luo hyppypaikka" })
        .locator("+ form");
    await expect(form.locator("legend").first()).toHaveText("DZ koordinaatit");

    const map = form.getByRole("region", {
        name: "Valitse DZ:n sijainti kartalta",
    });
    await expect(map).toBeVisible();
    await map.click({ position: { x: 200, y: 140 } });

    await expect(form.locator('[name="lat"]')).not.toHaveValue("");
    await expect(form.locator('[name="lon"]')).not.toHaveValue("");
});

test("current location fills the coordinates and centers the map", async ({
    page,
}) => {
    await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (success) =>
            success({
                coords: { latitude: 61.5, longitude: 24.25 },
            });
    });
    await page.goto("/?no_redirect");

    const form = page
        .getByRole("heading", { name: "Luo hyppypaikka" })
        .locator("+ form");
    await form
        .getByRole("button", { name: "Käytä nykyistä sijaintiani" })
        .click();
    await expect(form.locator('[name="lat"]')).toHaveValue("61.5");
    await expect(form.locator('[name="lon"]')).toHaveValue("24.25");

    const mapCanvas = form.locator(".map-canvas");
    const box = await mapCanvas.boundingBox();
    expect(box).not.toBeNull();
    await mapCanvas.click({
        position: { x: box.width / 2, y: box.height / 2 },
    });
    expect(Number(await form.locator('[name="lat"]').inputValue())).toBeCloseTo(
        61.5,
        3,
    );
    expect(Number(await form.locator('[name="lon"]').inputValue())).toBeCloseTo(
        24.25,
        3,
    );
});

test("form inputs can be cleared", async ({ page }) => {
    await page.goto("/?no_redirect");

    const name = page.getByLabel("Nimi", { exact: true });
    await name.fill("Test DZ");
    await page.getByRole("button", { name: "Tyhjennä nimi" }).click();

    await expect(name).toHaveValue("");
    await expect(name).toBeFocused();
    await expect(
        page.getByRole("button", { name: "Tyhjennä nimi" }),
    ).toHaveCount(0);
});

test("creating a DZ omits empty query parameters", async ({ page }) => {
    await page.goto("/?no_redirect");

    await page.getByLabel("Leveysaste").fill("61.5");
    await page.getByLabel("Pituusaste").fill("24.25");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await page.waitForURL(/\/dz\//);

    const params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({
        lat: "61.5",
        lon: "24.25",
    });
});

test("creating a DZ includes the default jump run direction", async ({
    page,
}) => {
    await page.goto("/?no_redirect");

    await page.getByLabel("Leveysaste").fill("61.5");
    await page.getByLabel("Pituusaste").fill("24.25");
    await page.getByLabel("Hyppylinjan oletussuunta").fill("180");
    await page.getByLabel("Hyppyryhmien oletusmäärä").fill("12");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await page.waitForURL(/\/dz\//);

    expect(
        new URL(page.url()).searchParams.get("default_jump_run_direction"),
    ).toBe("180");
    expect(
        new URL(page.url()).searchParams.get("default_jump_group_count"),
    ).toBe("12");
});
