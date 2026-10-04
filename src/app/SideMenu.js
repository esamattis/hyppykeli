// @ts-check
import { DeveloperMode } from "../developer/DeveloperMode.js";
import { completeDropzones, partialDropzones } from "../dropzones.js";
import { Icon } from "../shared/icons.js";
import { removeNullish } from "../shared/values.js";
import { LANGUAGE, setLanguage, t } from "../translations.js";
import { css, useScope } from "../useScope.js";
import { NAME } from "../weather/state.js";
import { MENU_OPEN } from "./menuState.js";
import { SAVED_DZs, removeSavedDz, saveCurrentDz } from "./settings.js";
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

/** @param {{ developerEditorRef: import('preact').RefObject<DeveloperModeHandle> }} props */
export function SideMenu({ developerEditorRef }) {
    const scope = useScope(css`
        :scope {
            position: fixed;
            z-index: 200;
            top: 0;
            bottom: 0;
            right: 0;
            width: min(360px, calc(100vw - 48px));
            background: var(--color-surface);
            border-left: 1px solid var(--color-border);
            box-shadow: var(--shadow-floating);
            overflow-y: auto;
            overscroll-behavior: contain;
            transform: translateX(100%);
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
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 24px;
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
        }

        .menu-brand {
            color: var(--color-primary);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        h1 {
            margin: 4px 0 0;
            font-size: 1.4rem;
            overflow-wrap: anywhere;
        }

        .menu-close {
            display: grid;
            place-items: center;
            width: 40px;
            height: 40px;
            padding: 0;
            flex-shrink: 0;
            background: var(--color-surface-soft);
            border-radius: 50%;
        }

        .menu-content {
            padding: 16px 24px calc(96px + env(safe-area-inset-bottom));
        }

        a {
            text-decoration: none;
        }

        .dzs a:hover {
            background: var(--color-surface-hover);
        }

        .menu-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--color-border);
        }

        .menu-section:first-child {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
        }

        h2 {
            margin-bottom: 12px;
            font-size: 1rem;
        }

        label,
        .saved-label {
            display: block;
            margin-bottom: 6px;
            color: var(--color-muted);
            font-size: 0.8rem;
        }

        .dz-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            margin-top: 16px;
        }

        .dzs a {
            display: block;
            padding: 10px 12px;
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
            font-size: 0.85rem;
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .saved-dz {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
        }

        .saved-dz a {
            flex: 1;
        }

        .saved-dz button {
            display: grid;
            place-items: center;
            padding: 8px;
            background: transparent;
            border-color: transparent;
        }

        .save-dz {
            width: 100%;
            margin-top: 6px;
            background: transparent;
            font-size: 0.85rem;
        }

        .menu-footer {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-size: 0.8rem;
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
            <header class="menu-header">
                <div>
                    <span class="menu-brand">Hyppykeli</span>
                    <h1>${NAME.value}</h1>
                </div>
                <button
                    class="menu-close"
                    type="button"
                    aria-label=${t("menu.close")}
                    onClick=${() => {
                        MENU_OPEN.value = false;
                    }}
                >
                    ${h(Icon, { name: "close", size: 20 })}
                </button>
            </header>

            <div class="menu-content">
                <section class="menu-section" aria-labelledby="menu-dropzones">
                    <h2 id="menu-dropzones">${t("menu.dropzones")}</h2>
                    ${
                        SAVED_DZs.value.length > 0
                            ? html`
                                  <span class="saved-label">
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
                                <div class="saved-dz">
                                    <a href=${qs}>${name}</a>
                                    <button
                                        type="button"
                                        aria-label=${t("menu.removeSaved", name)}
                                        onClick=${() => {
                                            if (
                                                confirm(t("menu.confirmRemove"))
                                            ) {
                                                // Keep the target present until outside click detection runs.
                                                setTimeout(() =>
                                                    removeSavedDz(name),
                                                );
                                            }
                                        }}
                                    >
                                        ${h(Icon, { name: "close", size: 16 })}
                                    </button>
                                </div>
                            `;
                        })}
                    </div>
                    <button
                        class="save-dz"
                        type="button"
                        onClick=${() => saveCurrentDz(prompt(t("menu.namePrompt"), NAME.value))}
                    >
                        ${t("menu.saveCurrent")}
                    </button>
                    <div class="dzs dz-grid" onClick=${savePreviousDz}>
                        ${OTHER_DZs.map(
                            (dz) => html`
                                <a href=${dz.href}>${dz.name}</a>
                            `,
                        )}
                    </div>
                </section>

                <section class="menu-section" aria-labelledby="menu-language">
                    <h2 id="menu-language">${t("language.label")}</h2>
                    <select
                        aria-label=${t("language.label")}
                        value=${LANGUAGE.value}
                        onInput=${(/** @type {Event} */ event) => {
                            const value = /** @type {HTMLSelectElement} */ (
                                event.currentTarget
                            ).value;
                            if (value === "en" || value === "fi")
                                setLanguage(value);
                        }}
                    >
                        <option value="en">${t("language.english")}</option>
                        <option value="fi">${t("language.finnish")}</option>
                    </select>
                </section>

                <footer class="menu-section menu-footer">
                    <a href="/?no_redirect=1">${t("menu.home")}</a>
                    ${h(DeveloperMode, {
                        editorRef: developerEditorRef,
                        onOpen: () => {
                            MENU_OPEN.value = false;
                        },
                    })}
                </footer>
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
            box-shadow: var(--shadow-floating);
        }

        :scope:hover {
            background: var(--color-primary-hover);
        }
    `);

    return html`
        <button
            class="menu-burger"
            type="button"
            aria-label=${t("menu.label")}
            aria-expanded=${MENU_OPEN.value}
            aria-controls="side-menu"
            onClick=${() => {
                MENU_OPEN.value = !MENU_OPEN.value;
            }}
        >
            ${scope.style}
            ${h(Icon, { name: MENU_OPEN.value ? "close" : "menu", size: 24 })}
        </button>
    `;
}
