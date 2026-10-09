// @ts-check
import { Button } from "#app/shared/Button.js";
import { Icon } from "#app/shared/icons.js";
import { FromNow } from "#app/shared/FromNow.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { Compass } from "#app/weather/Compass.js";
import { GustReading } from "#app/weather/GustReading.js";
import { LATEST_OBSERVATION } from "#app/weather/state.js";
import { h, html } from "htm/preact";
import { useState } from "preact/hooks";

export function MapCompass() {
    const [minimized, setMinimized] = useState(false);
    const scope = useScope(css`
        :scope {
            display: none;
            position: absolute;
            right: var(--spacing-3);
            bottom: calc(var(--spacing-7) + env(safe-area-inset-bottom));
            z-index: 700;
            width: min(240px, 35cqh);
            padding: 0;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-panel);
            background: var(--color-surface);
            color: var(--color-text);
            box-shadow: var(--shadow-floating);
            cursor: pointer;
        }
        :scope.minimized {
            width: 36px;
            height: 36px;
            place-items: center;
            border-radius: var(--radius-sm);
            background: var(--color-map-control);
        }
        :scope.minimized:hover {
            background: var(--color-map-control-hover);
        }
        .map-compass-gust {
            display: none;
            position: absolute;
            right: 0;
            bottom: calc(100% + var(--spacing-2));
            border: 1px solid var(--color-border);
            border-radius: var(--radius-panel);
            background: var(--color-surface);
            box-shadow: var(--shadow-floating);
        }
        .map-compass-gust-label,
        .map-compass-gust-age {
            line-height: 1.1;
            white-space: nowrap;
        }
        :scope:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }
        /* Leave room above the overlays for the wind-level selector. */
        @container fullscreen-map (min-width: 900px) and (min-height: 48rem) {
            :scope {
                display: grid;
            }
        }
        @container fullscreen-map (min-height: 56rem) {
            .map-compass-gust {
                display: block;
            }
        }
        @container fullscreen-map (aspect-ratio > 1 / 1) {
            .map-compass-gust {
                display: block;
                right: calc(100% + var(--spacing-2));
                bottom: 0;
            }
        }
    `);
    const label = t(minimized ? "compass.restore" : "compass.minimize");
    return html`
        ${h(
            Button,
            {
                type: "button",
                class: `map-compass${minimized ? " minimized text-rem-0-75" : ""}`,
                "aria-label": label,
                "data-tooltip": label,
                "aria-expanded": !minimized,
                onClick: () => setMinimized((value) => !value),
            },
            html`
                ${scope.style}
                ${
                    minimized
                        ? h(Icon, { name: "compass", size: 18 })
                        : html`
                              <div
                                  class="map-compass-gust px-3 py-2"
                                  aria-label=${t("weather.groundGust")}
                              >
                                  <div
                                      class="map-compass-gust-label text-rem-0-5 font-heading mb-1"
                                  >
                                      ${t("weather.groundGust")}
                                  </div>
                                  ${h(GustReading, {})}
                                  <div
                                      class="map-compass-gust-age text-rem-0-5 font-heading mt-1"
                                  >
                                      ${h(FromNow, { date: LATEST_OBSERVATION.value?.time, showClock: false })}
                                  </div>
                              </div>
                              ${h(Compass, { id: "map-compass", showControls: false })}
                          `
                }
            `,
        )}
    `;
}
