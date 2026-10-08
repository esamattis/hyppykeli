// @ts-check
import { fetchCached } from "#app/shared/fetchCached.js";

/**
 * @template T
 * @param {string} url
 * @param {FetchJSONOptions<T>} options
 * @returns {Promise<T | undefined>}
 */
export async function fetchJSON(url, options) {
    try {
        const result = await fetchCached(url, {
            format: "json",
            signal: options.signal,
            headers: options.headers,
            cacheOnly: options.cacheOnly,
            forceFetch: options.forceFetch,
            validate: options.validate,
            cache: options.cache,
        });
        return result?.data;
    } catch {
        return undefined;
    }
}
