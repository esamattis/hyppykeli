import { test, expect } from "@playwright/test";
import {
    getCanopyDrift,
    getCanopyWindAtHeight,
    hasGroundWindDisagreement,
} from "../src/map/canopy.js";

test("canopy descent integrates changing wind through opening and ground", () => {
    const winds = [
        { height: 1500, speed: 0, direction: null },
        { height: 800, speed: 2, direction: 0 },
        { height: 110, speed: 4, direction: 90 },
        { height: 0, speed: 6, direction: 90 },
    ];
    const path = getCanopyDrift(winds, 1150);
    expect(path[0]).toEqual({ height: 1150, east: 0, north: 0 });
    // Integrate each linear vector section at 5 m/s, including the partial
    // 1500–800 m section above the opening (1 m/s at 1150 m).
    const ground = path.at(-1);
    expect(ground.height).toBe(0);
    expect(ground.north).toBeCloseTo(-(350 * 1.5 + 690 * 1) / 5, 8);
    expect(ground.east).toBeCloseTo(-(690 * 2 + 110 * 5) / 5, 8);
    const intermediate = path.find((point) => point.height === 800);
    expect(intermediate.east).toBeCloseTo(0, 8);
    expect(path.find((point) => point.height === 110)).toBeDefined();
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

test("canopy winds interpolate components across north and opposing bearings", () => {
    const acrossNorth = [
        { height: 100, speed: 10, direction: 350 },
        { height: 0, speed: 10, direction: 10 },
    ];
    const middle = getCanopyWindAtHeight(acrossNorth, 50);
    expect(middle.east).toBeCloseTo(0, 10);
    expect(middle.north).toBeCloseTo(-10 * Math.cos(Math.PI / 18), 10);
    const opposing = [
        { height: 100, speed: 10, direction: 0 },
        { height: 0, speed: 10, direction: 180 },
    ];
    expect(getCanopyWindAtHeight(opposing, 50).north).toBeCloseTo(0, 10);
    expect(getCanopyWindAtHeight(opposing, 25).north).toBeCloseTo(5, 10);
    expect(getCanopyWindAtHeight(opposing, 100).north).toBe(-10);
    expect(getCanopyWindAtHeight(opposing, 200).north).toBe(-10);
});

test("missing bracketing data cannot be hidden by a closer valid reading", () => {
    const winds = [
        { height: 1500, speed: null, direction: 0 },
        { height: 800, speed: 5, direction: 0 },
        { height: 0, speed: 2, direction: 0 },
    ];
    expect(getCanopyDrift(winds, 850)).toBeNull();
    expect(getCanopyDrift(winds, 800)).not.toBeNull();
    expect(getCanopyDrift([...winds].reverse(), 800)).toBeNull();
});

test("ground disagreement uses vector difference and needs valid readings", () => {
    const winds = [
        { height: 110, speed: 4, direction: 0 },
        { height: 0, speed: 4, direction: 180 },
    ];
    expect(hasGroundWindDisagreement(winds)).toBe(true);
    expect(
        hasGroundWindDisagreement([winds[0], { ...winds[1], direction: 10 }]),
    ).toBe(false);
    expect(
        hasGroundWindDisagreement([winds[0], { ...winds[1], speed: null }]),
    ).toBe(false);
    expect(hasGroundWindDisagreement([winds[0]])).toBe(false);
    expect(
        hasGroundWindDisagreement([
            { height: 110, speed: 5, direction: 0 },
            { height: 0, speed: 0, direction: null },
        ]),
    ).toBe(false);
});
