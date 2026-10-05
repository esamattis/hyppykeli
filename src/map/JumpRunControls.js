// @ts-check
import { Dialog } from "#app/shared/Dialog.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { Icon, WindArrow } from "#app/shared/icons.js";
import { settingsDialogStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { FreefallFields } from "#app/map/FreefallFields.js";
import { SpeedPresets } from "#app/map/SpeedPresets.js";
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";

/** @param {JumpRunPositionControlsProps} props */
export function JumpRunControls({
    settings,
    canPosition,
    onPosition,
    defaultJumperCount,
    jumpers,
    nextJumper,
    onNextJumperChange,
    onChange,
    onDefaultJumperCountChange,
    onJumpersChange,
    directionActive,
    canAim,
    onToggleDirection,
    onAdd,
}) {
    const scope = useScope(css`
        :scope.jump-run-controls {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
            gap: 4px;
            font-size: 0.8rem;
        }
        ${settingsDialogStyles}
        .direction-toggle[aria-pressed="true"] {
            background: var(--color-surface-hover);
        }
        fieldset {
            margin-top: 14px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        .direction-field {
            grid-template-columns: minmax(0, 1fr);
            gap: 4px;
        }
        .direction-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .direction-row input {
            flex: 1;
            min-width: 0;
        }
        .direction-reading {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-width: 6ch;
            white-space: nowrap;
        }
        .direction-value {
            font-variant-numeric: tabular-nums;
        }
        .add-jumper,
        .remove-jumper {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 14px;
        }
        .remove-jumper {
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
    const addJumper = () => {
        setJumperDrafts((drafts) => [
            ...drafts,
            {
                openingHeight: String(nextJumper.openingHeight),
                speedKmh: String(nextJumper.speedKmh),
            },
        ]);
        onAdd();
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
                label: t("settings.jumpRun"),
                icon: "settings",
                hasPopup: "dialog",
                onClick: open,
            })}
            ${h(ToolbarButton, {
                label: t("toolbar.positionJumpRun"),
                icon: "location",
                disabled: !canPosition,
                onClick: onPosition,
            })}
            ${h(ToolbarButton, {
                label: t("settings.setJumpRunDirection"),
                icon: "heading",
                size: 24,
                className: "direction-toggle",
                pressed: directionActive,
                disabled: !canAim,
                onClick: onToggleDirection,
            })}
            ${h(ToolbarButton, {
                label: t("settings.rotateJumpRunCounterclockwise"),
                icon: "rotateCounterclockwise",
                size: 24,
                disabled: !canAim,
                onClick: () =>
                    onChange({
                        ...settings,
                        direction: (settings.direction + 270) % 360,
                    }),
            })}
            ${h(ToolbarButton, {
                label: t("settings.rotateJumpRunClockwise"),
                icon: "rotateClockwise",
                size: 24,
                disabled: !canAim,
                onClick: () =>
                    onChange({
                        ...settings,
                        direction: (settings.direction + 90) % 360,
                    }),
            })}
            ${h(ToolbarButton, {
                label: t("settings.addJumper"),
                icon: "plus",
                onClick: onAdd,
            })}
        </div>
        ${h(
            Dialog,
            { dialogRef, labelledBy: titleId },
            html`
                ${scope.style}
                <h2 id=${titleId}>${t("settings.jumpRun")}</h2>
                <form
                    onSubmit=${/** @param {SubmitEvent} event */ (event) => event.preventDefault()}
                >
                    <label class="direction-field">
                        ${t("settings.jumpRunDirection")}
                        <span class="direction-row">
                            <input
                                type="range"
                                aria-label=${t("settings.jumpRunDirection")}
                                min="0"
                                max="360"
                                step="1"
                                value=${settings.direction}
                                onInput=${
                                    /** @param {Event} event */ (event) =>
                                        onChange({
                                            ...settings,
                                            direction: Number(
                                                /** @type {HTMLInputElement} */ (
                                                    event.currentTarget
                                                ).value,
                                            ),
                                        })
                                }
                            />
                            <span class="direction-reading">
                                ${h(WindArrow, {
                                    // WindArrow takes the origin; jump run direction is the heading.
                                    direction: (settings.direction + 180) % 360,
                                })}
                                <output class="direction-value">
                                    ${Math.round(settings.direction)}°
                                </output>
                            </span>
                        </span>
                    </label>
                    <label>
                        ${t("settings.defaultJumperCount")}
                        <input
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value=${defaultJumperCount}
                            onInput=${
                                /** @param {Event} event */ (event) => {
                                    const input =
                                        /** @type {HTMLInputElement} */ (
                                            event.currentTarget
                                        );
                                    if (input.checkValidity())
                                        onDefaultJumperCountChange(
                                            Number(input.value),
                                        );
                                }
                            }
                        />
                    </label>
                    <label>
                        ${t("settings.exitHeight")}
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
                        ${t("settings.jumpRunSpeed")}
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
                        ${t("settings.jumperInterval")}
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
                    <p>${t("settings.speedExplanation")}</p>
                    <p>
                        ${t("settings.exitExplanation")}
                        ${t("settings.profileRange")}
                    </p>
                    <fieldset>
                        <legend>${t("settings.nextJumper")}</legend>
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
                        <button
                            type="button"
                            class="add-jumper"
                            onClick=${addJumper}
                        >
                            ${h(Icon, { name: "plus", size: 16 })}
                            ${t("settings.addJumper")}
                        </button>
                    </fieldset>
                    ${jumperDrafts.map(
                        (jumper, index) => html`
                            <fieldset>
                                <legend>
                                    ${t("settings.jumper", index + 1)}
                                </legend>
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
                                    aria-label=${t("settings.removeJumper", index + 1)}
                                    onClick=${() => removeJumper(index)}
                                >
                                    ${h(Icon, { name: "trash", size: 16 })}
                                    ${t("common.remove")}
                                </button>
                            </fieldset>
                        `,
                    )}
                </form>
            `,
        )}
    `;
}
