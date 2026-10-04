// @ts-check
import { CloudCoverIcon, PieChart } from "../shared/icons.js";
import { isNullish } from "../shared/values.js";
import { css, useScope } from "../useScope.js";
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
            display: flex;
            align-items: center;
            justify-content: center;
            width: 3.25rem;
            height: 3.25rem;
            font-size: 0.8rem;
            line-height: 1;
            font-variant-numeric: tabular-nums;
            background: var(--cloud-cover-background);
            color: var(--cloud-cover-text);
        }
    `);
    const percentage = Math.max(0, Math.min(100, props.percentage));
    const lightness = 96 - percentage * 0.76;

    return html`
        <span
            class="cloud-cover cloud-cover-square"
            style=${{
                "--cloud-cover-background": `hsl(0 0% ${lightness}%)`,
                "--cloud-cover-text": lightness < 50 ? "#fff" : "#111",
            }}
        >
            ${scope.style}
            <span class="text">${props.percentage.toFixed(0)} %</span>
        </span>
    `;
}
