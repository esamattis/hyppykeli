import { test, expect } from "@playwright/test";
import {
    getWingsuitReach,
    DEFAULT_WINGSUIT_GLIDE_RATIO,
    DEFAULT_WINGSUIT_DESCENT_RATE_MPS,
} from "../src/map/wingsuit.js";

const winds = [
    { height: 4000, speed: 10, direction: 270 },
    { height: 0, speed: 10, direction: 270 },
];

test("wingsuit reach targets opening altitude and compensates wind drift", () => {
    const reach = getWingsuitReach(
        winds,
        4000,
        800,
        DEFAULT_WINGSUIT_GLIDE_RATIO,
        DEFAULT_WINGSUIT_DESCENT_RATE_MPS,
    );
    expect(reach.radius).toBe(5120);
    expect(DEFAULT_WINGSUIT_DESCENT_RATE_MPS * 3.6).toBe(80);
    expect(reach.east).toBeCloseTo((-10 * 3200) / (80 / 3.6), 8);
    expect(reach.north).toBeCloseTo(0, 8);
    const higherOpening = getWingsuitReach(winds, 4000, 1200, 1.6, 15);
    expect(higherOpening.radius).toBe(4480);
    expect(higherOpening.east).toBeCloseTo((-10 * 2800) / 15, 8);
    const slower = getWingsuitReach(winds, 4000, 800, 1.6, 10);
    expect(slower.radius).toBe(reach.radius);
    expect(slower.east).toBeCloseTo(-3200, 8);
    expect(getWingsuitReach(winds, 4000, 800, 2, 15).radius).toBe(6400);
});

test("wingsuit reach uses only winds above opening and rejects invalid flight settings", () => {
    const calm = [
        { height: 4000, speed: 0, direction: null },
        { height: 800, speed: 0, direction: null },
        { height: 0, speed: null, direction: null },
    ];
    expect(getWingsuitReach(calm, 4000, 800, 1.6, 15).radius).toBe(5120);
    expect(getWingsuitReach(calm, 4000, 800, 1.6, 15).east).toBeCloseTo(0);
    for (const opening of [4000, 4500, -1, NaN])
        expect(getWingsuitReach(winds, 4000, opening, 1.6, 15)).toBeNull();
    for (const ratio of [0, -1, NaN, Infinity])
        expect(getWingsuitReach(winds, 4000, 800, ratio, 15)).toBeNull();
    for (const rate of [0, -1, NaN, Infinity])
        expect(getWingsuitReach(winds, 4000, 800, 1.6, rate)).toBeNull();
    expect(
        getWingsuitReach(
            [{ ...winds[0], speed: null }, winds[1]],
            4000,
            800,
            1.6,
            15,
        ),
    ).toBeNull();
});

test("wingsuit exits can reach the entire canopy reach circle", async () => {
    const { getWingsuitCanopyReach } = await import("../src/map/wingsuit.js");
    const settings = {
        exitHeight: 4000,
        direction: 0,
        speedKmh: 157,
        separationSeconds: 5,
        wingsuitGlideRatio: 1.6,
        wingsuitDescentRateMps: 80 / 3.6,
        canopyGlideRatio: 3,
        canopyDescentRateMps: 5,
    };
    const reach = getWingsuitCanopyReach(winds, 800, settings);
    expect(reach.radius).toBe(5120 + 1500);
    expect(reach.east).toBeCloseTo(-10 * (3200 / (80 / 3.6) + 500 / 5), 8);
    expect(reach.north).toBeCloseTo(0, 8);
    const moreCanopyGlide = getWingsuitCanopyReach(winds, 800, {
        ...settings,
        canopyGlideRatio: 4,
    });
    expect(moreCanopyGlide.radius).toBe(reach.radius + 500);
    expect(moreCanopyGlide.east).toBe(reach.east);
    const slowerCanopy = getWingsuitCanopyReach(winds, 800, {
        ...settings,
        canopyDescentRateMps: 2.5,
    });
    expect(slowerCanopy.radius).toBe(reach.radius);
    expect(slowerCanopy.east).toBeCloseTo(reach.east - 1000, 8);
    expect(getWingsuitCanopyReach(winds, 300, settings)).toBeNull();
    expect(
        getWingsuitCanopyReach(winds, 800, {
            ...settings,
            canopyGlideRatio: 0,
        }),
    ).toBeNull();
    // Opening-height winds remain available, but required canopy winds are missing.
    expect(
        getWingsuitCanopyReach(
            [
                winds[0],
                { height: 800, speed: 10, direction: 270 },
                { height: 300, speed: null, direction: null },
                winds[1],
            ],
            800,
            settings,
        ),
    ).toBeNull();
});

test("canopy reach stays inside wingsuit reach while wingsuit airspeed exceeds wind", async () => {
    const { getWingsuitCanopyReach } = await import("../src/map/wingsuit.js");
    const { getCanopyReach } = await import("../src/map/canopy.js");
    const settings = {
        exitHeight: 4000,
        direction: 0,
        speedKmh: 157,
        separationSeconds: 5,
        wingsuitGlideRatio: 1.6,
        wingsuitDescentRateMps: 80 / 3.6,
        canopyGlideRatio: 3,
        canopyDescentRateMps: 5,
    };
    for (const speed of [0, 5, 10, 25]) {
        const profile = winds.map((wind) => ({ ...wind, speed }));
        for (const height of [800, 1200, 1500]) {
            const canopy = getCanopyReach(profile, height, 3, 5);
            const wingsuit = getWingsuitCanopyReach(profile, height, settings);
            const centreDistance = Math.hypot(
                wingsuit.east - canopy.east,
                wingsuit.north - canopy.north,
            );
            expect(centreDistance + canopy.radius).toBeLessThan(
                wingsuit.radius,
            );
        }
    }
    // At 128 km/h of wind, the upwind limits meet; faster wind can separate them.
    const forwardAirspeed =
        settings.wingsuitGlideRatio * settings.wingsuitDescentRateMps;
    const profile = winds.map((wind) => ({ ...wind, speed: forwardAirspeed }));
    const canopy = getCanopyReach(profile, 800, 3, 5);
    const wingsuit = getWingsuitCanopyReach(profile, 800, settings);
    expect(
        Math.hypot(wingsuit.east - canopy.east, wingsuit.north - canopy.north) +
            canopy.radius,
    ).toBeCloseTo(wingsuit.radius, 8);
});
