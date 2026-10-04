// @ts-check
import { isNullish } from "#app/shared/values.js";

/**
 * @type {Array<{ pressure: string, key: `windspeed_${OpenMeteoPressureLevel}hPa`, directionKey: `winddirection_${OpenMeteoPressureLevel}hPa` }>}
 */
export const PRESSURE_LEVELS_RAW = [
    {
        pressure: "600 hPa",
        key: "windspeed_600hPa",
        directionKey: "winddirection_600hPa",
    },
    {
        pressure: "700 hPa",
        key: "windspeed_700hPa",
        directionKey: "winddirection_700hPa",
    },
    {
        pressure: "850 hPa",
        key: "windspeed_850hPa",
        directionKey: "winddirection_850hPa",
    },
    {
        pressure: "925 hPa",
        key: "windspeed_925hPa",
        directionKey: "winddirection_925hPa",
    },
    {
        pressure: "1000 hPa",
        key: "windspeed_1000hPa",
        directionKey: "winddirection_1000hPa",
    },
];

/** @type {OpenMeteoPressureLevel[]} */
const CLOUD_PRESSURE_LEVELS = ["1000", "925", "850", "700", "600"];
const CLOUD_FIELDS = CLOUD_PRESSURE_LEVELS.flatMap((level) => [
    `cloud_cover_${level}hPa`,
    `geopotential_height_${level}hPa`,
]);

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
 * @returns {Promise<OpenMeteoWeatherData | null>}
 */
async function fetchDataWithCoordinates(coordinates) {
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
    ].join(",");
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        hourly,
        past_hours: "1",
        forecast_days: "3",
        timezone: "auto",
        wind_speed_unit: "ms",
    });

    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params}`,
        );
        if (!response.ok) {
            throw new Error(`Open-Meteo HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!isWindForecast(data)) {
            throw new Error("Invalid Open-Meteo wind forecast");
        }
        return data;
    } catch (error) {
        console.warn("Open-Meteo wind forecast unavailable", error);
        return null;
    }
}

export function clearOMCache() {
    localStorage.removeItem("ECMWFWindAloft");
    localStorage.removeItem("ECMWFWindAloftTime");
    localStorage.removeItem("ECMWFWindAloftCoordinates");
}

/**
 * @param {string} coordinates
 */
export async function fetchHighWinds(coordinates) {
    const cachedData = localStorage.getItem("ECMWFWindAloft");
    const cachedTime = localStorage.getItem("ECMWFWindAloftTime");
    const cachedCoordinates = localStorage.getItem("ECMWFWindAloftCoordinates");

    const now = new Date();
    const currentHour = now.getHours();

    /** @type {unknown} */
    let cachedForecast = null;
    if (cachedData) {
        try {
            cachedForecast = JSON.parse(cachedData);
        } catch {
            // Corrupt cache entries must not prevent fetching a new forecast.
        }
        if (!isWindForecast(cachedForecast)) clearOMCache();
    }

    if (isWindForecast(cachedForecast) && cachedTime && cachedCoordinates) {
        const cachedHour = new Date(Number(cachedTime)).getHours();

        if (
            cachedCoordinates === coordinates &&
            cachedHour === currentHour &&
            now.getTime() - Number(cachedTime) >= 0 &&
            now.getTime() - Number(cachedTime) < 60 * 60 * 1000
        ) {
            console.log("Käytetään välimuistissa olevaa dataa");
            return cachedForecast;
        }
    }

    // Jos välimuistissa ei ole dataa tai se on vanhentunutta, haetaan uutta
    const newData = await fetchDataWithCoordinates(coordinates);

    if (newData) {
        localStorage.setItem("ECMWFWindAloft", JSON.stringify(newData));
        localStorage.setItem("ECMWFWindAloftTime", now.getTime().toString());
        localStorage.setItem("ECMWFWindAloftCoordinates", coordinates);
    }

    return newData;
}

/**
 * Return the current forecast hour, using its actual pressure-level heights.
 * @param {OpenMeteoWeatherData | null} data
 * @param {Date} [now]
 * @returns {OpenMeteoCloudProfile | null}
 */
export function getOpenMeteoCloudProfile(data, now = new Date()) {
    if (!data) return null;
    const index = data.hourly.time.findIndex((time) => {
        const age =
            now.getTime() -
            forecastTime(time, data.utc_offset_seconds).getTime();
        return age >= 0 && age < 60 * 60 * 1000;
    });
    if (index < 0) return null;
    const layers = CLOUD_PRESSURE_LEVELS.flatMap((pressure) => {
        const cover = data.hourly[`cloud_cover_${pressure}hPa`]?.[index];
        const height =
            data.hourly[`geopotential_height_${pressure}hPa`]?.[index];
        if (
            isNullish(cover) ||
            isNullish(height) ||
            !Number.isFinite(cover) ||
            !Number.isFinite(height) ||
            cover < 0 ||
            cover > 100 ||
            height < Math.max(0, data.elevation ?? 0)
        )
            return [];
        return [{ pressure, cover, height }];
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
