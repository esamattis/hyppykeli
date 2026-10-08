// @ts-check
import { Button } from "#app/shared/Button.js";
import { ManualMode } from "#app/manual/ManualMode.js";
import {
    completeDropzones,
    dropzoneHref,
    partialDropzones,
} from "#app/dropzones.js";
import { Icon } from "#app/shared/icons.js";
import { removeNullish } from "#app/shared/values.js";
import { LANGUAGE, setLanguage, t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { NAME } from "#app/weather/state.js";
import { MENU_OPEN } from "#app/app/menuState.js";
import { SAVED_DZs, removeSavedDz, saveCurrentDz } from "#app/app/settings.js";
import { clearResponseCache } from "#app/shared/responseCache.js";
import { h, html } from "htm/preact";

const OTHER_DZs = [...completeDropzones, ...partialDropzones].sort((a, b) =>
    a.name.localeCompare(b.name),
);

/**
 * @param {MouseEvent} e
 */
function savePreviousDz(e) {
    if (e.target instanceof HTMLAnchorElement) {
        localStorage.setItem("previous_dz", e.target.textContent?.trim() ?? "");
    }
}

async function resetCurrentDz() {
    const dropzone = OTHER_DZs.find((dz) => dz.name === NAME.value);
    if (dropzone) {
        const url = new URL(location.href);
        url.search = new URL(dropzoneHref(dropzone), url).search;
        history.replaceState(null, "", url);
    }
    await clearResponseCache();
    localStorage.clear();
    location.reload();
}

/** @param {{ manualEditorRef: import('preact').RefObject<ManualModeHandle> }} props */
export function SideMenu({ manualEditorRef }) {
    const scope = useScope(css`
        :scope {
            position: fixed;
            display: flex;
            flex-direction: column;
            z-index: 200;
            top: 0;
            bottom: 0;
            right: 0;
            width: min(360px, calc(100vw - 48px));
            background: var(--color-surface);
            border-left: 1px solid var(--color-border);
            box-shadow: var(--shadow-floating);
            overflow: hidden;
            overscroll-behavior: contain;
            transform: translateX(100%);
            will-change: transform;
            visibility: hidden;
            transition:
                transform 0.25s ease,
                visibility 0.25s;
        }

        :scope.open {
            transform: translateX(0);
            visibility: visible;
        }

        .menu-header {
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-4);
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
        }

        .menu-brand {
            color: var(--color-primary);
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        h1 {
            margin: var(--spacing-1) 0 0;
            overflow-wrap: anywhere;
        }

        .menu-close {
            display: grid;
            place-items: center;
            width: 40px;
            height: 40px;
            flex-shrink: 0;
            background: var(--color-surface-soft);
            border-radius: 50%;
        }

        .menu-content {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
            padding: var(--spacing-4) var(--spacing-6);
        }

        a {
            text-decoration: none;
        }

        .dzs a:hover {
            background: var(--color-surface-hover);
        }

        .menu-section {
            margin-top: var(--spacing-5);
            padding-top: var(--spacing-5);
            border-top: 1px solid var(--color-border);
        }

        .menu-section:first-child {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
        }

        h2 {
            margin-bottom: var(--spacing-3);
        }

        label,
        .saved-label {
            display: block;
            margin-bottom: var(--spacing-1-5);
            color: var(--color-muted);
        }

        .dz-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: var(--spacing-1-5);
        }

        .dzs a {
            display: block;
            padding: var(--spacing-2-5) var(--spacing-3);
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
            overflow-wrap: anywhere;
        }

        .saved-dz {
            display: flex;
            align-items: center;
            gap: var(--spacing-1-5);
        }

        .saved-dz a {
            flex: 1;
        }

        .saved-dz button {
            display: grid;
            place-items: center;
            padding: var(--spacing-2);
            background: transparent;
            border-color: transparent;
        }

        .save-dz {
            width: 100%;
            background: transparent;
        }

        .language-buttons {
            display: flex;
            gap: var(--spacing-2);
        }

        .language-buttons button {
            flex: 1;
        }

        .language-buttons button[aria-pressed="true"] {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: var(--color-surface);
        }

        .menu-footer {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: var(--spacing-2-5);
        }

        .menu-bottom {
            flex-shrink: 0;
            padding: var(--spacing-5) var(--spacing-6)
                calc(var(--spacing-5) + env(safe-area-inset-bottom));
        }

        .menu-home {
            display: grid;
            place-items: center;
            width: calc((100% - var(--spacing-2-5)) / 2);
            min-height: 56px;
            box-sizing: border-box;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
            color: var(--color-primary);
            transition: background-color 0.15s ease;
        }

        .menu-home:hover {
            background: var(--color-surface-hover);
        }

        .menu-footer > button,
        .menu-footer > .developer-controls > button {
            width: 100%;
            height: 100%;
            min-height: 44px;
            padding: var(--spacing-2-5);
            background: var(--color-surface-soft);
        }

        .menu-footer > button:hover,
        .menu-footer > .developer-controls > button:hover {
            background: var(--color-surface-hover);
        }

        @media (prefers-reduced-motion: reduce) {
            :scope {
                transition: none;
            }
        }
    `);

    /** @param {MouseEvent} e */
    const closeMenuOnLinkClick = (e) => {
        if (e.target instanceof Element && e.target.closest("a")) {
            MENU_OPEN.value = false;
        }
    };

    return html`
        <aside
            id="side-menu"
            aria-label=${t("menu.label")}
            inert=${!MENU_OPEN.value}
            class="${MENU_OPEN.value ? "side-menu open" : "side-menu"}"
            onClick=${closeMenuOnLinkClick}
        >
            ${scope.style}
            <header class="menu-header p-6">
                <div>
                    <span class="menu-brand text-rem-0-75 font-bold">
                        Hyppykeli
                    </span>
                    <h1 class="text-rem-1-4">${NAME.value}</h1>
                </div>
                ${h(
                    Button,
                    {
                        class: "menu-close p-0",
                        type: "button",
                        "aria-label": t("menu.close"),
                        onClick: () => {
                            MENU_OPEN.value = false;
                        },
                    },
                    html`
                        ${h(Icon, { name: "close", size: 20 })}
                    `,
                )}
            </header>

            <div class="menu-content">
                <section class="menu-section" aria-labelledby="menu-dropzones">
                    <h2 class="text-rem-1" id="menu-dropzones">
                        ${t("menu.dropzones")}
                    </h2>
                    ${
                        SAVED_DZs.value.length > 0
                            ? html`
                                  <span class="saved-label text-rem-0-8">
                                      ${t("menu.saved")}
                                  </span>
                              `
                            : null
                    }
                    <div class="dzs" onClick=${savePreviousDz}>
                        ${SAVED_DZs.value.flatMap((dz) => {
                            const name = dz.name;
                            if (!name) return [];
                            const qs =
                                "?" +
                                new URLSearchParams(
                                    removeNullish(dz),
                                ).toString();
                            return html`
                                <div class="saved-dz mb-1.5">
                                    <a
                                        class="text-rem-0-85 font-semibold"
                                        href=${qs}
                                    >
                                        ${name}
                                    </a>
                                    ${h(
                                        Button,
                                        {
                                            type: "button",
                                            "aria-label": t(
                                                "menu.removeSaved",
                                                name,
                                            ),
                                            onClick: () => {
                                                if (
                                                    confirm(
                                                        t("menu.confirmRemove"),
                                                    )
                                                ) {
                                                    // Keep the target present until outside click detection runs.
                                                    setTimeout(() =>
                                                        removeSavedDz(name),
                                                    );
                                                }
                                            },
                                        },
                                        html`
                                            ${h(Icon, { name: "close", size: 16 })}
                                        `,
                                    )}
                                </div>
                            `;
                        })}
                    </div>
                    ${h(
                        Button,
                        {
                            class: "save-dz text-rem-0-85 mt-1.5",
                            type: "button",
                            onClick: () =>
                                saveCurrentDz(
                                    prompt(t("menu.namePrompt"), NAME.value),
                                ),
                        },
                        html`
                            ${t("menu.saveCurrent")}
                        `,
                    )}
                    <div class="dzs dz-grid mt-4" onClick=${savePreviousDz}>
                        ${OTHER_DZs.map(
                            (dz) => html`
                                <a
                                    class="text-rem-0-85 font-semibold"
                                    href=${dropzoneHref(dz)}
                                >
                                    ${dz.name}
                                </a>
                            `,
                        )}
                    </div>
                </section>

                <section class="menu-section" aria-labelledby="menu-language">
                    <h2 class="text-rem-1" id="menu-language">
                        ${t("language.label")}
                    </h2>
                    <div
                        class="language-buttons"
                        role="group"
                        aria-labelledby="menu-language"
                    >
                        ${h(
                            Button,
                            {
                                type: "button",
                                "aria-pressed": LANGUAGE.value === "en",
                                onClick: () => {
                                    setLanguage("en");
                                    MENU_OPEN.value = false;
                                },
                            },
                            html`
                                ${t("language.english")}
                            `,
                        )}
                        ${h(
                            Button,
                            {
                                type: "button",
                                "aria-pressed": LANGUAGE.value === "fi",
                                onClick: () => {
                                    setLanguage("fi");
                                    MENU_OPEN.value = false;
                                },
                            },
                            html`
                                ${t("language.finnish")}
                            `,
                        )}
                    </div>
                </section>

                <footer class="menu-section menu-footer text-rem-0-8">
                    ${h(
                        Button,
                        { type: "button", onClick: resetCurrentDz },
                        html`
                            ${t("menu.reset")}
                        `,
                    )}
                    ${h(ManualMode, {
                        editorRef: manualEditorRef,
                        onOpen: () => {
                            MENU_OPEN.value = false;
                        },
                    })}
                </footer>
            </div>
            <div class="menu-bottom">
                <a
                    class="menu-home text-rem-0-8 font-semibold px-3.5"
                    href="/?no_redirect=1"
                >
                    ${t("menu.home")}
                </a>
            </div>
        </aside>
    `;
}

export function FloatingMenuButton() {
    const scope = useScope(css`
        :scope {
            position: fixed;
            z-index: 201;
            right: calc(20px + env(safe-area-inset-right));
            bottom: calc(20px + env(safe-area-inset-bottom));
            display: grid;
            place-items: center;
            width: 56px;
            height: 56px;
            padding: 0;
            border: none;
            border-radius: 50%;
            background: var(--color-primary);
            color: var(--color-surface);
            box-shadow: 0 3px 8px 1px var(--color-shadow-menu);
        }

        :scope:hover {
            background: var(--color-primary-hover);
        }
    `);

    return html`
        ${h(
            Button,
            {
                class: "menu-burger",
                type: "button",
                "aria-label": t("menu.label"),
                "aria-expanded": MENU_OPEN.value,
                "aria-controls": "side-menu",
                onClick: () => {
                    MENU_OPEN.value = !MENU_OPEN.value;
                },
            },
            html`
                ${scope.style}
                ${h(Icon, { name: MENU_OPEN.value ? "close" : "menu", size: 24 })}
            `,
        )}
    `;
}
