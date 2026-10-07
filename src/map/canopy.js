// @ts-check
import { getWindAtHeight } from "#app/map/freefall.js";

// Shared with automatic landing placement: wind drift only, not canopy glide.
const CANOPY_DESCENT_SPEED_MPS = 5;

/**
 * Linearly interpolate east/north components, preserving each reported wind.
 * Outside the profile, hold the closest endpoint wind constant.
 * @param {FreefallWindLevel[]} winds Descending altitude order.
 * @param {number} height
 * @returns {WindVector | null}
 */
export function getCanopyWindAtHeight(winds, height) {
    // Calm readings have no required bearing. The shared lookup also validates
    // heights and ordering, and rejects missing data rather than skipping it.
    const profile = winds.map((wind) =>
        wind.speed === 0 ? { ...wind, direction: 0 } : wind,
    );
    const nearest = getWindAtHeight(profile, height);
    if (!nearest) return null;
    for (let index = 1; index < profile.length; index++) {
        const above = profile[index - 1];
        const below = profile[index];
        if (!above || !below || height > above.height || height < below.height)
            continue;
        if (height === above.height || height === below.height) return nearest;
        const a = getWindAtHeight([above], height);
        const b = getWindAtHeight([below], height);
        if (!a || !b) return null;
        const fraction =
            (height - below.height) / (above.height - below.height);
        return {
            east: b.east + fraction * (a.east - b.east),
            north: b.north + fraction * (a.north - b.north),
        };
    }
    return nearest;
}

/**
 * A 5 m/s vector difference is a display threshold, not a wind-shear limit.
 * Missing/stale ground data is represented by null readings in this profile.
 * @param {FreefallWindLevel[]} winds Descending altitude order, including ground.
 */
export function hasGroundWindDisagreement(winds) {
    const ground = winds.at(-1);
    const lowest = winds.at(-2);
    if (!ground || ground.height !== 0 || !lowest) return false;
    const a = getCanopyWindAtHeight(winds, ground.height);
    const b = getCanopyWindAtHeight(winds, lowest.height);
    return !!a && !!b && Math.hypot(a.east - b.east, a.north - b.north) > 5;
}

/**
 * Integrate canopy drift from opening to ground using interpolated wind vectors between levels.
 * Offsets are metres east/north of the opening position.
 * @param {FreefallWindLevel[]} winds Descending altitude order, including ground.
 * @param {number} openingHeight
 * @returns {FreefallDriftPoint[] | null}
 */
export function getCanopyDrift(winds, openingHeight) {
    if (
        !Number.isFinite(openingHeight) ||
        openingHeight <= 0 ||
        winds.at(-1)?.height !== 0
    )
        return null;
    const path = [{ height: openingHeight, east: 0, north: 0 }];
    let east = 0;
    let north = 0;
    for (let height = openingHeight; height > 0;) {
        // Split at reported levels so midpoint integration is exact for each
        // linear section. Small steps also show the changing direction.
        const boundary =
            winds.find((wind) => wind.height < height)?.height ?? 0;
        const nextHeight = Math.max(height - 25, boundary, 0);
        const wind = getCanopyWindAtHeight(winds, (height + nextHeight) / 2);
        if (!wind) return null;
        const seconds = (height - nextHeight) / CANOPY_DESCENT_SPEED_MPS;
        east += wind.east * seconds;
        north += wind.north * seconds;
        path.push({ height: nextHeight, east, north });
        height = nextHeight;
    }
    return path;
}
