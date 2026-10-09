import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== new URL(baseURL).origin)
            return route.abort();
        return route.continue();
    });
    await page.addInitScript(() => localStorage.setItem("language", "en"));
});

test("system appearance follows preference changes and the toggle cycles all three modes", async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/?no_redirect");
    const toggle = page.getByRole("button", {
        name: "Appearance:",
        exact: false,
    });
    await expect(toggle).toHaveAccessibleName(
        "Appearance: System. Switch to Light.",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await toggle.click();
    await expect(toggle).toHaveAccessibleName(
        "Appearance: Light. Switch to Dark.",
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAccessibleName(
        "Appearance: Dark. Switch to System.",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.keyboard.press("Space");
    await expect(toggle).toHaveAccessibleName(
        "Appearance: System. Switch to Light.",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
        "system",
    );
});

test("chosen appearance persists across reloads and both pages", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/?no_redirect");
    const toggle = page.locator(".theme-toggle");
    await toggle.click();
    await toggle.click();
    await page.reload();
    await expect(toggle).toHaveAccessibleName(
        "Appearance: Dark. Switch to System.",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/dz/?lat=62&lon=25&name=Test");
    await expect(toggle).toHaveAccessibleName(
        "Appearance: Dark. Switch to System.",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".leaflet-container")).toHaveCount(1);
    const map = await page.locator(".leaflet-container").elementHandle();
    const dropzoneUrl = page.url();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await toggle.click();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await map.evaluate((element) => element.isConnected)).toBe(true);
    expect(page.url()).toBe(dropzoneUrl);
    expect(errors).toEqual([]);
});

test("invalid saved appearance defaults to system", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "invalid"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/?no_redirect");
    await expect(page.locator(".theme-toggle")).toHaveAccessibleName(
        "Appearance: System. Switch to Light.",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("appearance changes synchronize across tabs", async ({
    page,
    context,
}) => {
    await page.goto("/?no_redirect");
    const other = await context.newPage();
    await other.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(page.url()).origin
            ? route.continue()
            : route.abort(),
    );
    await other.goto("/?no_redirect");
    await page.locator(".theme-toggle").click();
    await expect(other.locator(".theme-toggle")).toHaveAccessibleName(
        "Appearance: Light. Switch to Dark.",
    );
    await page.locator(".theme-toggle").click();
    await expect(other.locator(".theme-toggle")).toHaveAccessibleName(
        "Appearance: Dark. Switch to System.",
    );
    await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
    await other.close();
});
