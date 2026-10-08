// @ts-check
import { getFreefallDrift } from "#app/map/freefall.js";
import { getJumpRunExitHeight } from "#app/map/mapState.js";
import { parseUpperWinds } from "#app/manual/overrides.js";
import { DROPZONE_ELEVATION, QUERY_PARAMS } from "#app/app/settings.js";
import {
    formatExactAltitude,
    formatForecastAltitude,
} from "#app/weather/altitudes.js";
import { t } from "#app/translations.js";
import { forecastTime } from "#app/weather/providers/openMeteo.js";
import {
    OBSERVATIONS,
    METAR_OBSERVATION,
    OPEN_METEO_CURRENT,
    OM_DATA,
} from "#app/weather/state.js";
import { hasValidAverageWindData } from "#app/weather/calculations.js";

import { WIND_LEVELS } from "#app/weather/windLevels.js";

const MAX_GROUND_WIND_AGE_MS = 60 * 60 * 1000;

/** @param {number} [now] @param {boolean} [useManual] */
export function getMapWindData(now = Date.now(), useManual = true) {
    const data = OM_DATA.value;
    const index =
        data?.hourly.time.findIndex((time) => {
            const start = forecastTime(time, data.utc_offset_seconds).getTime();
            return start <= now && now < start + 60 * 60 * 1000;
        }) ?? -1;
    const time = index >= 0 ? data?.hourly.time[index] : undefined;
    /** @param {WeatherData | undefined} weather */
    const usableGround = (weather) =>
        Boolean(
            weather &&
            Number.isFinite(weather.time.getTime()) &&
            // The map clock ticks once per minute; new observations may be newer.
            now - weather.time.getTime() >= -60_000 &&
            now - weather.time.getTime() <= MAX_GROUND_WIND_AGE_MS &&
            (hasValidAverageWindData(weather) || weather.speed === 0),
        );
    const observation = OBSERVATIONS.value
        .filter(
            (obs) =>
                obs.source === "fmi" ||
                obs.source === "roads" ||
                obs.source === "mock",
        )
        .filter(usableGround)
        .reduce(
            (latest, obs) => (!latest || obs.time > latest.time ? obs : latest),
            /** @type {WeatherData | undefined} */ (undefined),
        );
    const ground = [
        observation,
        METAR_OBSERVATION.value,
        OPEN_METEO_CURRENT.value,
    ].find(usableGround);
    const overrides = useManual
        ? parseUpperWinds(QUERY_PARAMS.value.MANUAL_upper_winds)
        : undefined;
    const elevation = DROPZONE_ELEVATION.value;
    const customHeights = overrides?.some((wind) => wind.height);
    const terrain = Math.max(elevation, data?.elevation ?? 0);
    /** @type {ManualUpperWindInput[]} */
    const upperWindInputs = [];
    /** @type {MapAltitudeWindLevel[]} */
    const altitudeWinds = WIND_LEVELS.flatMap(({ level }, row) => {
        const override = overrides?.[row];
        const enteredHeight = override?.height;
        const forecastAltitude =
            index >= 0
                ? data?.hourly[`geopotential_height_${level}hPa`]?.[index]
                : undefined;
        const height = enteredHeight
            ? Number(enteredHeight)
            : typeof forecastAltitude === "number" &&
                Number.isFinite(forecastAltitude)
              ? forecastAltitude - elevation
              : NaN;
        const speed = override?.speed
            ? Number(override.speed)
            : index >= 0
              ? (data?.hourly[`windspeed_${level}hPa`][index] ?? null)
              : null;
        const direction = override?.direction
            ? Number(override.direction)
            : index >= 0
              ? (data?.hourly[`winddirection_${level}hPa`][index] ?? null)
              : null;
        const belowGround =
            Number.isFinite(height) &&
            (height <= 0 ||
                (!enteredHeight && (forecastAltitude ?? 0) < terrain));
        // Show below-DZ heights, but do not capture a pressure surface that
        // is above the DZ yet buried below the forecast model's terrain.
        const unavailable = belowGround && height > 0;
        upperWindInputs.push({
            pressure: level,
            height:
                Number.isFinite(height) && !unavailable
                    ? height.toString()
                    : "",
            speed: !unavailable ? (speed?.toString() ?? "") : "",
            direction: !unavailable ? (direction?.toString() ?? "") : "",
        });
        // Never use a pressure surface at/below the DZ or below model terrain.
        if (belowGround) return [];
        return [
            {
                id: level,
                height,
                label: Number.isFinite(height)
                    ? enteredHeight
                        ? formatExactAltitude(height)
                        : `≈ ${formatForecastAltitude(height)}`
                    : `${level} hPa`,
                altitudeTooltip: Number.isFinite(height)
                    ? formatForecastAltitude(height)
                    : undefined,
                speed,
                direction,
            },
        ];
    });
    if (customHeights) altitudeWinds.sort((a, b) => b.height - a.height);
    // Missing heights cannot be replaced with nominal heights or silently skipped.
    const hasHeights = altitudeWinds.every(
        (wind, i) =>
            Number.isFinite(wind.height) &&
            (i === 0 || wind.height < (altitudeWinds[i - 1]?.height ?? 0)),
    );
    const profile = hasHeights ? altitudeWinds : [];
    const freefallWinds = profile;
    const exitHeight = getJumpRunExitHeight();
    const averageWind = averageFreeFallWind(freefallWinds, exitHeight);
    /** @type {SelectableMapWindLevel[]} */
    const winds = [
        averageWind,
        ...altitudeWinds,
        {
            id: "ground",
            label: t("map.ground"),
            speed: ground?.speed ?? null,
            direction: ground?.direction ?? null,
        },
    ];

    const canopyWinds = hasHeights
        ? [
              ...profile,
              {
                  height: 0,
                  label: t("map.ground"),
                  speed: ground?.speed ?? null,
                  direction: ground?.direction ?? null,
              },
          ]
        : [];
    return {
        data,
        time,
        upperWindInputs,
        winds,
        averageWind,
        ground,
        freefallWinds,
        canopyWinds,
    };
}

/** @param {FreefallWindLevel[]} winds @param {number} exitHeight @returns {SelectableMapWindLevel} */
function averageFreeFallWind(winds, exitHeight) {
    const bottom = 1000;
    const average = {
        id: "average",
        label: `≈ ${exitHeight}-${bottom} m`,
        altitudeTooltip: `${formatExactAltitude(exitHeight)}–${formatExactAltitude(bottom)}`,
        speed: /** @type {number | null} */ (null),
        direction: /** @type {number | null} */ (null),
    };
    // Constant descent speed makes drift / elapsed time the height-weighted
    // wind vector over precisely the selected altitude range.
    const descentSpeed = 50;
    const drift = getFreefallDrift(
        winds,
        exitHeight,
        descentSpeed * 3.6,
        bottom,
    )?.at(-1);
    if (!drift) return average;
    const seconds = (exitHeight - bottom) / descentSpeed;
    const east = drift.east / seconds;
    const north = drift.north / seconds;
    average.speed = Math.hypot(east, north);
    average.direction =
        average.speed > 1e-10
            ? ((Math.atan2(-east, -north) * 180) / Math.PI + 360) % 360
            : null;
    return average;
}
