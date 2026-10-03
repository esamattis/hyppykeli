import { getTheme } from "./styles.js";
// @ts-check
import { html, h } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { map, tileLayer, circleMarker, point } from "leaflet";
import { css, useScope } from "./useScope.js";
import {
    FORECAST_COORDINATES,
    OBSERVATIONS,
    STATION_NAME,
    NAME,
} from "./data.js";
import { OM_DATA } from "./om.js";
import { formatClock } from "./utils.js";
import { Help } from "./components.js";
import { MapWindOverlay } from "./MapWindOverlay.js";

/** @type {Array<{ level: OpenMeteoPressureLevel, height: number }>} */
const LEVELS = [
    { level: "600", height: 4200 },
    { level: "700", height: 3000 },
    { level: "850", height: 1500 },
    { level: "925", height: 800 },
    { level: "1000", height: 110 },
];

/**
 * Open-Meteo returns offset-free timestamps in the response's timezone.
 * @param {string} time
 * @param {number} offset
 */
function forecastTime(time, offset) {
    return new Date(new Date(`${time}Z`).getTime() - offset * 1000);
}

/** @param {MapWindLevel[]} winds @returns {MapWindLevel} */
function averageFreeFallWind(winds) {
    const average = {
        label: "4200-800 m",
        speed: /** @type {number | null} */ (null),
        direction: /** @type {number | null} */ (null),
    };
    if (
        winds.length === 0 ||
        winds.some(
            ({ speed, direction }) =>
                speed === null ||
                !Number.isFinite(speed) ||
                speed < 0 ||
                direction === null ||
                !Number.isFinite(direction),
        )
    ) {
        return average;
    }

    let speedSum = 0;
    let sinSum = 0;
    let cosSum = 0;
    for (const wind of winds) {
        speedSum += wind.speed ?? 0;
        const radians = ((wind.direction ?? 0) * Math.PI) / 180;
        sinSum += Math.sin(radians);
        cosSum += Math.cos(radians);
    }
    average.speed = speedSum / winds.length;
    average.direction =
        Math.hypot(sinSum, cosSum) > 1e-10
            ? ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360
            : null;
    return average;
}

/** @param {{ wind: MapWindLevel }} props */
function WindLevel({ wind }) {
    const validSpeed =
        wind.speed !== null && Number.isFinite(wind.speed) && wind.speed >= 0;
    const validDirection =
        wind.direction !== null && Number.isFinite(wind.direction);
    const direction = validDirection
        ? ((wind.direction ?? 0) + 360) % 360
        : null;
    const label = validSpeed
        ? `${Math.round(wind.speed ?? 0)} m/s`
        : "Ei tietoa";
    // The SVG points north; meteorological direction is where wind comes from.
    const rotation = (direction ?? 0) + 180;
    const length = validSpeed ? 14 + Math.min(wind.speed ?? 0, 25) * 1.1 : 14;
    return html`
        <li class="wind-level">
            <div>
                <strong>${wind.label}</strong>
                <div>
                    ${label}${validSpeed && direction !== null ? ` ${Math.round(direction) % 360}°` : ""}
                </div>
            </div>
            <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                role="img"
                aria-label=${`${wind.label}: ${label}, tuuli suunnasta ${direction ?? "tuntematon"}°`}
            >
                ${
                    validSpeed && wind.speed === 0
                        ? html`
                              <circle
                                  cx="32"
                                  cy="32"
                                  r="5"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                              />
                          `
                        : validSpeed && validDirection
                          ? html`
                                <g transform=${`rotate(${rotation} 32 32)`}>
                                    <path
                                        d=${`M32 ${32 + length / 2} V${32 - length / 2} m-6 7 6-7 6 7`}
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </g>
                            `
                          : html`
                                <text
                                    x="32"
                                    y="38"
                                    text-anchor="middle"
                                    fill="currentColor"
                                >
                                    –
                                </text>
                            `
                }
            </svg>
        </li>
    `;
}

export function DropzoneMap() {
    const scope = useScope(css`
        :scope {
            grid-area: dropzone-map;
            min-width: 0;
        }
        :scope {
            --map-card-padding: 20px;
        }
        @media (max-width: 550px) {
            :scope {
                --map-card-padding: 14px;
            }
        }
        .map-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
        }
        .map-frame {
            position: relative;
            width: calc(100% + 2 * var(--map-card-padding));
            margin: 0 calc(-1 * var(--map-card-padding))
                calc(-1 * var(--map-card-padding));
            isolation: isolate;
            border-radius: 0 0 var(--radius-panel) var(--radius-panel);
            overflow: hidden;
        }
        .dz-map {
            min-height: 440px;
            background: var(--color-surface-hover);
        }
        .wind-profile {
            min-width: 0;
        }
        ul {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 16px;
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .wind-level {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8rem;
            padding: 4px 0;
        }
        .wind-level svg {
            flex-shrink: 0;
            width: 36px;
            height: 36px;
            color: var(--color-primary);
        }
    `);
    /** @type {import('preact').RefObject<HTMLDivElement>} */
    const mapRef = useRef(null);
    const [now, setNow] = useState(Date.now());
    const coordinates = FORECAST_COORDINATES.value;
    const name = NAME.value ?? "DZ";
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!mapRef.current || !coordinates) return;
        const [lat, lon] = coordinates.split(",").map(Number);
        if (
            lat === undefined ||
            lon === undefined ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            Math.abs(lat) > 90 ||
            Math.abs(lon) > 180
        )
            return;
        const container = mapRef.current;
        const leafletMap = map(container, {
            scrollWheelZoom: false,
            touchZoom: false,
            zoomSnap: 0,
            tapHold: false,
        }).setView([lat, lon], 12);

        // Let one finger scroll the page. Handle two-finger pan/pinch ourselves
        // so Leaflet's single-touch dragging cannot capture the gesture.
        /** @param {PointerEvent} event */
        const selectDragging = (event) => {
            if (event.pointerType === "touch") leafletMap.dragging.disable();
            else leafletMap.dragging.enable();
        };
        /** @type {{ center: import('leaflet').Point, anchor: import('leaflet').Point, distance: number, zoom: number } | null} */
        let gesture = null;
        /** @param {TouchEvent} event */
        const touchPosition = (event) => {
            const first = event.touches[0];
            const second = event.touches[1];
            if (!first || !second) return null;
            const rect = container.getBoundingClientRect();
            return {
                center: point(
                    (first.clientX + second.clientX) / 2 - rect.left,
                    (first.clientY + second.clientY) / 2 - rect.top,
                ),
                distance: Math.hypot(
                    first.clientX - second.clientX,
                    first.clientY - second.clientY,
                ),
            };
        };
        /** @param {TouchEvent} event */
        const startGesture = (event) => {
            const position = touchPosition(event);
            if (!position || event.touches.length !== 2) {
                gesture = null;
                return;
            }
            event.preventDefault();
            leafletMap.stop();
            const zoom = leafletMap.getZoom();
            gesture = {
                ...position,
                zoom,
                anchor: leafletMap.project(
                    leafletMap.containerPointToLatLng(position.center),
                    zoom,
                ),
            };
        };
        /** @param {TouchEvent} event */
        const moveGesture = (event) => {
            const position = touchPosition(event);
            if (!gesture || !position || event.touches.length !== 2) return;
            event.preventDefault();
            const zoom = Math.max(
                leafletMap.getMinZoom(),
                Math.min(
                    leafletMap.getMaxZoom(),
                    gesture.zoom +
                        Math.log2(
                            position.distance / Math.max(gesture.distance, 1),
                        ),
                ),
            );
            const anchor = gesture.anchor.multiplyBy(
                2 ** (zoom - gesture.zoom),
            );
            const center = anchor.subtract(
                position.center.subtract(leafletMap.getSize().divideBy(2)),
            );
            leafletMap.setView(leafletMap.unproject(center, zoom), zoom, {
                animate: false,
            });
        };
        const endGesture = () => {
            gesture = null;
        };
        container.addEventListener("pointerdown", selectDragging, true);
        container.addEventListener("touchstart", startGesture, {
            passive: false,
        });
        container.addEventListener("touchmove", moveGesture, {
            passive: false,
        });
        container.addEventListener("touchend", endGesture);
        container.addEventListener("touchcancel", endGesture);
        tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(leafletMap);
        const markerLabel = document.createElement("span");
        markerLabel.textContent = name;
        const theme = getTheme();
        circleMarker([lat, lon], {
            radius: 8,
            color: theme.primary,
            fillColor: theme.surface,
            fillOpacity: 1,
            weight: 3,
        })
            .addTo(leafletMap)
            .bindTooltip(markerLabel, { permanent: true, direction: "top" });
        const observer = new ResizeObserver(() => leafletMap.invalidateSize());
        observer.observe(mapRef.current);
        return () => {
            observer.disconnect();
            container.removeEventListener("pointerdown", selectDragging, true);
            container.removeEventListener("touchstart", startGesture);
            container.removeEventListener("touchmove", moveGesture);
            container.removeEventListener("touchend", endGesture);
            container.removeEventListener("touchcancel", endGesture);
            leafletMap.remove();
        };
    }, [coordinates, name]);

    const data = OM_DATA.value;
    const index =
        data?.hourly.time.findIndex((time) => {
            const start = forecastTime(time, data.utc_offset_seconds).getTime();
            return start <= now && now < start + 60 * 60 * 1000;
        }) ?? -1;
    const time = index >= 0 ? data?.hourly.time[index] : undefined;
    const ground = OBSERVATIONS.value
        .filter((obs) => obs.source === "fmi" || obs.source === "roads")
        .reduce(
            (latest, obs) => (!latest || obs.time > latest.time ? obs : latest),
            /** @type {WeatherData | undefined} */ (undefined),
        );
    /** @type {MapWindLevel[]} */
    const winds = LEVELS.map(({ level, height }) => ({
        label: `≈ ${height} m`,
        speed:
            index >= 0
                ? (data?.hourly[`windspeed_${level}hPa`][index] ?? null)
                : null,
        direction:
            index >= 0
                ? (data?.hourly[`winddirection_${level}hPa`][index] ?? null)
                : null,
    })).map((wind) => ({
        ...wind,
        speed: wind.speed === null ? null : wind.speed / 3.6,
    }));
    const averageWind = averageFreeFallWind(
        winds.filter((_, i) => {
            const height = LEVELS[i]?.height;
            return height !== undefined && height >= 800 && height <= 4200;
        }),
    );
    winds.unshift(averageWind);
    winds.push({
        label: "Maanpinta",
        speed: ground?.speed ?? null,
        direction: ground?.direction ?? null,
    });

    return html`
        <section
            id="dropzone-map"
            aria-label="Hyppypaikan kartta ja tuuliprofiili"
        >
            ${scope.style}
            <h2>
                Ylätuulet
                ${h(
                    Help,
                    { label: "?", id: "map-wind-help" },
                    html`
                        <p>
                            Karttaa voi liikuttaa ja zoomata kahdella sormella.
                        </p>
                        <p>
                            N ↑ · Nuolet näyttävät virtaussuunnan. Pituus kuvaa
                            nopeutta (enintään 25 m/s).
                        </p>
                        <p>
                            Ylätuulet:
                            Open-Meteo${time && data ? `, klo ${formatClock(forecastTime(time, data.utc_offset_seconds))}` : " — ei nykyisen tunnin tietoja"}.
                            Korkeudet ovat arvioita merenpinnasta.
                        </p>
                        <p>
                            4200-800 m: nopeuden ja suunnan keskiarvo
                            korkeuksilta 800, 1500, 3000 ja 4200 m. Suunnan
                            keskiarvo huomioi pohjoissuunnan ylityksen. Antaa
                            karkean arvion ajautumisesta vapaapudotuksessa.
                        </p>
                        <p>
                            Kartan liikkuvat viivat näyttävät 4200-800 m
                            keskimääräisen tuulen virtaussuunnan. Voimakkaampi
                            tuuli näkyy pidempinä ja nopeammin liikkuvina
                            viivoina.
                        </p>
                        <p>
                            Maanpinta:
                            ${ground?.source === "roads" ? "Fintraffic" : "FMI"}${ground ? `, klo ${formatClock(ground.time)}` : " — ei havaintoa"}${STATION_NAME.value ? ` (${STATION_NAME.value})` : ""}.
                        </p>
                    `,
                )}
            </h2>
            <div class="map-layout">
                <aside class="wind-profile">
                    <ul>
                        ${winds.map((wind) => h(WindLevel, { key: wind.label, wind }))}
                    </ul>
                </aside>
                <div class="map-frame">
                    <div
                        class=${`dz-map ${scope.end}`}
                        ref=${mapRef}
                        style="touch-action: pan-y"
                        role="region"
                        aria-label=${`${name} kartalla`}
                    >
                        ${!coordinates ? "Odotetaan koordinaatteja…" : null}
                    </div>
                    ${coordinates ? h(MapWindOverlay, { wind: averageWind }) : null}
                </div>
            </div>
        </section>
    `;
}
