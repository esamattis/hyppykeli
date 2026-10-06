// @ts-check
import { DropdownMenu } from "#app/shared/DropdownMenu.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { JumpRunControls } from "#app/map/JumpRunControls.js";
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
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
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
        .toolbar-window-actions .arrow-action {
            flex-shrink: 0;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
            box-shadow: var(--shadow-floating);
            pointer-events: auto;
        }
        .toolbar-controls .arrow-action:hover,
        .toolbar-window-actions .arrow-action:hover {
            background: var(--color-surface-hover);
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
            align-items: baseline;
            flex-wrap: wrap;
            gap: 4px 14px;
            padding: 4px 12px;
            border-top: 1px solid var(--color-border);
            color: var(--color-muted);
            font-size: 0.65rem;
            line-height: 1.4;
        }
        .toolbar-summary > span {
            white-space: nowrap;
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
        .wind-level-menu-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin: 0;
            padding: 0;
        }
        .wind-level-choice {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            min-height: 40px;
            padding: 6px 8px;
            border: 0;
            border-radius: var(--radius-sm);
            background: transparent;
            color: inherit;
            box-shadow: none;
            font-size: 0.8rem;
            font-weight: 600;
            line-height: 1.2;
            text-align: start;
        }
        .wind-level-choice:hover,
        .wind-level-choice[aria-pressed="true"] {
            background: var(--color-surface-hover);
        }
        .wind-level-choice > span:not(.wind-level-choice-arrow) {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        .wind-level-choice > span > span {
            color: var(--color-muted);
            font-size: 0.75rem;
            font-weight: 400;
        }
        .wind-level-choice-arrow {
            display: flex;
            flex-shrink: 0;
            color: var(--color-primary);
        }
        .wind-level-choice-arrow svg {
            width: 20px;
            height: 20px;
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
                ${h(
                    JumpRunControls,
                    {
                        ...jumpRun,
                        canPosition,
                        onPosition,
                        arrowCount,
                        onUndo,
                    },
                    h(
                        DropdownMenu,
                        {
                            id: "wind-level-menu",
                            label: t("toolbar.windLevels"),
                            icon: "windLevels",
                            size: 20,
                            menuClass: "wind-level-menu",
                        },
                        html`
                            <div class="wind-level-menu-list">
                                ${windLevels.levels.map(
                                    (level) => html`
                                        <button
                                            type="button"
                                            class="wind-level-choice"
                                            aria-pressed=${level.selected}
                                            onClick=${() =>
                                                windLevels.onSelect(
                                                    level.label,
                                                )}
                                        >
                                            <span>
                                                <strong>${level.label}</strong>
                                                <span>${level.text}</span>
                                            </span>
                                            <span
                                                class="wind-level-choice-arrow"
                                            >
                                                ${level.graphic}
                                            </span>
                                        </button>
                                    `,
                                )}
                            </div>
                        `,
                    ),
                )}
                <div class="toolbar-map-actions">
                    ${h(ToolbarButton, {
                        label: t("toolbar.positionView"),
                        icon: "fitView",
                        disabled: !canPositionView,
                        onClick: onPositionView,
                    })}
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
                <span class="jump-summary">
                    <span class="value-label">${t("toolbar.jump")}</span>
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
            </div>
            <div class="toolbar-actions">
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
        </div>
    `;
}
