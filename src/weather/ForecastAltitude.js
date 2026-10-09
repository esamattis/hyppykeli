// @ts-check
import {
    formatExactAltitude,
    formatForecastAltitude,
} from "#app/weather/altitudes.js";
import { html } from "htm/preact";

/** @param {ForecastAltitudeProps} props */
export function ForecastAltitude({ height, reference, approximate = false }) {
    return html`
        <span
            tabindex="0"
            data-tooltip=${`${reference}: ${formatExactAltitude(height)}`}
        >
            ${approximate ? "≈ " : ""}${formatForecastAltitude(height)}
        </span>
    `;
}
