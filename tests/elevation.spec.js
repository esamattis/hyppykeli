import { expect, test } from "@playwright/test";

const label = "Hyppypaikan korkeus merenpinnasta (m)";
const dz =
    "/dz/?fmisid=101191&DEV_mock=1&DEV_ground_obs=2,2,0,1&DEV_upper_winds=42,0;30,0;15,0;8,0;1.1,0";

test.beforeEach(async ({ page, baseURL }) => {
    await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
            ? route.continue()
            : route.abort(),
    );
});

test("elevation input persists in the URL and clears back to the default", async ({
    page,
}) => {
    await page.goto(`${dz}&elevation=100.5`);
    const open = page.getByRole("button", {
        name: "Hyppylinjan asetukset",
        exact: true,
    });
    const dialog = page.getByRole("dialog", { name: "Hyppylinjan asetukset" });
    await open.click();
    const elevation = dialog.getByRole("spinbutton", {
        name: label,
        exact: true,
    });
    await expect(elevation).toHaveValue("100.5");
    const exit = dialog.getByRole("spinbutton", {
        name: "Uloshyppykorkeus (m)",
        exact: true,
    });
    await expect(exit).toHaveAttribute("max", "4099.5");
    await elevation.fill("150");
    expect(new URL(page.url()).searchParams.get("elevation")).toBe("150");
    await expect(exit).toHaveAttribute("max", "4050");
    await page.reload();
    await open.click();
    await expect(elevation).toHaveValue("150");
    await elevation.fill("-1");
    expect(new URL(page.url()).searchParams.get("elevation")).toBe("150");
    await elevation.fill("");
    expect(new URL(page.url()).searchParams.has("elevation")).toBe(false);
    await expect(exit).toHaveAttribute("max", "4200");
    await page.reload();
    await open.click();
    await expect(elevation).toHaveValue("0");
});

test("elevation adjusts freefall, exit wind and canopy heights", async ({
    page,
}) => {
    await page.goto(`${dz}&elevation=200`);
    const result = await page.evaluate(async () => {
        const { getMapWindData } = await import("#app/map/windData.js");
        const { getFreefallDrift, getWindAtHeight } =
            await import("#app/map/freefall.js");
        const { getCanopyDrift } = await import("#app/map/canopy.js");
        const { navigateQs } = await import("#app/app/settings.js");
        const adjusted = getMapWindData();
        const path = getFreefallDrift(adjusted.freefallWinds);
        const canopy = getCanopyDrift(adjusted.canopyWinds, 800);
        const exit = getWindAtHeight(adjusted.freefallWinds, 4000);
        const unavailable = getFreefallDrift(adjusted.freefallWinds, 4001);
        navigateQs({ elevation: undefined });
        const original = getMapWindData();
        navigateQs({ elevation: "invalid" });
        const invalid = getMapWindData().freefallWinds.map(
            (wind) => wind.height,
        );
        return {
            heights: adjusted.freefallWinds.map((wind) => wind.height),
            canopyHeights: adjusted.canopyWinds.map((wind) => wind.height),
            path: path.at(-1),
            original: getFreefallDrift(original.freefallWinds).at(-1),
            canopyEnd: canopy.at(-1),
            exit,
            unavailable,
            invalid,
        };
    });
    expect(result.heights).toEqual([4000, 2800, 1300, 600]);
    expect(result.canopyHeights).toEqual([4000, 2800, 1300, 600, 0]);
    // speed = ASL height / 100, integrated for 3200 m at 50 m/s.
    expect(result.path.height).toBe(800);
    expect(result.path.north).toBeCloseTo(-1664, 5);
    expect(result.original.north).toBeCloseTo(-1536, 5);
    expect(result.exit).toEqual({ east: 0, north: -42 });
    expect(result.canopyEnd.height).toBe(0);
    expect(result.canopyEnd.north).toBeCloseTo(-960, 5);
    expect(result.unavailable).toBeNull();
    expect(result.invalid).toEqual([4200, 3000, 1500, 800]);
});

test("landing form includes elevation in the dropzone URL", async ({
    page,
}) => {
    await page.goto("/?no_redirect");
    await page.locator('[name="fmisid"]').fill("101191");
    await page
        .getByRole("spinbutton", { name: label, exact: true })
        .fill("123.5");
    await page.getByRole("button", { name: "Luo", exact: true }).click();
    await expect(page).toHaveURL(/elevation=123.5/);
    expect(new URL(page.url()).searchParams.get("elevation")).toBe("123.5");
});
