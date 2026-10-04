// @ts-check
import { QUERY_PARAMS } from "../app/settings.js";
import { computed } from "@preact/signals";

export const DEV_DEBUG = computed(() => QUERY_PARAMS.value.DEV_debug === "1");
export const DEV_MOCK = computed(() => QUERY_PARAMS.value.DEV_mock === "1");

/**
 * Logs wind calculations when developer debug mode is enabled.
 * @param {...any} args
 */
export function debug(...args) {
    if (DEV_DEBUG.value) console.log(...args);
}

export const DEV_ACTIVE = computed(() =>
    Object.entries(QUERY_PARAMS.value).some(
        ([key, value]) => key.startsWith("DEV_") && !!value?.trim(),
    ),
);

/** @param {DeveloperKey} key */
export function getDevNumber(key) {
    const text = QUERY_PARAMS.value[key]?.trim();
    if (!text) return undefined;
    const value = Number(text);
    const max = key.endsWith("direction") ? 360 : Infinity;
    return Number.isFinite(value) && value >= 0 && value <= max
        ? value
        : undefined;
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
