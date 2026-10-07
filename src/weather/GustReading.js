// @ts-check
import { windStatusStyles } from "#app/styles.js";
import { css, useScope } from "#app/useScope.js";
import { getWarningLevel } from "#app/weather/calculations.js";
import { LATEST_OBSERVATION } from "#app/weather/state.js";
import { html } from "htm/preact";

export function GustReading() {
    const scope = useScope(css`
        .latest-value {
            display: flex;
            align-items: baseline;
            gap: var(--spacing-1);
            font-size: clamp(1.25rem, 3vw, 1.75rem);
            font-weight: 650;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }
        .unit {
            font-size: 0.65em;
            font-weight: normal;
        }
        ${windStatusStyles}
    `);
    const gust = LATEST_OBSERVATION.value?.gust;
    return html`
        <span>
            ${scope.style}
            <span
                class=${"latest-value latest-gust " + getWarningLevel(gust ?? 0)}
            >
                ${gust?.toFixed(0) ?? "-"}
                <span class="unit">m/s</span>
            </span>
        </span>
    `;
}
