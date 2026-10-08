// @ts-check
import { openMeteoCache } from "#app/weather/providers/cachePolicies.js";
import { fetchCached } from "#app/shared/fetchCached.js";
import { WIND_LEVELS } from "#app/weather/windLevels.js";
import { isNullish } from "#app/shared/values.js";

/**
 * @type {Array<{ pressure: string, key: `windspeed_${OpenMeteoPressureLevel}hPa`, directionKey: `winddirection_${OpenMeteoPressureLevel}hPa` }>}
 */
export const PRESSURE_LEVELS_RAW = WIND_LEVELS.map(({ level }) => ({
    pressure: `${level} hPa`,
    key: `windspeed_${level}hPa`,
    directionKey: `winddirection_${level}hPa`,
}));

/** @type {OpenMeteoCloudPressureLevel[]} */
const CLOUD_PRESSURE_LEVELS = ["1000", "925", "850", "700", "600"];
const CLOUD_FIELDS = CLOUD_PRESSURE_LEVELS.map(
    (level) => `cloud_cover_${level}hPa`,
);
const HEIGHT_FIELDS = WIND_LEVELS.map(
    ({ level }) => `geopotential_height_${level}hPa`,
);

const SURFACE_FIELDS = [
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "temperature_2m",
    "dew_point_2m",
    "precipitation_probability",
    "cloud_cover_low",
    "cloud_cover_mid",
];

// The API, cached forecasts, map calculations and tables all use m/s.
const WIND_SPEED_FIELDS = [
    ...PRESSURE_LEVELS_RAW.map(({ key }) => key),
    "wind_speed_10m",
    "wind_gusts_10m",
];

/**
 * Open-Meteo returns offset-free timestamps in the response's timezone.
 * @param {string} time
 * @param {number} offset
 */
export function forecastTime(time, offset) {
    return new Date(new Date(`${time}Z`).getTime() - offset * 1000);
}

/**
 * Validate the forecast fields used by the map and upper-wind tables.
 * @param {unknown} data
 * @returns {data is OpenMeteoWeatherData}
 */
function isWindForecast(data) {
    if (
        !data ||
        typeof data !== "object" ||
        ("error" in data && data.error) ||
        !("utc_offset_seconds" in data) ||
        typeof data.utc_offset_seconds !== "number" ||
        !Number.isFinite(data.utc_offset_seconds) ||
        !("hourly_units" in data) ||
        !data.hourly_units ||
        typeof data.hourly_units !== "object" ||
        !("hourly" in data) ||
        !data.hourly ||
        typeof data.hourly !== "object"
    ) {
        return false;
    }
    const units = /** @type {Record<string, unknown>} */ (data.hourly_units);
    // Reject old or unexpected units instead of silently changing wind strength.
    if (!WIND_SPEED_FIELDS.every((field) => units[field] === "m/s"))
        return false;
    const hourly = /** @type {Record<string, unknown>} */ (data.hourly);
    const times = hourly.time;
    if (
        !Array.isArray(times) ||
        !times.every(
            (time) =>
                typeof time === "string" && Number.isFinite(Date.parse(time)),
        )
    ) {
        return false;
    }
    return [
        ...PRESSURE_LEVELS_RAW.flatMap(({ key, directionKey }) => [
            key,
            directionKey,
        ]),
        ...SURFACE_FIELDS,
        ...CLOUD_FIELDS,
        ...HEIGHT_FIELDS,
    ].every((field) => {
        const values = hourly[field];
        return (
            Array.isArray(values) &&
            values.length === times.length &&
            values.every(
                (value) =>
                    value === null ||
                    (typeof value === "number" && Number.isFinite(value)),
            )
        );
    });
}

/**
 * @param {string} coordinates
 * @param {boolean} cacheOnly
 * @param {((stale: boolean) => void) | undefined} onCacheStatus
 * @param {AbortSignal | undefined} signal
 * @param {boolean} forceFetch
 * @returns {Promise<OpenMeteoWeatherData | null>}
 */
async function fetchDataWithCoordinates(
    coordinates,
    cacheOnly,
    onCacheStatus,
    signal,
    forceFetch = false,
) {
    const [latitudeText = "", longitudeText = ""] = coordinates.split(",");
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    const hourly = [
        ...PRESSURE_LEVELS_RAW.flatMap(({ key, directionKey }) => [
            key,
            directionKey,
        ]),
        ...SURFACE_FIELDS,
        ...CLOUD_FIELDS,
        ...HEIGHT_FIELDS,
    ].join(",");
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        hourly,
        past_hours: "1",
        forecast_hours: "48",
        timezone: "auto",
        wind_speed_unit: "ms",
    });

    try {
        /** @type {CachedFetchOptions<OpenMeteoWeatherData>} */
        const options = {
            format: "json",
            cacheOnly,
            signal,
            forceFetch,
            validate: isWindForecast,
            cache: openMeteoCache(latitude, longitude),
        };
        const result = await fetchCached(
            `https://api.open-meteo.com/v1/forecast?${params}`,
            options,
        );
        onCacheStatus?.(result?.stale ?? true);
        return result?.data ?? null;
    } catch (error) {
        console.warn("Open-Meteo wind forecast unavailable", error);
        return null;
    }
}

/**
 * @param {string} coordinates
 * @param {boolean} [cacheOnly]
 * @param {(stale: boolean) => void} [onCacheStatus]
 * @param {AbortSignal} [signal]
 * @param {boolean} [forceFetch]
 */
export async function fetchHighWinds(
    coordinates,
    cacheOnly = false,
    onCacheStatus,
    signal,
    forceFetch = false,
) {
    return fetchDataWithCoordinates(
        coordinates,
        cacheOnly,
        onCacheStatus,
        signal,
        forceFetch,
    );
}

/**
 * Read a cloud sample above both model terrain and the dropzone.
 * Keep the cached API heights above sea level; returned heights are above DZ.
 * @param {OpenMeteoWeatherData | null} data
 * @param {number | undefined} index
 * @param {OpenMeteoCloudPressureLevel} pressure
 * @param {number} elevation Dropzone elevation above sea level, in metres.
 * @returns {OpenMeteoCloudProfile["layers"][number] | null}
 */
export function getOpenMeteoCloudLayer(data, index, pressure, elevation) {
    if (!data || isNullish(index)) return null;
    const cover = data.hourly[`cloud_cover_${pressure}hPa`]?.[index];
    const height = data.hourly[`geopotential_height_${pressure}hPa`]?.[index];
    if (
        isNullish(cover) ||
        isNullish(height) ||
        !Number.isFinite(cover) ||
        !Number.isFinite(height) ||
        cover < 0 ||
        cover > 100 ||
        height < Math.max(0, data.elevation ?? 0, elevation)
    )
        return null;
    return { pressure, cover, height: height - elevation };
}

/**
 * Return the current forecast hour, with pressure-level heights above the DZ.
 * @param {OpenMeteoWeatherData | null} data
 * @param {number} [elevation] Dropzone elevation above sea level, in metres.
 * @param {Date} [now]
 * @returns {OpenMeteoCloudProfile | null}
 */
export function getOpenMeteoCloudProfile(
    data,
    elevation = 0,
    now = new Date(),
) {
    if (!data) return null;
    const index = data.hourly.time.findIndex((time) => {
        const age =
            now.getTime() -
            forecastTime(time, data.utc_offset_seconds).getTime();
        return age >= 0 && age < 60 * 60 * 1000;
    });
    if (index < 0) return null;
    const layers = CLOUD_PRESSURE_LEVELS.flatMap((pressure) => {
        const layer = getOpenMeteoCloudLayer(data, index, pressure, elevation);
        return layer ? [layer] : [];
    }).toSorted((a, b) => b.height - a.height);
    return layers.length
        ? {
              time: forecastTime(
                  data.hourly.time[index] ?? "",
                  data.utc_offset_seconds,
              ),
              layers,
          }
        : null;
}

/**
 * @param {OpenMeteoWeatherData} data
 * @returns {WeatherData[]}
 */
export function getOpenMeteoSurfaceWeather(data) {
    return data.hourly.time.map((time, index) => ({
        source: /** @type {const} */ ("forecast"),
        time: forecastTime(time, data.utc_offset_seconds),
        speed: data.hourly.wind_speed_10m[index] ?? undefined,
        gust: data.hourly.wind_gusts_10m[index] ?? undefined,
        direction: data.hourly.wind_direction_10m[index] ?? undefined,
        temperature: data.hourly.temperature_2m[index] ?? undefined,
        dewPoint: data.hourly.dew_point_2m[index] ?? undefined,
        rain: data.hourly.precipitation_probability[index] ?? undefined,
        lowCloudCover: data.hourly.cloud_cover_low[index] ?? undefined,
        middleCloudCover: data.hourly.cloud_cover_mid[index] ?? undefined,
    }));
}
