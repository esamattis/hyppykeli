// @ts-check
import { css } from "./useScope.js";

export const windStatusStyles = css`
    .ok {
        color: var(--color-success);
    }

    .warning {
        color: var(--color-warning);
    }

    .danger {
        color: var(--color-danger);
    }
`;

export const dateHeadingStyles = css`
    h2 .date {
        font-size: 70%;
        font-weight: normal;
        margin-left: 1ch;
    }
`;

export const freshnessStyles = css`
    .fresh {
        transition: opacity 0.3s ease;
        opacity: 1;
    }

    .stale {
        opacity: 0.2;
    }
`;

export const upperWindTableStyles = css`
    :scope.wind-table-scroll {
        overflow: auto;
        max-height: 70vh;
        margin-bottom: 20px;
        isolation: isolate;
    }

    .wind-table .wind-table-title {
        padding: 6px 8px;
        border: 1px solid var(--color-border);
        background-color: var(--color-surface-hover);
        text-align: center;
        font-weight: bold;
    }

    .wind-table {
        border-collapse: collapse;
        white-space: nowrap;
    }

    .wind-table thead {
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .wind-table tr > :first-child {
        position: sticky;
        left: 0;
        z-index: 1;
        background-color: var(--color-surface-hover);
    }

    .wind-table thead tr > :first-child {
        z-index: 3;
    }

    .wind-table th.past-column {
        opacity: 1;
        color: var(--color-muted);
    }

    .wind-table th,
    .wind-table td {
        border: 1px solid var(--color-border);
        padding: 6px 8px;
        text-align: center;
    }

    .wind-table th {
        background-color: var(--color-surface-hover);
    }

    .time-header {
        min-width: 80px;
    }

    .pressure-cell {
        text-align: left;
        font-weight: bold;
    }

    .past-column {
        opacity: 0.5;
    }

    .wind-table th.current-column,
    .wind-table td.current-column {
        border-left: 2px solid var(--color-primary);
        border-right: 2px solid var(--color-primary);
    }

    .wind-table th.current-column {
        border-top: 2px solid var(--color-primary);
    }

    .wind-table tr:last-child td.current-column {
        border-bottom: 2px solid var(--color-primary);
    }
`;

/** Read shared CSS tokens for canvas and map renderers. */
export function getTheme() {
    const styles = getComputedStyle(document.documentElement);
    return {
        primary: styles.getPropertyValue("--color-primary").trim(),
        sky: styles.getPropertyValue("--color-sky").trim(),
        warning: styles.getPropertyValue("--color-warning").trim(),
        danger: styles.getPropertyValue("--color-danger").trim(),
        muted: styles.getPropertyValue("--color-muted").trim(),
        surface: styles.getPropertyValue("--color-surface").trim(),
        font: styles.getPropertyValue("--font-sans").trim(),
    };
}

// Shared layout for the cloud and wind summary readings.
export const summaryStyles = css`
    .summary-metrics {
        display: grid;
        gap: 12px;
        margin: 0;
    }

    .summary-metrics dt {
        color: var(--color-muted);
        font-size: 0.85rem;
        margin-bottom: 4px;
    }

    .summary-metrics dd {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
    }

    .summary-time {
        margin-top: 12px;
        color: var(--color-muted);
        font-size: 0.85rem;
    }
`;

export const settingsDialogStyles = css`
    :scope:is(dialog) {
        width: 420px;
        box-sizing: border-box;
    }
    h2 {
        margin-top: 0;
    }
    form label {
        display: grid;
        gap: 8px;
        margin-top: 14px;
    }
    input[type="number"] {
        width: 100%;
        box-sizing: border-box;
    }
`;

export const cardHeadingStyles = css`
    .card-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 1rem;
    }
    .card-heading h2 {
        margin: 0;
    }
    .card-heading .source-note {
        margin: 0;
        text-align: right;
    }
`;

export const cloudLayerStyles = css`
    :scope {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 12px;
        padding: 14px 0;
    }
    .cloud-layer-icon {
        position: relative;
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--color-surface-hover);
        color: var(--color-primary);
    }
    .cloud-lightning {
        position: absolute;
        right: -3px;
        bottom: -2px;
        display: grid;
        place-items: center;
        width: 22px;
        height: 24px;
        color: var(--color-danger);
    }
    .cloud-layer-name {
        font-weight: 600;
        line-height: 1.3;
    }
    .cloud-layer-coverage,
    .cloud-base-label {
        display: block;
        color: var(--color-muted);
        font-size: 0.75rem;
        margin-top: 3px;
    }
    .cloud-layer-base {
        text-align: right;
        white-space: nowrap;
    }
    .cloud-layer-base b {
        font-size: 1.35rem;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.025em;
    }
    @media (max-width: 380px) {
        :scope {
            gap: 8px;
            grid-template-columns: 36px minmax(0, 1fr) auto auto;
        }
        .cloud-layer-icon {
            width: 36px;
            height: 40px;
        }
        .cloud-layer-base b {
            font-size: 1.15rem;
        }
    }
`;
