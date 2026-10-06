import { test, expect } from "@playwright/test";
import { getFreefallDrift, getWindAtHeight } from "../src/map/freefall.js";
import {
    createJumpRunCalculator,
    startForOpeningTarget,
    openingTargetForRun,
} from "../src/map/jumpRun.js";

const winds = [4200, 3000, 1500, 800].map((height) => ({
    height,
    speed: 10,
    direction: 0,
}));
const settings = {
    direction: 90,
    speedKmh: 157,
    exitHeight: 4000,
    separationSeconds: 5,
};
const jumper = { speedKmh: 180, openingHeight: 800 };

test("shared jumper paths stay correct when the profile, aircraft, or winds change", () => {
    const calculate = createJumpRunCalculator();
    const initial = calculate(winds, settings);
    const path = initial.drift(jumper);
    expect(initial.drift({ ...jumper })).toBe(path);
    expect(
        calculate(structuredClone(winds), {
            ...settings,
            separationSeconds: 10,
        }).drift(jumper),
    ).toBe(path);
    const fastJumper = { ...jumper, speedKmh: 240 };
    expect(initial.drift(fastJumper)).toEqual(
        getFreefallDrift(
            winds,
            settings.exitHeight,
            fastJumper.speedKmh,
            fastJumper.openingHeight,
            initial.velocity.air,
        ),
    );
    expect(initial.drift(fastJumper)).not.toEqual(path);
    for (const changes of [
        { direction: 180 },
        { speedKmh: 180 },
        { exitHeight: 3500 },
    ]) {
        const next = { ...settings, ...changes };
        const result = calculate(winds, next);
        expect(result.drift(jumper)).toEqual(
            getFreefallDrift(
                winds,
                next.exitHeight,
                jumper.speedKmh,
                jumper.openingHeight,
                result.velocity.air,
            ),
        );
        expect(result.drift(jumper)).not.toEqual(path);
    }
    const changedWinds = winds.map((wind) => ({ ...wind, speed: 20 }));
    const result = calculate(changedWinds, settings);
    expect(result.drift(jumper)).toEqual(
        getFreefallDrift(
            changedWinds,
            settings.exitHeight,
            jumper.speedKmh,
            jumper.openingHeight,
            result.velocity.air,
        ),
    );
    expect(result.drift(jumper)).not.toEqual(path);
});

test("placing and rotating a mixed group preserves its middle opening", () => {
    const calculate = createJumpRunCalculator();
    const target = { lat: 62.4, lng: 25.6 };
    const group = [
        jumper,
        { speedKmh: 240, openingHeight: 1200 },
        { speedKmh: 80, openingHeight: 1500 },
        jumper,
    ];
    for (const direction of [0, 45, 90, 180, 270]) {
        const next = { ...settings, direction };
        const calculation = calculate(winds, next);
        const start = startForOpeningTarget(target, next, group, calculation);
        const opening = openingTargetForRun(start, next, group, calculation);
        expect(opening.lat).toBeCloseTo(target.lat, 5);
        expect(opening.lng).toBeCloseTo(target.lng, 5);
    }
});

test("irregular wind levels preserve the aircraft-exit trajectory and reject incomplete descent data", () => {
    const calculate = createJumpRunCalculator();
    const baseline = calculate(winds, settings).drift(jumper).at(-1);
    const irregular = [4380.5, 3150.25, 970.75, 120].map((height) => ({
        height,
        speed: 10,
        direction: 0,
    }));
    const actual = calculate(irregular, settings).drift(jumper).at(-1);
    expect(actual.height).toBe(800);
    expect(actual.east).toBeCloseTo(baseline.east, 6);
    expect(actual.north).toBeCloseTo(baseline.north, 6);
    const missing = irregular.map((wind, index) =>
        index === 2 ? { ...wind, speed: null } : wind,
    );
    expect(calculate(missing, settings).drift(jumper)).toBeNull();
    for (const heights of [
        [4380, NaN, 900],
        [4380, 900, 900],
        [4380, 900, 1500],
    ]) {
        expect(
            getFreefallDrift(
                heights.map((height) => ({ height, speed: 10, direction: 0 })),
            ),
        ).toBeNull();
    }
    const unusedMissing = [
        ...winds,
        { height: 110, speed: null, direction: null },
    ];
    expect(calculate(unusedMissing, settings).drift(jumper).at(-1)).toEqual(
        baseline,
    );
});

test("wind selection always uses nearest altitude regardless of bearing or range", () => {
    const profile = [
        { height: 3935.6728, speed: 20, direction: 270 },
        { height: 2748.6728, speed: 8, direction: 90 },
        { height: 519.6728, speed: 5, direction: 180 },
    ];
    for (const height of [4000, 3935.6728, 3500]) {
        expect(getWindAtHeight(profile, height).east).toBeCloseTo(20);
    }
    for (const height of [3000, 2748.6728, 2000]) {
        expect(getWindAtHeight(profile, height).east).toBeCloseTo(-8);
    }
    expect(getWindAtHeight(profile, 0).north).toBeCloseTo(5);
    // Ties consistently choose the higher level.
    expect(
        getWindAtHeight(profile, (3935.6728 + 2748.6728) / 2).east,
    ).toBeCloseTo(20);
    expect(
        getWindAtHeight(
            [{ ...profile[0], speed: null }, ...profile.slice(1)],
            4000,
        ),
    ).toBeNull();
    expect(getWindAtHeight(profile, NaN)).toBeNull();
    expect(getWindAtHeight([], 4000)).toBeNull();
});

test("drift integrates nearest-level regions exactly and supports a single wind level", () => {
    const profile = [
        { height: 2101, speed: 10, direction: 270 },
        { height: 999, speed: 20, direction: 90 },
    ];
    // Boundary is 1550 m: 2450 m east wind, then 750 m west wind at 50 m/s.
    const end = getFreefallDrift(profile).at(-1);
    expect(end.east).toBeCloseTo((2450 * 10 - 750 * 20) / 50, 8);
    expect(getFreefallDrift(profile.slice(0, 1)).at(-1).east).toBeCloseTo(
        640,
        8,
    );
    const calculation = createJumpRunCalculator()(
        profile.slice(0, 1),
        settings,
    );
    expect(calculation.drift(jumper).at(-1).height).toBe(800);
});

test("decimal midpoint ties use the upper wind for aircraft and descent boundaries", () => {
    const profile = [
        { height: 2748.6728, speed: 10, direction: 270 },
        { height: 1208.6728, speed: 20, direction: 90 },
    ];
    const boundary = (profile[0].height + profile[1].height) / 2;
    expect(getWindAtHeight(profile, boundary).east).toBeCloseTo(10, 8);
    expect(getWindAtHeight(profile, boundary - 1e-9).east).toBeCloseTo(-20, 8);
    const calculate = createJumpRunCalculator();
    expect(
        calculate(profile, { ...settings, exitHeight: boundary }).velocity
            .ground.east,
    ).toBeCloseTo(settings.speedKmh / 3.6 + 10, 8);
    // Missing wind below an opening exactly on the boundary is never used.
    const missingBelow = [profile[0], { ...profile[1], speed: null }];
    expect(
        getFreefallDrift(missingBelow, 4000, 180, boundary).at(-1).east,
    ).toBeCloseTo(((4000 - boundary) * 10) / 50, 8);
    expect(
        calculate(missingBelow, settings).drift({
            ...jumper,
            openingHeight: boundary,
        }),
    ).not.toBeNull();
});
