// @ts-check
import {
    completeDropzones,
    dropzoneHref,
    partialDropzones,
} from "#app/dropzones.js";
import { DropzoneCoordinateMap } from "#app/landing/DropzoneCoordinateMap.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

/** @param {{ dropzones: LandingDropzone[] }} props */
function DropzoneList({ dropzones }) {
    const scope = useScope(css`
        :scope p {
            background: var(--color-surface-soft);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
    `);
    return html`
        <div class="dz-list">
            ${scope.style}
            ${[...dropzones]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                    (dz) => html`
                        <p class="py-3 px-4 my-2 mx-0" key=${dz.name}>
                            <a class="text-em-1-2" href=${dropzoneHref(dz)}>
                                ${dz.name}
                            </a>
                            ${" "}${typeof dz.description === "function" ? dz.description() : dz.description}
                        </p>
                    `,
                )}
        </div>
    `;
}

/** @param {{ onSelect: (lat: string, lon: string) => void }} props */
export function Dropzones({ onSelect }) {
    return html`
        <h2>${t("landing.dropzones")}</h2>
        <p class="mt-0 text-em-0-8">${t("landing.mapHelp")}</p>
        ${h(DropzoneCoordinateMap, { onSelect })}
        <p>${t("landing.complete")}</p>
        ${h(DropzoneList, { dropzones: completeDropzones })}
        <p>${t("landing.partial")}</p>
        ${h(DropzoneList, { dropzones: partialDropzones })}
    `;
}
