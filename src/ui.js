// @ts-check
import { css, useScope } from "./useScope.js";
import {
    windStatusStyles,
    dateHeadingStyles,
    freshnessStyles,
} from "./styles.js";
import { effect, signal } from "@preact/signals";
import { useState } from "preact/hooks";
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
    HOVERED_OBSERVATION,
    updateWeatherData,
    LOADING,
    addError,
    RAW_DATA,
    FORECAST_DAY,
    FORECAST_DATE,
    STALE_FORECASTS,
    GUST_TREND,
    FORECAST_LOCATION_NAME,
    QUERY_PARAMS,
    navigateQs,
    getQs,
    LATEST_OBSERVATION,
    SAVED_DZs,
    saveCurrentDz,
    removeSavedDz,
    SINGLE_FORECAST,
} from "./data.js";

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
import { Help, FromNow, ErrorBoundary } from "./components.js";

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
            <${Help} label="?">
                <p>
                Tiivistymiskorkeus.${" "}
                <a href="#" onClick=${(/** @type {any} */ e) => {
                    e.preventDefault();
                    document.getElementById("dewpoint")?.click();
                }}>Lue lisää</a>
                </p>
            </${Help}>
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
    return html`<tr>
        <th>Kello</th>
        <th>Puuska</th>
        <th>Tuuli</th>
        <th>Suunta</th>
        <th class="cloud-low-heading">
            Pilvet L
            <${Help} label="?">
                <p>
                    Matalakerroksen (Low) pilvien peittävyys jotka sijaitsevat yleensä alle 2 kilometrin (noin 6 500 jalan) korkeudella merenpinnasta.
                </p>
            </${Help}>
        </th>
        <th class="cloud-middle-heading">
            Pilvet ML
            <${Help} label="?">
                <p>
                    Matalan ja keskikerroksen (MiddleAndLow) pilvien peittävyys jotka sijaitsevat yleensä 2-7 kilometrin (noin 6 500-23 000 jalan) korkeudella merenpinnasta.
                </p>
            </${Help}>
        </th>

        <th>
            TK
            <${Help} label="?">
                <p>
                Tiivistymiskorkeus.${" "}
                <a href="#" onClick=${(/** @type {any} */ e) => {
                    e.preventDefault();
                    document.getElementById("dewpoint")?.click();
                }}>Lue lisää</a>
                </p>
            </${Help}>
        </th>

        <th>
            Sade
            <${Help} label="?">
                <p>Sateen todenäköisyys prosentteina.</p>
            </${Help}>
        </th>

        <th>Lämpötila</th>

    </tr>`;
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
            background-color: white;
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
            background-color: #e9e9e9;
        }
        :scope th.cloud-low-heading {
            width: 10ch;
        }
        :scope th.cloud-middle-heading {
            width: 11ch;
        }
        ${windStatusStyles}
    `);

    const moreScope = useScope(css`
        :scope {
            font-size: 80%;
        }
    `);
    const [showAll, setShowAll] = useState(false);
    const data = showAll ? props.data.value : props.data.value.slice(0, 50);
    const showLoadMore = !showAll && props.data.value.length > data.length;

    return html`
        <table class="weather-table">
            ${scope.style}
            <thead>${props.thead}</thead>
            <tbody>
                <${props.Rows} data=${data} />
            </tbody>
        </table>
        ${
            showLoadMore
                ? html`
                      <div class="show-more">
                          ${moreScope.style}
                          <button
                              type="button"
                              onClick=${() => setShowAll(true)}
                          >
                              Näytä kaikki (${props.data.value.length})
                          </button>
                      </div>
                  `
                : null
        }
    `;
}

function WindSummary() {
    const scope = useScope(css`
        .latest-wind-cell {
            display: flex;
            white-space: nowrap;
            justify-content: space-between;
            max-width: 20ch;
        }

        .latest-value {
            font-weight: bold;
            font-size: 130%;
        }
        :scope.historic {
            opacity: 0.5;
        }
        ${windStatusStyles}
        @media (min-width: 900px) {
            .latest-wind-cell {
                display: inline;
            }
        }
    `);

    const history = !!HOVERED_OBSERVATION.value;
    const obs = HOVERED_OBSERVATION.value || LATEST_OBSERVATION.value;

    if (!obs) {
        return null;
    }

    if (!hasValidWindData(obs)) {
        return html`
            <p>Ei havaintoja :(</p>
        `;
    }

    return html`
        <p class=${history ? "historic" : ""}>
            ${scope.style}

            <div class="latest-wind-cell">
            Puuska
                <span
                    class=${
                        "latest-value latest-gust " +
                        getWarningLevel(obs.gust ?? 0)
                    }
                >
                    ${" "}${obs.gust?.toFixed(1) ?? "?"} m/s${" "}
                </span>
            </div>

            <div class="latest-wind-cell">
            Keskituuli
            <span class="latest-value latest-wind">
                ${" "}${obs.speed?.toFixed(1) ?? "?"} m/s${" "}
            </span>
            </div>

            <div class="latest-wind-cell">
            Suunta${" "}
            <span class="latest-value latest-wind">
                <${WindDirection} direction=${obs.direction} />
            </span>
            ${" "}
            </div>

            <div>
                <${FromNow} date=${obs.time} />
            </div>

            <div>
                <${GustTrend} />
            </div>
        </p>
    `;
}

function GustTrend() {
    const trend = GUST_TREND.value;
    if (Math.abs(trend) < 2) {
        return;
    }

    const help = html`<${Help} label="?">Seuraavan tunnin aikana puuska vaikuttaa muuttuvan yli 2m/s.</${Help}>`;

    return html`
        <div title=${`Ero ${trend.toFixed(1)}m/s`}>
            ${
                trend > 0
                    ? html`
                          Mahdollisesti voimistuva ↗ ${help}
                      `
                    : html`
                          Mahdollisesti heikkenevä ↘ ${help}
                      `
            }
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
            font-family: monospace;
        }
    `);
    return html`
        <a href=${cloud.href}>${CLOUD_TYPES[cloud.amount] ?? cloud.amount}</a>
        ${" "}
        <b>${formatCloudBase(cloud.base, cloud.unit)}</b>
        ${h(
            Help,
            { label: "?" },
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
        .vertical-center {
            display: inline-flex;
            align-items: center;
        }

        .metar {
            font-size: 70%;
            font-family: monospace;
        }
        .condensation {
            margin-top: 10px;
        }
        .forecast-label {
            margin-right: 1ch;
        }
    `);

    const metar = METARS.value?.at(-1);
    const latest = LATEST_OBSERVATION.value;
    const time = metar?.time ?? latest?.time;
    const forecast = SINGLE_FORECAST.value;

    let msg = "";

    if (metar?.clouds.length === 0 && metar.metar.includes("CAVOK")) {
        msg = "Ei pilviä alle 1500M (CAVOK)";
    }

    return html`
        <ul class="cloud-list" style=${{ display: metar ? "block" : "none" }}>
            ${scope.style}
            <li>
                ${
                    msg
                        ? msg
                        : metar?.clouds.map((cloud) => h(CloudLayer, { cloud }))
                }
                ${metar?.cb ? "Ukkospilviä ⚡️" : null}
            </li>

            <li>
                <small>
                    <${FromNow} date=${time} />
                </small>

                <br />
                ${
                    metar?.metar
                        ? html`
                              <em class="metar">${metar.metar}</em>
                          `
                        : null
                }
            </li>
        </ul>

        <ul class="cloud-list">
            ${scope.style}
            ${whenAll(
                [latest?.temperature, latest?.dewPoint],
                (temp, dew) => html`
                    <li class="condensation">
                        <span class="cloud-list-item-alt">
                            Tiivistymiskorkeus${" "}
                            <b>${getLiftedCondensationLevel(temp, dew)}M</b>
                        </span>
                        ${h(
                            Help,
                            { label: "?", id: "dewpoint" },
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
                                    Arvio on järjellinen vain silloin kun pilvet
                                    ovat muodostuneet mittauspaikalla. Jos
                                    pilvet ovat muodostuneet toisaalla eri
                                    lämpötilassa/kastepisteessä ja saapuneet
                                    tuulen mukana, arvio on todennäköisesti päin
                                    prinkkalaa.
                                </p>
                            `,
                        )}
                    </li>

                    <li>
                        <span class="vertical-center">
                            <span class="forecast-label">
                                2h päästä
                                ${whenAll(
                                    [forecast?.temperature, forecast?.dewPoint],
                                    (temp, dew) =>
                                        ` ${getLiftedCondensationLevel(temp, dew)}M`,
                                )}
                            </span>
                            ${h(PercentagePie, {
                                percentage: forecast?.lowCloudCover ?? 0,
                            })}
                            ${h(
                                Help,
                                { label: "?", id: "cloudforecast" },
                                html`
                                    <p>
                                        Tiivistymiskorkeuden ja pilvipeiton
                                        ennuste matalille (alle 2km) pilville
                                        ${
                                            forecast
                                                ? ` klo ${formatClock(forecast?.time)}`
                                                : null
                                        }
                                    </p>
                                `,
                            )}
                        </span>
                    </li>
                `,
            )}
        </ul>
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
 * Navigate to a link without reloading the while updating the QUERY_PARAMS signal
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
    const foo = Object.fromEntries(target.searchParams);
    navigateQs(foo, { replace: true });
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
            background-color: white;
            right: -100%;
            top: 0;
            bottom: 0px;
            width: clamp(250px, 300px, 70vw);
            overflow-y: auto;
            background-color: white;
            box-shadow: -6px 0 2px -2px gray;
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
            <p><a href="#observations-table">Havainnot 🧾</a></p>
            <p><a href="#forecasts-table">Ennusteet 🧾</a></p>
            <p>
                <a
                    href="${
                        QUERY_PARAMS.value.high_winds_details
                            ? "#high-winds-details"
                            : "#high-winds-today"
                    }"
                >
                    Ylätuuliennusteet
                </a>
            </p>

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
            height: 50px;
            position: fixed;
            bottom: 0;
            width: 100%;
            background-color: white;
            box-shadow: 0 -4px 2px -2px gray;
            overflow-x: auto;
            justify-content: space-around;
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

            <a class="item" href="#observations-table">
                <div class="wrap">
                    <div class="icon">🧾</div>
                    <div class="text">Taulukot</div>
                </div>
            </a>

            <a
                class="item"
                href="${
                    QUERY_PARAMS.value.high_winds_details
                        ? "#high-winds-details"
                        : "#high-winds-today"
                }"
            >
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

import { DynamicParachute } from "./DynamicParachute.js";

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
    const showDetails = Boolean(QUERY_PARAMS.value.high_winds_details);

    if (showDetails) {
        return html`
            <div id="high-winds-details">
                <h2>ECMWF Ylätuuliennusteet</h2>

                <p>
                    <a
                        onClick=${asInPageNavigation}
                        href="${getQs({ high_winds_details: undefined })}"
                    >
                        Näytä kooste
                    </a>
                </p>

                <${OpenMeteoRaw} />
            </div>
        `;
    }

    return html`
        <div id="high-winds-today">
            <h2>ECMWF Ylätuuliennusteet</h2>

            <p>
                Lähde <a href="https://open-meteo.com/">Open-Meteo</a> API.${" "}
                <a
                    onClick=${asInPageNavigation}
                    href="${getQs({ high_winds_details: "1" })}"
                >
                    Näytä tarkat tiedot
                </a>
            </p>

            <${ErrorBoundary}>
                <${OpenMeteoTool} />
            </${ErrorBoundary}>
        </div>

        <div id="high-winds-tomorrow">
                <${ErrorBoundary}>
                    <${OpenMeteoTool} tomorrow />
                </${ErrorBoundary}>
        </div>
    `;
}

function Info() {
    const scope = useScope(css`
        :scope {
            grid-area: info;
            width: calc(100vw - 30px - var(--compass-width));
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
            width: calc(100vw - 30px - var(--compass-width));
            word-break: break-word;
        }
        .nowrap {
            white-space: nowrap;
        }

        .title-temp {
            font-size: 65%;
            color: #707070;
            font-family: monospace;
        }

        .title-name,
        .title-temp {
            display: block;
        }
    `);

    const historic = !!HOVERED_OBSERVATION.value;
    const time =
        HOVERED_OBSERVATION.value?.time ?? LATEST_OBSERVATION.value?.time;
    const temperature =
        HOVERED_OBSERVATION.value?.temperature ??
        LATEST_OBSERVATION.value?.temperature;

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
                          <span
                              class="title-temp"
                              style=${{ opacity: historic ? 0.5 : 1 }}
                          >
                              <span class="nowrap">
                                  ${temperature?.toFixed(1)}°C maassa,
                              </span>
                              ${" "}
                              <span class="nowrap">
                                  ${temps[4].toFixed(1)}°C 4km:ssä
                              </span>
                              ${h(
                                  Help,
                                  { label: "?" },
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
            margin: 10px;
            margin-bottom: 100px;
            grid-template-columns: 1fr;
            gap: 10px;

            /** MOBILE **/
            grid-template-areas:
                "errors errors"
                "title title"
                "info info"
                "clouds clouds"
                "winds winds"
                "compass compass"
                "observations-graph observations-graph"
                "forecasts-graph forecasts-graph"
                "dropzone-map dropzone-map"
                "observations-table observations-table"
                "forecasts-table forecasts-table"
                "high-winds-details high-winds-details"
                "high-winds-today high-winds-today"
                "high-winds-tomorrow high-winds-tomorrow";
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
                    "observations-table forecasts-table"
                    "high-winds-today high-winds-tomorrow"
                    "high-winds-details high-winds-details";
            }
        }
        #clouds {
            grid-area: clouds;
        }

        #winds {
            grid-area: winds;
        }

        #compass {
            grid-area: compass;
        }

        #observations-graph {
            grid-area: observations-graph;
        }

        #forecasts-graph {
            grid-area: forecasts-graph;
        }

        #forecasts-table {
            grid-area: forecasts-table;
        }

        #observations-table {
            grid-area: observations-table;
        }

        #high-winds-today {
            grid-area: high-winds-today;
        }

        #high-winds-tomorrow {
            grid-area: high-winds-tomorrow;
            align-self: end;
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
            color: red;
        }

        .sticky {
            position: sticky;
            top: 0;
            background-color: white;
            z-index: 50;
        }

        .anchor {
            height: 0;
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
                <h2 class="h2-with-icon">
                    Tuulet
                    <div class="heading-spacer"></div>
                    <${ErrorBoundary}>
                        <${DynamicParachute} />
                    </${ErrorBoundary}>
                </h2>
                <${WindSummary} />
            </div>

            <${Compass} />

            <${Graph} />

            ${h(DropzoneMap, {})}

            <div id="observations-table" class="observations">
                <h2 class="sticky">
                    Havainnot
                    <span class="date">${formatDate(new Date())}</span>
                </h2>
                <div class="side-scroll">
                    <${DataTable}
                        data=${OBSERVATIONS}
                        thead=${html`
                            <${ObservationTHead} />
                        `}
                        Rows=${ObservationRows}
                    />
                </div>
            </div>

            <div
                id="forecasts-table"
                class=${STALE_FORECASTS.value ? "stale" : "fresh"}
            >
                <div class="anchor" id="forecasts"></div>
                <h2 class="sticky">
                    Ennuste
                    <span class="date">
                        ${formatDate(FORECAST_DATE.value)} ${" "}
                        ${humanDayText(FORECAST_DATE.value)}
                    </span>
                </h2>

                <p>
                    <${ForecastLocationInfo} />
                </p>

                <div class="side-scroll">
                    <${DataTable}
                        data=${FORECASTS}
                        thead=${html`
                            <${ForecastTHead} />
                        `}
                        Rows=${ForecastRows}
                    />
                </div>
            </div>

            <${HighWinds} />
        </div>
        <${SideMenu} />
        <${StickyFooter} />

        <${RenderInjectedCSS} />
    `;
}
