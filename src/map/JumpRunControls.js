// @ts-check
import { DROPZONE_ELEVATION, navigateQs } from "#app/app/settings.js";
import { Dialog } from "#app/shared/Dialog.js";
import { DropdownMenu } from "#app/shared/DropdownMenu.js";
import { FreefallHelp } from "#app/map/FreefallHelp.js";
import { Help } from "#app/shared/Help.js";
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
    selectedWindDirection,
    onToggleDirection,
    onResetDirection,
    onAdd,
    onUndo,
    arrowCount,
    children,
}) {
    const scope = useScope(css`
        :scope.jump-run-controls {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
            gap: 4px;
            font-size: 0.8rem;
        }
        .jumper-actions {
            display: flex;
            flex-shrink: 0;
        }
        ${settingsDialogStyles}
        :scope:is(dialog) {
            width: min(640px, calc(100vw - 32px));
        }
        .setting-with-help {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 6rem;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
        }
        .setting-label {
            display: flex;
            align-items: center;
        }
        .setting-label > label {
            display: block;
            margin: 0;
        }
        @media (max-width: 480px) {
            .setting-with-help,
            form > label {
                grid-template-columns: minmax(0, 1fr);
            }
            .setting-label {
                justify-content: space-between;
            }
        }
        fieldset {
            margin-top: 14px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        .next-jumper {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 8px;
            padding: 8px 10px 10px;
        }
        .next-jumper legend {
            padding: 0 4px;
            font-size: 0.8rem;
        }
        .next-jumper-help {
            margin: 0 0 4px;
            font-size: 0.7rem;
        }
        .next-jumper > .next-jumper-help,
        .next-jumper > .presets,
        .next-jumper > .add-jumper {
            grid-column: 1 / -1;
        }
        .current-jumpers-title {
            margin: 14px 0 4px;
            font-size: 0.8rem;
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
        .add-jumper {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            justify-content: center;
            min-height: 36px;
            padding: 6px 8px;
            font-size: 0.8rem;
        }
        .remove-jumper {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            padding: 0;
            border: 0;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
        .jumper-table {
            width: 100%;
            margin-top: 14px;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 0.8rem;
        }
        .jumper-table th,
        .jumper-table td {
            padding: 4px;
            border-bottom: 1px solid var(--color-border);
            text-align: start;
        }
        .jumper-table thead th {
            color: var(--color-muted);
            font-size: 0.7rem;
            font-weight: 600;
        }
        .jumper-table tr > :first-child {
            width: 3ch;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }
        .jumper-table tr > :last-child {
            width: 36px;
            text-align: end;
        }
        .jumper-table label {
            display: block;
            margin: 0;
        }
    `);
    const titleId = useId();
    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    const [speedDraft, setSpeedDraft] = useState(String(settings.speedKmh));
    const [separationDraft, setSeparationDraft] = useState(
        String(settings.separationSeconds),
    );
    const [elevationDraft, setElevationDraft] = useState(
        String(DROPZONE_ELEVATION.value),
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
        setElevationDraft(String(DROPZONE_ELEVATION.value));
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
                label: t("toolbar.positionJumpRun"),
                icon: "location",
                disabled: !canPosition,
                onClick: onPosition,
            })}
            ${h(DropdownMenu, {
                id: "jump-run-direction-menu",
                label: t("settings.jumpRunDirection"),
                icon: "heading",
                size: 24,
                pressed: directionActive,
                items: [
                    {
                        label: t("settings.setJumpRunDirection"),
                        icon: "heading",
                        size: 20,
                        pressed: directionActive,
                        disabled: !canAim,
                        onSelect: onToggleDirection,
                    },
                    {
                        label: t("settings.turnJumpRunIntoWind"),
                        icon: "wind",
                        disabled: !canAim || selectedWindDirection === null,
                        onSelect: () => {
                            if (selectedWindDirection === null) return;
                            onChange({
                                ...settings,
                                direction: selectedWindDirection,
                            });
                        },
                    },
                    {
                        label: t("settings.rotateJumpRunCounterclockwise"),
                        icon: "rotateCounterclockwise",
                        size: 20,
                        disabled: !canAim,
                        onSelect: () =>
                            onChange({
                                ...settings,
                                direction: (settings.direction + 270) % 360,
                            }),
                    },
                    {
                        label: t("settings.rotateJumpRunClockwise"),
                        icon: "rotateClockwise",
                        size: 20,
                        disabled: !canAim,
                        onSelect: () =>
                            onChange({
                                ...settings,
                                direction: (settings.direction + 90) % 360,
                            }),
                    },
                    {
                        label: t("settings.resetJumpRunDirection"),
                        icon: "undo",
                        disabled: !canAim,
                        onSelect: onResetDirection,
                    },
                ],
            })}
            <div
                class="jumper-actions"
                role="group"
                aria-label=${t("settings.jumpers")}
            >
                ${h(ToolbarButton, {
                    label: t("settings.addJumper"),
                    icon: "plus",
                    onClick: onAdd,
                })}
                ${h(ToolbarButton, {
                    label: t("toolbar.removeJumper"),
                    icon: "minus",
                    className: "undo-arrow",
                    disabled: arrowCount === 0,
                    onClick: onUndo,
                })}
            </div>
            ${h(ToolbarButton, {
                label: t("settings.jumpRun"),
                icon: "settings",
                hasPopup: "dialog",
                onClick: open,
            })}
            ${children}
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
                    <div class="direction-field">
                        <div class="setting-label">
                            <label for=${`${titleId}-direction`}>
                                ${t("settings.jumpRunDirection")}
                            </label>
                            <span class=${scope.end}>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("settings.jumpRunDirection")}: ${t("common.help")}`,
                                        wide: true,
                                    },
                                    html`
                                        <h3>
                                            ${t("settings.jumpRunDirection")}
                                        </h3>
                                        <p>
                                            ${t("settings.jumpRunDirectionHelp")}
                                        </p>
                                    `,
                                )}
                            </span>
                        </div>
                        <span class="direction-row">
                            <input
                                type="range"
                                id=${`${titleId}-direction`}
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
                                    // WindArrow takes the origin; jump run direction is the ground track.
                                    direction: (settings.direction + 180) % 360,
                                })}
                                <output class="direction-value">
                                    ${Math.round(settings.direction)}°
                                </output>
                            </span>
                        </span>
                    </div>
                    <div class="setting-with-help">
                        <div class="setting-label">
                            <label for=${`${titleId}-elevation`}>
                                ${t("settings.elevation")}
                            </label>
                            <div class=${scope.end}>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("settings.elevation")}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>${t("settings.elevation")}</h3>
                                        <p>${t("settings.elevationHelp")}</p>
                                    `,
                                )}
                            </div>
                        </div>
                        <input
                            id=${`${titleId}-elevation`}
                            type="number"
                            min="0"
                            max="4200"
                            step="any"
                            value=${elevationDraft}
                            onInput=${
                                /** @param {Event} event */ (event) => {
                                    const input =
                                        /** @type {HTMLInputElement} */ (
                                            event.currentTarget
                                        );
                                    setElevationDraft(input.value);
                                    if (input.checkValidity())
                                        navigateQs(
                                            {
                                                elevation:
                                                    input.value || undefined,
                                            },
                                            { replace: true },
                                        );
                                }
                            }
                        />
                    </div>
                    <div class="setting-with-help">
                        <div class="setting-label">
                            <label for=${`${titleId}-exit`}>
                                ${t("settings.exitHeight")}
                            </label>
                            <div class=${scope.end}>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("settings.exitHeight")}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>${t("settings.exitHeight")}</h3>
                                        <p>${t("settings.exitExplanation")}</p>
                                        <p>${t("settings.profileRange")}</p>
                                        <p>
                                            ${t("settings.altitudeReferenceHelp")}
                                        </p>
                                    `,
                                )}
                            </div>
                        </div>
                        <input
                            id=${`${titleId}-exit`}
                            type="number"
                            required
                            min=${Math.max(800, nextJumper.openingHeight, ...jumpers.map((jumper) => jumper.openingHeight)) + 1}
                            max=${4200 - DROPZONE_ELEVATION.value}
                            step="1"
                            value=${exitDraft}
                            onInput=${/** @param {Event} event */ (event) => updateSettings("exitHeight", event)}
                        />
                    </div>
                    <div class="setting-with-help">
                        <div class="setting-label">
                            <label for=${`${titleId}-speed`}>
                                ${t("settings.jumpRunSpeed")}
                            </label>
                            <div class=${scope.end}>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("settings.jumpRunSpeed")}: ${t("common.help")}`,
                                        wide: true,
                                    },
                                    html`
                                        <h3>${t("settings.jumpRunSpeed")}</h3>
                                        <p>${t("settings.speedExplanation")}</p>
                                    `,
                                )}
                            </div>
                        </div>
                        <input
                            id=${`${titleId}-speed`}
                            type="number"
                            required
                            min="1"
                            max="1000"
                            step="1"
                            value=${speedDraft}
                            onInput=${/** @param {Event} event */ (event) => updateSettings("speedKmh", event)}
                        />
                    </div>
                    <div class="setting-with-help">
                        <div class="setting-label">
                            <label for=${`${titleId}-interval`}>
                                ${t("settings.jumperInterval")}
                            </label>
                            <div class=${scope.end}>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("settings.jumperInterval")}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>${t("settings.jumperInterval")}</h3>
                                        <p>
                                            ${t("settings.jumperIntervalHelp")}
                                        </p>
                                    `,
                                )}
                            </div>
                        </div>
                        <input
                            id=${`${titleId}-interval`}
                            type="number"
                            required
                            min="1"
                            max="120"
                            step="1"
                            value=${separationDraft}
                            onInput=${/** @param {Event} event */ (event) => updateSettings("separationSeconds", event)}
                        />
                    </div>
                    <div class="setting-with-help">
                        <div class="setting-label">
                            <label for=${`${titleId}-count`}>
                                ${t("settings.defaultJumperCount")}
                            </label>
                            <div class=${scope.end}>
                                ${h(
                                    Help,
                                    {
                                        label: `${t("settings.defaultJumperCount")}: ${t("common.help")}`,
                                    },
                                    html`
                                        <h3>
                                            ${t("settings.defaultJumperCount")}
                                        </h3>
                                        <p>
                                            ${t("settings.defaultJumperCountHelp")}
                                        </p>
                                    `,
                                )}
                            </div>
                        </div>
                        <input
                            id=${`${titleId}-count`}
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
                    </div>
                    <fieldset class="next-jumper">
                        <legend>${t("settings.nextJumper")}</legend>
                        <p class="next-jumper-help">
                            ${t("settings.nextJumperHelp")}
                        </p>
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
                    ${
                        jumperDrafts.length > 0 &&
                        html`
                            <h3 class="current-jumpers-title">
                                ${t("settings.currentJumpers")}
                            </h3>
                            <table
                                class="jumper-table"
                                aria-label=${t("settings.jumpers")}
                            >
                                <thead>
                                    <tr>
                                        <th
                                            scope="col"
                                            aria-label=${t("settings.jumpers")}
                                        >
                                            #
                                        </th>
                                        <th
                                            scope="col"
                                            tabindex="0"
                                            data-tooltip=${t("settings.freefallSpeed")}
                                        >
                                            ${t("toolbar.speed")} (km/h)
                                            <span class=${scope.end}>
                                                ${h(FreefallHelp, { field: "freefallSpeed" })}
                                            </span>
                                        </th>
                                        <th
                                            scope="col"
                                            tabindex="0"
                                            data-tooltip=${t("settings.openingHeight")}
                                        >
                                            ${t("toolbar.opening")} (m)
                                            <span class=${scope.end}>
                                                ${h(FreefallHelp, { field: "openingHeight" })}
                                            </span>
                                        </th>
                                        <th
                                            scope="col"
                                            aria-label=${t("common.remove")}
                                        ></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${jumperDrafts.map(
                                        (jumper, index) => html`
                                            <tr
                                                aria-label=${t("settings.jumper", index + 1)}
                                            >
                                                <th scope="row">
                                                    ${index + 1}
                                                </th>
                                                ${h(FreefallFields, {
                                                    exitHeight:
                                                        settings.exitHeight,
                                                    openingDraft:
                                                        jumper.openingHeight,
                                                    speedDraft: jumper.speedKmh,
                                                    tableCells: true,
                                                    onDraftChange: (
                                                        key,
                                                        value,
                                                    ) =>
                                                        setJumperDrafts(
                                                            (drafts) =>
                                                                drafts.map(
                                                                    (
                                                                        draft,
                                                                        i,
                                                                    ) =>
                                                                        i ===
                                                                        index
                                                                            ? {
                                                                                  ...draft,
                                                                                  [key]: value,
                                                                              }
                                                                            : draft,
                                                                ),
                                                        ),
                                                    onChange: (key, value) =>
                                                        updateJumper(
                                                            index,
                                                            key,
                                                            value,
                                                        ),
                                                })}
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="remove-jumper"
                                                        aria-label=${t("settings.removeJumper", index + 1)}
                                                        data-tooltip=${t("settings.removeJumper", index + 1)}
                                                        onClick=${() => removeJumper(index)}
                                                    >
                                                        ${h(Icon, { name: "trash", size: 16 })}
                                                    </button>
                                                </td>
                                            </tr>
                                        `,
                                    )}
                                </tbody>
                            </table>
                        `
                    }
                </form>
            `,
        )}
    `;
}
