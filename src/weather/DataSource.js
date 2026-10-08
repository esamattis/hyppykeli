// @ts-check
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";

/** @param {DataSourceProps} props */
export function DataSource({ sources = [], children, plural = false }) {
    const scope = useScope(css`
        :scope {
            display: block;
            color: var(--color-muted);
        }
    `);
    const unique = sources.filter(
        (source, index) => source && sources.indexOf(source) === index,
    );
    if (!unique.length && !children) return null;

    return html`
        <small class="source-note text-rem-0-7 font-normal italic">
            ${scope.style}
            ${t(plural ? "common.sources" : "common.source")}:${" "}
            ${children ?? unique.join(", ")}
        </small>
    `;
}
