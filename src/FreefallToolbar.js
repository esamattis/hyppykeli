// @ts-check
import { h, html } from "htm/preact";
import { EditableSettings } from "./FreefallSettings.js";
import { JumpRunControls } from "./JumpRunControls.js";
import { Icon } from "./icons.js";
import { css, useScope } from "./useScope.js";

/** @param {FreefallToolbarProps} props */
export function FreefallToolbar({
    fullWindow,
    onToggleFullWindow,
    exitHeight,
    openingHeight,
    speedKmh,
    onAltitudeChange,
    onSpeedChange,
    arrowCount,
    onClear,
    onUndo,
    jumpRunActive,
    onToggleJumpRun,
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
        .arrow-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            padding: 0;
            background: transparent;
            color: var(--color-text);
            box-shadow: none;
            font-size: 0.75rem;
        }
        .arrow-action[aria-pressed="true"] {
            background: var(--color-surface-hover);
            color: var(--color-primary);
            outline: 1px solid var(--color-primary);
        }
        .arrow-action:hover {
            background: var(--color-surface-hover);
        }
        .arrow-action:disabled {
            opacity: 0.5;
        }
        .jump-run-toggle {
            margin-right: 10px;
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
            aria-label="Vapaapudotuksen arvot"
        >
            ${scope.style}
            <div class="toolbar-actions">
                <button
                    type="button"
                    class="arrow-action jump-run-toggle"
                    aria-label="Hyppylinja"
                    title="Hyppylinja"
                    aria-pressed=${jumpRunActive}
                    onClick=${onToggleJumpRun}
                >
                    ${h(Icon, { name: jumpRunActive ? "plane" : "freefall", size: 20 })}
                </button>
                ${jumpRunActive ? h(JumpRunControls, jumpRun) : null}
                ${!jumpRunActive ? h(EditableSettings, { exitHeight, openingHeight, speedKmh, onAltitudeChange, onSpeedChange }) : null}
                <button
                    type="button"
                    class="arrow-action undo-arrow"
                    aria-label="Poista viimeisin nuoli"
                    title="Poista viimeisin nuoli"
                    disabled=${arrowCount === 0}
                    onClick=${onUndo}
                >
                    ${h(Icon, { name: "undo", size: 18 })}
                </button>
                <button
                    type="button"
                    class="arrow-action clear-arrows"
                    aria-label="Tyhjennä nuolet"
                    title="Tyhjennä nuolet"
                    disabled=${arrowCount === 0}
                    onClick=${onClear}
                >
                    ${h(Icon, { name: "trash", size: 18 })}
                </button>
                <button
                    type="button"
                    class="arrow-action window-toggle"
                    aria-label=${fullWindow ? "Palauta Ylätuulet" : "Laajenna Ylätuulet koko ikkunaan"}
                    title=${fullWindow ? "Palauta Ylätuulet" : "Laajenna Ylätuulet koko ikkunaan"}
                    aria-pressed=${fullWindow}
                    onClick=${onToggleFullWindow}
                >
                    ${h(Icon, { name: fullWindow ? "collapse" : "expand", size: 20 })}
                </button>
            </div>
            <div class="toolbar-summary">
                <span>
                    <span class="value-label">Uloshyppy</span>
                    <strong class="value-number">
                        ${`${jumpRunActive ? jumpRun.settings.exitHeight : exitHeight} m`}
                    </strong>
                </span>
                <span>
                    <span class="value-label">Avaus</span>
                    <strong class="value-number">
                        ${`${jumpRunActive ? jumpRun.nextJumper.openingHeight : openingHeight} m`}
                    </strong>
                </span>
                <span>
                    <span class="value-label">Nopeus</span>
                    <strong class="value-number">
                        ${`${jumpRunActive ? jumpRun.nextJumper.speedKmh : speedKmh} km/h`}
                    </strong>
                </span>
            </div>
        </div>
    `;
}
