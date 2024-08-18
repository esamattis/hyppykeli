// @ts-check

import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";
import { computed } from "@preact/signals";
import { LATEST_OBSERVATION, WIND_VARIATIONS } from "./data.js";
import { debug } from "./utils.js";

/**
 * Calculates common animation parameters based on input factors.
 * @param {number} baseAngle - The base angle for the animation.
 * @param {number} baseDuration - The base duration for the animation.
 * @param {number} variationFactor - A factor representing the variation in wind.
 * @param {number} windRef - The wind reference value.
 * @returns {{ angle: number, duration: number }} The calculated animation parameters.
 */
const calculateAnimationParams = (
    baseAngle,
    baseDuration,
    variationFactor,
    windRef,
) => {
    const windRefFactor = Math.min((windRef ?? 0) / 10, 1);
    const angle = baseAngle * (1 + windRefFactor);
    const duration = baseDuration / (1 + windRefFactor);
    return { angle, duration };
};

/**
 * Computed signal that determines the color of the parachute based on wind variations.
 * Defaults to "#90EE90" if no color is provided in the wind variations data.
 * @type {import('@preact/signals').Computed<string>}
 */
const parachuteColor = computed(() => {
    return WIND_VARIATIONS.value?.color ?? "#90EE90";
});

/**
 * Computed signal that calculates the rotation animation for the parachute based on wind variations.
 * @type {import('@preact/signals').Computed<{ angle: number, duration: number }>}
 */
const rotationAnimation = computed(() => {
    const windVariations = WIND_VARIATIONS.value;
    if (!windVariations || typeof windVariations !== "object") {
        console.error("Invalid windVariations object");
        return { angle: 0, duration: 0 };
    }

    const { variationRange, windRef } = windVariations;

    // Calculate rotation angle based on variationRange
    // Limit the angle to the actual variation range
    const angle = Math.min(variationRange, 180);

    // Only start rotation when variationRange is significant
    if (angle < 44) return { angle: 0, duration: 0 };

    // Adjust duration based on windRef and variationRange
    const baseDuration = Math.max(5 - variationRange * 0.05, 2);

    const { angle: calculatedAngle, duration } = calculateAnimationParams(
        angle,
        baseDuration,
        variationRange,
        windRef,
    );

    debug(
        `Rotation animation calculated: duration=${duration}, angle=${calculatedAngle}, variationRange=${variationRange}, windRef=${windRef}`,
    );
    return { angle: calculatedAngle, duration };
});

/**
 * Computed signal that calculates the swing animation for the parachute based on wind variations.
 * @type {import('@preact/signals').Computed<{ angle: number, duration: number }>}
 */
const swingAnimation = computed(() => {
    const windVariations = WIND_VARIATIONS.value;
    if (!windVariations || typeof windVariations !== "object") {
        console.error("Invalid windVariations object");
        return { angle: 0, duration: 0 };
    }

    const { averageSpeed, maxGust, windRef } = windVariations;
    const gustDiff = maxGust - averageSpeed;

    // Calculate the base angle and duration for the swing
    const baseAngle = Math.min(gustDiff * 1.5, 20);
    const baseDuration = Math.max(3 - gustDiff * 0.15, 1);

    const { angle, duration } = calculateAnimationParams(
        baseAngle,
        baseDuration,
        gustDiff,
        windRef,
    );

    debug(
        `Swing animation calculated: angle=${angle}, duration=${duration}, gustDiff=${gustDiff}, windRef=${windRef}`,
    );
    return { angle, duration };
});

/**
 * Component that renders a dynamic parachute with animations based on wind data.
 * The parachute's color, rotation, and swing are controlled by wind variations.
 */
export function DynamicParachute() {
    const svgRef = useRef(null);

    /**
     * Applies the parachute color and animations to the SVG element.
     */
    useEffect(() => {
        if (svgRef.current) {
            const svg = svgRef.current;
            const swingContainer = svg.closest(".swing-container");
            const rotateContainer = svg.closest(".rotate-container");

            svg.style.setProperty("--parachute-color", parachuteColor.value);

            if (swingContainer) {
                const { angle, duration } = swingAnimation.value;
                swingContainer.style.setProperty(
                    "--swing-angle",
                    `${angle}deg`,
                );
                swingContainer.style.setProperty(
                    "--swing-animation",
                    `swing ${duration}s ease-in-out infinite alternate`,
                );
                debug(
                    `Swing animation applied: ${swingContainer.style.getPropertyValue("--swing-animation")}`,
                );
            }

            if (rotateContainer) {
                const { angle, duration } = rotationAnimation.value;
                if (angle > 0 && duration > 0) {
                    rotateContainer.style.setProperty(
                        "--rotate-angle",
                        `${angle}deg`,
                    );
                    rotateContainer.style.setProperty(
                        "--rotate-animation",
                        `rotate ${duration}s linear infinite alternate`,
                    );
                    debug(
                        `Rotate animation applied: ${rotateContainer.style.getPropertyValue("--rotate-animation")}`,
                    );
                } else {
                    rotateContainer.style.removeProperty("--rotate-animation");
                }
            }
        }
    }, [
        parachuteColor.value,
        LATEST_OBSERVATION.value,
        WIND_VARIATIONS.value,
        rotationAnimation.value,
        swingAnimation.value,
    ]);

    return html`
        <style>
            @keyframes swing {
                0% {
                    transform: rotate(var(--swing-angle));
                }
                100% {
                    transform: rotate(calc(-1 * var(--swing-angle)));
                }
            }
            @keyframes rotate {
                0% {
                    transform: rotateY(calc(-1 * var(--rotate-angle) / 2));
                }
                100% {
                    transform: rotateY(calc(var(--rotate-angle) / 2));
                }
            }
            .rotate-container {
                width: 100px;
                height: 100px;
                display: inline-block;
                animation: var(--rotate-animation, none);
            }
            .swing-container {
                width: 100%;
                height: 100%;
                display: inline-block;
                transform-origin: center top;
                animation: var(--swing-animation);
            }
            .dynamic-parachute {
                width: 100%;
                height: 100%;
                fill: var(--parachute-color);
            }
            .parachute-color {
                fill: var(--parachute-color);
            }
        </style>
        <div class="rotate-container">
            <div class="swing-container">
                <svg
                    ref=${svgRef}
                    class="dynamic-parachute"
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <use href="/assets/parachute.svg#g3069" />
                </svg>
            </div>
        </div>
    `;
}
