// @ts-check
import { css, useScope } from "./useScope.js";

import { Component, h, html } from "htm/preact";
import { Fragment } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./icons.js";
import { formatClock } from "./utils.js";

/**
 * Native modal dialog with shared backdrop dismissal and page scroll locking.
 * Scroll locking follows :modal in styles.css, including Escape and unmounts.
 * @param {Object} props
 * @param {import('preact').RefObject<HTMLDialogElement>} props.dialogRef
 * @param {string} [props.id]
 * @param {string} [props.labelledBy]
 * @param {import('preact').ComponentChildren} [props.children]
 */
export function Dialog(props) {
    const scope = useScope(css`
        :scope {
            padding-inline-end: 56px;
        }
        :scope > .dialog-controls {
            position: sticky;
            top: 8px;
            height: 0;
            margin-top: -16px;
            margin-bottom: 16px;
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
            padding: 8px;
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
        <dialog ref=${ref} id=${props.id} aria-labelledby=${props.labelledBy}>
            ${scope.style}
            <div class="dialog-controls">
                <button
                    class="dialog-close"
                    type="button"
                    aria-label="Sulje"
                    title="Sulje"
                    onClick=${() => ref.current?.close()}
                >
                    ${h(Icon, { name: "close", size: 24 })}
                </button>
            </div>
            ${props.children}
        </dialog>
    `;
}

/**
 * @param {Object} props
 * @param {import('preact').ComponentChildren} [props.children]
 * @param {string} [props.label]
 * @param {string} [props.id]
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
            margin: 0 4px;
            padding: 4px;
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
            margin-top: 20px;
            font-weight: normal;
            width: clamp(300px, 400px, 95vw);
            white-space: wrap;
        }
        .help-content {
            font-size: initial;
            font-family: var(--font-sans);
            font-weight: initial;
            font-style: normal;
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
            class="help"
            type="button"
            onClick=${open}
            id=${props.id}
            aria-label=${props.label ?? "Ohje"}
            title=${props.label ?? "Ohje"}
            aria-haspopup="dialog"
        >
            ${scope.style} ${h(Icon, { name: "help", size: 20 })}
        </button>
        ${h(
            Dialog,
            { dialogRef: ref },
            html`
                ${scope.style}
                <div class=${`help-content ${scope.end}`}>
                    ${props.children}
                </div>
            `,
        )}
    `;
}

export class ErrorBoundary extends Component {
    /**
     * @param {Object} props
     * @param {any} props.children
     * @param {any} props.fallback
     */
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    /**
     * @param {Error} error
     * @param {import('preact').ErrorInfo} errorInfo
     */
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback ??
                html`
                    <div>Tässä tapahtui virhe :(</div>
                `
            );
        }

        return this.props.children;
    }
}

/**
 * Set value returned by the setter function to the state every second.
 *
 * @param {() => T} setter
 * @template {any} T
 * @returns {T}
 */
function useInterval(setter) {
    const [state, setState] = useState(/** @type {T} */ (setter()));
    useEffect(() => {
        setState(setter());
        const interval = setInterval(() => {
            setState(setter());
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [setter]);

    return state;
}

/**
 * @param {Object} props
 * @param {Date} [props.date]
 */
export function FromNow(props) {
    const createFromNow = useCallback(() => {
        if (!props.date) {
            return "";
        }

        const diffInMinutes = Math.round(
            -(Date.now() - props.date.getTime()) / 1000 / 60,
        );

        if (Math.abs(diffInMinutes) > 120) {
            const diffInHours = Math.round(diffInMinutes / 60);
            return new Intl.RelativeTimeFormat("fi").format(
                diffInHours,
                "hours",
            );
        }

        return new Intl.RelativeTimeFormat("fi").format(
            diffInMinutes,
            "minutes",
        );
    }, [props.date]);

    if (!props.date) {
        return null;
    }

    const fromNow = useInterval(createFromNow);

    return html`
        <span class="from-now">${fromNow}</span>
        ${" "}
        <small>(klo ${formatClock(props.date)})</small>
    `;
}
