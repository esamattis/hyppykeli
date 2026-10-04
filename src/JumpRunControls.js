// @ts-check
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";
import { FreefallFields } from "./FreefallFields.js";
import { settingsDialogStyles } from "./styles.js";
import { SpeedPresets } from "./SpeedPresets.js";
import { ToolbarButton } from "./ToolbarButton.js";
import { Dialog } from "./components.js";
import { Icon } from "./icons.js";
import { css, useScope } from "./useScope.js";

/** @param {JumpRunControlsProps} props */
export function JumpRunControls({
    settings,
    jumpers,
    nextJumper,
    onNextJumperChange,
    onChange,
    onJumpersChange,
    onAdd,
}) {
    const scope = useScope(css`
        :scope.jump-run-controls {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            font-size: 0.8rem;
        }
        ${settingsDialogStyles}
        fieldset {
            margin-top: 20px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        .remove-jumper {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 14px;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
    `);
    const titleId = useId();
    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    const [speedDraft, setSpeedDraft] = useState(String(settings.speedKmh));
    const [separationDraft, setSeparationDraft] = useState(
        String(settings.separationSeconds),
    );
    const [exitDraft, setExitDraft] = useState(String(settings.exitHeight));
    const [nextDraft, setNextDraft] = useState({
        openingHeight: String(nextJumper.openingHeight),
        speedKmh: String(nextJumper.speedKmh),
    });
    const [jumperDrafts, setJumperDrafts] = useState(
        /** @type {JumpRunJumperDraft[]} */ ([]),
    );
    /** @param {number} index @param {keyof JumpRunJumper} key @param {number} value */
    const updateJumper = (index, key, value) => {
        onJumpersChange(
            jumpers.map((jumper, i) =>
                i === index ? { ...jumper, [key]: value } : jumper,
            ),
        );
    };
    /** @param {number} index */
    const removeJumper = (index) => {
        setJumperDrafts((drafts) => drafts.filter((_, i) => i !== index));
        onJumpersChange(jumpers.filter((_, i) => i !== index));
    };
    const open = () => {
        setNextDraft({
            openingHeight: String(nextJumper.openingHeight),
            speedKmh: String(nextJumper.speedKmh),
        });
        setExitDraft(String(settings.exitHeight));
        setJumperDrafts(
            jumpers.map((jumper) => ({
                speedKmh: String(jumper.speedKmh),
                openingHeight: String(jumper.openingHeight),
            })),
        );
        setSpeedDraft(String(settings.speedKmh));
        setSeparationDraft(String(settings.separationSeconds));
        dialogRef.current?.showModal();
    };
    /** @param {"speedKmh" | "separationSeconds" | "exitHeight"} key @param {Event} event */
    const updateSettings = (key, event) => {
        const input = /** @type {HTMLInputElement} */ (event.currentTarget);
        const value = input.value;
        if (key === "speedKmh") setSpeedDraft(value);
        else if (key === "separationSeconds") setSeparationDraft(value);
        else setExitDraft(value);
        if (input.checkValidity())
            onChange({ ...settings, [key]: Number(value) });
    };
    return html`
        <div class="jump-run-controls">
            ${scope.style}
            ${h(ToolbarButton, {
                label: "Hyppylinjan asetukset",
                icon: "settings",
                hasPopup: "dialog",
                onClick: open,
            })}
            ${h(ToolbarButton, {
                label: "Lisää hyppääjä",
                icon: "plus",
                onClick: onAdd,
            })}
        </div>
        ${h(
            Dialog,
            { dialogRef, labelledBy: titleId },
            html`
                ${scope.style}
                <h2 id=${titleId}>Hyppylinjan asetukset</h2>
                <form
                    onSubmit=${/** @param {SubmitEvent} event */ (event) => event.preventDefault()}
                >
                    <label>
                        Uloshyppykorkeus (m)
                        <input
                            type="number"
                            required
                            min=${Math.max(800, nextJumper.openingHeight, ...jumpers.map((jumper) => jumper.openingHeight)) + 1}
                            max="4200"
                            step="1"
                            value=${exitDraft}
                            onInput=${/** @param {Event} event */ (event) => updateSettings("exitHeight", event)}
                        />
                    </label>
                    <label>
                        Hyppylinjan nopeus (km/h)
                        <input
                            type="number"
                            required
                            min="1"
                            max="1000"
                            step="1"
                            value=${speedDraft}
                            onInput=${/** @param {Event} event */ (event) => updateSettings("speedKmh", event)}
                        />
                    </label>
                    <label>
                        Hyppääjien väli (s)
                        <input
                            type="number"
                            required
                            min="1"
                            max="120"
                            step="1"
                            value=${separationDraft}
                            onInput=${/** @param {Event} event */ (event) => updateSettings("separationSeconds", event)}
                        />
                    </label>
                    <p>
                        Nopeus on maanopeus. Hyppääjien välimatka lasketaan
                        nopeudesta ja uloshyppyjen välisestä ajasta.
                    </p>
                    <p>
                        Uloshyppykorkeus on yhteinen kaikille hyppääjille.
                        Tuuliprofiili kattaa 800–4200 m.
                    </p>
                    <fieldset>
                        <legend>Lisättävän hyppääjän asetukset</legend>
                        ${h(FreefallFields, {
                            exitHeight: settings.exitHeight,
                            openingDraft: nextDraft.openingHeight,
                            speedDraft: nextDraft.speedKmh,
                            onDraftChange: (key, value) =>
                                setNextDraft((current) => ({
                                    ...current,
                                    [key]: value,
                                })),
                            onChange: (key, value) =>
                                onNextJumperChange((current) => ({
                                    ...current,
                                    [key]: value,
                                })),
                        })}
                        ${h(SpeedPresets, {
                            onSelect: (speedKmh) => {
                                setNextDraft((current) => ({
                                    ...current,
                                    speedKmh: String(speedKmh),
                                }));
                                onNextJumperChange((current) => ({
                                    ...current,
                                    speedKmh,
                                }));
                            },
                        })}
                    </fieldset>
                    ${jumperDrafts.map(
                        (jumper, index) => html`
                            <fieldset>
                                <legend>Hyppääjä ${index + 1}</legend>
                                ${h(FreefallFields, {
                                    exitHeight: settings.exitHeight,
                                    openingDraft: jumper.openingHeight,
                                    speedDraft: jumper.speedKmh,
                                    speedFirst: true,
                                    onDraftChange: (key, value) =>
                                        setJumperDrafts((drafts) =>
                                            drafts.map((draft, i) =>
                                                i === index
                                                    ? { ...draft, [key]: value }
                                                    : draft,
                                            ),
                                        ),
                                    onChange: (key, value) =>
                                        updateJumper(index, key, value),
                                })}
                                <button
                                    type="button"
                                    class="remove-jumper"
                                    aria-label=${`Poista hyppääjä ${index + 1}`}
                                    onClick=${() => removeJumper(index)}
                                >
                                    ${h(Icon, { name: "trash", size: 16 })}
                                    Poista
                                </button>
                            </fieldset>
                        `,
                    )}
                </form>
            `,
        )}
    `;
}
