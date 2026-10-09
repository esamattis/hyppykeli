// @ts-check
import { getWindAtHeight } from "#app/map/freefall.js";

export const DEFAULT_CANOPY_DESCENT_RATE_MPS = 5;
export const DEFAULT_CANOPY_GLIDE_RATIO = 3;
export const CANOPY_PATTERN_HEIGHT = 300;

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
 * Integrate canopy drift from opening to a target height using interpolated wind vectors.
 * Offsets are metres east/north of the opening position.
 * @param {FreefallWindLevel[]} winds Descending altitude order, including ground.
 * @param {number} openingHeight
 * @param {number} [descentRateMps] Constant downward speed in metres per second.
 * @param {number} [targetHeight] Descent endpoint above the dropzone, in metres.
 * @returns {FreefallDriftPoint[] | null}
 */
export function getCanopyDrift(
    winds,
    openingHeight,
    descentRateMps = DEFAULT_CANOPY_DESCENT_RATE_MPS,
    targetHeight = 0,
) {
    if (
        !Number.isFinite(openingHeight) ||
        openingHeight <= 0 ||
        !Number.isFinite(targetHeight) ||
        targetHeight < 0 ||
        targetHeight >= openingHeight ||
        !Number.isFinite(descentRateMps) ||
        descentRateMps <= 0 ||
        winds.at(-1)?.height !== 0
    )
        return null;
    const path = [{ height: openingHeight, east: 0, north: 0 }];
    let east = 0;
    let north = 0;
    for (let height = openingHeight; height > targetHeight;) {
        // Split at reported levels so midpoint integration is exact for each
        // linear section. Small steps also show the changing direction.
        const boundary =
            winds.find((wind) => wind.height < height)?.height ?? 0;
        const nextHeight = Math.max(height - 25, boundary, targetHeight);
        const wind = getCanopyWindAtHeight(winds, (height + nextHeight) / 2);
        if (!wind) return null;
        const seconds = (height - nextHeight) / descentRateMps;
        east += wind.east * seconds;
        north += wind.north * seconds;
        if (!Number.isFinite(east) || !Number.isFinite(north)) return null;
        path.push({ height: nextHeight, east, north });
        height = nextHeight;
    }
    return path;
}

/**
 * Reachable opening positions relative to a landing target. Constant glide and
 * sink rates with unrestricted steering give a disc shifted against wind drift.
 * Wind is assumed horizontally uniform; descent stops at landing pattern entry.
 * @param {FreefallWindLevel[]} winds Descending altitude order, including ground.
 * @param {number} openingHeight Height above the dropzone in metres.
 * @param {number} glideRatio Horizontal air distance per metre descended.
 * @param {number} descentRateMps
 * @returns {CanopyReachArea | null}
 */
export function getCanopyReach(
    winds,
    openingHeight,
    glideRatio,
    descentRateMps,
) {
    const radius = (openingHeight - CANOPY_PATTERN_HEIGHT) * glideRatio;
    if (
        !Number.isFinite(glideRatio) ||
        glideRatio <= 0 ||
        !Number.isFinite(radius)
    )
        return null;
    const drift = getCanopyDrift(
        winds,
        openingHeight,
        descentRateMps,
        CANOPY_PATTERN_HEIGHT,
    )?.at(-1);
    return drift ? { east: -drift.east, north: -drift.north, radius } : null;
}
