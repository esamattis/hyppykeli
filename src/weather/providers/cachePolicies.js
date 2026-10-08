// @ts-check

const MINUTE = 60_000;

// Freshness limits for every API response live here. Either age limit can
// trigger a refresh; failed attempts use the shared automatic retry schedule.
export const CACHE_POLICIES = {
    groundObservations: {
        measurementMaxAgeMs: MINUTE,
        maxFetchAgeMs: MINUTE,
        minFetchIntervalMs: MINUTE,
    },
    metar: {
        maxFetchAgeMs: MINUTE,
        minFetchIntervalMs: MINUTE,
    },
    fmiForecast: {
        maxFetchAgeMs: 10 * MINUTE,
        minFetchIntervalMs: MINUTE,
    },
    openMeteoForecast: {
        maxFetchAgeMs: 30 * MINUTE,
        minFetchIntervalMs: MINUTE,
    },
    stationMetadata: {
        maxFetchAgeMs: 24 * 60 * MINUTE,
        minFetchIntervalMs: MINUTE,
    },
};

/** @param {Date} startTime */
function observationRange(startTime) {
    return Math.floor((Date.now() - startTime.getTime()) / 3_600_000);
}

/**
 * Moving request timestamps are excluded from keys; location, range and day
 * still distinguish responses. Forecast timestamps are prediction validity
 * times, so forecasts expire by fetch age rather than measurement age.
 * @param {string} coordinates
 * @param {number} range
 * @param {number} day
 * @param {Date} startTime
 * @returns {ResponseCachePolicy<string>}
 */
export function fmiForecastCache(coordinates, range, day, startTime) {
    return {
        ...CACHE_POLICIES.fmiForecast,
        key: `fmi:forecast:${coordinates}:${range}:${day}:${startTime.toDateString()}`,
    };
}

/**
 * @param {string} station
 * @param {Date} startTime
 * @returns {ResponseCachePolicy<string>}
 */
export function fmiObservationCache(station, startTime) {
    return {
        ...CACHE_POLICIES.groundObservations,
        key: `fmi:observations:${station}:${observationRange(startTime)}`,
        measurementTime(text) {
            const doc = new DOMParser().parseFromString(
                text,
                "application/xml",
            );
            return Math.max(
                ...Array.from(doc.getElementsByTagNameNS("*", "time"), (node) =>
                    Date.parse(node.textContent ?? ""),
                ),
            );
        },
    };
}

/** @type {ResponseCachePolicy<RoadStationObservations>} */
export const ROAD_OBSERVATION_CACHE = {
    ...CACHE_POLICIES.groundObservations,
    measurementTime: (data) =>
        Math.max(
            ...data.sensorValues.map((value) => Date.parse(value.measuredTime)),
        ),
};

/**
 * @param {string} station
 * @param {Date} startTime
 * @returns {ResponseCachePolicy<RoadStationHistory>}
 */
export function roadHistoryCache(station, startTime) {
    return {
        ...CACHE_POLICIES.groundObservations,
        key: `digitraffic:history:${station}:${observationRange(startTime)}`,
        measurementTime: (data) =>
            Math.max(
                ...data.values.map((value) => Date.parse(value.measuredTime)),
            ),
    };
}

/**
 * @param {number} latitude
 * @param {number} longitude
 * @returns {ResponseCachePolicy<OpenMeteoWeatherData>}
 */
export function openMeteoCache(latitude, longitude) {
    return {
        ...CACHE_POLICIES.openMeteoForecast,
        key: `open-meteo:${latitude},${longitude}`,
    };
}
