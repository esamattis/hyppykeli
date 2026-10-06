// @ts-check
import { css, useScope } from "#app/useScope.js";
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
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 4px;
            margin: 0;
        }
        button {
            min-width: 0;
            min-height: 40px;
            padding: 4px;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
            font-size: 0.7rem;
        }
        .preset-speed {
            display: block;
            font-size: 0.6rem;
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
