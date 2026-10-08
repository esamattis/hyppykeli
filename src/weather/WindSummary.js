// @ts-check
import { Icon } from "#app/shared/icons.js";
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
        .hourly-variation-row {
            display: flex;
            align-items: center;
            gap: var(--spacing-1);
            min-height: 1.5rem;
            margin-top: var(--spacing-1);
        }
        .wind-metrics .hourly-range {
            width: fit-content;
            color: var(--color-muted);
            font-size: 0.8rem;
            font-weight: normal;
        }
        .wind-metrics .hourly-range.has-warning {
            font-weight: 700;
        }
        .gust-value-row {
            display: flex;
            align-items: baseline;
            gap: var(--spacing-1);
        }
        .wind-variation-warning {
            color: var(--color-warning);
            display: inline-flex;
            align-self: center;
            flex-shrink: 0;
            font-size: 1.5rem;
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
    const gustRange = getHourlyWindRange(observations, "gust", now);
    const directionRange = getHourlyWindRange(observations, "direction", now);
    /** @param {"gust" | "speed" | "direction"} key */
    function hourlyRange(key) {
        const range =
            key === "gust"
                ? gustRange
                : key === "direction"
                  ? directionRange
                  : getHourlyWindRange(observations, key, now);
        if (!range) return null;
        const unit = key === "direction" ? "°" : " m/s";
        const warning = key === "speed" ? null : variationWarning(key);
        return html`
            <dd class="hourly-variation-row">
                <span
                    class=${"hourly-range" + (warning ? " has-warning" : "")}
                    data-tooltip=${t(key === "direction" ? "weather.directionVariationHelp" : "weather.windVariationHelp")}
                    tabindex="0"
                >
                    Δ ${Math.round(range.max - range.min)}${unit}
                </span>
                ${warning}
            </dd>
        `;
    }
    /** @param {"gust" | "direction"} key */
    function variationWarning(key) {
        const range = key === "gust" ? gustRange : directionRange;
        if (
            !range ||
            !(key === "gust"
                ? range.max - range.min >= 8
                : range.max - range.min >= 100)
        )
            return null;
        const label = t(
            key === "gust"
                ? "weather.gustVariationWarning"
                : "weather.directionVariationWarning",
            (range.max - range.min).toFixed(1),
        );
        return html`
            <span
                class="wind-variation-warning"
                data-tooltip=${label}
                tabindex="0"
            >
                ${h(Icon, { name: "warning", label })}
            </span>
        `;
    }

    return html`
        <div class="wind-summary">
            ${scope.style}
            <dl class="summary-metrics wind-metrics">
                <div class="latest-wind-cell">
                    <dt>${t("weather.gust")}</dt>
                    <dd class="gust-value-row">${h(GustReading, {})}</dd>
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
