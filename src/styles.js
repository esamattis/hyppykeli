// @ts-check
import { css } from "#app/useScope.js";

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
        margin-bottom: var(--spacing-5);
        isolation: isolate;
    }

    .wind-table .wind-table-title {
        padding: var(--spacing-1-5) var(--spacing-2);
        border: 1px solid var(--color-border);
        background-color: var(--color-surface-hover);
        text-align: center;
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
        padding: var(--spacing-1-5) var(--spacing-2);
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
        success: styles.getPropertyValue("--color-success").trim(),
        text: styles.getPropertyValue("--color-text").trim(),
        border: styles.getPropertyValue("--color-border").trim(),
        mapDirection: styles.getPropertyValue("--color-map-direction").trim(),
        mapFirstJumper: styles
            .getPropertyValue("--color-map-first-jumper")
            .trim(),
        mapLastJumper: styles
            .getPropertyValue("--color-map-last-jumper")
            .trim(),
        mapOutline: styles.getPropertyValue("--color-map-outline").trim(),
        mapDrift: styles.getPropertyValue("--color-map-drift").trim(),
        mapWind: styles.getPropertyValue("--color-map-wind").trim(),
        mapWindHalo: styles.getPropertyValue("--color-map-wind-halo").trim(),
        primary: styles.getPropertyValue("--color-primary").trim(),
        sky: styles.getPropertyValue("--color-sky").trim(),
        warning: styles.getPropertyValue("--color-warning").trim(),
        danger: styles.getPropertyValue("--color-danger").trim(),
        muted: styles.getPropertyValue("--color-muted").trim(),
        surface: styles.getPropertyValue("--color-surface").trim(),
        font: styles.getPropertyValue("--font-sans").trim(),
        fontSize: parseFloat(styles.getPropertyValue("--text-px-12")),
    };
}

// Shared layout for the cloud and wind summary readings.
export const summaryStyles = css`
    .summary-metrics {
        display: grid;
        gap: var(--spacing-3);
        margin: 0;
    }

    .summary-metrics dt {
        color: var(--color-muted);
        margin-bottom: var(--spacing-1);
    }

    .summary-metrics dd {
        margin: 0;
        font-variant-numeric: tabular-nums;
    }

    .summary-time {
        margin-top: var(--spacing-3);
        color: var(--color-muted);
    }
`;

export const settingsDialogStyles = css`
    :scope:is(dialog) {
        width: 420px;
        box-sizing: border-box;
    }
    h2 {
        margin: 0 0 var(--spacing-3-5);
    }
`;

export const cardHeadingStyles = css`
    .card-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-3);
        margin-bottom: var(--spacing-4);
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
        gap: var(--spacing-3);
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
        line-height: 1.3;
    }
    .cloud-layer-coverage,
    .cloud-base-label {
        display: block;
        color: var(--color-muted);
        margin-top: var(--spacing-1);
    }
    .cloud-layer-base {
        text-align: right;
        white-space: nowrap;
    }
    .cloud-layer-base b {
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.025em;
    }
    @media (max-width: 380px) {
        :scope {
            gap: var(--spacing-2);
            grid-template-columns: 36px minmax(0, 1fr) auto auto;
        }
        .cloud-layer-icon {
            width: 36px;
            height: 40px;
        }
    }
`;

export const manualObservationTableStyles = css`
    .manual-observation-table {
        width: 100%;
        margin-top: var(--spacing-1-5);
        border-collapse: collapse;
        table-layout: fixed;
    }
    .manual-observation-table th,
    .manual-observation-table td {
        padding: var(--spacing-1);
        border-bottom: 1px solid var(--color-border);
        text-align: start;
    }
    .manual-observation-table thead th {
        color: var(--color-muted);
    }
    .manual-observation-table th:first-child {
        width: 2.3rem;
        white-space: normal;
        text-align: center;
        font-variant-numeric: tabular-nums;
    }
    .manual-observation-table input {
        width: 100%;
        min-width: 0;
        min-height: 36px;
        padding: var(--spacing-1-5);
        box-sizing: border-box;
    }
    .manual-observation-table td > div:has(.clear-input) input {
        padding-inline-end: var(--spacing-5-5);
    }
    .manual-observation-table .clear-input {
        width: 20px;
        right: 2px;
    }
`;
