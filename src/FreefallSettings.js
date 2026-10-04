// @ts-check
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";
import { FreefallFields } from "./FreefallFields.js";
import { settingsDialogStyles } from "./styles.js";
import { Dialog } from "./components.js";
import { SpeedPresets } from "./SpeedPresets.js";
import { ToolbarButton } from "./ToolbarButton.js";
import { css, useScope } from "./useScope.js";
import { t } from "./translations.js";

/** @param {FreefallSettingsProps} props */
export function EditableSettings({
    exitHeight,
    openingHeight,
    speedKmh,
    onAltitudeChange,
    onSpeedChange,
    title = t("settings.freefall"),
    exitReadOnly = false,
    showExit = true,
}) {
    const scope = useScope(css`
        ${settingsDialogStyles}
    `);
    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    /** @type {import('preact').RefObject<HTMLInputElement>} */
    const inputRef = useRef(null);
    const [exitDraft, setExitDraft] = useState(String(exitHeight));
    const [openingDraft, setOpeningDraft] = useState(String(openingHeight));
    const [speedDraft, setSpeedDraft] = useState(String(speedKmh));
    const titleId = useId();
    const open = () => {
        setExitDraft(String(exitHeight));
        setOpeningDraft(String(openingHeight));
        setSpeedDraft(String(speedKmh));
        dialogRef.current?.showModal();
        inputRef.current?.focus();
        inputRef.current?.select();
    };
    /** @param {Event} event */
    const updateExit = (event) => {
        const input = /** @type {HTMLInputElement} */ (event.currentTarget);
        setExitDraft(input.value);
        if (input.checkValidity())
            onAltitudeChange(Number(input.value), openingHeight);
    };
    return html`
        ${h(ToolbarButton, {
            label: title,
            icon: "settings",
            className: "value-button",
            hasPopup: "dialog",
            onClick: open,
        })}
        ${h(
            Dialog,
            { dialogRef, labelledBy: titleId },
            html`
                ${scope.style}
                <h2 id=${titleId}>${title}</h2>
                <form
                    onSubmit=${/** @param {SubmitEvent} event */ (event) => event.preventDefault()}
                >
                    ${
                        showExit
                            ? html`
                                  <label>
                                      ${t("settings.exitHeight")}
                                      <input
                                          ref=${!exitReadOnly ? inputRef : undefined}
                                          readonly=${exitReadOnly}
                                          type="number"
                                          required
                                          min=${openingHeight + 1}
                                          max="4200"
                                          step="1"
                                          value=${exitDraft}
                                          onInput=${updateExit}
                                      />
                                  </label>
                              `
                            : null
                    }
                    ${h(
                        FreefallFields,
                        {
                            exitHeight,
                            openingDraft,
                            speedDraft,
                            openingRef: exitReadOnly ? inputRef : undefined,
                            onDraftChange: (field, value) => {
                                if (field === "openingHeight")
                                    setOpeningDraft(value);
                                else setSpeedDraft(value);
                            },
                            onChange: (field, value) => {
                                if (field === "openingHeight")
                                    onAltitudeChange(exitHeight, value);
                                else onSpeedChange(value);
                            },
                        },
                        html`
                            ${
                                exitReadOnly
                                    ? html`
                                          <p>${t("settings.exitSharedHelp")}</p>
                                      `
                                    : null
                            }
                            <p>${t("settings.openingRange")}</p>
                        `,
                    )}
                    ${h(SpeedPresets, {
                        onSelect: (speedKmh) => {
                            setSpeedDraft(String(speedKmh));
                            onSpeedChange(speedKmh);
                        },
                    })}
                </form>
            `,
        )}
    `;
}
