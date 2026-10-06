// @ts-check
import { parseUpperWinds } from "#app/manual/overrides.js";
import { DROPZONE_ELEVATION, QUERY_PARAMS } from "#app/app/settings.js";
import {
    formatExactAltitude,
    formatForecastAltitude,
    roundForecastAltitude,
} from "#app/weather/altitudes.js";
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
    const overrides = parseUpperWinds(QUERY_PARAMS.value.MANUAL_upper_winds);
    const elevation = DROPZONE_ELEVATION.value;
    const terrain = overrides
        ? elevation
        : Math.max(elevation, data?.elevation ?? 0);
    /** @type {MapAltitudeWindLevel[]} */
    const altitudeWinds = LEVELS.flatMap(
        ({ level, height: nominalHeight }, row) => {
            const altitude = overrides
                ? nominalHeight
                : index >= 0
                  ? data?.hourly[`geopotential_height_${level}hPa`]?.[index]
                  : undefined;
            const height =
                typeof altitude === "number" && Number.isFinite(altitude)
                    ? altitude - elevation
                    : NaN;
            // Never use a pressure surface at/below the DZ or below model terrain.
            if (
                Number.isFinite(height) &&
                (height <= 0 || (altitude ?? 0) < terrain)
            )
                return [];
            return [
                {
                    id: level,
                    legacyLabel: `≈ ${nominalHeight} m`,
                    height,
                    label: Number.isFinite(height)
                        ? `≈ ${overrides ? `${Math.round(height / 100) * 100} m` : formatForecastAltitude(height)}`
                        : `${level} hPa`,
                    altitudeTooltip: Number.isFinite(height)
                        ? formatExactAltitude(height)
                        : undefined,
                    speed: overrides
                        ? overrides[row]?.speed
                            ? Number(overrides[row].speed)
                            : null
                        : index >= 0
                          ? (data?.hourly[`windspeed_${level}hPa`][index] ??
                            null)
                          : null,
                    direction: overrides
                        ? overrides[row]?.direction
                            ? Number(overrides[row].direction)
                            : null
                        : index >= 0
                          ? (data?.hourly[`winddirection_${level}hPa`][index] ??
                            null)
                          : null,
                },
            ];
        },
    );
    // Missing heights cannot be replaced with nominal heights or silently skipped.
    const hasHeights = altitudeWinds.every(
        (wind, i) =>
            Number.isFinite(wind.height) &&
            (i === 0 || wind.height < (altitudeWinds[i - 1]?.height ?? 0)),
    );
    const profile = hasHeights ? altitudeWinds : [];
    const freefallWinds = overrides
        ? profile.filter((wind) => wind.id !== "1000")
        : profile;
    const averageWind = averageFreeFallWind(
        altitudeWinds.filter((wind) => wind.id !== "1000"),
        Boolean(overrides),
    );
    /** @type {SelectableMapWindLevel[]} */
    const winds = [
        averageWind,
        ...altitudeWinds,
        {
            id: "ground",
            legacyLabel: t("map.ground"),
            label: t("map.ground"),
            speed: ground?.speed ?? null,
            direction: ground?.direction ?? null,
        },
    ];

    const groundAge = ground ? now - ground.time.getTime() : Infinity;
    // Observations can arrive after the map's most recent minute tick.
    const freshGround = groundAge <= MAX_GROUND_WIND_AGE_MS;
    const canopyWinds = hasHeights
        ? [
              ...profile,
              {
                  height: 0,
                  label: t("map.ground"),
                  speed: freshGround ? (ground?.speed ?? null) : null,
                  direction: freshGround ? (ground?.direction ?? null) : null,
              },
          ]
        : [];
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

/** @param {FreefallWindLevel[]} winds @param {boolean} manual @returns {SelectableMapWindLevel} */
function averageFreeFallWind(winds, manual) {
    const hasHeights =
        winds.length > 0 && winds.every((wind) => Number.isFinite(wind.height));
    const top = winds[0]?.height ?? 0;
    const bottom = winds.at(-1)?.height ?? 0;
    /** @param {number} height */
    const round = (height) =>
        manual ? Math.round(height / 100) * 100 : roundForecastAltitude(height);
    const average = {
        id: "average",
        legacyLabel: "≈ 4200-800 m",
        label: hasHeights
            ? `≈ ${round(top)}-${round(bottom)} m`
            : t("map.averageWind"),
        altitudeTooltip: hasHeights
            ? `${Math.round(top)}-${formatExactAltitude(bottom)}`
            : undefined,
        speed: /** @type {number | null} */ (null),
        direction: /** @type {number | null} */ (null),
    };
    if (
        winds.length === 0 ||
        winds.some(
            ({ height, speed, direction }) =>
                !Number.isFinite(height) ||
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
