// @ts-check
import { DROPZONE_ELEVATION } from "#app/app/settings.js";
import { FromNow } from "#app/shared/FromNow.js";
import { formatClock } from "#app/shared/dates.js";
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import {
    CompactCavok,
    CompactCloudLayer,
    CompactOpenMeteoCloudLayer,
} from "#app/weather/CompactCloudLayer.js";
import { getOpenMeteoCloudProfile } from "#app/weather/providers/openMeteo.js";
import { METARS, OM_DATA } from "#app/weather/state.js";
import { h, html } from "htm/preact";
import { useState } from "preact/hooks";

export function MapCloudSummary() {
    const [minimized, setMinimized] = useState(false);
    const scope = useScope(css`
        :scope {
            display: none;
            position: absolute;
            top: var(--spacing-3);
            left: 50%;
            transform: translateX(-50%);
            z-index: 700;
            width: max-content;
            box-sizing: border-box;
            max-width: calc(
                100% - 2 * (36px + var(--spacing-3) + var(--spacing-2))
            );
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-map-control);
            color: var(--color-text);
            box-shadow: var(--shadow-floating);
            font-size: 0.75rem;
            font-family: inherit;
            line-height: 1.3;
            text-align: left;
            cursor: pointer;
        }
        :scope.minimized {
            place-items: center;
            width: 36px;
            height: 36px;
        }
        :scope:hover {
            background: var(--color-map-control-hover);
        }
        :scope:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }
        .map-cloud-source {
            display: flex;
            justify-content: space-between;
            gap: var(--spacing-3);
            color: var(--color-muted);
            font-size: 0.65rem;
        }
        .map-cloud-layer {
            display: flex;
            flex-shrink: 0;
            align-items: center;
            gap: var(--spacing-1-5);
            white-space: nowrap;
        }
        .map-cloud-layers {
            display: flex;
            gap: var(--spacing-3);
            overflow-x: auto;
            scrollbar-width: thin;
        }
        .map-cloud-height {
            margin-inline-start: auto;
            font-variant-numeric: tabular-nums;
        }
        .map-cloud-warning {
            color: var(--color-danger);
        }
        @container fullscreen-map (min-width: 900px) and (min-height: 48rem) {
            :scope {
                display: block;
            }
            :scope.minimized {
                display: grid;
            }
        }
    `);
    const metar = METARS.value?.at(-1);
    const cavok = metar?.metar.includes("CAVOK");
    const hasMetarClouds = Boolean(
        metar && (metar.clouds.length || cavok || metar.cbWithoutLayer),
    );
    const profile = hasMetarClouds
        ? null
        : getOpenMeteoCloudProfile(OM_DATA.value, DROPZONE_ELEVATION.value);
    if (!hasMetarClouds && !profile) return null;
    const time = hasMetarClouds ? metar?.time : profile?.time;
    const label = t(minimized ? "cloud.restore" : "cloud.minimize");

    return html`
        <button
            type="button"
            class=${`map-cloud-summary ${minimized ? "minimized p-0" : "px-2 py-1.5"}`}
            aria-label=${label}
            data-tooltip=${label}
            aria-expanded=${!minimized}
            onClick=${() => setMinimized((value) => !value)}
        >
            ${scope.style}
            ${
                minimized
                    ? h(Icon, { name: "cloudOvercast", size: 18 })
                    : html`
                          <div class="map-cloud-source mb-1">
                              <span
                                  data-tooltip=${hasMetarClouds ? metar?.metar : undefined}
                              >
                                  ${hasMetarClouds ? "METAR" : "Open-Meteo"}
                              </span>
                              <span
                                  data-tooltip=${time ? formatClock(time) : undefined}
                              >
                                  ${h(FromNow, { date: time, showClock: false })}
                              </span>
                          </div>
                          <div
                              class="map-cloud-layers"
                              aria-label=${t("weather.clouds")}
                          >
                              ${
                                  hasMetarClouds
                                      ? html`
                                            ${metar?.clouds.map((cloud) =>
                                                h(CompactCloudLayer, {
                                                    cloud,
                                                    focusable: false,
                                                }),
                                            )}
                                            ${
                                                cavok && !metar?.clouds.length
                                                    ? h(CompactCavok, {
                                                          focusable: false,
                                                      })
                                                    : null
                                            }
                                            ${
                                                metar?.cbWithoutLayer
                                                    ? html`
                                                          <div
                                                              class="map-cloud-layer map-cloud-warning"
                                                          >
                                                              ${h(Icon, { name: "lightning", size: 20 })}
                                                              <span>
                                                                  ${t("cloud.cumulonimbus")}
                                                              </span>
                                                          </div>
                                                      `
                                                    : null
                                            }
                                        `
                                      : profile?.layers.map((layer) =>
                                            h(CompactOpenMeteoCloudLayer, {
                                                layer,
                                                focusable: false,
                                            }),
                                        )
                              }
                          </div>
                      `
            }
        </button>
    `;
}
