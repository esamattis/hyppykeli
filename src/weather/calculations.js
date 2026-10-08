// @ts-check
import { getIntlLocale } from "#app/translations.js";

/**
 * Calculates the difference between two wind directions considering the circular nature of directions.
 * @param {number} dir1 - First wind direction.
 * @param {number} dir2 - Second wind direction.
 * @returns {number} The minimum difference between the two directions.
 */
export function calculateDirectionDifference(dir1, dir2) {
    const diff = Math.abs(dir1 - dir2);
    return Math.min(diff, 360 - diff);
}

/**
 * @param {WeatherData|undefined} obs
 */
export function hasValidWindData(obs) {
    if (!obs) {
        return false;
    }

    return (
        typeof obs.direction === "number" &&
        Number.isFinite(obs.direction) &&
        obs.direction >= 0 &&
        obs.direction <= 360 &&
        typeof obs.gust === "number" &&
        Number.isFinite(obs.gust) &&
        obs.gust >= 0 &&
        typeof obs.speed === "number" &&
        Number.isFinite(obs.speed) &&
        obs.speed >= 0
    );
}

/**
 * @param {WeatherData|undefined} obs
 */
export function hasValidAverageWindData(obs) {
    if (!obs) {
        return false;
    }

    return (
        typeof obs.direction === "number" &&
        Number.isFinite(obs.direction) &&
        obs.direction >= 0 &&
        obs.direction <= 360 &&
        typeof obs.speed === "number" &&
        Number.isFinite(obs.speed) &&
        obs.speed >= 0
    );
}

/**
 * Unrounded minimum and maximum observed during the last hour.
 * Directions use the smallest arc containing all readings; max may exceed 360°.
 * @param {WeatherData[]} observations
 * @param {"gust" | "speed" | "direction"} key
 * @param {number} [now]
 * @returns {WindRange | undefined}
 */
export function getHourlyWindRange(observations, key, now = Date.now()) {
    const values = observations.flatMap((observation) => {
        const age = now - observation.time.getTime();
        const value = observation[key];
        if (
            age < 0 ||
            age > 60 * 60 * 1000 ||
            value === undefined ||
            !Number.isFinite(value) ||
            value < 0 ||
            (key === "direction" && value > 360)
        ) {
            return [];
        }
        return [value];
    });

    if (!values.length) return;

    if (key === "direction") {
        const bearings = values
            .map((value) => value % 360)
            .sort((a, b) => a - b);
        let largestGap = -1;
        let start = 0;
        for (const [index, bearing] of bearings.entries()) {
            const next = bearings[(index + 1) % bearings.length] ?? 0;
            const gap =
                next + (index === bearings.length - 1 ? 360 : 0) - bearing;
            if (gap > largestGap) {
                largestGap = gap;
                start = next;
            }
        }
        return { min: start, max: start + 360 - largestGap };
    }

    return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * @param {number} num
 */
export function knotsToMs(num) {
    return num * 0.514444;
}

/**
 * Calculate the cloud base altitude in meters from the surface temperature and dew point temperature.
 * https://en.wikipedia.org/wiki/Lifted_condensation_level
 *
 * @param {number} temp - The surface temperature in Celsius.
 * @param {number} dewPoint - The dew point temperature in Celsius.
 * @return {number} - The estimated cloud base altitude in meters.
 */
export function getLiftedCondensationLevel(temp, dewPoint) {
    const lcl = 125 * (temp - dewPoint);
    // Round to the nearest 100 meters
    return Math.round(lcl / 100) * 100;
}

/**
 * @param {number} base
 * @param {string} unit
 * @param {{ approximate?: boolean, maximumFractionDigits?: number }} [options]
 * @returns {string}
 */
export function formatCloudBase(
    base,
    unit,
    { approximate = false, maximumFractionDigits = 6 } = {},
) {
    const meters =
        unit === "ft"
            ? base * 0.3048
            : unit === "hft"
              ? base * 100 * 0.3048
              : unit === "m"
                ? base
                : undefined;
    if (meters === undefined) return `${base}${unit}`;
    const reading = approximate ? Math.round(meters / 100) * 100 : meters;
    return `${approximate ? "≈ " : ""}${reading.toLocaleString(
        getIntlLocale(),
        {
            useGrouping: false,
            maximumFractionDigits,
        },
    )} m`;
}

/**
 * @param {number} gust
 * @returns {"ok" | "warning" | "danger"}
 */
export function getWarningLevel(gust) {
    /** @type {"ok" | "warning" | "danger"} */
    let className = "ok";

    if (gust >= 8) {
        className = "warning";
    }

    if (gust >= 11) {
        className = "danger";
    }

    return className;
}
