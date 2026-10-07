// @ts-check
import { CloudCoverIcon, PieChart } from "#app/shared/icons.js";
import { isNullish } from "#app/shared/values.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

/**
 * Compact cloud-cover reading for the cloud card. Unlike the shaded squares in the
 * full forecast dialog, its weather symbols are deliberately stepped so a run
 * of hours can be scanned quickly.
 *
 * @param {Object} props
 * @param {number} [props.percentage]
 */
export function PercentageCloudCover(props) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            gap: 0.55ch;
        }
    `);

    if (isNullish(props.percentage)) {
        return null;
    }

    return html`
        <span class="cloud-cover">
            ${scope.style}
            ${h(CloudCoverIcon, { percentage: props.percentage, size: 24 })}
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}

/**
 * @param {Object} props
 * @param {number} [props.percentage]
 */
export function PercentagePie(props) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
        }

        :scope svg {
            margin-right: 1ch;
        }
    `);

    if (isNullish(props.percentage)) {
        return null;
    }

    return html`
        <span class="cloud-cover">
            ${scope.style} ${h(PieChart, { percentage: props.percentage })}
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}

/**
 * @param {Object} props
 * @param {number} props.percentage
 */
export function CloudCoverSquare(props) {
    const scope = useScope(css`
        :scope {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            line-height: 1;
            font-variant-numeric: tabular-nums;
            /* Mix grayscale endpoints in sRGB to preserve the cover shading scale. */
            background: color-mix(
                in srgb,
                var(--color-cloud-overcast) var(--cloud-cover-percentage),
                var(--color-cloud-clear)
            );
            color: var(--cloud-cover-text);
        }
    `);
    const percentage = Math.max(0, Math.min(100, props.percentage));
    const lightness = 96 - percentage * 0.76;

    return html`
        <span
            class="cloud-cover cloud-cover-square"
            style=${{
                "--cloud-cover-percentage": `${percentage}%`,
                "--cloud-cover-text":
                    lightness < 50
                        ? "var(--color-cloud-text-light)"
                        : "var(--color-cloud-text-dark)",
            }}
        >
            ${scope.style}
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}
