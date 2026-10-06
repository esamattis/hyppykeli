// @ts-check
import { QUERY_PARAMS } from "#app/app/settings.js";
import { computed } from "@preact/signals";

export const DEV_ACTIVE = computed(() =>
    [
        QUERY_PARAMS.value.DEV_ground_obs,
        QUERY_PARAMS.value.DEV_ground_gust,
        QUERY_PARAMS.value.DEV_ground_avg,
        QUERY_PARAMS.value.DEV_ground_direction,
        QUERY_PARAMS.value.DEV_metar,
        QUERY_PARAMS.value.DEV_upper_winds,
    ].some((value) => !!value?.trim()),
);

/**
 * Decode five altitude rows, highest first: speed, direction.
 * Empty cells represent missing wind data; invalid overrides use live data.
 * @param {string | undefined} text
 * @returns {DeveloperUpperWindInput[] | undefined}
 */
export function parseUpperWinds(text) {
    if (!text?.trim()) return undefined;
    const rows = text.split(";").map((row) => row.split(","));
    if (rows.length !== 5) return undefined;
    const winds = [];
    for (const row of rows) {
        if (row.length !== 2) return undefined;
        const [speed = "", direction = ""] = row.map((value) => value.trim());
        if (
            [speed, direction].some(
                (value) => value && !Number.isFinite(Number(value)),
            ) ||
            (speed && Number(speed) < 0) ||
            (direction && (Number(direction) < 0 || Number(direction) > 360))
        )
            return undefined;
        winds.push({ speed, direction });
    }
    return winds;
}

/**
 * Decode newest-first rows: gust, average speed, direction, age in minutes.
 * Empty wind values represent missing data. Invalid overrides use live data.
 * @param {string | undefined} text
 * @returns {DeveloperObservation[] | undefined}
 */
export function parseGroundObservations(text) {
    if (!text?.trim()) return undefined;
    const rows = text.split(";").map((row) => row.split(","));
    /** @type {DeveloperObservation[]} */
    const observations = [];
    for (const row of rows) {
        if (row.length !== 4 || !row[3]?.trim()) return undefined;
        const numbers = row.map((value) =>
            value.trim() ? Number(value) : undefined,
        );
        const [gust, speed, direction, age] = numbers;
        if (
            numbers.some(
                (value) => value !== undefined && !Number.isFinite(value),
            ) ||
            (gust !== undefined && gust < 0) ||
            (speed !== undefined && speed < 0) ||
            (direction !== undefined && (direction < -1 || direction > 360)) ||
            age === undefined ||
            age < 0 ||
            age > 60
        )
            return undefined;
        observations.push({ gust, speed, direction, age });
    }
    return observations.sort((a, b) => a.age - b.age);
}

/**
 * @param {WeatherData[]} target
 */
export function mockAllEntries(target) {
    mockEntries({
        target: target,
        targetKey: "direction",
        queryKey: "__directions",
    });

    mockEntries({
        target: target,
        targetKey: "gust",
        queryKey: "__gusts",
    });

    mockEntries({
        target: target,
        targetKey: "speed",
        queryKey: "__speeds",
    });
}

/**
 * @template {keyof WeatherData} TKeys
 * @template {keyof QueryParams} QKeys
 *
 * @param {Object} params
 * @param {QKeys} params.queryKey
 * @param {TKeys} params.targetKey
 * @param {WeatherData[]} params.target
 */
function mockEntries(params) {
    // do not allow mocking on the production site
    if (location.hostname === "hyppykeli.fi") {
        return;
    }

    const mock =
        QUERY_PARAMS.value[params.queryKey]
            ?.split(",")
            .map((num) => Number(num))
            .reverse() ?? [];

    let index = 0;
    for (const value of mock) {
        const entry = params.target[index];
        if (entry) {
            // @ts-ignore
            entry[params.targetKey] = value;
        }
        index++;
    }
}
