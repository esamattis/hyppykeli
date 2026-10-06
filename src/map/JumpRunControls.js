// @ts-check
import { DropdownMenu } from "#app/shared/DropdownMenu.js";
import { ToolbarButton } from "#app/shared/ToolbarButton.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

/** @param {JumpRunPositionControlsProps} props */
export function JumpRunControls({
    settings,
    canPosition,
    onPosition,
    directionActive,
    canAim,
    selectedWindDirection,
    onToggleDirection,
    onResetDirection,
    onAdd,
    onUndo,
    arrowCount,
    onChange,
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
    `);
    return html`
        <div class="jump-run-controls">
            ${scope.style}
            ${h(ToolbarButton, {
                label: t("toolbar.positionJumpRun"),
                icon: "location",
                disabled: !canPosition,
                onClick: onPosition,
            })}
            ${children}
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
        </div>
    `;
}
