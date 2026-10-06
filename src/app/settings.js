// @ts-check
import { removeNullish } from "#app/shared/values.js";
import { computed, signal } from "@preact/signals";

/** @type {Signal<QueryParams[]>} */
export const SAVED_DZs = signal(
    (() => {
        try {
            return JSON.parse(window.localStorage.getItem("saved_dzs") ?? "[]");
        } catch {
            return [];
        }
    })(),
);

/**
 * @param {string|null|undefined} name
 */
export function saveCurrentDz(name) {
    name = name ?? undefined;
    let qp = QUERY_PARAMS.value;
    const index = SAVED_DZs.value.findIndex((dz) => dz.name == name);

    qp = { ...qp, name, save: undefined };

    if (index === -1) {
        SAVED_DZs.value = [...SAVED_DZs.value, qp];
    } else {
        SAVED_DZs.value = SAVED_DZs.value.with(index, qp);
    }

    window.localStorage.setItem("saved_dzs", JSON.stringify(SAVED_DZs));
}

/**
 * @param {string} name
 */
export function removeSavedDz(name) {
    const filtered = SAVED_DZs.value.filter((dz) => dz.name !== name);
    window.localStorage.setItem("saved_dzs", JSON.stringify(filtered));
    SAVED_DZs.value = filtered;
}

/**
 * Current URLSearchParams (query string) in the location bar
 *
 * @type {Signal<QueryParams>}
 */
export const QUERY_PARAMS = signal(
    Object.fromEntries(new URLSearchParams(location.search)),
);

/**
 * Update the query string in the url bar and update the global QUERY_PARAMS signal.
 *
 * @param {QueryParams} params
 * @param {Object} [options]
 * @param {"merge" | "replace"} [options.mode] defaults to "merge"
 * @param {boolean} [options.replace]
 */
export function navigateQs(params, options) {
    if (!options?.mode || options?.mode === "merge") {
        QUERY_PARAMS.value = {
            ...QUERY_PARAMS.value,
            ...params,
        };
    } else {
        QUERY_PARAMS.value = params;
    }

    const qs = new URLSearchParams(removeNullish(QUERY_PARAMS.value));

    if (options?.replace) {
        history.replaceState(null, "", `?${qs}`);
    } else {
        history.pushState(null, "", `?${qs}`);
    }
}

/**
 * Get query string for for <a href> rendering
 *
 * @param {QueryParams} [params]
 * @param {"merge" | "replace"} [mode]
 */
export function getQs(params, mode) {
    let query;

    if (!mode || mode === "merge") {
        query = {
            ...QUERY_PARAMS.value,
            ...params,
        };
    } else {
        query = params;
    }

    return "?" + new URLSearchParams(removeNullish(query)).toString();
}

/** Dropzone elevation above sea level, in metres. FMI WFS supplies no elevation. */
export const DROPZONE_ELEVATION = computed(() => {
    const value = Number(QUERY_PARAMS.value.elevation);
    return Number.isFinite(value) && value >= 0 && value <= 4200 ? value : 0;
});
