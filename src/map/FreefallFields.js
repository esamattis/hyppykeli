// @ts-check
import { t } from "#app/translations.js";
import { html } from "htm/preact";

/** Shared opening-height and freefall-speed inputs; parents own their drafts.
 * @param {FreefallFieldsProps} props
 */
export function FreefallFields({
    exitHeight,
    openingDraft,
    speedDraft,
    openingRef,
    tableCells = false,
    onDraftChange,
    onChange,
    children,
}) {
    /** @param {keyof JumpRunJumper} field @param {Event} event */
    const update = (field, event) => {
        const input = /** @type {HTMLInputElement} */ (event.currentTarget);
        onDraftChange(field, input.value);
        if (input.checkValidity()) onChange(field, Number(input.value));
    };
    const opening = html`
        <label>
            ${tableCells ? null : t("settings.openingHeight")}
            <input
                aria-label=${tableCells ? t("settings.openingHeight") : undefined}
                type="number"
                required
                min="800"
                max=${exitHeight - 1}
                step="100"
                ref=${openingRef}
                value=${openingDraft}
                onInput=${/** @param {Event} event */ (event) => update("openingHeight", event)}
            />
        </label>
    `;
    const speed = html`
        <label>
            ${tableCells ? null : t("settings.freefallSpeed")}
            <input
                aria-label=${tableCells ? t("settings.freefallSpeed") : undefined}
                type="number"
                required
                min="20"
                step="20"
                value=${speedDraft}
                onInput=${/** @param {Event} event */ (event) => update("speedKmh", event)}
            />
        </label>
    `;
    if (tableCells)
        return html`
            <td>${speed}</td>
            <td>${opening}</td>
        `;
    return html`
        ${opening}${children}${speed}
    `;
}
