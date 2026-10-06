// @ts-check
import { CheckboxField } from "#app/shared/FormFields.js";
import { QUERY_PARAMS } from "#app/app/settings.js";
import { ANIMATIONS_RUNNING } from "#app/app/animationState.js";
import { FromNow } from "#app/shared/FromNow.js";
import { Help } from "#app/shared/Help.js";
import { isNullish } from "#app/shared/values.js";
import { LANGUAGE, t } from "#app/translations.js";
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
import { signal } from "@preact/signals";
import { h, html } from "htm/preact";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "preact/hooks";

const COMPASS_ANIMATION_ENABLED = signal(
    localStorage.getItem("compass-animation") !== "false",
);

// Constants for needle length calculation
const MIN_NEEDLE_LENGTH = 30;
const MAX_NEEDLE_LENGTH = 170;
const STUDENT_LIMIT_LENGTH = 110;
const INSTRUCTOR_LIMIT_LENGTH = 150;
const STUDENT_WIND_SPEED = 8;
const INSTRUCTOR_WIND_SPEED = 11;
const MAX_WIND_SPEED = 11.9;
const COMPASS_BOUNCE_GUST = 11;
const COMPASS_SPIN_GUST = 14;
const LIMIT_COLOR = "rgb(255, 0, 0)";

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
    const animated = !floating && COMPASS_ANIMATION_ENABLED.value;
    /** @type {import('preact').RefObject<HTMLDivElement>} */
    const compassRef = useRef(null);
    const [running, setRunning] = useState(false);
    useEffect(() => {
        const compass = compassRef.current;
        if (!compass || floating) return;
        let visible = false;
        const update = () => setRunning(visible && !document.hidden);
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            update();
        });
        observer.observe(compass);
        document.addEventListener("visibilitychange", update);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", update);
        };
    }, [floating]);
    const active = running && ANIMATIONS_RUNNING.value;
    const scope = useScope(css`
        svg,
        text {
            transform-origin: center;
        }
        :scope svg {
            width: min(100%, 300px);
            aspect-ratio: 1;
            align-self: center;
        }
        :scope:not(.floating) svg {
            margin-block: auto;
        }
        .compass-intercardinal text {
            font-family: monospace;
            font-size: 12px;
            text-anchor: middle;
            dominant-baseline: middle;
            fill: black;
        }
        svg.bouncing {
            animation: compass-bounce 1.2s ease-in-out infinite;
        }
        svg.spinning {
            animation: compass-spin 2s linear infinite;
        }
        svg.bouncing.spinning {
            animation:
                compass-bounce 1.2s ease-in-out infinite,
                compass-spin 2s linear infinite;
        }
        :scope:not(.animations-running) > svg {
            animation-play-state: paused;
        }
        :scope.animations-running > svg.bouncing,
        :scope.animations-running > svg.spinning {
            will-change: translate, rotate;
        }
        .gust-needle > polygon.animated {
            transform-box: view-box;
            transform-origin: 200px 200px;
        }
        :scope.animations-running .gust-needle > polygon.animated {
            will-change: transform;
        }
        @keyframes compass-bounce {
            0%,
            100% {
                translate: 0 0;
            }
            40% {
                translate: 0 -4px;
            }
            65% {
                translate: 0 1px;
            }
            80% {
                translate: 0 -1px;
            }
        }
        @keyframes compass-spin {
            to {
                rotate: 360deg;
            }
        }

        :scope {
            display: flex;
            width: 100%;
            flex: 1;
            max-width: 100%;
            margin: 0;
            position: relative;
            padding: 2px;
            /* Keep animated SVG bounds from widening the page. */
            overflow: clip;

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

        :scope.animations-enabled .gust-needle > polygon:not(.animated) {
            transition: fill 0.2s ease;
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
            --checkbox-gap: 4px;
            padding: 4px;
        }
    `);

    const rc = parseInt(QUERY_PARAMS.value.rc ?? "0", 10);
    const rotation = isNaN(rc) ? 0 : rc; // Default to 0 degrees if invalid
    const circle = INSTRUCTOR_LIMIT_LENGTH;
    const studentCircle = STUDENT_LIMIT_LENGTH;
    const latestObservation = LATEST_OBSERVATION.value;
    const latestGust = latestObservation?.gust ?? 0;
    const bouncing = animated && latestGust >= COMPASS_BOUNCE_GUST;
    const spinning = animated && latestGust > COMPASS_SPIN_GUST;
    const observation = floating
        ? HOVERED_OBSERVATION.value
        : latestObservation;
    const history = getHistoryObservations();

    if (floating && !observation) {
        return null;
    }

    // prettier-ignore
    return html`
        <div ref=${compassRef} id=${floating ? "hovered-compass" : "compass"} class=${["compass", floating && "floating", animated && "animations-enabled", animated && active && "animations-running"].filter(Boolean).join(" ")}>
            ${scope.style}
            <svg
                class=${[bouncing && "bouncing", spinning && "spinning"].filter(Boolean).join(" ")}
                style="transform: rotate(${rotation}deg); "
                viewBox="0 0 400 400"
                xmlns="http://www.w3.org/2000/svg">

              <!-- Circle for compass outline -->
              <circle class="compass-outer-ring" cx="200" cy="200" r=${circle} stroke=${LIMIT_COLOR} stroke-width="2" fill="none" />
              <circle cx="200" cy="200" r=${studentCircle} stroke="orange" stroke-width="2" fill="none" />

              <!-- Directions Text -->
              <text x="200" y="40" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">N</text>
              <text x="20" y="210" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">W</text>
              <text x="200" y="390" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">S</text>
              <text x="380" y="210" font-weight="bold" font-family="monospace" font-size="40" text-anchor="middle" fill="black">E</text>
              ${LANGUAGE.value === "fi" && html`
                  <g class="compass-intercardinal">
                      <text x="327" y="73">koillinen</text>
                      <text x="327" y="327">kaakko</text>
                      <text x="73" y="327">lounas</text>
                      <text x="73" y="73">luode</text>
                  </g>
              `}
              ${h(HistoryNeedles, { observations: history })}
              ${h(GustNeedle, { observation, history: floating, animation: animated ? history : undefined, paused: !active })}
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
                ${h(CheckboxField, {
                    className: "compass-animation-toggle",
                    label: t("compass.animation"),
                    checked: animated,
                    onCheckedChange: (enabled) => {
                        COMPASS_ANIMATION_ENABLED.value = enabled;
                        localStorage.setItem("compass-animation", String(enabled));
                    },
                })}

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
 * @param {boolean} [props.paused]
 */
function NeedlePolygon(props) {
    const frames = props.animation ?? [];
    // Weather signals can rerender the compass with an equivalent history.
    // Keep its timeline and playback position until the readings change.
    const animationKey = JSON.stringify(frames);
    const timeline = useMemo(() => needleKeyframes(frames), [animationKey]);
    /** @type {import('preact').RefObject<SVGPolygonElement>} */
    const polygonRef = useRef(null);
    /** @type {import('preact').RefObject<Animation[]>} */
    const animationsRef = useRef([]);
    useLayoutEffect(() => {
        const polygon = polygonRef.current;
        if (!polygon || !timeline) return;
        const options = { duration: 3000, iterations: Infinity };
        const animations = [
            polygon.animate(timeline.transforms, options),
            polygon.animate(timeline.colors, options),
        ];
        animationsRef.current = animations;
        return () => {
            animations.forEach((animation) => animation.cancel());
            animationsRef.current = [];
        };
    }, [timeline]);
    useLayoutEffect(() => {
        for (const animation of animationsRef.current ?? []) {
            if (props.paused) animation.pause();
            else animation.play();
        }
    }, [props.paused, timeline]);

    return html`
        <polygon
            ref=${polygonRef}
            class=${timeline ? "animated" : ""}
            points=${timeline ? polygonPoints(MIN_NEEDLE_LENGTH) : needlePoints(props.gust)}
            fill=${props.color}
            transform=${`rotate(${props.direction - 180}, 200, 200)`}
        />
    `;
}

/** @param {CompassWindSample[]} frames */
function needleKeyframes(frames) {
    const first = frames[0];
    const last = frames.at(-1);
    const span = first && last ? last.time.getTime() - first.time.getTime() : 0;
    if (!first || frames.length < 2 || span <= 0) return null;
    let angle = first.direction - 180;
    const rotations = frames.map((frame) => {
        // Take the shortest path, including when the direction crosses north.
        angle +=
            ((((frame.direction - 180 - angle + 540) % 360) + 360) % 360) - 180;
        return angle;
    });
    const lengths = frames.map((frame) => calculateNeedleLength(frame.gust));
    const times = frames.map(
        (frame) => ((frame.time.getTime() - first.time.getTime()) / span) * 0.5,
    );
    // Retrace every reading so the loop never shortcuts back to the start.
    for (let index = frames.length - 2; index >= 0; index--) {
        rotations.push(rotations[index] ?? angle);
        lengths.push(lengths[index] ?? MIN_NEEDLE_LENGTH);
        times.push(1 - (times[index] ?? 0));
    }
    const bouncedRotations = bounceKeyframes(rotations, times);
    const bouncedLengths = bounceKeyframes(lengths, times);
    const colors = needleColorKeyframes(
        bouncedLengths.values,
        bouncedLengths.times,
    );
    return {
        // Scaling a fixed polygon keeps its base and tip widths unchanged,
        // while moving its tip exactly as the previous geometry animation did.
        transforms: bouncedRotations.values.map((rotation, index) => ({
            transform: `rotate(${rotation}deg) scaleY(${(bouncedLengths.values[index] ?? MIN_NEEDLE_LENGTH) / MIN_NEEDLE_LENGTH})`,
            offset: bouncedRotations.times[index],
            easing: "cubic-bezier(0.2, 0, 0.2, 1)",
        })),
        colors: colors.values.map((fill, index) => ({
            fill,
            offset: colors.times[index],
            easing: "steps(1, end)",
        })),
    };
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

/** @param {number} length */
function needleColor(length) {
    if (length >= INSTRUCTOR_LIMIT_LENGTH) return LIMIT_COLOR;
    if (length >= STUDENT_LIMIT_LENGTH) return "rgb(255, 165, 0)";
    return "rgb(0, 255, 0)";
}

/**
 * Find the time at which the needle's "0.2 0 0.2 1" spline reaches a value.
 * @param {number} progress
 */
function needleAnimationTime(progress) {
    let low = 0;
    let high = 1;
    for (let index = 0; index < 30; index++) {
        const t = (low + high) / 2;
        const value = t * t * (3 - 2 * t);
        if (value < progress) low = t;
        else high = t;
    }
    const t = (low + high) / 2;
    return 0.6 * t * (1 - t) + t * t * t;
}

/**
 * Change color only when crossing a limit, including during overshoot and
 * recoil. Threshold times follow the same eased timeline as the length.
 * @param {number[]} lengths
 * @param {number[]} times
 */
function needleColorKeyframes(lengths, times) {
    const colors = {
        values: lengths.slice(0, 1).map(needleColor),
        times: times.slice(0, 1),
    };
    for (let index = 1; index < lengths.length; index++) {
        const start = lengths[index - 1] ?? 0;
        const end = lengths[index] ?? start;
        const startTime = times[index - 1] ?? 0;
        const endTime = times[index] ?? startTime;
        const crossings = [STUDENT_LIMIT_LENGTH, INSTRUCTOR_LIMIT_LENGTH]
            .filter(
                (length) =>
                    length > Math.min(start, end) &&
                    length < Math.max(start, end),
            )
            .sort((a, b) => (end > start ? a - b : b - a));
        const boundaries = [start, ...crossings, end];
        for (let boundary = 0; boundary < boundaries.length - 1; boundary++) {
            const length = boundaries[boundary] ?? start;
            const next = boundaries[boundary + 1] ?? end;
            const color = needleColor((length + next) / 2);
            if (color === colors.values.at(-1)) continue;
            const progress =
                end === start ? 0 : (length - start) / (end - start);
            colors.values.push(color);
            colors.times.push(
                startTime +
                    (endTime - startTime) * needleAnimationTime(progress),
            );
        }
    }
    colors.values.push(needleColor(lengths.at(-1) ?? 0));
    colors.times.push(times.at(-1) ?? 1);
    return colors;
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
 * @param {{ observation: WeatherData | undefined, history: boolean, animation?: CompassWindSample[], paused?: boolean }} props
 */
function GustNeedle({ observation: obs, history, animation, paused }) {
    // When using metar based observations, gust might not be available.
    // Fall back to speed in that case.
    const gust = obs?.gust ?? obs?.speed;

    if (isNullish(gust) || isNullish(obs?.direction)) {
        return null;
    }

    if (!hasValidAverageWindData(obs)) {
        return null;
    }

    return html`
        <g className="gust-needle ${history ? "historic" : ""}">
            ${h(NeedlePolygon, {
                gust,
                direction: obs.direction,
                color: needleColor(calculateNeedleLength(gust)),
                animation,
                paused,
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
