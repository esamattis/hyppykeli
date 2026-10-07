// @ts-check
import { cloudTypes } from "#app/weather/cloudTypes.js";
import { DROPZONE_ELEVATION } from "#app/app/settings.js";
import { FromNow } from "#app/shared/FromNow.js";
import { Help } from "#app/shared/Help.js";
import { formatClock, formatDate } from "#app/shared/dates.js";
import { CloudCoverIcon, Icon } from "#app/shared/icons.js";
import { isNullish, whenAll } from "#app/shared/values.js";
import { cloudLayerStyles, summaryStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { ForecastAltitude } from "#app/weather/ForecastAltitude.js";
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
import { useId, useState } from "preact/hooks";

/** @param {{ cloud: CloudLayer }} props */
function CloudLayer({ cloud }) {
    const scope = useScope(cloudLayerStyles);
    const type = cloudTypes()[cloud.amount];
    const hasBase =
        Number.isFinite(cloud.base) && !["NCD", "NSC"].includes(cloud.amount);
    return html`
        <li class="cloud-layer py-3.5 px-0">
            ${scope.style}
            <span class="cloud-layer-icon">
                ${h(Icon, { name: type?.icon ?? "cloudOvercast", size: 30 })}
                ${
                    cloud.cumulonimbus
                        ? html`
                              <span class="cloud-lightning">
                                  ${h(Icon, { name: "lightning", size: 20, label: t("cloud.cumulonimbus") })}
                              </span>
                          `
                        : null
                }
            </span>
            <div>
                <a class="cloud-layer-name" href=${cloud.href}>
                    ${type?.label ?? cloud.amount}
                </a>
                <span class="cloud-layer-coverage">
                    ${type?.coverage ?? cloud.amount}
                </span>
            </div>
            <div class="cloud-layer-base">
                ${
                    hasBase
                        ? html`
                              <b
                                  tabindex="0"
                                  data-tooltip=${`${formatCloudBase(cloud.base, cloud.unit, { maximumFractionDigits: 0 })} (${cloud.base} ${cloud.unit})`}
                              >
                                  ${formatCloudBase(cloud.base, cloud.unit, { approximate: true })}
                              </b>
                              <span class="cloud-base-label">
                                  ${cloud.amount === "VV" ? t("cloud.verticalVisibility") : t("cloud.base")}
                              </span>
                          `
                        : null
                }
            </div>
            ${h(
                Help,
                {},
                html`
                    <h3>
                        ${cloud.amount === "VV" ? t("cloud.verticalVisibility") : t("cloud.layer")}
                    </h3>
                    <p>
                        ${type?.explanation ?? `Pilvikerroksen METAR-koodi on ${cloud.amount}.`}
                    </p>
                    ${
                        cloud.cumulonimbus
                            ? html`
                                  <p>${t("cloud.cumulonimbusDescription")}</p>
                              `
                            : null
                    }
                    ${
                        hasBase
                            ? html`
                                  ${
                                      cloud.amount !== "VV"
                                          ? html`
                                                <p>${t("cloud.baseHelp")}</p>
                                            `
                                          : null
                                  }
                                  <p>${t("cloud.roundingHelp")}</p>
                              `
                            : null
                    }
                    <h3>METAR</h3>
                    <p class="metar mt-2 pb-1">
                        ${cloud.metarCode ?? cloud.amount}
                    </p>
                    ${
                        hasBase
                            ? html`
                                  <p>${t("cloud.metarHeightHelp")}</p>
                                  <p class="cloud-base-conversion">
                                      ${`${cloud.base} ${cloud.unit} = ${formatCloudBase(cloud.base, cloud.unit)}`}
                                  </p>
                              `
                            : null
                    }
                `,
            )}
        </li>
    `;
}

/** @param {{ layer: OpenMeteoCloudProfile["layers"][number] }} props */
function OpenMeteoCloudLayer({ layer }) {
    const scope = useScope(css`
        ${cloudLayerStyles}
        :scope {
            grid-template-columns: 36px minmax(0, 1fr) auto auto;
            gap: var(--spacing-2-5);
        }
        .cloud-layer-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
        }
        .cloud-layer-base b {
            font-size: 1.2rem;
        }
    `);
    return html`
        <li class="cloud-layer cloud-profile-layer py-2 px-0">
            ${scope.style}
            <span class="cloud-layer-icon">
                ${h(CloudCoverIcon, { percentage: layer.cover, size: 26 })}
            </span>
            <div>
                <span class="cloud-layer-name">
                    ${layer.cover.toFixed(0)} %
                </span>
            </div>
            <div class="cloud-layer-base">
                <b>
                    ${h(ForecastAltitude, { height: layer.height, reference: t("cloud.altitudeAboveDropzone"), approximate: true })}
                </b>
            </div>
            ${h(
                Help,
                {},
                html`
                    <h3>Open-Meteo · ${layer.pressure} hPa</h3>
                    <p>
                        ${t("cloud.altitudeAboveDropzone")}: ${" "}
                        ${h(ForecastAltitude, { height: layer.height, reference: t("cloud.altitudeAboveDropzone") })}
                    </p>
                    <p>
                        ${t("cloud.altitudeSeaLevel")}: ${" "}
                        ${h(ForecastAltitude, { height: layer.height + DROPZONE_ELEVATION.value, reference: t("cloud.altitudeSeaLevel") })}
                    </p>
                    <p>${t("cloud.modelRoundingHelp")}</p>
                    <p>${t("cloud.modelledMeaning")}</p>
                    <p>${t("cloud.modelledCoverage")}</p>
                `,
            )}
        </li>
    `;
}

/** @param {{ profile: OpenMeteoCloudProfile | null }} props */
function OpenMeteoClouds({ profile }) {
    const scope = useScope(css`
        :scope {
        }
        .cloud-profile-content {
            display: flow-root;
        }
        .cloud-profile-note {
            color: var(--color-muted);
            font-size: 0.75rem;
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
                              <ul
                                  class="cloud-list cloud-layers cloud-profile-layers p-0 m-0"
                              >
                                  ${profile.layers.map((layer) => h(OpenMeteoCloudLayer, { layer }))}
                              </ul>
                              <p class="summary-time">
                                  ${h(FromNow, { date: profile.time })}
                              </p>
                          `
                        : html`
                              <p>${t("cloud.modelUnavailable")}</p>
                          `
                }
            </div>
            <p class="cloud-profile-note">${t("cloud.modelHelp")}</p>
        </section>
    `;
}

export function CloudSummary() {
    const [cloudSource, setCloudSource] = useState("METAR");
    const tabId = useId();
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
        .cloud-source-tabs {
            display: flex;
            flex-shrink: 0;
            gap: var(--spacing-1);
        }
        .cloud-source-tabs button {
            padding: var(--spacing-1) var(--spacing-2);
            font-size: 0.75rem;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
            color: var(--color-muted);
            cursor: pointer;
        }
        .cloud-source-tabs button[aria-selected="true"] {
            color: var(--color-primary);
            border-color: var(--color-primary);
            font-weight: 650;
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
        .summary-metrics .condensation {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: var(--spacing-1) var(--spacing-4);
        }
        .condensation > .source-note {
            grid-column: 1 / -1;
        }
        .cloud-list {
            list-style: none;
        }
        .cloud-layers {
            display: grid;
            gap: 0;
        }
        .cloud-layer + .cloud-layer {
            border-top: 1px solid var(--color-border);
        }
        .cloud-observation-heading {
            color: var(--color-muted);
            font-size: 0.75rem;
            font-weight: 500;
            letter-spacing: 0.03em;
        }
        .cloud-clear,
        .cloud-warning {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
        }
        .cloud-clear {
            background: var(--color-surface-soft);
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
        .cloud-estimates {
            min-height: 5rem;
            border-top: 1px solid var(--color-border);
        }
        .summary-metrics > div {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: var(--spacing-4);
        }
        .summary-metrics dt {
            margin: 0;
        }
        .summary-metrics dd {
            white-space: nowrap;
            font-size: 1.1rem;
        }
        .cloud-forecast {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
        }
        .forecast-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-3);
            font-size: 0.85rem;
            font-weight: 650;
        }
        .forecast-heading h3 {
            margin: 0 auto 0 0;
            font: inherit;
            letter-spacing: normal;
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
    const showTabs = Boolean(metar && profile);
    const selectedSource = metar
        ? showTabs
            ? cloudSource
            : "METAR"
        : "Open-Meteo";
    const latest = LATEST_OBSERVATION.value;
    const time = metar?.time ?? latest?.time;
    const forecasts =
        FORECAST_SOURCE.value === "FMI" ? HOURLY_CLOUD_FORECASTS.value : [];

    let msg = "";

    if (metar?.clouds.length === 0 && metar.metar.includes("CAVOK")) {
        msg = t("cloud.cavokMessage");
    }

    return html`
        <div class="cloud-summary">
            ${scope.style}
            <div class="cloud-card-heading mb-4">
                <h2 class="h2-with-icon">${t("weather.clouds")}</h2>
                ${
                    showTabs
                        ? html`
                              <div
                                  class="cloud-source-tabs"
                                  role="tablist"
                                  aria-label=${t("cloud.source")}
                              >
                                  ${["METAR", "Open-Meteo"].map(
                                      (source, index) => html`
                                          <button
                                              type="button"
                                              role="tab"
                                              id=${`${tabId}-${source}`}
                                              aria-controls=${`${tabId}-panel`}
                                              aria-selected=${selectedSource === source}
                                              tabindex=${selectedSource === source ? 0 : -1}
                                              onClick=${() => setCloudSource(source)}
                                              onKeyDown=${
                                                  /** @param {KeyboardEvent} event */ (
                                                      event,
                                                  ) => {
                                                      if (
                                                          ![
                                                              "ArrowLeft",
                                                              "ArrowRight",
                                                              "Home",
                                                              "End",
                                                          ].includes(event.key)
                                                      )
                                                          return;
                                                      event.preventDefault();
                                                      const next =
                                                          event.key === "Home"
                                                              ? "METAR"
                                                              : event.key ===
                                                                  "End"
                                                                ? "Open-Meteo"
                                                                : index === 0
                                                                  ? "Open-Meteo"
                                                                  : "METAR";
                                                      setCloudSource(next);
                                                      document
                                                          .getElementById(
                                                              `${tabId}-${next}`,
                                                          )
                                                          ?.focus();
                                                  }
                                              }
                                          >
                                              ${source}
                                          </button>
                                      `,
                                  )}
                              </div>
                          `
                        : null
                }
            </div>
            <div
                id=${`${tabId}-panel`}
                role=${showTabs ? "tabpanel" : undefined}
                tabindex=${showTabs ? 0 : undefined}
                aria-labelledby=${showTabs ? `${tabId}-${selectedSource}` : undefined}
            >
                ${
                    selectedSource === "METAR" && metar
                        ? html`
                              <div class="cloud-observation-header">
                                  <h3 class="cloud-observation-heading m-0">
                                      ${t("cloud.observedLayers")}
                                  </h3>
                                  ${h(DataSource, { sources: ["METAR"] })}
                              </div>
                              ${
                                  msg
                                      ? html`
                                            <div
                                                class="cloud-clear mt-3 py-3 px-3.5"
                                            >
                                                ${h(Icon, { name: "cloudClear", size: 32 })}
                                                <span>
                                                    ${t("cloud.cavok")}
                                                    <small>(CAVOK)</small>
                                                </span>
                                            </div>
                                        `
                                      : html`
                                            <ul
                                                class="cloud-list cloud-layers p-0 m-0"
                                            >
                                                ${metar.clouds
                                                    .toSorted(
                                                        (a, b) =>
                                                            b.base - a.base,
                                                    )
                                                    .map((cloud) =>
                                                        h(CloudLayer, {
                                                            cloud,
                                                        }),
                                                    )}
                                            </ul>
                                        `
                              }
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
                        : h(OpenMeteoClouds, { profile })
                }
            </div>

            <dl class="summary-metrics cloud-estimates mt-4 pt-4">
                ${whenAll(
                    [latest?.temperature, latest?.dewPoint],
                    (temp, dew) => html`
                        <div class="condensation">
                            ${h(DataSource, {
                                sources: [weatherSourceLabel(latest?.source)],
                            })}
                            <dt>${t("weather.condensationLevel")}</dt>
                            <dd class="cloud-list-item-alt">
                                <b>${getLiftedCondensationLevel(temp, dew)}M</b>
                                ${h(
                                    Help,
                                    { id: "dewpoint" },
                                    html`
                                        <p>
                                            ${t("cloud.estimateHelp", temp.toFixed(1), dew.toFixed(1))}
                                            ${h(FromNow, { date: latest?.time })}
                                        </p>
                                        <p>${t("cloud.estimateCaveat")}</p>
                                    `,
                                )}
                            </dd>
                        </div>
                    `,
                )}
            </dl>
            ${
                forecasts.length
                    ? html`
                          <section
                              class="cloud-forecast mt-4 py-3 px-3.5"
                              aria-label=${t("cloud.forecast")}
                          >
                              <div class="forecast-heading mb-3">
                                  <h3>${t("cloud.forecast12h")}</h3>
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
                                  ${h(
                                      Help,
                                      { id: "cloudforecast" },
                                      html`
                                          <p>${t("cloud.forecastHelp")}</p>
                                      `,
                                  )}
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
