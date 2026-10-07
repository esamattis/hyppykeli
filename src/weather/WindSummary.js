// @ts-check
import { summaryStyles, windStatusStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { WindDirection } from "#app/weather/WeatherTables.js";
import { GustReading } from "#app/weather/GustReading.js";
import {
    getHourlyWindRange,
    hasValidAverageWindData,
} from "#app/weather/calculations.js";
import { LATEST_OBSERVATION, OBSERVATIONS } from "#app/weather/state.js";
import { h, html } from "htm/preact";

export function WindSummary() {
    const scope = useScope(css`
        ${summaryStyles}
        :scope {
            min-height: 5rem;
        }
        .wind-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .latest-wind-cell + .latest-wind-cell {
            border-left: 1px solid var(--color-border);
            padding-left: var(--spacing-3);
        }
        .wind-metrics .latest-value {
            display: flex;
            align-items: baseline;
            gap: var(--spacing-1);
            font-size: clamp(1.25rem, 3vw, 1.75rem);
            white-space: nowrap;
        }
        .wind-metrics .hourly-range {
            margin-top: var(--spacing-1);
            color: var(--color-muted);
            font-size: 0.8rem;
            font-weight: normal;
        }
        .latest-value .direction-value {
            width: auto;
        }
        .unit {
            font-size: 0.65em;
            font-weight: normal;
        }
        ${windStatusStyles}
    `);

    const obs = LATEST_OBSERVATION.value;

    if (obs && !hasValidAverageWindData(obs)) {
        return html`
            <div class="wind-summary">
                ${scope.style}
                <p>${t("common.noData")}</p>
            </div>
        `;
    }

    const observations =
        obs && OBSERVATIONS.value.includes(obs)
            ? OBSERVATIONS.value
            : obs
              ? [obs, ...OBSERVATIONS.value]
              : OBSERVATIONS.value;
    const now = Date.now();
    /** @param {"gust" | "speed" | "direction"} key */
    function hourlyRange(key) {
        const range = getHourlyWindRange(observations, key, now);
        if (!range || range.min === range.max) {
            return null;
        }
        const unit = key === "direction" ? "°" : " m/s";
        return html`
            <dd class="hourly-range">${range.min}–${range.max}${unit}</dd>
        `;
    }

    return html`
        <div class="wind-summary">
            ${scope.style}
            <dl class="summary-metrics wind-metrics">
                <div class="latest-wind-cell">
                    <dt>${t("weather.gust")}</dt>
                    <dd>${h(GustReading, {})}</dd>
                    ${hourlyRange("gust")}
                </div>
                <div class="latest-wind-cell">
                    <dt>${t("weather.wind")}</dt>
                    <dd class="latest-value latest-wind">
                        ${obs?.speed?.toFixed(0) ?? "?"}
                        <span class="unit">m/s</span>
                    </dd>
                    ${hourlyRange("speed")}
                </div>
                <div class="latest-wind-cell">
                    <dt>${t("weather.direction")}</dt>
                    <dd class="latest-value latest-wind">
                        ${h(WindDirection, { direction: obs?.direction, value: true })}
                    </dd>
                    ${hourlyRange("direction")}
                </div>
            </dl>
        </div>
    `;
}
