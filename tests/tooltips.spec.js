import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL).origin)
            return route.abort();
        return route.continue();
    });
    await page.goto("/dz/?lat=62&lon=25&DEV_mock=1");
    await expect(page.locator(".freefall-toolbar")).toBeVisible();
});

test("every map toolbar button exposes its tooltip on hover, including disabled buttons", async ({
    page,
}) => {
    const buttons = page.locator(".freefall-toolbar button.arrow-action");
    const tooltip = page.getByRole("tooltip");
    await page.locator(".freefall-toolbar").scrollIntoViewIfNeeded();
    // Finish scrolling before hovering: scroll events dismiss the tooltip.
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(await buttons.count()).toBe(11);
    for (const button of await buttons.all()) {
        const label = await button.getAttribute("aria-label");
        await button.hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip.locator("[data-tooltip-text]")).toHaveText(label);
        await expect(button).toHaveAttribute("aria-describedby", "tooltip");
    }
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
});

test("keyboard focus shows tooltips and Escape dismisses them", async ({
    page,
}) => {
    const target = page
        .locator(".freefall-toolbar button.arrow-action")
        .first();
    const tooltip = page.getByRole("tooltip");
    await target.evaluate((element) =>
        element.setAttribute("aria-describedby", "existing-description"),
    );
    await target.focus();
    await expect(tooltip).toBeVisible();
    await expect(target).toHaveAttribute(
        "aria-describedby",
        "existing-description tooltip",
    );
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
    await expect(target).toHaveAttribute(
        "aria-describedby",
        "existing-description",
    );
    await page.keyboard.press("Tab");
    await expect(tooltip).toBeVisible();
});

test("touch tooltips stay open until the next touch starts", async ({
    page,
}) => {
    const target = page
        .locator(".freefall-toolbar button.arrow-action")
        .first();
    const tooltip = page.getByRole("tooltip");
    await target.dispatchEvent("touchstart");
    await target.dispatchEvent("pointerout", { pointerType: "touch" });
    await target.dispatchEvent("click");
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator("[data-tooltip-text]")).toHaveText(
        await target.getAttribute("aria-label"),
    );
    await page.locator("body").dispatchEvent("touchstart");
    await expect(tooltip).toBeHidden();
});
