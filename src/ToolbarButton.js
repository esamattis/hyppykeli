// @ts-check
import { h, html } from "htm/preact";
import { Icon } from "./icons.js";
import { css, useScope } from "./useScope.js";

/** @param {ToolbarButtonProps} props */
export function ToolbarButton({
    label,
    icon,
    size = 18,
    className,
    pressed,
    disabled = false,
    hasPopup,
    onClick,
}) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            padding: 0;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
            font-size: 0.75rem;
        }
        :scope[aria-pressed="true"] {
            background: var(--color-surface-hover);
            color: var(--color-primary);
            outline: 1px solid var(--color-primary);
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
            class=${`arrow-action${className ? ` ${className}` : ""}`}
            aria-label=${label}
            title=${label}
            aria-pressed=${pressed}
            aria-haspopup=${hasPopup}
            disabled=${disabled}
            onClick=${onClick}
        >
            ${scope.style} ${h(Icon, { name: icon, size })}
        </button>
    `;
}
