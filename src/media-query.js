// @ts-check

const desktopQuery = window.matchMedia(`(min-width: 900px)`);

/**
 * @param {Pick<MediaQueryListEvent, "matches">} e
 */
function toggleDesktop(e) {
    if (e.matches) {
        document.body.classList.add("desktop");
    } else {
        document.body.classList.remove("desktop");
    }
}

toggleDesktop(desktopQuery);

desktopQuery.addEventListener("change", toggleDesktop);

const thinQuery = window.matchMedia(`(max-height: 1200px)`);

/**
 * @param {Pick<MediaQueryListEvent, "matches">} e
 */
function toggleThin(e) {
    if (e.matches) {
        document.body.classList.add("thin");
    } else {
        document.body.classList.remove("thin");
    }
}

toggleThin(thinQuery);

thinQuery.addEventListener("change", toggleThin);
