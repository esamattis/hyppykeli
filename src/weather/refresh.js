// @ts-check
import { QUERY_PARAMS } from "../app/settings.js";
import { t } from "../translations.js";
import { DEV_MOCK, mockAllEntries } from "../developer/overrides.js";
import { parseMetarMessages } from "./metarMessages.js";
import { getObservationStartTime } from "./observationRange.js";
import { hasValidWindData } from "./calculations.js";
import {
    fetchRoadObservations,
    fetchRoadStationInfo,
} from "./providers/digitraffic.js";
import { fetchFlykMetar } from "./providers/flyk.js";
import { fetchFmiForecasts, fetchFmiObservations } from "./providers/fmi.js";
import {
    fetchHighWinds,
    getOpenMeteoSurfaceWeather,
} from "./providers/openMeteo.js";
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
} from "./state.js";

/** @param {unknown} error */
function reportProviderError(error) {
    addError(error instanceof Error ? error.message : String(error));
}

function requestOptions() {
    return {
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

async function fetchObservations() {
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
                ...requestOptions(),
                startTime,
            });
            STATION_NAME.value = station.name;
            STATION_COORDINATES.value = station.coordinates;
            FORECAST_COORDINATES.value ??= station.coordinates;
            if (useObservations(station.observations)) return;
        } catch (error) {
            reportProviderError(error);
        }
    }

    const roadsid = QUERY_PARAMS.value.roadsid;
    if (roadsid) {
        const [found] = await Promise.all([
            fetchRoadObservations(roadsid, startTime, (observations) => {
                LIVE_OBSERVATIONS.value = observations;
            }).then(({ observations, hasHistory }) => {
                if (hasHistory) return useObservations(observations);
                LIVE_OBSERVATIONS.value = observations;
                return observations.some(hasValidWindData);
            }),
            fetchRoadStationInfo(roadsid)
                .then((station) => {
                    STATION_COORDINATES.value = station.coordinates;
                    FORECAST_COORDINATES.value ??= station.coordinates;
                    STATION_NAME.value = station.name;
                })
                .catch(reportProviderError),
        ]);
        if (found) return;
    }

    LIVE_OBSERVATIONS.value = [];
}

async function fetchMetar() {
    if (QUERY_PARAMS.value.DEV_metar?.trim()) return;
    const icaocode = QUERY_PARAMS.value.icaocode?.trim();
    if (!icaocode) {
        LIVE_METARS.value = undefined;
        return;
    }
    const metar = await fetchFlykMetar(icaocode);
    LIVE_METARS.value = metar ? parseMetarMessages([metar]) : undefined;
    if (!metar) addError(t("error.noMetar", icaocode));
}

/** @param {string} coordinates */
async function fetchForecasts(coordinates) {
    const result = await fetchFmiForecasts(coordinates, {
        ...requestOptions(),
        range: Number(QUERY_PARAMS.value.forecast_range) || 12,
        day: FORECAST_DAY.value,
    });
    if (!result) return false;
    FMI_FORECAST_NAME.value = result.forecastName;
    FORECAST_LOCATION_NAME.value = result.locationName;
    if (!result.forecasts.some(hasValidWindData)) return false;
    FORECASTS.value = result.forecasts;
    FORECAST_SOURCE.value = "FMI";
    STALE_FORECASTS.value = false;
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

export async function updateWeatherData() {
    ERRORS.value = [];
    STALE_FORECASTS.value = true;
    STATION_COORDINATES.value = null;
    STATION_NAME.value = undefined;
    FMI_FORECAST_NAME.value = undefined;
    FORECAST_COORDINATES.value = explicitForecastCoordinates();

    const metarPromise = fetchMetar();
    await fetchObservations();
    await metarPromise;

    const coordinates = FORECAST_COORDINATES.value;
    if (!coordinates) {
        OPEN_METEO_CURRENT.value = undefined;
        FORECASTS.value = [];
        FORECAST_SOURCE.value = null;
        FORECAST_LOCATION_NAME.value = null;
        addError(t("error.coordinatesMissing"));
        return;
    }

    const [hasFmiForecast, openMeteo] = await Promise.all([
        fetchForecasts(coordinates),
        fetchHighWinds(coordinates).then((data) => {
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
            STALE_FORECASTS.value = false;
            hasForecast = true;
        }
    } else {
        OPEN_METEO_CURRENT.value = undefined;
    }

    if (!hasForecast) {
        FORECASTS.value = [];
        FORECAST_SOURCE.value = null;
        FORECAST_LOCATION_NAME.value = null;
        addError(t("error.noForecasts"));
    }
}
