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
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        ${windStatusStyles}
    `);
    const gust = LATEST_OBSERVATION.value?.gust;
    return html`
        <span>
            ${scope.style}
            <span
                class=${"latest-value text-reading font-heading latest-gust " + getWarningLevel(gust ?? 0)}
            >
                ${gust?.toFixed(0) ?? "-"}
                <span class="unit text-em-0-65 font-normal">m/s</span>
            </span>
        </span>
    `;
}
