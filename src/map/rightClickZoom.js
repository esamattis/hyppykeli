// @ts-check

/**
 * Browsers do not emit dblclick for the right mouse button.
 * @param {import("leaflet").Map} map
 * @returns {() => void}
 */
export function enableRightClickZoomOut(map) {
    /** @type {import("leaflet").LeafletMouseEvent | null} */
    let previous = null;
    /** @param {import("leaflet").LeafletMouseEvent} event */
    const rightClick = (event) => {
        if (
            event.originalEvent.button !== 2 ||
            !map.doubleClickZoom.enabled()
        ) {
            previous = null;
            return;
        }
        if (
            previous &&
            event.originalEvent.timeStamp - previous.originalEvent.timeStamp <=
                400 &&
            event.containerPoint.distanceTo(previous.containerPoint) <= 5
        ) {
            previous = null;
            const zoom = map.getZoom() - (map.options.zoomDelta ?? 1);
            if (map.options.doubleClickZoom === "center") map.setZoom(zoom);
            else map.setZoomAround(event.containerPoint, zoom);
        } else {
            previous = event;
        }
    };
    const reset = () => {
        previous = null;
    };
    map.on("contextmenu", rightClick);
    map.on("click movestart", reset);
    return () => {
        map.off("contextmenu", rightClick);
        map.off("click movestart", reset);
    };
}
