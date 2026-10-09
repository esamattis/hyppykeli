// @ts-check
import { css, useScope } from "#app/useScope.js";
import { h } from "htm/preact";

/** @param {ButtonProps} props */
export function Button({
    children,
    class: className,
    type = "button",
    ...props
}) {
    const scope = useScope(css`
        :where(:scope) {
            padding: var(--spacing-2) var(--spacing-3-5);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface-hover);
            color: var(--color-primary);
            cursor: pointer;
            transition: background-color 0.15s ease;
        }
        :where(:scope):hover {
            background: var(--color-sky);
        }
        :where(:scope):disabled {
            opacity: 0.5;
            cursor: default;
        }
    `);
    return h(
        "button",
        { ...props, type, class: `font-semibold ${className ?? ""}` },
        scope.style,
        children,
    );
}
