// @ts-check
import { h, html } from "htm/preact";
import { css, useScope } from "./useScope.js";

// All UI icon artwork lives here. Charts and the compass are data visualizations.
const artwork = {
    close: html`
        <path d="M6 6l12 12M18 6L6 18" />
    `,
    help: html`
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
        <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
    `,
    table: html`
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 9v12" />
    `,
    up: html`
        <path d="M12 20V4m-7 7 7-7 7 7" />
    `,
    chart: html`
        <path d="M4 3v17h17M7 15l5-5 4 3 5-7M16 6h5v5" />
    `,
    wind: html`
        <path
            d="M3 8h13a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a2 2 0 1 1-2 2"
        />
    `,
    menu: html`
        <path d="M4 6h16M4 12h16M4 18h16" />
    `,
    lightning: html`
        <path d="m13 2-9 12h7l-1 8 10-13h-7z" />
    `,
    storm: html`
        <path
            d="M6 16a4 4 0 0 1-1-7 6 6 0 0 1 11-3 5 5 0 0 1 3 10h-2M12 12l-4 6h4l-1 5 6-8h-4l1-3z"
        />
    `,
    arrow: html`
        <path d="M12 3 21 21 12 17 3 21Z" fill="currentColor" stroke="none" />
    `,
    calm: html`
        <circle cx="12" cy="12" r="4" />
    `,
    missing: html`
        <path d="M7 12h10" />
    `,
};

/** @param {IconProps} props */
export function Icon({ name, size = "1em", label, className, rotation = 0 }) {
    const scope = useScope(css`
        :scope {
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
        }
    `);
    return html`
        <svg
            class=${className}
            width=${size}
            height=${size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            role=${label ? "img" : undefined}
            aria-label=${label}
            aria-hidden=${label ? undefined : "true"}
            focusable="false"
        >
            ${scope.style}
            <g transform=${`rotate(${rotation} 12 12)`}>${artwork[name]}</g>
        </svg>
    `;
}

/** @param {WindArrowProps} props */
export function WindArrow({ direction, size = "1em", label }) {
    if (direction == null || !Number.isFinite(direction) || direction < 0)
        return null;
    // Bearings name the wind's origin. Our north-facing arrow shows its travel.
    return h(Icon, { name: "arrow", size, label, rotation: direction + 180 });
}

/**
 * @param {Object} props
 * @param {number} props.percentage
 */
export function PieChart({ percentage }) {
    const adjustedPercentage = Math.min(100, Math.max(0, percentage));
    const angle = (adjustedPercentage / 100) * 360;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const endX = 50 + 50 * Math.cos(((angle - 90) * Math.PI) / 180);
    const endY = 50 + 50 * Math.sin(((angle - 90) * Math.PI) / 180);

    return html`
        <svg class="pie" width="20" height="20" viewBox="0 0 100 100">
            <circle
                cx="50"
                cy="50"
                r="50"
                fill=${percentage >= 100 ? "black" : "white"}
                stroke="black"
                stroke-width="1"
            />
            <path
                d=${`M 50 50 L 50 0 A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                fill="black"
            />
        </svg>
    `;
}
