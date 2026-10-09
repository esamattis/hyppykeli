// @ts-check
import {
    WAKE_LOCK_ACTIVE,
    WAKE_LOCK_FAILED,
    WAKE_LOCK_PENDING,
    supportsWakeLock,
    toggleWakeLock,
} from "#app/app/wakeLock.js";
import { Button } from "#app/shared/Button.js";
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

/** @param {WakeLockToggleProps} props */
export function WakeLockToggle({ compact = false }) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            width: 36px;
            height: 36px;
            border: none;
            background: transparent;
            color: var(--color-text);
        }
        :scope[aria-pressed="true"] {
            color: var(--color-primary);
        }
        :scope:hover {
            background: var(--color-surface-hover);
        }
        :scope:not(.compact) {
            width: 44px;
            height: 44px;
        }
    `);
    if (!supportsWakeLock()) return null;
    const label = WAKE_LOCK_FAILED.value
        ? t("wakeLock.error")
        : t(WAKE_LOCK_ACTIVE.value ? "wakeLock.disable" : "wakeLock.enable");
    return h(
        Button,
        {
            "aria-label": label,
            "data-tooltip": label,
            class: `wake-lock-toggle p-0${compact ? " compact" : ""}`,
            "aria-pressed": WAKE_LOCK_ACTIVE.value,
            disabled: WAKE_LOCK_PENDING.value,
            onClick: toggleWakeLock,
        },
        html`
            ${scope.style}
            ${h(Icon, { name: "screenAwake", size: compact ? 18 : 20 })}
        `,
    );
}
