import { test, expect } from "@playwright/test";
import { startForAutomaticRun } from "../src/map/automaticPlacement.js";
import { createJumpRunCalculator } from "../src/map/jumpRun.js";
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

test("canopy drift weights nearest-level regions by descent time, including higher openings", () => {
    const winds = profile(0, 0);
    winds.find((wind) => wind.height === 800).speed = 2;
    winds.find((wind) => wind.height === 110).speed = 4;
    winds.find((wind) => wind.height === 0).speed = 6;
    const low = place(winds).openings[0];
    // Regions: 345 m at 2 m/s, 400 m at 4 m/s, 55 m at 6 m/s; descend at 5 m/s.
    expect(low.north).toBeCloseTo((690 * 3 + 110 * 5) / 5, 1);
    const high = place(winds, [{ ...jumper, openingHeight: 1500 }]).openings[0];
    expect(high.north - low.north).toBeCloseTo((700 * 1) / 5, 1);
});

test("each lower wind constrains placement even when the average points elsewhere", () => {
    const winds = profile();
    winds.find((wind) => wind.height === 110).direction = 90;
    winds.find((wind) => wind.height === 0).direction = 90;
    const { openings } = place(
        winds,
        Array.from({ length: 6 }, () => jumper),
    );
    for (const opening of openings) {
        expect(opening.north).toBeGreaterThanOrEqual(50);
        expect(opening.east).toBeGreaterThanOrEqual(50);
    }
});

test("opposing lower winds reject automatic placement instead of cancelling out", () => {
    const winds = profile();
    winds.at(-1).direction = 180;
    expect(place(winds).start).toBeNull();
});

test("higher opening layers also constrain placement", () => {
    const winds = profile();
    winds.find((wind) => wind.height === 1500).direction = 180;
    expect(place(winds).start).not.toBeNull();
    expect(place(winds, [{ ...jumper, openingHeight: 1500 }]).start).toBeNull();
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
