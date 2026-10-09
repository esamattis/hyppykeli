// @ts-check

/**
 * @param {Object | undefined} ob
 */
export function removeNullish(ob) {
    if (!ob) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(ob).filter(
            ([_, value]) => value !== null && value !== undefined,
        ),
    );
}

/**
 * @param {string|undefined} value
 * @returns {{ value: number | null }}
 */
export function safeParseNumber(value) {
    if (value === undefined) {
        return { value: null };
    }

    if (/^\d*\.?\d+$/.test(value.trim())) {
        return { value: parseInt(value.trim(), 10) };
    }

    return { value: null };
}

/**
 * Zero is falsy in JavaScript, so when checking for undefined or null,
 * we need to check explicitly for them instead of just using `if (!value)`.
 *
 * @param {any} value
 * @returns {value is null | undefined}
 */
export function isNullish(value) {
    return value === null || value === undefined;
}

/**
 * @template T
 * @param {T[]} array
 * @returns {NonNullable<T>[]}
 */
export function filterNullish(array) {
    // @ts-ignore
    return array.filter((item) => !isNullish(item));
}

/**
 * Execute the given callback and return value only if all values are non-nullish (not null or undefined).
 *
 * @template T
 * @template R
 * @param {T[]} values
 * @param {(...values: NonNullable<T>[]) => R} cb
 * @returns {R | null}
 */
export function whenAll(values, cb) {
    const ok = values.every((value) => value !== null && value !== undefined);
    return ok
        ? cb(
              // @ts-ignore
              ...values,
          )
        : null;
}
