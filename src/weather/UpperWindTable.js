// @ts-check
import { WindArrow } from "#app/shared/icons.js";
import { isNullish } from "#app/shared/values.js";
import { upperWindTableStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import {
    PRESSURE_LEVELS_RAW,
    forecastTime,
} from "#app/weather/providers/openMeteo.js";
import { ForecastAltitude } from "#app/weather/ForecastAltitude.js";
import { formatExactAltitude } from "#app/weather/altitudes.js";
import { OM_DATA } from "#app/weather/state.js";
import { h, html } from "htm/preact";

// Nominal heights identify warning bands; displayed labels use forecast heights.
const PRESSURE_LEVELS = [
    { pressure: "600 hPa", height: "4200" },
    { pressure: "700 hPa", height: "3000" },
    { pressure: "850 hPa", height: "1500" },
    { pressure: "925 hPa", height: "800" },
    { pressure: "1000 hPa", height: "110" },
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
        /** @type {`geopotential_height_${OpenMeteoPressureLevel}hPa`} */
        const altitudeKey = `geopotential_height_${level}hPa`;

        if (isCurrentBlock) {
            const currentIndex = hourly.time.findIndex(
                (time) =>
                    forecastTime(time, offset).getTime() ===
                    currentTime.getTime(),
            );

            result[level] = {
                altitude: hourly[altitudeKey]?.[currentIndex] ?? null,
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

            const altitudes = relevantIndices.flatMap((i) => {
                const altitude = hourly[altitudeKey]?.[i];
                return typeof altitude === "number" && Number.isFinite(altitude)
                    ? [altitude]
                    : [];
            });
            result[level] = {
                altitude: altitudes.length
                    ? altitudes.reduce((a, b) => a + b, 0) / altitudes.length
                    : null,
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
 * @param {number|null} [props.data.altitude]
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
    const speedInMS = isNullish(speed) ? null : Math.round(speed);
    const roundedDirection = isNullish(direction)
        ? null
        : hourly
          ? Math.round(direction)
          : roundToNearestFive(direction.toFixed(0));

    return html`
        <td
            tabindex=${Number.isFinite(data.altitude) ? 0 : undefined}
            data-tooltip=${Number.isFinite(data.altitude) ? `${t("cloud.altitudeSeaLevel")}: ${formatExactAltitude(data.altitude ?? 0)}` : undefined}
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
            aria-label=${t("highWinds.title")}
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
                    ${PRESSURE_LEVELS.map(({ pressure, height }) => {
                        const level = pressure.split(" ")[0] ?? "";
                        const currentAltitude = columns.find(
                            (column) => column.isCurrentBlock,
                        )?.data[level]?.altitude;
                        const altitude = Number.isFinite(currentAltitude)
                            ? currentAltitude
                            : columns
                                  .map((column) => column.data[level]?.altitude)
                                  .find((value) => Number.isFinite(value));
                        return html`
                            <tr key=${pressure}>
                                <th scope="row" class="pressure-cell">
                                    ${isNullish(altitude) ? pressure : h(ForecastAltitude, { height: altitude, reference: `${pressure} · ${t("cloud.altitudeSeaLevel")}` })}
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
                        `;
                    })}
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
            {
                title: t("common.today"),
                tableData: data.todayData,
                isToday: true,
            },
            {
                title: t("common.tomorrow"),
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
                    ? t("common.today")
                    : dateKey === tomorrow.toDateString()
                      ? t("common.tomorrow")
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
                altitude:
                    data.hourly[
                        `geopotential_height_${/** @type {OpenMeteoPressureLevel} */ (pressure.split(" ")[0])}hPa`
                    ]?.[index] ?? null,
            };
        });
        day.tableData[date.getHours()] = {
            data: winds,
            isCurrentBlock: isToday && date.getHours() === today.getHours(),
        };
    });

    return h(WindTable, { days: [...days.values()], hourly: true });
}
