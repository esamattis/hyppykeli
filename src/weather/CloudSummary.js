// @ts-check
import {
    CompactCavok,
    CompactCloudLayers,
    CompactOpenMeteoCloudLayers,
} from "#app/weather/CompactCloudLayer.js";
import { DROPZONE_ELEVATION } from "#app/app/settings.js";
import { FromNow } from "#app/shared/FromNow.js";
import { MetarHelp } from "#app/weather/MetarHelp.js";
import { Help } from "#app/shared/Help.js";
import { Icon } from "#app/shared/icons.js";
import { whenAll } from "#app/shared/values.js";
import { summaryStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { CloudForecastTable } from "#app/weather/CloudForecastTable.js";
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
                <h3
                    class="cloud-observation-heading text-rem-0-75 font-medium m-0"
                >
                    ${t("cloud.modelledLayers")}
                </h3>
                <div class="cloud-source-help">
                    ${h(DataSource, { sources: ["Open-Meteo"] })}
                    ${h(
                        Help,
                        {
                            id: "open-meteo-cloud-help",
                            label: `Open-Meteo · ${t("cloud.modelledLayers")}`,
                        },
                        html`
                            <h3 class="mt-0">
                                Open-Meteo · ${t("cloud.modelledLayers")}
                            </h3>
                            <p>${t("cloud.modelledMeaning")}</p>
                            <p>${t("cloud.modelledCoverage")}</p>
                            <p>${t("cloud.modelledSummaryHelp")}</p>
                            ${h(DataSource, { sources: ["Open-Meteo"] })}
                        `,
                    )}
                </div>
            </div>
            <div class="cloud-profile-content">
                ${
                    profile
                        ? html`
                              <div
                                  class="cloud-list cloud-layers compact-cloud-layers font-heading cloud-profile-layers p-0 my-3"
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
                              <p class="summary-time text-rem-0-85">
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
        .cloud-source-help {
            display: flex;
            align-items: center;
            gap: var(--spacing-1);
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
        }
        .cloud-observation-heading {
            color: var(--color-muted);
            letter-spacing: 0.03em;
        }
        .cloud-warning {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
            border-radius: var(--radius-sm);
        }
        .cloud-warning {
            color: var(--color-danger);
            background: var(--color-danger-soft);
        }
        .cloud-warning > span {
            flex: 1;
        }
        .cloud-observation-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--spacing-2);
            color: var(--color-muted);
        }
        .cloud-observation-footer .summary-time {
            margin: 0;
        }
        .condensation-reading {
            display: flex;
            align-items: center;
            gap: var(--spacing-1-5);
            font-variant-numeric: tabular-nums;
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
        .metar {
            display: block;
            width: 100%;
            min-width: 0;
            overflow-wrap: anywhere;
            white-space: normal;
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
                        <div
                            class="condensation condensation-reading text-rem-0-8"
                        >
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
                                  <h3
                                      class="cloud-observation-heading text-rem-0-75 font-medium m-0"
                                  >
                                      ${t("cloud.observedLayers")}
                                  </h3>
                                  <div class="cloud-source-help">
                                      ${h(DataSource, { sources: ["METAR"] })}
                                      ${h(MetarHelp, { report: metar.metar })}
                                  </div>
                              </div>
                              <div
                                  class="cloud-list cloud-layers compact-cloud-layers font-heading p-0 my-3"
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
                                                class="cloud-warning text-rem-0-9 font-semibold mt-2 py-3 px-3.5"
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
                                                            class="metar font-mono text-rem-0-8 mt-2 pb-1"
                                                        >
                                                            //////CB
                                                        </p>
                                                    `,
                                                )}
                                            </div>
                                        `
                                      : null
                              }
                              <div
                                  class="cloud-observation-footer text-rem-0-75 mt-3"
                              >
                                  <div class="summary-time text-inherit">
                                      ${h(FromNow, { date: time })}
                                  </div>
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
                                  <h3
                                      class="cloud-observation-heading text-rem-0-75 font-medium"
                                  >
                                      ${t("cloud.forecast12h")}
                                  </h3>
                                  ${h(TableDialog, {
                                      id: "cloud-forecast-table",
                                      title: t("cloud.forecastTable"),
                                      children: h(CloudForecastTable, {
                                          forecasts,
                                      }),
                                  })}
                              </div>
                              ${h(CloudForecastTable, {
                                  forecasts,
                                  summary: true,
                              })}
                          </section>
                      `
                    : null
            }
        </div>
    `;
}
