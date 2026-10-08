// @ts-check
import { coordinateDistance } from "#app/shared/coordinates.js";
import { whenAll } from "#app/shared/values.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { DataSource } from "#app/weather/DataSource.js";
import { ForecastLocationInfo } from "#app/weather/ForecastLocationInfo.js";
import {
    FORECAST_COORDINATES,
    METARS,
    STATION_COORDINATES,
    STATION_NAME,
} from "#app/weather/state.js";
import { h, html } from "htm/preact";

export function Info() {
    const scope = useScope(css`
        :scope {
            grid-area: info;
            max-width: 100%;
            width: 100%;
            line-height: 1.8;
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
            <div class="disclaimer italic font-bold">
                ${t("footer.disclaimer")}
            </div>
            <small>
                ${t("footer.logbook")}${" "}
                <a href="https://loki.hyppykeli.fi/">Loki</a>
                . ${t("footer.code")} HYPPYKELI2026
            </small>
        </footer>
    `;
}
