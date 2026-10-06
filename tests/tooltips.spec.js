import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL).origin)
            return route.abort();
        return route.continue();
    });
    await page.goto("/dz/?lat=62&lon=25");
    await expect(page.locator(".freefall-toolbar")).toBeVisible();
});

test("keyboard focus shows tooltips and Escape dismisses them", async ({
    page,
}) => {
    const target = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
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
