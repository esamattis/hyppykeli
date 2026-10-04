// @ts-check
import { css, useScope } from "./useScope.js";
import { upperWindTableStyles } from "./styles.js";
import { h, html } from "htm/preact";
import { FORECAST_COORDINATES, STATION_COORDINATES } from "./data.js";
import { signal } from "@preact/signals";
import { WindArrow } from "./icons.js";
import { isNullish } from "./utils.js";

// Vakiot tiedoston alussa
const PRESSURE_LEVELS = [
    { pressure: "600 hPa", height: "4200" },
    { pressure: "700 hPa", height: "3000" },
    { pressure: "850 hPa", height: "1500" },
    { pressure: "925 hPa", height: "800" },
    { pressure: "1000 hPa", height: "110" },
];

/**
 * @type {Array<{ pressure: string, key: `windspeed_${OpenMeteoPressureLevel}hPa`, directionKey: `winddirection_${OpenMeteoPressureLevel}hPa` }>}
 */
const PRESSURE_LEVELS_RAW = [
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

const TIME_SLOTS = [0, 3, 6, 9, 12, 15, 18, 21];

const WIND_SPEED_CLASSES = [
    "wind-low",
    "wind-medium",
    "wind-high",
    "wind-very-high",
];

const ON_CANOPY_HEIGHTS = ["110", "800"];
const FREE_FALL_HEIGHTS = ["1500", "3000", "4200"];

/**
 * @type {import("@preact/signals").Signal<OpenMeteoWeatherData | null>}
 */
export const OM_DATA = signal(null);

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
        !("hourly" in data) ||
        !data.hourly ||
        typeof data.hourly !== "object"
    ) {
        return false;
    }
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
            OM_DATA.value = cachedForecast;
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

    OM_DATA.value = newData;
    return newData;
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

/**
 * @param {OpenMeteoWeatherData} forecast
 */
function formatTableData({ hourly, utc_offset_seconds }) {
    /** @type {OpenMeteoDayData} */
    const todayData = {};

    /** @type {OpenMeteoDayData} */
    const tomorrowData = {};

    const blockStartHour = Math.floor(new Date().getHours() / 3) * 3;

    TIME_SLOTS.forEach((slot) => {
        if (slot >= blockStartHour - 9) {
            todayData[slot] = getAverageData(
                hourly,
                slot,
                0,
                utc_offset_seconds,
            );
        }
        tomorrowData[slot] = getAverageData(
            hourly,
            slot,
            1,
            utc_offset_seconds,
        );
    });

    return { pressureLevels: PRESSURE_LEVELS, todayData, tomorrowData };
}

/**
 * @param {OpenMeteoHourlyData} hourly
 * @param {number} targetHour
 * @param {number} dayOffset
 * @param {number} offset
 */
function getAverageData(hourly, targetHour, dayOffset, offset) {
    const now = new Date();
    const currentHour = now.getHours();
    const isCurrentBlock =
        targetHour === Math.floor(currentHour / 3) * 3 && dayOffset === 0;

    const blockStart = new Date(now);
    blockStart.setDate(now.getDate() + dayOffset);
    blockStart.setHours(targetHour, 0, 0, 0);
    const blockEnd = new Date(blockStart);
    blockEnd.setHours(targetHour + 3);
    const currentTime = new Date(now);
    currentTime.setMinutes(0, 0, 0);

    const relevantIndices = hourly.time.flatMap((time, index) => {
        const date = forecastTime(time, offset);
        return date >= blockStart && date < blockEnd ? [index] : [];
    });

    /**
     * @type {OpenMeteoPressureLevel[]}
     */
    const pressureLevels = ["1000", "925", "850", "700", "600"];

    /**
     * @type {AverageWindSpeeds}
     */
    const result = {};

    pressureLevels.forEach((level) => {
        /** @type {`windspeed_${OpenMeteoPressureLevel}hPa`} */
        const speedKey = `windspeed_${level}hPa`;
        /** @type {`winddirection_${OpenMeteoPressureLevel}hPa`} */
        const directionKey = `winddirection_${level}hPa`;

        if (isCurrentBlock) {
            const currentIndex = hourly.time.findIndex(
                (time) =>
                    forecastTime(time, offset).getTime() ===
                    currentTime.getTime(),
            );

            result[level] = {
                speed: hourly[speedKey]?.[currentIndex] ?? null,
                direction: hourly[directionKey]?.[currentIndex] ?? null,
            };
        } else {
            const speeds = relevantIndices
                .map((i) => hourly[speedKey]?.[i])
                .flatMap((value) =>
                    typeof value === "number" && Number.isFinite(value)
                        ? [value]
                        : [],
                );
            const directions = relevantIndices
                .map((i) => hourly[directionKey]?.[i])
                .flatMap((value) =>
                    typeof value === "number" && Number.isFinite(value)
                        ? [value]
                        : [],
                );
            const sinSum = directions.reduce(
                (sum, direction) => sum + Math.sin((direction * Math.PI) / 180),
                0,
            );
            const cosSum = directions.reduce(
                (sum, direction) => sum + Math.cos((direction * Math.PI) / 180),
                0,
            );

            result[level] = {
                speed:
                    speeds.length > 0
                        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
                        : null,
                direction:
                    Math.hypot(sinSum, cosSum) > 1e-10
                        ? ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) %
                          360
                        : null,
            };
        }
    });

    return { data: result, isCurrentBlock };
}

/**
 * @param {number|null} speed
 * @param {string|null} height
 */
const getWindSpeedClass = (speed, height) => {
    if (speed === null || height === null) {
        return "";
    }

    if (ON_CANOPY_HEIGHTS.includes(height)) {
        if (speed < 8) return WIND_SPEED_CLASSES[0];
        if (speed < 11) return WIND_SPEED_CLASSES[1];
        if (speed < 13) return WIND_SPEED_CLASSES[2]; // Oranssi 11-12 m/s
        return WIND_SPEED_CLASSES[3]; // Punainen 13 m/s ja yli
    } else if (FREE_FALL_HEIGHTS.includes(height)) {
        if (speed < 8) return WIND_SPEED_CLASSES[0];
        if (speed < 13) return WIND_SPEED_CLASSES[1];
        if (speed < 18) return WIND_SPEED_CLASSES[2];
        return WIND_SPEED_CLASSES[3];
    }
    return "";
};

/**
 * @param {number|string} num
 */
function roundToNearestFive(num) {
    return Math.round(Number(num) / 5) * 5;
}

/**
 * @param {Object} props
 * @param {Object} [props.data]
 * @param {number|null} props.data.speed
 * @param {number|null} props.data.direction
 * @param {string} props.columnClass
 * @param {string} props.height
 * @param {boolean} [props.hourly]
 */
export function WindCell({ data, columnClass, height, hourly = false }) {
    const scope = useScope(css`
        :scope {
            padding: 2px;
        }

        .wind-speed {
            font-weight: bold;
        }

        .wind-direction {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.2em;
            font-size: 0.8em;
            color: var(--color-muted);
        }

        :scope.wind-low {
            background-color: var(--color-wind-low); /* vihreä */
        }

        :scope.wind-medium {
            background-color: var(--color-wind-medium); /* keltainen */
        }

        :scope.wind-high {
            background-color: var(--color-wind-high); /* oranssi */
        }

        :scope.wind-very-high {
            background-color: var(--color-wind-very-high); /* punainen */
        }
    `);
    if (!data)
        return html`
            <td class=${columnClass}>-</td>
        `;

    const { speed, direction } = data;
    const speedInMS = isNullish(speed) ? null : Math.round(speed / 3.6);
    const roundedDirection = isNullish(direction)
        ? null
        : hourly
          ? Math.round(direction)
          : roundToNearestFive(direction.toFixed(0));

    return html`
        <td
            class=${`wind-cell ${columnClass} ${getWindSpeedClass(
                speedInMS,
                height,
            )}`}
        >
            ${scope.style}
            ${
                isNullish(speed)
                    ? null
                    : html`
                          <div class="wind-speed">${speedInMS} m/s</div>
                      `
            }
            ${
                isNullish(direction)
                    ? null
                    : html`
                          <div class="wind-direction">
                              <span class="direction-degrees">
                                  ${roundedDirection}°
                              </span>
                              ${h(WindArrow, { direction: roundedDirection })}
                          </div>
                      `
            }
        </td>
    `;
}

/**
 * @param {Object} props
 * @param {WindTableDay[]} props.days
 * @param {boolean} [props.hourly]
 */
export function WindTable({ days, hourly = false }) {
    const scope = useScope(css`
        ${upperWindTableStyles}
    `);
    const currentHour = new Date().getHours();
    const blockStartHour = Math.floor(currentHour / 3) * 3;
    const visibleDays = days.flatMap(
        ({ title, tableData, isToday, isPast, id }, dayIndex) => {
            const columns = Object.entries(tableData).flatMap(
                ([hour, { data, isCurrentBlock }]) => {
                    const hasData = Object.values(data).some(
                        ({ speed, direction }) =>
                            !isNullish(speed) || !isNullish(direction),
                    );
                    if (!hasData) return [];

                    return {
                        key: `${dayIndex}-${hour}`,
                        hour,
                        data,
                        isCurrentBlock,
                        columnClass: !isToday
                            ? isPast
                                ? "past-column"
                                : ""
                            : isCurrentBlock
                              ? "current-column"
                              : parseInt(hour) <
                                  (hourly ? currentHour : blockStartHour)
                                ? "past-column"
                                : "",
                    };
                },
            );

            return columns.length > 0 ? [{ title, id, columns }] : [];
        },
    );
    const columns = visibleDays.flatMap(({ columns }) => columns);

    return html`
        <div
            class="wind-table-scroll"
            tabindex="0"
            aria-label="Ylätuuliennusteet"
        >
            ${scope.style}
            <table
                class=${`wind-table ${hourly ? "upperwinds-raw" : "upperwinds-compact"}`}
            >
                <thead>
                    <tr>
                        <th></th>
                        ${visibleDays.map(
                            ({ title, columns: dayColumns, id }) => html`
                                <th
                                    id=${id}
                                    class="wind-table-title"
                                    scope="colgroup"
                                    colspan=${dayColumns.length}
                                >
                                    ${title}
                                </th>
                            `,
                        )}
                    </tr>
                    <tr>
                        <th scope="col">m</th>
                        ${columns.map(
                            ({ key, hour, isCurrentBlock, columnClass }) => {
                                const startHour = parseInt(hour);
                                const endHour = (startHour + 3) % 24;
                                const timeRange = `${startHour.toString().padStart(2, "0")}-${endHour.toString().padStart(2, "0")}`;
                                return html`
                                    <th
                                        key=${key}
                                        scope="col"
                                        class=${`time-header ${columnClass}`}
                                    >
                                        ${hourly || isCurrentBlock ? `${isCurrentBlock ? currentHour : startHour}:00` : timeRange}
                                    </th>
                                `;
                            },
                        )}
                    </tr>
                </thead>
                <tbody>
                    ${PRESSURE_LEVELS.map(
                        ({ pressure, height }) => html`
                            <tr key=${pressure}>
                                <th scope="row" class="pressure-cell">
                                    ${height}
                                </th>
                                ${columns.map(({ key, data, columnClass }) =>
                                    h(WindCell, {
                                        key,
                                        data: data[
                                            pressure.split(" ")[0] ?? ""
                                        ],
                                        columnClass,
                                        height,
                                        hourly,
                                    }),
                                )}
                            </tr>
                        `,
                    )}
                </tbody>
            </table>
        </div>
    `;
}

export function OpenMeteoTool() {
    const data = OM_DATA.value ? formatTableData(OM_DATA.value) : null;

    if (!data)
        return html`
            <div>Loading...</div>
        `;

    return h(WindTable, {
        days: [
            { title: "Tänään", tableData: data.todayData, isToday: true },
            {
                title: "Huomenna",
                tableData: data.tomorrowData,
                isToday: false,
                id: "high-winds-tomorrow",
            },
        ],
    });
}

export function OpenMeteoRaw() {
    const data = OM_DATA.value;

    if (!data) {
        return html`
            <div>Loading...</div>
        `;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const currentHourStart = new Date(today);
    currentHourStart.setMinutes(0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const pastIndices = new Set(
        data.hourly.time
            .map((time, index) => ({
                time: forecastTime(time, data.utc_offset_seconds).getTime(),
                index,
            }))
            .filter(({ time }) => time < currentHourStart.getTime())
            .sort((a, b) => b.time - a.time)
            .slice(0, 3)
            .map(({ index }) => index),
    );
    /** @type {Map<string, WindTableDay>} */
    const days = new Map();

    data.hourly.time.forEach((time, index) => {
        const date = forecastTime(time, data.utc_offset_seconds);
        if (date < currentHourStart && !pastIndices.has(index)) return;
        const dateKey = date.toDateString();
        const isToday = dateKey === today.toDateString();
        let day = days.get(dateKey);
        if (!day) {
            day = {
                title: isToday
                    ? "Tänään"
                    : dateKey === tomorrow.toDateString()
                      ? "Huomenna"
                      : date.toLocaleDateString("fi-FI"),
                tableData: {},
                isToday,
                isPast: date < todayStart,
                id:
                    dateKey === tomorrow.toDateString()
                        ? "high-winds-tomorrow"
                        : undefined,
            };
            days.set(dateKey, day);
        }
        /** @type {AverageWindSpeeds} */
        const winds = {};
        PRESSURE_LEVELS_RAW.forEach(({ pressure, key, directionKey }) => {
            winds[pressure.split(" ")[0] ?? ""] = {
                speed: data.hourly[key][index] ?? null,
                direction: data.hourly[directionKey][index] ?? null,
            };
        });
        day.tableData[date.getHours()] = {
            data: winds,
            isCurrentBlock: isToday && date.getHours() === today.getHours(),
        };
    });

    return h(WindTable, { days: [...days.values()], hourly: true });
}
