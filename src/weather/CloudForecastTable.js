// @ts-check
import { Help } from "../shared/Help.js";
import { formatClock, formatDate } from "../shared/dates.js";
import { isNullish, whenAll } from "../shared/values.js";
import { t } from "../translations.js";
import { CloudCoverSquare } from "./CloudIndicators.js";
import { getLiftedCondensationLevel } from "./calculations.js";
import { forecastTime } from "./providers/openMeteo.js";
import { OM_DATA } from "./state.js";
import { h, html } from "htm/preact";

/** @type {OpenMeteoPressureLevel[]} */
const CLOUD_FORECAST_LEVELS = ["600", "700", "850", "925", "1000"];

/** @param {number} altitude */
function roundCloudForecastAltitude(altitude) {
    return Math.round(altitude / 50) * 50;
}

/**
 * @param {Object} props
 * @param {WeatherData[]} props.forecasts
 */
export function CloudForecastTable(props) {
    const openMeteo = OM_DATA.value;
    const openMeteoIndexes = new Map(
        openMeteo?.hourly.time.map((time, index) => [
            forecastTime(time, openMeteo.utc_offset_seconds).getTime(),
            index,
        ]) ?? [],
    );

    return html`
        <div class="cloud-forecast-details">
            <div
                class="forecast-scroll"
                tabindex="0"
                role="region"
                aria-label=${t("cloud.hourlyForecast")}
            >
                <table class="cloud-forecast-table cloud-forecast-detail-table">
                    <thead>
                        <tr>
                            <th scope="col">${t("weather.clock")}</th>
                            ${props.forecasts.map(
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
                        <tr class="forecast-group-start">
                            <th scope="row">
                                <span class="forecast-source-label">FMI</span>
                                ${t("weather.condensationLevelShort")}
                                ${h(
                                    Help,
                                    {
                                        label: `${t("weather.condensationLevel")}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>
                                            ${t("weather.condensationLevel")}
                                        </h3>
                                        <p>
                                            ${t("cloud.condensationForecastHelp")}
                                        </p>
                                    `,
                                )}
                            </th>
                            ${props.forecasts.map(
                                (forecast) => html`
                                    <td class="forecast-label">
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
                        ${[
                            {
                                label: t("cloud.totalCover"),
                                altitude: "0+ km",
                                help: t("cloud.totalCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.totalCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.highCover"),
                                altitude: "5–9+ km",
                                help: t("cloud.highCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.highCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.middleCover"),
                                altitude: "2–6 km",
                                help: t("cloud.middleCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.middleOnlyCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.middleAndLowCover"),
                                altitude: "0–6 km",
                                help: t("cloud.middleAndLowCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.middleCloudCover,
                                ),
                            },
                            {
                                label: t("cloud.lowCover"),
                                altitude: "0–2 km",
                                help: t("cloud.lowCoverHelp"),
                                values: props.forecasts.map(
                                    (forecast) => forecast.lowCloudCover,
                                ),
                            },
                        ].map(
                            (row) => html`
                                <tr>
                                    <th scope="row">
                                        ${row.altitude}
                                        ${h(
                                            Help,
                                            {
                                                label: `${row.label}: ${t("common.help")}`,
                                            },
                                            html`
                                                <h3>${row.label}</h3>
                                                <p>${row.help}</p>
                                                <p>
                                                    ${t("cloud.fmiCoverHelp")}
                                                </p>
                                            `,
                                        )}
                                    </th>
                                    ${row.values.map(
                                        (percentage) => html`
                                            <td class="forecast-reading">
                                                ${
                                                    isNullish(percentage)
                                                        ? "—"
                                                        : h(CloudCoverSquare, {
                                                              percentage,
                                                          })
                                                }
                                            </td>
                                        `,
                                    )}
                                </tr>
                            `,
                        )}
                        ${CLOUD_FORECAST_LEVELS.map((level) => {
                            const rowAltitude = props.forecasts
                                .map((forecast) => {
                                    const index = openMeteoIndexes.get(
                                        forecast.time.getTime(),
                                    );
                                    return isNullish(index)
                                        ? undefined
                                        : openMeteo?.hourly[
                                              `geopotential_height_${level}hPa`
                                          ][index];
                                })
                                .find((height) => !isNullish(height));

                            return html`
                                <tr
                                    class=${level === CLOUD_FORECAST_LEVELS[0] ? "forecast-group-start" : undefined}
                                >
                                    <th scope="row" title=${`${level} hPa`}>
                                        ${
                                            level === CLOUD_FORECAST_LEVELS[0]
                                                ? html`
                                                      <span
                                                          class="forecast-source-label"
                                                      >
                                                          Open-Meteo
                                                      </span>
                                                  `
                                                : null
                                        }
                                        ${
                                            isNullish(rowAltitude)
                                                ? t("common.noData")
                                                : t(
                                                      "cloud.altitudeMeters",
                                                      roundCloudForecastAltitude(
                                                          rowAltitude,
                                                      ).toString(),
                                                  )
                                        }
                                    </th>
                                    ${props.forecasts.map((forecast) => {
                                        const index = openMeteoIndexes.get(
                                            forecast.time.getTime(),
                                        );
                                        const cover = isNullish(index)
                                            ? undefined
                                            : openMeteo?.hourly[
                                                  `cloud_cover_${level}hPa`
                                              ][index];
                                        return html`
                                            <td class="forecast-reading">
                                                ${
                                                    isNullish(cover)
                                                        ? "—"
                                                        : h(CloudCoverSquare, {
                                                              percentage: cover,
                                                          })
                                                }
                                            </td>
                                        `;
                                    })}
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
            </div>
            <p class="cloud-forecast-note">${t("cloud.forecastTableHelp")}</p>
        </div>
    `;
}
