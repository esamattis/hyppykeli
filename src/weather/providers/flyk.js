// @ts-check
import { CACHE_POLICIES } from "#app/weather/providers/cachePolicies.js";
import { fetchJSON } from "#app/shared/fetchJSON.js";

/**
 * Fetches METAR data from the Flyk API for a given ICAO code.
 *
 * @param {string} icaocode - The ICAO code of the airport.
 * @param {boolean} [cacheOnly]
 * @param {AbortSignal} [signal]
 * @param {boolean} [retryErrors]
 */
export async function fetchFlykMetar(
    icaocode,
    cacheOnly = false,
    signal,
    retryErrors = false,
) {
    /** @type {FlykMetar | undefined} */
    const data = await fetchJSON("https://flyk.com/api/metars.geojson", {
        cacheOnly,
        signal,
        retryErrors,
        validate: (data) => Array.isArray(data?.features),
        cache: CACHE_POLICIES.metar,
    });
    if (!data) return;
    const re = new RegExp(`^(METAR|SPECI) ${icaocode} `);
    const features = data.features.find((f) => {
        return re.test(f.properties.text);
    });
    return features?.properties.text;
}
