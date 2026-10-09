// @ts-check
import { getWingsuitCanopyReach } from "#app/map/wingsuit.js";
import { getCanopyReach } from "#app/map/canopy.js";
import { driftCoordinates } from "#app/map/freefall.js";
import { getTheme } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";
import { circle, layerGroup } from "leaflet";
import { useEffect, useMemo } from "preact/hooks";

/** @param {ReachAreasProps} props */
export function ReachAreas({
    kind = "canopy",
    map,
    target,
    winds,
    openingHeights,
    settings,
    satellite,
}) {
    const wingsuit = kind === "wingsuit";
    const ratio = wingsuit
        ? settings.wingsuitGlideRatio
        : settings.canopyGlideRatio;
    const rate = wingsuit
        ? settings.wingsuitDescentRateMps
        : settings.canopyDescentRateMps;
    const scope = useScope(css`
        :scope {
            --reach-color: var(--color-map-canopy-reach);
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-1);
        }
        .unavailable-value {
            display: none;
        }
        @container dropzone-map (max-width: 699px) {
            .unavailable-value {
                display: inline;
            }
            .summary-label {
                position: absolute;
                width: 1px;
                height: 1px;
                overflow: hidden;
                clip-path: inset(50%);
                white-space: nowrap;
            }
        }
        :scope.wingsuit-reach-summary {
            --reach-color: var(--color-map-wingsuit-reach);
        }
        :scope::before {
            content: "";
            align-self: center;
            flex-shrink: 0;
            width: 0.75em;
            height: 0.75em;
            border: 1px dashed var(--reach-color);
            border-radius: 50%;
            background: color-mix(in srgb, var(--reach-color) 15%, transparent);
        }
    `);
    const key = JSON.stringify([
        winds,
        openingHeights,
        kind,
        settings.exitHeight,
        ratio,
        rate,
        settings.canopyGlideRatio,
        settings.canopyDescentRateMps,
    ]);
    const areas = useMemo(
        () =>
            [...new Set(openingHeights)].map((height) => ({
                height,
                reach: wingsuit
                    ? getWingsuitCanopyReach(winds, height, settings)
                    : getCanopyReach(winds, height, ratio, rate),
            })),
        [key],
    );
    const layers = useMemo(
        () => ({
            group: layerGroup(),
            circles: /** @type {Map<number, import('leaflet').Circle>} */ (
                new Map()
            ),
        }),
        [map],
    );
    useEffect(() => {
        if (!map) return;
        layers.group.addTo(map);
        return () => {
            layers.group.remove();
        };
    }, [map, layers]);
    useEffect(() => {
        if (!map) return;
        const theme = getTheme(map.getContainer());
        const activeHeights = new Set();
        for (const { height, reach } of areas) {
            if (!target || !reach) continue;
            activeHeights.add(height);
            const center = driftCoordinates(target, { height: 0, ...reach });
            const area =
                layers.circles.get(height) ??
                circle(center, {
                    radius: reach.radius,
                    weight: 2,
                    dashArray: "6 4",
                    fillOpacity: 0.07,
                    interactive: false,
                    className: `${kind}-reach-area`,
                });
            layers.circles.set(height, area);
            area.setLatLng(center)
                .setRadius(reach.radius)
                .setStyle({
                    color: wingsuit
                        ? theme.mapWingsuitReach
                        : theme.mapCanopyReach,
                    fillColor: wingsuit
                        ? theme.mapWingsuitReach
                        : theme.mapCanopyReach,
                })
                .addTo(layers.group)
                .bringToBack();
        }
        for (const [height, area] of layers.circles) {
            if (activeHeights.has(height)) continue;
            layers.group.removeLayer(area);
            layers.circles.delete(height);
        }
    }, [map, layers, target?.lat, target?.lng, areas, satellite]);
    if (!target) return null;
    const available = areas.filter(({ reach }) => reach);
    return html`
        <span
            class=${`${kind}-reach-summary`}
            tabindex="0"
            data-tooltip=${t(wingsuit ? "map.wingsuitReachHelp" : "map.canopyReachHelp")}
        >
            ${scope.style}
            <span class="summary-label">
                ${
                    available.length
                        ? t(
                              wingsuit
                                  ? "map.wingsuitReachLabel"
                                  : "map.canopyReachLabel",
                              "",
                          ).trim()
                        : t(
                              wingsuit
                                  ? "map.wingsuitReachUnavailable"
                                  : "map.canopyReachUnavailable",
                          )
                }
            </span>
            <span
                class=${`value-number${available.length ? "" : " unavailable-value"}`}
            >
                ${
                    available.length
                        ? [
                              ...new Set(
                                  available.map(
                                      ({ reach }) =>
                                          `${Math.round(reach?.radius ?? 0)} m`,
                                  ),
                              ),
                          ].join(" / ")
                        : "—"
                }
            </span>
        </span>
    `;
}
