// @ts-check
import { updateWeatherData } from "#app/weather/refresh.js";
import { HOVERED_OBSERVATION, NAME, addError } from "#app/weather/state.js";
import { MENU_OPEN } from "#app/app/menuState.js";
import { QUERY_PARAMS, navigateQs, saveCurrentDz } from "#app/app/settings.js";
import { computed, effect } from "@preact/signals";
import { startTooltips } from "#app/shared/tooltipEvents.js";

let started = false;

export function startApp() {
    if (started) return;
    started = true;
    startTooltips();
    /** @type {ReturnType<typeof setTimeout>} */
    let timer;

    HOVERED_OBSERVATION.subscribe(() => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            HOVERED_OBSERVATION.value = undefined;
        }, 5_000);
    });

    document.addEventListener("click", (e) => {
        if (e.target instanceof Element && !e.target.closest(".chart")) {
            HOVERED_OBSERVATION.value = undefined;
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            updateWeatherData();
        }
    });

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            updateWeatherData();
        }
    });

    setInterval(updateWeatherData, 60000);

    let initial = true;

    effect(() => {
        if (!QUERY_PARAMS.value.save) {
            return;
        }

        const name =
            NAME.value ??
            QUERY_PARAMS.value.name ??
            QUERY_PARAMS.value.icaocode;

        if (!name) {
            return;
        }

        saveCurrentDz(name);
        navigateQs({ save: undefined }, { replace: true });
    });

    // Refresh weather when its query settings change; map edits only update the URL.
    computed(() =>
        JSON.stringify(
            Object.fromEntries(
                Object.entries(QUERY_PARAMS.value).filter(
                    ([key]) =>
                        !key.startsWith("map_") &&
                        key !== "default_jump_run_direction" &&
                        key !== "default_jump_group_count",
                ),
            ),
        ),
    ).subscribe(() => {
        updateWeatherData().then(() => {
            if (!initial) {
                return;
            }

            initial = false;

            // Scroll to url fragment after the initial data is loaded
            // since anchor positions change after the data load
            const fragment = location.hash;
            if (!fragment) {
                return;
            }

            let element;

            try {
                element = document.querySelector(fragment);
            } catch (error) {}

            if (element) {
                element.scrollIntoView();
            }
        });
    });

    document.addEventListener("fetchjsonerror", (event) => {
        if (event instanceof CustomEvent && event.detail.message) {
            addError(event.detail.message);
        }
    });

    effect(() => {
        document.title =
            NAME.value === "Hyppykeli"
                ? "Hyppykeli"
                : NAME.value + " – Hyppykeli";
    });

    // Close menu when clicking outside of it
    document.addEventListener("click", (e) => {
        if (!MENU_OPEN.value) {
            return;
        }

        if (
            e.target instanceof Element &&
            e.target.closest(".side-menu,.menu-burger")
        ) {
            return;
        }

        MENU_OPEN.value = false;
    });

    window.addEventListener("popstate", () => {
        QUERY_PARAMS.value = Object.fromEntries(
            new URLSearchParams(location.search),
        );
    });
}
