// @ts-check
import { FieldHelp, FormField, NumberInput } from "#app/shared/FormFields.js";
import { DROPZONE_ELEVATION, navigateQs } from "#app/app/settings.js";
import { Dialog } from "#app/shared/Dialog.js";
import { FreefallHelp } from "#app/map/FreefallHelp.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { Icon, WindArrow } from "#app/shared/icons.js";
import { settingsDialogStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { FreefallFields } from "#app/map/FreefallFields.js";
import { SpeedPresets } from "#app/map/SpeedPresets.js";
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";

/** @param {JumpRunControlsProps} props */
export function JumpRunSettingsButton({
    settings,
    defaultJumperCount,
    jumpers,
    nextJumper,
    onNextJumperChange,
    onChange,
    onDefaultJumperCountChange,
    onJumpersChange,
    onAdd,
}) {
    const scope = useScope(css`
        ${settingsDialogStyles}
        :scope:is(dialog) {
            width: min(640px, calc(100vw - 32px));
        }
        form {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 8px;
        }
        fieldset {
            margin: 8px 0 0;
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
            line-height: 1.4;
        }
        .next-jumper > .next-jumper-help,
        .next-jumper > .presets,
        .next-jumper > .add-jumper {
            grid-column: 1 / -1;
        }
        .current-jumpers-title {
            margin: 8px 0 0;
            font-size: 0.8rem;
        }
        .direction-field,
        .next-jumper,
        .current-jumpers-title,
        .jumper-table {
            grid-column: 1 / -1;
        }
        .direction-field {
            grid-template-columns: minmax(0, 1fr);
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
            font-size: 0.8rem;
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
    return html`
        ${h(ToolbarButton, {
            label: t("settings.jumpRun"),
            icon: "settings",
            hasPopup: "dialog",
            onClick: open,
        })}
        ${h(
            Dialog,
            { dialogRef, labelledBy: titleId },
            html`
                ${scope.style}
                <h2 id=${titleId}>${t("settings.jumpRun")}</h2>
                <form
                    onSubmit=${/** @param {SubmitEvent} event */ (event) => event.preventDefault()}
                >
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-direction`,
                            label: t("settings.jumpRunDirection"),
                            className: "direction-field",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                {
                                    title: t("settings.jumpRunDirection"),
                                    wide: true,
                                },
                                html`
                                    <p>${t("settings.jumpRunDirectionHelp")}</p>
                                `,
                            ),
                        },
                        html`
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
                                        direction:
                                            (settings.direction + 180) % 360,
                                    })}
                                    <output class="direction-value">
                                        ${Math.round(settings.direction)}°
                                    </output>
                                </span>
                            </span>
                        `,
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-elevation`,
                            label: t("settings.elevation"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                { title: t("settings.elevation") },
                                html`
                                    <p>${t("settings.elevationHelp")}</p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-elevation`,
                            min: 0,
                            max: 4200,
                            step: "any",
                            value: elevationDraft,
                            onDraftChange: setElevationDraft,
                            onValueChange: (_value, input) =>
                                navigateQs(
                                    { elevation: input.value || undefined },
                                    { replace: true },
                                ),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-exit`,
                            label: t("settings.exitHeight"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                { title: t("settings.exitHeight") },
                                html`
                                    <p>${t("settings.exitExplanation")}</p>
                                    <p>${t("settings.profileRange")}</p>
                                    <p>
                                        ${t("settings.altitudeReferenceHelp")}
                                    </p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-exit`,
                            required: true,
                            min:
                                Math.max(
                                    800,
                                    nextJumper.openingHeight,
                                    ...jumpers.map(
                                        (jumper) => jumper.openingHeight,
                                    ),
                                ) + 1,
                            max: 4200 - DROPZONE_ELEVATION.value,
                            step: 1,
                            value: exitDraft,
                            onDraftChange: setExitDraft,
                            onValueChange: (value) =>
                                onChange({ ...settings, exitHeight: value }),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-speed`,
                            label: t("settings.jumpRunSpeed"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                {
                                    title: t("settings.jumpRunSpeed"),
                                    wide: true,
                                },
                                html`
                                    <p>${t("settings.speedExplanation")}</p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-speed`,
                            required: true,
                            min: 1,
                            max: 1000,
                            step: 1,
                            value: speedDraft,
                            onDraftChange: setSpeedDraft,
                            onValueChange: (value) =>
                                onChange({ ...settings, speedKmh: value }),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-interval`,
                            label: t("settings.jumperInterval"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                { title: t("settings.jumperInterval") },
                                html`
                                    <p>${t("settings.jumperIntervalHelp")}</p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-interval`,
                            required: true,
                            min: 1,
                            max: 120,
                            step: 1,
                            value: separationDraft,
                            onDraftChange: setSeparationDraft,
                            onValueChange: (value) =>
                                onChange({
                                    ...settings,
                                    separationSeconds: value,
                                }),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-count`,
                            label: t("settings.defaultJumperCount"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                { title: t("settings.defaultJumperCount") },
                                html`
                                    <p>
                                        ${t("settings.defaultJumperCountHelp")}
                                    </p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-count`,
                            min: 1,
                            max: 100,
                            step: 1,
                            value: defaultJumperCount,
                            onValueChange: onDefaultJumperCountChange,
                        }),
                    )}
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
