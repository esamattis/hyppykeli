// @ts-check

/** Object properties stored as individual URL parameters. */
const MAP_FIELDS = {
    map_run_start: { lat: "map_run_start_lat", lng: "map_run_start_lon" },
    map_next_jumper: {
        speedKmh: "map_next_jumper_speed",
        openingHeight: "map_next_jumper_opening_height",
    },
    map_run_settings: {
        direction: "map_run_direction",
        speedKmh: "map_run_speed",
        separationSeconds: "map_run_separation",
        exitHeight: "map_run_exit_height",
        wingsuitGlideRatio: "map_wingsuit_glide_ratio",
        wingsuitDescentRateMps: "map_wingsuit_descent_rate",
        canopyGlideRatio: "map_canopy_glide_ratio",
        canopyDescentRateMps: "map_canopy_descent_rate",
    },
};

/** @param {QueryParams} params */
export function isMapRunCleared(params) {
    return (
        params.map_run_start_lat === "null" &&
        params.map_run_start_lon === "null"
    );
}

/** @param {MapStateKey} key @returns {MapQueryKey[]} */
export function mapQueryKeys(key) {
    return key in MAP_FIELDS
        ? /** @type {MapQueryKey[]} */ (
              Object.values(
                  MAP_FIELDS[/** @type {keyof typeof MAP_FIELDS} */ (key)],
              )
          )
        : [/** @type {MapQueryKey} */ (key)];
}

/**
 * Decode plain URL values. Validation and defaults belong to the caller.
 * @template {MapStateKey} K
 * @param {QueryParams} params
 * @param {K} key
 * @param {MapStateValues[K]} [fallback]
 * @returns {MapStateValues[K] | undefined}
 */
export function readMapQuery(params, key, fallback) {
    return /** @type {MapStateValues[K] | undefined} */ (
        decodeMapQuery(params, key, fallback)
    );
}

/** @param {QueryParams} params @param {MapStateKey} key @param {unknown} fallback @returns {unknown} */
function decodeMapQuery(params, key, fallback) {
    if (key in MAP_FIELDS) {
        const fields = MAP_FIELDS[/** @type {keyof typeof MAP_FIELDS} */ (key)];
        if (key === "map_run_start" && isMapRunCleared(params)) return null;
        return Object.fromEntries(
            Object.entries(fields).map(([property, field]) => [
                property,
                params[/** @type {MapQueryKey} */ (field)] === undefined &&
                fallback
                    ? Object.entries(fallback).find(
                          ([key]) => key === property,
                      )?.[1]
                    : readNumber(params[/** @type {MapQueryKey} */ (field)]),
            ]),
        );
    }
    const text = params[/** @type {MapQueryKey} */ (key)];
    if (text === undefined) return undefined;
    if (key === "map_jumpers") {
        if (text === "") return [];
        return text.split("_").map((row) => {
            const cells = /^s([^h]*)h([^h]*)$/.exec(row);
            return {
                speedKmh: readNumber(cells?.[1]),
                openingHeight: readNumber(cells?.[2]),
            };
        });
    }
    if (key === "map_wind") return text;
    if (["map_satellite", "map_full_window", "map_run_automatic"].includes(key))
        return text === "true" ? true : text === "false" ? false : undefined;
    return text === "null" ? null : readNumber(text);
}

/** @param {string | undefined} text */
function readNumber(text) {
    return text?.trim() ? Number(text) : NaN;
}

/**
 * Encode objects as scalar fields and jumper lists as s<speed>h<height> rows.
 * @template {MapStateKey} K
 * @param {K} key
 * @param {MapStateValues[K] | undefined} value
 * @returns {QueryParams}
 */
export function writeMapQuery(key, value) {
    if (key in MAP_FIELDS) {
        const fields = MAP_FIELDS[/** @type {keyof typeof MAP_FIELDS} */ (key)];
        return Object.fromEntries(
            Object.entries(fields).map(([property, field]) => [
                field,
                value === undefined
                    ? undefined
                    : value === null
                      ? "null"
                      : String(
                            Object.entries(value).find(
                                ([key]) => key === property,
                            )?.[1],
                        ),
            ]),
        );
    }
    return {
        [key]:
            value === undefined
                ? undefined
                : key === "map_jumpers"
                  ? /** @type {JumpRunJumper[]} */ (value)
                        .map(
                            (/** @type {JumpRunJumper} */ jumper) =>
                                `s${jumper.speedKmh}h${jumper.openingHeight}`,
                        )
                        .join("_")
                  : String(value),
    };
}
