// @ts-check

import {
    RESPONSE_CACHE_PREFIX,
    readResponseCache,
    saveResponseCache,
    removeResponseCache,
} from "#app/shared/responseCache.js";

/** @type {Map<string, Promise<CachedFetchResult<unknown>>>} */
const pending = new Map();

/** @param {string} url @param {string} error @param {boolean} cached */
function reportFailure(url, error, cached) {
    document.dispatchEvent(
        new CustomEvent("apicacheerror", {
            detail: {
                provider: new URL(url, location.href).hostname,
                error,
                cached,
            },
        }),
    );
}

/**
 * @overload
 * @param {string} url
 * @param {CachedFetchOptions<string> & { format: "text" }} options
 * @returns {Promise<CachedFetchResult<string> | undefined>}
 */
/**
 * @template T
 * @overload
 * @param {string} url
 * @param {CachedFetchOptions<T>} options
 * @returns {Promise<CachedFetchResult<T> | undefined>}
 */
/**
 * Cache JSON or text responses. cacheOnly hydrates the UI without network requests.
 * A successful refresh replaces the entry; a failure retains it within cache limits.
 * @template T
 * @param {string} url
 * @param {CachedFetchOptions<T>} options
 * @returns {Promise<CachedFetchResult<T> | undefined>}
 */
export async function fetchCached(url, options) {
    options.signal?.throwIfAborted();
    const key =
        RESPONSE_CACHE_PREFIX +
        (options.cache.key ??
            JSON.stringify([url, options.format, options.headers ?? {}]));
    const policy = options.cache;
    let entry = /** @type {CachedResponseEntry<T> | undefined} */ (
        await readResponseCache(key)
    );
    options.signal?.throwIfAborted();
    const now = Date.now();
    try {
        if (
            entry &&
            (typeof entry.hasData !== "boolean" ||
                !Number.isFinite(entry.lastAttemptAt) ||
                (entry.failureCount !== undefined &&
                    (!Number.isSafeInteger(entry.failureCount) ||
                        entry.failureCount < 0)) ||
                (entry.hasData &&
                    (!Number.isFinite(entry.fetchedAt) ||
                        !("data" in entry) ||
                        (options.format === "text" &&
                            typeof entry.data !== "string") ||
                        (options.validate && !options.validate(entry.data)))))
        ) {
            throw new Error("Invalid cache entry");
        }
    } catch (error) {
        console.warn("[API cache] Discarding invalid cached response", {
            key,
            error,
        });
        entry = undefined;
        await removeResponseCache(key);
    }
    const fetchAge = entry?.hasData ? now - entry.fetchedAt : null;
    const measurementAge =
        entry?.measurementAt != null ? now - entry.measurementAt : null;
    const attemptAge = entry ? now - entry.lastAttemptAt : null;
    const fetchExpired =
        fetchAge !== null &&
        (fetchAge < 0 ||
            (policy.maxFetchAgeMs !== undefined &&
                fetchAge >= policy.maxFetchAgeMs));
    const measurementExpired =
        policy.measurementMaxAgeMs !== undefined &&
        (measurementAge === null ||
            measurementAge < 0 ||
            measurementAge >= policy.measurementMaxAgeMs);
    // Older cached failures did not store a count; treat them as one failure.
    const failureCount = entry?.error ? (entry.failureCount ?? 1) : 0;
    const attemptInterval = entry?.error
        ? failureCount <= 5
            ? 5_000
            : failureCount <= 15
              ? 10_000
              : 60_000
        : policy.minFetchIntervalMs;
    const stale = fetchExpired || measurementExpired || Boolean(entry?.error);
    const details = {
        ...policy,
        url,
        key,
        fetchAgeMs: fetchAge,
        measurementAgeMs: measurementAge,
        attemptAgeMs: attemptAge,
        fetchExpired,
        measurementExpired,
        previousError: entry?.error,
        failureCount,
        attemptIntervalMs: attemptInterval,
        retryInMs:
            attemptAge === null ? 0 : Math.max(0, attemptInterval - attemptAge),
        measurementTime: undefined,
    };
    /** @returns {CachedFetchResult<T>} */
    const cachedResult = () => ({
        data: /** @type {CachedResponseEntry<T>} */ (entry).data,
        fromCache: true,
        stale,
        error: entry?.error,
    });

    if (options.cacheOnly) {
        return entry?.hasData ? cachedResult() : undefined;
    }
    if (pending.has(key)) {
        return /** @type {Promise<CachedFetchResult<T>>} */ (pending.get(key));
    }
    if (!options.forceFetch && entry?.hasData && !stale) {
        return cachedResult();
    }
    if (
        attemptAge !== null &&
        attemptAge >= 0 &&
        attemptAge < attemptInterval &&
        !options.forceFetch
    ) {
        if (entry?.error) reportFailure(url, entry.error, entry.hasData);
        if (entry?.hasData) return cachedResult();
        throw new Error(
            entry?.error ?? "Waiting for the minimum fetch interval",
        );
    }
    console.info("[API cache] Fetching", {
        ...details,
        reason: options.forceFetch
            ? "Forced refresh"
            : !entry?.hasData
              ? "No cached response"
              : entry.error
                ? "Retrying a failed refresh"
                : fetchExpired
                  ? "Fetch age exceeded"
                  : "Measurement old or missing",
    });
    const previousEntry = entry ? { ...entry } : undefined;
    const attempt = /** @type {CachedResponseEntry<T>} */ (
        entry ?? {
            hasData: false,
            data: undefined,
            fetchedAt: 0,
            measurementAt: null,
        }
    );
    attempt.lastAttemptAt = now;
    void saveResponseCache(key, attempt);
    /** @type {Promise<CachedFetchResult<T>>} */
    const request = Promise.resolve().then(async () => {
        options.onLoading?.(1);
        try {
            const response = await fetch(url, {
                headers: options.headers,
                cache: "no-store",
                signal: options.signal,
            });
            if (!response.ok)
                throw new Error(
                    `HTTP ${response.status} ${response.statusText}`,
                );
            const data = /** @type {T} */ (
                options.format === "text"
                    ? await response.text()
                    : await response.json()
            );
            options.signal?.throwIfAborted();
            if (options.validate && !options.validate(data))
                throw new Error("Invalid API response");
            const timestamp = policy.measurementTime?.(data);
            const fresh = {
                data,
                hasData: true,
                fetchedAt: Date.now(),
                lastAttemptAt: now,
                measurementAt:
                    timestamp !== undefined && Number.isFinite(timestamp)
                        ? timestamp
                        : null,
            };
            await saveResponseCache(key, fresh);
            options.signal?.throwIfAborted();
            console.info("[API cache] Fetch succeeded: response cached", {
                url,
                key,
                fetchedAt: fresh.fetchedAt,
                measurementAt: fresh.measurementAt,
            });
            const measurementAge =
                fresh.measurementAt === null
                    ? null
                    : fresh.fetchedAt - fresh.measurementAt;
            return {
                data,
                fromCache: false,
                stale:
                    policy.measurementMaxAgeMs !== undefined &&
                    (measurementAge === null ||
                        measurementAge < 0 ||
                        measurementAge >= policy.measurementMaxAgeMs),
            };
        } catch (error) {
            if (options.signal?.aborted) throw error;
            attempt.error =
                error instanceof Error ? error.message : String(error);
            attempt.failureCount = failureCount + 1;
            await saveResponseCache(key, attempt);
            options.signal?.throwIfAborted();
            reportFailure(url, attempt.error, attempt.hasData);
            console.warn("[API cache] Fetch failed", {
                url,
                key,
                error: attempt.error,
                failureCount: attempt.failureCount,
                action: attempt.hasData
                    ? "Returning stale cached data"
                    : "No cached data available",
            });
            if (!attempt.hasData) throw error;
            return {
                data: attempt.data,
                fromCache: true,
                stale: true,
                error: attempt.error,
            };
        } finally {
            options.onLoading?.(-1);
            if (pending.get(key) === request) pending.delete(key);
            options.signal?.removeEventListener("abort", cancel);
        }
    });
    // Cancellation is not a failed API attempt. Restore the previous entry so
    // a replacement refresh can retry immediately, including for the same key.
    function cancel() {
        if (pending.get(key) !== request) return;
        pending.delete(key);
        if (previousEntry) {
            void saveResponseCache(key, previousEntry);
        } else {
            void removeResponseCache(key);
        }
    }
    pending.set(key, request);
    options.signal?.addEventListener("abort", cancel, { once: true });
    return request;
}
