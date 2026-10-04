// @ts-check
import { Icon } from "../shared/icons.js";
import { getTheme } from "../styles.js";
import { t } from "../translations.js";
import { css, useScope } from "../useScope.js";
import { h, html } from "htm/preact";
import { circleMarker, map, tileLayer } from "leaflet";
import { useEffect, useRef, useState } from "preact/hooks";

/**
 * @param {{ lat: string, lon: string, onSelect: (lat: string, lon: string) => void }} props
 */
export function DropzoneCoordinateMap({ lat, lon, onSelect }) {
    const scope = useScope(css`
        :scope {
            position: relative;
            height: min(48vh, 420px);
            min-height: 280px;
            margin-bottom: 16px;
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
            top: 12px;
            right: 12px;
            display: grid;
            width: 44px;
            height: 44px;
            padding: 0;
            place-items: center;
            box-shadow: var(--shadow-panel);
        }
    `);
    /** @type {import("preact").RefObject<HTMLDivElement | null>} */
    const containerRef = useRef(null);
    /** @type {import("preact").RefObject<import("leaflet").Map | null>} */
    const mapRef = useRef(null);
    /** @type {import("preact").RefObject<import("leaflet").CircleMarker | null>} */
    const markerRef = useRef(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const leafletMap = map(container, {
            scrollWheelZoom: true,
        }).setView([64.5, 26], 5);
        mapRef.current = leafletMap;
        tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(leafletMap);
        leafletMap.on("click", ({ latlng }) => {
            onSelectRef.current(latlng.lat.toFixed(5), latlng.lng.toFixed(5));
        });

        const observer = new ResizeObserver(() => leafletMap.invalidateSize());
        observer.observe(container);
        return () => {
            observer.disconnect();
            markerRef.current = null;
            mapRef.current = null;
            leafletMap.remove();
        };
    }, []);

    useEffect(() => {
        const leafletMap = mapRef.current;
        const latitude = Number(lat);
        const longitude = Number(lon);
        const valid =
            lat.trim() !== "" &&
            lon.trim() !== "" &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            Math.abs(latitude) <= 90 &&
            Math.abs(longitude) <= 180;
        if (!leafletMap || !valid) {
            markerRef.current?.remove();
            markerRef.current = null;
            return;
        }

        if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
            return;
        }
        const theme = getTheme();
        markerRef.current = circleMarker([latitude, longitude], {
            radius: 8,
            color: theme.primary,
            fillColor: theme.surface,
            fillOpacity: 1,
            weight: 3,
        }).addTo(leafletMap);
    }, [lat, lon]);

    /** @param {import("preact").JSX.TargetedMouseEvent<HTMLButtonElement>} event */
    function getLocation(event) {
        event.stopPropagation();
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                mapRef.current?.setView([latitude, longitude], 13);
                onSelectRef.current(latitude.toString(), longitude.toString());
            },
            () => setLocating(false),
        );
    }

    return html`
        <div role="region" aria-label=${t("landing.mapRegion")}>
            ${scope.style}
            <div class="map-canvas" ref=${containerRef}></div>
            <button
                class="location-button"
                id="get-location"
                type="button"
                aria-label=${t("landing.useLocation")}
                title=${t("landing.useLocation")}
                disabled=${locating}
                onClick=${getLocation}
            >
                ${h(Icon, { name: "location", size: 24 })}
            </button>
        </div>
    `;
}
