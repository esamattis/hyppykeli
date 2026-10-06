// @ts-check

/** @param {number} height */
export function roundForecastAltitude(height) {
    return Math.round(height / 500) * 500;
}

/** @param {number} height */
export function formatForecastAltitude(height) {
    return `${roundForecastAltitude(height)} m`;
}

/** @param {number} height */
export function formatExactAltitude(height) {
    return `${Math.round(height)} m`;
}
