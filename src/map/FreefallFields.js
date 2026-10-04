// @ts-check
import { t } from "../translations.js";
import { html } from "htm/preact";

/** Shared opening-height and freefall-speed inputs; parents own their drafts.
 * @param {FreefallFieldsProps} props
 */
export function FreefallFields({
    exitHeight,
    openingDraft,
    speedDraft,
    openingRef,
    speedFirst = false,
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
            ${t("settings.openingHeight")}
            <input
                type="number"
                required
                min="800"
                max=${exitHeight - 1}
                step="1"
                ref=${openingRef}
                value=${openingDraft}
                onInput=${/** @param {Event} event */ (event) => update("openingHeight", event)}
            />
        </label>
    `;
    const speed = html`
        <label>
            ${t("settings.freefallSpeed")}
            <input
                type="number"
                required
                min="1"
                step="1"
                value=${speedDraft}
                onInput=${/** @param {Event} event */ (event) => update("speedKmh", event)}
            />
        </label>
    `;
    return speedFirst
        ? html`
              ${speed}${opening}
          `
        : html`
              ${opening}${children}${speed}
          `;
}
