import { readMapQuery } from "./map-query-helpers.js";
import { expect, test } from "@playwright/test";

const elevationUrl = "https://api.open-meteo.com/v1/elevation**";
const fmiStationsUrl = "https://opendata.fmi.fi/wfs/fin?**";
const roadStationsUrl = "https://tie.digitraffic.fi/api/weather/v1/stations";
const fmiStationsXml = (
    latitude,
) => `<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:ef="http://inspire.ec.europa.eu/schemas/ef/4.0" xmlns:gml="http://www.opengis.net/gml/3.2">
<wfs:member><ef:EnvironmentalMonitoringFacility>
<gml:identifier codeSpace="http://xml.fmi.fi/namespace/stationcode/fmisid">101191</gml:identifier>
<gml:name codeSpace="http://xml.fmi.fi/namespace/locationcode/geoid">123</gml:name>
<gml:name codeSpace="http://xml.fmi.fi/namespace/locationcode/name">Test FMI station</gml:name>
<ef:representativePoint><gml:Point axisLabels="Lat Long"><gml:pos>${latitude} 24.25</gml:pos></gml:Point></ef:representativePoint>
</ef:EnvironmentalMonitoringFacility></wfs:member></wfs:FeatureCollection>`;
const reverseUrl = "https://nominatim.openstreetmap.org/reverse**";
test.beforeEach(async ({ page }) => {
    await page.route(fmiStationsUrl, (route) =>
        route.fulfill({
            contentType: "application/xml",
            body: fmiStationsXml(0),
        }),
    );
    await page.route(roadStationsUrl, (route) =>
        route.fulfill({ json: { features: [] } }),
    );
    await page.route(reverseUrl, (route) => route.fulfill({ json: {} }));
    await page.route(elevationUrl, (route) => route.fulfill({ json: {} }));
});

test("landing page map selects the DZ coordinates", async ({ page }) => {
    await page.goto("/?no_redirect");

    const form = page
        .getByRole("heading", { name: "Luo hyppypaikka" })
        .locator("+ form");

    const map = page.getByRole("region", {
        name: "Valitse DZ:n sijainti kartalta",
    });
    await expect(map).toBeVisible();
    await map.click({ position: { x: 200, y: 140 } });

    await expect(form.locator('[name="lat"]')).toHaveValue("");
    await map
        .getByRole("button", { name: "Luo hyppypaikka", exact: true })
        .click();
    await expect(page.getByLabel("Nimi", { exact: true })).toBeFocused();
    await expect(form.locator('[name="lat"]')).toBeInViewport();
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
    await page
        .getByRole("button", { name: "Käytä nykyistä sijaintiani" })
        .click();
    await expect(form.locator('[name="lat"]')).toHaveValue("61.5");
    await expect(form.locator('[name="lon"]')).toHaveValue("24.25");

    await expect
        .poll(() =>
            form.evaluate((form) => Math.abs(form.getBoundingClientRect().top)),
        )
        .toBeLessThan(1);
    const mapCanvas = page.locator(".map-canvas");
    const box = await mapCanvas.boundingBox();
    expect(box).not.toBeNull();
    await mapCanvas.click({
        position: { x: box.width / 2, y: box.height / 2 },
    });
    await page
        .getByRole("button", { name: "Luo hyppypaikka", exact: true })
        .click();
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

    await page.getByLabel("Nimi", { exact: true }).fill("Test DZ");
    await page.getByLabel("Leveysaste", { exact: true }).fill("61.5");
    await page.getByLabel("Pituusaste", { exact: true }).fill("24.25");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await page.waitForURL(/\/dz\//);

    const params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({
        name: "Test DZ",
        lat: "61.5",
        lon: "24.25",
    });
});

test("creating a DZ includes the default jump run settings", async ({
    page,
}) => {
    await page.goto("/?no_redirect");

    await page.getByLabel("Nimi", { exact: true }).fill("Test DZ");
    await page.getByLabel("Leveysaste", { exact: true }).fill("61.5");
    await page.getByLabel("Pituusaste", { exact: true }).fill("24.25");
    await page.getByLabel("Hyppylinjan oletussuunta").fill("180");
    await page.getByLabel("Hyppyryhmien oletusmäärä").fill("12");
    await page.getByLabel("Uloshyppykorkeuden oletus (m)").fill("3500");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await page.waitForURL(/\/dz\//);

    expect(
        new URL(page.url()).searchParams.get("default_jump_run_direction"),
    ).toBe("180");
    expect(
        new URL(page.url()).searchParams.get("default_jump_group_count"),
    ).toBe("12");
    const params = new URL(page.url()).searchParams;
    expect(
        readMapQuery(Object.fromEntries(params), "map_run_settings"),
    ).toEqual({
        direction: 180,
        speedKmh: 157,
        separationSeconds: 5,
        wingsuitGlideRatio: 1.6,
        wingsuitDescentRateMps: 80 / 3.6,
        canopyGlideRatio: 3,
        canopyDescentRateMps: 5,
        exitHeight: 3500,
    });
    expect(params.has("exitHeight")).toBe(false);
    expect(
        await page.evaluate(async () => {
            const { getJumpRunExitHeight } =
                await import("#app/map/mapState.js");
            return getJumpRunExitHeight();
        }),
    ).toBe(3500);
});

test("every listed dropzone has a pin linking to its dropzone", async ({
    page,
}) => {
    await page.goto("/?no_redirect");
    const pins = page.locator(".dropzone-pin");
    await expect(pins).toHaveCount(17);
    const links = await page.locator(".dz-list a").evaluateAll((links) =>
        links.map((link) => ({
            name: link.textContent.trim(),
            href: link.getAttribute("href"),
        })),
    );
    for (const link of links) {
        await expect(
            page.locator(`.dropzone-pin[aria-label="${link.name}"]`),
        ).toHaveAttribute("href", link.href);
    }
    await page.locator('.dropzone-pin[aria-label="EFJY"]').click();
    await page.waitForURL(/\/dz\//);
    expect(new URL(page.url()).searchParams.get("icaocode")).toBe("EFJY");
});

test("only the name is required to create a dropzone", async ({ page }) => {
    await page.goto("/?no_redirect");
    await expect(page.locator("#create-dropzone fieldset")).toHaveCount(1);
    await expect(page.locator("#create-dropzone input:required")).toHaveCount(
        1,
    );
    await expect(
        page.getByLabel("FMISID (valinnainen)", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByLabel("Fintraffic sääasema (valinnainen)", { exact: true }),
    ).toBeHidden();
    await expect(
        page.getByLabel("ICAO (valinnainen)", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await expect(page.getByLabel("Nimi", { exact: true })).toBeFocused();
    expect(new URL(page.url()).pathname).toBe("/");
    await page.getByLabel("Nimi", { exact: true }).fill("Name only");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await page.waitForURL(/\/dz\//);
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
        name: "Name only",
    });
});

test("selected coordinates suggest a Finnish name and credit Nominatim", async ({
    page,
}) => {
    await page.route(reverseUrl, (route) =>
        route.fulfill({
            json: {
                name: "",
                display_name: "57, Joukaisenkuja, Utti, Kouvola",
                address: { suburb: "Utti" },
            },
        }),
    );
    await page.goto("/?no_redirect");
    const map = page.getByRole("region", {
        name: "Valitse DZ:n sijainti kartalta",
    });
    await map.click({ position: { x: 200, y: 140 } });
    const request = page.waitForRequest(reverseUrl);
    await map
        .getByRole("button", { name: "Luo hyppypaikka", exact: true })
        .click();
    const params = new URL((await request).url()).searchParams;
    expect(params.get("lat")).toBe(
        await page.getByLabel("Leveysaste", { exact: true }).inputValue(),
    );
    expect(params.get("lon")).toBe(
        await page.getByLabel("Pituusaste", { exact: true }).inputValue(),
    );
    expect(params.get("format")).toBe("jsonv2");
    expect(params.get("accept-language")).toBe("fi");
    await expect(page.getByLabel("Nimi", { exact: true })).toHaveValue("Utti");
    await expect(
        map.getByRole("link", { name: "Nominatim", exact: true }),
    ).toHaveAttribute("href", "https://nominatim.org/");
});

test("name suggestions update with the selection and preserve an edited name", async ({
    page,
}) => {
    await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (success) =>
            success({ coords: { latitude: 61.5, longitude: 24.25 } });
    });
    let lookups = 0;
    await page.route(reverseUrl, (route) =>
        route.fulfill({
            json: {
                display_name: `${["First place", "Second place", "Third place"][lookups++]}, Finland`,
            },
        }),
    );
    await page.goto("/?no_redirect");
    const button = page.getByRole("button", {
        name: "Käytä nykyistä sijaintiani",
    });
    const name = page.getByLabel("Nimi", { exact: true });
    await button.click();
    await expect(name).toHaveValue("First place");
    await button.click();
    await expect(name).toHaveValue("Second place");
    await name.fill("My own name");
    const response = page.waitForResponse(reverseUrl);
    await button.click();
    await response;
    await expect(name).toHaveValue("My own name");
});

test("a failed name lookup leaves the selected coordinates editable", async ({
    page,
}) => {
    await page.route(reverseUrl, (route) => route.abort());
    await page.goto("/?no_redirect");
    const map = page.getByRole("region", {
        name: "Valitse DZ:n sijainti kartalta",
    });
    await map.click({ position: { x: 200, y: 140 } });
    await map
        .getByRole("button", { name: "Luo hyppypaikka", exact: true })
        .click();
    await expect(
        page.getByLabel("Leveysaste", { exact: true }),
    ).not.toHaveValue("");
    await expect(page.getByLabel("Nimi", { exact: true })).toHaveValue("");
    await page.getByLabel("Nimi", { exact: true }).fill("Test DZ");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await page.waitForURL(/\/dz\//);
    expect(new URL(page.url()).searchParams.get("name")).toBe("Test DZ");
});

test("an older name lookup cannot replace the newest selection", async ({
    page,
}) => {
    await page.addInitScript(() => {
        let selection = 0;
        navigator.geolocation.getCurrentPosition = (success) =>
            success({
                coords: { latitude: 61.5 + selection++, longitude: 24.25 },
            });
    });
    let previousRequest;
    await page.route(reverseUrl, (route) => {
        if (new URL(route.request().url()).searchParams.get("lat") === "61.5") {
            previousRequest = route;
            return;
        }
        return route.fulfill({ json: { name: "Newest place" } });
    });
    await page.goto("/?no_redirect");
    const button = page.getByRole("button", {
        name: "Käytä nykyistä sijaintiani",
    });
    await button.click();
    await expect.poll(() => !!previousRequest).toBe(true);
    await button.click();
    await expect(page.getByLabel("Nimi", { exact: true })).toHaveValue(
        "Newest place",
    );
    await previousRequest
        .fulfill({ json: { name: "Old place" } })
        .catch(() => {});
    await expect(page.getByLabel("Nimi", { exact: true })).toHaveValue(
        "Newest place",
    );
    await expect(page.getByLabel("Leveysaste", { exact: true })).toHaveValue(
        "62.5",
    );
});

test("selected coordinates fetch elevation and preserve a manual height", async ({
    page,
}) => {
    await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (success) =>
            success({ coords: { latitude: 60.9, longitude: 26.9 } });
    });
    let lookups = 0;
    await page.route(elevationUrl, (route) =>
        route.fulfill({ json: { elevation: [lookups++ ? 110 : 103] } }),
    );
    await page.goto("/?no_redirect");
    const button = page.getByRole("button", {
        name: "Käytä nykyistä sijaintiani",
    });
    const height = page.locator('#create-dropzone [name="elevation"]');
    const request = page.waitForRequest(elevationUrl);
    await button.click();
    const params = new URL((await request).url()).searchParams;
    expect(params.get("latitude")).toBe("60.9");
    expect(params.get("longitude")).toBe("26.9");
    await expect(height).toHaveValue("103");
    await button.click();
    await expect(height).toHaveValue("110");
    await height.fill("120");
    const response = page.waitForResponse(elevationUrl);
    await button.click();
    await response;
    await expect(height).toHaveValue("120");
});

test("elevation lookup accepts sea level and ignores unavailable results", async ({
    page,
}) => {
    await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (success) =>
            success({ coords: { latitude: 60.9, longitude: 26.9 } });
    });
    let lookups = 0;
    await page.route(elevationUrl, (route) =>
        lookups++ === 0
            ? route.fulfill({ json: { elevation: [0] } })
            : route.abort(),
    );
    await page.goto("/?no_redirect");
    const button = page.getByRole("button", {
        name: "Käytä nykyistä sijaintiani",
    });
    const height = page.locator('#create-dropzone [name="elevation"]');
    await button.click();
    await expect(height).toHaveValue("0");
    await button.click();
    await expect(height).toHaveValue("0");
});

for (const source of ["FMI", "Fintraffic"]) {
    test(`station source radios submit only ${source}`, async ({ page }) => {
        await page.goto("/?no_redirect");
        const fmi = page.getByLabel("FMISID (valinnainen)", { exact: true });
        const road = page.getByLabel("Fintraffic sääasema (valinnainen)", {
            exact: true,
        });
        const radios = page.getByRole("radiogroup", {
            name: "Havaintojen lähde",
        });
        await expect(
            radios.getByRole("radio", { name: "FMI", exact: true }),
        ).toBeChecked();
        await fmi.fill("101191");
        await radios
            .getByRole("radio", { name: "Fintraffic", exact: true })
            .check();
        await expect(fmi).toBeHidden();
        await road.fill("10035");
        await expect(
            page.getByRole("button", { name: "Hae lähin tieasema" }),
        ).toHaveCount(0);
        if (source === "FMI") {
            await radios
                .getByRole("radio", { name: "FMI", exact: true })
                .check();
            await expect(road).toBeHidden();
            await expect(
                page.getByRole("button", { name: "Hae lähin tieasema" }),
            ).toHaveCount(0);
            await expect(fmi).toHaveValue("101191");
        }
        await page.getByLabel("Nimi", { exact: true }).fill("Test DZ");
        await page.getByRole("button", { name: "Luo", exact: true }).click();
        await page.waitForURL(/\/dz\//);
        expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
            name: "Test DZ",
            ...(source === "FMI" ? { fmisid: "101191" } : { roadsid: "10035" }),
        });
    });
}

for (const [fmiLatitude, roadLatitude, selected] of [
    [61.51, 61.6, "FMI"],
    [61.6, 61.51, "Fintraffic"],
    [63, 61.51, "Fintraffic"],
    [61.51, 63, "FMI"],
    [63, 63, "FMI"],
]) {
    test(`coordinate selection finds stations at ${fmiLatitude}/${roadLatitude} and selects ${selected}`, async ({
        page,
    }) => {
        await page.addInitScript(() => {
            navigator.geolocation.getCurrentPosition = (success) =>
                success({ coords: { latitude: 61.5, longitude: 24.25 } });
        });
        await page.route(fmiStationsUrl, (route) =>
            route.fulfill({
                contentType: "application/xml",
                body: fmiStationsXml(fmiLatitude),
            }),
        );
        await page.route(roadStationsUrl, (route) =>
            route.fulfill({
                json: {
                    features: [
                        {
                            id: 10035,
                            properties: { name: "Test_Road_station" },
                            geometry: { coordinates: [24.25, roadLatitude] },
                        },
                    ],
                },
            }),
        );
        await page.goto("/?no_redirect");
        const fmiRequest = page.waitForResponse(fmiStationsUrl);
        const roadRequest = page.waitForResponse(roadStationsUrl);
        await page
            .getByRole("button", { name: "Käytä nykyistä sijaintiani" })
            .click();
        await Promise.all([fmiRequest, roadRequest]);
        const form = page.locator("#create-dropzone");
        await expect(form.locator('[name="fmisid"]')).toHaveValue(
            fmiLatitude < 62 ? "101191" : "",
        );
        await expect(form.locator('[name="roadsid"]')).toHaveValue(
            roadLatitude < 62 ? "10035" : "",
        );
        await expect(
            form.getByRole("radio", { name: selected, exact: true }),
        ).toBeChecked();
        await form.getByRole("radio", { name: "FMI", exact: true }).check();
        await expect(form.locator('[name="roadsid"]')).toBeHidden();
        if (fmiLatitude < 62) {
            await expect(
                form.getByText("Test FMI station", { exact: true }),
            ).toBeVisible();
            await expect(
                form.locator(".station-summary:visible"),
            ).toContainText(/km/);
        } else
            await expect(
                form.getByText("Test FMI station", { exact: true }),
            ).toHaveCount(0);
        await form
            .getByRole("radio", { name: "Fintraffic", exact: true })
            .check();
        await expect(form.locator('[name="fmisid"]')).toBeHidden();
        if (roadLatitude < 62) {
            await expect(
                form.getByText("Test Road station", { exact: true }),
            ).toBeVisible();
            await expect(
                form.locator(".station-summary:visible"),
            ).toContainText(/km/);
        } else
            await expect(
                form.getByText("Test Road station", { exact: true }),
            ).toHaveCount(0);
        await form.getByRole("radio", { name: selected, exact: true }).check();
        await page.getByLabel("Nimi", { exact: true }).fill("Test DZ");
        await page.getByRole("button", { name: "Luo", exact: true }).click();
        await page.waitForURL(/\/dz\//);
        const params = new URL(page.url()).searchParams;
        expect(params.get("fmisid")).toBe(
            selected === "FMI" && fmiLatitude < 62 ? "101191" : null,
        );
        expect(params.get("roadsid")).toBe(
            selected === "Fintraffic" && roadLatitude < 62 ? "10035" : null,
        );
    });
}

test("station lookup ignores failures and clears distant suggestions after coordinates change", async ({
    page,
}) => {
    await page.route(fmiStationsUrl, (route) => route.abort());
    await page.route(roadStationsUrl, (route) =>
        route.fulfill({
            json: {
                features: [
                    {
                        id: 10035,
                        properties: { name: "Nearby_road" },
                        geometry: { coordinates: [24.25, 61.51] },
                    },
                ],
            },
        }),
    );
    await page.goto("/?no_redirect");
    const form = page.locator("#create-dropzone");
    await form.locator('[name="lat"]').fill("61.5");
    await form.locator('[name="lon"]').fill("24.25");
    await expect(form.locator('[name="roadsid"]')).toHaveValue("10035");
    await expect(
        form.getByRole("radio", { name: "Fintraffic", exact: true }),
    ).toBeChecked();
    await form.locator('[name="lat"]').fill("65");
    await expect(form.locator('[name="roadsid"]')).toHaveValue("");
    await expect(form.getByText(/Nearby road/)).toHaveCount(0);
    await expect(form.locator('[name="fmisid"]')).toHaveValue("");
});

test("changing coordinates during station lookup uses the latest location", async ({
    page,
}) => {
    let releaseFmi;
    const ready = new Promise((resolve) => {
        releaseFmi = resolve;
    });
    await page.route(fmiStationsUrl, async (route) => {
        await ready;
        await route.fulfill({
            contentType: "application/xml",
            body: fmiStationsXml(61.51),
        });
    });
    await page.goto("/?no_redirect");
    const form = page.locator("#create-dropzone");
    await form.locator('[name="lat"]').fill("61.5");
    const requested = page.waitForRequest(fmiStationsUrl);
    await form.locator('[name="lon"]').fill("24.25");
    await requested;
    await form.locator('[name="lat"]').fill("65");
    releaseFmi();
    await page.waitForResponse(fmiStationsUrl);
    await expect(form.locator('[name="fmisid"]')).toHaveValue("");
    await expect(form.getByText(/Test FMI station/)).toHaveCount(0);
    await form.locator('[name="lat"]').fill("61.5");
    await expect(form.locator('[name="fmisid"]')).toHaveValue("101191");
});

test("station lists are cached while distances update for new coordinates", async ({
    page,
}) => {
    let fmiRequests = 0;
    let roadRequests = 0;
    await page.route(fmiStationsUrl, (route) => {
        fmiRequests++;
        return route.fulfill({
            contentType: "application/xml",
            body: fmiStationsXml(61.51),
        });
    });
    await page.route(roadStationsUrl, (route) => {
        roadRequests++;
        return route.fulfill({
            json: {
                features: [
                    {
                        id: 10035,
                        properties: { name: "Cached_Road_station" },
                        geometry: { coordinates: [24.25, 61.52] },
                    },
                ],
            },
        });
    });
    await page.goto("/?no_redirect");
    const form = page.locator("#create-dropzone");
    await form.locator('[name="lat"]').fill("61.5");
    await form.locator('[name="lon"]').fill("24.25");
    await expect(form.locator(".station-summary:visible")).toContainText(
        "1.1 km",
    );
    await expect(
        form.getByRole("radio", { name: "FMI", exact: true }),
    ).toBeChecked();
    await form.locator('[name="lat"]').fill("61.6");
    await expect(
        form.getByRole("radio", { name: "Fintraffic", exact: true }),
    ).toBeChecked();
    await expect(form.locator(".station-summary:visible")).toContainText(
        "8.9 km",
    );
    await expect(form.locator('[name="fmisid"]')).toHaveValue("101191");
    await expect(form.locator('[name="roadsid"]')).toHaveValue("10035");
    expect(fmiRequests).toBe(1);
    expect(roadRequests).toBe(1);
});

test("place search opens the first result and lets users select another result", async ({
    page,
}) => {
    const searchUrl = "https://nominatim.openstreetmap.org/search**";
    let searches = 0;
    await page.route(searchUrl, (route) => {
        searches++;
        return route.fulfill({
            json: [
                {
                    lat: "60.9",
                    lon: "26.9",
                    display_name: "Utti, Kouvola, Finland",
                },
                {
                    lat: "61.5",
                    lon: "24.25",
                    display_name: "Another place, Finland",
                },
                {
                    lat: "invalid",
                    lon: "24",
                    display_name: "Invalid coordinates",
                },
            ],
        });
    });
    await page.goto("/?no_redirect");
    await page.evaluate(async () => {
        const { Map } = await import("leaflet");
        const flyTo = Map.prototype.flyTo;
        Map.prototype.flyTo = function (...args) {
            this.on("moveend", () => {
                const center = this.getCenter();
                window.placeSearchView = {
                    center: {
                        lat: Number(center.lat.toFixed(3)),
                        lng: Number(center.lng.toFixed(3)),
                    },
                    zoom: this.getZoom(),
                };
            });
            return flyTo.apply(this, args);
        };
    });
    const input = page.getByRole("searchbox", {
        name: "Hae luodaksesi hyppypaikan",
    });
    await input.fill("Utti & Kouvola");
    expect(searches).toBe(0);
    const request = page.waitForRequest(searchUrl);
    await input.press("Enter");
    const params = new URL((await request).url()).searchParams;
    expect(params.get("q")).toBe("Utti & Kouvola");
    expect(params.get("format")).toBe("jsonv2");
    expect(params.get("accept-language")).toBe("fi");
    const results = page.getByRole("list", { name: "Paikkahaun tulokset" });
    await expect(results.getByRole("button")).toHaveCount(2);
    const map = page.getByRole("region", {
        name: "Valitse DZ:n sijainti kartalta",
    });
    const create = map.getByRole("button", {
        name: "Luo hyppypaikka",
        exact: true,
    });
    await expect(create).toBeVisible();
    await expect(page.getByLabel("Leveysaste", { exact: true })).toHaveValue(
        "",
    );
    await expect
        .poll(() => page.evaluate(() => window.placeSearchView))
        .toEqual({
            center: { lat: 60.9, lng: 26.9 },
            zoom: 13,
        });
    await create.click();
    await expect(page.getByLabel("Leveysaste", { exact: true })).toHaveValue(
        "60.90000",
    );
    await expect(page.getByLabel("Pituusaste", { exact: true })).toHaveValue(
        "26.90000",
    );
    await results
        .getByRole("button", { name: "Another place, Finland" })
        .click();
    await create.click();
    await expect(page.getByLabel("Leveysaste", { exact: true })).toHaveValue(
        "61.50000",
    );
    await expect(page.getByLabel("Pituusaste", { exact: true })).toHaveValue(
        "24.25000",
    );
    await input.press("Enter");
    await expect(create).toBeVisible();
    expect(searches).toBe(1);
});

test("place search handles empty results and errors and can retry", async ({
    page,
}) => {
    let requests = 0;
    await page.route(
        "https://nominatim.openstreetmap.org/search**",
        (route) => {
            requests++;
            return requests === 1
                ? route.fulfill({ json: [] })
                : requests === 2
                  ? route.fulfill({ status: 503, body: "Unavailable" })
                  : route.fulfill({
                        json: [
                            { lat: "60.9", lon: "26.9", display_name: "Utti" },
                        ],
                    });
        },
    );
    await page.goto("/?no_redirect");
    const input = page.getByRole("searchbox", {
        name: "Hae luodaksesi hyppypaikan",
    });
    const search = page.getByRole("button", { name: "Hae", exact: true });
    await expect(search).toBeDisabled();
    await input.fill("Missing place");
    await search.click();
    await expect(page.getByRole("status")).toContainText(
        "Paikkoja ei löytynyt",
    );
    await expect(input).toBeEnabled();
    await input.fill("Utti");
    await search.click();
    await expect(page.getByRole("status")).toContainText(
        "Paikkahaku epäonnistui",
    );
    await expect(input).toBeEnabled();
    await search.click();
    await expect(
        page
            .getByRole("list", { name: "Paikkahaun tulokset" })
            .getByRole("button"),
    ).toHaveText("Utti");
});
