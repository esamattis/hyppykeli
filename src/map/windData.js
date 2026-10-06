// @ts-check
import { parseUpperWinds } from "#app/developer/overrides.js";
import { DROPZONE_ELEVATION, QUERY_PARAMS } from "#app/app/settings.js";
import { t } from "#app/translations.js";
import { forecastTime } from "#app/weather/providers/openMeteo.js";
import { OBSERVATIONS, OM_DATA } from "#app/weather/state.js";

const MAX_GROUND_WIND_AGE_MS = 60 * 60 * 1000;

/** @type {Array<{ level: OpenMeteoPressureLevel, height: number }>} */
const LEVELS = [
    { level: "600", height: 4200 },
    { level: "700", height: 3000 },
    { level: "850", height: 1500 },
    { level: "925", height: 800 },
    { level: "1000", height: 110 },
];

/** @param {number} [now] */
export function getMapWindData(now = Date.now()) {
    const data = OM_DATA.value;
    const index =
        data?.hourly.time.findIndex((time) => {
            const start = forecastTime(time, data.utc_offset_seconds).getTime();
            return start <= now && now < start + 60 * 60 * 1000;
        }) ?? -1;
    const time = index >= 0 ? data?.hourly.time[index] : undefined;
    const ground = OBSERVATIONS.value
        .filter(
            (obs) =>
                obs.source === "fmi" ||
                obs.source === "roads" ||
                obs.source === "mock",
        )
        .reduce(
            (latest, obs) => (!latest || obs.time > latest.time ? obs : latest),
            /** @type {WeatherData | undefined} */ (undefined),
        );
    const overrides = parseUpperWinds(QUERY_PARAMS.value.DEV_upper_winds);
    /** @type {FreefallWindLevel[]} */
    const altitudeWinds = LEVELS.map(({ level, height }, row) => ({
        height,
        label: `≈ ${height} m`,
        speed: overrides
            ? overrides[row]?.speed
                ? Number(overrides[row].speed)
                : null
            : index >= 0
              ? (data?.hourly[`windspeed_${level}hPa`][index] ?? null)
              : null,
        direction: overrides
            ? overrides[row]?.direction
                ? Number(overrides[row].direction)
                : null
            : index >= 0
              ? (data?.hourly[`winddirection_${level}hPa`][index] ?? null)
              : null,
    }));
    // Display forecast levels above sea level; calculations use height above DZ.
    const elevation = DROPZONE_ELEVATION.value;
    const heightAboveDropzone = altitudeWinds.map((wind) => ({
        ...wind,
        height: wind.height - elevation,
    }));
    const freefallWinds = heightAboveDropzone.slice(0, 4);
    /** @type {MapWindLevel[]} */
    const winds = [...altitudeWinds];
    const averageWind = averageFreeFallWind(altitudeWinds.slice(0, 4));
    winds.unshift(averageWind);
    winds.push({
        label: t("map.ground"),
        speed: ground?.speed ?? null,
        direction: ground?.direction ?? null,
    });

    const groundAge = ground ? now - ground.time.getTime() : Infinity;
    // Observations can arrive after the map's most recent minute tick.
    const freshGround = groundAge <= MAX_GROUND_WIND_AGE_MS;
    const canopyWinds = [
        ...heightAboveDropzone.filter((wind) => wind.height > 0),
        {
            height: 0,
            label: t("map.ground"),
            speed: freshGround ? (ground?.speed ?? null) : null,
            direction: freshGround ? (ground?.direction ?? null) : null,
        },
    ];
    return {
        data,
        time,
        winds,
        averageWind,
        ground,
        freefallWinds,
        canopyWinds,
    };
}

/** @param {MapWindLevel[]} winds @returns {MapWindLevel} */
function averageFreeFallWind(winds) {
    const average = {
        label: "≈ 4200-800 m",
        speed: /** @type {number | null} */ (null),
        direction: /** @type {number | null} */ (null),
    };
    if (
        winds.length === 0 ||
        winds.some(
            ({ speed, direction }) =>
                speed === null ||
                !Number.isFinite(speed) ||
                speed < 0 ||
                direction === null ||
                !Number.isFinite(direction),
        )
    ) {
        return average;
    }

    let speedSum = 0;
    let sinSum = 0;
    let cosSum = 0;
    for (const wind of winds) {
        speedSum += wind.speed ?? 0;
        const radians = ((wind.direction ?? 0) * Math.PI) / 180;
        sinSum += Math.sin(radians);
        cosSum += Math.cos(radians);
    }
    average.speed = speedSum / winds.length;
    average.direction =
        Math.hypot(sinSum, cosSum) > 1e-10
            ? ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360
            : null;
    return average;
}
