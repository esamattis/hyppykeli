// @ts-check
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { Compass } from "#app/weather/Compass.js";
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
            width: min(240px, 35vh);
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
            font-size: 0.75rem;
        }
        :scope.minimized:hover {
            background: var(--color-map-control-hover);
        }
        :scope:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }
        @media (min-width: 900px) {
            :scope {
                display: grid;
            }
        }
    `);
    const label = t(minimized ? "compass.restore" : "compass.minimize");
    return html`
        <button
            type="button"
            class=${`map-compass${minimized ? " minimized" : ""}`}
            aria-label=${label}
            title=${label}
            aria-expanded=${!minimized}
            onClick=${() => setMinimized((value) => !value)}
        >
            ${scope.style}
            ${
                minimized
                    ? h(Icon, { name: "compass", size: 18 })
                    : h(Compass, { id: "map-compass", showControls: false })
            }
        </button>
    `;
}
