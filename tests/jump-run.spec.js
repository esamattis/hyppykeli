import { test, expect } from "@playwright/test";
import { getFreefallDrift } from "../src/map/freefall.js";
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
