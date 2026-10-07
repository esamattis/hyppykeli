// @ts-check
import { ManualBanner } from "#app/manual/ManualMode.js";
import { LazyDropzoneMap } from "#app/map/LazyDropzoneMap.js";
import { formatDate, humanDayText } from "#app/shared/dates.js";
import {
    cardHeadingStyles,
    dateHeadingStyles,
    freshnessStyles,
} from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { CloudSummary } from "#app/weather/CloudSummary.js";
import { Compass } from "#app/weather/Compass.js";
import { DataSource } from "#app/weather/DataSource.js";
import { ForecastLocationInfo } from "#app/weather/ForecastLocationInfo.js";
import { Graph } from "#app/weather/Graph.js";
import { HighWinds } from "#app/weather/HighWinds.js";
import {
    DataTable,
    ForecastRows,
    ForecastTHead,
    ObservationRows,
    ObservationTHead,
    TableDialog,
} from "#app/weather/WeatherTables.js";
import { WindSummary } from "#app/weather/WindSummary.js";
import {
    ERRORS,
    FORECASTS,
    FORECAST_DATE,
    OBSERVATIONS,
    STALE_FORECASTS,
    WIND_SOURCE,
} from "#app/weather/state.js";
import { Info } from "#app/app/Info.js";
import { RenderInjectedCSS } from "#app/app/RenderInjectedCSS.js";
import { FloatingMenuButton, SideMenu } from "#app/app/SideMenu.js";
import { Title } from "#app/app/Title.js";
import { h, html } from "htm/preact";
import { useRef } from "preact/hooks";
import { Tooltips } from "#app/shared/Tooltips.js";

export function App() {
    const manualEditorRef = useRef(
        /** @type {ManualModeHandle | null} */ (null),
    );
    const scope = useScope(css`
        :scope {
            --panel-padding: var(--spacing-4);
            display: grid;
            margin: var(--spacing-4);
            margin-bottom: var(--spacing-25);
            grid-template-columns: 1fr;
            gap: var(--spacing-4);

            /** MOBILE **/
            grid-template-areas:
                ${ERRORS.value.length > 0 ? '"errors errors"' : ""}
                "title title"
                "clouds clouds"
                "winds winds"
                "dropzone-map dropzone-map"
                "observations-graph observations-graph"
                "forecasts-graph forecasts-graph"
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
                    "dropzone-map dropzone-map"
                    "observations-graph forecasts-graph"
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
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-panel);
            box-shadow: var(--shadow-panel);
        }

        @media (max-width: 550px) {
            :scope {
                --panel-padding: var(--spacing-3);
                margin: var(--spacing-3);
                margin-bottom: var(--spacing-25);
                gap: var(--spacing-3);
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
        ${h(ManualBanner, { onEdit: () => manualEditorRef.current?.open() })}
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

            <div class="clouds p-panel" id="clouds">
                <${CloudSummary} />
            </div>

            <div id="winds" class="p-panel">
                <div class="card-heading">
                    <h2 class="h2-with-icon">${t("weather.winds")}</h2>
                    ${h(DataSource, { sources: [WIND_SOURCE.value] })}
                </div>
                <${WindSummary} />
                ${h(Compass, { floating: false })}
            </div>

            ${h(LazyDropzoneMap, {})} ${h(Compass, { floating: true })}
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
            <${HighWinds} />
            <${Info} />
        </div>
        ${h(SideMenu, { manualEditorRef })}
        <${FloatingMenuButton} />

        <${RenderInjectedCSS} />
        <${Tooltips} />
    `;
}
