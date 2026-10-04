// @ts-check
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";
import { FreefallFields } from "./FreefallFields.js";
import { settingsDialogStyles } from "./styles.js";
import { Dialog } from "./components.js";
import { Icon } from "./icons.js";
import { css, useScope } from "./useScope.js";

export const FREEFALL_PRESETS = [
    { label: "FS", value: 180 },
    { label: "Freefly", value: 240 },
    { label: "Wingsuit", value: 80 },
];

/** @param {FreefallSettingsProps} props */
export function EditableSettings({
    exitHeight,
    openingHeight,
    speedKmh,
    onAltitudeChange,
    onSpeedChange,
    title = "Vapaapudotuksen asetukset",
    exitReadOnly = false,
    showExit = true,
}) {
    const scope = useScope(css`
        ${settingsDialogStyles}
        .presets {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 16px 0;
        }
        .presets button {
            flex: 1;
            padding: 10px;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
        .preset-speed {
            display: block;
            font-size: 0.75rem;
            font-weight: 400;
            white-space: nowrap;
        }
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
        <button
            type="button"
            class="arrow-action value-button"
            aria-label=${title}
            title=${title}
            aria-haspopup="dialog"
            onClick=${open}
        >
            ${scope.style} ${h(Icon, { name: "settings", size: 18 })}
        </button>
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
                                      Uloshyppykorkeus (m)
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
                                          <p>
                                              Uloshyppykorkeus on yhteinen
                                              kaikille hyppääjille. Muuta sitä
                                              hyppylinjan asetuksista.
                                          </p>
                                      `
                                    : null
                            }
                            <p>
                                Tuuliprofiili kattaa 800–4200 m. Avauskorkeuden
                                tulee olla uloshyppykorkeutta alempana.
                            </p>
                        `,
                    )}
                    <div class="presets">
                        ${FREEFALL_PRESETS.map(
                            (preset) => html`
                                <button
                                    type="button"
                                    onClick=${() => {
                                        setSpeedDraft(String(preset.value));
                                        onSpeedChange(preset.value);
                                    }}
                                >
                                    ${preset.label}
                                    <span class="preset-speed">
                                        ${preset.value} km/h
                                    </span>
                                </button>
                            `,
                        )}
                    </div>
                </form>
            `,
        )}
    `;
}
