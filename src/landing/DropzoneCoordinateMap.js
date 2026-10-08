// @ts-check
import { PlaceSearch } from "#app/landing/PlaceSearch.js";
import { Icon } from "#app/shared/icons.js";
import {
    completeDropzones,
    partialDropzones,
    dropzoneHref,
    dropzoneCoordinates,
} from "#app/dropzones.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import { divIcon, marker, popup, map, tileLayer } from "leaflet";
import { useEffect, useRef, useState } from "preact/hooks";

/**
 * @param {{ onSelect: (lat: string, lon: string) => void }} props
 */
export function DropzoneCoordinateMap({ onSelect }) {
    const scope = useScope(css`
        :scope {
            position: relative;
            height: min(48vh, 420px);
            min-height: 280px;
            overflow: hidden;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        .map-canvas {
            height: 100%;
            cursor: crosshair;
        }
        .location-button {
            position: absolute;
            z-index: 1000;
            top: var(--spacing-3);
            right: var(--spacing-3);
            display: grid;
            width: 44px;
            height: 44px;
            place-items: center;
            box-shadow: var(--shadow-panel);
        }
    `);
    /** @type {import("preact").RefObject<HTMLDivElement | null>} */
    const containerRef = useRef(null);
    /** @type {import("preact").RefObject<import("leaflet").Map | null>} */
    const mapRef = useRef(null);
    const popupRef = useRef(
        /** @type {import("leaflet").Popup | null} */ (null),
    );
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const [locating, setLocating] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const leafletMap = map(container, {
            scrollWheelZoom: true,
        }).setView([64.5, 26], 5);
        mapRef.current = leafletMap;
        popupRef.current = popup({ closeButton: false });
        tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://nominatim.org/">Nominatim</a> | <a href="https://open-meteo.com/">Open-Meteo</a>',
            maxZoom: 19,
        }).addTo(leafletMap);
        const dropzones = [...completeDropzones, ...partialDropzones].map(
            (dz) => ({
                dz,
                coordinates: dropzoneCoordinates(dz),
            }),
        );
        for (const { dz, coordinates } of dropzones) {
            if (!coordinates) continue;
            const link = document.createElement("a");
            link.href = dropzoneHref(dz);
            link.setAttribute("aria-label", dz.name);
            link.setAttribute("data-tooltip", dz.name);
            link.className = "dropzone-pin";
            link.innerHTML = `<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="M16 1C8 1 1 7 1 15c0 11 15 24 15 24s15-13 15-24C31 7 24 1 16 1Z" fill="var(--color-primary)" stroke="var(--color-surface)" stroke-width="2"/><circle cx="16" cy="15" r="5" fill="var(--color-surface)"/></svg>`;
            marker(coordinates, {
                icon: divIcon({
                    html: link,
                    className: "dropzone-marker",
                    iconSize: [32, 40],
                    iconAnchor: [16, 40],
                }),
                keyboard: false,
                bubblingMouseEvents: false,
            }).addTo(leafletMap);
        }
        leafletMap.fitBounds(
            dropzones.flatMap(({ coordinates }) =>
                coordinates ? [coordinates] : [],
            ),
            { padding: [24, 44], animate: false },
        );
        leafletMap.on("click", ({ latlng }) => {
            showCreatePopup(latlng.lat, latlng.lng);
        });

        setReady(true);
        const observer = new ResizeObserver(() => leafletMap.invalidateSize());
        observer.observe(container);
        return () => {
            observer.disconnect();
            mapRef.current = null;
            popupRef.current = null;
            leafletMap.remove();
        };
    }, []);

    /** @param {number} latitude @param {number} longitude @param {boolean} [autoPan] */
    function showCreatePopup(latitude, longitude, autoPan = true) {
        const leafletMap = mapRef.current;
        const createPopup = popupRef.current;
        if (!leafletMap || !createPopup) return;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = t("landing.mapCreate");
        button.addEventListener("click", () => {
            onSelectRef.current(latitude.toFixed(5), longitude.toFixed(5));
            leafletMap.closePopup();
        });
        createPopup.options.autoPan = autoPan;
        createPopup
            .setLatLng([latitude, longitude])
            .setContent(button)
            .openOn(leafletMap);
    }

    /** @param {PlaceSearchResult} result */
    function selectPlace(result) {
        mapRef.current?.flyTo([Number(result.lat), Number(result.lon)], 13);
        showCreatePopup(Number(result.lat), Number(result.lon), false);
    }

    /** @param {import("preact").JSX.TargetedMouseEvent<HTMLButtonElement>} event */
    function getLocation(event) {
        event.stopPropagation();
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                mapRef.current?.setView([latitude, longitude], 13, {
                    animate: false,
                });
                onSelectRef.current(latitude.toString(), longitude.toString());
            },
            () => setLocating(false),
        );
    }

    return html`
        <div class="mb-4" role="region" aria-label=${t("landing.mapRegion")}>
            ${scope.style}
            <div class="map-canvas" ref=${containerRef}></div>
            <button
                class="location-button p-0"
                id="get-location"
                type="button"
                aria-label=${t("landing.useLocation")}
                data-tooltip=${t("landing.useLocation")}
                disabled=${locating || !ready}
                onClick=${getLocation}
            >
                ${h(Icon, { name: "location", size: 24 })}
            </button>
        </div>
        ${h(PlaceSearch, { onSelect: selectPlace, disabled: !ready })}
    `;
}
