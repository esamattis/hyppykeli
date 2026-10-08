// @ts-check
import {
    CompactCavok,
    CompactCloudLayers,
    CompactOpenMeteoCloudLayers,
} from "#app/weather/CompactCloudLayer.js";
import { DROPZONE_ELEVATION } from "#app/app/settings.js";
import { FromNow } from "#app/shared/FromNow.js";
import { Help } from "#app/shared/Help.js";
import { formatClock, formatDate } from "#app/shared/dates.js";
import { Icon } from "#app/shared/icons.js";
import { isNullish, whenAll } from "#app/shared/values.js";
import { summaryStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { CloudForecastTable } from "#app/weather/CloudForecastTable.js";
import { PercentageCloudCover } from "#app/weather/CloudIndicators.js";
import { DataSource } from "#app/weather/DataSource.js";
import { TableDialog } from "#app/weather/WeatherTables.js";
import {
    formatCloudBase,
    getLiftedCondensationLevel,
} from "#app/weather/calculations.js";
import { getOpenMeteoCloudProfile } from "#app/weather/providers/openMeteo.js";
import {
    FORECAST_SOURCE,
    HOURLY_CLOUD_FORECASTS,
    LATEST_OBSERVATION,
    METARS,
    OM_DATA,
    weatherSourceLabel,
} from "#app/weather/state.js";
import { h, html } from "htm/preact";

/** @param {{ profile: OpenMeteoCloudProfile | null }} props */
function OpenMeteoClouds({ profile }) {
    const scope = useScope(css`
        :scope {
        }
        .cloud-profile-content {
            display: flow-root;
        }
        .cloud-clear {
            display: flex;
            align-items: center;
            gap: var(--spacing-1-5);
        }
        .cloud-profile-header {
            display: flex;
            justify-content: space-between;
            gap: var(--spacing-3);
        }
    `);
    return html`
        <section class="open-meteo-clouds mt-3" aria-label="Open-Meteo">
            ${scope.style}
            <div class="cloud-profile-header">
                <h3 class="cloud-observation-heading m-0">
                    ${t("cloud.modelledLayers")}
                </h3>
                ${h(DataSource, { sources: ["Open-Meteo"] })}
            </div>
            <div class="cloud-profile-content">
                ${
                    profile
                        ? html`
                              <div
                                  class="cloud-list cloud-layers compact-cloud-layers cloud-profile-layers p-0 my-3"
                              >
                                  ${
                                      profile.layers.length
                                          ? h(CompactOpenMeteoCloudLayers, {
                                                layers: profile.layers,
                                            })
                                          : html`
                                                <div class="cloud-clear">
                                                    ${h(Icon, { name: "cloudClear", size: 20, label: t("cloud.none") })}
                                                    <span>
                                                        ${t("cloud.none")}
                                                    </span>
                                                </div>
                                            `
                                  }
                              </div>
                              <p class="summary-time">
                                  ${h(FromNow, { date: profile.time })}
                              </p>
                          `
                        : html`
                              <p>${t("cloud.modelUnavailable")}</p>
                          `
                }
            </div>
        </section>
    `;
}

export function CloudSummary() {
    const scope = useScope(css`
        ${summaryStyles}
        .cloud-card-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-2);
        }
        .cloud-card-heading h2 {
            margin: 0;
        }
        .source-note {
            margin: 0;
            text-align: right;
        }
        .cloud-observation-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: var(--spacing-3);
        }
        .cloud-list {
            list-style: none;
        }
        .cloud-layers {
            display: grid;
            gap: 0;
        }
        .compact-cloud-layers {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-3);
            font-weight: 650;
        }
        .cloud-observation-heading {
            color: var(--color-muted);
            font-size: 0.75rem;
            font-weight: 500;
            letter-spacing: 0.03em;
        }
        .cloud-warning {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
        }
        .cloud-warning {
            color: var(--color-danger);
            background: var(--color-danger-soft);
            font-weight: 600;
        }
        .cloud-warning > span {
            flex: 1;
        }
        .cloud-observation-footer {
            position: relative;
            color: var(--color-muted);
            font-size: 0.75rem;
        }
        .cloud-observation-footer .summary-time {
            position: absolute;
            inset-block-start: 0;
            inset-inline-start: 0;
            margin: 0;
            font-size: inherit;
        }
        .cloud-metar-details {
            width: 100%;
            min-width: 0;
            max-width: 100%;
        }
        .cloud-metar-details summary {
            width: max-content;
            margin-inline-start: auto;
            cursor: pointer;
        }
        .condensation-reading {
            display: flex;
            align-items: center;
            gap: var(--spacing-1-5);
            font-variant-numeric: tabular-nums;
            font-size: 0.8rem;
            white-space: nowrap;
        }
        .cloud-forecast {
            border-top: 1px solid var(--color-border);
        }
        .forecast-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-3);
        }
        .forecast-heading h3 {
            margin: 0 auto 0 0;
        }
        .forecast-heading .source-note {
            margin: 0;
        }
        .forecast-scroll {
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scrollbar-width: thin;
        }
        .forecast-scroll:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }
        .cloud-forecast-table {
            border-collapse: separate;
            border-spacing: 0;
            width: max-content;
            font-variant-numeric: tabular-nums;
            font-size: 0.8rem;
            white-space: nowrap;
        }
        .cloud-forecast-table th,
        .cloud-forecast-table td {
            padding: var(--spacing-2-5) var(--spacing-3);
            text-align: center;
            white-space: nowrap;
        }
        .cloud-forecast-table thead th {
            font-size: 0.85rem;
        }
        .cloud-forecast-table tbody th {
            color: var(--color-muted);
            font-size: 0.85rem;
            font-weight: normal;
            white-space: normal;
            min-width: 10ch;
        }
        .cloud-forecast-table td {
            min-width: 7ch;
            font-weight: 650;
        }
        .cloud-forecast-table tbody tr + tr > * {
            border-top: 1px solid var(--color-border);
        }
        .forecast-reading {
            vertical-align: middle;
        }
        .forecast-reading .cloud-cover {
            align-items: center;
        }
        .metar {
            display: block;
            width: 100%;
            min-width: 0;
            overflow-wrap: anywhere;
            white-space: normal;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-muted);
        }
    `);

    const metar = METARS.value?.at(-1);
    const profile = getOpenMeteoCloudProfile(
        OM_DATA.value,
        DROPZONE_ELEVATION.value,
    );
    const modelLayers =
        profile?.layers.filter((layer) => layer.cover > 0) ?? [];
    const metarLayers =
        metar?.clouds.filter(
            (cloud) => !["NCD", "NSC"].includes(cloud.amount),
        ) ?? [];
    const hasClouds = Boolean(
        metarLayers.length || metar?.cbWithoutLayer || modelLayers.length,
    );
    const latest = LATEST_OBSERVATION.value;
    const time = metar?.time ?? latest?.time;
    const forecasts =
        FORECAST_SOURCE.value === "FMI" ? HOURLY_CLOUD_FORECASTS.value : [];

    const cavok = metar?.clouds.length === 0 && metar.metar.includes("CAVOK");

    return html`
        <div class="cloud-summary">
            ${scope.style}
            <div class="cloud-card-heading mb-4">
                <h2 class="h2-with-icon">${t("weather.clouds")}</h2>
                ${whenAll(
                    [latest?.temperature, latest?.dewPoint],
                    (temp, dew) => html`
                        <div class="condensation condensation-reading">
                            <span>
                                ${t("weather.condensationLevelShort")}${" "}
                                ${formatCloudBase(getLiftedCondensationLevel(temp, dew), "m")}
                            </span>
                            ${h(
                                Help,
                                {
                                    id: "dewpoint",
                                    label: t("weather.condensationLevel"),
                                },
                                html`
                                    <h3>${t("weather.condensationLevel")}</h3>
                                    <p>
                                        ${t("cloud.estimateHelp", temp.toFixed(1), dew.toFixed(1))}
                                        ${h(FromNow, { date: latest?.time })}
                                    </p>
                                    <p>${t("cloud.estimateCaveat")}</p>
                                    ${h(DataSource, {
                                        sources: [
                                            weatherSourceLabel(latest?.source),
                                        ],
                                    })}
                                `,
                            )}
                        </div>
                    `,
                )}
            </div>
            <div>
                ${
                    metar
                        ? html`
                              <div class="cloud-observation-header">
                                  <h3 class="cloud-observation-heading m-0">
                                      ${t("cloud.observedLayers")}
                                  </h3>
                                  ${h(DataSource, { sources: ["METAR"] })}
                              </div>
                              <div
                                  class="cloud-list cloud-layers compact-cloud-layers p-0 my-3"
                              >
                                  ${
                                      cavok
                                          ? h(CompactCavok, { focusable: true })
                                          : !hasClouds
                                            ? html`
                                                  <div
                                                      class="cloud-clear"
                                                      tabindex="0"
                                                      data-tooltip=${t(metar.clouds.some((cloud) => cloud.amount === "NSC") ? "cloud.noSignificant" : "cloud.none")}
                                                  >
                                                      ${h(Icon, { name: "cloudClear", size: 20, label: t("cloud.none") })}
                                                  </div>
                                              `
                                            : h(CompactCloudLayers, {
                                                  clouds: metarLayers,
                                              })
                                  }
                              </div>
                              ${
                                  metar.cbWithoutLayer
                                      ? html`
                                            <div
                                                class="cloud-warning mt-2 py-3 px-3.5"
                                            >
                                                ${h(Icon, { name: "storm", size: 24 })}
                                                <span>
                                                    ${t("cloud.cumulonimbus")}
                                                </span>
                                                ${h(
                                                    Help,
                                                    {
                                                        label: t(
                                                            "cloud.cumulonimbusHelp",
                                                        ),
                                                    },
                                                    html`
                                                        <h3>
                                                            ${t("cloud.cumulonimbus")}
                                                        </h3>
                                                        <p>
                                                            ${t("cloud.cumulonimbusDescription")}
                                                        </p>
                                                        <p>
                                                            ${t("cloud.cumulonimbusUnknown")}
                                                        </p>
                                                        <h3>METAR</h3>
                                                        <p
                                                            class="metar mt-2 pb-1"
                                                        >
                                                            //////CB
                                                        </p>
                                                    `,
                                                )}
                                            </div>
                                        `
                                      : null
                              }
                              <div class="cloud-observation-footer mt-3">
                                  <div class="summary-time">
                                      ${h(FromNow, { date: time })}
                                  </div>
                                  <details class="cloud-metar-details">
                                      <summary>METAR</summary>
                                      <code
                                          class="metar mt-2 pb-1"
                                          tabindex="0"
                                          aria-label="METAR"
                                      >
                                          ${metar.metar}
                                      </code>
                                  </details>
                              </div>
                          `
                        : null
                }
                ${h(OpenMeteoClouds, {
                    profile: profile
                        ? { ...profile, layers: modelLayers }
                        : null,
                })}
            </div>

            ${
                forecasts.length
                    ? html`
                          <section
                              class="cloud-forecast mt-4 pt-4"
                              aria-label=${t("cloud.forecast")}
                          >
                              <div class="forecast-heading mb-3">
                                  <h3 class="cloud-observation-heading">
                                      ${t("cloud.forecast12h")}
                                  </h3>
                                  ${h(DataSource, {
                                      sources: ["FMI"],
                                  })}
                                  ${h(TableDialog, {
                                      id: "cloud-forecast-table",
                                      title: t("cloud.forecastTable"),
                                      children: h(CloudForecastTable, {
                                          forecasts,
                                      }),
                                  })}
                              </div>
                              <div
                                  class="forecast-scroll pb-1.5"
                                  tabindex="0"
                                  role="region"
                                  aria-label=${t("cloud.hourlyForecast")}
                              >
                                  <table class="cloud-forecast-table">
                                      <thead>
                                          <tr>
                                              ${forecasts.map(
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
                                          <tr>
                                              ${forecasts.map(
                                                  (forecast) => html`
                                                      <td
                                                          class="forecast-reading"
                                                      >
                                                          ${isNullish(forecast.lowCloudCover) ? "—" : h(PercentageCloudCover, { percentage: forecast.lowCloudCover })}
                                                      </td>
                                                  `,
                                              )}
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </section>
                      `
                    : null
            }
        </div>
    `;
}
