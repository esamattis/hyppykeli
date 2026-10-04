// @ts-check
import { DeveloperBanner } from "../developer/DeveloperMode.js";
import { DropzoneMap } from "../map/DropzoneMap.js";
import { formatDate, humanDayText } from "../shared/dates.js";
import {
    cardHeadingStyles,
    dateHeadingStyles,
    freshnessStyles,
} from "../styles.js";
import { t } from "../translations.js";
import { css, useScope } from "../useScope.js";
import { CloudSummary } from "../weather/CloudSummary.js";
import { Compass } from "../weather/Compass.js";
import { DataSource } from "../weather/DataSource.js";
import { ForecastLocationInfo } from "../weather/ForecastLocationInfo.js";
import { Graph } from "../weather/Graph.js";
import { HighWinds } from "../weather/HighWinds.js";
import {
    DataTable,
    ForecastRows,
    ForecastTHead,
    ObservationRows,
    ObservationTHead,
    TableDialog,
} from "../weather/WeatherTables.js";
import { WindSummary } from "../weather/WindSummary.js";
import {
    ERRORS,
    FORECASTS,
    FORECAST_DATE,
    OBSERVATIONS,
    STALE_FORECASTS,
    WIND_SOURCE,
} from "../weather/state.js";
import { Info } from "./Info.js";
import { RenderInjectedCSS } from "./RenderInjectedCSS.js";
import { FloatingMenuButton, SideMenu } from "./SideMenu.js";
import { Title } from "./Title.js";
import { h, html } from "htm/preact";
import { useRef } from "preact/hooks";

export function App() {
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
