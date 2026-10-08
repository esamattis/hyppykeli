import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL).origin)
            return route.abort();
        return route.continue();
    });
    await page.addInitScript(() => localStorage.setItem("language", "en"));
});

test("fullscreen toggle targets the whole page and follows external exits", async ({
    page,
}) => {
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    const toggle = page.getByRole("button", { name: "Enter fullscreen" });
    await toggle.click();
    await expect
        .poll(() =>
            page.evaluate(
                () => document.fullscreenElement === document.documentElement,
            ),
        )
        .toBe(true);
    const exit = page.getByRole("button", { name: "Exit fullscreen" });
    await expect(exit).toHaveAttribute("data-tooltip", "Exit fullscreen");
    await exit.click();
    await expect(toggle).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(
        true,
    );

    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(exit).toBeVisible();
    await page.evaluate(() => document.exitFullscreen());
    await expect(toggle).toBeVisible();
});

test("fullscreen is hidden when the browser does not support it", async ({
    page,
}) => {
    await page.addInitScript(() => {
        Object.defineProperty(document, "fullscreenEnabled", { value: false });
    });
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    await expect(page.locator(".page-header")).toBeVisible();
    await expect(page.locator(".fullscreen-toggle")).toHaveCount(0);
});

test("a rejected fullscreen request can be retried", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    await page.evaluate(() => {
        document.documentElement.requestFullscreen = () =>
            Promise.reject(new Error("Fullscreen denied"));
    });
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    const retry = page.getByRole("button", {
        name: "Unable to change fullscreen. Try again.",
    });
    await expect(retry).toBeVisible();
    await page.evaluate(() => {
        delete document.documentElement.requestFullscreen;
    });
    await retry.click();
    await expect(
        page.getByRole("button", { name: "Exit fullscreen" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
});
