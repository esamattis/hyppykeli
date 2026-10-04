import { getTheme } from "./styles.js";
// @ts-check
import { html, h } from "htm/preact";
import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "preact/hooks";
import {
    map,
    tileLayer,
    circleMarker,
    point,
    polyline,
    layerGroup,
    latLng,
} from "leaflet";
import { css, useScope } from "./useScope.js";
import {
    FORECAST_COORDINATES,
    OBSERVATIONS,
    STATION_NAME,
    NAME,
    getDevNumber,
} from "./data.js";
import { OM_DATA, forecastTime } from "./om.js";
import { formatClock } from "./utils.js";
import { Icon, WindArrow } from "./icons.js";
import { Help } from "./components.js";
import { MapWindOverlay } from "./MapWindOverlay.js";
import { getFreefallDrift, driftCoordinates } from "./freefall.js";
import { FreefallToolbar } from "./FreefallToolbar.js";

/** @type {Readonly<JumpRunJumper>} */
const DEFAULT_JUMPER = { speedKmh: 180, openingHeight: 800 };

/** @type {Array<{ level: OpenMeteoPressureLevel, height: number }>} */
const LEVELS = [
    { level: "600", height: 4200 },
    { level: "700", height: 3000 },
    { level: "850", height: 1500 },
    { level: "925", height: 800 },
    { level: "1000", height: 110 },
];

/** @param {number} [now] */
export function getMapWindData(now = Date.now()) {
    const data = OM_DATA.value;
    const index =
        data?.hourly.time.findIndex((time) => {
            const start = forecastTime(time, data.utc_offset_seconds).getTime();
            return start <= now && now < start + 60 * 60 * 1000;
        }) ?? -1;
    const time = index >= 0 ? data?.hourly.time[index] : undefined;
    const ground = OBSERVATIONS.value
        .filter(
            (obs) =>
                obs.source === "fmi" ||
                obs.source === "roads" ||
                obs.source === "mock",
        )
        .reduce(
            (latest, obs) => (!latest || obs.time > latest.time ? obs : latest),
            /** @type {WeatherData | undefined} */ (undefined),
        );
    /** @type {FreefallWindLevel[]} */
    const altitudeWinds = LEVELS.map(({ level, height }) => ({
        height,
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
    const freefallWinds = altitudeWinds.slice(0, 4);
    /** @type {MapWindLevel[]} */
    const winds = [...altitudeWinds];
    const averageWind = averageFreeFallWind(freefallWinds);
    averageWind.speed = getDevNumber("DEV_map_speed") ?? averageWind.speed;
    averageWind.direction =
        getDevNumber("DEV_map_direction") ?? averageWind.direction;
    winds.unshift(averageWind);
    winds.push({
        label: "Maanpinta",
        speed: ground?.speed ?? null,
        direction: ground?.direction ?? null,
    });

    return { data, time, winds, averageWind, ground, freefallWinds };
}

/** @param {MapWindLevel[]} winds @returns {MapWindLevel} */
function averageFreeFallWind(winds) {
    const average = {
        label: "≈ 4200-800 m",
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

/** @param {{ wind: MapWindLevel, selected: boolean, onSelect: () => void }} props */
function WindLevel({ wind, selected, onSelect }) {
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
    return html`
        <li class="wind-level">
            <button
                type="button"
                class="wind-level-button"
                aria-pressed=${selected}
                onClick=${onSelect}
            >
                <div>
                    <strong>${wind.label}</strong>
                    <div>
                        ${label}${validSpeed && direction !== null ? ` ${Math.round(direction) % 360}°` : ""}
                    </div>
                </div>
                <span class="wind-level-arrow">
                    ${
                        validSpeed && wind.speed === 0
                            ? h(Icon, {
                                  name: "calm",
                                  size: 20,
                                  label: `${wind.label}: tyyntä`,
                              })
                            : validSpeed && direction !== null
                              ? h(WindArrow, {
                                    direction,
                                    size: 20,
                                    label: `${wind.label}: ${label}, tuuli suunnasta ${direction}°`,
                                })
                              : h(Icon, {
                                    name: "missing",
                                    size: 20,
                                    label: `${wind.label}: ei tietoa`,
                                })
                    }
                </span>
            </button>
        </li>
    `;
}

export function DropzoneMap() {
    const scope = useScope(css`
        :scope {
            grid-area: dropzone-map;
            min-width: 0;
            position: relative;
        }
        .map-frame.full-window {
            position: fixed;
            inset: 0;
            z-index: 2000;
            display: flex;
            flex-direction: column;
            width: 100%;
            margin: 0;
            border: 0;
            border-radius: 0;
            background: var(--color-surface);
        }
        .map-frame.full-window .map-viewport {
            flex: 1;
            min-height: 0;
            display: flex;
        }
        .map-frame.full-window .dz-map {
            flex: 1;
            min-height: 0;
        }
        .map-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
        }
        .map-frame {
            position: relative;
            width: calc(100% + 2 * var(--panel-padding));
            margin: 0 calc(-1 * var(--panel-padding))
                calc(-1 * var(--panel-padding));
            isolation: isolate;
            border-radius: 0 0 var(--radius-panel) var(--radius-panel);
            overflow: hidden;
        }
        .map-viewport {
            position: relative;
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
        .wind-level-button {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8rem;
            padding: 8px;
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            background: transparent;
            color: inherit;
            text-align: left;
            font-weight: 400;
        }
        .wind-level-button:hover,
        .wind-level-button[aria-pressed="true"] {
            background: var(--color-surface-hover);
        }
        .wind-level-button[aria-pressed="true"] {
            border-color: var(--color-primary);
        }
        .wind-level svg {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            color: var(--color-primary);
        }
    `);
    /** @type {import('preact').RefObject<HTMLDivElement>} */
    const mapRef = useRef(null);
    const arrowId = `freefall-arrow-${useId()}`;
    const [now, setNow] = useState(Date.now());
    const [fullWindow, setFullWindow] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState("≈ 4200-800 m");
    const [exitHeight, setExitHeight] = useState(4000);
    const [openingHeight, setOpeningHeight] = useState(
        DEFAULT_JUMPER.openingHeight,
    );
    const [speedKmh, setSpeedKmh] = useState(DEFAULT_JUMPER.speedKmh);
    const [jumpRunActive, setJumpRunActive] = useState(false);
    const [jumpRunStart, setJumpRunStart] = useState(
        /** @type {import('leaflet').LatLng | null} */ (null),
    );
    const [jumpers, setJumpers] = useState(
        /** @type {JumpRunJumper[]} */ ([{ ...DEFAULT_JUMPER }]),
    );
    const [nextJumper, setNextJumper] = useState(
        /** @type {JumpRunJumper} */ ({ ...DEFAULT_JUMPER }),
    );
    const jumperCount = jumpers.length;
    const [jumpRunSettings, setJumpRunSettings] = useState(
        /** @type {JumpRunSettings} */ ({
            direction: 0,
            speedKmh: 120,
            separationSeconds: 5,
            exitHeight: 4000,
        }),
    );
    const [leafletInstance, setLeafletInstance] = useState(
        /** @type {import('leaflet').Map | null} */ (null),
    );
    const [driftArrows, setDriftArrows] = useState(
        /** @type {FreefallDriftArrow[]} */ ([]),
    );
    const coordinates = FORECAST_COORDINATES.value;
    const name = NAME.value ?? "DZ";
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useLayoutEffect(() => {
        if (!fullWindow) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        /** @param {KeyboardEvent} event */
        const exit = (event) => {
            if (
                event.key === "Escape" &&
                !document.querySelector("dialog:modal")
            )
                setFullWindow(false);
        };
        document.addEventListener("keydown", exit);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", exit);
        };
    }, [fullWindow]);

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
        }).setView([lat, lon], 14);
        setLeafletInstance(leafletMap);
        setDriftArrows([]);
        setJumpRunStart(null);

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
        const theme = getTheme();
        circleMarker([lat, lon], {
            radius: 8,
            color: theme.primary,
            fillColor: theme.surface,
            fillOpacity: 1,
            weight: 3,
        }).addTo(leafletMap);
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

    useEffect(() => {
        if (!leafletInstance) return;
        const container = leafletInstance.getContainer();
        let pointerFocus = false;
        const usePointer = () => {
            pointerFocus = true;
        };
        const useKeyboard = () => {
            pointerFocus = false;
        };
        /** @param {import('leaflet').LatLng} start */
        const addArrow = (start) => {
            if (jumpRunActive) {
                setJumpRunStart(start);
                return;
            }
            setDriftArrows((arrows) => [
                ...arrows.slice(-9),
                { start, exitHeight, openingHeight, speedKmh },
            ]);
        };
        /** @param {import('leaflet').LeafletMouseEvent} event */
        const selectPoint = (event) => addArrow(event.latlng);
        /** @param {FocusEvent} event */
        const selectCenter = (event) => {
            if (event.target === container && !pointerFocus)
                addArrow(leafletInstance.getCenter());
        };
        /** @param {KeyboardEvent} event */
        const selectWithKeyboard = (event) => {
            if (
                event.target === container &&
                (event.key === "Enter" || event.key === " ")
            ) {
                event.preventDefault();
                addArrow(leafletInstance.getCenter());
            }
        };
        container.addEventListener("pointerdown", usePointer, true);
        document.addEventListener("keydown", useKeyboard, true);
        leafletInstance.on("click", selectPoint);
        container.addEventListener("focus", selectCenter);
        container.addEventListener("keydown", selectWithKeyboard);
        return () => {
            container.removeEventListener("pointerdown", usePointer, true);
            document.removeEventListener("keydown", useKeyboard, true);
            leafletInstance.off("click", selectPoint);
            container.removeEventListener("focus", selectCenter);
            container.removeEventListener("keydown", selectWithKeyboard);
        };
    }, [leafletInstance, exitHeight, openingHeight, speedKmh, jumpRunActive]);

    const { data, time, winds, averageWind, ground, freefallWinds } =
        getMapWindData(now);
    const drift = getFreefallDrift(
        freefallWinds,
        exitHeight,
        speedKmh,
        openingHeight,
    );
    const jumperStarts = jumpRunStart
        ? Array.from({ length: jumperCount }, (_, index) =>
              latLng(jumpRunCoordinates(jumpRunStart, jumpRunSettings, index)),
          )
        : [];
    useEffect(() => {
        if (!leafletInstance || !jumpRunStart) return;
        const layers = layerGroup().addTo(leafletInstance);
        const line = polyline([], {
            color: "#2563eb",
            weight: 3,
            dashArray: "8 6",
            interactive: false,
            className: "jump-run-line",
        }).addTo(layers);
        // Extend beyond the viewport in both directions, including after panning
        // away from the exit point. The line does not depend on jumper spacing.
        const updateLine = () => {
            const start = leafletInstance.project(jumpRunStart);
            const radians = (jumpRunSettings.direction * Math.PI) / 180;
            const direction = point(Math.sin(radians), -Math.cos(radians));
            const size = leafletInstance.getSize();
            const center = leafletInstance.project(leafletInstance.getCenter());
            const length =
                start.distanceTo(center) + Math.hypot(size.x, size.y);
            const offset = direction.multiplyBy(length);
            line.setLatLngs([
                leafletInstance.unproject(start.subtract(offset)),
                leafletInstance.unproject(start.add(offset)),
            ]);
        };
        updateLine();
        leafletInstance.on("moveend zoomend resize", updateLine);
        jumperStarts.forEach((start, index) => {
            const color =
                index === 0
                    ? "#16a34a"
                    : index === jumperCount - 1
                      ? "#dc2626"
                      : "#2563eb";
            circleMarker(start, {
                radius: 5,
                color,
                fillColor: "white",
                fillOpacity: 1,
                weight: 2,
                interactive: false,
                className: "jump-run-jumper",
            }).addTo(layers);
        });
        return () => {
            leafletInstance.off("moveend zoomend resize", updateLine);
            layers.remove();
        };
    }, [leafletInstance, jumpRunStart, jumpRunSettings, jumperCount]);
    useEffect(() => {
        const arrows = [
            ...driftArrows,
            ...jumperStarts.map((start, index) => ({
                start,
                exitHeight: jumpRunSettings.exitHeight,
                openingHeight:
                    jumpers[index]?.openingHeight ??
                    DEFAULT_JUMPER.openingHeight,
                speedKmh: jumpers[index]?.speedKmh ?? DEFAULT_JUMPER.speedKmh,
            })),
        ];
        if (!leafletInstance || !arrows.length) return;
        const layers = layerGroup().addTo(leafletInstance);
        const forecastWinds = getMapWindData(now).freefallWinds;
        const lines = arrows.flatMap((settings) => {
            const path = getFreefallDrift(
                forecastWinds,
                settings.exitHeight,
                settings.speedKmh,
                settings.openingHeight,
            );
            if (!path) return [];
            const positions = path.map((offset) =>
                driftCoordinates(settings.start, offset),
            );
            return [
                polyline(positions, {
                    color: "#c2410c",
                    weight: 3,
                    lineCap: "round",
                    interactive: false,
                    className: "freefall-drift-line",
                }).addTo(layers),
            ];
        });
        // A screen-sized SVG arrowhead follows the final segment at every zoom.
        const svgNamespace = "http://www.w3.org/2000/svg";
        const definitions = document.createElementNS(svgNamespace, "defs");
        const arrow = document.createElementNS(svgNamespace, "marker");
        arrow.id = arrowId;
        arrow.setAttribute("viewBox", "0 0 12 12");
        arrow.setAttribute("refX", "10");
        arrow.setAttribute("refY", "6");
        arrow.setAttribute("markerWidth", "16");
        arrow.setAttribute("markerHeight", "16");
        arrow.setAttribute("markerUnits", "userSpaceOnUse");
        arrow.setAttribute("orient", "auto");
        const tip = document.createElementNS(svgNamespace, "path");
        tip.setAttribute("d", "M4 2L10 6L4 10");
        tip.setAttribute("fill", "none");
        tip.setAttribute("stroke", "#c2410c");
        tip.setAttribute("stroke-width", "2.25");
        tip.setAttribute("stroke-linecap", "round");
        tip.setAttribute("stroke-linejoin", "round");
        arrow.append(tip);
        definitions.append(arrow);
        const element = lines[0]?.getElement();
        if (element instanceof SVGPathElement) {
            element.ownerSVGElement?.prepend(definitions);
        }
        for (const line of lines) {
            line.getElement()?.setAttribute("marker-end", `url(#${arrowId})`);
        }
        return () => {
            definitions.remove();
            layers.remove();
        };
    }, [
        arrowId,
        leafletInstance,
        driftArrows,
        jumpers,
        data,
        time,
        now,
        jumpRunStart,
        jumpRunSettings,
        jumperCount,
        exitHeight,
        openingHeight,
        speedKmh,
    ]);
    const selectedWind =
        winds.find((wind) => wind.label === selectedLabel) ?? averageWind;

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
                    { id: "map-wind-help" },
                    html`
                        <p>
                            Karttaa voi liikuttaa ja zoomata kahdella sormella.
                        </p>
                        <p>
                            Napauta tai klikkaa karttaa lisätäksesi uuden
                            ajautumisnuolen. Sarkaimella kartalle siirtyminen
                            lisää nuolen kartan keskikohtaan; Enter lisää uuden
                            nuolen kartan liikuttamisen jälkeen. Ajautumisviiva
                            arvioi vapaapudotuksen valitusta
                            uloshyppykorkeudesta valittuun avauskorkeuteen
                            valitulla nopeudella. Voit muuttaa korkeutta ja
                            nopeutta kartan yläpuolen kynäpainikkeesta. Jokainen
                            nuoli säilyttää lisäyshetken korkeudet ja nopeuden.
                            Kartalla voi olla enintään 10 nuolta; uusi nuoli
                            poistaa tarvittaessa vanhimman. Poista viimeisin
                            nuoli -painike poistaa uusimman nuolen. Tyhjennä
                            nuolet -painike poistaa kaikki nuolet. Tuulen nopeus
                            ja virtaussuunta interpoloidaan korkeuksien 4200,
                            3000, 1500 ja 800 m välillä. Arvio olettaa
                            ajautumisen tuulen mukana ilman omaa vaakaliikettä.
                        </p>
                        <p>
                            Hyppylinja-painike vaihtaa kartan hyppylinjatilaan.
                            Klikkaus asettaa ensimmäisen hyppääjän paikan;
                            seuraava klikkaus siirtää koko linjan ja säilyttää
                            hyppääjät. Suunta on asteina pohjoisesta
                            myötäpäivään. Lisää hyppääjä pluspainikkeesta.
                            Hyppylinjan asetuksista voit muuttaa maanopeutta ja
                            hyppääjien aikaväliä sekä yhteistä
                            uloshyppykorkeutta. Jokaiselle hyppääjälle voi
                            asettaa oman vapaapudotusnopeuden ja avauskorkeuden.
                        </p>
                        <p>
                            N ${h(Icon, { name: "up" })} · Nuolet näyttävät
                            virtaussuunnan. Kartan viivojen pituus kuvaa
                            nopeutta.
                        </p>
                        <p>
                            Ylätuulet:
                            Open-Meteo${time && data ? `, klo ${formatClock(forecastTime(time, data.utc_offset_seconds))}` : " — ei nykyisen tunnin tietoja"}.
                            Korkeudet ovat arvioita merenpinnasta.
                        </p>
                        <p>
                            ≈ 4200-800 m: nopeuden ja suunnan keskiarvo
                            korkeuksilta 800, 1500, 3000 ja 4200 m. Suunnan
                            keskiarvo huomioi pohjoissuunnan ylityksen. Antaa
                            karkean arvion ajautumisesta vapaapudotuksessa.
                        </p>
                        <p>
                            Valitse korkeus nähdäksesi sen tuulen kartalla.
                            Kartan liikkuvat viivat näyttävät valitun tuulen
                            virtaussuunnan. Voimakkaampi tuuli näkyy pidempinä
                            ja nopeammin liikkuvina viivoina.
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
                        ${winds.map((wind) =>
                            h(WindLevel, {
                                key: wind.label,
                                wind,
                                selected: wind.label === selectedWind.label,
                                onSelect: () => setSelectedLabel(wind.label),
                            }),
                        )}
                    </ul>
                </aside>
                ${
                    (driftArrows.length > 0 || jumpRunStart) && !drift
                        ? html`
                              <div
                                  class="freefall-drift-summary"
                                  aria-live="polite"
                              >
                                  Ajautumisarvio ei saatavilla: ylätuulitietoja
                                  puuttuu.
                              </div>
                          `
                        : null
                }
                <div class=${`map-frame${fullWindow ? " full-window" : ""}`}>
                    ${h(FreefallToolbar, {
                        fullWindow,
                        onToggleFullWindow: () =>
                            setFullWindow((expanded) => !expanded),
                        jumpRunActive,
                        onToggleJumpRun: () =>
                            setJumpRunActive((active) => !active),
                        jumpRun: {
                            settings: jumpRunSettings,
                            jumpers,
                            nextJumper,
                            onNextJumperChange: setNextJumper,
                            onJumpersChange: setJumpers,
                            onChange: setJumpRunSettings,
                            onAdd: () =>
                                setJumpers((current) => [
                                    ...current,
                                    { ...nextJumper },
                                ]),
                        },
                        exitHeight,
                        openingHeight,
                        speedKmh,
                        onAltitudeChange: (exit, opening) => {
                            setExitHeight(exit);
                            setOpeningHeight(opening);
                        },
                        onSpeedChange: setSpeedKmh,
                        arrowCount: jumpRunActive
                            ? jumpRunStart
                                ? Math.max(1, jumperCount)
                                : 0
                            : driftArrows.length,
                        onClear: () => {
                            if (jumpRunActive) {
                                setJumpRunStart(null);
                                setJumpers([{ ...DEFAULT_JUMPER }]);
                            } else setDriftArrows([]);
                        },
                        onUndo: () => {
                            if (jumpRunActive) {
                                if (jumperCount > 1)
                                    setJumpers((current) =>
                                        current.slice(0, -1),
                                    );
                                else setJumpRunStart(null);
                            } else
                                setDriftArrows((arrows) => arrows.slice(0, -1));
                        },
                    })}
                    <div class="map-viewport">
                        <div
                            class=${`dz-map ${scope.end}`}
                            ref=${mapRef}
                            style="touch-action: pan-y"
                            role="region"
                            aria-label=${`${name} kartalla`}
                        >
                            ${!coordinates ? "Odotetaan koordinaatteja…" : null}
                        </div>
                        ${coordinates ? h(MapWindOverlay, { wind: selectedWind }) : null}
                    </div>
                </div>
            </div>
        </section>
    `;
}

/**
 * @param {import('leaflet').LatLng} start
 * @param {JumpRunSettings} settings
 * @param {number} index
 * @returns {[number, number]}
 */
export function jumpRunCoordinates(start, settings, index) {
    const distance =
        (settings.speedKmh / 3.6) * settings.separationSeconds * index;
    const radians = (settings.direction * Math.PI) / 180;
    return driftCoordinates(start, {
        height: 0,
        east: Math.sin(radians) * distance,
        north: Math.cos(radians) * distance,
    });
}
