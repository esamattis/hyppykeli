// KORVAA KOKO TIEDOSTON src/DynamicParachute.js SISÄLTÖ TÄLLÄ

// @ts-check
import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";
import { computed } from "@preact/signals";
import { WIND_VARIATIONS } from "./data.js";
import { debug } from "./utils.js";

/**
 * Laskee animaation parametrit perusarvojen ja tuulidatan perusteella.
 * Mitä korkeampi windRef, sitä nopeampi ja voimakkaampi on animaatio.
 * @param {number} baseAngle - Animaation peruskulma.
 * @param {number} baseDuration - Animaation peruskesto sekunneissa.
 * @param {number} windRef - Laskeutettu tuuliriski (0-4).
 * @returns {{ angle: number, duration: number }}
 */
const calculateAnimationParams = (baseAngle, baseDuration, windRef) => {
    // windRef-kerroin tehostaa animaatiota tuulen riskitason mukaan.
    const windRefFactor = Math.min((windRef ?? 0) / 10, 1);
    const angle = baseAngle * (1 + windRefFactor);
    const duration = baseDuration / (1 + windRefFactor);
    return { angle, duration };
};

/**
 * Varjoliitimen väri määräytyy suoraan lasketun tuuliriskin (windRef) perusteella.
 * @src/types.d.ts {Signal<string>}
 */
const parachuteColor = computed(() => {
    return WIND_VARIATIONS.value?.color ?? "#90EE90"; // Oletusväri, jos dataa ei ole.
});

/**
 * Laskee varjoliitimen "pyörähdys"-animaation parametrit.
 * Animaatio perustuu tuulen suunnan vaihteluun (variationRange).
 * @src/types.d.ts {ReadonlySignal<{ angle: number, duration: number }>}
 */
const rotationAnimation = computed(() => {
    const wind = WIND_VARIATIONS.value;
    if (!wind) {
        return { angle: 0, duration: 0 };
    }

    const { variationRange, windRef } = wind;

    // Rajoitetaan kulma järkeviin rajoihin.
    const angle = Math.min(variationRange, 180);

    // Animaatio käynnistyy vasta, kun suunnanvaihtelu on merkittävää.
    if (angle < 44) return { angle: 0, duration: 0 };

    // Kesto lyhenee, kun vaihtelu kasvaa.
    const baseDuration = Math.max(5 - variationRange * 0.05, 2);

    return calculateAnimationParams(angle, baseDuration, windRef);
});

/**
 * Laskee varjoliitimen "heiluri"-animaation parametrit.
 * Animaatio perustuu puuskaisuuteen (maxGust - averageSpeed).
 * @src/types.d.ts {ReadonlySignal<{ angle: number, duration: number }>}
 */
const swingAnimation = computed(() => {
    const wind = WIND_VARIATIONS.value;
    if (!wind) {
        return { angle: 0, duration: 0 };
    }

    // Tämä logiikka toimii nyt, koska WIND_VARIATIONS tuottaa nämä arvot.
    const { averageSpeed, maxGust, windRef } = wind;
    const gustDiff = maxGust - averageSpeed;

    // Mitä suurempi puuskaisuus, sitä voimakkaampi heiluriliike.
    const baseAngle = Math.min(gustDiff * 1.5, 20);
    const baseDuration = Math.max(3 - gustDiff * 0.15, 1);

    return calculateAnimationParams(baseAngle, baseDuration, windRef);
});

export function DynamicParachute() {
    /** @type {import("preact").RefObject<SVGElement>} */
    const svgRef = useRef(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!(svg instanceof SVGElement)) return;

        const swingContainer = svg.closest(".swing-container");
        const rotateContainer = svg.closest(".rotate-container");

        svg.style.setProperty("--parachute-color", parachuteColor.value);

        if (swingContainer instanceof HTMLElement) {
            const { angle, duration } = swingAnimation.value;
            swingContainer.style.setProperty("--swing-angle", `${angle}deg`);
            swingContainer.style.setProperty(
                "--swing-animation",
                `swing ${duration}s ease-in-out infinite alternate`,
            );
        }

        if (rotateContainer instanceof HTMLElement) {
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
            } else {
                rotateContainer.style.removeProperty("--rotate-animation");
            }
        }
    }, [parachuteColor.value, rotationAnimation.value, swingAnimation.value]);

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
