// @ts-check
import { Button } from "#app/shared/Button.js";
import { THEME_PREFERENCE, setThemePreference } from "#app/app/theme.js";
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";

const modes = /** @type {const} */ (["system", "light", "dark"]);
const icons = /** @type {const} */ ({
    system: "monitor",
    light: "sun",
    dark: "moon",
});

export function ThemeToggle() {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            width: 44px;
            height: 44px;
            color: var(--color-text);
            background: transparent;
            border-color: transparent;
        }
        :scope:hover {
            background: var(--color-surface-hover);
        }
    `);
    const mode = THEME_PREFERENCE.value;
    const next = modes[(modes.indexOf(mode) + 1) % modes.length] ?? "system";
    const label = t("theme.toggle", t(`theme.${mode}`), t(`theme.${next}`));
    return html`
        ${h(
            Button,
            {
                class: "theme-toggle p-2",
                type: "button",
                "aria-label": label,
                "data-tooltip": label,
                onClick: () => setThemePreference(next),
            },
            html`
                ${scope.style} ${h(Icon, { name: icons[mode], size: 20 })}
            `,
        )}
    `;
}
