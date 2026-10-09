// @ts-check
import { getCanopyDrift, getCanopyReach } from "#app/map/canopy.js";

export const DEFAULT_WINGSUIT_GLIDE_RATIO = 1.6;
export const DEFAULT_WINGSUIT_DESCENT_RATE_MPS = 80 / 3.6;
const WINGSUIT_EXIT_TURN_SECONDS = 15;

/**
 * Estimated exit positions that can reach an opening target at constant sink
 * rate, reserving the first 15 seconds for exit and turning with no useful glide.
 * Wind drift applies throughout; subsequent glide assumes unrestricted steering
 * and horizontally uniform winds.
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
    const glideHeight = Math.max(
        0,
        exitHeight -
            openingHeight -
            descentRateMps * WINGSUIT_EXIT_TURN_SECONDS,
    );
    const radius = glideHeight * glideRatio;
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
