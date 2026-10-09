// @ts-check
import { QUERY_PARAMS, navigateQs } from "#app/app/settings.js";
import { FREEFALL_EXIT } from "#app/map/freefall.js";
import { computed } from "@preact/signals";
import {
    mapQueryKeys,
    readMapQuery,
    writeMapQuery,
} from "#app/map/mapQuery.js";
import { useMemo } from "preact/hooks";

/**
 * Query-backed map state, with the same setter interface as useState.
 * Keep decoded objects stable when unrelated query parameters change.
 * @template {MapStateKey} K
 * @param {K} key
 * @param {MapStateValues[K]} fallback
 * @param {(value: MapStateValues[K]) => boolean} valid
 * @returns {[MapStateValues[K], (value: MapStateValues[K] | ((current: MapStateValues[K]) => MapStateValues[K])) => void]}
 */
export function useMapState(key, fallback, valid) {
    const state = useMemo(() => {
        /** @type {(string | undefined)[] | undefined} */
        let previous;
        let value = fallback;
        return computed(() => {
            const params = QUERY_PARAMS.value;
            const texts = mapQueryKeys(key).map((field) => params[field]);
            if (
                previous &&
                texts.every((text, index) => text === previous?.[index])
            )
                return value;
            previous = texts;
            value = fallback;
            if (texts.some((value) => value !== undefined)) {
                const parsed = readMapQuery(params, key, fallback);
                if (parsed !== undefined && valid(parsed)) value = parsed;
            }
            return value;
        });
    }, [key]);
    return [
        state.value,
        (update) => {
            const value =
                typeof update === "function"
                    ? /** @type {(current: MapStateValues[K]) => MapStateValues[K]} */ (
                          update
                      )(state.peek())
                    : update;
            navigateQs(writeMapQuery(key, value), { replace: true });
        },
    ];
}

/** @param {number} value */
export const isFiniteNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);
/** @param {JumpRunJumper} value */
export const isValidJumper = (value) =>
    !!value &&
    isFiniteNumber(value.speedKmh) &&
    value.speedKmh > 0 &&
    isFiniteNumber(value.openingHeight) &&
    value.openingHeight >= 0;
// Nearest-level winds support altitudes outside the forecast range.
// Keep shared settings independent of the current forecast heights.
/** @param {JumpRunSettings} value */
export const isValidJumpRunSettings = (value) =>
    !!value &&
    isFiniteNumber(value.direction) &&
    value.direction >= 0 &&
    value.direction <= 360 &&
    isFiniteNumber(value.speedKmh) &&
    value.speedKmh > 0 &&
    isFiniteNumber(value.separationSeconds) &&
    value.separationSeconds >= 0 &&
    isFiniteNumber(value.exitHeight) &&
    value.exitHeight > 0;

/** Read the selected jump-run exit height above the dropzone, in metres. */
export function getJumpRunExitHeight() {
    const height = Number(QUERY_PARAMS.value.map_run_exit_height);
    return isFiniteNumber(height) && height > 0 ? height : FREEFALL_EXIT;
}
