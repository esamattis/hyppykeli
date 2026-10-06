// @ts-check
import { t } from "#app/translations.js";
import { h, html } from "htm/preact";
import { FreefallHelp } from "#app/map/FreefallHelp.js";
import { css, useScope } from "#app/useScope.js";
import { useId } from "preact/hooks";

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
    const id = useId();
    const scope = useScope(css`
        :scope.freefall-field {
            display: grid;
            gap: 4px;
            align-self: end;
            font-size: 0.7rem;
        }
        .field-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .field-label > label {
            display: block;
            margin: 0;
        }
        input {
            width: 100%;
            box-sizing: border-box;
        }
    `);
    /** @param {keyof JumpRunJumper} field @param {Event} event */
    const update = (field, event) => {
        const input = /** @type {HTMLInputElement} */ (event.currentTarget);
        onDraftChange(field, input.value);
        if (input.checkValidity()) onChange(field, Number(input.value));
    };
    const opening = html`
        <div class="freefall-field">
            ${scope.style}
            ${
                tableCells
                    ? null
                    : html`
                          <div class="field-label">
                              <label for=${`${id}-opening`}>
                                  ${t("settings.openingHeight")}
                              </label>
                              <span class=${scope.end}>
                                  ${h(FreefallHelp, { field: "openingHeight" })}
                              </span>
                          </div>
                      `
            }
            <input
                id=${`${id}-opening`}
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
        </div>
    `;
    const speed = html`
        <div class="freefall-field">
            ${scope.style}
            ${
                tableCells
                    ? null
                    : html`
                          <div class="field-label">
                              <label for=${`${id}-speed`}>
                                  ${t("settings.freefallSpeed")}
                              </label>
                              <span class=${scope.end}>
                                  ${h(FreefallHelp, { field: "freefallSpeed" })}
                              </span>
                          </div>
                      `
            }
            <input
                id=${`${id}-speed`}
                aria-label=${tableCells ? t("settings.freefallSpeed") : undefined}
                type="number"
                required
                min="20"
                step="20"
                value=${speedDraft}
                onInput=${/** @param {Event} event */ (event) => update("speedKmh", event)}
            />
        </div>
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
