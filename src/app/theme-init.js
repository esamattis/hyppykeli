// Apply the saved appearance before styles load to avoid a light-mode flash.
(() => {
    let preference = "system";
    try {
        const saved = localStorage.getItem("theme");
        if (saved === "light" || saved === "dark") preference = saved;
    } catch {
        // System appearance still works when browser storage is unavailable.
    }
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme =
        preference === "system"
            ? matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            : preference;
})();
