// @ts-check
import { QUERY_PARAMS } from "#app/app/settings.js";
import { t } from "#app/translations.js";
import { DEV_MOCK, mockAllEntries } from "#app/developer/overrides.js";
import { parseMetarMessages } from "#app/weather/metarMessages.js";
import { getObservationStartTime } from "#app/weather/observationRange.js";
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
    ERRORS,
    FMI_FORECAST_NAME,
    FORECASTS,
    FORECAST_COORDINATES,
    FORECAST_DAY,
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
} from "#app/weather/state.js";

/** @param {unknown} error */
function reportProviderError(error) {
    addError(error instanceof Error ? error.message : String(error));
}

function requestOptions(cacheOnly = false) {
    return {
        cacheOnly,
        mock: DEV_MOCK.value,
        /** @param {number} delta */
        onLoading(delta) {
            LOADING.value += delta;
        },
    };
}

/** @param {WeatherData[]} observations */
function useObservations(observations) {
    mockAllEntries(observations);
    LIVE_OBSERVATIONS.value = observations;
    return observations.some(hasValidWindData);
}

/** @param {boolean} cacheOnly */
async function fetchObservations(cacheOnly) {
    const startTime = getObservationStartTime(
        Number(QUERY_PARAMS.value.observation_range) || 12,
    );
    const fmisid = QUERY_PARAMS.value.fmisid;
    if (fmisid) {
        const selectedName =
            QUERY_PARAMS.value.name?.trim() ||
            QUERY_PARAMS.value.icaocode?.trim();
        if (selectedName) localStorage.setItem("previous_dz", selectedName);
        try {
            const station = await fetchFmiObservations(fmisid, {
                ...requestOptions(cacheOnly),
                startTime,
            });
            STATION_NAME.value = station.name;
            STATION_COORDINATES.value = station.coordinates;
            FORECAST_COORDINATES.value ??= station.coordinates;
            if (useObservations(station.observations)) return;
        } catch (error) {
            if (!cacheOnly) reportProviderError(error);
        }
    }

    const roadsid = QUERY_PARAMS.value.roadsid;
    if (roadsid) {
        const [found] = await Promise.all([
            fetchRoadObservations(
                roadsid,
                startTime,
                (observations) => {
                    LIVE_OBSERVATIONS.value = observations;
                },
                cacheOnly,
            ).then(({ observations, hasHistory }) => {
                if (hasHistory) return useObservations(observations);
                LIVE_OBSERVATIONS.value = observations;
                return observations.some(hasValidWindData);
            }),
            fetchRoadStationInfo(roadsid, cacheOnly)
                .then((station) => {
                    if (!station) return;
                    STATION_COORDINATES.value = station.coordinates;
                    FORECAST_COORDINATES.value ??= station.coordinates;
                    STATION_NAME.value = station.name;
                })
                .catch((error) => {
                    if (!cacheOnly) reportProviderError(error);
                }),
        ]);
        if (found) return;
    }

    LIVE_OBSERVATIONS.value = [];
}

/** @param {boolean} cacheOnly */
async function fetchMetar(cacheOnly) {
    if (QUERY_PARAMS.value.DEV_metar?.trim()) return;
    const icaocode = QUERY_PARAMS.value.icaocode?.trim();
    if (!icaocode) {
        LIVE_METARS.value = undefined;
        return;
    }
    const metar = await fetchFlykMetar(icaocode, cacheOnly);
    LIVE_METARS.value = metar ? parseMetarMessages([metar]) : undefined;
    if (!metar && !cacheOnly) addError(t("error.noMetar", icaocode));
}

/** @param {string} coordinates @param {boolean} cacheOnly */
async function fetchForecasts(coordinates, cacheOnly) {
    let stale = cacheOnly;
    const result = await fetchFmiForecasts(coordinates, {
        ...requestOptions(cacheOnly),
        onCacheStatus: (value) => {
            stale = cacheOnly || value;
        },
        range: Number(QUERY_PARAMS.value.forecast_range) || 12,
        day: FORECAST_DAY.value,
    });
    if (!result) return false;
    FMI_FORECAST_NAME.value = result.forecastName;
    FORECAST_LOCATION_NAME.value = result.locationName;
    if (!result.forecasts.some(hasValidWindData)) return false;
    FORECASTS.value = result.forecasts;
    FORECAST_SOURCE.value = "FMI";
    STALE_FORECASTS.value = stale;
    return true;
}

function explicitForecastCoordinates() {
    const lat = Number(QUERY_PARAMS.value.lat);
    const lon = Number(QUERY_PARAMS.value.lon);
    if (
        !QUERY_PARAMS.value.lat?.trim() ||
        !QUERY_PARAMS.value.lon?.trim() ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        return null;
    }
    return `${lat},${lon}`;
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
    OPEN_METEO_CURRENT.value = current
        ? { ...current, source: "openmeteo" }
        : undefined;

    const forecastRange = Math.max(
        12,
        Number(QUERY_PARAMS.value.forecast_range) || 12,
    );
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(end.getHours() + forecastRange, 0, 0, 0);
    const day = FORECAST_DAY.value;
    if (day > 0) {
        start.setHours(7, 0, 0, 0);
        start.setDate(start.getDate() + day);
        end.setHours(21, 0, 0, 0);
        end.setDate(end.getDate() + day);
    }

    return weather.filter(({ time }) => time >= start && time <= end);
}

/** @param {boolean} cacheOnly */
async function refreshWeather(cacheOnly) {
    STALE_FORECASTS.value = true;
    if (cacheOnly) {
        STATION_COORDINATES.value = null;
        STATION_NAME.value = undefined;
        FMI_FORECAST_NAME.value = undefined;
        FORECAST_COORDINATES.value = explicitForecastCoordinates();
    }

    const metarPromise = fetchMetar(cacheOnly);
    await fetchObservations(cacheOnly);
    await metarPromise;

    const coordinates = FORECAST_COORDINATES.value;
    if (!coordinates) {
        OPEN_METEO_CURRENT.value = undefined;
        FORECASTS.value = [];
        FORECAST_SOURCE.value = null;
        FORECAST_LOCATION_NAME.value = null;
        if (!cacheOnly) addError(t("error.coordinatesMissing"));
        return;
    }

    let openMeteoStale = cacheOnly;
    const [hasFmiForecast, openMeteo] = await Promise.all([
        fetchForecasts(coordinates, cacheOnly),
        fetchHighWinds(coordinates, cacheOnly, (stale) => {
            openMeteoStale = cacheOnly || stale;
        }).then((data) => {
            OM_DATA.value = data;
            return data;
        }),
    ]);

    let hasForecast = hasFmiForecast;
    if (openMeteo) {
        const surfaceForecasts = useOpenMeteoSurfaceWeather(openMeteo);
        if (!hasFmiForecast && surfaceForecasts.some(hasValidWindData)) {
            FORECASTS.value = surfaceForecasts;
            FORECAST_SOURCE.value = "Open-Meteo";
            FORECAST_LOCATION_NAME.value = coordinates;
            STALE_FORECASTS.value = openMeteoStale;
            hasForecast = true;
        }
    } else {
        OPEN_METEO_CURRENT.value = undefined;
    }

    if (!hasForecast) {
        FORECASTS.value = [];
        FORECAST_SOURCE.value = null;
        FORECAST_LOCATION_NAME.value = null;
        if (!cacheOnly) addError(t("error.noForecasts"));
    }
}

/** @type {Promise<void> | undefined} */
let activeRefresh;
let refreshAgain = false;

export function updateWeatherData() {
    if (activeRefresh) {
        refreshAgain = true;
        return activeRefresh;
    }
    activeRefresh = (async () => {
        do {
            refreshAgain = false;
            ERRORS.value = [];
            // Hydrate all providers first so forecasts and observations can render
            // together before any potentially slow network request begins.
            await refreshWeather(true);
            await refreshWeather(false);
        } while (refreshAgain);
    })().finally(() => {
        activeRefresh = undefined;
    });
    return activeRefresh;
}
