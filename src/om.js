// @ts-check
import { css, useScope } from "./useScope.js";
import { upperWindTableStyles } from "./styles.js";
import { h, html } from "htm/preact";
import { FORECAST_COORDINATES, STATION_COORDINATES } from "./data.js";
import { signal } from "@preact/signals";
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

function getTimeRange() {
    const now = new Date();
    const start = now.toISOString();
    const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        23,
        59,
        59,
    ).toISOString();
    return { start, end };
}

/**
 * @param {string} coordinates
 * @returns {Promise<OpenMeteoWeatherData | null>}
 */
async function fetchDataWithCoordinates(coordinates) {
    const { start, end } = getTimeRange();
    const [latitude, longitude] = coordinates.split(",").map(Number);

    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=windspeed_1000hPa,windspeed_925hPa,windspeed_850hPa,windspeed_700hPa,windspeed_600hPa,winddirection_1000hPa,winddirection_925hPa,winddirection_850hPa,winddirection_700hPa,winddirection_600hPa&start=${start}&end=${end}`,
    );

    console.log(`Alkupäivämäärä: ${start}`);
    console.log(`Loppupäivämäärä: ${end}`);
    console.log(`Leveysaste: ${latitude}, Pituusaste: ${longitude}`);

    return await response.json();
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

    if (cachedData && cachedTime && cachedCoordinates) {
        const cachedHour = new Date(Number(cachedTime)).getHours();

        if (
            cachedCoordinates === coordinates &&
            cachedHour === currentHour &&
            now.getTime() - Number(cachedTime) >= 0 &&
            now.getTime() - Number(cachedTime) < 60 * 60 * 1000
        ) {
            console.log("Käytetään välimuistissa olevaa dataa");
            OM_DATA.value = JSON.parse(cachedData);
            return;
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
}

/**
 * @param {OpenMeteoHourlyData} hourly
 */
function formatTableData(hourly) {
    /** @type {OpenMeteoDayData} */
    const todayData = {};

    /** @type {OpenMeteoDayData} */
    const tomorrowData = {};

    const blockStartHour = Math.floor(new Date().getHours() / 3) * 3;

    TIME_SLOTS.forEach((slot) => {
        if (slot >= blockStartHour - 9) {
            todayData[slot] = getAverageData(hourly, slot, 0);
        }
        tomorrowData[slot] = getAverageData(hourly, slot, 1);
    });

    return { pressureLevels: PRESSURE_LEVELS, todayData, tomorrowData };
}

/**
 * @param {OpenMeteoHourlyData} hourly
 * @param {number} targetHour
 * @param {number} dayOffset
 */
function getAverageData(hourly, targetHour, dayOffset) {
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
        const date = new Date(time);
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
                (time) => new Date(time).getTime() === currentTime.getTime(),
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
 * @param {number|null} props.direction
 */
export function WindArrow({ direction }) {
    const scope = useScope(css`
        :scope {
            display: inline-block;
        }
    `);
    if (isNullish(direction)) {
        return null;
    }

    const arrow = "➤";
    const rotationDegree = direction + 90;
    return html`
        <span
            style=${{
                transform: `rotate(${rotationDegree}deg)`,
            }}
        >
            ${scope.style} ${arrow}
        </span>
    `;
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

        .wind-direction {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .wind-direction span {
            margin-left: 4px;
            font-size: 14px;
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
                              ${roundedDirection}°
                              <${WindArrow} direction=${roundedDirection} />
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
    const columns = days.flatMap(({ tableData, isToday, isPast }, dayIndex) =>
        Object.entries(tableData).map(([hour, { data, isCurrentBlock }]) => ({
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
                  : parseInt(hour) < (hourly ? currentHour : blockStartHour)
                    ? "past-column"
                    : "",
        })),
    );

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
                        ${days.map(
                            ({ title, tableData, id }) => html`
                                <th
                                    id=${id}
                                    class="wind-table-title"
                                    scope="colgroup"
                                    colspan=${Object.keys(tableData).length}
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
    const data = OM_DATA.value ? formatTableData(OM_DATA.value.hourly) : null;

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
            .map((time, index) => ({ time: new Date(time).getTime(), index }))
            .filter(({ time }) => time < currentHourStart.getTime())
            .sort((a, b) => b.time - a.time)
            .slice(0, 3)
            .map(({ index }) => index),
    );
    /** @type {Map<string, WindTableDay>} */
    const days = new Map();

    data.hourly.time.forEach((time, index) => {
        const date = new Date(time);
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
