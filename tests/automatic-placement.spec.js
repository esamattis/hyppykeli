import { test, expect } from "@playwright/test";
import { startForAutomaticRun } from "../src/map/automaticPlacement.js";
import { getCanopyDrift } from "../src/map/canopy.js";
import {
    createJumpRunCalculator,
    landingTargetForRun,
} from "../src/map/jumpRun.js";
import { driftCoordinates, jumpRunCoordinates } from "../src/map/freefall.js";

const target = { lat: 62.4, lng: 25.6 };
const settings = {
    direction: 0,
    speedKmh: 157,
    exitHeight: 4000,
    separationSeconds: 5,
};
const jumper = { speedKmh: 180, openingHeight: 800 };
const profile = (direction = 0, speed = 10) =>
    [4200, 3000, 1500, 800, 110, 0].map((height) => ({
        height,
        direction,
        speed,
    }));

function place(winds, group = [jumper], options = settings) {
    const calculation = createJumpRunCalculator()(winds.slice(0, 4), options);
    const start = startForAutomaticRun(
        target,
        options,
        group,
        calculation,
        winds,
    );
    const openings =
        start &&
        group.map((member, index) => {
            const [lat, lng] = jumpRunCoordinates(
                start,
                options,
                index,
                calculation.velocity.ground,
            );
            const [endLat, endLng] = driftCoordinates(
                { lat, lng },
                calculation.drift(member).at(-1),
            );
            return {
                east:
                    (((endLng - target.lng) * Math.PI) / 180) *
                    6371000 *
                    Math.cos((target.lat * Math.PI) / 180),
                north: (((endLat - target.lat) * Math.PI) / 180) * 6371000,
            };
        });
    return { start, openings };
}

test("automatic placement checks every opening, including an interior jumper with different drift", () => {
    const winds = profile();
    const group = [
        jumper,
        { speedKmh: 60, openingHeight: 800 },
        jumper,
        { speedKmh: 240, openingHeight: 1500 },
    ];
    for (const direction of [0, 90, 180, 270]) {
        const { start, openings } = place(winds, group, {
            ...settings,
            direction,
        });
        expect(start).not.toBeNull();
        for (const opening of openings)
            expect(opening.north).toBeGreaterThanOrEqual(50);
    }
});

test("the furthest downwind opening controls the offset for a long group", () => {
    const { openings } = place(
        profile(0, 1),
        Array.from({ length: 20 }, () => jumper),
    );
    expect(Math.min(...openings.map((opening) => opening.north))).toBeCloseTo(
        51,
        0,
    );
});

test("canopy drift integrates interpolated winds by descent time, including higher openings", () => {
    const winds = profile(0, 0);
    winds.find((wind) => wind.height === 800).speed = 2;
    winds.find((wind) => wind.height === 110).speed = 4;
    winds.find((wind) => wind.height === 0).speed = 6;
    const low = place(winds).openings[0];
    // Linear sections average 3 and 5 m/s; descend at 5 m/s.
    expect(low.north).toBeCloseTo((690 * 3 + 110 * 5) / 5, 1);
    const high = place(winds, [{ ...jumper, openingHeight: 1500 }]).openings[0];
    expect(high.north - low.north).toBeCloseTo((700 * 1) / 5, 1);
});

test("changing lower winds constrain openings by accumulated canopy drift", () => {
    const winds = profile();
    winds.find((wind) => wind.height === 110).direction = 90;
    winds.find((wind) => wind.height === 0).direction = 90;
    const drift = getCanopyDrift(winds, 800).at(-1);
    const length = Math.hypot(drift.east, drift.north);
    const { openings } = place(
        winds,
        Array.from({ length: 6 }, () => jumper),
    );
    for (const opening of openings) {
        const upwind =
            -(opening.east * drift.east + opening.north * drift.north) / length;
        expect(upwind).toBeGreaterThanOrEqual(50);
    }
});

test("opposing lower winds are integrated instead of rejecting placement", () => {
    const winds = profile();
    winds.at(-1).direction = 180;
    const drift = getCanopyDrift(winds, 800).at(-1);
    const { start, openings } = place(winds);
    expect(start).not.toBeNull();
    expect(openings[0].north).toBeCloseTo(-drift.north, 1);
});

test("higher opening layers can reverse the accumulated canopy drift", () => {
    const winds = profile();
    winds.find((wind) => wind.height === 1500).direction = 180;
    winds.find((wind) => wind.height === 1500).speed = 100;
    expect(place(winds).openings[0].north).toBeGreaterThan(50);
    expect(
        place(winds, [{ ...jumper, openingHeight: 1500 }]).openings[0].north,
    ).toBeLessThan(-50);
});

test("Utti wind reversal keeps automatic placement near the landing target", () => {
    const target = { lat: 60.89755354967867, lng: 26.926031112670902 };
    const options = { ...settings, direction: 323.5014355348678 };
    const winds = [
        [26.44, 256, 7057.1628],
        [17.87, 261, 5440.6728],
        [18.01, 266, 4065.6728],
        [11.08, 255, 2870.6728],
        [5.32, 270, 1332.6728],
        [3.37, 264, 649.6728],
        [1.2, 222, 13.6728],
        [1.1, 123, 0],
    ].map(([speed, direction, height]) => ({ speed, direction, height }));
    const group = Array.from({ length: 8 }, () => jumper);
    const calculation = createJumpRunCalculator()(winds.slice(0, -1), options);
    const start = startForAutomaticRun(
        target,
        options,
        group,
        calculation,
        winds,
    );
    expect(start).not.toBeNull();
    const landing = landingTargetForRun(
        start,
        options,
        group,
        calculation,
        winds,
    );
    const distance = (a, b) =>
        Math.hypot(
            (((a.lat - b.lat) * Math.PI) / 180) * 6371000,
            (((a.lng - b.lng) * Math.PI) / 180) *
                6371000 *
                Math.cos((target.lat * Math.PI) / 180),
        );
    expect(distance(landing, target)).toBeLessThan(1);
    expect(
        distance(start, { lat: 60.8901676724241, lng: 26.91353551188604 }),
    ).toBeLessThan(150);
});

test("calm lower winds do not require a bearing or force an upwind offset", () => {
    const winds = profile(0, 0);
    winds.at(-1).direction = null;
    winds.at(-2).direction = null;
    const { openings } = place(winds);
    expect(Math.hypot(openings[0].east, openings[0].north)).toBeLessThan(0.1);
});

for (const height of [800, 110, 0]) {
    test(`missing or invalid wind at ${height} m prevents placement`, () => {
        for (const change of [
            { speed: null },
            { direction: null },
            { speed: -1 },
            { speed: NaN },
        ]) {
            const winds = profile();
            Object.assign(
                winds.find((wind) => wind.height === height),
                change,
            );
            expect(place(winds).start).toBeNull();
        }
    });
}

test("a missing individual freefall path cannot silently produce a placement", () => {
    expect(
        place(profile(), [jumper, { ...jumper, openingHeight: 4500 }]).start,
    ).toBeNull();
});
