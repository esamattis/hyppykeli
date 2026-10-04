// @ts-check
import { computed } from "@preact/signals";
import { useMemo } from "preact/hooks";
import { QUERY_PARAMS, navigateQs } from "./data.js";

/**
 * Query-backed map state, with the same setter interface as useState.
 * Keep decoded objects stable when unrelated query parameters change.
 * @template T
 * @param {MapQueryKey} key
 * @param {T} fallback
 * @param {(value: T) => boolean} valid
 * @returns {[T, (value: T | ((current: T) => T)) => void]}
 */
export function useMapState(key, fallback, valid) {
    const state = useMemo(() => {
        /** @type {string | undefined} */
        let previous;
        let value = fallback;
        return computed(() => {
            const text = QUERY_PARAMS.value[key];
            if (text === previous) return value;
            previous = text;
            value = fallback;
            if (text) {
                try {
                    const parsed = JSON.parse(text);
                    if (valid(parsed)) value = parsed;
                } catch {}
            }
            return value;
        });
    }, [key]);
    return [
        state.value,
        (update) => {
            const value =
                typeof update === "function"
                    ? /** @type {(current: T) => T} */ (update)(state.peek())
                    : update;
            navigateQs({ [key]: JSON.stringify(value) }, { replace: true });
        },
    ];
}

/** @param {number} value */
export const isFiniteNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);
/** @param {{ lat: number, lng: number } | null} value */
export const isValidPosition = (value) =>
    !!value &&
    isFiniteNumber(value.lat) &&
    isFiniteNumber(value.lng) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180;
/** @param {JumpRunJumper} value */
export const isValidJumper = (value) =>
    !!value &&
    isFiniteNumber(value.speedKmh) &&
    value.speedKmh > 0 &&
    isFiniteNumber(value.openingHeight) &&
    value.openingHeight >= 0 &&
    value.openingHeight < 4200;
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
    value.exitHeight > 0 &&
    value.exitHeight <= 4200;
