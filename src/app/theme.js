// @ts-check
import { signal } from "@preact/signals";

/** @param {string | null | undefined} value @returns {ThemePreference} */
function parsePreference(value) {
    return value === "light" || value === "dark" ? value : "system";
}

export const THEME_PREFERENCE = signal(
    parsePreference(document.documentElement.dataset.themePreference),
);
/** @type {Signal<"light" | "dark">} */
export const RESOLVED_THEME = signal(
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
);

function applyTheme() {
    const preference = THEME_PREFERENCE.value;
    const theme =
        preference === "system"
            ? matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            : preference;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = theme;
    RESOLVED_THEME.value = theme;
}

/** @param {ThemePreference} preference */
export function setThemePreference(preference) {
    THEME_PREFERENCE.value = preference;
    applyTheme();
    try {
        localStorage.setItem("theme", preference);
    } catch {
        // Keep the selected appearance for this page when storage is blocked.
    }
}

let started = false;
export function startTheme() {
    if (started) return;
    started = true;
    applyTheme();
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
        "change",
        applyTheme,
    );
    window.addEventListener("storage", (event) => {
        if (event.key !== "theme" && event.key !== null) return;
        THEME_PREFERENCE.value = parsePreference(event.newValue);
        applyTheme();
    });
}
