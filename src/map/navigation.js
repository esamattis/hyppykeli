// @ts-check
import { signal } from "@preact/signals";
import { parseCoordinates } from "#app/shared/coordinates.js";

/** @type {import('@preact/signals').Signal<GeographicPosition | null>} */
export const MAP_FOCUS_REQUEST = signal(null);

let requestId = 0;

/**
 * Wait for smooth scrolling, including browsers without scrollend and the
 * case where the map is already in view and no scroll event fires.
 * @param {Element} target
 * @param {ScrollBehavior} behavior
 * @returns {Promise<void>}
 */
function scrollToMap(target, behavior) {
    return new Promise((resolve) => {
        let frame = 0;
        let lastY = window.scrollY;
        let lastMovement = performance.now();
        const finish = () => {
            cancelAnimationFrame(frame);
            document.removeEventListener("scrollend", finish);
            resolve();
        };
        const check = () => {
            if (window.scrollY !== lastY) {
                lastY = window.scrollY;
                lastMovement = performance.now();
            }
            if (performance.now() - lastMovement >= 120) finish();
            else frame = requestAnimationFrame(check);
        };
        document.addEventListener("scrollend", finish);
        target.scrollIntoView({ behavior, block: "center" });
        frame = requestAnimationFrame(check);
    });
}

/**
 * @param {string | null} coordinates
 * @param {{ scroll?: boolean }} [options]
 */
export async function focusMapAt(coordinates, { scroll = true } = {}) {
    const [latitude, longitude] = coordinates?.split(",") ?? [];
    const position = parseCoordinates(latitude, longitude);
    if (!position) return;
    const currentRequest = ++requestId;
    const target =
        document.querySelector("#dropzone-map .dz-map") ??
        document.getElementById("dropzone-map");
    if (scroll && target && !target.closest(".full-window")) {
        await scrollToMap(
            target,
            matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
        );
    }
    if (currentRequest === requestId) MAP_FOCUS_REQUEST.value = position;
}
