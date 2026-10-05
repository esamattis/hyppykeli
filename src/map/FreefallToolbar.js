// @ts-check
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
    arrowCount,
    onClear,
    onUndo,
    jumpRun,
}) {
    const scope = useScope(css`
        :scope {
            padding: 0;
            border-bottom: 1px solid var(--color-border);
            background: var(--color-surface-soft);
        }
        .toolbar-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
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
        .undo-arrow {
            margin-left: 10px;
        }
        .window-toggle {
            margin-left: auto;
            flex-shrink: 0;
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
                ${h(JumpRunControls, jumpRun)}
                ${h(ToolbarButton, {
                    label: t("toolbar.undoArrow"),
                    icon: "undo",
                    className: "undo-arrow",
                    disabled: arrowCount === 0,
                    onClick: onUndo,
                })}
                ${h(ToolbarButton, {
                    label: t("toolbar.clearArrows"),
                    icon: "trash",
                    className: "clear-arrows",
                    disabled: arrowCount === 0,
                    onClick: onClear,
                })}
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
                        ${`${jumpRun.settings.speedKmh} km/h`}
                    </strong>
                </span>
            </div>
        </div>
    `;
}
