// @ts-check

/**
 * @param {Date} date
 */
export function formatClock(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * @param {Date} date
 */
export function formatDate(date) {
    return date.toLocaleDateString("fi-FI");
}

/**
 * @param {number} offset
 */
export function dateOffset(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date;
}

/**
 * @param {Date} date
 */
export function humanDayText(date) {
    const day = date.getDate();
    const today = new Date().getDate();

    if (day === today) {
        return "tänään";
    }

    if (day === today + 1) {
        return "huomenna";
    }

    if (day === today + 2) {
        return "ylihuomenna";
    }

    return "";
}

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
 * @param {Object | undefined} ob
 */
export function removeNullish(ob) {
    if (!ob) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(ob).filter(
            ([_, value]) => value !== null && value !== undefined,
        ),
    );
}

/**
 * @param {string|undefined} value
 * @returns {{ value: number | null }}
 */
export function safeParseNumber(value) {
    if (value === undefined) {
        return { value: null };
    }

    if (/^\d*\.?\d+$/.test(value.trim())) {
        return { value: parseInt(value.trim(), 10) };
    }

    return { value: null };
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
 * Minimum and maximum observed during the last hour.
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
            value < 0
        ) {
            return [];
        }
        return [value];
    });

    if (!values.length) return;

    return {
        min: Math.round(Math.min(...values)),
        max: Math.round(Math.max(...values)),
    };
}

/**
 * Zero is falsy in JavaScript, so when checking for undefined or null,
 * we need to check explicitly for them instead of just using `if (!value)`.
 *
 * @param {any} value
 * @returns {value is null | undefined}
 */
export function isNullish(value) {
    return value === null || value === undefined;
}

/**
 * @template T
 * @param {T[]} array
 * @returns {NonNullable<T>[]}
 */
export function filterNullish(array) {
    // @ts-ignore
    return array.filter((item) => !isNullish(item));
}

/**
 * Execute the given callback and return value only if all values are non-nullish (not null or undefined).
 *
 * @template T
 * @template R
 * @param {T[]} values
 * @param {(...values: NonNullable<T>[]) => R} cb
 * @returns {R | null}
 */
export function whenAll(values, cb) {
    const ok = values.every((value) => value !== null && value !== undefined);
    return ok
        ? cb(
              // @ts-ignore
              ...values,
          )
        : null;
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
 * @param {{ approximate?: boolean }} [options]
 * @returns {string}
 */
export function formatCloudBase(base, unit, { approximate = false } = {}) {
    const meters =
        unit === "ft"
            ? base * 0.3048
            : unit === "hft"
              ? base * 100 * 0.3048
              : unit === "m"
                ? base
                : undefined;
    if (meters === undefined) return `${base}${unit}`;
    const reading = approximate ? Math.round(meters / 50) * 50 : meters;
    return `${approximate ? "≈ " : ""}${reading.toLocaleString("fi-FI", {
        useGrouping: false,
        maximumFractionDigits: 6,
    })} m`;
}

/**
 * @param {string} url
 * @param {Object} [options]
 * @param {Record<string, string>} [options.headers]
 */
export async function fetchJSON(url, options) {
    const { hostname, pathname, search } = new URL(url);

    const res = await fetch(url, {
        headers: options?.headers,
    }).catch((error) => {
        return new Response(null, {
            status: 555,
            statusText: "Request failed",
        });
    });

    if (!res.ok) {
        const errorEvent = new CustomEvent("fetchjsonerror", {
            detail: {
                message: `Virhe ${hostname} API:ssa: ${res.status}, parametrit: ${pathname}${search}`,
            },
        });
        document.dispatchEvent(errorEvent);
        return;
    }

    return await res.json();
}

/**
 * @param {number} degrees
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * @param {[number,number]|string} coord1
 * @param {[number,number]|string} coord2
 */
export function coordinateDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters

    if (typeof coord1 === "string") {
        coord1 = /** @type {[number, number]} */ (
            coord1.split(",").map(Number)
        );
    }

    if (typeof coord2 === "string") {
        coord2 = /** @type {[number, number]} */ (
            coord2.split(",").map(Number)
        );
    }

    const lat1 = toRadians(coord1[0]);
    const lon1 = toRadians(coord1[1]);
    const lat2 = toRadians(coord2[0]);
    const lon2 = toRadians(coord2[1]);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}
