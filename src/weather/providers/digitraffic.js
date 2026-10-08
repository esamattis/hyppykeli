// @ts-check
import {
    CACHE_POLICIES,
    ROAD_OBSERVATION_CACHE,
    roadHistoryCache,
} from "#app/weather/providers/cachePolicies.js";
import { fetchJSON } from "#app/shared/fetchJSON.js";

/**
 * @param {string} roadsid
 * @param {boolean} [cacheOnly]
 * @param {AbortSignal} [signal]
 * @param {boolean} [retryErrors]
 */
export async function fetchRoadStationInfo(
    roadsid,
    cacheOnly = false,
    signal,
    retryErrors = false,
) {
    /** @type {RoadStationInfoDetailed | undefined} */
    const data = await fetchJSON(
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}`,
        {
            headers: { "Digitraffic-User": "hyppykeli.fi" },
            cacheOnly,
            signal,
            retryErrors,
            validate: (data) =>
                Array.isArray(data?.geometry?.coordinates) &&
                typeof data?.properties?.names?.fi === "string",
            cache: CACHE_POLICIES.stationMetadata,
        },
    );
    if (!data) return;

    return {
        coordinates: `${data.geometry.coordinates[1]},${data.geometry.coordinates[0]}`,
        name: data.properties.names.fi + " (Digitraffic)",
    };
}

/**
 * @param {string} roadsid
 * @param {Date} obsStartTime
 * @param {(observations: WeatherData[]) => void} onCurrent
 * @param {boolean} [cacheOnly]
 * @param {AbortSignal} [signal]
 * @param {boolean} [retryErrors]
 */
export async function fetchRoadObservations(
    roadsid,
    obsStartTime,
    onCurrent,
    cacheOnly = false,
    signal,
    retryErrors = false,
) {
    // load in background as not so important
    /** @type {Promise<RoadStationHistory|undefined>} */
    const historyPromise = fetchJSON(
        // `https://tie.digitraffic.fi/api/beta/weather-history-data/${roadsid}?` +
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}/data/history?` +
            new URLSearchParams({
                from: obsStartTime.toISOString(),
                to: new Date().toISOString(),
            }),
        {
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
            cacheOnly,
            signal,
            retryErrors,
            validate: (data) => Array.isArray(data?.values),
            cache: roadHistoryCache(roadsid, obsStartTime),
        },
    );

    /** @type {RoadStationObservations|undefined} */
    const data = await fetchJSON(
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}/data`,
        {
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
            cacheOnly,
            signal,
            retryErrors,
            validate: (data) =>
                Array.isArray(data?.sensorValues) &&
                typeof data?.dataUpdatedTime === "string",
            cache: ROAD_OBSERVATION_CACHE,
        },
    );

    if (!data) {
        return { observations: [], hasHistory: false };
    }

    const gust = data.sensorValues.find((v) => v.name === "MAKSIMITUULI");
    const wind = data.sensorValues.find((v) => v.name === "KESKITUULI");
    const windDirection = data.sensorValues.find(
        (v) => v.name === "TUULENSUUNTA",
    );
    const temperature = data.sensorValues.find((v) => v.name === "ILMA");
    const dewPoint = data.sensorValues.find((v) => v.name === "KASTEPISTE");

    /** @type {WeatherData} */
    const obs = {
        source: "roads",
        speed: wind?.value,
        gust: gust?.value,
        direction: windDirection?.value,
        temperature: temperature?.value,
        dewPoint: dewPoint?.value,
        time: new Date(data.dataUpdatedTime),
    };

    onCurrent([obs]);

    const history = await historyPromise;
    if (!history) {
        return { observations: [obs], hasHistory: false };
    }

    if (!gust) {
        return { observations: [obs], hasHistory: false };
    }

    const gusts = history.values.filter((v) => v.id === gust.id);

    /** @type {WeatherData[]} */
    const combined = gusts.flatMap((roadObservation) => {
        // just pick gusts to get an single array of observations
        if (roadObservation.id !== gust.id) {
            return [];
        }

        const otherObservations = history.values.filter(
            (h) => h.measuredTime === roadObservation.measuredTime,
        );

        // find matching history for other values than the gust
        const windHistory = otherObservations.find(
            (ob) => ob.id === wind?.id,
        )?.value;

        const directionHistory = otherObservations.find(
            (ob) => ob.id === windDirection?.id,
        )?.value;

        const temperatureHistory = otherObservations.find(
            (ob) => ob.id === temperature?.id,
        )?.value;

        const dewPointHistory = otherObservations.find(
            (ob) => ob.id === dewPoint?.id,
        )?.value;

        return {
            source: "roads",
            time: new Date(roadObservation.measuredTime),
            gust: roadObservation.value,
            speed: windHistory,
            direction: directionHistory,
            temperature: temperatureHistory,
            dewPoint: dewPointHistory,
        };
    });

    combined.reverse();

    const full = [obs, ...combined];

    return { observations: full, hasHistory: true };
}
