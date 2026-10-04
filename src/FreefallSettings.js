// @ts-check
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";
import { Dialog } from "./components.js";
import { Icon } from "./icons.js";
import { css, useScope } from "./useScope.js";

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
        :scope.value-button {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 36px;
            padding: 3px 7px;
            border: 1px solid transparent;
            border-radius: 4px;
            background: transparent;
            color: var(--color-text);
            text-align: left;
            box-shadow: none;
        }
        :scope.value-button:hover {
            background: var(--color-surface-hover);
        }
        .value-label {
            display: block;
            font-size: 0.65rem;
            line-height: 1.2;
            font-weight: 400;
            color: var(--color-muted);
        }
        .value-number {
            display: block;
            font-size: 0.8rem;
            line-height: 1.3;
            font-variant-numeric: tabular-nums;
        }
        svg {
            color: var(--color-primary);
            flex-shrink: 0;
        }
        :scope:is(dialog) {
            width: 420px;
            box-sizing: border-box;
        }
        h2 {
            margin-top: 0;
        }
        label {
            display: grid;
            gap: 8px;
            margin-top: 14px;
        }
        input {
            width: 100%;
            box-sizing: border-box;
        }
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
    const presets = [
        { label: "FS", value: 180 },
        { label: "Freefly", value: 240 },
        { label: "Wingsuit", value: 80 },
    ];
    const open = () => {
        setExitDraft(String(exitHeight));
        setOpeningDraft(String(openingHeight));
        setSpeedDraft(String(speedKmh));
        dialogRef.current?.showModal();
        inputRef.current?.focus();
        inputRef.current?.select();
    };
    /** @param {"exit" | "opening" | "speed"} field @param {Event} event */
    const update = (field, event) => {
        const input = /** @type {HTMLInputElement} */ (event.currentTarget);
        const value = input.value;
        if (field === "exit") setExitDraft(value);
        else if (field === "opening") setOpeningDraft(value);
        else setSpeedDraft(value);
        if (!input.checkValidity()) return;
        if (field === "exit") onAltitudeChange(Number(value), openingHeight);
        else if (field === "opening")
            onAltitudeChange(exitHeight, Number(value));
        else onSpeedChange(Number(value));
    };
    return html`
        <button
            type="button"
            class="value-button"
            aria-label=${`Muokkaa: ${title}`}
            aria-haspopup="dialog"
            onClick=${open}
        >
            ${scope.style}
            ${
                showExit
                    ? html`
                          <span>
                              <span class="value-label">Uloshyppy</span>
                              <strong class="value-number">
                                  ${exitHeight} m
                              </strong>
                          </span>
                      `
                    : null
            }
            <span>
                <span class="value-label">Avaus</span>
                <strong class="value-number">${openingHeight} m</strong>
            </span>
            <span>
                <span class="value-label">Nopeus</span>
                <strong class="value-number">${speedKmh} km/h</strong>
            </span>
            ${h(Icon, { name: "pen", size: 14 })}
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
                                          onInput=${/** @param {Event} event */ (event) => update("exit", event)}
                                      />
                                  </label>
                              `
                            : null
                    }
                    <label>
                        Avauskorkeus (m)
                        <input
                            type="number"
                            required
                            min="800"
                            max=${exitHeight - 1}
                            step="1"
                            ref=${exitReadOnly ? inputRef : undefined}
                            value=${openingDraft}
                            onInput=${/** @param {Event} event */ (event) => update("opening", event)}
                        />
                    </label>
                    ${
                        exitReadOnly
                            ? html`
                                  <p>
                                      Uloshyppykorkeus on yhteinen kaikille
                                      hyppääjille. Muuta sitä hyppylinjan
                                      asetuksista.
                                  </p>
                              `
                            : null
                    }
                    <p>
                        Tuuliprofiili kattaa 800–4200 m. Avauskorkeuden tulee
                        olla uloshyppykorkeutta alempana.
                    </p>
                    <label>
                        Vapaapudotusnopeus (km/h)
                        <input
                            type="number"
                            required
                            min="1"
                            step="1"
                            value=${speedDraft}
                            onInput=${/** @param {Event} event */ (event) => update("speed", event)}
                        />
                    </label>
                    <div class="presets">
                        ${presets.map(
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
