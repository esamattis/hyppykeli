// @ts-check
import {
    completeDropzones,
    dropzoneHref,
    partialDropzones,
} from "#app/dropzones.js";

export function redirectToDz() {
    const params = new URLSearchParams(window.location.search);
    const redirectName =
        new URLSearchParams(window.location.search).get("dz") ??
        localStorage.getItem("previous_dz");

    if (params.has("no_redirect")) {
        localStorage.removeItem("previous_dz");
        params.delete("no_redirect");
        history.replaceState(null, "", "?" + params.toString());
        return;
    }

    const usingBackButton =
        window.performance?.navigation.type ===
        window.performance.navigation.TYPE_BACK_FORWARD;

    if (usingBackButton || !redirectName) {
        return;
    }

    /** @type {QueryParams[]} */
    let saved = [];

    try {
        saved = JSON.parse(localStorage.getItem("saved_dzs") ?? "[]");
    } catch {}

    const savedDz = saved.find((s) => s.name === redirectName);

    if (savedDz) {
        const qs = new URLSearchParams(
            // @ts-ignore
            savedDz,
        );
        window.location.href = `/dz/?${qs.toString()}`;
        return;
    }

    const dz = [...completeDropzones, ...partialDropzones].find(
        (dz) => dz.name === redirectName,
    );

    if (dz) {
        window.location.href = dropzoneHref(dz);
        return;
    }
}
