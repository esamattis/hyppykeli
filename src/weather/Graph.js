// @ts-check
import { formatClock, formatDate, humanDayText } from "#app/shared/dates.js";
import { RESOLVED_THEME } from "#app/app/theme.js";
import { dateHeadingStyles, freshnessStyles, getTheme } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { DataSource } from "#app/weather/DataSource.js";
import {
    FORECASTS,
    FORECAST_SOURCE,
    HAS_WIND_OBSERVATIONS,
    HOVERED_OBSERVATION,
    OBSERVATIONS,
    OBSERVATION_SOURCE,
    STALE_FORECASTS,
} from "#app/weather/state.js";
import { effect } from "@preact/signals";
import { Chart } from "chart.js";
import { h, html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";

/**
 * @param {Signal<WeatherData[]>} signal
 * @param {boolean} reverse
 * @returns {import("chart.js").ChartConfiguration}
 */
function getDefaultGraphOptions(signal, reverse) {
    const theme = getTheme();
    Chart.defaults.font.family = theme.font;
    Chart.defaults.font.size = theme.fontSize;
    Chart.defaults.color = theme.muted;
    Chart.defaults.borderColor = theme.border;
    Chart.defaults.backgroundColor = theme.surface;
    Chart.defaults.plugins.tooltip.backgroundColor = theme.text;
    Chart.defaults.plugins.tooltip.titleColor = theme.surface;
    Chart.defaults.plugins.tooltip.bodyColor = theme.surface;
    Chart.defaults.plugins.tooltip.footerColor = theme.surface;
    Chart.defaults.plugins.tooltip.multiKeyBackground = theme.surface;
    return {
        type: "line",
        plugins: [createHoverPlugin(signal, reverse)],
        data: {
            labels: [],
            datasets: [],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
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
    const maxWind = [...OBSERVATIONS.value, ...FORECASTS.value].reduce(
        (max, point) => Math.max(max, point.gust ?? 0, point.speed ?? 0),
        11,
    );
    const yMax = Math.ceil(maxWind / 2) * 2;
    for (const chart of [obs, fore]) {
        if (chart) {
            chart.options.color = theme.muted;
            chart.options.borderColor = theme.border;
            chart.options.plugins = {
                legend: { display: false },
                tooltip: {
                    backgroundColor: theme.text,
                    titleColor: theme.surface,
                    bodyColor: theme.surface,
                    footerColor: theme.surface,
                    multiKeyBackground: theme.surface,
                },
            };
            chart.options.scales = {
                x: {
                    ticks: {
                        minRotation: 0,
                        maxRotation: 0,
                        color: theme.muted,
                    },
                    grid: { color: theme.border },
                    border: { color: theme.border },
                    // Reserve one row even when a provider has no time labels.
                    afterFit: (scale) => {
                        scale.height = theme.fontSize * 2.5;
                    },
                },
                y: {
                    min: 0,
                    max: yMax,
                    ticks: { stepSize: 2, color: theme.muted },
                    grid: { color: theme.border },
                    border: { color: theme.border },
                },
            };
        }
    }
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
 * @param {boolean} props.forecast
 */
function GraphLegend({ forecast }) {
    const scope = useScope(css`
        :scope {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: var(--spacing-1) var(--spacing-3);
            color: var(--color-muted);
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-1-5);
            white-space: nowrap;
        }
        .legend-swatch {
            flex: 0 0 var(--spacing-4);
            border-top: 3px solid var(--legend-color);
        }
        .forecast .legend-swatch {
            border-top-style: dashed;
        }
    `);
    const labels = [
        [
            t(forecast ? "weather.gustForecastUnit" : "weather.gustUnit"),
            "var(--color-primary)",
        ],
        [t("weather.windUnit"), "var(--color-sky)"],
        [t("weather.licensed"), "var(--color-danger)"],
        [t("weather.students"), "var(--color-warning)"],
    ];
    return html`
        <div class="chart-legend mt-2">
            ${scope.style}
            ${labels.map(
                ([label, color], index) => html`
                    <span
                        class=${`legend-item text-rem-0-75 font-normal ${forecast && index < 2 ? "forecast" : ""}`}
                    >
                        <span
                            class="legend-swatch"
                            style=${`--legend-color: ${color}`}
                            aria-hidden="true"
                        ></span>
                        ${label}
                    </span>
                `,
            )}
        </div>
    `;
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
            gap: var(--spacing-3);
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
            obsChart = new Chart(
                obsChartRef.current,
                getDefaultGraphOptions(OBSERVATIONS, true),
            );
        }

        if (foreChartRef.current) {
            foreChart = new Chart(
                foreChartRef.current,
                getDefaultGraphOptions(FORECASTS, false),
            );
        }

        const unsubsribe = effect(() => {
            // Canvas colors need an explicit update when appearance changes.
            RESOLVED_THEME.value;
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
                      <div id="observations-graph" class="p-panel">
                          ${scope.style}
                          <div class="chart-heading mb-3.5">
                              <h2>
                                  ${t("weather.observations")}
                                  <span class="date text-em-0-7 font-normal">
                                      ${formatDate(new Date())}
                                  </span>
                              </h2>
                              ${h(DataSource, { sources: [OBSERVATION_SOURCE.value] })}
                              ${props.observationsTable}
                          </div>
                          <div class="chart" onMouseLeave=${onMouseLeaveObs}>
                              <canvas ref=${obsChartRef}></canvas>
                          </div>
                          ${h(GraphLegend, { forecast: false })}
                      </div>
                  `
                : null
        }

        <div
            id="forecasts-graph"
            class="p-panel"
            style=${HAS_WIND_OBSERVATIONS.value ? "" : "grid-column-start: 1"}
        >
            ${scope.style}
            <div class="chart-heading mb-3.5">
                <h2>
                    ${t("weather.forecasts")}
                    <span class="date text-em-0-7 font-normal">
                        ${formatDate(new Date())} ${" "}
                        ${humanDayText(new Date())}
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
            ${h(GraphLegend, { forecast: true })}
        </div>
    `;
}

/**
 * @param {Signal<WeatherData[]>} signal
 * @param {boolean} reverse
 * @returns {import("chart.js").Plugin}
 */
function createHoverPlugin(signal, reverse) {
    return {
        id: "hovered-compass",
        afterEvent(chart, { event, replay, inChartArea }) {
            // Updates and resizes replay old events, even after dismissal.
            if (replay || !inChartArea || event.type === "mouseout") return;
            // Chart.js queues mouse events until the next animation frame.
            if (
                event.native instanceof MouseEvent &&
                !chart.canvas.matches(":hover")
            )
                return;
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
        },
    };
}
