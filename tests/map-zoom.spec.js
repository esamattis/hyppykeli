import { expect, test } from "@playwright/test";

test("dropzone map hides controls after moving and restores them after momentum", async ({
    page,
    baseURL,
}) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
    await page.goto("/dz/?lat=60.9&lon=26.9");
    await page.evaluate(async () => {
        const { Map } = await import("leaflet");
        const fire = Map.prototype.fire;
        Map.prototype.fire = function (type, data, propagate) {
            if (type === "dragstart") {
                window.panFinished = false;
                this.once("moveend", () => {
                    window.panFinished = true;
                    window.panEndTime = performance.now();
                });
            }
            return fire.call(this, type, data, propagate);
        };
    });
    const map = page.locator(".dz-map");
    const controls = page.locator(".map-navigation-controls");
    await expect(controls).toBeVisible();
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    await page.mouse.move(bounds.x + 160, bounds.y + 160);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 170, bounds.y + 160);
    await expect(controls).toBeVisible();
    await page.mouse.move(bounds.x + 220, bounds.y + 200, { steps: 5 });
    await expect(controls).toBeHidden();
    await page.mouse.up();
    await expect(controls).toBeHidden();
    await page.mouse.down();
    await page.mouse.move(bounds.x + 260, bounds.y + 220, { steps: 5 });
    // The previous release must not restore controls during this drag.
    await page.waitForTimeout(350);
    await expect(controls).toBeHidden();
    await page.mouse.up();
    await expect(controls).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.panFinished)).toBe(true);
    await expect(controls).toBeHidden();
    await expect(controls).toBeVisible();
    expect(
        await page.evaluate(() => performance.now() - window.panEndTime),
    ).toBeGreaterThanOrEqual(300);
});

for (const [name, url] of [
    ["landing", "/?no_redirect"],
    ["dropzone", "/dz/?lat=60.9&lon=26.9"],
]) {
    test(`${name} map zooms out on double right-click and in on double left-click`, async ({
        page,
        baseURL,
    }) => {
        await page.route("**/*", (route) =>
            new URL(route.request().url()).origin === new URL(baseURL).origin
                ? route.continue()
                : route.abort(),
        );
        await page.goto(url);
        const map = page.locator(".leaflet-container");
        await expect(map).toBeVisible();
        await page.evaluate(async () => {
            const { Map } = await import("leaflet");
            const setZoomAround = Map.prototype.setZoomAround;
            window.zoomChanges = [];
            Map.prototype.setZoomAround = function (point, zoom, options) {
                window.testMap = this;
                window.initialZoom ??= this.getZoom();
                window.zoomSettled = false;
                this.once("zoomend", () => {
                    window.zoomSettled = true;
                });
                window.zoomChanges.push(zoom - this.getZoom());
                return setZoomAround.call(this, point, zoom, options);
            };
        });
        const position = { x: 120, y: 100 };
        await map.click({ button: "right", position });
        expect(await page.evaluate(() => window.zoomChanges)).toEqual([]);
        // A left-click interrupts a pair of right-clicks.
        await map.click({ position });
        await map.dblclick({ button: "right", position });
        await expect
            .poll(() => page.evaluate(() => window.zoomChanges))
            .toEqual([-1]);
        await expect
            .poll(() =>
                page.evaluate(
                    () => window.testMap.getZoom() - window.initialZoom,
                ),
            )
            .toBe(-1);
        await expect
            .poll(() => page.evaluate(() => window.zoomSettled))
            .toBe(true);
        await map.dblclick({ position });
        await expect
            .poll(() => page.evaluate(() => window.zoomChanges))
            .toEqual([-1, 1]);
        await expect
            .poll(() =>
                page.evaluate(
                    () => window.testMap.getZoom() - window.initialZoom,
                ),
            )
            .toBe(0);
    });
}
