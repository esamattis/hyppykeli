// @ts-check
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

/** @param {MapNavigationControlsProps} props */
export function MapNavigationControls({ map, zoom, disabled, canFit, onFit }) {
    const scope = useScope(css`
        :scope {
            position: absolute;
            top: var(--spacing-3);
            left: var(--spacing-3);
            z-index: 700;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-1-5);
        }
        .map-zoom-controls,
        :scope > .arrow-action {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-map-control);
            box-shadow: var(--shadow-floating);
        }
        .map-zoom-controls {
            display: flex;
            flex-direction: column;
        }
        .map-zoom-controls > .arrow-action {
            border-radius: 0;
        }
        .map-zoom-controls > .arrow-action:first-child {
            border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        }
        .map-zoom-controls > .arrow-action:last-child {
            border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        }
        :scope .arrow-action:hover {
            background: var(--color-map-control-hover);
        }
    `);
    return html`
        <div class="map-navigation-controls">
            ${scope.style}
            <div class="map-zoom-controls">
                ${h(ToolbarButton, {
                    icon: "plus",
                    label: t("toolbar.zoomIn"),
                    disabled: disabled || !map || zoom >= map.getMaxZoom(),
                    onClick: () => map?.zoomIn(),
                })}
                ${h(ToolbarButton, {
                    icon: "minus",
                    label: t("toolbar.zoomOut"),
                    disabled: disabled || !map || zoom <= map.getMinZoom(),
                    onClick: () => map?.zoomOut(),
                })}
            </div>
            ${h(ToolbarButton, {
                icon: "fitView",
                label: t("toolbar.positionView"),
                disabled: disabled || !canFit,
                onClick: onFit,
            })}
        </div>
    `;
}
