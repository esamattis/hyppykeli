import { test, expect } from "@playwright/test";

test("wind particles reuse cached artwork and stop drawing when wind becomes calm", async ({
    page,
}) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
        const { render, h } = await import("preact");
        const { MapWindOverlay } = await import("#app/map/MapWindOverlay.js");
        const { ANIMATIONS_RUNNING } =
            await import("#app/app/animationState.js");
        const container = document.createElement("div");
        container.style.cssText =
            "position:fixed;inset:0 auto auto 0;width:200px;height:200px;z-index:9999";
        document.body.append(container);
        const prototype = CanvasRenderingContext2D.prototype;
        const originalGradient = prototype.createLinearGradient;
        const originalDraw = prototype.drawImage;
        let gradients = 0;
        let draws = 0;
        prototype.createLinearGradient = function (...args) {
            gradients++;
            return originalGradient.apply(this, args);
        };
        prototype.drawImage = function (...args) {
            draws++;
            return originalDraw.apply(this, args);
        };
        const frames = async (count) => {
            for (let index = 0; index < count; index++) {
                await new Promise(requestAnimationFrame);
            }
        };
        try {
            render(
                h(MapWindOverlay, { wind: { speed: 10, direction: 90 } }),
                container,
            );
            for (let index = 0; index < 60 && !draws; index++) await frames(1);
            const initialGradients = gradients;
            const initialDraws = draws;
            await frames(10);
            const steadyGradients = gradients;
            const steadyDraws = draws;
            ANIMATIONS_RUNNING.value = false;
            await frames(10);
            const pausedDraws = draws;
            ANIMATIONS_RUNNING.value = true;
            await frames(10);
            const resumedDraws = draws;
            render(
                h(MapWindOverlay, { wind: { speed: 0, direction: 90 } }),
                container,
            );
            await frames(10);
            const calmDraws = draws;
            await frames(10);
            return {
                initialGradients,
                initialDraws,
                steadyGradients,
                steadyDraws,
                pausedDraws,
                resumedDraws,
                calmDraws,
                finalDraws: draws,
            };
        } finally {
            render(null, container);
            container.remove();
            prototype.createLinearGradient = originalGradient;
            prototype.drawImage = originalDraw;
            ANIMATIONS_RUNNING.value = true;
        }
    });
    expect(result.initialGradients).toBe(1);
    expect(result.initialDraws).toBeGreaterThan(0);
    expect(result.steadyGradients).toBe(result.initialGradients);
    expect(result.steadyDraws).toBeGreaterThan(result.initialDraws);
    expect(result.pausedDraws).toBe(result.steadyDraws);
    expect(result.resumedDraws).toBeGreaterThan(result.pausedDraws);
    expect(result.finalDraws).toBe(result.calmDraws);
});
