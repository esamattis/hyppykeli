// @ts-check
import { QUERY_PARAMS } from "#app/app/settings.js";
import { parseGroundObservations } from "#app/manual/overrides.js";
import { isNullish } from "#app/shared/values.js";
import { parseCoordinates } from "#app/shared/coordinates.js";
import { t } from "#app/translations.js";
import {
    hasValidAverageWindData,
    hasValidWindData,
    knotsToMs,
} from "#app/weather/calculations.js";
import { parseMetarMessages } from "#app/weather/metarMessages.js";
import { computed, signal } from "@preact/signals";

/**
 * @type {Signal<number>}
 */
export const LOADING = signal(0);

/**
 * @type {Signal<boolean>}
 */
export const STALE_FORECASTS = signal(true);

/**
 * @type {Signal<string | undefined>}
 */
export const STATION_NAME = signal(undefined);

/**
 * @type {Signal<WeatherData[]>}
 */
export const LIVE_OBSERVATIONS = signal([]);

/**
 * Current modelled surface weather used only when station observations are
 * unavailable. It must not be included in OBSERVATIONS or the observations
 * chart would present a forecast as a measurement.
 * @type {Signal<WeatherData|undefined>}
 */
export const OPEN_METEO_CURRENT = signal(undefined);

export const OBSERVATIONS = computed(() => {
    const live = LIVE_OBSERVATIONS.value;
    const overrides = parseGroundObservations(
        QUERY_PARAMS.value.MANUAL_ground_obs,
    );
    if (!overrides) return live;
    const now = Date.now();
    const cutoff = now - 60 * 60 * 1000;
    const recent = live.filter(
        (observation) => observation.time.getTime() >= cutoff,
    );
    const edited = overrides.map(({ age, gust, speed, direction }, index) => ({
        ...recent[index],
        source: /** @type {const} */ ("mock"),
        time: new Date(now - age * 60 * 1000),
        gust: gust ?? recent[index]?.gust,
        speed: speed ?? recent[index]?.speed,
        direction: direction ?? recent[index]?.direction,
    }));
    return [
        ...edited,
        ...live.filter((observation) => observation.time.getTime() < cutoff),
    ];
});

export const HAS_WIND_OBSERVATIONS = computed(() => {
    let count = 0;

    for (const obs of OBSERVATIONS.value) {
        if (hasValidWindData(obs)) {
            count++;
        }

        // At least two observations with wind data
        if (count > 1) {
            return true;
        }
    }

    return false;
});

/**
 * @type {Signal<WeatherData|undefined>}
 */
export const HOVERED_OBSERVATION = signal(undefined);

/**
 * @type {ReadonlySignal<WeatherData|undefined>}
 */
export const LATEST_OBSERVATION = computed(() => {
    const obs = OBSERVATIONS.value[0];

    if (obs && (obs.source === "mock" || hasValidWindData(obs))) {
        return OBSERVATIONS.value[0];
    }

    const metar = METARS.value?.[0];
    if (metar) {
        /** @type {WeatherData} */
        const metarWeather = {
            source: "metar",
            time: metar.time,
            gust: isNullish(metar.wind.gust)
                ? undefined
                : knotsToMs(metar.wind.gust),
            speed: isNullish(metar.wind.speed)
                ? undefined
                : knotsToMs(metar.wind.speed),
            direction:
                typeof metar.wind.direction === "number"
                    ? metar.wind.direction
                    : undefined,
            temperature: metar.temperature,
            dewPoint: metar.dewpoint,
        };
        if (hasValidAverageWindData(metarWeather)) return metarWeather;
    }

    const model = OPEN_METEO_CURRENT.value;
    return hasValidWindData(model) ? model : undefined;
});

/**
 * @type {Signal<WeatherData[]>}
 */
export const FORECASTS = signal([]);

/** @type {Signal<"FMI" | "Open-Meteo" | null>} */
export const FORECAST_SOURCE = signal(null);

/** @param {WeatherData["source"] | undefined} source */
export function weatherSourceLabel(source) {
    switch (source) {
        case "fmi":
            return "FMI";
        case "roads":
            return "Fintraffic";
        case "metar":
            return "METAR";
        case "openmeteo":
            return t("source.openMeteoModeled");
        case "mock":
            return t("source.manualMode");
        case "forecast":
            return FORECAST_SOURCE.value;
        default:
            return null;
    }
}

export const OBSERVATION_SOURCE = computed(() =>
    weatherSourceLabel(OBSERVATIONS.value[0]?.source),
);

export const WIND_SOURCE = computed(() =>
    weatherSourceLabel(LATEST_OBSERVATION.value?.source),
);

/**
 * @type {Signal<WeatherData[]>}
 */
export const HOURLY_CLOUD_FORECASTS = computed(() => {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    return FORECASTS.value
        .filter(
            (forecast) =>
                forecast.time.getTime() >= currentHour.getTime() &&
                forecast.time.getMinutes() === 0,
        )
        .slice(0, 48);
});

/**
 * @type {Signal<MetarData[] | undefined>}
 */
export const LIVE_METARS = signal(undefined);

export const METARS = computed(() => {
    const text = QUERY_PARAMS.value.MANUAL_metar?.trim();
    if (!text) return LIVE_METARS.value;
    try {
        return parseMetarMessages([text]);
    } catch {
        return LIVE_METARS.value;
    }
});

/**
 * @type {Signal<string|null>}
 */
export const STATION_COORDINATES = signal(null);

/**
 * Shared target for forecasts, map centring, and automatic jump-run placement.
 * Prefer a valid query coordinate pair, then the FMI or Fintraffic station.
 * @type {ReadonlySignal<GeographicPosition | null>}
 */
export const LANDING_COORDINATES = computed(() => {
    const { lat, lon } = QUERY_PARAMS.value;
    const explicit = parseCoordinates(lat, lon);
    if (explicit) return explicit;
    const station = STATION_COORDINATES.value?.split(",");
    return station?.length === 2
        ? parseCoordinates(station[0], station[1])
        : null;
});

/** @type {ReadonlySignal<string | null>} */
export const FORECAST_COORDINATES = computed(() => {
    const coordinates = LANDING_COORDINATES.value;
    return coordinates ? `${coordinates.lat},${coordinates.lng}` : null;
});

/**
 * @type {Signal<string|null>}
 */
export const FORECAST_LOCATION_NAME = signal(null);

/** @type {Signal<string|undefined>} */
export const FMI_FORECAST_NAME = signal(undefined);

/** @param {string|null|undefined} value */
function nonEmpty(value) {
    return value?.trim() || undefined;
}

/** @param {string|null} coordinates */
function formatCoordinates(coordinates) {
    if (!coordinates) return undefined;
    const [latitudeText, longitudeText] = coordinates.split(",");
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return undefined;
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Display name precedence: explicit name, ICAO code, FMI forecast location,
 * observation station, forecast coordinates, and finally the app name.
 */
export const NAME = computed(
    () =>
        nonEmpty(QUERY_PARAMS.value.name) ??
        nonEmpty(QUERY_PARAMS.value.icaocode) ??
        nonEmpty(FMI_FORECAST_NAME.value) ??
        nonEmpty(STATION_NAME.value)?.replace(
            / \((?:FMI|Digitraffic)\)$/,
            "",
        ) ??
        formatCoordinates(FORECAST_COORDINATES.value) ??
        "Hyppykeli",
);

/**
 * @type {Signal<string[]>}
 */
export const ERRORS = signal([]);

/** @type {string[] | undefined} */
let pendingErrors;

// Publish the completed error report once, so cache checks do not clear and
// restore the same errors (and interrupt map interactions) every polling tick.
export function collectWeatherErrors() {
    const errors = /** @type {string[]} */ ([]);
    pendingErrors = errors;
    return () => {
        if (pendingErrors !== errors) return;
        pendingErrors = undefined;
        const previous = ERRORS.peek();
        if (
            previous.length !== errors.length ||
            errors.some((error) => !previous.includes(error))
        ) {
            ERRORS.value = errors;
        }
    };
}

/** @param {string} msg */
export function addError(msg) {
    if (pendingErrors) {
        if (!pendingErrors.includes(msg)) pendingErrors.push(msg);
    } else if (!ERRORS.value.includes(msg)) {
        ERRORS.value = [...ERRORS.value, msg];
    }
}

/**
 * @type {import("@preact/signals").Signal<OpenMeteoWeatherData | null>}
 */
export const OM_DATA = signal(null);
