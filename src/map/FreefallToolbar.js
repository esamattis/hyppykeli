// @ts-check
import { Button } from "#app/shared/Button.js";
import { Help } from "#app/shared/Help.js";
import { Dialog } from "#app/shared/Dialog.js";
import { CheckboxField } from "#app/shared/FormFields.js";
import { WindBarb } from "#app/map/WindBarb.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { JumpRunControls } from "#app/map/JumpRunControls.js";
import { JumpRunSettingsButton } from "#app/map/JumpRunSettingsButton.js";
import { h, html } from "htm/preact";
import { useId, useRef } from "preact/hooks";

/** @param {FreefallToolbarProps} props */
export function FreefallToolbar({
    fullWindow,
    errors,
    automaticJumpRun,
    onAutomaticJumpRunChange,
    onToggleFullWindow,
    onShare,
    canPosition,
    onPosition,
    arrowCount,
    onClear,
    onUndo,
    jumpRun,
    jumpRunLengthMeters,
    windLevels,
}) {
    /** @type {import("preact").RefObject<HTMLDialogElement>} */
    const errorDialogRef = useRef(null);
    const errorDialogTitleId = useId();
    const scope = useScope(css`
        :scope {
            padding: 0;
            border-bottom: 1px solid var(--color-border);
            background: var(--color-surface-soft);
        }
        .toolbar-actions {
            position: absolute;
            width: 100%;
            height: var(--map-viewport-height, 440px);
            container: wind-barb-map / size;
            pointer-events: none;
            z-index: 800;
        }
        .toolbar-window-actions {
            display: flex;
            flex-shrink: 0;
            gap: var(--spacing-1-5);
        }
        .toolbar-controls {
            display: flex;
            position: absolute;
            bottom: calc(28px + env(safe-area-inset-bottom));
            left: 12px;
            right: 12px;
            z-index: 800;
            align-items: center;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: var(--spacing-1-5);
            pointer-events: none;
        }
        .toolbar-controls .jump-run-controls {
            flex-wrap: wrap;
            gap: var(--spacing-1-5);
        }
        .toolbar-controls .arrow-action,
        .toolbar-controls .jumper-actions {
            flex-shrink: 0;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-map-control);
            box-shadow: var(--shadow-floating);
            pointer-events: auto;
        }
        .toolbar-controls .arrow-action:hover {
            background: var(--color-map-control-hover);
        }
        .toolbar-controls .jumper-actions .arrow-action {
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
        }
        .toolbar-controls .jumper-actions .arrow-action:first-child {
            border-radius: var(--radius-sm) 0 0 var(--radius-sm);
        }
        .toolbar-controls .jumper-actions .arrow-action:last-child {
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }
        .toolbar-controls .jumper-actions .arrow-action:hover {
            background: var(--color-map-control-hover);
        }
        .toolbar-controls .dropdown-menu,
        .toolbar-controls dialog {
            pointer-events: auto;
        }
        @container dropzone-map (max-width: 360px) {
            .toolbar-controls {
                left: 8px;
                right: 8px;
                gap: var(--spacing-1);
            }
            .toolbar-controls .jump-run-controls {
                gap: var(--spacing-1);
            }
        }
        .toolbar-map-actions {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
            gap: var(--spacing-1);
        }
        .toolbar-summary {
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
            border-top: 1px solid var(--color-border);
        }
        .toolbar-summary > .arrow-action {
            flex-shrink: 0;
        }
        .toolbar-summary .toolbar-automatic-jump-run {
            display: none;
            flex-shrink: 0;
            white-space: nowrap;
        }
        @container dropzone-map (min-width: 900px) {
            .toolbar-summary .toolbar-automatic-jump-run {
                display: inline-flex;
            }
        }
        .toolbar-summary-values {
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: var(--spacing-1) var(--spacing-3-5);
            min-width: 0;
            color: var(--color-muted);
            line-height: 1.4;
        }
        .toolbar-summary-values > span {
            white-space: normal;
        }
        .value-number {
            color: var(--color-text);
            font-variant-numeric: tabular-nums;
        }
        .window-toggle {
            flex-shrink: 0;
        }
        .toolbar-window-actions .toolbar-error {
            color: var(--color-danger);
        }
        :scope:is(dialog) {
            width: min(32rem, calc(100vw - var(--spacing-8)));
        }
        .error-dialog-list {
            display: grid;
            gap: var(--spacing-2);
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .wind-level-icons {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            flex-direction: column;
            gap: var(--spacing-0-5);
            pointer-events: auto;
            box-sizing: border-box;
            width: 36px;
            max-height: calc(
                var(--map-viewport-height, 440px) - var(--spacing-3) -
                    var(--spacing-7) - env(safe-area-inset-bottom)
            );
        }
        .wind-level-bar {
            display: flex;
            flex-direction: column;
            border-radius: var(--radius-sm);
            background: var(--color-map-control);
            min-height: 0;
            overflow-y: auto;
            scrollbar-width: none;
        }
        .wind-barb-legend {
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
        }
        .wind-profile ul {
            display: grid;
            gap: var(--spacing-2);
            list-style: none;
            padding: 0;
            margin: var(--spacing-4) 0 0;
        }
        .wind-level {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
        }
        .wind-level-reading {
            flex: 1;
        }
        .wind-level svg {
            flex-shrink: 0;
            color: var(--color-primary);
        }
        .wind-level-knots {
            display: flex;
            align-items: center;
            gap: var(--spacing-1-5);
            white-space: nowrap;
        }
        .wind-level-knots svg {
            width: 2em;
            height: 2em;
            color: var(--color-text);
        }
        .wind-level-choice {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 100%;
            min-height: 36px;
            border: 0;
            border-radius: 0;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
        }
        .wind-level-height,
        .wind-level-speed {
            line-height: 1.1;
            font-variant-numeric: tabular-nums;
            white-space: pre-line;
        }
        .wind-level-choice:first-child {
            border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        }
        .wind-level-choice + .wind-level-choice {
            border-top: 1px solid var(--color-primary);
        }
        .wind-level-choice:last-child {
            border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        }
        .wind-level-choice[aria-pressed="true"] {
            background: var(--color-primary);
            color: var(--color-on-primary);
        }
        #wind-barb-help {
            flex-shrink: 0;
            align-self: center;
            margin: 0;
            margin-top: var(--spacing-1-5);
            background: var(--color-map-control);
        }
        .wind-level-choice[aria-pressed="false"]:hover,
        #wind-barb-help:hover {
            background: var(--color-map-control-hover);
        }
        @container wind-barb-map (min-width: 900px) and (min-height: 560px) {
            .wind-level-icons {
                width: 48px;
            }
            .wind-level-choice {
                min-height: 48px;
            }
            .wind-level-choice > svg {
                width: 44px;
                height: 48px;
            }
        }
        .toolbar-actions .wind-level-icons dialog.help-dialog-wide {
            width: clamp(300px, 400px, 95cqw);
        }
        @container dropzone-map (min-width: 700px) {
            .toolbar-actions .wind-level-icons dialog.help-dialog-wide {
                width: min(600px, 90cqw);
            }
        }
    `);
    return html`
        <div
            class="freefall-toolbar"
            role="group"
            aria-label=${t("toolbar.freefallValues")}
        >
            ${scope.style}
            <div class="toolbar-controls">
                ${h(JumpRunControls, {
                    ...jumpRun,
                    canPosition,
                    onPosition,
                    arrowCount,
                    onUndo,
                })}
                <div class="toolbar-map-actions">
                    ${h(ToolbarButton, {
                        label: t("toolbar.removeJumpRun"),
                        icon: "trash",
                        className: "clear-arrows",
                        disabled: arrowCount === 0,
                        onClick: onClear,
                    })}
                </div>
            </div>
            <div class="toolbar-summary py-1 px-3">
                ${h(JumpRunSettingsButton, jumpRun)}
                <div class="toolbar-summary-values text-rem-0-65">
                    <span class="jump-summary">
                        <span class="value-label">
                            ${t("toolbar.freefall")}
                        </span>
                        <strong class="value-number font-semibold ml-1">
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.exitTooltip")}
                            >
                                ${jumpRun.settings.exitHeight}
                            </span>
                            ${"-"}
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.openingTooltip")}
                            >
                                ${`${jumpRun.nextJumper.openingHeight}m`}
                            </span>
                            ${" · "}
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.speedTooltip")}
                            >
                                ${`${jumpRun.nextJumper.speedKmh} km/h`}
                            </span>
                        </strong>
                    </span>
                    <span class="jump-run-summary">
                        <span class="value-label">${t("toolbar.jumpRun")}</span>
                        <strong class="value-number font-semibold ml-1">
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.jumpRunDirectionTooltip")}
                            >
                                ${`${Math.round(jumpRun.settings.direction)}°`}
                            </span>
                            ${" · "}
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.jumpRunSpeedTooltip")}
                            >
                                ${`${jumpRun.settings.speedKmh} km/h`}
                            </span>
                            ${" · "}
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.separationTooltip")}
                            >
                                ${`${jumpRun.settings.separationSeconds}s`}
                            </span>
                            ${" · "}
                            <span
                                tabindex="0"
                                data-tooltip=${t("toolbar.jumpRunLengthTooltip")}
                            >
                                ${
                                    jumpRunLengthMeters === null
                                        ? "—"
                                        : `${Math.round(jumpRunLengthMeters)} m`
                                }
                            </span>
                        </strong>
                    </span>
                </div>
                <div class="toolbar-window-actions ml-auto">
                    ${
                        fullWindow &&
                        h(CheckboxField, {
                            className:
                                "toolbar-automatic-jump-run text-rem-0-7",
                            label: t("map.automaticUpdate"),
                            checked: automaticJumpRun,
                            onCheckedChange: onAutomaticJumpRunChange,
                        })
                    }
                    ${h(ToolbarButton, {
                        label: t("toolbar.shareMap"),
                        icon: "share",
                        disabled: typeof navigator.share !== "function",
                        onClick: onShare,
                    })}
                    ${
                        fullWindow && errors.length > 0
                            ? h(ToolbarButton, {
                                  label: t("toolbar.errors"),
                                  icon: "warning",
                                  className: "toolbar-error",
                                  hasPopup: "dialog",
                                  controls: "map-errors-dialog",
                                  onClick: () =>
                                      errorDialogRef.current?.showModal(),
                              })
                            : null
                    }
                    ${h(ToolbarButton, {
                        label: fullWindow
                            ? t("toolbar.restoreMap")
                            : t("toolbar.expandMap"),
                        showTooltip: false,
                        icon: fullWindow ? "collapse" : "expand",
                        size: 20,
                        className: "window-toggle",
                        pressed: fullWindow,
                        onClick: onToggleFullWindow,
                    })}
                </div>
            </div>
            ${
                fullWindow && errors.length > 0
                    ? h(
                          Dialog,
                          {
                              id: "map-errors-dialog",
                              dialogRef: errorDialogRef,
                              labelledBy: errorDialogTitleId,
                          },
                          html`
                              <h2 id=${errorDialogTitleId}>
                                  ${t("toolbar.errors")}
                              </h2>
                              <ul class="error-dialog-list" role="alert">
                                  ${errors.map(
                                      (error) => html`
                                          <li>${error}</li>
                                      `,
                                  )}
                              </ul>
                          `,
                      )
                    : null
            }
            <div class="toolbar-actions">
                <div
                    class="wind-level-icons p-0"
                    role="group"
                    aria-label=${t("toolbar.windLevels")}
                >
                    <div class="wind-level-bar">
                        ${windLevels.levels.map(
                            (level) => html`
                                ${h(
                                    Button,
                                    {
                                        type: "button",
                                        class: "wind-level-choice p-0 pb-0.5",
                                        "aria-label": `${level.label}: ${level.text}`,
                                        "aria-pressed": level.selected,
                                        onClick: () =>
                                            windLevels.onSelect(level.id),
                                    },
                                    html`
                                        ${level.graphic}
                                        <span
                                            class="wind-level-speed text-rem-0-5 wind-barb-large:text-rem-0-65 mb-0.5"
                                            aria-hidden="true"
                                        >
                                            ${level.speedLabel}
                                        </span>
                                        <span
                                            class="wind-level-height text-rem-0-5 wind-barb-large:text-rem-0-65"
                                            aria-hidden="true"
                                        >
                                            ${level.heightLabel}
                                        </span>
                                    `,
                                )}
                            `,
                        )}
                    </div>
                    ${h(
                        Help,
                        {
                            id: "wind-barb-help",
                            wide: true,
                            label: t("map.windBarbHelpTitle"),
                        },
                        html`
                            <h3>${t("map.currentWinds")}</h3>
                            <div class="wind-profile">
                                <ul>
                                    ${windLevels.levels.map(
                                        (level) => html`
                                            <li
                                                class="wind-level"
                                                key=${level.id}
                                            >
                                                ${level.arrow}
                                                <div class="wind-level-reading">
                                                    <strong
                                                        tabindex=${level.altitudeTooltip ? 0 : undefined}
                                                        data-tooltip=${level.altitudeTooltip}
                                                    >
                                                        ${level.label}
                                                    </strong>
                                                    <div>${level.text}</div>
                                                </div>
                                                <div
                                                    class="wind-level-knots text-rem-1-5"
                                                >
                                                    ${level.graphic}
                                                    ${
                                                        level.knots === null
                                                            ? null
                                                            : html`
                                                                  <span>
                                                                      ${`${level.knots} kt`}
                                                                  </span>
                                                              `
                                                    }
                                                </div>
                                            </li>
                                        `,
                                    )}
                                </ul>
                            </div>
                            <h3>${t("map.windBarbHelpTitle")}</h3>
                            <p>${t("map.windBarbDirectionHelp")}</p>
                            <p>${t("map.windBarbSpeedHelp")}</p>
                            <p class="wind-barb-legend">
                                ${h(WindBarb, { speed: 2.572222, direction: 0 })}
                                ${t("map.windBarbHalfHelp")}
                            </p>
                            <p class="wind-barb-legend">
                                ${h(WindBarb, { speed: 5.144444, direction: 0 })}
                                ${t("map.windBarbFullHelp")}
                            </p>
                            <p class="wind-barb-legend">
                                ${h(WindBarb, { speed: 25.72222, direction: 0 })}
                                ${t("map.windBarbFlagHelp")}
                            </p>
                            <p class="wind-barb-legend">
                                ${h(WindBarb, { speed: 7.716666, direction: 0 })}
                                ${t("map.windBarbCombinedHelp")}
                            </p>
                            <p class="wind-barb-legend">
                                ${h(WindBarb, { speed: 0, direction: null })}
                                ${t("map.windBarbCalmHelp")}
                            </p>
                            <p class="wind-barb-legend">
                                ${h(WindBarb, { speed: null, direction: null })}
                                ${t("map.windBarbMissingHelp")}
                            </p>
                        `,
                    )}
                </div>
            </div>
        </div>
    `;
}
