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

    :scope.wind-table-title {
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
