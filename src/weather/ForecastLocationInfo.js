// @ts-check
import { t } from "#app/translations.js";
import {
    FORECAST_COORDINATES,
    FORECAST_LOCATION_NAME,
    STATION_COORDINATES,
} from "#app/weather/state.js";
import { html } from "htm/preact";

export function ForecastLocationInfo() {
    return html`
        ${t("forecast.location")}${" "}
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
