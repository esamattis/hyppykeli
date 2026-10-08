// @ts-check
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { Icon } from "#app/shared/icons.js";
import { h, html } from "htm/preact";
import { useEffect } from "preact/hooks";

/**
 * Native modal dialog with shared backdrop dismissal and page scroll locking.
 * Scroll locking follows :modal in styles.css, including Escape and unmounts.
 * @param {Object} props
 * @param {import('preact').RefObject<HTMLDialogElement>} props.dialogRef
 * @param {string} [props.id]
 * @param {string} [props.className]
 * @param {string} [props.labelledBy]
 * @param {import('preact').ComponentChildren} [props.children]
 */
export function Dialog(props) {
    const scope = useScope(css`
        :scope {
            padding-inline-end: var(--spacing-14);
        }
        :scope > .dialog-controls {
            position: sticky;
            top: -16px;
            height: 0;
            margin-top: calc(-1 * var(--spacing-4));
            margin-bottom: var(--spacing-4);
            z-index: 1;
        }
        :scope > .dialog-controls > .dialog-close {
            position: absolute;
            top: 0;
            right: -48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            padding: var(--spacing-2);
            background: var(--color-surface);
            border: none;
            border-radius: 50%;
            box-shadow: none;
            color: var(--color-text);
        }
        :scope > .dialog-controls > .dialog-close:hover {
            background-color: var(--color-surface-hover);
            color: var(--color-primary-hover);
        }
    `);
    const ref = props.dialogRef;

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        /** @param {MouseEvent} event */
        const isBackdrop = (event) => {
            if (event.target !== dialog) return false;
            const { left, right, top, bottom } = dialog.getBoundingClientRect();
            return (
                event.clientX < left ||
                event.clientX > right ||
                event.clientY < top ||
                event.clientY > bottom
            );
        };

        let startedOnBackdrop = false;
        /** @param {PointerEvent} event */
        const onPointerDown = (event) => {
            startedOnBackdrop = isBackdrop(event);
        };
        /** @param {MouseEvent} event */
        const onClick = (event) => {
            if (startedOnBackdrop && isBackdrop(event)) dialog.close();
            startedOnBackdrop = false;
        };

        dialog.addEventListener("pointerdown", onPointerDown);
        dialog.addEventListener("click", onClick);
        return () => {
            dialog.removeEventListener("pointerdown", onPointerDown);
            dialog.removeEventListener("click", onClick);
        };
    }, [ref]);

    return html`
        <dialog
            ref=${ref}
            id=${props.id}
            class=${props.className}
            aria-labelledby=${props.labelledBy}
        >
            ${scope.style}
            <div class="dialog-controls">
                <button
                    class="dialog-close"
                    type="button"
                    aria-label=${t("common.close")}
                    data-tooltip=${t("common.close")}
                    onClick=${() => ref.current?.close()}
                >
                    ${h(Icon, { name: "close", size: 24 })}
                </button>
            </div>
            ${props.children}
        </dialog>
    `;
}
