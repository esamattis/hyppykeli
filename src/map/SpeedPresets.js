// @ts-check
import { Button } from "#app/shared/Button.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

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
            gap: var(--spacing-1);
        }
        button {
            min-width: 0;
            min-height: 40px;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
        .preset-speed {
            display: block;
            white-space: nowrap;
        }
    `);
    return html`
        <div class="presets m-0">
            ${scope.style}
            ${presets.map(
                (preset) => html`
                    ${h(
                        Button,
                        {
                            class: "text-rem-0-7 p-1",
                            type: "button",
                            onClick: () => onSelect(preset.value),
                        },
                        html`
                            ${preset.label}
                            <span class="preset-speed text-rem-0-6 font-normal">
                                ${preset.value} km/h
                            </span>
                        `,
                    )}
                `,
            )}
        </div>
    `;
}
