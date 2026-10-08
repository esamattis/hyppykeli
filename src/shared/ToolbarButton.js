// @ts-check
import { css, useScope } from "#app/useScope.js";
import { Icon } from "#app/shared/icons.js";
import { h, html } from "htm/preact";

/** @param {ToolbarButtonProps} props */
export function ToolbarButton({
    label,
    icon,
    size = 18,
    className,
    pressed,
    disabled = false,
    hasPopup,
    expanded,
    controls,
    popoverTarget,
    showTooltip = true,
    onClick,
}) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: none;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
        }
        :scope[aria-pressed="true"] {
            color: var(--color-primary);
        }
        :scope:hover {
            background: var(--color-surface-hover);
        }
        :scope:disabled {
            opacity: 0.5;
        }
    `);
    return html`
        <button
            type="button"
            class=${`arrow-action p-0 text-rem-0-75${className ? ` ${className}` : ""}`}
            aria-label=${label}
            data-tooltip=${showTooltip ? label : undefined}
            aria-pressed=${pressed}
            aria-expanded=${expanded === undefined ? undefined : String(expanded)}
            aria-controls=${controls}
            aria-haspopup=${hasPopup}
            popovertarget=${popoverTarget}
            disabled=${disabled}
            onClick=${onClick}
        >
            ${scope.style} ${h(Icon, { name: icon, size })}
        </button>
    `;
}
