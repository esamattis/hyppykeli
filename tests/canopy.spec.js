import { test, expect } from "@playwright/test";
import { getCanopyDrift } from "../src/map/canopy.js";

test("canopy descent integrates changing wind through opening and ground", () => {
    const winds = [
        { height: 1500, speed: 0, direction: null },
        { height: 800, speed: 2, direction: 0 },
        { height: 110, speed: 4, direction: 90 },
        { height: 0, speed: 6, direction: 90 },
    ];
    const path = getCanopyDrift(winds, 1150);
    expect(path[0]).toEqual({ height: 1150, east: 0, north: 0 });
    // Switch winds at midpoint heights: 1150, 455 and 55 m.
    const ground = path.at(-1);
    expect(ground.height).toBe(0);
    expect(ground.north).toBeCloseTo(-(695 * 2) / 5, 8);
    expect(ground.east).toBeCloseTo(-(400 * 4 + 55 * 6) / 5, 8);
    // No westward drift before crossing the midpoint at 455 m.
    const intermediate = path.find((point) => point.height === 455);
    expect(intermediate.east).toBeCloseTo(0, 8);
    expect(
        path.every(
            (point, index) => !index || point.height < path[index - 1].height,
        ),
    ).toBe(true);
});

test("calm canopy winds need no bearing", () => {
    const path = getCanopyDrift(
        [800, 110, 0].map((height) => ({ height, speed: 0, direction: null })),
        800,
    );
    expect(path.at(-1)).toEqual({ height: 0, east: 0, north: 0 });
});

test("missing canopy wind or ground prevents a predicted landing", () => {
    const winds = [800, 110, 0].map((height) => ({
        height,
        speed: 5,
        direction: 0,
    }));
    expect(getCanopyDrift(winds.slice(0, -1), 800)).toBeNull();
    expect(getCanopyDrift(winds, 900).at(-1).north).toBeCloseTo(-900);
    for (const height of [800, 110, 0]) {
        expect(
            getCanopyDrift(
                winds.map((wind) =>
                    wind.height === height ? { ...wind, speed: null } : wind,
                ),
                800,
            ),
        ).toBeNull();
    }
});
