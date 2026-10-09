import { expect, test } from "@playwright/test";

const upperWinds = [7000, 5500, 4200, 3000, 1500, 800, 110]
    .map((height) => `5,270,${height}`)
    .join(";");
const dz = `/dz/?lat=62.4&lon=25.6&elevation=0&MANUAL_ground_obs=5,5,270,1&MANUAL_upper_winds=${upperWinds}&map_run_automatic=false&map_run_start_lat=62.4&map_run_start_lon=25.6&map_jumpers=s180h800_s180h800_s180h1200`;
const glideLabel = "Liitopuvun liitoluku (:1)";
const descentLabel = "Liitopuvun vajoamisnopeus (km/h)";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
    // Capture the real Leaflet layers so tests can check calculated positions
    // and radii without asserting the map artwork or styling.
    await page.addInitScript(() => {
        window.fitBounds = [];
        window.wingsuitLayers = new Map();
        window.driftLayers = new Set();
        window.wingsuitProbe = import("/vendor/build/leaflet.js").then(
            ({ Circle, Polyline, Map: LeafletMap }) => {
                const flyToBounds = LeafletMap.prototype.flyToBounds;
                LeafletMap.prototype.flyToBounds = function (bounds, options) {
                    window.fitBounds.push(bounds.toBBoxString());
                    return flyToBounds.call(this, bounds, options);
                };
                const setRadius = Circle.prototype.setRadius;
                Circle.prototype.setRadius = function (radius) {
                    if (this.options.className === "wingsuit-reach-area")
                        window.wingsuitLayers.set(this, true);
                    return setRadius.call(this, radius);
                };
                const setLatLngs = Polyline.prototype.setLatLngs;
                Polyline.prototype.setLatLngs = function (points) {
                    if (this.options.className === "parachute-drift-line")
                        window.driftLayers.add(this);
                    return setLatLngs.call(this, points);
                };
            },
        );
    });
});

async function geometry(page) {
    return page.evaluate(async () => {
        await window.wingsuitProbe;
        return {
            reach: [...window.wingsuitLayers.keys()]
                .filter((layer) => layer._map)
                .map((layer) => ({
                    center: layer.getLatLng(),
                    radius: layer.getRadius(),
                }))
                .sort((a, b) => a.radius - b.radius),
            drift: [...window.driftLayers]
                .filter((layer) => layer._map)
                .map((layer) => layer.getLatLngs()),
        };
    });
}

test("wingsuit settings update reach, validate drafts, and survive reload", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(dz);
    await expect.poll(async () => (await geometry(page)).reach.length).toBe(2);
    await expect.poll(async () => (await geometry(page)).drift.length).toBe(3);
    const original = await geometry(page);
    expect(original.reach.map((area) => area.radius)).toEqual([6620, 7180]);
    // Reach includes both phases, ending at the middle jumper's pattern entry.
    const expectedCenters = await page.evaluate(async (landing) => {
        const { driftCoordinates } = await import("#app/map/freefall.js");
        return [800, 1200].map((height) =>
            driftCoordinates(landing, {
                height: 0,
                east:
                    (-5 * (4000 - height)) / (80 / 3.6) -
                    (5 * (height - 300)) / 5,
                north: 0,
            }),
        );
    }, original.drift[1].at(-1));
    for (const [index, center] of expectedCenters.entries()) {
        expect(original.reach[index].center.lat).toBeCloseTo(center[0], 8);
        expect(original.reach[index].center.lng).toBeCloseTo(center[1], 8);
    }

    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(page.getByLabel(glideLabel, { exact: true })).toHaveValue(
        "1.6",
    );
    await expect(page.getByLabel(descentLabel, { exact: true })).toHaveValue(
        "80",
    );
    await page.getByLabel(glideLabel, { exact: true }).fill("4");
    await expect
        .poll(async () =>
            (await geometry(page)).reach.map((area) => area.radius),
        )
        .toEqual([13900, 14300]);
    expect((await geometry(page)).drift).toEqual(original.drift);
    expect((await geometry(page)).reach[1].center).toEqual(
        original.reach[0].center,
    );

    await page.getByLabel(descentLabel, { exact: true }).fill("36");
    await expect
        .poll(async () => (await geometry(page)).reach[1].center.lng)
        .toBeLessThan(original.reach[1].center.lng);
    const slower = await geometry(page);
    expect(slower.reach.map((area) => area.radius)).toEqual([13900, 14300]);
    expect(slower.drift).toEqual(original.drift);
    for (const [label, parameter, configured, stored] of [
        [glideLabel, "map_wingsuit_glide_ratio", "4", "4"],
        [descentLabel, "map_wingsuit_descent_rate", "36", "10"],
    ]) {
        for (const invalid of ["", "0", "-1"]) {
            await page.getByLabel(label, { exact: true }).fill(invalid);
            expect(new URL(page.url()).searchParams.get(parameter)).toBe(
                stored,
            );
        }
        await page.getByLabel(label, { exact: true }).fill(configured);
    }
    await page.keyboard.press("Escape");
    await expect(page.locator(".wingsuit-reach-summary")).toContainText(
        "14300 m / 13900 m",
    );
    await page.reload();
    await expect
        .poll(async () =>
            (await geometry(page)).reach.map((area) => area.radius),
        )
        .toEqual([13900, 14300]);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(page.getByLabel(glideLabel, { exact: true })).toHaveValue("4");
    await expect(page.getByLabel(descentLabel, { exact: true })).toHaveValue(
        "36",
    );
    expect(errors).toEqual([]);
});

test("reach follows the jump run and disappears when its wind data is missing", async ({
    page,
}) => {
    await page.goto(dz);
    await expect.poll(async () => (await geometry(page)).reach.length).toBe(2);
    const before = await geometry(page);
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ map_run_start_lat: "62.41", map_run_start_lon: "25.62" });
    });
    await expect
        .poll(async () => (await geometry(page)).reach[0]?.center.lat ?? NaN)
        .toBeCloseTo(before.reach[0].center.lat + 0.01, 4);
    await expect
        .poll(async () => (await geometry(page)).reach[0]?.center.lng ?? NaN)
        .toBeCloseTo(before.reach[0].center.lng + 0.02, 4);
    await page.evaluate(
        async (missingWinds) => {
            const { navigateQs } = await import("#app/app/settings.js");
            navigateQs({ MANUAL_upper_winds: missingWinds });
        },
        upperWinds.replace("5,270,800", ",270,800"),
    );
    await expect.poll(async () => (await geometry(page)).reach.length).toBe(0);
    await expect(page.locator(".wingsuit-reach-summary")).toHaveCount(0);
});

test("wingsuit reach responds to canopy reach settings", async ({ page }) => {
    await page.goto(dz);
    await expect
        .poll(async () =>
            (await geometry(page)).reach.map((area) => area.radius),
        )
        .toEqual([6620, 7180]);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await page.getByLabel("Varjon liitoluku (:1)", { exact: true }).fill("4");
    await expect
        .poll(async () =>
            (await geometry(page)).reach.map((area) => area.radius),
        )
        .toEqual([7120, 8080]);
    const before = await geometry(page);
    await page
        .getByLabel("Varjon vajoamisnopeus (m/s)", { exact: true })
        .fill("2.5");
    await expect
        .poll(async () => (await geometry(page)).reach[1].center.lng)
        .toBeLessThan(before.reach[1].center.lng);
    expect((await geometry(page)).reach.map((area) => area.radius)).toEqual([
        7120, 8080,
    ]);
});

test("map fitting excludes wingsuit reach", async ({ page }) => {
    await page.goto(dz);
    await expect.poll(async () => (await geometry(page)).reach.length).toBe(2);
    const fit = page.getByRole("button", {
        name: "Sovita karttanäkymä hyppylinjaan",
    });
    await fit.click();
    await expect
        .poll(() => page.evaluate(() => window.fitBounds.length))
        .toBeGreaterThan(0);
    const original = await page.evaluate(() => window.fitBounds.at(-1));
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await page.getByLabel(glideLabel, { exact: true }).fill("10");
    await page.getByLabel(descentLabel, { exact: true }).fill("36");
    await page.keyboard.press("Escape");
    const calls = await page.evaluate(() => window.fitBounds.length);
    await fit.click();
    await expect
        .poll(() => page.evaluate(() => window.fitBounds.length))
        .toBe(calls + 1);
    expect(await page.evaluate(() => window.fitBounds.at(-1))).toBe(original);
});
