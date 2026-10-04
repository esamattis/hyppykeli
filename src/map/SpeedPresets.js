// @ts-check
import { css, useScope } from "../useScope.js";
import { html } from "htm/preact";

const presets = [
    { label: "FS", value: 180 },
    { label: "Freefly", value: 240 },
    { label: "Wingsuit", value: 80 },
];

/** @param {SpeedPresetsProps} props */
export function SpeedPresets({ onSelect }) {
    const scope = useScope(css`
        :scope {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 16px 0;
        }
        button {
            flex: 1;
            padding: 10px;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
        .preset-speed {
            display: block;
            font-size: 0.75rem;
            font-weight: 400;
            white-space: nowrap;
        }
    `);
    return html`
        <div class="presets">
            ${scope.style}
            ${presets.map(
                (preset) => html`
                    <button
                        type="button"
                        onClick=${() => onSelect(preset.value)}
                    >
                        ${preset.label}
                        <span class="preset-speed">${preset.value} km/h</span>
                    </button>
                `,
            )}
        </div>
    `;
}
