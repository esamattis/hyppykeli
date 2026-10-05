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
    arrowCount,
    onClear,
    onUndo,
    jumpRun,
    windLevels,
}) {
    const scope = useScope(css`
        :scope {
            padding: 0;
            border-bottom: 1px solid var(--color-border);
            background: var(--color-surface-soft);
        }
        .toolbar-actions {
            display: flex;
            align-items: flex-start;
            gap: 4px;
            padding: 3px 8px;
        }
        .toolbar-controls {
            display: flex;
            align-items: center;
            flex: 1;
            min-width: 0;
            flex-wrap: wrap;
            gap: 4px 14px;
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
            <div class="toolbar-actions">
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
                                                    <strong>
                                                        ${level.label}
                                                    </strong>
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
                            label: t("toolbar.removeJumpRun"),
                            icon: "trash",
                            className: "clear-arrows",
                            disabled: arrowCount === 0,
                            onClick: onClear,
                        })}
                    </div>
                </div>
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
            <div class="toolbar-summary">
                <span>
                    <span class="value-label">${t("toolbar.exit")}</span>
                    <strong class="value-number">
                        ${`${jumpRun.settings.exitHeight} m`}
                    </strong>
                </span>
                <span>
                    <span class="value-label">${t("toolbar.opening")}</span>
                    <strong class="value-number">
                        ${`${jumpRun.nextJumper.openingHeight} m`}
                    </strong>
                </span>
                <span>
                    <span class="value-label">${t("toolbar.speed")}</span>
                    <strong class="value-number">
                        ${`${jumpRun.nextJumper.speedKmh} km/h`}
                    </strong>
                </span>
                <span>
                    <span class="value-label">${t("toolbar.jumpRun")}</span>
                    <strong class="value-number">
                        ${`${Math.round(jumpRun.settings.direction)}° · ${jumpRun.settings.speedKmh} km/h`}
                    </strong>
                </span>
            </div>
        </div>
    `;
}
