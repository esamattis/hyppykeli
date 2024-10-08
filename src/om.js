// @ts-check
import { html } from "htm/preact";
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
 * @type {Array<{ pressure: string, key: keyof OpenMeteoHourlyData, directionKey: keyof OpenMeteoHourlyData }>}
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
const OM_DATA = signal(null);

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

        if (cachedCoordinates === coordinates && cachedHour === currentHour) {
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

    TIME_SLOTS.forEach((slot) => {
        todayData[slot] = getAverageData(hourly, slot, 0);
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

    const relevantIndices = [0, 1, 2]
        .map((i) => {
            const hour = (targetHour + i * 3) % 24;
            return hourly.time.findIndex((time) => {
                const date = new Date(time);
                return (
                    date.getHours() === hour &&
                    date.getDate() === now.getDate() + dayOffset
                );
            });
        })
        .filter((index) => index !== -1);

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
                (time) => new Date(time).getHours() === currentHour,
            );

            result[level] = {
                speed: hourly[speedKey]?.[currentIndex] ?? 0,
                direction: hourly[directionKey]?.[currentIndex] ?? 0,
            };
        } else {
            const speeds = relevantIndices.map(
                (i) => hourly[speedKey]?.[i] ?? 0,
            );
            const directions = relevantIndices.map(
                (i) => hourly[directionKey]?.[i] ?? 0,
            );

            result[level] = {
                speed:
                    speeds.length > 0
                        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
                        : null,
                direction:
                    directions.length > 0
                        ? directions.reduce((a, b) => a + b, 0) /
                          directions.length
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
    if (isNullish(direction)) {
        return null;
    }

    const arrow = "➤";
    const rotationDegree = direction + 90;
    return html`
        <span
            style=${{
                display: "inline-block",
                transform: `rotate(${rotationDegree}deg)`,
            }}
        >
            ${arrow}
        </span>
    `;
}

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {number|null} props.data.speed
 * @param {number|null} props.data.direction
 * @param {string} props.columnClass
 * @param {string} props.height
 */
export function WindCell({ data, columnClass, height }) {
    if (!data)
        return html`
            <td class=${columnClass}>-</td>
        `;

    const { speed, direction } = data;
    const speedInMS = isNullish(speed) ? null : Math.round(speed / 3.6);
    const roundedDirection = isNullish(direction)
        ? null
        : roundToNearestFive(direction.toFixed(0));

    return html`
        <td
            class=${`wind-cell ${columnClass} ${getWindSpeedClass(
                speedInMS,
                height,
            )}`}
        >
            ${isNullish(speed)
                ? null
                : html`
                      <div class="wind-speed">${speedInMS} m/s</div>
                  `}
            ${isNullish(speed)
                ? null
                : html`
                      <div class="wind-direction">
                          ${roundedDirection}°
                          <${WindArrow} direction=${roundedDirection} />
                      </div>
                  `}
        </td>
    `;
}

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {OpenMeteoDayData} props.tableData
 */
export function WindTable({ title, tableData }) {
    if (!tableData) return null;

    const currentHour = new Date().getHours();
    const blockStartHour = Math.floor(currentHour / 3) * 3;

    /**
     * @param {string}  hour
     * @param {boolean} isCurrentBlock
     */
    function getColumnClass(hour, isCurrentBlock) {
        if (title === "Tänään") {
            if (isCurrentBlock) return "current-column";
            if (parseInt(hour) < blockStartHour) return "past-column";
        }
        return "";
    }

    return html`
        <table class="wind-table upperwinds-compact">
            <thead>
                <tr>
                    <th colspan=${Object.keys(tableData).length + 1}>
                        ${title}
                    </th>
                </tr>
                <tr>
                    <th></th>
                    ${Object.entries(tableData).map(
                        ([hour, { isCurrentBlock }]) => {
                            const startHour = parseInt(hour);
                            const endHour = (startHour + 3) % 24;
                            const timeRange = `${startHour.toString().padStart(2, "0")}-${endHour.toString().padStart(2, "0")}`;
                            return html`
                                <th
                                    class=${`time-header ${getColumnClass(
                                        hour,
                                        isCurrentBlock,
                                    )}`}
                                >
                                    ${isCurrentBlock
                                        ? `${currentHour}:00`
                                        : timeRange}
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
                            <td class="pressure-cell">${height}</td>
                            ${Object.entries(tableData).map(
                                ([
                                    hour,
                                    { data: hourData, isCurrentBlock },
                                ]) => html`
                                    <${WindCell}
                                        key=${hour}
                                        data=${hourData[
                                            pressure.split(" ")[0] ?? ""
                                        ]}
                                        columnClass=${getColumnClass(
                                            hour,
                                            isCurrentBlock,
                                        )}
                                        height=${height}
                                    />
                                `,
                            )}
                        </tr>
                    `,
                )}
            </tbody>
        </table>
    `;
}

/**
 * @param {Object} props
 * @param {boolean} props.tomorrow
 */
export function OpenMeteoTool({ tomorrow }) {
    const data = OM_DATA.value ? formatTableData(OM_DATA.value.hourly) : null;

    if (!data)
        return html`
            <div>Loading...</div>
        `;

    return html`
        <${WindTable}
            title=${tomorrow ? "Huomenna" : "Tänään"}
            tableData=${tomorrow ? data.tomorrowData : data.todayData}
        />
    `;
}

export function OpenMeteoRaw() {
    const data = OM_DATA.value;

    if (!data) {
        return html`
            <div>Loading...</div>
        `;
    }

    const renderTable = () => {
        const hourly = data.hourly;

        /** @type {number[]} */
        const timeSlots = hourly.time.map((time) => new Date(time).getHours());

        return html`
            <table class="wind-table upperwinds-raw">
                <thead>
                    <tr>
                        <th>Height</th>
                        ${timeSlots.map(
                            (hour) => html`
                                <th>${hour}:00</th>
                            `,
                        )}
                    </tr>
                </thead>
                <tbody>
                    ${PRESSURE_LEVELS_RAW.map(
                        ({ pressure, key, directionKey }) => html`
                            <tr>
                                <td>${pressure}</td>
                                ${timeSlots.map((_, index) => {
                                    const speed =
                                        Number(hourly[key][index] ?? 0) / 3.6;

                                    const direction = Number(
                                        hourly[directionKey][index] ?? 0,
                                    );

                                    return html`
                                        <td>
                                            ${speed.toFixed(0)} m/s |
                                            ${direction.toFixed(0)}°
                                        </td>
                                    `;
                                })}
                            </tr>
                        `,
                    )}
                </tbody>
            </table>
        `;
    };

    return html`
        <div>${renderTable()}</div>
    `;
}
