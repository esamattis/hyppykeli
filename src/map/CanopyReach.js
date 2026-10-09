// @ts-check
import { getCanopyReach } from "#app/map/canopy.js";
import { driftCoordinates } from "#app/map/freefall.js";
import { getTheme } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";
import { circle, layerGroup } from "leaflet";
import { useEffect, useMemo } from "preact/hooks";

/** @param {CanopyReachProps} props */
export function CanopyReach({
    map,
    target,
    winds,
    openingHeights,
    settings,
    satellite,
}) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: baseline;
            gap: var(--spacing-1);
        }
        :scope::before {
            content: "";
            align-self: center;
            flex-shrink: 0;
            width: 0.75em;
            height: 0.75em;
            border: 1px dashed var(--color-map-canopy-reach);
            border-radius: 50%;
            background: color-mix(
                in srgb,
                var(--color-map-canopy-reach) 15%,
                transparent
            );
        }
    `);
    const key = JSON.stringify([
        winds,
        openingHeights,
        settings.canopyGlideRatio,
        settings.canopyDescentRateMps,
    ]);
    const areas = useMemo(
        () =>
            [...new Set(openingHeights)]
                .sort((a, b) => a - b)
                .map((height) => ({
                    height,
                    reach: getCanopyReach(
                        winds,
                        height,
                        settings.canopyGlideRatio,
                        settings.canopyDescentRateMps,
                    ),
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
                    className: "canopy-reach-area",
                });
            layers.circles.set(height, area);
            area.setLatLng(center)
                .setRadius(reach.radius)
                .setStyle({
                    color: theme.mapCanopyReach,
                    fillColor: theme.mapCanopyReach,
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
            class="canopy-reach-summary"
            tabindex="0"
            data-tooltip=${t("map.canopyReachHelp")}
        >
            ${scope.style}
            ${
                available.length
                    ? t(
                          "map.canopyReachLabel",
                          available.map(({ height }) => height).join(" / "),
                          settings.canopyGlideRatio,
                          settings.canopyDescentRateMps,
                      )
                    : t("map.canopyReachUnavailable")
            }
        </span>
    `;
}
