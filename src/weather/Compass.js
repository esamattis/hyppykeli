// @ts-check
import { QUERY_PARAMS } from "#app/app/settings.js";
import { FromNow } from "#app/shared/FromNow.js";
import { Help } from "#app/shared/Help.js";
import { isNullish } from "#app/shared/values.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import {
    hasValidAverageWindData,
    hasValidWindData,
} from "#app/weather/calculations.js";
import {
    HOVERED_OBSERVATION,
    LATEST_OBSERVATION,
    OBSERVATIONS,
} from "#app/weather/state.js";
import { h, html } from "htm/preact";
import { useState } from "preact/hooks";

// Constants for needle length calculation
const MIN_NEEDLE_LENGTH = 30;
const MAX_NEEDLE_LENGTH = 170;
const STUDENT_LIMIT_LENGTH = 110;
const INSTRUCTOR_LIMIT_LENGTH = 150;
const STUDENT_WIND_SPEED = 8;
const INSTRUCTOR_WIND_SPEED = 11;
const MAX_WIND_SPEED = 11.9;

/**
 * Linearly converts a value from one range to another range.
 *
 * @param {number} value - The value to be converted, originally in the input range.
 * @param {number} inMin - The minimum value of the input range.
 * @param {number} inMax - The maximum value of the input range.
 * @param {number} outMin - The minimum value of the output range.
 * @param {number} outMax - The maximum value of the output range.
 * @returns {number} The converted value in the output range.
 */
function convertRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Calculates the needle length based on wind gust speed
 * @param {number} gust - Wind gust speed in m/s
 * @returns {number} Needle length in pixels
 */
function calculateNeedleLength(gust) {
    if (gust == 0) {
        return MIN_NEEDLE_LENGTH;
    } else if (gust <= STUDENT_WIND_SPEED) {
        return Math.max(
            MIN_NEEDLE_LENGTH,
            convertRange(
                gust,
                0,
                STUDENT_WIND_SPEED,
                MIN_NEEDLE_LENGTH,
                STUDENT_LIMIT_LENGTH,
            ),
        );
    } else if (gust <= INSTRUCTOR_WIND_SPEED) {
        return convertRange(
            gust,
            STUDENT_WIND_SPEED,
            INSTRUCTOR_WIND_SPEED,
            STUDENT_LIMIT_LENGTH,
            INSTRUCTOR_LIMIT_LENGTH,
        );
    } else if (gust <= MAX_WIND_SPEED) {
        return convertRange(
            gust,
            INSTRUCTOR_WIND_SPEED,
            MAX_WIND_SPEED,
            INSTRUCTOR_LIMIT_LENGTH,
            MAX_NEEDLE_LENGTH,
        );
    } else {
        return MAX_NEEDLE_LENGTH;
    }
}

/** @param {{ floating?: boolean }} props */
export function Compass({ floating = false } = {}) {
    const [animated, setAnimated] = useState(
        () => localStorage.getItem("compass-animation") !== "false",
    );
    const scope = useScope(css`
        svg,
        text {
            transform-origin: center;
        }
        :scope svg {
            width: min(100%, 300px);
            align-self: center;
        }
        :scope:not(.floating) svg {
            margin-block: auto;
        }

        :scope {
            display: flex;
            width: 100%;
            flex: 1;
            max-width: 100%;
            margin: 0;
            position: relative;
            padding: 2px;

            border-radius: var(--radius-panel);
            background: var(--color-surface);

            flex-direction: column;
            justify-content: space-between;
        }
        :scope.floating {
            width: 100px;
            position: fixed;
            z-index: 100;
            top: 5px;
            right: 5px;
            box-shadow: var(--shadow-floating);
            pointer-events: none;
        }

        .compass-observations-gust {
            display: none;
        }

        .compass-observations-speed {
            display: none;
        }

        .compass-controls {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 4px;
            margin-top: 12px;
        }

        .compass-controls > .help {
            margin: 0;
        }

        .compass-controls .summary-time {
            text-align: center;
            color: var(--color-muted);
            font-size: 0.85rem;
        }

        .compass-animation-toggle {
            align-self: flex-start;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px;
            font-size: 0.8rem;
            cursor: pointer;
        }
    `);

    const rc = parseInt(QUERY_PARAMS.value.rc ?? "0", 10);
    const rotation = isNaN(rc) ? 0 : rc; // Default to 0 degrees if invalid
    const circle = INSTRUCTOR_LIMIT_LENGTH;
    const studentCircle = STUDENT_LIMIT_LENGTH;
    const observation = floating
        ? HOVERED_OBSERVATION.value
        : LATEST_OBSERVATION.value;
    const history = getHistoryObservations();

    if (floating && !observation) {
        return null;
    }

    // prettier-ignore
    return html`
        <div id=${floating ? "hovered-compass" : "compass"} class=${floating ? "compass floating" : "compass"}>
            ${scope.style}
            <svg
                style="transform: rotate(${rotation}deg); "
                viewBox="0 0 400 400"
                xmlns="http://www.w3.org/2000/svg">

              <!-- Circle for compass outline -->
              <circle cx="200" cy="200" r=${circle} stroke="black" stroke-width="2" fill="none" />
              <circle cx="200" cy="200" r=${studentCircle} stroke="orange" stroke-width="2" fill="none" />

              <!-- Directions Text -->
              <text x="200" y="40" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">N</text>
              <text x="20" y="210" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">W</text>
              <text x="200" y="390" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">S</text>
              <text x="380" y="210" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">E</text>
              ${h(HistoryNeedles, { observations: history })}
              ${h(GustNeedle, { observation, history: floating, animation: !floating && animated ? history : undefined })}
              <text
                    x="200"
                    y="170"
                    font-size="24"
                    text-anchor="middle"
                    fill="black"
                    font-weight="bold"
                    class="compass-observations-gust"
                    style="transform: rotate(-${rotation}deg); "
                >
                    ${observation ? (observation.gust ?? "-") + " m/s" : ""}
                </text>
                <text
                    x="200"
                    y="240"
                    font-size="20"
                    text-anchor="middle"
                    fill="black"
                    class="compass-observations-speed"
                    style="transform: rotate(-${rotation}deg); "
                >
                    ${observation ? observation.speed + " m/s" : ""}
                </text>

            </svg>

            ${!floating && html`
                <div class="compass-controls">
                <label class="compass-animation-toggle">
                    <input
                        type="checkbox"
                        checked=${animated}
                        onChange=${() => {
                            const enabled = !animated;
                            setAnimated(enabled);
                            localStorage.setItem("compass-animation", String(enabled));
                        }}
                    />
                    ${t("compass.animation")}
                </label>

                <div class="summary-time">
                    ${observation && h(FromNow, { date: observation.time })}
                </div>

                ${h(Help, {}, html`<p>${t("compass.help")}</p>`)}
                </div>
            `}
        </div>
    `;
}

/**
 * @param {object} props
 * @param {number} props.direction
 * @param {number} props.gust
 * @param {string} props.color
 * @param {CompassWindSample[]} [props.animation]
 */
function NeedlePolygon(props) {
    const frames = props.animation ?? [];
    const first = frames[0];
    const last = frames.at(-1);
    const span = first && last ? last.time.getTime() - first.time.getTime() : 0;
    let angle = (first?.direction ?? props.direction) - 180;
    const rotations = frames.map((frame) => {
        // Take the shortest path, including when the direction crosses north.
        angle +=
            ((((frame.direction - 180 - angle + 540) % 360) + 360) % 360) - 180;
        return angle;
    });
    const lengths = frames.map((frame) => calculateNeedleLength(frame.gust));
    const colors = frames.map((frame) =>
        frame.gust > MAX_WIND_SPEED ? "black" : "red",
    );
    const times = frames.map((frame) =>
        span > 0 && first
            ? ((frame.time.getTime() - first.time.getTime()) / span) * 0.5
            : 0,
    );
    const canAnimate = frames.length > 1 && span > 0;
    if (canAnimate) {
        // Retrace every reading so the loop never shortcuts back to the start.
        for (let index = frames.length - 2; index >= 0; index--) {
            rotations.push(rotations[index] ?? angle);
            lengths.push(lengths[index] ?? MIN_NEEDLE_LENGTH);
            colors.push(colors[index] ?? "red");
            times.push(1 - (times[index] ?? 0));
        }
    }
    const bouncedRotations = bounceKeyframes(rotations, times);
    const bouncedLengths = bounceKeyframes(lengths, times);
    const rotationValues = bouncedRotations.values
        .map((value) => `${value} 200 200`)
        .join(";");
    const pointValues = bouncedLengths.values.map(polygonPoints).join(";");
    const bounceTimes = bouncedRotations.times.join(";");
    const splines = bouncedRotations.times
        .slice(1)
        .map(() => "0.2 0 0.2 1")
        .join(";");
    return html`
        <polygon
            points=${needlePoints(props.gust)}
            fill=${props.color}
            transform=${`rotate(${props.direction - 180}, 200, 200)`}
        >
            ${
                canAnimate &&
                html`
                    <animateTransform
                        key=${rotationValues}
                        attributeName="transform"
                        type="rotate"
                        values=${rotationValues}
                        keyTimes=${bounceTimes}
                        calcMode="spline"
                        keySplines=${splines}
                        dur="3s"
                        repeatCount="indefinite"
                    />
                    <animate
                        key=${pointValues}
                        attributeName="points"
                        values=${pointValues}
                        keyTimes=${bounceTimes}
                        calcMode="spline"
                        keySplines=${splines}
                        dur="3s"
                        repeatCount="indefinite"
                    />
                    <animate
                        key=${colors.join(";")}
                        attributeName="fill"
                        values=${colors.join(";")}
                        keyTimes=${times.join(";")}
                        calcMode="discrete"
                        dur="3s"
                        repeatCount="indefinite"
                    />
                `
            }
        </polygon>
    `;
}

/**
 * Add a small overshoot and recoil, settling at each actual observation.
 * @param {number[]} values
 * @param {number[]} times
 */
function bounceKeyframes(values, times) {
    const bounced = { values: values.slice(0, 1), times: times.slice(0, 1) };
    for (let index = 1; index < values.length; index++) {
        const start = values[index - 1] ?? 0;
        const end = values[index] ?? start;
        const startTime = times[index - 1] ?? 0;
        const endTime = times[index] ?? startTime;
        const delta = end - start;
        bounced.values.push(end + delta * 0.12, end - delta * 0.03, end);
        bounced.times.push(
            startTime + (endTime - startTime) * 0.65,
            startTime + (endTime - startTime) * 0.85,
            endTime,
        );
    }
    return bounced;
}

/** @param {number} gust */
function needlePoints(gust) {
    return polygonPoints(calculateNeedleLength(gust));
}

/** @param {number} length */
function polygonPoints(length) {
    return `190,${200 - length} 210,${200 - length} 220,200 180,200`;
}

/**
 * @param {{ observation: WeatherData | undefined, history: boolean, animation?: CompassWindSample[] }} props
 */
function GustNeedle({ observation: obs, history, animation }) {
    // When using metar based observations, gust might not be available.
    // Fall back to speed in that case.
    const gust = obs?.gust ?? obs?.speed;

    if (isNullish(gust) || isNullish(obs?.direction)) {
        return null;
    }

    if (!hasValidAverageWindData(obs)) {
        return null;
    }

    const needleColor = gust > MAX_WIND_SPEED ? "black" : "red";

    return html`
        <g className="${history ? "historic" : ""}">
            ${h(NeedlePolygon, {
                gust,
                direction: obs.direction,
                color: needleColor,
                animation,
            })}
            <!-- Center Point -->
            <circle cx="200" cy="200" r="10" fill="black" />
        </g>
    `;
}

/** @returns {CompassWindSample[]} */
function getHistoryObservations() {
    return OBSERVATIONS.value
        .flatMap((obs) => {
            if (isNullish(obs.gust) || isNullish(obs.direction)) {
                return [];
            }

            if (!hasValidWindData(obs)) {
                return [];
            }

            const age = Date.now() - obs.time.getTime();
            if (age < 0 || age > 3600000) {
                return [];
            }

            return {
                time: obs.time,
                gust: obs.gust,
                direction: obs.direction,
            };
        })
        .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** @param {{ observations: CompassWindSample[] }} props */
function HistoryNeedles({ observations }) {
    return html`
        <g>
            ${observations.map((obs) =>
                h(NeedlePolygon, {
                    direction: obs.direction,
                    gust: obs.gust,
                    color: "rgba(0, 0, 0, 0.1)",
                }),
            )}
        </g>
    `;
}
