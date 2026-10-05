// @ts-check
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

// All UI icon artwork lives here. Charts and the compass are data visualizations.
const artwork = {
    plane: html`
        <path
            d="M12 3c-1 0-1.5 1-1.5 2v5L3 15v2l7.5-2v4L8 21v1l4-1 4 1v-1l-2.5-2v-4l7.5 2v-2L13.5 10V5c0-1-.5-2-1.5-2Z"
        />
    `,
    plus: html`
        <path d="M12 4v16M4 12h16" />
    `,
    settings: html`
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
    `,
    share: html`
        <path d="M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8" />
    `,
    expand: html`
        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
    `,
    collapse: html`
        <path d="M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3" />
    `,
    pen: html`
        <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
    `,
    undo: html`
        <path d="M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12h-3" />
    `,
    trash: html`
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    `,
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
    location: html`
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    `,
    heading: html`
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10" />
        <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
    `,
    lightning: html`
        <path d="m13 2-9 12h7l-1 8 10-13h-7z" fill="currentColor" />
    `,
    storm: html`
        <path
            d="M6 16a4 4 0 0 1-1-7 6 6 0 0 1 11-3 5 5 0 0 1 3 10h-2M12 12l-4 6h4l-1 5 6-8h-4l1-3z"
        />
    `,
    cloudClear: html`
        <circle cx="12" cy="12" r="4" />
        <path
            d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
        />
    `,
    cloudNsc: html`
        <circle cx="9" cy="9" r="3.5" />
        <path
            d="M9 2v1M2 9h1M4 4l1 1M14 4l-1 1M5 15l-1 1M13 19h6a3 3 0 0 0 0-6 4 4 0 0 0-7.5 1A2.5 2.5 0 0 0 13 19Z"
        />
    `,
    cloudFew: html`
        <circle cx="7" cy="7" r="3" />
        <path
            d="M7 1v1M1 7h1M2.5 2.5l1 1M11.5 2.5l-1 1M6 19h12a4 4 0 0 0 0-8 5 5 0 0 0-9.5 1A3.5 3.5 0 0 0 6 19Z"
        />
    `,
    cloudScattered: html`
        <path d="M4 10h8a3 3 0 0 0 0-6 4 4 0 0 0-7.5 1A2.5 2.5 0 0 0 4 10Z" />
        <path
            d="M11 21h9a3 3 0 0 0 0-6 4 4 0 0 0-7.5 1A2.5 2.5 0 0 0 11 21Z"
            fill="currentColor"
            fill-opacity="0.12"
        />
    `,
    cloudBroken: html`
        <path d="M4 12a3 3 0 0 1 0-6 5 5 0 0 1 9-2 4 4 0 0 1 6 5" />
        <path
            d="M7 20h12a4 4 0 0 0 0-8 5 5 0 0 0-9.5 1A3.5 3.5 0 0 0 7 20Z"
            fill="currentColor"
            fill-opacity="0.18"
        />
    `,
    cloudOvercast: html`
        <path d="M4 11a3 3 0 0 1 0-6 5 5 0 0 1 9-2 4 4 0 0 1 6 5" />
        <path
            d="M6 19h12a4 4 0 0 0 0-8 5 5 0 0 0-9.5 1A3.5 3.5 0 0 0 6 19Z"
            fill="currentColor"
            fill-opacity="0.3"
        />
        <path d="M4 23h16" />
    `,
    cloudFog: html`
        <path
            d="M6 15a4 4 0 0 1-1-8 5 5 0 0 1 9-3 4 4 0 0 1 5 3 4 4 0 0 1-1 8Z"
            fill="currentColor"
            fill-opacity="0.12"
        />
        <path
            d="m7 8 3 1M17 8l-3 1M10 13q2-2 4 0M2 19h13M18 19h4M5 23h3M11 23h8"
        />
        <circle cx="9" cy="10" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="0.7" fill="currentColor" stroke="none" />
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
 * A weather-shaped cloud-cover symbol for compact forecasts. The exact value
 * is still shown as text; the symbol groups it into quickly scannable 20%
 * steps.
 *
 * @param {Object} props
 * @param {number} props.percentage
 * @param {number|string} [props.size]
 */
export function CloudCoverIcon({ percentage, size = "1em" }) {
    const step = Math.round(Math.min(100, Math.max(0, percentage)) / 20);
    const names = /** @type {const} */ ([
        "cloudClear",
        "cloudNsc",
        "cloudFew",
        "cloudScattered",
        "cloudBroken",
        "cloudOvercast",
    ]);

    return h(Icon, { name: names[step] ?? "cloudOvercast", size });
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
