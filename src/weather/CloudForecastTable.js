// @ts-check
import { DROPZONE_ELEVATION } from "#app/app/settings.js";
import { getJumpRunExitHeight } from "#app/map/mapState.js";
import { Help } from "#app/shared/Help.js";
import { formatClock, formatDate } from "#app/shared/dates.js";
import { isNullish, whenAll } from "#app/shared/values.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { ForecastAltitude } from "#app/weather/ForecastAltitude.js";
import { CloudCoverSquare } from "#app/weather/CloudIndicators.js";
import { getLiftedCondensationLevel } from "#app/weather/calculations.js";
import {
    forecastTime,
    getOpenMeteoCloudLayer,
} from "#app/weather/providers/openMeteo.js";
import { OM_DATA } from "#app/weather/state.js";
import { h, html } from "htm/preact";

/** @type {OpenMeteoCloudPressureLevel[]} */
const CLOUD_FORECAST_LEVELS = ["600", "700", "850", "925", "1000"];

/**
 * @param {Object} props
 * @param {WeatherData[]} props.forecasts
 * @param {boolean} [props.summary]
 */
export function CloudForecastTable(props) {
    const summary = props.summary ?? false;
    const dayStarts = props.forecasts.map(
        (forecast, index) =>
            index > 0 &&
            forecast.time.toDateString() !==
                props.forecasts[index - 1]?.time.toDateString(),
    );
    const scope = useScope(css`
        .forecast-scroll {
            isolation: isolate;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scrollbar-width: thin;
        }
        .forecast-scroll:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }
        .cloud-forecast-detail-table {
            border-collapse: separate;
            border-spacing: 0;
            width: max-content;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
            line-height: 1.3;
        }
        .cloud-forecast-detail-table th,
        .cloud-forecast-detail-table td {
            padding: var(--spacing-1) var(--spacing-1-5);
            text-align: center;
            white-space: nowrap;
        }
        .cloud-forecast-detail-table tr > :first-child {
            position: sticky;
            left: 0;
            z-index: 1;
            background: var(--color-surface-soft);
            text-align: left;
        }
        .cloud-forecast-detail-table tbody th {
            color: var(--color-muted);
            white-space: normal;
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
        .cloud-forecast-detail-table .forecast-day-start {
            border-inline-start: 2px solid var(--color-border);
        }
        :scope:not(.cloud-forecast-summary) tbody tr:hover > td {
            position: relative;
        }
        :scope:not(.cloud-forecast-summary) tbody tr:hover > *::after {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 2;
            pointer-events: none;
            border-block: 2px solid var(--color-primary);
        }
        :scope:not(.cloud-forecast-summary)
            tbody
            tr:hover
            > :first-child::after {
            border-inline-start: 2px solid var(--color-primary);
        }
        :scope:not(.cloud-forecast-summary)
            tbody
            tr:hover
            > :last-child::after {
            border-inline-end: 2px solid var(--color-primary);
        }
        .forecast-source-label {
            display: block;
            color: var(--color-muted);
            letter-spacing: 0.03em;
            line-height: 1;
        }
        .forecast-altitude-label {
            color: var(--color-text);
        }
        .cloud-forecast-detail-table .forecast-reading {
            position: relative;
            height: 1.75rem;
            padding: 0;
        }
        .cloud-forecast-note {
            color: var(--color-muted);
        }
        .cloud-forecast-scale {
            max-width: 20rem;
        }
        .cloud-forecast-scale figcaption {
            color: var(--color-muted);
        }
        .cloud-forecast-scale-samples {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            overflow: hidden;
            border: 1px solid var(--color-border);
            border-radius: var(--spacing-1);
        }
        .cloud-forecast-scale-sample {
            position: relative;
            height: 1.75rem;
        }
    `);
    const openMeteo = OM_DATA.value;
    const elevation = DROPZONE_ELEVATION.value;
    const exitHeight = getJumpRunExitHeight();
    const cloudRange = `0–${exitHeight / 1000} km`;
    const openMeteoIndexes = new Map(
        openMeteo?.hourly.time.map((time, index) => [
            forecastTime(time, openMeteo.utc_offset_seconds).getTime(),
            index,
        ]) ?? [],
    );

    const openMeteoRows = CLOUD_FORECAST_LEVELS.map((level) => ({
        level,
        layers: props.forecasts.map((forecast) =>
            getOpenMeteoCloudLayer(
                openMeteo,
                openMeteoIndexes.get(forecast.time.getTime()),
                level,
                elevation,
            ),
        ),
    }));
    const openMeteoCover = props.forecasts.map((_, index) => {
        const layers = openMeteoRows.flatMap(({ layers }) => {
            const layer = layers[index];
            return layer ? [layer] : [];
        });
        // Use the closest sampled level as the top of the range. On a tie,
        // prefer the lower level so we do not include an extra layer above exit.
        const nearest = layers.toSorted(
            (a, b) =>
                Math.abs(a.height - exitHeight) -
                    Math.abs(b.height - exitHeight) || a.height - b.height,
        )[0];
        return nearest
            ? Math.max(
                  ...layers
                      .filter((layer) => layer.height <= nearest.height)
                      .map((layer) => layer.cover),
              )
            : null;
    });

    return html`
        <div
            class=${`cloud-forecast-details${summary ? " cloud-forecast-summary" : ""}`}
        >
            ${scope.style}
            <div
                class="forecast-scroll"
                tabindex="0"
                role="region"
                aria-label=${t("cloud.hourlyForecast")}
            >
                <table
                    class="cloud-forecast-table cloud-forecast-detail-table text-rem-0-75"
                >
                    <thead>
                        <tr>
                            <th scope="col">${t("weather.clock")}</th>
                            ${props.forecasts.map(
                                (forecast, index) => html`
                                    <th
                                        scope="col"
                                        class=${dayStarts[index] ? "forecast-day-start" : ""}
                                        data-tooltip=${formatDate(forecast.time)}
                                    >
                                        ${formatClock(forecast.time)}
                                    </th>
                                `,
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            summary
                                ? null
                                : html`
                                      <tr class="forecast-group-start">
                                          <th class="font-normal" scope="row">
                                              <span
                                                  class="forecast-source-label text-rem-0-6 font-medium mt-1 mb-1"
                                              >
                                                  FMI
                                              </span>
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
                                              (forecast, index) => html`
                                                  <td
                                                      class=${`forecast-label${dayStarts[index] ? " forecast-day-start" : ""}`}
                                                  >
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
                                  `
                        }
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
                                summary: true,
                                altitude: "0–2 km",
                                help: t("cloud.lowCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.lowCloudCover,
                                ),
                            },
                        ]
                            .filter((row) => !summary || row.summary)
                            .map(
                                (row) => html`
                                    <tr>
                                        <th class="font-normal" scope="row">
                                            ${
                                                summary
                                                    ? html`
                                                          <span
                                                              class="forecast-source-label text-rem-0-6 font-medium mt-1 mb-1"
                                                          >
                                                              FMI
                                                          </span>
                                                      `
                                                    : null
                                            }
                                            <span
                                                class="forecast-altitude-label font-semibold"
                                            >
                                                ${row.altitude}
                                            </span>
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
                                            (percentage, index) => html`
                                                <td
                                                    class=${`forecast-reading${dayStarts[index] ? " forecast-day-start" : ""}`}
                                                >
                                                    ${
                                                        isNullish(percentage)
                                                            ? "—"
                                                            : h(
                                                                  CloudCoverSquare,
                                                                  {
                                                                      percentage,
                                                                  },
                                                              )
                                                    }
                                                </td>
                                            `,
                                        )}
                                    </tr>
                                `,
                            )}
                        <tr class="forecast-group-start">
                            <th class="font-normal" scope="row">
                                <span
                                    class="forecast-source-label text-rem-0-6 font-medium mt-1 mb-1"
                                >
                                    Open-Meteo
                                </span>
                                <span
                                    class="forecast-altitude-label font-semibold"
                                >
                                    ${cloudRange}
                                </span>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("cloud.rangeCover", cloudRange)}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>
                                            ${t("cloud.rangeCover", cloudRange)}
                                        </h3>
                                        <p>${t("cloud.rangeCoverHelp")}</p>
                                    `,
                                )}
                            </th>
                            ${openMeteoCover.map(
                                (percentage, index) => html`
                                    <td
                                        class=${`forecast-reading${dayStarts[index] ? " forecast-day-start" : ""}`}
                                    >
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
                        ${(summary ? [] : openMeteoRows).map(
                            ({ level, layers }) => {
                                const rowAltitude = layers.find(
                                    (layer) => layer,
                                )?.height;

                                return html`
                                    <tr>
                                        <th
                                            class="font-normal"
                                            scope="row"
                                            title=${`${level} hPa`}
                                        >
                                            ${
                                                isNullish(rowAltitude)
                                                    ? t("common.noData")
                                                    : h(ForecastAltitude, {
                                                          height: rowAltitude,
                                                          reference: `${level} hPa · ${t("cloud.altitudeAboveDropzone")}`,
                                                      })
                                            }
                                        </th>
                                        ${layers.map((layer, index) => {
                                            const cover = layer?.cover;
                                            return html`
                                                <td
                                                    class=${`forecast-reading${dayStarts[index] ? " forecast-day-start" : ""}`}
                                                >
                                                    ${
                                                        isNullish(cover)
                                                            ? "—"
                                                            : h(
                                                                  CloudCoverSquare,
                                                                  {
                                                                      percentage:
                                                                          cover,
                                                                  },
                                                              )
                                                    }
                                                </td>
                                            `;
                                        })}
                                    </tr>
                                `;
                            },
                        )}
                    </tbody>
                </table>
            </div>
            ${
                summary
                    ? null
                    : html`
                          <figure class="cloud-forecast-scale m-0 mt-3">
                              <figcaption class="text-rem-0-7 mb-1">
                                  ${t("cloud.coverScale")}
                              </figcaption>
                              <div class="cloud-forecast-scale-samples">
                                  ${[0, 20, 40, 60, 80, 100].map(
                                      (percentage) => html`
                                          <div
                                              class="cloud-forecast-scale-sample"
                                          >
                                              ${h(CloudCoverSquare, { percentage })}
                                          </div>
                                      `,
                                  )}
                              </div>
                          </figure>
                      `
            }
            <p class="cloud-forecast-note text-rem-0-75 m-0 mt-2">
                ${t("cloud.forecastTableHelp")}
            </p>
        </div>
    `;
}
