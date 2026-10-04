// @ts-check
import { completeDropzones, partialDropzones } from "../dropzones.js";
import { t } from "../translations.js";
import { css, useScope } from "../useScope.js";
import { h, html } from "htm/preact";

/** @param {{ dropzones: LandingDropzone[] }} props */
function DropzoneList({ dropzones }) {
    const scope = useScope(css`
        :scope p {
            padding: 12px 16px;
            margin: 8px 0;
            background: var(--color-surface-soft);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        :scope a {
            font-size: 120%;
        }
    `);
    return html`
        <div class="dz-list">
            ${scope.style}
            ${[...dropzones]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                    (dz) => html`
                        <p key=${dz.name}>
                            <a href=${dz.href}>${dz.name}</a>
                            ${" "}${typeof dz.description === "function" ? dz.description() : dz.description}
                        </p>
                    `,
                )}
        </div>
    `;
}

export function Dropzones() {
    return html`
        <h2>${t("landing.dropzones")}</h2>
        <p>${t("landing.complete")}</p>
        ${h(DropzoneList, { dropzones: completeDropzones })}
        <p>${t("landing.partial")}</p>
        ${h(DropzoneList, { dropzones: partialDropzones })}
    `;
}
