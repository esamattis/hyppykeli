// @ts-check
import { css } from "./useScope.js";

export const windStatusStyles = css`
    .ok {
        color: green;
    }

    .warning {
        color: orange;
    }

    .danger {
        color: red;
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
        padding: 2px;
        border: 1px solid #ddd;
        background-color: #f2f2f2;
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
        background-color: #f2f2f2;
    }

    .wind-table thead tr > :first-child {
        z-index: 3;
    }

    .wind-table th.past-column {
        opacity: 1;
        color: #888;
    }

    .wind-table th,
    .wind-table td {
        border: 1px solid #ddd;
        padding: 2px;
        text-align: center;
    }

    .wind-table th {
        background-color: #f2f2f2;
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
        border-left: 2px solid #333;
        border-right: 2px solid #333;
    }

    .wind-table th.current-column {
        border-top: 2px solid #333;
    }

    .wind-table tr:last-child td.current-column {
        border-bottom: 2px solid #333;
    }
`;
