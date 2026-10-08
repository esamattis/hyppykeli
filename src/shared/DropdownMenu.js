// @ts-check
import { Button } from "#app/shared/Button.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { Icon } from "#app/shared/icons.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "preact/hooks";

/**
 * Toolbar button that opens a menu downward. Items stay mounted so their
 * pressed and disabled state can be read while the menu is closed.
 * @param {DropdownMenuProps} props
 */
export function DropdownMenu({
    id,
    label,
    icon = "menu",
    size = 18,
    disabled = false,
    pressed,
    items = [],
    menuClass,
    trigger,
    children,
}) {
    const scope = useScope(css`
        :scope {
            position: relative;
            display: inline-flex;
        }
        :scope > .dropdown-trigger {
            position: relative;
        }
        :scope > .dropdown-trigger::after {
            content: "";
            position: absolute;
            right: 3px;
            bottom: 3px;
            border-inline: 3px solid transparent;
            border-top: 4px solid currentColor;
            pointer-events: none;
        }
        :scope > .dropdown-trigger[aria-pressed="true"],
        :scope > .dropdown-trigger[aria-expanded="true"] {
            background: var(--color-surface-hover);
        }
        :scope > .dropdown-trigger-labeled {
            display: inline-flex;
            align-items: center;
            width: auto;
            height: auto;
            min-height: 40px;
            gap: var(--spacing-2);
            justify-content: flex-start;
            border: none;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
            text-align: start;
        }
        :scope > .dropdown-trigger-labeled::after {
            top: 50%;
            right: 10px;
            bottom: auto;
            transform: translateY(-50%);
        }
        .dropdown-menu:popover-open {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-0-5);
            position: fixed;
            inset: unset;
            width: max-content;
            max-width: min(22rem, calc(100vw - 16px));
            max-height: calc(100vh - 16px);
            overflow: auto;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
            color: var(--color-text);
            box-shadow: var(--shadow-floating);
        }
        .dropdown-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-2-5);
            width: 100%;
            min-height: 40px;
            border: none;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
            line-height: 1.3;
            text-align: start;
            white-space: normal;
        }
        .dropdown-item:hover:not(:disabled),
        .dropdown-item:focus-visible {
            background: var(--color-surface-hover);
        }
        .dropdown-item[aria-checked="true"] {
            background: var(--color-surface-hover);
            color: var(--color-primary);
        }
        .dropdown-item:disabled {
            opacity: 0.5;
        }
    `);
    const generatedId = `dropdown-${useId().replaceAll(":", "")}`;
    const menuId = id ?? generatedId;
    const [open, setOpen] = useState(false);
    /** @type {import('preact').RefObject<HTMLDivElement>} */
    const rootRef = useRef(null);
    /** @type {import('preact').RefObject<HTMLDivElement>} */
    const menuRef = useRef(null);
    /** @type {import('preact').RefObject<((event: KeyboardEvent) => void) | null>} */
    const escapeListener = useRef(null);

    const position = () => {
        const menu = menuRef.current;
        const trigger = rootRef.current?.querySelector(
            "button.dropdown-trigger",
        );
        if (!menu || !(trigger instanceof HTMLElement)) return;
        if (!menu.matches(":popover-open")) return;
        const margin = 8;
        const triggerRect = trigger.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
        const spaceAbove = triggerRect.top - margin;
        let top =
            menuRect.height <= spaceBelow || spaceBelow >= spaceAbove
                ? triggerRect.bottom + 4
                : triggerRect.top - 4 - menuRect.height;
        const bottomOverflow =
            top + menuRect.height - (window.innerHeight - margin);
        if (bottomOverflow > 0) top = Math.max(margin, top - bottomOverflow);
        menu.style.margin = "0";
        menu.style.right = "auto";
        menu.style.bottom = "auto";
        menu.style.top = `${Math.max(margin, top)}px`;
        menu.style.left = `${triggerRect.left}px`;
        const placed = menu.getBoundingClientRect();
        const overflow = placed.right - (window.innerWidth - margin);
        if (overflow > 0)
            menu.style.left = `${Math.max(margin, placed.left - overflow)}px`;
    };

    const enabledItems = () =>
        [
            ...(menuRef.current?.querySelectorAll("button:not(:disabled)") ??
                []),
        ].filter((element) => element instanceof HTMLButtonElement);

    useLayoutEffect(() => {
        if (open) position();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const reposition = () => position();
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
        return () => {
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
        };
    }, [open]);

    useEffect(
        () => () => {
            if (!escapeListener.current) return;
            document.removeEventListener(
                "keydown",
                escapeListener.current,
                true,
            );
            escapeListener.current = null;
        },
        [],
    );

    /** @param {Event} event */
    const onToggle = (event) => {
        if (!(event instanceof ToggleEvent)) return;
        const next = event.newState === "open";
        setOpen(next);
        if (escapeListener.current) {
            document.removeEventListener(
                "keydown",
                escapeListener.current,
                true,
            );
            escapeListener.current = null;
        }
        if (!next) return;
        position();
        /** @param {KeyboardEvent} keyEvent */
        const stopEscape = (keyEvent) => {
            if (keyEvent.key !== "Escape") return;
            if (!menuRef.current?.matches(":popover-open")) return;
            // A modal dialog is the top layer and owns this Escape.
            if (document.querySelector("dialog:modal")) return;
            keyEvent.stopPropagation();
            menuRef.current?.hidePopover();
        };
        escapeListener.current = stopEscape;
        document.addEventListener("keydown", stopEscape, true);
    };

    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => {
        const menu = menuRef.current;
        if (!menu) return;
        const menuOpen = menu.matches(":popover-open");
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            if (!menuOpen || (event.key !== "Home" && event.key !== "End"))
                return;
        }
        const choices = enabledItems();
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !menuOpen)
            menu.showPopover();
        if (choices.length === 0) {
            event.preventDefault();
            return;
        }
        const index = choices.indexOf(
            /** @type {HTMLButtonElement} */ (document.activeElement),
        );
        event.preventDefault();
        const next =
            event.key === "ArrowDown"
                ? choices[(index + 1) % choices.length]
                : event.key === "ArrowUp"
                  ? choices[(index <= 0 ? choices.length : index) - 1]
                  : event.key === "Home"
                    ? choices[0]
                    : choices[choices.length - 1];
        next?.focus({ preventScroll: true });
    };

    /** @param {FocusEvent} event */
    const onFocusOut = (event) => {
        const root = rootRef.current;
        const next = event.relatedTarget;
        if (root && next instanceof Node && root.contains(next)) return;
        menuRef.current?.hidePopover();
    };

    return html`
        <div
            class="dropdown"
            ref=${rootRef}
            onKeyDown=${onKeyDown}
            onFocusOut=${onFocusOut}
        >
            ${scope.style}
            ${
                trigger
                    ? html`
                          ${h(
                              Button,
                              {
                                  type: "button",
                                  class: "dropdown-trigger dropdown-trigger-labeled text-rem-0-8 font-semibold py-1 pl-2 pr-7",
                                  "aria-label": label,
                                  "aria-haspopup": "menu",
                                  "aria-expanded": open,
                                  "aria-controls": menuId,
                                  "aria-pressed": pressed,
                                  popovertarget: menuId,
                                  disabled: disabled,
                              },
                              html`
                                  ${trigger}
                              `,
                          )}
                      `
                    : h(ToolbarButton, {
                          label,
                          icon,
                          size,
                          pressed,
                          disabled,
                          hasPopup: "menu",
                          expanded: open,
                          controls: menuId,
                          popoverTarget: menuId,
                          className: "dropdown-trigger",
                      })
            }
            <div
                id=${menuId}
                class=${`dropdown-menu m-0 p-1${menuClass ? ` ${menuClass}` : ""}`}
                popover="auto"
                role=${items.length > 0 && !children ? "menu" : "group"}
                aria-label=${label}
                ref=${menuRef}
                onToggle=${onToggle}
                onClick=${
                    /** @param {MouseEvent} event */ (event) => {
                        const button =
                            event.target instanceof Element
                                ? event.target.closest("button")
                                : null;
                        if (
                            !(button instanceof HTMLButtonElement) ||
                            button.disabled ||
                            button.classList.contains("dropdown-item") ||
                            button.dataset.closeOnSelect === "false"
                        )
                            return;
                        menuRef.current?.hidePopover();
                    }
                }
            >
                ${items.map((item) => {
                    const toggle = typeof item.pressed === "boolean";
                    return html`
                        ${h(
                            Button,
                            {
                                type: "button",
                                class: "dropdown-item text-rem-0-85 font-semibold py-2 px-2.5",
                                role: toggle ? "menuitemcheckbox" : "menuitem",
                                "aria-label": item.label,
                                "aria-checked": toggle
                                    ? item.pressed
                                    : undefined,
                                disabled: item.disabled,
                                onClick: () => {
                                    if (item.disabled) return;
                                    item.onSelect();
                                    if (item.closeOnSelect !== false)
                                        menuRef.current?.hidePopover();
                                },
                            },
                            html`
                                ${h(Icon, { name: item.icon, size: item.size ?? 18 })}
                                <span>${item.label}</span>
                            `,
                        )}
                    `;
                })}
                ${children}
            </div>
        </div>
    `;
}
