// @ts-check
import { formatClock, formatDate, humanDayText } from "../shared/dates.js";
import { dateHeadingStyles, freshnessStyles, getTheme } from "../styles.js";
import { t } from "../translations.js";
import { css, useScope } from "../useScope.js";
import { DataSource } from "./DataSource.js";
import {
    FORECASTS,
    FORECAST_DATE,
    FORECAST_SOURCE,
    HAS_WIND_OBSERVATIONS,
    HOVERED_OBSERVATION,
    OBSERVATIONS,
    OBSERVATION_SOURCE,
    STALE_FORECASTS,
} from "./state.js";
import { effect } from "@preact/signals";
import { Chart } from "chart.js";
import { h, html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";

/**
 * @returns {import("chart.js").ChartConfiguration}
 */
function getDefaultGraphOptions() {
    const theme = getTheme();
    Chart.defaults.font.family = theme.font;
    Chart.defaults.color = theme.muted;
    return {
        type: "line",
        data: {
            labels: [],
            datasets: [],
        },
        options: {
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                axis: "x",
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    };
}

/**
 * @param {Chart|null} obs
 * @param {Chart|null} fore
 */
function updateCharts(obs, fore) {
    const theme = getTheme();
    const shared = {
        spanGaps: true,
        borderJoinStyle: "round",
        pointRadius: 0,
        borderWidth: 2,
        pointHoverRadius: 10,
    };

    /**
     * @param {WeatherData[]} data
     */
    const createWarningLines = (data) => [
        {
            label: t("weather.licensed"),
            data: data.map(() => 11),
            borderColor: theme.danger,
            pointRadius: 0,
        },
        {
            label: t("weather.students"),
            data: data.map(() => 8),
            borderColor: theme.warning,
            pointRadius: 0,
        },
    ];

    if (obs) {
        obs.data.labels = OBSERVATIONS.value
            .map((point) => formatClock(point.time))
            .reverse();

        obs.data.datasets = [
            {
                ...shared,
                label: t("weather.gustUnit"),
                data: OBSERVATIONS.value.map((obs) => obs.gust ?? 0).reverse(),
                borderColor: theme.primary,
            },
            {
                ...shared,
                label: t("weather.windUnit"),
                data: OBSERVATIONS.value.map((obs) => obs.speed ?? 0).reverse(),
                borderColor: theme.sky,
            },
            ...createWarningLines(OBSERVATIONS.value),
        ];
        // "none" disables the update animation.
        // It is too flashy when the array is fully replaced.
        obs.update("none");
    }

    if (fore) {
        fore.data.labels = FORECASTS.value.map((point) =>
            formatClock(point.time),
        );
        fore.data.datasets = [
            {
                ...shared,
                label: t("weather.gustForecastUnit"),
                data: FORECASTS.value.map((obs) => obs.gust ?? 0),
                borderColor: theme.primary,
                cubicInterpolationMode: "monotone",
                borderDash: [5, 5],
                borderWidth: 5,
            },
            {
                ...shared,
                label: t("weather.windUnit"),
                data: FORECASTS.value.map((obs) => obs.speed ?? 0),
                borderColor: theme.sky,
                cubicInterpolationMode: "monotone",
                borderDash: [5, 5],
                borderWidth: 5,
            },
            ...createWarningLines(FORECASTS.value),
        ];

        fore.update("none");
    }
}

/**
 * @param {Object} props
 * @param {import("preact").ComponentChildren} props.observationsTable
 * @param {import("preact").ComponentChildren} props.forecastsTable
 */
export function Graph(props) {
    const scope = useScope(css`
        .chart-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
        }
        .chart-heading h2 {
            margin: 0;
        }
        .source-note {
            margin-left: auto;
        }
        .source-note + button {
            margin-left: 0;
        }
        .chart {
            position: relative;
            height: clamp(350px, 70vh, 600px);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
        }
        ${dateHeadingStyles}
        ${freshnessStyles}
    `);

    const obsChartRef = useRef(null);
    const foreChartRef = useRef(null);

    useEffect(() => {
        /** @type {Chart | null} */
        let obsChart = null;
        /** @type {Chart | null} */
        let foreChart = null;

        if (obsChartRef.current) {
            obsChart = new Chart(obsChartRef.current, getDefaultGraphOptions());
            obsChart.options.onHover = createHoverHandler(OBSERVATIONS, true);
        }

        if (foreChartRef.current) {
            foreChart = new Chart(
                foreChartRef.current,
                getDefaultGraphOptions(),
            );
            foreChart.options.onHover = createHoverHandler(FORECASTS, false);
        }

        const unsubsribe = effect(() => {
            updateCharts(obsChart, foreChart);
        });

        return () => {
            unsubsribe();
            obsChart?.destroy();
            foreChart?.destroy();
        };
    }, [HAS_WIND_OBSERVATIONS.value]);

    const onMouseLeaveObs = () => {
        HOVERED_OBSERVATION.value = undefined;
    };

    return html`
        ${
            HAS_WIND_OBSERVATIONS.value
                ? html`
                      <div id="observations-graph">
                          ${scope.style}
                          <div class="chart-heading">
                              <h2>
                                  ${t("weather.observations")}
                                  <span class="date">
                                      ${formatDate(new Date())}
                                  </span>
                              </h2>
                              ${h(DataSource, { sources: [OBSERVATION_SOURCE.value] })}
                              ${props.observationsTable}
                          </div>
                          <div class="chart" onMouseLeave=${onMouseLeaveObs}>
                              <canvas ref=${obsChartRef}></canvas>
                          </div>
                      </div>
                  `
                : null
        }

        <div
            id="forecasts-graph"
            style=${HAS_WIND_OBSERVATIONS.value ? "" : "grid-column-start: 1"}
        >
            ${scope.style}
            <div class="chart-heading">
                <h2>
                    ${t("weather.forecasts")}
                    <span class="date">
                        ${formatDate(FORECAST_DATE.value)} ${" "}
                        ${humanDayText(FORECAST_DATE.value)}
                    </span>
                </h2>
                ${h(DataSource, { sources: [FORECAST_SOURCE.value] })}
                ${props.forecastsTable}
            </div>

            <div
                class=${STALE_FORECASTS.value ? "chart stale" : "chart fresh"}
                onMouseLeave=${onMouseLeaveObs}
            >
                <canvas ref=${foreChartRef}></canvas>
            </div>
        </div>
    `;
}

/**
 * @param {Signal<WeatherData[]>} signal
 * @param {boolean} reverse
 */
function createHoverHandler(signal, reverse) {
    /**
     * @param {import("chart.js").ChartEvent} event
     * @param {import("chart.js").ActiveElement[]} elements
     * @param {Chart} chart
     */
    const onHover = (event, elements, chart) => {
        const points = chart.getElementsAtEventForMode(
            // @ts-ignore
            event,
            "index",
            {
                axis: "x",
                intersect: false,
            },
            false,
        );

        let index = points[0]?.index;
        if (index !== undefined) {
            if (reverse) {
                index = signal.value.length - index - 1;
            }

            const obs = signal.value[index];
            if (obs) {
                HOVERED_OBSERVATION.value = obs;
            }
        }
    };

    return onHover;
}
