// @ts-check
import { css, useScope } from "./useScope.js";
import { dateHeadingStyles, freshnessStyles, getTheme } from "./styles.js";
import { useEffect, useRef } from "preact/hooks";
import { effect } from "@preact/signals";
import { html } from "htm/preact";
import { Chart } from "chart.js";

import {
    FORECASTS,
    OBSERVATIONS,
    HOVERED_OBSERVATION,
    FORECAST_DATE,
    STALE_FORECASTS,
    HAS_WIND_OBSERVATIONS,
} from "./data.js";
import { formatClock, formatDate, humanDayText } from "./utils.js";

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
            label: "B+ Kelpparit",
            data: data.map(() => 11),
            borderColor: theme.danger,
            pointRadius: 0,
        },
        {
            label: "Oppilaat",
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
                label: "Puuska (m/s)",
                data: OBSERVATIONS.value.map((obs) => obs.gust ?? 0).reverse(),
                borderColor: theme.primary,
            },
            {
                ...shared,
                label: "Tuuli (m/s)",
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
                label: "Puuskaennuste (m/s)",
                data: FORECASTS.value.map((obs) => obs.gust ?? 0),
                borderColor: theme.primary,
                cubicInterpolationMode: "monotone",
                borderDash: [5, 5],
                borderWidth: 5,
            },
            {
                ...shared,
                label: "Tuuli (m/s)",
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

export function Graph() {
    const scope = useScope(css`
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
                          <h2>
                              Havainnot
                              <span class="date">
                                  ${formatDate(new Date())}
                              </span>
                          </h2>
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
            <h2>
                Ennusteet
                <span class="date">
                    ${formatDate(FORECAST_DATE.value)} ${" "}
                    ${humanDayText(FORECAST_DATE.value)}
                </span>
            </h2>

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
