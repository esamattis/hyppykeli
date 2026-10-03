// @ts-check
import { html, h } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { map, tileLayer, circleMarker } from "leaflet";
import { css, useScope } from "./useScope.js";
import {
    FORECAST_COORDINATES,
    OBSERVATIONS,
    STATION_NAME,
    NAME,
} from "./data.js";
import { OM_DATA } from "./om.js";
import { formatClock } from "./utils.js";

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

/** @param {{ wind: MapWindLevel }} props */
function WindLevel({ wind }) {
    const validSpeed =
        wind.speed !== null && Number.isFinite(wind.speed) && wind.speed >= 0;
    const validDirection =
        wind.direction !== null && Number.isFinite(wind.direction);
    const direction = validDirection
        ? ((wind.direction ?? 0) + 360) % 360
        : null;
    const label = validSpeed ? `${wind.speed?.toFixed(1)} m/s` : "Ei tietoa";
    // The SVG points north; meteorological direction is where wind comes from.
    const rotation = (direction ?? 0) + 180;
    const length = validSpeed ? 14 + Math.min(wind.speed ?? 0, 25) * 1.1 : 14;
    return html`
        <li class="wind-level">
            <div>
                <strong>${wind.label}</strong>
                <div>${label}</div>
                <small>
                    ${direction !== null ? `${Math.round(direction)}°` : "Suunta puuttuu"}
                </small>
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
        .map-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 190px;
            gap: 16px;
        }
        .dz-map {
            min-height: 440px;
            height: 100%;
            isolation: isolate;
            border-radius: 8px;
            background: #e7ece8;
        }
        .wind-profile {
            min-width: 0;
        }
        h3 {
            margin: 0 0 8px;
        }
        ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .wind-level {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #8885;
            padding: 4px 0;
        }
        .wind-level svg {
            flex-shrink: 0;
            color: #26739b;
        }
        small {
            font-size: 0.8em;
        }
        .source-note {
            font-size: 0.8em;
            margin: 8px 0;
        }
        @media (max-width: 550px) {
            .map-layout {
                grid-template-columns: minmax(0, 1fr) 135px;
                gap: 8px;
            }
            .wind-level svg {
                width: 44px;
            }
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
        const leafletMap = map(mapRef.current, {
            scrollWheelZoom: false,
        }).setView([lat, lon], 14);
        tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(leafletMap);
        const markerLabel = document.createElement("span");
        markerLabel.textContent = name;
        circleMarker([lat, lon], {
            radius: 8,
            color: "#156389",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 3,
        })
            .addTo(leafletMap)
            .bindTooltip(markerLabel, { permanent: true, direction: "top" });
        const observer = new ResizeObserver(() => leafletMap.invalidateSize());
        observer.observe(mapRef.current);
        return () => {
            observer.disconnect();
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
            <h2>Hyppypaikka ja tuulet nyt</h2>
            <div class="map-layout">
                <div
                    class=${`dz-map ${scope.end}`}
                    ref=${mapRef}
                    role="region"
                    aria-label=${`${name} kartalla`}
                >
                    ${!coordinates ? "Odotetaan koordinaatteja…" : null}
                </div>
                <aside class="wind-profile">
                    <h3>Tuuliprofiili</h3>
                    <ul>
                        ${winds.map((wind) => h(WindLevel, { key: wind.label, wind }))}
                    </ul>
                    <p class="source-note">
                        N ↑ · Nuolet näyttävät virtaussuunnan. Pituus kuvaa
                        nopeutta (enintään 25 m/s).
                    </p>
                    <p class="source-note">
                        Ylätuulet:
                        Open-Meteo${time && data ? `, klo ${formatClock(forecastTime(time, data.utc_offset_seconds))}` : " — ei nykyisen tunnin tietoja"}.
                        Korkeudet ovat arvioita merenpinnasta.
                    </p>
                    <p class="source-note">
                        Maanpinta:
                        ${ground?.source === "roads" ? "Fintraffic" : "FMI"}${ground ? `, klo ${formatClock(ground.time)}` : " — ei havaintoa"}${STATION_NAME.value ? ` (${STATION_NAME.value})` : ""}.
                    </p>
                </aside>
            </div>
        </section>
    `;
}
