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
    const replay = page.locator("#compass animate, #compass animateTransform");
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
    await expect(replay.first()).toBeAttached();
    await expect.poll(runningAnimations).toEqual([2, 0]);

    // A click dismisses the hovered compass; change directly to keep both mounted.
    await toggle.dispatchEvent("change");
    await expect(toggle).not.toBeChecked();
    await expect(replay).toHaveCount(0);
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
    await expect(replay).toHaveCount(0);
    await expect.poll(runningAnimations).toEqual([0]);

    await toggle.check();
    await expect(replay.first()).toBeAttached();
    await expect(
        await page.evaluate(() => localStorage.getItem("compass-animation")),
    ).toBe("true");
});
