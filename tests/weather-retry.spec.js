import { test, expect } from "@playwright/test";

test("error panel forces fresh requests from all providers, including healthy cached forecasts", async ({
    page,
    baseURL,
}) => {
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    const requests = new Map();
    let release;
    const blocked = new Promise((resolve) => {
        release = resolve;
    });
    let hold = false;
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(baseURL).origin) return route.continue();
        if (
            ![
                "opendata.fmi.fi",
                "api.open-meteo.com",
                "tie.digitraffic.fi",
                "flyk.com",
            ].includes(url.hostname)
        )
            return route.abort();
        const key = url.hostname + url.pathname;
        requests.set(key, (requests.get(key) ?? 0) + 1);
        if (url.hostname === "opendata.fmi.fi")
            return route.fulfill({
                contentType: "application/xml",
                path: "tests/fixtures/forecast.xml",
            });
        if (hold) await blocked;
        return route.fulfill({ status: 503 });
    });
    await page.goto("/dz/?roadsid=5004&icaocode=EFUT&lat=60&lon=25");
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
    });
    const button = page
        .locator("#errors")
        .getByRole("button", { name: "Yritä uudelleen" });
    await expect(button).toBeVisible();
    expect(requests.size).toBe(6);
    expect([...requests.values()]).toEqual([1, 1, 1, 1, 1, 1]);
    hold = true;
    await button.click();
    await expect(button).toBeDisabled();
    // The first wave includes METAR, road observations/history, and metadata.
    await expect
        .poll(
            () => [...requests.values()].filter((count) => count === 2).length,
        )
        .toBe(4);
    release();
    await expect(button).toBeEnabled();
    expect([...requests.values()]).toEqual([2, 2, 2, 2, 2, 2]);
    const before = [...requests];
    await page.evaluate(async () => {
        const { updateWeatherData } = await import("#app/weather/refresh.js");
        await updateWeatherData();
    });
    expect([...requests]).toEqual(before);
});
