// @ts-check
import { getMapWindData } from "#app/map/windData.js";

/** @param {number} [now] @returns {ManualUpperWindInput[]} */
export function currentUpperWinds(now) {
    return getMapWindData(now).upperWindInputs;
}

/** @param {ManualUpperWindInput[]} winds */
export function serializeUpperWinds(winds) {
    return winds
        .map(
            ({ speed, direction, height }) =>
                `${speed.trim()},${direction.trim()},${height.trim()}`,
        )
        .join(";");
}

/** @returns {ManualUpperWindInput[]} */
export function currentUpperWindsFromForecast() {
    return getMapWindData(undefined, false).upperWindInputs;
}
