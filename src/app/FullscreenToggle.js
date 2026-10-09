// @ts-check
import { Button } from "#app/shared/Button.js";
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import { useEffect, useState } from "preact/hooks";

export function FullscreenToggle() {
    const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
    const [failed, setFailed] = useState(false);
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

    useEffect(() => {
        const update = () => {
            setFullscreen(!!document.fullscreenElement);
            setFailed(false);
        };
        document.addEventListener("fullscreenchange", update);
        update();
        return () => document.removeEventListener("fullscreenchange", update);
    }, []);

    if (!document.fullscreenEnabled) return null;

    async function toggle() {
        setFailed(false);
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            setFailed(true);
        }
    }

    const label = failed
        ? t("fullscreen.error")
        : t(fullscreen ? "fullscreen.exit" : "fullscreen.enter");
    return h(
        Button,
        {
            class: "fullscreen-toggle p-2",
            "aria-label": label,
            "data-tooltip": label,
            onClick: toggle,
        },
        html`
            ${scope.style}
            ${h(Icon, { name: fullscreen ? "collapse" : "expand", size: 20 })}
        `,
    );
}
