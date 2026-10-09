// @ts-check
import { getCanopyDrift, getCanopyReach } from "#app/map/canopy.js";

export const DEFAULT_WINGSUIT_GLIDE_RATIO = 1.6;
export const DEFAULT_WINGSUIT_DESCENT_RATE_MPS = 80 / 3.6;

/**
 * Exit positions that can reach an opening target at constant glide and sink
 * rates, with unrestricted steering and horizontally uniform winds.
 * @param {FreefallWindLevel[]} winds Descending altitude order, including ground.
 * @param {number} exitHeight
 * @param {number} openingHeight
 * @param {number} glideRatio
 * @param {number} descentRateMps
 * @returns {CanopyReachArea | null}
 */
export function getWingsuitReach(
    winds,
    exitHeight,
    openingHeight,
    glideRatio,
    descentRateMps,
) {
    const radius = (exitHeight - openingHeight) * glideRatio;
    if (
        !Number.isFinite(glideRatio) ||
        glideRatio <= 0 ||
        !Number.isFinite(radius)
    )
        return null;
    const drift = getCanopyDrift(
        winds,
        exitHeight,
        descentRateMps,
        openingHeight,
    )?.at(-1);
    return drift ? { east: -drift.east, north: -drift.north, radius } : null;
}

/**
 * Exit positions that can reach any opening position inside the canopy reach
 * circle. Combining the two discs adds their radii and wind offsets.
 * @param {FreefallWindLevel[]} winds
 * @param {number} openingHeight
 * @param {JumpRunSettings} settings
 * @returns {CanopyReachArea | null} Offset relative to the landing target.
 */
export function getWingsuitCanopyReach(winds, openingHeight, settings) {
    const canopy = getCanopyReach(
        winds,
        openingHeight,
        settings.canopyGlideRatio,
        settings.canopyDescentRateMps,
    );
    const wingsuit = getWingsuitReach(
        winds,
        settings.exitHeight,
        openingHeight,
        settings.wingsuitGlideRatio,
        settings.wingsuitDescentRateMps,
    );
    if (!canopy || !wingsuit) return null;
    const area = {
        east: canopy.east + wingsuit.east,
        north: canopy.north + wingsuit.north,
        radius: canopy.radius + wingsuit.radius,
    };
    return Object.values(area).every(Number.isFinite) ? area : null;
}
