// @ts-check
import { css, useScope } from "./useScope.js";
import {
    windStatusStyles,
    dateHeadingStyles,
    freshnessStyles,
    summaryStyles,
} from "./styles.js";
import { effect, signal } from "@preact/signals";
import { useRef, useState } from "preact/hooks";
import { h, html } from "htm/preact";
import { clearOMCache, OpenMeteoTool, OpenMeteoRaw } from "./om.js";
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
    RAW_DATA,
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
} from "./data.js";
import { DeveloperBanner, DeveloperMode } from "./DeveloperMode.js";

import { Graph } from "./graph.js";
import { DropzoneMap } from "./DropzoneMap.js";
import { Compass } from "./compass.js";
import {
    getLiftedCondensationLevel,
    dateOffset,
    EXAMPLE_CSS,
    formatClock,
    formatDate,
    humanDayText,
    isNullish,
    hasValidWindData,
    removeNullish,
    saveTextToFile,
    formatCloudBase,
    whenAll,
    coordinateDistance,
} from "./utils.js";
import { Help, FromNow, ErrorBoundary, Dialog } from "./components.js";

effect(() => {
    document.title = NAME.value + " – Hyppykeli";
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
            <th>Kello</th>
            <th>Puuska</th>
            <th>Tuuli</th>
            <th>Suunta</th>
            <th>
                TK
                ${h(
                    Help,
                    {},
                    html`
                        <p>
                            Tiivistymiskorkeus.${" "}
                            <a
                                href="#"
                                onClick=${(/** @type {any} */ e) => {
                                    e.preventDefault();
                                    document
                                        .getElementById("dewpoint")
                                        ?.click();
                                }}
                            >
                                Lue lisää
                            </a>
                        </p>
                    `,
                )}
            </th>
            <th>Lämpötila</th>
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
            <th>Kello</th>
            <th>Puuska</th>
            <th>Tuuli</th>
            <th>Suunta</th>
            <th class="cloud-low-heading">
                Pilvet L
                ${h(
                    Help,
                    {},
                    html`
                        <p>
                            Matalakerroksen (Low) pilvien peittävyys jotka
                            sijaitsevat yleensä alle 2 kilometrin (noin 6 500
                            jalan) korkeudella merenpinnasta.
                        </p>
                    `,
                )}
            </th>
            <th class="cloud-middle-heading">
                Pilvet ML
                ${h(
                    Help,
                    {},
                    html`
                        <p>
                            Matalan ja keskikerroksen (MiddleAndLow) pilvien
                            peittävyys jotka sijaitsevat yleensä 2-7 kilometrin
                            (noin 6 500-23 000 jalan) korkeudella merenpinnasta.
                        </p>
                    `,
                )}
            </th>

            <th>
                TK
                ${h(
                    Help,
                    {},
                    html`
                        <p>
                            Tiivistymiskorkeus.${" "}
                            <a
                                href="#"
                                onClick=${(/** @type {any} */ e) => {
                                    e.preventDefault();
                                    document
                                        .getElementById("dewpoint")
                                        ?.click();
                                }}
                            >
                                Lue lisää
                            </a>
                        </p>
                    `,
                )}
            </th>

            <th>
                Sade
                ${h(
                    Help,
                    {},
                    html`
                        <p>Sateen todenäköisyys prosentteina.</p>
                    `,
                )}
            </th>

            <th>Lämpötila</th>
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
            ${scope.style}
            <${PieChart} percentage=${props.percentage} />
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}

/**
 * @param {Object} props
 * @param {number} props.percentage
 */
function PieChart({ percentage }) {
    const adjustedPercentage = Math.min(100, Math.max(0, percentage));
    const angle = (adjustedPercentage / 100) * 360;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const endX = 50 + 50 * Math.cos(((angle - 90) * Math.PI) / 180);
    const endY = 50 + 50 * Math.sin(((angle - 90) * Math.PI) / 180);

    return html`
        <svg class="pie" width="20" height="20" viewBox="0 0 100 100">
            <circle
                cx="50"
                cy="50"
                r="50"
                fill=${percentage >= 100 ? "black" : "white"}
                stroke="black"
                stroke-width="1"
            />
            <path
                d=${`M 50 50 L 50 0 A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                fill="black"
            />
        </svg>
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
            transform: rotate(var(--direction));
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
                    "--direction": props.direction - 180 - 90 + "deg",
                    visibility: props.direction !== -1 ? "visible" : "hidden",
                }}
            >
                ➤
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
            aria-label=${`${props.title} taulukkona`}
            aria-haspopup="dialog"
            aria-controls=${props.id}
            title=${`${props.title} taulukkona`}
            onClick=${() => ref.current?.showModal()}
        >
            ${scope.style}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
            >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M3 15h18M9 9v12" />
            </svg>
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
            font-size: clamp(1rem, 2.5vw, 1.5rem);
            white-space: nowrap;
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

    if (!hasValidWindData(obs)) {
        return html`
            <p>Ei havaintoja :(</p>
        `;
    }

    return html`
        <div class="wind-summary">
            ${scope.style}
            <dl class="summary-metrics wind-metrics">
                <div class="latest-wind-cell">
                    <dt>Puuska</dt>
                    <dd
                        class=${"latest-value latest-gust " + getWarningLevel(obs.gust ?? 0)}
                    >
                        ${obs.gust?.toFixed(1) ?? "?"}
                        <span class="unit">m/s</span>
                    </dd>
                </div>
                <div class="latest-wind-cell">
                    <dt>Keskituuli</dt>
                    <dd class="latest-value latest-wind">
                        ${obs.speed?.toFixed(1) ?? "?"}
                        <span class="unit">m/s</span>
                    </dd>
                </div>
                <div class="latest-wind-cell">
                    <dt>Suunta</dt>
                    <dd class="latest-value latest-wind">
                        ${h(WindDirection, { direction: obs.direction, value: true })}
                    </dd>
                </div>
            </dl>
            <div class="summary-time">${h(FromNow, { date: obs.time })}</div>
        </div>
    `;
}

// const CLOUDS = {
//     NCD: "Ei pilviä",
//     VV: "SUMUA PERKELE",
//     NSC: "Yksittäisiä",
//     FEW: "Muutamia",
//     SCT: "Hajanaisia",
//     BKN: "Rakoileva",
//     OVC: "Täysi pilvikatto",
// };

/**
 * @type {Record<string, string>}
 */
const CLOUD_TYPES = {
    NCD: "Ei pilviä",
    VV: "SUMUA PERKELE",
    NSC: "Yksittäisiä",
    FEW: "Muutamia",
    SCT: "Hajanaisia",
    BKN: "Rakoileva",
    OVC: "Täysi pilvikatto",
};

/**
 * @param {Object} props
 * @param {CloudLayer} props.cloud
 **/
function CloudLayer({ cloud }) {
    const scope = useScope(css`
        :scope {
            font-size: 120%;
            font-family: var(--font-mono);
        }
    `);
    return html`
        <a href=${cloud.href}>${CLOUD_TYPES[cloud.amount] ?? cloud.amount}</a>
        ${" "}
        <b>${formatCloudBase(cloud.base, cloud.unit)}</b>
        ${h(
            Help,
            {},
            html`
                <p class="metar">
                    ${scope.style}
                    ${cloud.amount}${" "}${cloud.base}${cloud.unit}
                </p>
            `,
        )}
    `;
}

function CloudSummary() {
    const scope = useScope(css`
        ${summaryStyles}
        .cloud-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .cloud-layers {
            display: grid;
            gap: 8px;
            font-size: 1.1rem;
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
            margin: 0;
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
            overflow-x: auto;
            white-space: nowrap;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-muted);
        }
    `);

    const metar = METARS.value?.at(-1);
    const latest = LATEST_OBSERVATION.value;
    const time = metar?.time ?? latest?.time;
    const forecasts = HOURLY_CLOUD_FORECASTS.value;

    let msg = "";

    if (metar?.clouds.length === 0 && metar.metar.includes("CAVOK")) {
        msg = "Ei pilviä alle 1500M (CAVOK)";
    }

    return html`
        <div class="cloud-summary">
            ${scope.style}
            ${
                metar
                    ? html`
                          <ul class="cloud-list">
                              <li class="cloud-layers">
                                  ${
                                      msg
                                          ? msg
                                          : metar?.clouds.map(
                                                (cloud) => html`
                                                    <div>
                                                        ${h(CloudLayer, { cloud })}
                                                    </div>
                                                `,
                                            )
                                  }
                                  ${metar?.cb ? "Ukkospilviä ⚡️" : null}
                              </li>

                              <li>
                                  ${
                                      metar?.metar
                                          ? html`
                                                <code
                                                    class="metar"
                                                    tabindex="0"
                                                    aria-label="METAR"
                                                >
                                                    ${metar.metar}
                                                </code>
                                            `
                                          : null
                                  }
                                  <div class="summary-time">
                                      ${h(FromNow, { date: time })}
                                  </div>
                              </li>
                          </ul>
                      `
                    : null
            }

            <dl class="summary-metrics cloud-estimates">
                ${whenAll(
                    [latest?.temperature, latest?.dewPoint],
                    (temp, dew) => html`
                        <div class="condensation">
                            <dt>Tiivistymiskorkeus</dt>
                            <dd class="cloud-list-item-alt">
                                <b>${getLiftedCondensationLevel(temp, dew)}M</b>
                                ${h(
                                    Help,
                                    { id: "dewpoint" },
                                    html`
                                        <!-- prettier-ignore -->
                                        <p>
                                    Arvio mahdollisten pilvien korkeudesta${" "}
                                    <a href="https://fi.wikipedia.org/wiki/Nostotiivistyskorkeus">tiivistymiskorkeuden</a>${" "}
                                    perusteella.
                                    Laskettu lämpötilasta ${temp.toFixed(1)}°C
                                    ja kastepisteestä ${dew.toFixed(1)}°C
                                    pyöristäen lähimpään 100 metriin.${" "}
                                    ${h(FromNow, { date: latest?.time })}

                                </p>

                                        <p>
                                            Arvio on järjellinen vain silloin
                                            kun pilvet ovat muodostuneet
                                            mittauspaikalla. Jos pilvet ovat
                                            muodostuneet toisaalla eri
                                            lämpötilassa/kastepisteessä ja
                                            saapuneet tuulen mukana, arvio on
                                            todennäköisesti päin prinkkalaa.
                                        </p>
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
                              aria-label="Pilvien ennuste"
                          >
                              <div class="forecast-heading">
                                  <h3>Ennuste · 12 tuntia</h3>
                                  ${h(
                                      Help,
                                      { id: "cloudforecast" },
                                      html`
                                          <p>
                                              Tiivistymiskorkeuden ja matalien
                                              (alle 2km) pilvien peittävyyden
                                              tuntiennuste. Vieritä sivulle
                                              nähdäksesi lisää tunteja.
                                          </p>
                                      `,
                                  )}
                              </div>
                              <div
                                  class="forecast-scroll"
                                  tabindex="0"
                                  role="region"
                                  aria-label="Pilvien tuntiennuste, vieritä sivulle"
                              >
                                  <table class="cloud-forecast-table">
                                      <thead>
                                          <tr>
                                              <th scope="col">Kello</th>
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
                                                  Tiivistymiskorkeus
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
                                          <tr>
                                              <th scope="row">Pilvipeitto</th>
                                              ${forecasts.map(
                                                  (forecast) => html`
                                                      <td
                                                          class="forecast-reading"
                                                      >
                                                          ${isNullish(forecast.lowCloudCover) ? "—" : h(PercentagePie, { percentage: forecast.lowCloudCover })}
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
            Päivitä
        </button>
        <br />
        <small>Tiedot päivitetään automaattisesti minuutin välein.</small>
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
        e.target instanceof HTMLElement &&
        e.target.closest(".side-menu,.sticky-footer")
    ) {
        return;
    }

    MENU_OPEN.value = false;
});

/**
 * @type {Signal<{title: string, href: string}[]>}
 */
export const OTHER_DZs = signal([]);

// Load DZ list when the menu is opened
effect(() => {
    if (!MENU_OPEN.value) {
        return;
    }

    // load only once
    if (OTHER_DZs.value.length > 0) {
        return;
    }

    fetch("/").then(async (res) => {
        if (!res.ok || res.status !== 200) {
            addError("Virhe haettaessa muita DZ:ta");
            return;
        }

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const dzs = Array.from(doc.querySelectorAll(".dz-list a")).flatMap(
            (a) => {
                if (!(a instanceof HTMLAnchorElement)) {
                    return [];
                }

                const title = a.textContent;
                const href = a.href;

                if (!title || !href) {
                    return [];
                }

                const url = new URL(href);

                return { title, href: `${url.pathname}${url.search}` };
            },
        );

        dzs.sort((a, b) => a.title.trim().localeCompare(b.title.trim()));

        OTHER_DZs.value = dzs;
    });
});

/**
 * @param {SubmitEvent} e
 */
function downloadDataDump(e) {
    e.preventDefault();
    let mode = "download";
    if (e.submitter instanceof HTMLButtonElement) {
        mode = e.submitter.value;
    }

    if (!(e.target instanceof HTMLFormElement)) {
        return;
    }

    const formData = new FormData(e.target);

    const storedQuery = /** @type {StoredQuery | null} */ (
        formData.get("storedQuery")?.toString() ?? null
    );

    if (!storedQuery) {
        return;
    }

    const raw = RAW_DATA.value[storedQuery];

    if (!raw) {
        return;
    }

    const date = new Date().toISOString().split("T")[0]?.replaceAll("-", "");
    const clock = formatClock(new Date()).replace(":", "");

    const name = storedQuery.replaceAll("::", "_");
    const filename = `hyppykeli_${date}-${clock}_${name}.xml`;

    if (mode === "download") {
        saveTextToFile(filename, raw);
    } else {
        const file = new File([raw], filename, {
            type: "application/xml",
        });

        /**
         * @type {ShareData}
         */
        const share = {
            title: "Hyppykeli datadump " + storedQuery,
            text: `Hyppykeli datadump ${storedQuery} ${date} ${clock}`,
            files: [file],
        };

        if (navigator.canShare(share)) {
            alert("Jakaminen ei ole tuettu tässä selaimessa.");
        } else {
            navigator.share(share);
        }
    }
}

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

export function SideMenu() {
    const scope = useScope(css`
        :scope {
            position: fixed;
            z-index: 200;
            background-color: var(--color-surface);
            right: -100%;
            top: 0;
            bottom: 0px;
            width: clamp(250px, 300px, 70vw);
            overflow-y: auto;
            background-color: var(--color-surface);
            box-shadow: var(--shadow-floating);
            transition: right 0.3s ease;
            padding: 40px;
            padding-bottom: 100px;
        }

        :scope select {
            width: 100%;
            margin-bottom: 5px;
        }

        :scope.open {
            right: 0;
        }
        .hide {
            display: none;
        }

        button[value="share"] {
            margin-left: 1ch;
        }

        .dz-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 2px;
        }
        .dzs button {
            margin-left: 1ch;
            font-size: 50%;
        }
    `);

    /**
     * @param {MouseEvent} e
     */
    const closeMenuOnLinkClick = (e) => {
        if (!(e.target instanceof HTMLElement)) {
            return;
        }

        if (e.target instanceof HTMLAnchorElement || e.target?.closest("a")) {
            MENU_OPEN.value = false;
        }
    };

    return html`
        <div
            class="${MENU_OPEN.value ? "side-menu open" : "side-menu"}"
            onClick=${closeMenuOnLinkClick}
        >
            ${scope.style}
            <h1>${NAME.value}</h1>

            <a href="/?no_redirect">Etusivulle</a>

            <h2>Ennuste</h2>

            <p>
                ${
                    FORECAST_DAY.value === 0
                        ? html`
                              <a
                                  onClick=${asInPageNavigation}
                                  href="${getQs({ forecast_day: "1" })}"
                              >
                                  Näytä huomisen ennuste
                              </a>
                          `
                        : html`
                              <a
                                  onClick=${asInPageNavigation}
                                  href="${getQs({ forecast_day: undefined })}"
                              >
                                  Näytä tämän päivän ennuste
                              </a>
                          `
                }
            </p>

            <form>
                Hae ennuste päivälle:${" "}
                <input
                    type="date"
                    name="forecast_date"
                    min=${new Date().toISOString().split("T")[0]}
                    max=${dateOffset(9).toISOString().split("T")[0]}
                    onInput=${handleForecastDayChange}
                    value=${FORECAST_DATE.value.toISOString().split("T")[0]}
                />
            </form>

            <h2>Päivitä sisältö</h2>

            <p>
                <${UpdateButton} />
            </p>

            <h2>Osiot</h2>

            <p><a href="#observations-graph">Havainnot 📈</a></p>
            <p><a href="#forecasts-graph">Ennusteet 📈</a></p>
            <p><a href="#high-winds-today">Ylätuuliennusteet</a></p>

            <h2>Hyppypaikat</h2>

            <h3>Tallennetut</h3>

            <div class="dzs" onClick=${savePreviousDz}>
                ${SAVED_DZs.value.flatMap((dz) => {
                    const name = dz.name;
                    if (!name) {
                        return [];
                    }

                    const qs =
                        "?" + new URLSearchParams(removeNullish(dz)).toString();

                    return html`
                        <p>
                            <a href=${qs}>${name}</a>
                            <button
                                type="button"
                                onClick=${() => {
                                    if (
                                        confirm(
                                            "Haluatko varmasti poistaa tallennetun DZ:n?",
                                        )
                                    ) {
                                        // Remove after timeout so the button is still present
                                        // whent the outside click detection is triggered
                                        // or otherwise the menu is unintentionally closed
                                        setTimeout(() => {
                                            removeSavedDz(name);
                                        });
                                    }
                                }}
                            >
                                ╳
                            </button>
                        </p>
                    `;
                })}
            </div>

            <button
                type="button"
                onClick=${() => {
                    saveCurrentDz(prompt("Nimi", NAME.value));
                }}
            >
                Tallenna nykyinen
            </button>

            <h3>Muut</h3>
            <div class="dzs dz-grid" onClick=${savePreviousDz}>
                ${OTHER_DZs.value.map(
                    (dz) => html`
                        <p><a href=${dz.href}>${dz.title}</a></p>
                    `,
                )}
            </div>

            <h2>Ongelmia?</h2>

            <p>
                Näkyykö tiedot jotenkin väärin? Lataa alla olevasta napista
                datadumpit ja lähetä ne Esalle hyppykeli@esamatti.fi ja kerro
                millä tavalla ne näkyi väärin. Laita kuvakaappaus mukaan myös.
            </p>

            <form onSubmit=${downloadDataDump}>
                <select name="storedQuery">
                    ${Object.keys(RAW_DATA.value).map(
                        (key) => html`
                            <option value=${key}>${key}</option>
                        `,
                    )}
                </select>
                <button type="submit" name="mode" value="download">
                    Lataa
                </button>
                <button
                    class=${
                        // @ts-ignore
                        navigator.share ? "" : "hide"
                    }
                    type="submit"
                    name="mode"
                    value="share"
                >
                    Jaa
                </button>
            </form>

            <h2>Muokkaa näkymää</h2>
            <p>
                Tee mukautettu näkymä lisäämällä omaa CSS-koodia. Katso
                esimerkki${" "}
                <a
                    onClick=${asInPageNavigation}
                    href=${getQs({ css: btoa(EXAMPLE_CSS) })}
                >
                    tästä
                </a>
            </p>
            <${CSSEditor} />

            <!-- prettier-ignore -->
            <p>
                Tietoja palvelusta: Katso <a href="/?no_redirect=1">etusivu</a>.
            </p>
            ${h(DeveloperMode, {
                onOpen: () => {
                    MENU_OPEN.value = false;
                },
            })}
        </div>
    `;
}

/**
 * @param {Object} e
 * @param {HTMLFormElement} e.target
 * @param {()=>void} e.preventDefault
 */
function handleCSSEditorSubmit(e) {
    e.preventDefault();
    const css = new FormData(e.target).get("css")?.toString() ?? "";
    navigateQs({ css: btoa(css) });
}

function CSSEditor() {
    const scope = useScope(css`
        :scope textarea {
            width: 100%;
            height: 30ch;
        }
    `);

    // prettier-ignore
    return html`
        <form class="css-editor" onSubmit=${handleCSSEditorSubmit}>
            ${scope.style}
            <textarea name="css">${atob(QUERY_PARAMS.value.css || "")}</textarea>
            <button type="submit">Submit</button>
        </form>
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

export function StickyFooter() {
    const scope = useScope(css`
        :scope .item .icon,
        :scope .item .text {
            display: flex;
            justify-content: center;
        }

        :scope .item {
            display: flex;
            justify-items: center;
            align-items: center;
            text-decoration: none;
            height: 100%;
        }

        :scope {
            display: flex;
            z-index: 200;
            align-items: center;
            height: 64px;
            position: fixed;
            bottom: 0;
            width: 100%;
            border-top: 1px solid var(--color-border);
            background-color: var(--color-surface);
            box-shadow: var(--shadow-floating);
            overflow-x: auto;
            justify-content: space-around;
        }
        :scope .item {
            padding: 6px 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        :scope .item:hover {
            background: var(--color-surface-hover);
        }
        .menu-burger {
            height: 40px;
            width: 40px;
            font-size: 150%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
    `);

    return html`
        <div class="sticky-footer">
            ${scope.style}
            <a class="item" href="#top">
                <div class="wrap">
                    <div class="icon">⬆️</div>
                </div>
            </a>

            <a class="item" href="#observations-graph">
                <div class="wrap">
                    <div class="icon">📈</div>
                    <div class="text">Kaaviot</div>
                </div>
            </a>

            <a class="item" href="#high-winds-today">
                <div class="wrap">
                    <div class="icon">💨</div>
                    <div class="text">Ylätuulet</div>
                </div>
            </a>

            <button
                class="menu-burger"
                type="button"
                onClick=${() => {
                    MENU_OPEN.value = !MENU_OPEN.value;
                }}
            >
                ☰
            </button>
        </div>
    `;
}

function Anvil() {
    if (!METARS.value?.at(-1)?.cb) {
        return;
    }

    return html`
        <img
            class="anvil"
            alt="Ukkospilvi"
            title="Ukkospilvi"
            src="/assets/anvil.svg"
        />
    `;
}

function ForecastLocationInfo() {
    return html`
        Ennuste on tehty alueelle${" "}
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
            <h2>ECMWF Ylätuuliennusteet</h2>

            <p>
                <button
                    type="button"
                    onClick=${() => setShowDetails(!showDetails)}
                >
                    ${showDetails ? "Näytä kooste" : "Näytä tarkat tiedot"}
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

            <p>
                Lähde <a href="https://open-meteo.com/">Open-Meteo</a> API.
            </p>
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
        <div id="info">
            ${scope.style}
            ${
                STATION_NAME.value
                    ? html`
                          Havaintotiedot haettu havaintoasemalta${" "}
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
                          ${" "}Lentokentän korkeus meren pinnasta${" "}
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

                    return `Etäisyys havaintoasemalle ${km}km.`;
                },
            )}
            <div class="disclaimer">
                ${" "}Tietojen käyttö omalla vastuulla. Ei takeita että tiedot
                ovat oikein.
            </div>
            <small>
                Psst, onko tarvetta hyppypäiväkirjalle? Tsekkaa
                <a href="https://loki.hyppykeli.fi/">Loki</a>
                . Koodi HYPPYKELI2026
            </small>
        </div>
    `;
}

function Title() {
    const scope = useScope(css`
        :scope {
            grid-area: title;
            max-width: 100%;
            width: 100%;
            word-break: break-word;
        }
        .nowrap {
            white-space: nowrap;
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
            <span class="title-name">${NAME}</span>
            ${
                temps
                    ? html`
                          <span class="title-temp">
                              <span class="nowrap">
                                  ${temperature?.toFixed(1)}°C maassa,
                              </span>
                              ${" "}
                              <span class="nowrap">
                                  ${temps[4].toFixed(1)}°C 4km:ssä
                              </span>
                              ${h(
                                  Help,
                                  {},
                                  html`
                                      <p>
                                          ICAO:n${" "}
                                          <a
                                              href="https://fi.wikipedia.org/wiki/Kansainv%C3%A4linen_standardi-ilmakeh%C3%A4"
                                          >
                                              ilmakehämallin
                                          </a>
                                          ${" "} mukainen lämpötilan muutos
                                          Troposfäärissä (-6.5°C/km)
                                      </p>

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
    `;
}

export function Root() {
    const scope = useScope(css`
        :scope {
            display: grid;
            margin: 20px;
            margin-bottom: 100px;
            grid-template-columns: 1fr;
            gap: 20px;

            /** MOBILE **/
            grid-template-areas:
                "errors errors"
                "title title"
                "info info"
                "clouds clouds"
                "winds winds"
                "observations-graph observations-graph"
                "forecasts-graph forecasts-graph"
                "dropzone-map dropzone-map"
                "high-winds-details high-winds-details"
                "high-winds-today high-winds-today";
        }
        @media (min-width: 900px) {
            :scope {
                grid-template-columns: minmax(250px, 1fr) minmax(250px, 1fr);
                grid-template-areas:
                    "errors errors"
                    "title title"
                    "info info"
                    "clouds winds"
                    "observations-graph forecasts-graph"
                    "dropzone-map dropzone-map"
                    "high-winds-today high-winds-today"
                    "high-winds-details high-winds-details";
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
            padding: 20px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-panel);
            box-shadow: var(--shadow-panel);
        }

        @media (max-width: 550px) {
            :scope {
                margin: 12px;
                margin-bottom: 100px;
                gap: 12px;
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
                padding: 14px;
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
        <${DeveloperBanner} />
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

            <${Info} />

            <div class="clouds" id="clouds">
                <h2 class="h2-with-icon">
                    Pilvet
                    <${Anvil} />
                </h2>

                <${CloudSummary} />
            </div>

            <div id="winds">
                <h2 class="h2-with-icon">Tuulet</h2>
                <${WindSummary} />
                ${h(Compass, { floating: false })}
            </div>

            ${h(Compass, { floating: true })}
            ${h(Graph, {
                observationsTable: h(TableDialog, {
                    id: "observations-table",
                    title: "Havainnot",
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
                    title: "Ennuste",
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
        </div>
        <${SideMenu} />
        <${StickyFooter} />

        <${RenderInjectedCSS} />
    `;
}
