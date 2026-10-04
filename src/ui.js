// @ts-check
import { css, useScope } from "./useScope.js";
import {
    windStatusStyles,
    dateHeadingStyles,
    freshnessStyles,
    summaryStyles,
    cardHeadingStyles,
    cloudLayerStyles,
} from "./styles.js";
import { effect, signal } from "@preact/signals";
import { useId, useRef, useState } from "preact/hooks";
import { h, html } from "htm/preact";
import {
    clearOMCache,
    OpenMeteoTool,
    OpenMeteoRaw,
    OM_DATA,
    getOpenMeteoCloudProfile,
} from "./om.js";
import {
    FORECASTS,
    OBSERVATIONS,
    NAME,
    STATION_COORDINATES,
    FORECAST_COORDINATES,
    METARS,
    STATION_NAME,
    ERRORS,
    updateWeatherData,
    LOADING,
    addError,
    FORECAST_DAY,
    FORECAST_DATE,
    STALE_FORECASTS,
    FORECAST_LOCATION_NAME,
    QUERY_PARAMS,
    navigateQs,
    getQs,
    LATEST_OBSERVATION,
    SAVED_DZs,
    saveCurrentDz,
    removeSavedDz,
    HOURLY_CLOUD_FORECASTS,
    FORECAST_SOURCE,
    WIND_SOURCE,
    weatherSourceLabel,
} from "./data.js";
import { completeDropzones, partialDropzones } from "./dropzones.js";
import { DeveloperBanner, DeveloperMode } from "./DeveloperMode.js";

import { Graph } from "./graph.js";
import { DataSource } from "./DataSource.js";
import { DropzoneMap } from "./DropzoneMap.js";
import { CloudCoverIcon, Icon, WindArrow, PieChart } from "./icons.js";
import { Compass } from "./compass.js";
import {
    getLiftedCondensationLevel,
    dateOffset,
    formatClock,
    formatDate,
    humanDayText,
    isNullish,
    hasValidAverageWindData,
    hasValidWindData,
    getHourlyWindRange,
    removeNullish,
    formatCloudBase,
    whenAll,
    coordinateDistance,
} from "./utils.js";
import { Help, FromNow, ErrorBoundary, Dialog } from "./components.js";
import { LANGUAGE, setLanguage, t } from "./translations.js";

effect(() => {
    document.title =
        NAME.value === "Hyppykeli" ? "Hyppykeli" : NAME.value + " – Hyppykeli";
});

/**
 * @param {number} gust
 * @returns {"ok" | "warning" | "danger"}
 */
function getWarningLevel(gust) {
    /** @type {"ok" | "warning" | "danger"} */
    let className = "ok";

    if (gust >= 8) {
        className = "warning";
    }

    if (gust >= 11) {
        className = "danger";
    }

    return className;
}

function ObservationTHead() {
    return html`
        <tr>
            <th>${t("weather.clock")}</th>
            <th>${t("weather.gust")}</th>
            <th>${t("weather.wind")}</th>
            <th>${t("weather.direction")}</th>
            <th>
                ${t("weather.condensationLevelShort")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>
                            ${t("weather.condensationLevel")}.${" "}
                            <a
                                href="#"
                                onClick=${(/** @type {any} */ e) => {
                                    e.preventDefault();
                                    document
                                        .getElementById("dewpoint")
                                        ?.click();
                                }}
                            >
                                ${t("weather.readMore")}
                            </a>
                        </p>
                    `,
                )}
            </th>
            <th>${t("weather.temperature")}</th>
        </tr>
    `;
}

/**
 * @param {Object} props
 * @param {WeatherData[]} props.data
 */
function ObservationRows(props) {
    return props.data.map((point) => {
        return html`
            <tr>
                <td title=${point.time.toString()}>
                    ${formatClock(point.time)}
                </td>
                <td class=${getWarningLevel(point.gust ?? 0)}>
                    ${point.gust?.toFixed(1) ?? -1} m/s
                </td>
                <td>${point.speed} m/s</td>
                <td>
                    <${WindDirection} direction=${point.direction} />
                </td>

                <td>
                    ${whenAll(
                        [point.temperature, point.dewPoint],
                        (temp, dew) => html`
                            ${getLiftedCondensationLevel(temp, dew)}${" "}M
                        `,
                    )}
                </td>

                <td>${point.temperature?.toFixed(1)} °C</td>
            </tr>
        `;
    });
}

function ForecastTHead() {
    return html`
        <tr>
            <th>${t("weather.clock")}</th>
            <th>${t("weather.gust")}</th>
            <th>${t("weather.wind")}</th>
            <th>${t("weather.direction")}</th>
            <th class="cloud-low-heading">
                ${t("weather.cloudsLow")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>${t("weather.lowCloudHelp")}</p>
                    `,
                )}
            </th>
            <th class="cloud-middle-heading">
                ${t("weather.cloudsMiddle")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>${t("weather.middleCloudHelp")}</p>
                    `,
                )}
            </th>

            <th>
                ${t("weather.condensationLevelShort")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>
                            ${t("weather.condensationLevel")}.${" "}
                            <a
                                href="#"
                                onClick=${(/** @type {any} */ e) => {
                                    e.preventDefault();
                                    document
                                        .getElementById("dewpoint")
                                        ?.click();
                                }}
                            >
                                ${t("weather.readMore")}
                            </a>
                        </p>
                    `,
                )}
            </th>

            <th>
                ${t("weather.rain")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>${t("weather.rainHelp")}</p>
                    `,
                )}
            </th>

            <th>${t("weather.temperature")}</th>
        </tr>
    `;
}

/**
 * @param {Object} props
 * @param {WeatherData[]} props.data
 */
function ForecastRows(props) {
    return props.data.map((point) => {
        return html`
            <tr class="forecast-row">
                <td title=${point.time.toString()}>
                    ${formatClock(point.time)}
                </td>
                <td class=${getWarningLevel(point.gust ?? 0)}>
                    ${point.gust} m/s
                </td>
                <td>${point.speed} m/s</td>
                <td>
                    <${WindDirection} direction=${point.direction} />
                </td>
                <td>
                    <${PercentagePie} percentage=${point.lowCloudCover} />
                </td>

                <td>
                    <${PercentagePie} percentage=${point.middleCloudCover} />
                </td>

                <td>
                    ${whenAll(
                        [point.temperature, point.dewPoint],
                        (temp, dew) => html`
                            ${getLiftedCondensationLevel(temp, dew)}${" "}M
                        `,
                    )}
                </td>

                <td>
                    <${PercentagePie} percentage=${point.rain} />
                </td>

                <td>${point.temperature?.toFixed(1)} °C</td>
            </tr>
        `;
    });
}

/**
 * Compact cloud-cover reading for the cloud card. Unlike the exact pies in the
 * full forecast dialog, its weather symbols are deliberately stepped so a run
 * of hours can be scanned quickly.
 *
 * @param {Object} props
 * @param {number} [props.percentage]
 */
function PercentageCloudCover(props) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            gap: 0.55ch;
        }
    `);

    if (isNullish(props.percentage)) {
        return null;
    }

    return html`
        <span class="cloud-cover">
            ${scope.style}
            ${h(CloudCoverIcon, { percentage: props.percentage, size: 24 })}
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}

/**
 * @param {Object} props
 * @param {number} [props.percentage]
 */
function PercentagePie(props) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
        }

        :scope svg {
            margin-right: 1ch;
        }
    `);

    if (isNullish(props.percentage)) {
        return null;
    }

    return html`
        <span class="cloud-cover">
            ${scope.style} ${h(PieChart, { percentage: props.percentage })}
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}

/**
 *
 * @param {Object} props
 * @param {number|undefined} props.direction
 * @param {boolean} props.value
 */
function WindDirection(props) {
    const scope = useScope(css`
        .direction-value {
            width: 4ch;
            display: inline-block;
            padding-right: 3px;
            z-index: -1;
        }

        .direction {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            font-size: 80%;
            width: 20px;
            height: 20px;
        }
    `);

    if (isNullish(props.direction)) {
        return null;
    }

    return html`
        <span>
            ${scope.style}
            ${
                props.value !== false
                    ? html`
                          <span class="direction-value">
                              ${props.direction.toFixed(0)}°
                          </span>
                      `
                    : null
            }
            <span
                class="direction"
                style=${{
                    visibility: props.direction !== -1 ? "visible" : "hidden",
                }}
            >
                ${h(WindArrow, { direction: props.direction, size: 20 })}
            </span>
        </span>
    `;
}

/**
 * @param {Object} props
 * @param {Signal<WeatherData[]>} props.data
 * @param {any} props.Rows
 * @param {any} props.thead
 */
function DataTable(props) {
    const scope = useScope(css`
        :scope {
            table-layout: fixed;
            width: 100%;
            border-collapse: collapse;
        }

        :scope th {
            text-align: left;
            width: 8ch;
        }

        :scope td,
        :scope th {
            white-space: nowrap;
            padding: 8px 6px;
            border-bottom: 1px solid var(--color-border);
            background-color: var(--color-surface);
        }

        :scope thead th {
            color: var(--color-muted);
            background: var(--color-surface-soft);
            font-size: 0.85rem;
        }

        :scope td:first-of-type,
        :scope th:first-of-type {
            position: sticky;
            width: 5ch;
            z-index: 10;
            left: 0;
        }

        :scope tbody tr:hover th,
        :scope tbody tr:hover td {
            background-color: var(--color-surface-hover);
        }
        :scope th.cloud-low-heading {
            width: 10ch;
        }
        :scope th.cloud-middle-heading {
            width: 11ch;
        }
        ${windStatusStyles}
    `);

    return html`
        <table class="weather-table">
            ${scope.style}
            <thead>${props.thead}</thead>
            <tbody>
                <${props.Rows} data=${props.data.value} />
            </tbody>
        </table>
    `;
}

/**
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.title
 * @param {import("preact").ComponentChildren} props.children
 */
function TableDialog(props) {
    const scope = useScope(css`
        :scope.table-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            padding: 8px;
        }
        :scope:is(dialog) {
            width: 1100px;
            max-height: calc(100dvh - 24px);
            box-sizing: border-box;
        }
        .dialog-heading {
            margin-bottom: 16px;
        }
        .dialog-heading h2 {
            margin: 0;
        }
        .side-scroll {
            overflow-x: auto;
            width: 100%;
            position: relative;
        }
    `);
    /** @type {import("preact").RefObject<HTMLDialogElement>} */
    const ref = useRef(null);

    return html`
        <button
            class="table-button"
            type="button"
            aria-label=${t("common.asTable", props.title)}
            aria-haspopup="dialog"
            aria-controls=${props.id}
            title=${t("common.asTable", props.title)}
            onClick=${() => ref.current?.showModal()}
        >
            ${scope.style} ${h(Icon, { name: "table", size: 24 })}
        </button>
        ${h(
            Dialog,
            {
                dialogRef: ref,
                id: props.id,
                labelledBy: `${props.id}-title`,
            },
            html`
                ${scope.style}
                <div class="dialog-heading">
                    <h2 id=${`${props.id}-title`}>${props.title}</h2>
                </div>
                <div class=${scope.end}>${props.children}</div>
            `,
        )}
    `;
}

function WindSummary() {
    const scope = useScope(css`
        ${summaryStyles}
        .wind-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .latest-wind-cell + .latest-wind-cell {
            border-left: 1px solid var(--color-border);
            padding-left: 12px;
        }
        .wind-metrics .latest-value {
            display: flex;
            align-items: baseline;
            gap: 3px;
            font-size: clamp(1.25rem, 3vw, 1.75rem);
            white-space: nowrap;
        }
        .wind-metrics .hourly-range {
            margin-top: 4px;
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

    if (!obs) {
        return null;
    }

    if (!hasValidAverageWindData(obs)) {
        return html`
            <p>Ei havaintoja :(</p>
        `;
    }

    const observations = OBSERVATIONS.value.includes(obs)
        ? OBSERVATIONS.value
        : [obs, ...OBSERVATIONS.value];
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
                    <dd
                        class=${"latest-value latest-gust " + getWarningLevel(obs.gust ?? 0)}
                    >
                        ${obs.gust?.toFixed(0) ?? "-"}
                        <span class="unit">m/s</span>
                    </dd>
                    ${hourlyRange("gust")}
                </div>
                <div class="latest-wind-cell">
                    <dt>${t("weather.wind")}</dt>
                    <dd class="latest-value latest-wind">
                        ${obs.speed?.toFixed(0) ?? "?"}
                        <span class="unit">m/s</span>
                    </dd>
                    ${hourlyRange("speed")}
                </div>
                <div class="latest-wind-cell">
                    <dt>${t("weather.direction")}</dt>
                    <dd class="latest-value latest-wind">
                        ${h(WindDirection, { direction: obs.direction, value: true })}
                    </dd>
                    ${hourlyRange("direction")}
                </div>
            </dl>
        </div>
    `;
}

function cloudTypes() {
    return /** @type {Record<string, CloudTypeDetails>} */ ({
        NCD: {
            label: t("cloud.none"),
            icon: "cloudClear",
            coverage: t("cloud.noneObserved"),
            explanation: t("cloud.noneDescription"),
        },
        NSC: {
            label: t("cloud.noSignificant"),
            icon: "cloudNsc",
            coverage: t("cloud.noSignificantCoverage"),
            explanation: t("cloud.noSignificantDescription"),
        },
        FEW: {
            label: t("cloud.fewShort"),
            icon: "cloudFew",
            coverage: t("cloud.coverage", "1–2/8"),
            explanation: t("cloud.fewDescription"),
        },
        SCT: {
            label: t("cloud.scatteredShort"),
            icon: "cloudScattered",
            coverage: t("cloud.coverage", "3–4/8"),
            explanation: t("cloud.scatteredDescription"),
        },
        BKN: {
            label: t("cloud.brokenShort"),
            icon: "cloudBroken",
            coverage: t("cloud.coverage", "5–7/8"),
            explanation: t("cloud.brokenDescription"),
        },
        OVC: {
            label: t("cloud.overcast"),
            icon: "cloudOvercast",
            coverage: t("cloud.coverage", "8/8"),
            explanation: t("cloud.overcastDescription"),
        },
        VV: {
            label: t("cloud.fogEmphasis"),
            icon: "cloudFog",
            coverage: t("cloud.skyObscured"),
            explanation: t("cloud.verticalVisibilityDescription"),
        },
    });
}

/** @param {{ cloud: CloudLayer }} props */
function CloudLayer({ cloud }) {
    const scope = useScope(cloudLayerStyles);
    const type = cloudTypes()[cloud.amount];
    const hasBase =
        Number.isFinite(cloud.base) && !["NCD", "NSC"].includes(cloud.amount);
    return html`
        <li class="cloud-layer">
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
                              <b>
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
                    <p class="metar">${cloud.metarCode ?? cloud.amount}</p>
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
            gap: 10px;
            padding: 9px 0;
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
        <li class="cloud-layer cloud-profile-layer">
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
                    ${formatCloudBase(layer.height, "m", { approximate: true })}
                </b>
            </div>
            ${h(
                Help,
                {},
                html`
                    <h3>Open-Meteo · ${layer.pressure} hPa</h3>
                    <p>
                        ${t("cloud.altitudeSeaLevel")}:
                        ${formatCloudBase(layer.height, "m")}
                    </p>
                    <p>${t("cloud.roundingHelp")}</p>
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
            margin-top: 12px;
        }
        .cloud-profile-note {
            color: var(--color-muted);
            font-size: 0.75rem;
        }
        .cloud-profile-altitude-note {
            margin: 8px 0 0;
            color: var(--color-muted);
            font-size: 0.75rem;
            text-align: right;
        }
        .cloud-profile-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }
    `);
    return html`
        <section class="open-meteo-clouds" aria-label="Open-Meteo">
            ${scope.style}
            <div class="cloud-profile-header">
                <h3 class="cloud-observation-heading">
                    ${t("cloud.modelledLayers")}
                </h3>
                ${h(DataSource, { sources: ["Open-Meteo"] })}
            </div>
            ${
                profile
                    ? html`
                          <p class="cloud-profile-altitude-note">
                              ${t("cloud.altitudeSeaLevel")}
                          </p>
                          <ul
                              class="cloud-list cloud-layers cloud-profile-layers"
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
            <p class="cloud-profile-note">${t("cloud.modelHelp")}</p>
        </section>
    `;
}

function CloudSummary() {
    const [cloudSource, setCloudSource] = useState("METAR");
    const tabId = useId();
    const scope = useScope(css`
        ${summaryStyles}
        .cloud-card-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 16px;
        }
        .cloud-card-heading h2 {
            margin: 0;
        }
        .cloud-source-tabs {
            display: flex;
            flex-shrink: 0;
            gap: 4px;
        }
        .cloud-source-tabs button {
            padding: 5px 8px;
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
            gap: 12px;
        }
        .summary-metrics .condensation {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 4px 16px;
        }
        .condensation > .source-note {
            grid-column: 1 / -1;
        }
        .cloud-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .cloud-layers {
            display: grid;
            gap: 0;
        }
        .cloud-layer + .cloud-layer {
            border-top: 1px solid var(--color-border);
        }
        .cloud-observation-heading {
            margin: 0;
            color: var(--color-muted);
            font-size: 0.75rem;
            font-weight: 500;
            letter-spacing: 0.03em;
        }
        .cloud-clear,
        .cloud-warning {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
        }
        .cloud-clear {
            background: var(--color-surface-soft);
            margin-top: 12px;
        }
        .cloud-warning {
            margin-top: 8px;
            color: var(--color-danger);
            background: color-mix(
                in srgb,
                var(--color-danger) 8%,
                var(--color-surface)
            );
            font-weight: 600;
        }
        .cloud-warning > span {
            flex: 1;
        }
        .cloud-observation-footer {
            position: relative;
            margin-top: 12px;
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
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--color-border);
        }
        .summary-metrics > div {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 16px;
        }
        .summary-metrics dt {
            margin: 0;
        }
        .summary-metrics dd {
            white-space: nowrap;
            font-size: 1.1rem;
        }
        .cloud-forecast {
            margin-top: 16px;
            padding: 12px 14px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
        }
        .forecast-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 0.85rem;
            font-weight: 650;
        }
        .forecast-heading h3 {
            margin: 0 auto 0 0;
            font: inherit;
            letter-spacing: normal;
        }
        .forecast-scroll {
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scrollbar-width: thin;
            padding-bottom: 6px;
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
            padding: 10px 12px;
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
            width: 10ch;
        }
        .cloud-forecast-table tr > :first-child {
            background: var(--color-surface-soft);
            text-align: left;
            padding-left: 0;
            border-right: 1px solid var(--color-border);
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
        .cloud-estimates:empty {
            display: none;
        }
        .metar {
            display: block;
            width: 100%;
            min-width: 0;
            margin-top: 8px;
            padding-bottom: 4px;
            overflow-wrap: anywhere;
            white-space: normal;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-muted);
        }
    `);

    const metar = METARS.value?.at(-1);
    const profile = getOpenMeteoCloudProfile(OM_DATA.value);
    const showTabs = Boolean(metar && profile);
    const selectedSource = metar
        ? showTabs
            ? cloudSource
            : "METAR"
        : "Open-Meteo";
    const latest = LATEST_OBSERVATION.value;
    const time = metar?.time ?? latest?.time;
    const forecasts = HOURLY_CLOUD_FORECASTS.value;

    let msg = "";

    if (metar?.clouds.length === 0 && metar.metar.includes("CAVOK")) {
        msg = t("cloud.cavokMessage");
    }

    return html`
        <div class="cloud-summary">
            ${scope.style}
            <div class="cloud-card-heading">
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
                                  <h3 class="cloud-observation-heading">
                                      ${t("cloud.observedLayers")}
                                  </h3>
                                  ${h(DataSource, { sources: ["METAR"] })}
                              </div>
                              ${
                                  msg
                                      ? html`
                                            <div class="cloud-clear">
                                                ${h(Icon, { name: "cloudClear", size: 32 })}
                                                <span>
                                                    ${t("cloud.cavok")}
                                                    <small>(CAVOK)</small>
                                                </span>
                                            </div>
                                        `
                                      : html`
                                            <ul class="cloud-list cloud-layers">
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
                                            <div class="cloud-warning">
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
                                                        <p class="metar">
                                                            //////CB
                                                        </p>
                                                    `,
                                                )}
                                            </div>
                                        `
                                      : null
                              }
                              <div class="cloud-observation-footer">
                                  <div class="summary-time">
                                      ${h(FromNow, { date: time })}
                                  </div>
                                  <details class="cloud-metar-details">
                                      <summary>METAR</summary>
                                      <code
                                          class="metar"
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

            <dl class="summary-metrics cloud-estimates">
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
                              class="cloud-forecast"
                              aria-label=${t("cloud.forecast")}
                          >
                              <div class="forecast-heading">
                                  <h3>${t("cloud.forecast12h")}</h3>
                                  ${h(DataSource, {
                                      sources: [FORECAST_SOURCE.value],
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
                                  class="forecast-scroll"
                                  tabindex="0"
                                  role="region"
                                  aria-label=${t("cloud.hourlyForecast")}
                              >
                                  <table class="cloud-forecast-table">
                                      <thead>
                                          <tr>
                                              <th scope="col">
                                                  ${t("weather.clock")}
                                              </th>
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
                                              <th scope="row">
                                                  ${t("cloud.cover")}
                                              </th>
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
                                          <tr>
                                              <th scope="row">
                                                  ${t("weather.condensationLevel")}
                                              </th>
                                              ${forecasts.map(
                                                  (forecast) => html`
                                                      <td
                                                          class="forecast-label"
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

function UpdateButton() {
    return html`
        <button
            disabled=${LOADING.value > 0}
            onClick=${() => {
                MENU_OPEN.value = false;
                clearOMCache();
                updateWeatherData();
            }}
        >
            ${t("update.button")}
        </button>
        <br />
        <small>${t("update.automatic")}</small>
    `;
}

/**
 * @type {Signal<boolean>}
 */
export const MENU_OPEN = signal(false);

// Close menu when clicking outside of it
document.addEventListener("click", (e) => {
    if (!MENU_OPEN.value) {
        return;
    }

    if (
        e.target instanceof Element &&
        e.target.closest(".side-menu,.menu-burger")
    ) {
        return;
    }

    MENU_OPEN.value = false;
});

const OTHER_DZs = [...completeDropzones, ...partialDropzones].sort((a, b) =>
    a.name.localeCompare(b.name),
);

/**
 * Navigate to a link without reloading while updating the QUERY_PARAMS signal
 *
 * @param {MouseEvent} e
 */
function asInPageNavigation(e) {
    if (!(e.target instanceof HTMLAnchorElement)) {
        return;
    }

    if (e.target.target === "_blank") {
        return;
    }

    if (e.metaKey || e.ctrlKey) {
        return;
    }

    if (e.button !== 0) {
        return;
    }

    e.preventDefault();

    const target = new URL(e.target.href);
    const params = Object.fromEntries(target.searchParams);
    navigateQs(params, { mode: "replace", replace: true });
}

/**
 * @param {Event} e
 */
function handleForecastDayChange(e) {
    if (!(e.target instanceof HTMLInputElement)) {
        return;
    }

    const value = new Date(e.target.value);
    const dayDiff =
        Math.floor(
            (value.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

    navigateQs({ forecast_day: dayDiff.toString() });
}

/**
 * @param {MouseEvent} e
 */
function savePreviousDz(e) {
    if (e.target instanceof HTMLAnchorElement) {
        localStorage.setItem("previous_dz", e.target.textContent?.trim() ?? "");
    }
}

/** @param {{ developerEditorRef: import('preact').RefObject<DeveloperModeHandle> }} props */
export function SideMenu({ developerEditorRef }) {
    const scope = useScope(css`
        :scope {
            position: fixed;
            z-index: 200;
            top: 0;
            bottom: 0;
            right: 0;
            width: min(360px, calc(100vw - 48px));
            background: var(--color-surface);
            border-left: 1px solid var(--color-border);
            box-shadow: var(--shadow-floating);
            overflow-y: auto;
            overscroll-behavior: contain;
            transform: translateX(100%);
            visibility: hidden;
            transition:
                transform 0.25s ease,
                visibility 0.25s;
        }

        :scope.open {
            transform: translateX(0);
            visibility: visible;
        }

        .menu-header {
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 24px;
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
        }

        .menu-brand {
            color: var(--color-primary);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        h1 {
            margin: 4px 0 0;
            font-size: 1.4rem;
            overflow-wrap: anywhere;
        }

        .menu-close {
            display: grid;
            place-items: center;
            width: 40px;
            height: 40px;
            padding: 0;
            flex-shrink: 0;
            background: var(--color-surface-soft);
            border-radius: 50%;
        }

        .menu-content {
            padding: 16px 24px calc(96px + env(safe-area-inset-bottom));
        }

        a {
            text-decoration: none;
        }

        .dzs a:hover {
            background: var(--color-surface-hover);
        }

        .menu-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--color-border);
        }

        .menu-section:first-child {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
        }

        h2 {
            margin-bottom: 12px;
            font-size: 1rem;
        }

        .forecast-days {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            padding: 4px;
            margin-bottom: 16px;
            background: var(--color-surface-soft);
            border: 1px solid var(--color-border);
            border-radius: 12px;
        }

        .forecast-days a {
            padding: 8px;
            border-radius: var(--radius-sm);
            text-align: center;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .forecast-days a[aria-current="date"] {
            background: var(--color-primary);
            color: var(--color-surface);
        }

        label,
        .saved-label {
            display: block;
            margin-bottom: 6px;
            color: var(--color-muted);
            font-size: 0.8rem;
        }

        input[type="date"] {
            width: 100%;
            min-width: 0;
        }

        .refresh {
            display: grid;
            gap: 8px;
            margin-top: 16px;
        }

        .refresh br {
            display: none;
        }

        small {
            color: var(--color-muted);
            font-size: 0.75rem;
        }

        .dz-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            margin-top: 16px;
        }

        .dzs a {
            display: block;
            padding: 10px 12px;
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
            font-size: 0.85rem;
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .saved-dz {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
        }

        .saved-dz a {
            flex: 1;
        }

        .saved-dz button {
            display: grid;
            place-items: center;
            padding: 8px;
            background: transparent;
            border-color: transparent;
        }

        .save-dz {
            width: 100%;
            margin-top: 6px;
            background: transparent;
            font-size: 0.85rem;
        }

        .menu-footer {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-size: 0.8rem;
        }

        @media (prefers-reduced-motion: reduce) {
            :scope {
                transition: none;
            }
        }
    `);

    /** @param {MouseEvent} e */
    const closeMenuOnLinkClick = (e) => {
        if (e.target instanceof Element && e.target.closest("a")) {
            MENU_OPEN.value = false;
        }
    };

    return html`
        <aside
            id="side-menu"
            aria-label=${t("menu.label")}
            inert=${!MENU_OPEN.value}
            class="${MENU_OPEN.value ? "side-menu open" : "side-menu"}"
            onClick=${closeMenuOnLinkClick}
        >
            ${scope.style}
            <header class="menu-header">
                <div>
                    <span class="menu-brand">Hyppykeli</span>
                    <h1>${NAME.value}</h1>
                </div>
                <button
                    class="menu-close"
                    type="button"
                    aria-label=${t("menu.close")}
                    onClick=${() => {
                        MENU_OPEN.value = false;
                    }}
                >
                    ${h(Icon, { name: "close", size: 20 })}
                </button>
            </header>

            <div class="menu-content">
                <section class="menu-section" aria-labelledby="menu-forecast">
                    <h2 id="menu-forecast">${t("menu.forecastDay")}</h2>
                    <div class="forecast-days">
                        <a
                            onClick=${asInPageNavigation}
                            href=${getQs({ forecast_day: undefined })}
                            aria-current=${FORECAST_DAY.value === 0 ? "date" : undefined}
                        >
                            ${t("common.today")}
                        </a>
                        <a
                            onClick=${asInPageNavigation}
                            href=${getQs({ forecast_day: "1" })}
                            aria-current=${FORECAST_DAY.value === 1 ? "date" : undefined}
                        >
                            ${t("common.tomorrow")}
                        </a>
                    </div>
                    <label for="menu-forecast-date">
                        ${t("menu.selectDay")}
                    </label>
                    <input
                        id="menu-forecast-date"
                        type="date"
                        name="forecast_date"
                        min=${new Date().toISOString().split("T")[0]}
                        max=${dateOffset(9).toISOString().split("T")[0]}
                        onInput=${handleForecastDayChange}
                        value=${FORECAST_DATE.value.toISOString().split("T")[0]}
                    />
                    <div class="refresh"><${UpdateButton} /></div>
                </section>

                <section class="menu-section" aria-labelledby="menu-dropzones">
                    <h2 id="menu-dropzones">${t("menu.dropzones")}</h2>
                    ${
                        SAVED_DZs.value.length > 0
                            ? html`
                                  <span class="saved-label">
                                      ${t("menu.saved")}
                                  </span>
                              `
                            : null
                    }
                    <div class="dzs" onClick=${savePreviousDz}>
                        ${SAVED_DZs.value.flatMap((dz) => {
                            const name = dz.name;
                            if (!name) return [];
                            const qs =
                                "?" +
                                new URLSearchParams(
                                    removeNullish(dz),
                                ).toString();
                            return html`
                                <div class="saved-dz">
                                    <a href=${qs}>${name}</a>
                                    <button
                                        type="button"
                                        aria-label=${t("menu.removeSaved", name)}
                                        onClick=${() => {
                                            if (
                                                confirm(t("menu.confirmRemove"))
                                            ) {
                                                // Keep the target present until outside click detection runs.
                                                setTimeout(() =>
                                                    removeSavedDz(name),
                                                );
                                            }
                                        }}
                                    >
                                        ${h(Icon, { name: "close", size: 16 })}
                                    </button>
                                </div>
                            `;
                        })}
                    </div>
                    <button
                        class="save-dz"
                        type="button"
                        onClick=${() => saveCurrentDz(prompt(t("menu.namePrompt"), NAME.value))}
                    >
                        ${t("menu.saveCurrent")}
                    </button>
                    <div class="dzs dz-grid" onClick=${savePreviousDz}>
                        ${OTHER_DZs.map(
                            (dz) => html`
                                <a href=${dz.href}>${dz.name}</a>
                            `,
                        )}
                    </div>
                </section>

                <section class="menu-section" aria-labelledby="menu-language">
                    <h2 id="menu-language">${t("language.label")}</h2>
                    <select
                        aria-label=${t("language.label")}
                        value=${LANGUAGE.value}
                        onInput=${(/** @type {Event} */ event) => {
                            const value = /** @type {HTMLSelectElement} */ (
                                event.currentTarget
                            ).value;
                            if (value === "en" || value === "fi")
                                setLanguage(value);
                        }}
                    >
                        <option value="en">${t("language.english")}</option>
                        <option value="fi">${t("language.finnish")}</option>
                    </select>
                </section>

                <footer class="menu-section menu-footer">
                    <a href="/?no_redirect=1">${t("menu.home")}</a>
                    ${h(DeveloperMode, {
                        editorRef: developerEditorRef,
                        onOpen: () => {
                            MENU_OPEN.value = false;
                        },
                    })}
                </footer>
            </div>
        </aside>
    `;
}

function RenderInjectedCSS() {
    const css = QUERY_PARAMS.value.css;

    if (!css) {
        return null;
    }

    return html`
        <style dangerouslySetInnerHTML=${{ __html: atob(css) }}></style>
    `;
}

export function FloatingMenuButton() {
    const scope = useScope(css`
        :scope {
            position: fixed;
            z-index: 201;
            right: calc(20px + env(safe-area-inset-right));
            bottom: calc(20px + env(safe-area-inset-bottom));
            display: grid;
            place-items: center;
            width: 56px;
            height: 56px;
            padding: 0;
            border: none;
            border-radius: 50%;
            background: var(--color-primary);
            color: var(--color-surface);
            box-shadow: var(--shadow-floating);
        }

        :scope:hover {
            background: var(--color-primary-hover);
        }
    `);

    return html`
        <button
            class="menu-burger"
            type="button"
            aria-label=${t("menu.label")}
            aria-expanded=${MENU_OPEN.value}
            aria-controls="side-menu"
            onClick=${() => {
                MENU_OPEN.value = !MENU_OPEN.value;
            }}
        >
            ${scope.style}
            ${h(Icon, { name: MENU_OPEN.value ? "close" : "menu", size: 24 })}
        </button>
    `;
}

function ForecastLocationInfo() {
    return html`
        ${t("forecast.location")}${" "}
        <a
            href="https://www.google.fi/maps/place/${
                FORECAST_COORDINATES.value || STATION_COORDINATES.value
            }"
        >
            ${FORECAST_LOCATION_NAME.value}
        </a>
        . ${" "}
    `;
}

function HighWinds() {
    const [showDetails, setShowDetails] = useState(false);

    return html`
        <div id="high-winds-today">
            <div class="card-heading">
            <h2 class="h2-with-icon">
                ${t("highWinds.title")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>${t("highWinds.helpForecast")}</p>
                        <p>${t("highWinds.helpLevels")}</p>
                        <p>${t("highWinds.helpPeriods")}</p>
                    `,
                )}
            </h2>
            ${h(DataSource, { sources: ["Open-Meteo"] })}
            </div>

            <p>
                <button
                    type="button"
                    onClick=${() => setShowDetails(!showDetails)}
                >
                    ${showDetails ? t("highWinds.showSummary") : t("highWinds.showDetails")}
                </button>
            </p>

            <div
                id=${showDetails ? "high-winds-details" : undefined}
                class="high-winds-days"
            >
                <${ErrorBoundary}>
                    ${showDetails ? h(OpenMeteoRaw, {}) : h(OpenMeteoTool, {})}
                </${ErrorBoundary}>
            </div>
        </div>
    `;
}

function Info() {
    const scope = useScope(css`
        :scope {
            grid-area: info;
            max-width: 100%;
            width: 100%;
            line-height: 1.8;
        }
        .disclaimer {
            font-style: italic;
            font-weight: bold;
        }
    `);

    const metar = METARS.value?.[0];

    return html`
        <footer id="info">
            ${scope.style}
            ${
                STATION_NAME.value
                    ? html`
                          ${t("footer.observationStation")}${" "}
                          <a
                              href="https://www.google.fi/maps/place/${STATION_COORDINATES.value}"
                          >
                              ${STATION_NAME}
                          </a>
                          .${" "}
                      `
                    : null
            }
            <${ForecastLocationInfo} />
            ${
                metar?.elevation !== undefined
                    ? html`
                          ${" "}${t("footer.airfieldElevation")}${" "}
                          ${metar.elevation.toFixed(0)}M. ${" "}
                      `
                    : null
            }
            ${whenAll(
                [STATION_COORDINATES.value, FORECAST_COORDINATES.value],
                (station, forecast) => {
                    if (station === forecast) {
                        return null;
                    }

                    const distance = coordinateDistance(station, forecast);
                    const km = (distance / 1000).toFixed(1);

                    return t("footer.stationDistance", km);
                },
            )}
            ${h(
                DataSource,
                { plural: true },
                html`
                    <a href="https://www.ilmatieteenlaitos.fi/">FMI</a>
                    ,${" "}
                    <a href="https://flyk.com/">Flyk</a>
                    ${" "} ${t("footer.and")}${" "}
                    <a href="https://open-meteo.com/">Open-Meteo</a>
                    .
                `,
            )}
            <div class="disclaimer">${t("footer.disclaimer")}</div>
            <small>
                ${t("footer.logbook")}${" "}
                <a href="https://loki.hyppykeli.fi/">Loki</a>
                . ${t("footer.code")} HYPPYKELI2026
            </small>
        </footer>
    `;
}

function Title() {
    const scope = useScope(css`
        :scope {
            grid-area: title;
            margin: 0;
            max-width: 100%;
            width: 100%;
            word-break: break-word;
        }
        .nowrap {
            white-space: nowrap;
        }

        .title-name-row {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .title-name {
            min-width: 0;
        }

        .edit-name {
            display: inline-flex;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 5px;
            color: var(--color-primary);
            background: transparent;
            border: 0;
            border-radius: 50%;
        }

        .edit-name:hover {
            color: var(--color-primary-hover);
            background: var(--color-surface-hover);
        }

        .title-temp {
            font-size: 65%;
            color: var(--color-muted);
            font-family: var(--font-mono);
        }

        .title-name,
        .title-temp {
            display: block;
        }
    `);
    const dialogScope = useScope(css`
        :scope:is(dialog) {
            width: min(420px, calc(100vw - 24px));
            box-sizing: border-box;
        }

        h2 {
            margin-top: 0;
        }

        form label {
            display: grid;
            gap: 8px;
        }

        input {
            width: 100%;
            box-sizing: border-box;
        }

        .name-hint {
            color: var(--color-muted);
            font-size: 0.85rem;
        }

        .name-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }
    `);
    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    /** @type {import('preact').RefObject<HTMLInputElement>} */
    const inputRef = useRef(null);
    const [nameDraft, setNameDraft] = useState("");
    const dialogTitleId = useId();

    const openNameEditor = () => {
        setNameDraft(QUERY_PARAMS.value.name?.trim() || NAME.value);
        dialogRef.current?.showModal();
        inputRef.current?.focus();
        inputRef.current?.select();
    };

    /** @param {SubmitEvent} event */
    const saveName = (event) => {
        event.preventDefault();
        navigateQs({ name: nameDraft.trim() || undefined });
        dialogRef.current?.close();
    };

    const time = LATEST_OBSERVATION.value?.time;
    const temperature = LATEST_OBSERVATION.value?.temperature;

    const temps = isNullish(temperature)
        ? null
        : {
              1: temperature - 6.5 * 1,
              2: temperature - 6.5 * 2,
              3: temperature - 6.5 * 3,
              4: temperature - 6.5 * 4,
          };

    return html`
        <h1 id="title">
            ${scope.style}
            <span class="title-name-row">
                <span class="title-name">${NAME}</span>
                <button
                    class="edit-name"
                    type="button"
                    aria-label=${t("title.edit")}
                    title=${t("title.edit")}
                    aria-haspopup="dialog"
                    onClick=${openNameEditor}
                >
                    ${h(Icon, { name: "pen", size: 20 })}
                </button>
            </span>
            ${
                temps
                    ? html`
                          <span class="title-temp">
                              <span class="nowrap">
                                  ${t("title.groundTemperature", temperature?.toFixed(0) ?? "")}
                              </span>
                              ${" "}
                              <span class="nowrap">
                                  ${t("title.altitudeTemperature", temps[4].toFixed(0))}
                              </span>
                              ${h(
                                  Help,
                                  {},
                                  html`
                                      <p>${t("title.temperatureHelp")}</p>

                                      <ul>
                                          <li>1km ${temps[1].toFixed(1)}°C</li>
                                          <li>2km ${temps[2].toFixed(1)}°C</li>
                                          <li>3km ${temps[3].toFixed(1)}°C</li>
                                          <li>4km ${temps[4].toFixed(1)}°C</li>
                                      </ul>

                                      <p>${h(FromNow, { date: time })}</p>
                                  `,
                              )}
                          </span>
                      `
                    : null
            }
        </h1>
        ${h(
            Dialog,
            { dialogRef, labelledBy: dialogTitleId },
            html`
                ${dialogScope.style}
                <div>
                    <h2 id=${dialogTitleId}>${t("title.edit")}</h2>
                    <form onSubmit=${saveName}>
                        <label>
                            ${t("menu.namePrompt")}
                            <input
                                ref=${inputRef}
                                name="name"
                                type="text"
                                value=${nameDraft}
                                onInput=${(/** @type {Event} */ event) =>
                                    setNameDraft(
                                        /** @type {HTMLInputElement} */ (
                                            event.currentTarget
                                        ).value,
                                    )}
                            />
                        </label>
                        <p class="name-hint">${t("title.emptyName")}</p>
                        <div class="name-actions">
                            <button type="submit">${t("common.save")}</button>
                        </div>
                    </form>
                </div>
            `,
        )}
    `;
}

export function Root() {
    const developerEditorRef = useRef(
        /** @type {DeveloperModeHandle | null} */ (null),
    );
    const scope = useScope(css`
        :scope {
            --panel-padding: 16px;
            display: grid;
            margin: 16px;
            margin-bottom: 100px;
            grid-template-columns: 1fr;
            gap: 16px;

            /** MOBILE **/
            grid-template-areas:
                ${ERRORS.value.length > 0 ? '"errors errors"' : ""}
                "title title"
                "clouds clouds"
                "winds winds"
                "observations-graph observations-graph"
                "forecasts-graph forecasts-graph"
                "dropzone-map dropzone-map"
                "high-winds-details high-winds-details"
                "high-winds-today high-winds-today"
                "info info";
        }
        @media (min-width: 900px) {
            :scope {
                grid-template-columns: minmax(250px, 1fr) minmax(250px, 1fr);
                grid-template-areas:
                    ${ERRORS.value.length > 0 ? '"errors errors"' : ""}
                    "title title"
                    "clouds winds"
                    "observations-graph forecasts-graph"
                    "dropzone-map dropzone-map"
                    "high-winds-today high-winds-today"
                    "high-winds-details high-winds-details"
                    "info info";
            }
        }
        :scope
            > :is(
                #clouds,
                #winds,
                #observations-graph,
                #forecasts-graph,
                #dropzone-map,
                #high-winds-today,
                #high-winds-details
            ) {
            min-width: 0;
            padding: var(--panel-padding);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-panel);
            box-shadow: var(--shadow-panel);
        }

        @media (max-width: 550px) {
            :scope {
                --panel-padding: 12px;
                margin: 12px;
                margin-bottom: 100px;
                gap: 12px;
            }
        }

        #clouds {
            grid-area: clouds;
        }

        #winds {
            grid-area: winds;
            display: flex;
            flex-direction: column;
        }

        #winds .h2-with-icon,
        #clouds .h2-with-icon {
            min-height: 36px;
            justify-content: space-between;
        }

        #observations-graph {
            grid-area: observations-graph;
        }

        #forecasts-graph {
            grid-area: forecasts-graph;
        }

        #high-winds-today {
            grid-area: high-winds-today;
        }

        #high-winds-details {
            grid-area: high-winds-details;
        }

        #high-winds-today,
        #high-winds-tomorrow,
        #high-winds-details {
            min-width: 0;
        }

        #errors {
            grid-area: errors;
        }

        .side-scroll {
            overflow-x: auto;
            overflow-y: hidden;
            width: 100%;
            position: relative;
            white-space: nowrap;
        }

        .errors p {
            color: var(--color-danger);
        }

        .h2-with-icon {
            display: flex;
            align-items: center;
        }

        ${cardHeadingStyles}

        .heading-spacer {
            width: 1ch;
        }
        .anvil {
            height: 30px;
            margin-left: 1ch;
        }
        #title {
            grid-area: title;
        }
        #info {
            grid-area: info;
        }
        ${dateHeadingStyles}
        ${freshnessStyles}
    `);

    return html`
        ${h(DeveloperBanner, { onEdit: () => developerEditorRef.current?.open() })}
        <div class="content grid">
            ${scope.style}
            ${
                ERRORS.value.length > 0
                    ? html`
                          <div id="errors" class="errors">
                              ${ERRORS.value.map((error) => {
                                  return html`
                                      <p>${error}</p>
                                  `;
                              })}
                          </div>
                      `
                    : null
            }

            <${Title} />

            <div class="clouds" id="clouds">
                <${CloudSummary} />
            </div>

            <div id="winds">
                <div class="card-heading">
                    <h2 class="h2-with-icon">${t("weather.winds")}</h2>
                    ${h(DataSource, { sources: [WIND_SOURCE.value] })}
                </div>
                <${WindSummary} />
                ${h(Compass, { floating: false })}
            </div>

            ${h(Compass, { floating: true })}
            ${h(Graph, {
                observationsTable: h(TableDialog, {
                    id: "observations-table",
                    title: t("weather.observations"),
                    children: html`
                        <div class="observations">
                            <p class="date">${formatDate(new Date())}</p>
                            <div class="side-scroll">
                                ${h(DataTable, {
                                    data: OBSERVATIONS,
                                    thead: html`
                                        <${ObservationTHead} />
                                    `,
                                    Rows: ObservationRows,
                                })}
                            </div>
                        </div>
                    `,
                }),
                forecastsTable: h(TableDialog, {
                    id: "forecasts-table",
                    title: t("weather.forecast"),
                    children: html`
                        <div class=${STALE_FORECASTS.value ? "stale" : "fresh"}>
                            <p class="date">
                                ${formatDate(FORECAST_DATE.value)} ${" "}
                                ${humanDayText(FORECAST_DATE.value)}
                            </p>
                            <p><${ForecastLocationInfo} /></p>
                            <div class="side-scroll">
                                ${h(DataTable, {
                                    data: FORECASTS,
                                    thead: html`
                                        <${ForecastTHead} />
                                    `,
                                    Rows: ForecastRows,
                                })}
                            </div>
                        </div>
                    `,
                }),
            })}
            ${h(DropzoneMap, {})}

            <${HighWinds} />
            <${Info} />
        </div>
        ${h(SideMenu, { developerEditorRef })}
        <${FloatingMenuButton} />

        <${RenderInjectedCSS} />
    `;
}
