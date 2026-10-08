// @ts-check
import { QUERY_PARAMS } from "#app/app/settings.js";
import { t } from "#app/translations.js";
import { mockAllEntries } from "#app/manual/overrides.js";
import { parseMetarMessages } from "#app/weather/metarMessages.js";
import { hasValidWindData } from "#app/weather/calculations.js";
import {
    fetchRoadObservations,
    fetchRoadStationInfo,
} from "#app/weather/providers/digitraffic.js";
import { fetchFlykMetar } from "#app/weather/providers/flyk.js";
import {
    fetchFmiForecasts,
    fetchFmiObservations,
} from "#app/weather/providers/fmi.js";
import {
    fetchHighWinds,
    getOpenMeteoSurfaceWeather,
} from "#app/weather/providers/openMeteo.js";
import {
    FMI_FORECAST_NAME,
    FORECASTS,
    FORECAST_COORDINATES,
    FORECAST_LOCATION_NAME,
    FORECAST_SOURCE,
    LIVE_OBSERVATIONS,
    LIVE_METARS,
    LOADING,
    OM_DATA,
    OPEN_METEO_CURRENT,
    STALE_FORECASTS,
    STATION_COORDINATES,
    STATION_NAME,
    addError,
    collectWeatherErrors,
} from "#app/weather/state.js";

/** @type {WeakMap<object, string | undefined>} */
let publishedWeather = new WeakMap();

/**
 * Preserve signal identity when a cache check returns unchanged weather.
 * @template T
 * @param {Signal<T>} target
 * @param {T} value
 */
function publish(target, value) {
    const serialized = JSON.stringify(value);
    if (
        publishedWeather.has(target) &&
        publishedWeather.get(target) === serialized
    )
        return;
    publishedWeather.set(target, serialized);
    if (JSON.stringify(target.peek()) !== serialized) target.value = value;
}

/** @param {unknown} error */
function reportProviderError(error) {
    addError(error instanceof Error ? error.message : String(error));
}

/** @param {boolean} cacheOnly @param {AbortSignal} signal @param {boolean} retryErrors */
function requestOptions(cacheOnly, signal, retryErrors) {
    return {
        cacheOnly,
        signal,
        retryErrors,
        /** @param {number} delta */
        onLoading(delta) {
            LOADING.value += delta;
        },
    };
}

/** @param {WeatherData[]} observations */
function useObservations(observations) {
    mockAllEntries(observations);
    publish(LIVE_OBSERVATIONS, observations);
    return observations.some(hasValidWindData);
}

/** @param {boolean} cacheOnly @param {AbortSignal} signal @param {boolean} retryErrors */
async function fetchObservations(cacheOnly, signal, retryErrors) {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - 12, 0, 0, 0);
    const fmisid = QUERY_PARAMS.value.fmisid;
    if (fmisid) {
        const selectedName =
            QUERY_PARAMS.value.name?.trim() ||
            QUERY_PARAMS.value.icaocode?.trim();
        if (selectedName) localStorage.setItem("previous_dz", selectedName);
        try {
            const station = await fetchFmiObservations(fmisid, {
                ...requestOptions(cacheOnly, signal, retryErrors),
                startTime,
            });
            if (signal.aborted) return;
            STATION_NAME.value = station.name;
            STATION_COORDINATES.value = station.coordinates;
            if (useObservations(station.observations)) return;
        } catch (error) {
            if (!cacheOnly && !signal.aborted) reportProviderError(error);
        }
    }

    if (signal.aborted) return;
    const roadsid = QUERY_PARAMS.value.roadsid;
    if (roadsid) {
        const [found] = await Promise.all([
            fetchRoadObservations(
                roadsid,
                startTime,
                (observations) => {
                    if (signal.aborted) return;
                    // Do not replace existing history with the same current reading.
                    if (
                        observations[0]?.time.getTime() !==
                        LIVE_OBSERVATIONS.peek()[0]?.time.getTime()
                    )
                        publish(LIVE_OBSERVATIONS, observations);
                },
                cacheOnly,
                signal,
                retryErrors,
            ).then(({ observations, hasHistory }) => {
                if (signal.aborted) return false;
                if (hasHistory) return useObservations(observations);
                publish(LIVE_OBSERVATIONS, observations);
                return observations.some(hasValidWindData);
            }),
            fetchRoadStationInfo(roadsid, cacheOnly, signal, retryErrors)
                .then((station) => {
                    if (!station || signal.aborted) return;
                    STATION_COORDINATES.value = station.coordinates;
                    STATION_NAME.value = station.name;
                })
                .catch((error) => {
                    if (!cacheOnly && !signal.aborted)
                        reportProviderError(error);
                }),
        ]);
        if (found) return;
    }

    if (signal.aborted) return;
    publish(LIVE_OBSERVATIONS, []);
}

/** @param {boolean} cacheOnly @param {AbortSignal} signal @param {boolean} retryErrors */
async function fetchMetar(cacheOnly, signal, retryErrors) {
    if (QUERY_PARAMS.value.MANUAL_metar?.trim()) return;
    const icaocode = QUERY_PARAMS.value.icaocode?.trim();
    if (!icaocode) {
        publish(LIVE_METARS, undefined);
        return;
    }
    const metar = await fetchFlykMetar(
        icaocode,
        cacheOnly,
        signal,
        retryErrors,
    );
    if (signal.aborted) return;
    publish(LIVE_METARS, metar ? parseMetarMessages([metar]) : undefined);
    if (!metar && !cacheOnly) addError(t("error.noMetar", icaocode));
}

// Expand the current location's forecast only after its detailed cloud table opens.
let detailedForecastSettingsKey = "";

function getForecastRange() {
    return detailedForecastSettingsKey === weatherSettingsKey() ? 48 : 12;
}

/** @param {string} coordinates @param {boolean} cacheOnly @param {AbortSignal} signal @param {boolean} retryErrors */
async function fetchForecasts(coordinates, cacheOnly, signal, retryErrors) {
    let stale = true;
    const result = await fetchFmiForecasts(coordinates, {
        ...requestOptions(cacheOnly, signal, retryErrors),
        onCacheStatus: (value) => {
            stale = value;
        },
        range: getForecastRange(),
    });
    if (!result || signal.aborted) return false;
    FMI_FORECAST_NAME.value = result.forecastName;
    FORECAST_LOCATION_NAME.value = result.locationName;
    if (!result.forecasts.some(hasValidWindData)) return false;
    publish(FORECASTS, result.forecasts);
    FORECAST_SOURCE.value = "FMI";
    publish(STALE_FORECASTS, stale);
    return true;
}

/** @param {OpenMeteoWeatherData} data */
function useOpenMeteoSurfaceWeather(data) {
    const weather = getOpenMeteoSurfaceWeather(data);
    const now = new Date();
    const current = weather.find(
        ({ time }) =>
            time.getTime() <= now.getTime() &&
            now.getTime() < time.getTime() + 60 * 60 * 1000,
    );
    publish(
        OPEN_METEO_CURRENT,
        current ? { ...current, source: "openmeteo" } : undefined,
    );

    const forecastRange = 12;
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(now);
    end.setHours(end.getHours() + forecastRange, 0, 0, 0);

    return weather.filter(({ time }) => time >= start && time <= end);
}

let stationSettingsKey = "";

/** @param {boolean} cacheOnly @param {AbortSignal} signal @param {boolean} retryErrors */
async function refreshWeather(cacheOnly, signal, retryErrors) {
    if (cacheOnly) {
        publish(STALE_FORECASTS, true);
        const stationKey = JSON.stringify([
            QUERY_PARAMS.value.fmisid,
            QUERY_PARAMS.value.roadsid,
        ]);
        // Keep the current station available while refreshing the same location.
        // Clear it when switching stations so forecasts cannot use the old one.
        if (stationKey !== stationSettingsKey) {
            stationSettingsKey = stationKey;
            STATION_COORDINATES.value = null;
            STATION_NAME.value = undefined;
        }
        FMI_FORECAST_NAME.value = undefined;
    }

    await Promise.all([
        fetchMetar(cacheOnly, signal, retryErrors),
        fetchObservations(cacheOnly, signal, retryErrors),
    ]);
    if (signal.aborted) return;

    const coordinates = FORECAST_COORDINATES.value;
    if (!coordinates) {
        publish(OPEN_METEO_CURRENT, undefined);
        publish(FORECASTS, []);
        FORECAST_SOURCE.value = null;
        FORECAST_LOCATION_NAME.value = null;
        if (!cacheOnly) addError(t("error.coordinatesMissing"));
        return;
    }

    let openMeteoStale = true;
    const [hasFmiForecast, openMeteo] = await Promise.all([
        fetchForecasts(coordinates, cacheOnly, signal, retryErrors),
        fetchHighWinds(
            coordinates,
            cacheOnly,
            (stale) => {
                openMeteoStale = stale;
            },
            signal,
            retryErrors,
        ).then((data) => {
            if (signal.aborted) return null;
            publish(OM_DATA, data);
            return data;
        }),
    ]);

    if (signal.aborted) return;
    let hasForecast = hasFmiForecast;
    if (openMeteo) {
        const surfaceForecasts = useOpenMeteoSurfaceWeather(openMeteo);
        if (!hasFmiForecast && surfaceForecasts.some(hasValidWindData)) {
            publish(FORECASTS, surfaceForecasts);
            FORECAST_SOURCE.value = "Open-Meteo";
            FORECAST_LOCATION_NAME.value = coordinates;
            publish(STALE_FORECASTS, openMeteoStale);
            hasForecast = true;
        }
    } else {
        publish(OPEN_METEO_CURRENT, undefined);
    }

    if (!hasForecast) {
        publish(STALE_FORECASTS, true);
        publish(FORECASTS, []);
        FORECAST_SOURCE.value = null;
        FORECAST_LOCATION_NAME.value = null;
        if (!cacheOnly) addError(t("error.noForecasts"));
    }
}

// Keep the subscription and refresh identity in sync: local calculation edits should
// neither refetch weather nor cancel a request that is still relevant.
export function weatherSettingsKey() {
    return JSON.stringify(
        Object.fromEntries(
            Object.entries(QUERY_PARAMS.value).filter(
                ([key]) =>
                    !key.startsWith("map_") &&
                    key !== "MANUAL_upper_winds" &&
                    !key.startsWith("MANUAL_ground_") &&
                    key !== "elevation" &&
                    key !== "default_jump_run_direction" &&
                    key !== "default_jump_group_count",
            ),
        ),
    );
}

/** @type {WeatherRefresh | undefined} */
let activeRefresh;
let hydratedSettingsKey = "";

/** @type {WeatherRefresh | undefined} */
let detailedForecastRefresh;

export function loadDetailedCloudForecast() {
    const key = weatherSettingsKey();
    if (detailedForecastRefresh?.key === key)
        return detailedForecastRefresh.promise;
    detailedForecastRefresh?.controller.abort();
    detailedForecastSettingsKey = key;
    const controller = new AbortController();
    /** @type {WeatherRefresh} */
    const refresh = { key, controller, promise: Promise.resolve() };
    detailedForecastRefresh = refresh;
    refresh.promise = (async () => {
        // Let an initial short forecast finish before publishing the longer one.
        await activeRefresh?.promise;
        if (controller.signal.aborted || weatherSettingsKey() !== key) return;
        const coordinates = FORECAST_COORDINATES.value;
        if (coordinates) {
            await fetchForecasts(coordinates, false, controller.signal, false);
        }
    })()
        .catch(reportProviderError)
        .finally(() => {
            if (detailedForecastRefresh === refresh)
                detailedForecastRefresh = undefined;
        });
    return refresh.promise;
}

/** @param {boolean} [retryErrors] */
export function updateWeatherData(retryErrors = false) {
    const key = weatherSettingsKey();
    if (detailedForecastRefresh && detailedForecastRefresh.key !== key) {
        detailedForecastRefresh.controller.abort();
    }
    if (activeRefresh?.key === key && !retryErrors) {
        return activeRefresh.promise;
    }
    activeRefresh?.controller.abort();
    const controller = new AbortController();
    const { signal } = controller;
    /** @type {WeatherRefresh} */
    const refresh = {
        key,
        controller,
        promise: Promise.resolve(),
    };
    activeRefresh = refresh;
    const finishErrors = collectWeatherErrors();
    refresh.promise = (async () => {
        if (hydratedSettingsKey !== key) {
            publishedWeather = new WeakMap();
            // Hydrate on startup and setting changes, before network requests.
            await refreshWeather(true, signal, retryErrors);
            if (signal.aborted) return;
            hydratedSettingsKey = key;
        }
        await refreshWeather(false, signal, retryErrors);
    })().finally(() => {
        finishErrors();
        if (activeRefresh === refresh) activeRefresh = undefined;
    });
    return refresh.promise;
}
