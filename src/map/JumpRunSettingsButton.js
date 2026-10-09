// @ts-check
import { Button } from "#app/shared/Button.js";
import { FieldHelp, FormField, NumberInput } from "#app/shared/FormFields.js";
import { DROPZONE_ELEVATION, navigateQs } from "#app/app/settings.js";
import { Dialog } from "#app/shared/Dialog.js";
import { ManualWindTable } from "#app/manual/ManualWindTable.js";
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
            gap: var(--spacing-1-5) var(--spacing-2);
        }
        fieldset {
            margin: var(--spacing-2) 0 0;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        .next-jumper {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: var(--spacing-1-5) var(--spacing-2);
        }
        .next-jumper legend {
            padding: 0 var(--spacing-1);
        }
        .next-jumper-help {
            line-height: 1.4;
        }
        .next-jumper > .next-jumper-help,
        .next-jumper > .presets,
        .next-jumper > .add-jumper {
            grid-column: 1 / -1;
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
        .canopy-glide-field,
        .wingsuit-glide-field {
            grid-column: 1;
        }
        .direction-row {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
        }
        .direction-row input {
            flex: 1;
            min-width: 0;
        }
        .direction-reading {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-1-5);
            min-width: 6ch;
            white-space: nowrap;
        }
        .direction-value {
            font-variant-numeric: tabular-nums;
        }
        .add-jumper {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-1-5);
            justify-content: center;
            min-height: 36px;
        }
        .remove-jumper {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: 0;
            background: var(--color-surface-hover);
            color: var(--color-text);
            box-shadow: none;
        }
        .jumper-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .jumper-table th,
        .jumper-table td {
            padding: var(--spacing-1);
            border-bottom: 1px solid var(--color-border);
            text-align: start;
        }
        .jumper-table thead th {
            color: var(--color-muted);
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
    const [windSession, setWindSession] = useState(0);
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
    const [wingsuitGlideDraft, setWingsuitGlideDraft] = useState(
        String(settings.wingsuitGlideRatio),
    );
    const [wingsuitDescentDraft, setWingsuitDescentDraft] = useState(
        String(Number((settings.wingsuitDescentRateMps * 3.6).toFixed(6))),
    );
    const [glideDraft, setGlideDraft] = useState(
        String(settings.canopyGlideRatio),
    );
    const [descentDraft, setDescentDraft] = useState(
        String(settings.canopyDescentRateMps),
    );
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
        setWindSession((session) => session + 1);
        setNextDraft({
            openingHeight: String(nextJumper.openingHeight),
            speedKmh: String(nextJumper.speedKmh),
        });
        setElevationDraft(String(DROPZONE_ELEVATION.value));
        setExitDraft(String(settings.exitHeight));
        setWingsuitGlideDraft(String(settings.wingsuitGlideRatio));
        setWingsuitDescentDraft(
            String(Number((settings.wingsuitDescentRateMps * 3.6).toFixed(6))),
        );
        setGlideDraft(String(settings.canopyGlideRatio));
        setDescentDraft(String(settings.canopyDescentRateMps));
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
                <h2 class="text-rem-1-15" id=${titleId}>
                    ${t("settings.jumpRun")}
                </h2>
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
                                <span class="direction-reading text-rem-0-8">
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
                                {
                                    title: t("settings.elevation"),
                                    tooltip: t("settings.elevationTooltip"),
                                },
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
                                {
                                    title: t("settings.exitHeight"),
                                    tooltip: t("settings.exitHeightTooltip"),
                                },
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
                                    tooltip: t("settings.jumpRunSpeedTooltip"),
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
                                {
                                    title: t("settings.jumperInterval"),
                                    tooltip: t(
                                        "settings.jumperIntervalTooltip",
                                    ),
                                },
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
                                {
                                    title: t("settings.defaultJumperCount"),
                                    tooltip: t(
                                        "settings.defaultJumperCountTooltip",
                                    ),
                                },
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
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-wingsuit-glide`,
                            label: t("settings.wingsuitGlideRatio"),
                            className: "setting-with-help wingsuit-glide-field",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                {
                                    title: t("settings.wingsuitGlideRatio"),
                                    tooltip: t(
                                        "settings.wingsuitGlideRatioTooltip",
                                    ),
                                    wide: true,
                                },
                                html`
                                    <p>
                                        ${t("settings.wingsuitGlideRatioHelp")}
                                    </p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-wingsuit-glide`,
                            required: true,
                            min: 0.1,
                            step: "any",
                            value: wingsuitGlideDraft,
                            onDraftChange: setWingsuitGlideDraft,
                            onValueChange: (value) =>
                                onChange({
                                    ...settings,
                                    wingsuitGlideRatio: value,
                                }),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-wingsuit-descent`,
                            label: t("settings.wingsuitDescentRate"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                {
                                    title: t("settings.wingsuitDescentRate"),
                                    tooltip: t(
                                        "settings.wingsuitDescentRateTooltip",
                                    ),
                                    wide: true,
                                },
                                html`
                                    <p>
                                        ${t("settings.wingsuitDescentRateHelp")}
                                    </p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-wingsuit-descent`,
                            required: true,
                            min: 0.1,
                            step: "any",
                            value: wingsuitDescentDraft,
                            onDraftChange: setWingsuitDescentDraft,
                            onValueChange: (value) =>
                                onChange({
                                    ...settings,
                                    wingsuitDescentRateMps: value / 3.6,
                                }),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-canopy-glide`,
                            label: t("settings.canopyGlideRatio"),
                            className: "setting-with-help canopy-glide-field",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                {
                                    title: t("settings.canopyGlideRatio"),
                                    tooltip: t(
                                        "settings.canopyGlideRatioTooltip",
                                    ),
                                    wide: true,
                                },
                                html`
                                    <p>${t("settings.canopyGlideRatioHelp")}</p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-canopy-glide`,
                            required: true,
                            min: 0.1,
                            step: "any",
                            value: glideDraft,
                            onDraftChange: setGlideDraft,
                            onValueChange: (value) =>
                                onChange({
                                    ...settings,
                                    canopyGlideRatio: value,
                                }),
                        }),
                    )}
                    ${h(
                        FormField,
                        {
                            id: `${titleId}-canopy-descent`,
                            label: t("settings.canopyDescentRate"),
                            className: "setting-with-help",
                            labelClassName: "setting-label",
                            help: h(
                                FieldHelp,
                                {
                                    title: t("settings.canopyDescentRate"),
                                    tooltip: t(
                                        "settings.canopyDescentRateTooltip",
                                    ),
                                    wide: true,
                                },
                                html`
                                    <p>
                                        ${t("settings.canopyDescentRateHelp")}
                                    </p>
                                `,
                            ),
                        },
                        h(NumberInput, {
                            id: `${titleId}-canopy-descent`,
                            required: true,
                            min: 0.1,
                            step: "any",
                            value: descentDraft,
                            onDraftChange: setDescentDraft,
                            onValueChange: (value) =>
                                onChange({
                                    ...settings,
                                    canopyDescentRateMps: value,
                                }),
                        }),
                    )}
                    <fieldset class="next-jumper px-2.5 pt-2 pb-2.5">
                        <legend class="text-rem-0-8">
                            ${t("settings.nextJumper")}
                        </legend>
                        <p class="next-jumper-help text-rem-0-7 m-0 mb-1">
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
                        ${h(
                            Button,
                            {
                                type: "button",
                                class: "add-jumper text-rem-0-8 py-1.5 px-2",
                                onClick: addJumper,
                            },
                            html`
                                ${h(Icon, { name: "plus", size: 16 })}
                                ${t("settings.addJumper")}
                            `,
                        )}
                    </fieldset>
                    ${
                        jumperDrafts.length > 0 &&
                        html`
                            <h3
                                class="current-jumpers-title text-rem-0-8 m-0 mt-2"
                            >
                                ${t("settings.currentJumpers")}
                            </h3>
                            <table
                                class="jumper-table text-rem-0-8"
                                aria-label=${t("settings.jumpers")}
                            >
                                <thead>
                                    <tr>
                                        <th
                                            class="text-rem-0-7 font-semibold"
                                            scope="col"
                                            aria-label=${t("settings.jumpers")}
                                        >
                                            #
                                        </th>
                                        <th
                                            class="text-rem-0-7 font-semibold"
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
                                            class="text-rem-0-7 font-semibold"
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
                                            class="text-rem-0-7 font-semibold"
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
                                                    ${h(
                                                        Button,
                                                        {
                                                            type: "button",
                                                            class: "remove-jumper p-0",
                                                            "aria-label": t(
                                                                "settings.removeJumper",
                                                                index + 1,
                                                            ),
                                                            "data-tooltip": t(
                                                                "settings.removeJumper",
                                                                index + 1,
                                                            ),
                                                            onClick: () =>
                                                                removeJumper(
                                                                    index,
                                                                ),
                                                        },
                                                        html`
                                                            ${h(Icon, { name: "trash", size: 16 })}
                                                        `,
                                                    )}
                                                </td>
                                            </tr>
                                        `,
                                    )}
                                </tbody>
                            </table>
                        `
                    }
                </form>
                ${h(ManualWindTable, { refreshKey: windSession, idPrefix: titleId, tableClassName: "jump-run-wind-table", explainDrift: true })}
            `,
        )}
    `;
}
