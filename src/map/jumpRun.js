// @ts-check
import { CANOPY_PATTERN_HEIGHT, getCanopyDrift } from "#app/map/canopy.js";
import {
    driftCoordinates,
    getFreefallDrift,
    getJumpRunVelocity,
    jumpRunCoordinates,
} from "#app/map/freefall.js";

/** @param {[number, number]} coordinates */
const position = ([lat, lng]) => ({ lat, lng });

/** Cache only the current wind/aircraft calculation, with one path per jumper profile. */
export function createJumpRunCalculator() {
    let previousKey = "";
    /** @type {JumpRunCalculation | undefined} */
    let previous;
    /** @param {FreefallWindLevel[]} winds @param {JumpRunSettings} settings @returns {JumpRunCalculation} */
    return (winds, settings) => {
        const key = JSON.stringify([
            winds,
            settings.direction,
            settings.speedKmh,
            settings.exitHeight,
        ]);
        if (previous && key === previousKey) return previous;
        const velocity = getJumpRunVelocity(winds, settings);
        /** @type {Map<string, FreefallDriftPoint[] | null>} */
        const paths = new Map();
        previousKey = key;
        previous = {
            velocity,
            drift(jumper) {
                const profile = `${jumper.speedKmh}/${jumper.openingHeight}`;
                if (!paths.has(profile))
                    paths.set(
                        profile,
                        velocity
                            ? getFreefallDrift(
                                  winds,
                                  settings.exitHeight,
                                  jumper.speedKmh,
                                  jumper.openingHeight,
                                  velocity.air,
                              )
                            : null,
                    );
                return paths.get(profile) ?? null;
            },
        };
        return previous;
    };
}

/**
 * First-exit position that puts the middle of the exit sequence on the target.
 * @param {import('leaflet').LatLngLiteral} target
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {JumpRunCalculation} calculation
 * @returns {import('leaflet').LatLngLiteral | null}
 */
export function startForRunCenter(target, settings, group, calculation) {
    const { velocity } = calculation;
    if (!velocity || !group.length) return null;
    return position(
        jumpRunCoordinates(
            target,
            settings,
            -(group.length - 1) / 2,
            velocity.ground,
        ),
    );
}

/**
 * First-exit position that puts the middle openings on the target.
 * @param {import('leaflet').LatLngLiteral} target
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {JumpRunCalculation} calculation
 * @returns {import('leaflet').LatLngLiteral | null}
 */
export function startForOpeningTarget(target, settings, group, calculation) {
    const { velocity } = calculation;
    if (!velocity || !group.length) return null;
    const middleIndex = Math.max(0, (group.length - 1) / 2);
    const middleJumpers = group.slice(
        Math.floor(middleIndex),
        Math.ceil(middleIndex) + 1,
    );
    if (!middleJumpers.length) return null;
    const openingOffset = middleJumpers.reduce(
        (offset, jumper) => {
            const path = calculation.drift(jumper);
            const opening = path?.[path.length - 1];
            return {
                east: offset.east + (opening?.east ?? 0) / middleJumpers.length,
                north:
                    offset.north + (opening?.north ?? 0) / middleJumpers.length,
            };
        },
        { east: 0, north: 0 },
    );
    const middleExit = position(
        driftCoordinates(target, {
            height: 0,
            east: -openingOffset.east,
            north: -openingOffset.north,
        }),
    );
    return position(
        jumpRunCoordinates(middleExit, settings, -middleIndex, velocity.ground),
    );
}

/**
 * Where the middle of the group opens for an existing run.
 * @param {import('leaflet').LatLngLiteral} start
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {JumpRunCalculation} calculation
 * @returns {import('leaflet').LatLngLiteral | null}
 */
export function openingTargetForRun(start, settings, group, calculation) {
    const { velocity } = calculation;
    if (!velocity || !group.length) return null;
    const middleIndex = Math.max(0, (group.length - 1) / 2);
    const indexes = [
        ...new Set([Math.floor(middleIndex), Math.ceil(middleIndex)]),
    ];
    /** @type {import('leaflet').LatLngLiteral[]} */
    const openings = [];
    for (const index of indexes) {
        const jumper = group[index];
        if (!jumper) continue;
        const exit = position(
            jumpRunCoordinates(start, settings, index, velocity.ground),
        );
        const path = calculation.drift(jumper);
        const opening = path?.[path.length - 1];
        if (!opening) continue;
        openings.push(position(driftCoordinates(exit, opening)));
    }
    if (!openings.length) return null;
    return {
        lat:
            openings.reduce((sum, point) => sum + point.lat, 0) /
            openings.length,
        lng:
            openings.reduce((sum, point) => sum + point.lng, 0) /
            openings.length,
    };
}

/**
 * Middle predicted position at landing pattern entry (300 m), using the same
 * freefall and canopy paths as the map.
 * For an even group, use the midpoint of the two middle landings.
 * @param {import('leaflet').LatLngLiteral} start
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {JumpRunCalculation} calculation
 * @param {FreefallWindLevel[]} canopyWinds
 * @returns {import('leaflet').LatLngLiteral | null}
 */
export function landingTargetForRun(
    start,
    settings,
    group,
    calculation,
    canopyWinds,
) {
    if (!calculation.velocity || !group.length) return null;
    const middleIndex = (group.length - 1) / 2;
    const indexes = [
        ...new Set([Math.floor(middleIndex), Math.ceil(middleIndex)]),
    ];
    const landings = [];
    for (const index of indexes) {
        const jumper = group[index];
        if (!jumper) return null;
        const freefall = calculation.drift(jumper)?.at(-1);
        const canopy = getCanopyDrift(
            canopyWinds,
            jumper.openingHeight,
            settings.canopyDescentRateMps,
            CANOPY_PATTERN_HEIGHT,
        )?.at(-1);
        if (!freefall || !canopy) return null;
        const exit = position(
            jumpRunCoordinates(
                start,
                settings,
                index,
                calculation.velocity.ground,
            ),
        );
        const opening = position(driftCoordinates(exit, freefall));
        landings.push(position(driftCoordinates(opening, canopy)));
    }
    return {
        lat:
            landings.reduce((sum, landing) => sum + landing.lat, 0) /
            landings.length,
        lng:
            landings.reduce((sum, landing) => sum + landing.lng, 0) /
            landings.length,
    };
}
