// @ts-check
import { Dialog } from "#app/shared/Dialog.js";
import { Help } from "#app/shared/Help.js";
import { formatClock } from "#app/shared/dates.js";
import { Icon, WindArrow } from "#app/shared/icons.js";
import { isNullish } from "#app/shared/values.js";
import { windStatusStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { PercentagePie } from "#app/weather/CloudIndicators.js";
import { getWarningLevel } from "#app/weather/calculations.js";
import { h, html } from "htm/preact";
import { useRef } from "preact/hooks";

export function ObservationTHead() {
    return html`
        <tr>
            <th>${t("weather.clock")}</th>
            <th>${t("weather.gust")}</th>
            <th>${t("weather.wind")}</th>
            <th>${t("weather.direction")}</th>
            <th>${t("weather.temperature")}</th>
        </tr>
    `;
}

/**
 * @param {Object} props
 * @param {WeatherData[]} props.data
 */
export function ObservationRows(props) {
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

                <td>${point.temperature?.toFixed(1)} °C</td>
            </tr>
        `;
    });
}

export function ForecastTHead() {
    return html`
        <tr>
            <th>${t("weather.clock")}</th>
            <th>${t("weather.gust")}</th>
            <th>${t("weather.wind")}</th>
            <th>${t("weather.direction")}</th>
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
export function ForecastRows(props) {
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
                    <${PercentagePie} percentage=${point.rain} />
                </td>

                <td>${point.temperature?.toFixed(1)} °C</td>
            </tr>
        `;
    });
}

/**
 *
 * @param {Object} props
 * @param {number|undefined} props.direction
 * @param {boolean} props.value
 */
export function WindDirection(props) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-1);
            vertical-align: middle;
        }

        .direction-value {
            width: 4ch;
            display: inline-block;
        }

        .direction {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            font-size: 80%;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
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
export function DataTable(props) {
    const scope = useScope(css`
        :scope {
            table-layout: fixed;
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            line-height: 1.3;
        }

        :scope th {
            text-align: left;
            width: 8ch;
        }

        :scope td,
        :scope th {
            white-space: nowrap;
            padding: var(--spacing-1) var(--spacing-1);
            border-bottom: 1px solid var(--color-border);
            background-color: var(--color-surface);
        }

        :scope thead th {
            color: var(--color-muted);
            background: var(--color-surface-soft);
            font-size: 0.75rem;
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
export function TableDialog(props) {
    const scope = useScope(css`
        :scope.table-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            padding: var(--spacing-2);
            background: transparent;
            border: 0;
        }
        :scope:is(dialog) {
            width: 1100px;
            max-height: calc(100dvh - 24px);
            box-sizing: border-box;
        }
        .dialog-heading {
            margin-bottom: var(--spacing-4);
        }
        .dialog-heading h2 {
            margin: 0;
        }
        .side-scroll {
            overflow-x: auto;
            width: 100%;
            position: relative;
        }
        @media (max-width: 600px) {
            :scope:is(dialog) {
                max-width: calc(100vw - 12px);
                padding: var(--spacing-3);
            }
            :scope:is(dialog) > .dialog-controls {
                top: 0;
                margin-top: 0;
                margin-bottom: 0;
            }
            :scope:is(dialog) > .dialog-controls > .dialog-close {
                right: 0;
            }
            .dialog-heading {
                padding-right: var(--spacing-11);
                min-height: 40px;
            }
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
