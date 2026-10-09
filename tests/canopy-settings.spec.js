import { expect, test } from "@playwright/test";

const upperWinds = [7000, 5500, 4200, 3000, 1500, 800, 110]
    .map((height) => `5,270,${height}`)
    .join(";");
const dz = `/dz/?lat=62.4&lon=25.6&elevation=0&MANUAL_ground_obs=5,5,270,1&MANUAL_upper_winds=${upperWinds}&map_run_automatic=false&map_run_start_lat=62.4&map_run_start_lon=25.6&map_jumpers=s180h800_s180h800_s180h1200`;
const glideLabel = "Varjon liitoluku (:1)";
const descentLabel = "Varjon vajoamisnopeus (m/s)";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
    // Capture the real Leaflet layers so tests can check calculated positions
    // and radii without asserting the map artwork or styling.
    await page.addInitScript(() => {
        window.canopyLayers = new Map();
        window.driftLayers = new Set();
        window.freefallLayers = new Set();
        window.canopyProbe = import("/vendor/build/leaflet.js").then(
            ({ Circle, Polyline }) => {
                const setRadius = Circle.prototype.setRadius;
                Circle.prototype.setRadius = function (radius) {
                    if (this.options.className === "canopy-reach-area")
                        window.canopyLayers.set(this, true);
                    return setRadius.call(this, radius);
                };
                const setLatLngs = Polyline.prototype.setLatLngs;
                Polyline.prototype.setLatLngs = function (points) {
                    if (this.options.className === "freefall-drift-line")
                        window.freefallLayers.add(this);
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
        await window.canopyProbe;
        return {
            reach: [...window.canopyLayers.keys()]
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

test("canopy settings update reach and drift, validate drafts, and survive reload", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(dz);
    await expect.poll(async () => (await geometry(page)).reach.length).toBe(2);
    await expect.poll(async () => (await geometry(page)).drift.length).toBe(3);
    const original = await geometry(page);
    expect(original.reach.map((area) => area.radius)).toEqual([1500, 2700]);

    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(page.getByLabel(glideLabel, { exact: true })).toHaveValue("3");
    await expect(page.getByLabel(descentLabel, { exact: true })).toHaveValue(
        "5",
    );
    await page.getByLabel(glideLabel, { exact: true }).fill("4");
    await expect
        .poll(async () =>
            (await geometry(page)).reach.map((area) => area.radius),
        )
        .toEqual([2000, 3600]);
    expect((await geometry(page)).drift).toEqual(original.drift);
    expect((await geometry(page)).reach[0].center).toEqual(
        original.reach[0].center,
    );

    await page.getByLabel(descentLabel, { exact: true }).fill("2.5");
    await expect
        .poll(async () => (await geometry(page)).reach[1].center.lng)
        .toBeLessThan(original.reach[1].center.lng);
    const slower = await geometry(page);
    expect(slower.reach.map((area) => area.radius)).toEqual([2000, 3600]);
    expect(slower.drift[0].at(-1).lng).toBeGreaterThan(
        original.drift[0].at(-1).lng,
    );
    for (const [label, parameter, configured] of [
        [glideLabel, "map_canopy_glide_ratio", "4"],
        [descentLabel, "map_canopy_descent_rate", "2.5"],
    ]) {
        for (const invalid of ["", "0", "-1"]) {
            await page.getByLabel(label, { exact: true }).fill(invalid);
            expect(new URL(page.url()).searchParams.get(parameter)).toBe(
                configured,
            );
        }
        await page.getByLabel(label, { exact: true }).fill(configured);
    }
    await page.keyboard.press("Escape");
    await expect(page.locator(".canopy-reach-summary")).toContainText(
        "2000 m / 3600 m",
    );
    await page.reload();
    await expect
        .poll(async () =>
            (await geometry(page)).reach.map((area) => area.radius),
        )
        .toEqual([2000, 3600]);
    await page
        .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
        .click();
    await expect(page.getByLabel(glideLabel, { exact: true })).toHaveValue("4");
    await expect(page.getByLabel(descentLabel, { exact: true })).toHaveValue(
        "2.5",
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
    await expect(page.locator(".canopy-reach-summary")).toHaveCount(0);
});

test("descent rates of 1 and 10 update canopy calculations and survive reopening with automatic placement enabled", async ({
    page,
}) => {
    await page.goto(
        dz.replace("map_run_automatic=false", "map_run_automatic=true"),
    );
    await expect.poll(async () => (await geometry(page)).drift.length).toBe(3);
    const original = await geometry(page);
    const originalDrift =
        original.drift[0].at(-1).lng - original.drift[0][0].lng;
    for (const rate of [1, 10]) {
        await page
            .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
            .click();
        const input = page.getByLabel(descentLabel, { exact: true });
        await input.fill("");
        await input.pressSequentially(String(rate));
        await expect
            .poll(() =>
                new URL(page.url()).searchParams.get("map_canopy_descent_rate"),
            )
            .toBe(String(rate));
        await expect
            .poll(async () => {
                const { drift } = await geometry(page);
                return (drift[0].at(-1).lng - drift[0][0].lng) / originalDrift;
            })
            .toBeCloseTo(5 / rate, 4);
        await expect
            .poll(async () => (await geometry(page)).reach[1].center.lng)
            .not.toBe(original.reach[1].center.lng);
        await page.keyboard.press("Escape");
        await page
            .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
            .click();
        await expect(input).toHaveValue(String(rate));
        await page.reload();
        await page
            .getByRole("button", { name: "Hyppylinjan asetukset", exact: true })
            .click();
        await expect(input).toHaveValue(String(rate));
        await page.keyboard.press("Escape");
    }
});

test("distance summaries use straight endpoint distances and distinct values in exit order", async ({
    page,
}) => {
    const changingWinds = [7000, 5500, 4200, 3000, 1500, 800, 110]
        .map((height) => `5,${height >= 1500 ? 270 : 0},${height}`)
        .join(";");
    const url = new URL(dz, "http://localhost");
    url.searchParams.set("MANUAL_upper_winds", changingWinds);
    url.searchParams.set(
        "map_jumpers",
        "s180h1200_s180h800_s180h1200_s180h800",
    );
    await page.goto(url.pathname + url.search);
    await expect.poll(async () => (await geometry(page)).drift.length).toBe(4);
    const expected = await page.evaluate(async () => {
        await window.canopyProbe;
        const freefall = [...window.freefallLayers]
            .filter((layer) => layer._map)
            .map((layer) => layer.getLatLngs());
        const canopy = [...window.driftLayers]
            .filter((layer) => layer._map)
            .map((layer) => layer.getLatLngs());
        const format = (distances) =>
            [
                ...new Set(
                    distances.map((distance) => `${Math.round(distance)} m`),
                ),
            ].join(" / ");
        const distance = (path) => path[0].distanceTo(path.at(-1));
        const openings = freefall.map((path) => path.at(-1));
        return {
            freefall: format(freefall.map(distance)),
            canopy: format(canopy.map(distance)),
            openings: format(
                openings
                    .slice(1)
                    .map((opening, index) =>
                        opening.distanceTo(openings[index]),
                    ),
            ),
            curvedCanopy: canopy.some(
                (path) =>
                    path
                        .slice(1)
                        .reduce(
                            (sum, point, index) =>
                                sum + point.distanceTo(path[index]),
                            0,
                        ) >
                    distance(path) + 10,
            ),
        };
    });
    expect(expected.curvedCanopy).toBe(true);
    await expect(page.locator(".jump-summary .value-number")).toHaveText(
        expected.freefall,
    );
    await expect(
        page.locator(".canopy-drift-summary .value-number"),
    ).toHaveText(expected.canopy);
    await expect(
        page.locator(".opening-distance-summary .value-number"),
    ).toHaveText(expected.openings);
    await expect(page.locator(".canopy-reach-summary")).toHaveText(
        "Varjon kantama 2700 m / 1500 m",
    );
    await expect(page.locator(".jump-summary [data-tooltip]")).toHaveAttribute(
        "data-tooltip",
        /ei kaarevan ajautumisreitin pituus/,
    );
    await expect(
        page.locator(".canopy-drift-summary [data-tooltip]"),
    ).toHaveAttribute(
        "data-tooltip",
        /ei kaarevan varjoajautumisreitin pituus/,
    );
});
