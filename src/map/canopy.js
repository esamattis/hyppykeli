// @ts-check
import { getWindAtHeight } from "#app/map/freefall.js";

// Shared with automatic landing placement: wind drift only, not canopy glide.
const CANOPY_DESCENT_SPEED_MPS = 5;

/**
 * Integrate canopy drift from opening to ground using interpolated wind vectors.
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
    // A calm observation need not have a meaningful bearing.
    const profile = winds.map((wind) =>
        wind.speed === 0 ? { ...wind, direction: 0 } : wind,
    );
    const path = [{ height: openingHeight, east: 0, north: 0 }];
    let east = 0;
    let north = 0;
    for (let height = openingHeight; height > 0;) {
        const boundary =
            profile.find((wind) => wind.height < height)?.height ?? 0;
        const nextHeight = Math.max(height - 100, boundary, 0);
        const from = getWindAtHeight(profile, height);
        const to = getWindAtHeight(profile, nextHeight);
        if (!from || !to) return null;
        const seconds = (height - nextHeight) / CANOPY_DESCENT_SPEED_MPS;
        east += ((from.east + to.east) / 2) * seconds;
        north += ((from.north + to.north) / 2) * seconds;
        path.push({ height: nextHeight, east, north });
        height = nextHeight;
    }
    return path;
}
