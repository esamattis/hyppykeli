import { test, expect } from "@playwright/test";

test("the animation checkbox stops every compass animation and remembers the preference", async ({
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
    await page.evaluate(async () => {
        const { HOVERED_OBSERVATION, LATEST_OBSERVATION } =
            await import("#app/weather/state.js");
        HOVERED_OBSERVATION.value = LATEST_OBSERVATION.value;
    });
    const toggle = page.locator("#compass input[type=checkbox]");
    const runningAnimations = () =>
        page
            .locator(".compass > svg")
            .evaluateAll((compasses) =>
                compasses.map(
                    (compass) =>
                        compass.getAnimations({ subtree: true }).length,
                ),
            );

    await expect(toggle).toBeChecked();
    await expect.poll(runningAnimations).toEqual([4, 0]);

    // A click dismisses the hovered compass; change directly to keep both mounted.
    await toggle.dispatchEvent("change");
    await expect(toggle).not.toBeChecked();
    await expect.poll(runningAnimations).toEqual([0, 0]);

    // Weather changes must not start a color transition while animations are off.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        const { HOVERED_OBSERVATION, LATEST_OBSERVATION } =
            await import("#app/weather/state.js");
        navigateQs({ DEV_ground_obs: "6,4,270,5;7,6,180,55" });
        HOVERED_OBSERVATION.value = LATEST_OBSERVATION.value;
    });
    await expect.poll(runningAnimations).toEqual([0, 0]);

    await page.reload();
    await expect(toggle).not.toBeChecked();
    await expect.poll(runningAnimations).toEqual([0]);

    await toggle.check();
    await expect.poll(runningAnimations).toEqual([2]);
    await expect(
        await page.evaluate(() => localStorage.getItem("compass-animation")),
    ).toBe("true");
});

test("compass playback pauses offscreen and in hidden tabs, then resumes", async ({
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
    const playbackStates = () =>
        compass.evaluate((element) =>
            element
                .getAnimations({ subtree: true })
                .map((animation) => animation.playState),
        );
    await compass.scrollIntoViewIfNeeded();
    await expect.poll(playbackStates).toEqual(Array(4).fill("running"));

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(playbackStates).toEqual(Array(4).fill("paused"));
    // A weather update while offscreen must leave the new timeline paused.
    await page.evaluate(async () => {
        const { navigateQs } = await import("#app/app/settings.js");
        navigateQs({ DEV_ground_obs: "16,10,280,5;8,6,190,55" });
    });
    await expect.poll(playbackStates).toEqual(Array(4).fill("paused"));
    await compass.scrollIntoViewIfNeeded();
    await expect.poll(playbackStates).toEqual(Array(4).fill("running"));

    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(playbackStates).toEqual(Array(4).fill("paused"));
    const frozen = await compass.evaluate(async (element) => {
        const animations = element.getAnimations({ subtree: true });
        const times = animations.map((animation) => animation.currentTime);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        return animations.every(
            (animation, index) => animation.currentTime === times[index],
        );
    });
    expect(frozen).toBe(true);
    await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(playbackStates).toEqual(Array(4).fill("running"));
});
