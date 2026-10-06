// @ts-check
import { DROPZONE_ELEVATION } from "#app/app/settings.js";
import { Help } from "#app/shared/Help.js";
import { formatClock, formatDate } from "#app/shared/dates.js";
import { isNullish, whenAll } from "#app/shared/values.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { ForecastAltitude } from "#app/weather/ForecastAltitude.js";
import { formatExactAltitude } from "#app/weather/altitudes.js";
import { CloudCoverSquare } from "#app/weather/CloudIndicators.js";
import { getLiftedCondensationLevel } from "#app/weather/calculations.js";
import {
    forecastTime,
    getOpenMeteoCloudLayer,
} from "#app/weather/providers/openMeteo.js";
import { OM_DATA } from "#app/weather/state.js";
import { h, html } from "htm/preact";

/** @type {OpenMeteoPressureLevel[]} */
const CLOUD_FORECAST_LEVELS = ["600", "700", "850", "925", "1000"];

/**
 * @param {Object} props
 * @param {WeatherData[]} props.forecasts
 */
export function CloudForecastTable(props) {
    const scope = useScope(css`
        .forecast-scroll {
            isolation: isolate;
        }
        .cloud-forecast-detail-table {
            font-size: 0.75rem;
            line-height: 1.3;
        }
        .cloud-forecast-detail-table th,
        .cloud-forecast-detail-table td {
            padding: 4px 6px;
        }
        .cloud-forecast-detail-table thead th,
        .cloud-forecast-detail-table tbody th {
            font-size: 0.75rem;
        }
        .cloud-forecast-detail-table tr > :first-child {
            position: sticky;
            left: 0;
            z-index: 1;
            background: var(--color-surface-soft);
            text-align: left;
        }
        .cloud-forecast-detail-table tbody th {
            min-width: 9ch;
        }
        .cloud-forecast-detail-table tr > :not(:first-child) {
            width: 2.75rem;
            min-width: 0;
            padding-inline: 0;
        }
        .cloud-forecast-detail-table tbody tr + tr > * {
            border-top: 0;
        }
        .cloud-forecast-detail-table tr:has(.forecast-reading) > th {
            padding-block: 0;
        }
        .cloud-forecast-detail-table
            tr.forecast-group-start:not(:first-child)
            > * {
            border-top: 3px solid var(--color-border);
        }
        .forecast-source-label {
            display: block;
            margin-top: 4px;
            margin-bottom: 3px;
            color: var(--color-primary);
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            line-height: 1;
            text-transform: uppercase;
        }
        .cloud-forecast-detail-table .forecast-reading {
            position: relative;
            height: 1.75rem;
            padding: 0;
        }
        .cloud-forecast-note {
            margin: 8px 0 0;
            color: var(--color-muted);
            font-size: 0.75rem;
        }
    `);
    const openMeteo = OM_DATA.value;
    const elevation = DROPZONE_ELEVATION.value;
    const openMeteoIndexes = new Map(
        openMeteo?.hourly.time.map((time, index) => [
            forecastTime(time, openMeteo.utc_offset_seconds).getTime(),
            index,
        ]) ?? [],
    );

    return html`
        <div class="cloud-forecast-details">
            ${scope.style}
            <div
                class="forecast-scroll"
                tabindex="0"
                role="region"
                aria-label=${t("cloud.hourlyForecast")}
            >
                <table class="cloud-forecast-table cloud-forecast-detail-table">
                    <thead>
                        <tr>
                            <th scope="col">${t("weather.clock")}</th>
                            ${props.forecasts.map(
                                (forecast) => html`
                                    <th
                                        scope="col"
                                        title=${formatDate(forecast.time)}
                                    >
                                        ${formatClock(forecast.time)}
                                    </th>
                                `,
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="forecast-group-start">
                            <th scope="row">
                                <span class="forecast-source-label">FMI</span>
                                ${t("weather.condensationLevelShort")}
                                ${h(
                                    Help,
                                    {
                                        label: `${t("weather.condensationLevel")}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>
                                            ${t("weather.condensationLevel")}
                                        </h3>
                                        <p>
                                            ${t("cloud.condensationForecastHelp")}
                                        </p>
                                    `,
                                )}
                            </th>
                            ${props.forecasts.map(
                                (forecast) => html`
                                    <td class="forecast-label">
                                        ${
                                            whenAll(
                                                [
                                                    forecast.temperature,
                                                    forecast.dewPoint,
                                                ],
                                                (temp, dew) =>
                                                    `${getLiftedCondensationLevel(temp, dew)}M`,
                                            ) ?? "—"
                                        }
                                    </td>
                                `,
                            )}
                        </tr>
                        ${[
                            {
                                label: t("cloud.totalCover"),
                                altitude: "0+ km",
                                help: t("cloud.totalCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.totalCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.highCover"),
                                altitude: "5–9+ km",
                                help: t("cloud.highCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.highCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.middleCover"),
                                altitude: "2–6 km",
                                help: t("cloud.middleCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.middleOnlyCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.middleAndLowCover"),
                                altitude: "0–6 km",
                                help: t("cloud.middleAndLowCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.middleCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.lowCover"),
                                altitude: "0–2 km",
                                help: t("cloud.lowCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.lowCloudCover,
                                ),
                            },
                        ].map(
                            (row) => html`
                                <tr>
                                    <th scope="row">
                                        ${row.altitude}
                                        ${h(
                                            Help,
                                            {
                                                label: `${row.label}: ${t("common.help")}`,
                                            },
                                            html`
                                                <h3>${row.label}</h3>
                                                <p>${row.help}</p>
                                                <p>
                                                    ${t("cloud.fmiCoverHelp")}
                                                </p>
                                            `,
                                        )}
                                    </th>
                                    ${row.values.map(
                                        (percentage) => html`
                                            <td class="forecast-reading">
                                                ${
                                                    isNullish(percentage)
                                                        ? "—"
                                                        : h(CloudCoverSquare, {
                                                              percentage,
                                                          })
                                                }
                                            </td>
                                        `,
                                    )}
                                </tr>
                            `,
                        )}
                        ${CLOUD_FORECAST_LEVELS.map((level) => {
                            const layers = props.forecasts.map((forecast) =>
                                getOpenMeteoCloudLayer(
                                    openMeteo,
                                    openMeteoIndexes.get(
                                        forecast.time.getTime(),
                                    ),
                                    level,
                                    elevation,
                                ),
                            );
                            const rowAltitude = layers.find(
                                (layer) => layer,
                            )?.height;

                            return html`
                                <tr
                                    class=${level === CLOUD_FORECAST_LEVELS[0] ? "forecast-group-start" : undefined}
                                >
                                    <th scope="row" title=${`${level} hPa`}>
                                        ${
                                            level === CLOUD_FORECAST_LEVELS[0]
                                                ? html`
                                                      <span
                                                          class="forecast-source-label"
                                                      >
                                                          Open-Meteo
                                                      </span>
                                                  `
                                                : null
                                        }
                                        ${
                                            isNullish(rowAltitude)
                                                ? t("common.noData")
                                                : h(ForecastAltitude, {
                                                      height: rowAltitude,
                                                      reference: `${level} hPa · ${t("cloud.altitudeAboveDropzone")}`,
                                                  })
                                        }
                                    </th>
                                    ${layers.map((layer) => {
                                        const cover = layer?.cover;
                                        return html`
                                            <td
                                                class="forecast-reading"
                                                tabindex=${layer ? 0 : undefined}
                                                data-tooltip=${layer ? `${level} hPa · ${t("cloud.altitudeAboveDropzone")}: ${formatExactAltitude(layer.height)}` : undefined}
                                            >
                                                ${
                                                    isNullish(cover)
                                                        ? "—"
                                                        : h(CloudCoverSquare, {
                                                              percentage: cover,
                                                          })
                                                }
                                            </td>
                                        `;
                                    })}
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
            </div>
            <p class="cloud-forecast-note">
                Open-Meteo:
                ${t("cloud.dropzoneHeights", String(Math.round(elevation)))}
            </p>
            <p class="cloud-forecast-note">${t("cloud.forecastTableHelp")}</p>
        </div>
    `;
}
