// @ts-check
import { getMapWindData } from "#app/map/windData.js";

/** @param {number} [now] @returns {ManualUpperWindInput[]} */
export function currentUpperWinds(now) {
    const winds = getMapWindData(now).upperWindInputs;
    // Older shared links keep their five measurements; offer the new forecast
    // levels as defaults without changing the link until the user edits it.
    return winds.length === 5
        ? [...getMapWindData(now, false).upperWindInputs.slice(0, 2), ...winds]
        : winds;
}

/** @param {ManualUpperWindInput[]} winds */
export function serializeUpperWinds(winds) {
    return winds
        .map(
            ({ speed, direction, height }) =>
                `${speed.trim()},${direction.trim()},${height?.trim() ?? ""}`,
        )
        .join(";");
}

/** @returns {ManualUpperWindInput[]} */
export function currentUpperWindsFromForecast() {
    return getMapWindData(undefined, false).upperWindInputs;
}
