// @ts-check
import { ErrorBoundary } from "#app/shared/ErrorBoundary.js";
import { Help } from "#app/shared/Help.js";
import { t } from "#app/translations.js";
import { DataSource } from "#app/weather/DataSource.js";
import { OpenMeteoRaw, OpenMeteoTool } from "#app/weather/UpperWindTable.js";
import { h, html } from "htm/preact";
import { useState } from "preact/hooks";

export function HighWinds() {
    const [showDetails, setShowDetails] = useState(false);

    return html`
        <div id="high-winds-today" class="p-panel">
            <div class="card-heading">
            <h2 class="h2-with-icon">
                ${t("highWinds.title")}
                ${h(
                    Help,
                    {},
                    html`
                        <p>${t("highWinds.helpForecast")}</p>
                        <p>${t("highWinds.helpLevels")}</p>
                        <p>${t("highWinds.helpPeriods")}</p>
                    `,
                )}
            </h2>
            ${h(DataSource, { sources: ["Open-Meteo"] })}
            </div>

            <p>
                <button
                    type="button"
                    onClick=${() => setShowDetails(!showDetails)}
                >
                    ${showDetails ? t("highWinds.showSummary") : t("highWinds.showDetails")}
                </button>
            </p>

            <div
                id=${showDetails ? "high-winds-details" : undefined}
                class="high-winds-days"
            >
                <${ErrorBoundary}>
                    ${showDetails ? h(OpenMeteoRaw, {}) : h(OpenMeteoTool, {})}
                </${ErrorBoundary}>
            </div>
        </div>
    `;
}
