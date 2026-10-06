import { test, expect } from "@playwright/test";

/** @param {import('@playwright/test').Page} page */
async function animationState(page) {
    return page.evaluate(async () => {
        const { ANIMATIONS_RUNNING } =
            await import("#app/app/animationState.js");
        return ANIMATIONS_RUNNING.value;
    });
}

test("successive zoom gestures restart the one-second resume delay", async ({
    page,
}) => {
    await page.goto("/");
    await page.clock.install({ time: new Date("2026-10-06T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-06T12:00:10Z"));
    const zoom = () =>
        page.evaluate(async () => {
            const { holdAnimations } =
                await import("#app/app/animationState.js");
            const release = holdAnimations();
            release();
        });
    await zoom();
    expect(await animationState(page)).toBe(false);
    await page.clock.runFor(900);
    await zoom();
    await page.clock.runFor(999);
    expect(await animationState(page)).toBe(false);
    await page.clock.runFor(1);
    expect(await animationState(page)).toBe(true);
});

test("overlapping gestures hold playback until all gestures end", async ({
    page,
}) => {
    await page.goto("/");
    await page.clock.install({ time: new Date("2026-10-06T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-06T12:00:10Z"));
    // Keep the release functions in the page without exposing test state globally.
    const releases = await page.evaluateHandle(async () => {
        const { holdAnimations } = await import("#app/app/animationState.js");
        return [holdAnimations(), holdAnimations()];
    });
    await page.clock.runFor(3000);
    expect(await animationState(page)).toBe(false);
    await releases.evaluate((release) => release[0]());
    await page.clock.runFor(1500);
    expect(await animationState(page)).toBe(false);
    await releases.evaluate((release) => release[1]());
    await page.clock.runFor(999);
    expect(await animationState(page)).toBe(false);
    await page.clock.runFor(1);
    expect(await animationState(page)).toBe(true);
    await releases.dispose();
});

test("only map zooming pauses playback during scrolling and map interactions", async ({
    page,
    baseURL,
}) => {
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL).origin)
            return route.abort();
        return route.continue();
    });
    await page.goto(
        "/dz/?lat=62&lon=25&DEV_mock=1&DEV_ground_obs=15,10,270,5;7,6,180,55",
    );
    const compass = page.locator("#compass");
    await compass.scrollIntoViewIfNeeded();
    const playbackStates = () =>
        compass.evaluate((element) =>
            element
                .getAnimations({ subtree: true })
                .map((animation) => animation.playState),
        );
    await expect.poll(() => animationState(page)).toBe(true);
    await expect.poll(playbackStates).toEqual(Array(4).fill("running"));
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    expect(await animationState(page)).toBe(true);
    await page.evaluate(() =>
        document.dispatchEvent(new WheelEvent("wheel", { deltaY: 200 })),
    );
    expect(await animationState(page)).toBe(true);
    await expect.poll(playbackStates).toEqual(Array(4).fill("running"));

    const zoomIn = page.locator(".leaflet-control-zoom-in");
    await zoomIn.scrollIntoViewIfNeeded();
    await expect.poll(() => animationState(page)).toBe(true);
    const map = page.locator(".dz-map");
    await map.dispatchEvent("wheel", { deltaY: 200 });
    expect(await animationState(page)).toBe(true);
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();
    const initialCenter = new URL(page.url()).searchParams.get(
        "map_center_lon",
    );
    await page.mouse.move(
        bounds.x + bounds.width / 3,
        bounds.y + bounds.height / 3,
    );
    await page.mouse.down();
    await page.mouse.move(
        bounds.x + bounds.width / 3 + 80,
        bounds.y + bounds.height / 3,
        { steps: 5 },
    );
    expect(await animationState(page)).toBe(true);
    await page.mouse.up();
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_center_lon"))
        .not.toBe(initialCenter);
    expect(await animationState(page)).toBe(true);
    const initialZoom = new URL(page.url()).searchParams.get("map_zoom");
    await zoomIn.click();
    expect(await animationState(page)).toBe(false);
    await expect
        .poll(() => new URL(page.url()).searchParams.get("map_zoom"))
        .not.toBe(initialZoom);
    await expect.poll(() => animationState(page)).toBe(true);
});
