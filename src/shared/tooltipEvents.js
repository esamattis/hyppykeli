// @ts-check

/** Start delegated tooltip listeners explicitly from app startup. */
export function startTooltips() {
    const edgeMargin = 8;
    const targetGap = 8;
    const hoverDelay = 300;
    /** @type {number | undefined} */
    let hoverTimer;
    /** @type {HTMLElement | null} */
    let pendingTarget = null;
    /** @type {HTMLElement | null} */
    let activeTarget = null;
    /** @type {HTMLElement | null} */
    let touchTarget = null;

    /** @param {EventTarget | null} target */
    function getTarget(target) {
        if (!(target instanceof Element)) return null;
        const element = target.closest("[data-tooltip]");
        return element instanceof HTMLElement && element.dataset.tooltip
            ? element
            : null;
    }

    function cancelHover() {
        window.clearTimeout(hoverTimer);
        hoverTimer = undefined;
        pendingTarget = null;
    }

    /** @param {HTMLElement | null} [target] @param {boolean} [force] */
    function hide(target, force = false) {
        if (force || !target || target === pendingTarget) cancelHover();
        if (!force && (touchTarget || (target && target !== activeTarget)))
            return;
        if (activeTarget) {
            const descriptions = (
                activeTarget.getAttribute("aria-describedby") ?? ""
            )
                .split(/\s+/)
                .filter((id) => id && id !== "tooltip");
            if (descriptions.length)
                activeTarget.setAttribute(
                    "aria-describedby",
                    descriptions.join(" "),
                );
            else activeTarget.removeAttribute("aria-describedby");
        }
        activeTarget = null;
        if (force) touchTarget = null;
        const tooltip = document.getElementById("tooltip");
        if (!tooltip) return;
        if (tooltip.matches(":popover-open")) tooltip.hidePopover();
        tooltip.hidden = true;
    }

    /**
     * @param {HTMLElement} target
     * @param {boolean} [retry]
     */
    function show(target, retry = true) {
        if (touchTarget && target !== touchTarget) return;
        cancelHover();
        const tooltip = document.getElementById("tooltip");
        const text = tooltip?.querySelector("[data-tooltip-text]");
        const arrow = tooltip?.querySelector(".tooltip-arrow");
        if (!tooltip || !text || !(arrow instanceof HTMLElement)) return;
        if (activeTarget !== target) hide(null, true);
        activeTarget = target;
        text.textContent = target.dataset.tooltip ?? "";
        const descriptions = new Set(
            (target.getAttribute("aria-describedby") ?? "")
                .split(/\s+/)
                .filter(Boolean),
        );
        descriptions.add("tooltip");
        target.setAttribute("aria-describedby", [...descriptions].join(" "));
        tooltip.hidden = false;
        // Closing a menu focuses its trigger during that popover toggle.
        // Showing the tooltip has to wait until the toggle finishes.
        if (!tooltip.matches(":popover-open")) {
            try {
                tooltip.showPopover();
            } catch (error) {
                if (
                    !(error instanceof DOMException) ||
                    error.name !== "InvalidStateError"
                )
                    throw error;
                if (retry)
                    requestAnimationFrame(() => {
                        if (activeTarget === target) show(target, false);
                    });
                return;
            }
        }

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = Math.max(
            edgeMargin,
            Math.min(
                rect.left + (rect.width - tooltipRect.width) / 2,
                window.innerWidth - tooltipRect.width - edgeMargin,
            ),
        );
        const above = rect.top - edgeMargin;
        const below = window.innerHeight - rect.bottom - edgeMargin;
        const placeBelow =
            above < tooltipRect.height + targetGap && below >= above;
        tooltip.toggleAttribute("data-below", placeBelow);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${placeBelow ? rect.bottom + targetGap : Math.max(edgeMargin, rect.top - tooltipRect.height - targetGap)}px`;
        arrow.style.left = `${rect.left + rect.width / 2 - left}px`;
    }

    document.addEventListener(
        "touchstart",
        (event) => {
            if (touchTarget) {
                hide(null, true);
                return;
            }
            const target = getTarget(event.target);
            if (!target) return;
            show(target);
            touchTarget = target;
        },
        { passive: true },
    );
    document.addEventListener(
        "pointerover",
        (event) => {
            const target = getTarget(event.target);
            if (
                !target ||
                event.pointerType === "touch" ||
                touchTarget ||
                target === activeTarget ||
                target === pendingTarget ||
                (event.relatedTarget instanceof Node &&
                    target.contains(event.relatedTarget))
            )
                return;
            cancelHover();
            pendingTarget = target;
            hoverTimer = window.setTimeout(() => {
                cancelHover();
                if (target.isConnected) show(target);
            }, hoverDelay);
        },
        { passive: true },
    );
    document.addEventListener(
        "pointerout",
        (event) => {
            const target = getTarget(event.target);
            if (
                target &&
                event.relatedTarget instanceof Node &&
                target.contains(event.relatedTarget)
            )
                return;
            if (target && target !== document.activeElement) hide(target);
        },
        { passive: true },
    );
    document.addEventListener("focusin", (event) => {
        const target = getTarget(event.target);
        if (target) show(target);
    });
    document.addEventListener("focusout", (event) =>
        hide(getTarget(event.target)),
    );
    document.addEventListener("click", () => hide());
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hide(null, true);
    });
    window.addEventListener(
        "scroll",
        () => {
            if (
                activeTarget === document.activeElement &&
                activeTarget &&
                !touchTarget
            )
                show(activeTarget);
            else hide();
        },
        { capture: true, passive: true },
    );
    window.addEventListener("resize", () => hide(null, true), {
        passive: true,
    });
}
