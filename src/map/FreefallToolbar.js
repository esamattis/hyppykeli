// @ts-check
import { Help } from "#app/shared/Help.js";
import { WindBarb } from "#app/map/WindBarb.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { JumpRunControls } from "#app/map/JumpRunControls.js";
import { JumpRunSettingsButton } from "#app/map/JumpRunSettingsButton.js";
import { h, html } from "htm/preact";

/** @param {FreefallToolbarProps} props */
export function FreefallToolbar({
    fullWindow,
    onToggleFullWindow,
    onShare,
    canPosition,
    onPosition,
    canPositionView,
    onPositionView,
    arrowCount,
    onClear,
    onUndo,
    jumpRun,
    jumpRunLengthMeters,
    windLevels,
}) {
    const scope = useScope(css`
        :scope {
            padding: 0;
            border-bottom: 1px solid var(--color-border);
            background: var(--color-surface-soft);
        }
        .toolbar-actions {
            position: relative;
            height: 0;
            z-index: 800;
        }
        .toolbar-window-actions {
            display: flex;
            flex-shrink: 0;
            margin-left: auto;
            gap: 6px;
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
            gap: 6px;
            pointer-events: none;
        }
        .toolbar-controls .jump-run-controls {
            flex-wrap: wrap;
            gap: 6px;
        }
        .toolbar-controls .arrow-action,
        .toolbar-controls .jumper-actions {
            flex-shrink: 0;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: rgb(255 255 255 / 70%);
            box-shadow: var(--shadow-floating);
            pointer-events: auto;
        }
        .toolbar-controls .arrow-action:hover {
            background: rgb(255 255 255 / 85%);
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
            background: rgb(255 255 255 / 85%);
        }
        .toolbar-controls .dropdown-menu,
        .toolbar-controls dialog {
            pointer-events: auto;
        }
        @media (max-width: 360px) {
            .toolbar-controls {
                left: 8px;
                right: 8px;
                gap: 4px;
            }
            .toolbar-controls .jump-run-controls {
                gap: 4px;
            }
        }
        .toolbar-map-actions {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
            gap: 4px;
        }
        .toolbar-summary {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 12px;
            border-top: 1px solid var(--color-border);
        }
        .toolbar-summary > .arrow-action {
            flex-shrink: 0;
        }
        .toolbar-summary-values {
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: 4px 14px;
            min-width: 0;
            color: var(--color-muted);
            font-size: 0.65rem;
            line-height: 1.4;
        }
        .toolbar-summary-values > span {
            white-space: normal;
        }
        .value-number {
            margin-left: 4px;
            color: var(--color-text);
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }
        .window-toggle {
            flex-shrink: 0;
        }
        .wind-level-icons {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            pointer-events: auto;
            box-sizing: border-box;
            width: 36px;
            padding: 0;
        }
        .wind-level-bar {
            display: flex;
            flex-direction: column;
            border-radius: var(--radius-sm);
            background: rgb(255 255 255 / 70%);
        }
        .wind-barb-legend {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .wind-profile ul {
            display: grid;
            gap: 8px;
            list-style: none;
            padding: 0;
            margin: 16px 0 0;
        }
        .wind-level {
            display: flex;
            align-items: center;
            gap: 12px;
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
            gap: 6px;
            font-size: 1.5rem;
            white-space: nowrap;
        }
        .wind-level-knots svg {
            width: 2em;
            height: 2em;
            color: #000;
        }
        .wind-level-choice {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 100%;
            height: 36px;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
        }
        .wind-level-choice:first-child {
            border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        }
        .wind-level-choice:last-child {
            border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        }
        .wind-level-choice[aria-pressed="true"] {
            background: #000;
            color: #fff;
        }
        #wind-barb-help {
            background: rgb(255 255 255 / 70%);
        }
        .wind-level-choice[aria-pressed="false"]:hover,
        #wind-barb-help:hover {
            background: rgb(255 255 255 / 85%);
        }
        @media (min-width: 700px) {
            .toolbar-actions .wind-level-icons dialog.help-dialog-wide {
                width: min(600px, 90vw);
            }
        }
    `);
    const selectedWind = windLevels.levels.find((level) => level.selected);
    return html`
        <div
            class="freefall-toolbar"
            role="group"
            aria-label=${t("toolbar.freefallValues")}
        >
            ${scope.style}
            <div class="toolbar-controls">
                ${h(
                    JumpRunControls,
                    {
                        ...jumpRun,
                        canPosition,
                        onPosition,
                        arrowCount,
                        onUndo,
                    },
                    h(ToolbarButton, {
                        label: t("toolbar.positionView"),
                        icon: "fitView",
                        disabled: !canPositionView,
                        onClick: onPositionView,
                    }),
                )}
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
            <div class="toolbar-summary">
                ${h(JumpRunSettingsButton, jumpRun)}
                <div class="toolbar-summary-values">
                    <span class="jump-summary">
                        <span class="value-label">
                            ${t("toolbar.freefall")}
                        </span>
                        <strong class="value-number">
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
                        <strong class="value-number">
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
                    ${
                        selectedWind &&
                        html`
                            <span class="selected-wind-summary">
                                <span class="value-label">
                                    ${t("toolbar.wind")}
                                </span>
                                <strong
                                    class="value-number"
                                    tabindex=${selectedWind.altitudeTooltip ? 0 : undefined}
                                    data-tooltip=${selectedWind.altitudeTooltip}
                                >
                                    ${selectedWind.label} · ${selectedWind.text}
                                </strong>
                            </span>
                        `
                    }
                </div>
                <div class="toolbar-window-actions">
                    ${h(ToolbarButton, {
                        label: t("toolbar.shareMap"),
                        icon: "share",
                        disabled: typeof navigator.share !== "function",
                        onClick: onShare,
                    })}
                    ${h(ToolbarButton, {
                        label: fullWindow
                            ? t("toolbar.restoreMap")
                            : t("toolbar.expandMap"),
                        icon: fullWindow ? "collapse" : "expand",
                        size: 20,
                        className: "window-toggle",
                        pressed: fullWindow,
                        onClick: onToggleFullWindow,
                    })}
                </div>
            </div>
            <div class="toolbar-actions">
                <div
                    class="wind-level-icons"
                    role="group"
                    aria-label=${t("toolbar.windLevels")}
                >
                    <div class="wind-level-bar">
                        ${windLevels.levels.map(
                            (level) => html`
                                <button
                                    type="button"
                                    class="wind-level-choice"
                                    aria-label=${`${level.label}: ${level.text}`}
                                    data-tooltip=${`${level.altitudeTooltip ?? level.label}: ${level.text}`}
                                    aria-pressed=${level.selected}
                                    onClick=${() =>
                                        windLevels.onSelect(level.id)}
                                >
                                    ${level.graphic}
                                </button>
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
                                                <div class="wind-level-knots">
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
