// @ts-check
import { h, html } from "htm/preact";
import { useRef, useState } from "preact/hooks";
import { Dialog } from "./components.js";
import { Icon } from "./icons.js";
import { css, useScope } from "./useScope.js";

/** @param {FreefallValueProps} props */
function EditableValue({
    label,
    unit,
    value,
    min,
    max,
    onChange,
    presets,
    openingHeight,
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
        .actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 20px;
        }
        .cancel {
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
    `);
    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    /** @type {import('preact').RefObject<HTMLInputElement>} */
    const inputRef = useRef(null);
    const [draft, setDraft] = useState(String(value));
    const [openingDraft, setOpeningDraft] = useState(
        String(openingHeight ?? 800),
    );
    const title = openingHeight === undefined ? label : "Uloshyppy ja avaus";
    const titleId =
        openingHeight === undefined
            ? "freefall-speed-title"
            : "freefall-altitudes-title";
    const open = () => {
        setDraft(String(value));
        setOpeningDraft(String(openingHeight ?? 800));
        dialogRef.current?.showModal();
        inputRef.current?.focus();
        inputRef.current?.select();
    };
    /** @param {SubmitEvent} event */
    const save = (event) => {
        event.preventDefault();
        if (!dialogRef.current?.querySelector("form")?.reportValidity()) return;
        onChange(
            Number(draft),
            openingHeight === undefined ? undefined : Number(openingDraft),
        );
        dialogRef.current?.close();
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
            <span>
                <span class="value-label">
                    ${openingHeight === undefined ? "Nopeus" : "Uloshyppy"}
                </span>
                <strong class="value-number">${value} ${unit}</strong>
            </span>
            ${
                openingHeight !== undefined
                    ? html`
                          <span>
                              <span class="value-label">Avaus</span>
                              <strong class="value-number">
                                  ${openingHeight} m
                              </strong>
                          </span>
                      `
                    : null
            }
            ${h(Icon, { name: "pen", size: 14 })}
        </button>
        ${h(
            Dialog,
            { dialogRef, labelledBy: titleId },
            html`
                ${scope.style}
                <h2 id=${titleId}>${title}</h2>
                <form onSubmit=${save}>
                    <label>
                        ${label} (${unit})
                        <input
                            ref=${inputRef}
                            type="number"
                            required
                            min=${openingHeight === undefined ? min : Number(openingDraft) + 1}
                            max=${max}
                            step="1"
                            value=${draft}
                            onInput=${/** @param {Event} event */ (event) => setDraft(/** @type {HTMLInputElement} */ (event.currentTarget).value)}
                        />
                    </label>
                    ${
                        openingHeight !== undefined
                            ? html`
                                  <label>
                                      Avauskorkeus (m)
                                      <input
                                          type="number"
                                          required
                                          min="800"
                                          max=${Number(draft) - 1}
                                          step="1"
                                          value=${openingDraft}
                                          onInput=${/** @param {Event} event */ (event) => setOpeningDraft(/** @type {HTMLInputElement} */ (event.currentTarget).value)}
                                      />
                                  </label>
                                  <p>
                                      Tuuliprofiili kattaa 800–4200 m.
                                      Avauskorkeuden tulee olla
                                      uloshyppykorkeutta alempana.
                                  </p>
                              `
                            : null
                    }
                    ${
                        presets
                            ? html`
                                  <div class="presets">
                                      ${presets.map(
                                          (preset) => html`
                                              <button
                                                  type="button"
                                                  onClick=${() => {
                                                      setDraft(
                                                          String(preset.value),
                                                      );
                                                  }}
                                              >
                                                  ${preset.label}
                                                  <span class="preset-speed">
                                                      ${preset.value} ${unit}
                                                  </span>
                                              </button>
                                          `,
                                      )}
                                  </div>
                              `
                            : null
                    }
                    <div class="actions">
                        <button
                            type="button"
                            class="cancel"
                            onClick=${() => dialogRef.current?.close()}
                        >
                            Peruuta
                        </button>
                        <button type="submit">Tallenna</button>
                    </div>
                </form>
            `,
        )}
    `;
}

/** @param {FreefallToolbarProps} props */
export function FreefallToolbar({
    exitHeight,
    openingHeight,
    speedKmh,
    onAltitudeChange,
    onSpeedChange,
    arrowCount,
    onClear,
    onUndo,
}) {
    const scope = useScope(css`
        :scope {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 2px;
            padding: 3px 8px;
            border-bottom: 1px solid var(--color-border);
            background: var(--color-surface-soft);
        }
        .arrow-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            padding: 0;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
            font-size: 0.75rem;
        }
        .arrow-action:hover {
            background: var(--color-surface-hover);
        }
        .arrow-action:disabled {
            opacity: 0.5;
        }
        .flight-details {
            margin-left: auto;
            padding: 0 4px;
            font-size: 0.75rem;
            white-space: nowrap;
            color: var(--color-muted);
        }
    `);
    const seconds = Math.round((exitHeight - openingHeight) / (speedKmh / 3.6));
    return html`
        <div
            class="freefall-toolbar"
            role="group"
            aria-label="Vapaapudotuksen arvot"
        >
            ${scope.style}
            ${h(EditableValue, { label: "Uloshyppykorkeus", unit: "m", value: exitHeight, min: 801, max: 4200, openingHeight, onChange: (exit, opening) => onAltitudeChange(exit, opening ?? openingHeight) })}
            ${h(EditableValue, {
                label: "Vapaapudotusnopeus",
                unit: "km/h",
                value: speedKmh,
                min: 1,
                onChange: onSpeedChange,
                presets: [
                    { label: "FS", value: 180 },
                    { label: "Freefly", value: 240 },
                    { label: "Wingsuit", value: 80 },
                ],
            })}
            <button
                type="button"
                class="arrow-action undo-arrow"
                aria-label="Poista viimeisin nuoli"
                title="Poista viimeisin nuoli"
                disabled=${arrowCount === 0}
                onClick=${onUndo}
            >
                ${h(Icon, { name: "undo", size: 18 })}
            </button>
            <button
                type="button"
                class="arrow-action clear-arrows"
                aria-label="Tyhjennä nuolet"
                title="Tyhjennä nuolet"
                disabled=${arrowCount === 0}
                onClick=${onClear}
            >
                ${h(Icon, { name: "trash", size: 18 })}
            </button>
            <span class="flight-details" title="Vapaapudotuksen kesto">
                ${seconds} s
            </span>
        </div>
    `;
}
