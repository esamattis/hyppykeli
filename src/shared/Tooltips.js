// @ts-check
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";

/** Render once; elements with data-tooltip use this shared popover. */
export function Tooltips() {
    const scope = useScope(css`
        :scope {
            position: fixed;
            inset: auto;
            margin: 0;
            max-width: min(320px, calc(100vw - 16px));
            padding: 4px 8px;
            border: none;
            border-radius: var(--radius-sm);
            background: var(--color-text);
            color: var(--color-surface);
            box-shadow: var(--shadow-floating);
            font-size: 0.75rem;
            font-weight: 500;
            line-height: 1.4;
            overflow: visible;
            pointer-events: none;
        }
        .tooltip-arrow {
            position: absolute;
            top: 100%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-bottom: 0;
            border-top-color: var(--color-text);
        }
        :scope[data-below] .tooltip-arrow {
            top: auto;
            bottom: 100%;
            border-top: 0;
            border-bottom: 4px solid var(--color-text);
        }
    `);
    return html`
        <div id="tooltip" role="tooltip" popover="manual" hidden>
            ${scope.style}
            <span data-tooltip-text></span>
            <span class="tooltip-arrow" aria-hidden="true"></span>
        </div>
    `;
}
