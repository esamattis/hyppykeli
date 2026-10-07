// @ts-check
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { Dialog } from "#app/shared/Dialog.js";
import { Icon } from "#app/shared/icons.js";
import { h, html } from "htm/preact";
import { useRef } from "preact/hooks";

/**
 * @param {Object} props
 * @param {import('preact').ComponentChildren} [props.children]
 * @param {string} [props.label]
 * @param {string} [props.id]
 * @param {boolean} [props.wide]
 */
export function Help(props) {
    const scope = useScope(css`
        :scope.help {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            vertical-align: middle;
            margin: 0 var(--spacing-1);
            background-color: transparent;
            color: var(--color-primary);
            border: none;
            border-radius: 50%;
            flex-shrink: 0;
        }
        :scope.help:hover {
            background-color: var(--color-surface-hover);
            color: var(--color-primary-hover);
        }
        :scope:is(dialog) {
            margin: 0 auto;
            margin-top: var(--spacing-5);
            font-weight: normal;
            width: clamp(300px, 400px, 95vw);
            white-space: wrap;
        }
        @media (min-width: 700px) {
            :scope:is(dialog).help-dialog-wide {
                width: min(720px, 90vw);
            }
        }
        .help-content {
            font-size: initial;
            font-family: var(--font-sans);
            font-weight: initial;
            font-style: normal;
            letter-spacing: normal;
            line-height: 1.5;
            width: 100%;
        }
    `);

    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const ref = useRef(null);

    const open = () => {
        ref.current?.showModal();
    };

    return html`
        <button
            class="help p-1"
            type="button"
            onClick=${open}
            id=${props.id}
            aria-label=${props.label ?? t("common.help")}
            title=${props.label ?? t("common.help")}
            aria-haspopup="dialog"
        >
            ${scope.style} ${h(Icon, { name: "help", size: 20 })}
        </button>
        ${h(
            Dialog,
            {
                dialogRef: ref,
                className: props.wide ? "help-dialog-wide" : undefined,
            },
            html`
                ${scope.style}
                <div class=${`help-content ${scope.end}`}>
                    ${props.children}
                </div>
            `,
        )}
    `;
}
