// @ts-check
import { html } from "htm/preact";
import { css, useScope } from "./useScope.js";
import { t } from "./translations.js";

/** @param {DataSourceProps} props */
export function DataSource({ sources = [], children, plural = false }) {
    const scope = useScope(css`
        :scope {
            display: block;
            color: var(--color-muted);
            font-size: 0.7rem;
            font-style: italic;
            font-weight: normal;
        }
    `);
    const unique = sources.filter(
        (source, index) => source && sources.indexOf(source) === index,
    );
    if (!unique.length && !children) return null;

    return html`
        <small class="source-note">
            ${scope.style}
            ${t(plural ? "common.sources" : "common.source")}:${" "}
            ${children ?? unique.join(", ")}
        </small>
    `;
}
