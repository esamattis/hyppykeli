import { cardHeadingStyles, getTheme } from "./styles.js";
// @ts-check
import { html, h } from "htm/preact";
import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
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
    STATION_COORDINATES,
    NAME,
    QUERY_PARAMS,
    getDevNumber,
    getQs,
    navigateQs,
    weatherSourceLabel,
} from "./data.js";
import { OM_DATA, forecastTime } from "./om.js";
import { formatClock } from "./utils.js";
import { Icon, WindArrow } from "./icons.js";
import { Help } from "./components.js";
import { DataSource } from "./DataSource.js";
import { MapWindOverlay } from "./MapWindOverlay.js";
import { getFreefallDrift, driftCoordinates } from "./freefall.js";
import {
    useMapState,
    isFiniteNumber,
    isValidPosition,
    isValidJumper,
    isValidJumpRunSettings,
} from "./mapState.js";
import { FreefallToolbar } from "./FreefallToolbar.js";
import { t } from "./translations.js";

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
        label: t("map.ground"),
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
        : t("common.noData");
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
                                  label: t("map.windLabelCalm", wind.label),
                              })
                            : validSpeed && direction !== null
                              ? h(WindArrow, {
                                    direction,
                                    size: 20,
                                    label: t(
                                        "map.windLabel",
                                        wind.label,
                                        label,
                                        direction,
                                    ),
                                })
                              : h(Icon, {
                                    name: "missing",
                                    size: 20,
                                    label: t(
                                        "map.windLabelMissing",
                                        wind.label,
                                    ),
                                })
                    }
                </span>
            </button>
        </li>
    `;
}

export function DropzoneMap() {
    const stationScope = useScope(css`
        .weather-station-callout {
            background: var(--color-surface);
            color: var(--color-text);
            border-color: var(--color-border);
            font: inherit;
        }
    `);
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
            position: relative;
            min-height: 440px;
            background: var(--color-surface-hover);
        }
        .direction-setting .dz-map {
            cursor: crosshair;
        }
        .direction-setting .dz-map::after {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 350;
            background: var(--color-surface);
            opacity: 0.55;
            pointer-events: none;
        }
        .jump-run-target {
            position: absolute;
            top: 50%;
            left: 50%;
            z-index: 500;
            width: 20px;
            height: 20px;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
        .jump-run-target::before,
        .jump-run-target::after {
            content: "";
            position: absolute;
            top: 9px;
            left: 1px;
            width: 18px;
            height: 2px;
            border-radius: 1px;
            background: #dc2626;
            box-shadow: 0 0 0 1px white;
            transform: rotate(45deg);
        }
        .jump-run-target::after {
            transform: rotate(-45deg);
        }
        .direction-hint {
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 600;
            max-width: calc(100% - 100px);
            padding: 8px 12px;
            border: 1px solid var(--color-primary);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
            color: var(--color-text);
            text-align: center;
            font-size: 0.8rem;
            pointer-events: none;
        }
        .wind-profile {
            min-width: 0;
        }
        ${cardHeadingStyles}
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
    /** @type {import('preact').RefObject<import('leaflet').Map | null>} */
    const activeLeafletRef = useRef(null);
    const arrowId = `freefall-arrow-${useId()}`;
    const [shareError, setShareError] = useState("");
    const [now, setNow] = useState(Date.now());
    const [fullWindow, setFullWindow] = useMapState(
        "map_full_window",
        false,
        (value) => typeof value === "boolean",
    );
    const [selectedLabel, setSelectedLabel] = useMapState(
        "map_wind",
        "≈ 4200-800 m",
        (value) => typeof value === "string",
    );
    const [exitHeight, setExitHeight] = useMapState(
        "map_exit_height",
        4000,
        (value) => isFiniteNumber(value) && value > 0 && value <= 4200,
    );
    const [openingHeight, setOpeningHeight] = useMapState(
        "map_opening_height",
        DEFAULT_JUMPER.openingHeight,
        (value) => isFiniteNumber(value) && value >= 0 && value < 4200,
    );
    const [speedKmh, setSpeedKmh] = useMapState(
        "map_speed",
        DEFAULT_JUMPER.speedKmh,
        (value) => isFiniteNumber(value) && value > 0,
    );
    const [jumpRunActive, setJumpRunActive] = useMapState(
        "map_run_active",
        false,
        (value) => typeof value === "boolean",
    );
    const [jumpRunStart, setJumpRunStart] = useMapState(
        "map_run_start",
        /** @type {import('leaflet').LatLngLiteral | null} */ (null),
        (value) => value === null || isValidPosition(value),
    );
    const [placingJumpRunDirection, setPlacingJumpRunDirection] =
        useState(false);
    const [jumpers, setJumpers] = useMapState(
        "map_jumpers",
        /** @type {JumpRunJumper[]} */ ([{ ...DEFAULT_JUMPER }]),
        (value) => Array.isArray(value) && value.every(isValidJumper),
    );
    const [nextJumper, setNextJumper] = useMapState(
        "map_next_jumper",
        /** @type {JumpRunJumper} */ ({ ...DEFAULT_JUMPER }),
        isValidJumper,
    );
    const jumperCount = jumpers.length;
    const [jumpRunSettings, setJumpRunSettings] = useMapState(
        "map_run_settings",
        /** @type {JumpRunSettings} */ ({
            direction: 0,
            speedKmh: 120,
            separationSeconds: 5,
            exitHeight: 4000,
        }),
        isValidJumpRunSettings,
    );
    const defaultJumpRunDirectionValue = Number(
        QUERY_PARAMS.value.default_jump_run_direction,
    );
    const defaultJumpRunDirection =
        QUERY_PARAMS.value.default_jump_run_direction?.trim() &&
        Number.isFinite(defaultJumpRunDirectionValue) &&
        defaultJumpRunDirectionValue >= 0 &&
        defaultJumpRunDirectionValue <= 360
            ? defaultJumpRunDirectionValue
            : 0;
    const defaultJumperCountValue = Number(
        QUERY_PARAMS.value.default_jumper_count,
    );
    const defaultJumperCount =
        QUERY_PARAMS.value.default_jumper_count?.trim() &&
        Number.isInteger(defaultJumperCountValue) &&
        defaultJumperCountValue >= 1 &&
        defaultJumperCountValue <= 100
            ? defaultJumperCountValue
            : 14;
    const [leafletInstance, setLeafletInstance] = useState(
        /** @type {import('leaflet').Map | null} */ (null),
    );
    const [driftArrows, setDriftArrows] = useMapState(
        "map_jumps",
        /** @type {FreefallDriftArrow[]} */ ([]),
        (value) =>
            Array.isArray(value) &&
            value.length <= 10 &&
            value.every(
                (arrow) =>
                    isValidJumper(arrow) &&
                    isValidPosition(arrow.start) &&
                    isFiniteNumber(arrow.exitHeight) &&
                    arrow.exitHeight > arrow.openingHeight &&
                    arrow.exitHeight <= 4200,
            ),
    );
    const [zoom, setZoom] = useMapState(
        "map_zoom",
        14,
        (value) => isFiniteNumber(value) && value >= 0 && value <= 19,
    );
    const [centerLat, setCenterLat] = useMapState(
        "map_center_lat",
        /** @type {number | null} */ (null),
        (value) =>
            value === null || (isFiniteNumber(value) && Math.abs(value) <= 90),
    );
    const [centerLon, setCenterLon] = useMapState(
        "map_center_lon",
        /** @type {number | null} */ (null),
        (value) =>
            value === null || (isFiniteNumber(value) && Math.abs(value) <= 180),
    );
    const center = useMemo(
        () =>
            centerLat !== null && centerLon !== null
                ? { lat: centerLat, lng: centerLon }
                : null,
        [centerLat, centerLon],
    );
    /** @param {import('leaflet').LatLngLiteral} value */
    const setCenter = (value) => {
        setCenterLat(value.lat);
        setCenterLon(value.lng);
    };
    const coordinates = FORECAST_COORDINATES.value;
    const stationCoordinates = STATION_COORDINATES.value;
    const stationName = STATION_NAME.value;
    const { lat: landingLat, lon: landingLon } = QUERY_PARAMS.value;
    const hasLandingCoordinates =
        !!landingLat?.trim() &&
        !!landingLon?.trim() &&
        isValidPosition({ lat: Number(landingLat), lng: Number(landingLon) });
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
            touchZoom: true,
            bounceAtZoomLimits: false,
            zoomSnap: 0,
            tapHold: false,
        }).setView(center ?? [lat, lon], zoom);
        activeLeafletRef.current = leafletMap;
        setLeafletInstance(leafletMap);
        setPlacingJumpRunDirection(false);

        // Let one finger scroll the page and Leaflet handle two-finger pan/pinch.
        // Disable single-touch dragging before Leaflet captures the pointer.
        /** @param {PointerEvent} event */
        const selectDragging = (event) => {
            if (event.pointerType === "touch") leafletMap.dragging.disable();
            else leafletMap.dragging.enable();
        };
        container.addEventListener("pointerdown", selectDragging, true);
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
        const saveView = () => {
            const current = leafletMap.getCenter();
            setCenter({ lat: current.lat, lng: current.lng });
            setZoom(leafletMap.getZoom());
        };
        leafletMap.on("moveend", saveView);
        saveView();
        const observer = new ResizeObserver(() =>
            leafletMap.invalidateSize({ pan: false }),
        );
        observer.observe(mapRef.current);
        return () => {
            if (activeLeafletRef.current === leafletMap)
                activeLeafletRef.current = null;
            observer.disconnect();
            container.removeEventListener("pointerdown", selectDragging, true);
            leafletMap.remove();
        };
    }, [coordinates]);

    useEffect(() => {
        if (
            !leafletInstance ||
            activeLeafletRef.current !== leafletInstance ||
            !hasLandingCoordinates ||
            !stationCoordinates ||
            !stationName
        )
            return;
        const [lat, lng] = stationCoordinates.split(",").map(Number);
        if (
            lat === undefined ||
            lng === undefined ||
            !isValidPosition({ lat, lng })
        )
            return;
        const theme = getTheme();
        const label = document.createElement("span");
        label.textContent = stationName.replace(
            /\(Digitraffic\)$/,
            "(Fintraffic)",
        );
        const station = circleMarker([lat, lng], {
            radius: 4,
            color: theme.primary,
            fillColor: theme.surface,
            fillOpacity: 1,
            weight: 2,
        })
            .bindTooltip(label, {
                permanent: true,
                direction: "top",
                offset: point(0, -6),
                className: "weather-station-callout",
            })
            .addTo(leafletInstance);
        return () => {
            station.remove();
        };
    }, [
        leafletInstance,
        hasLandingCoordinates,
        stationCoordinates,
        stationName,
    ]);

    useEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        const [lat, lng] = coordinates?.split(",").map(Number) ?? [];
        const target =
            center ??
            (lat !== undefined && lng !== undefined
                ? { lat, lng }
                : leafletInstance.getCenter());
        if (
            !leafletInstance.getCenter().equals(target, 1e-8) ||
            leafletInstance.getZoom() !== zoom
        )
            leafletInstance.setView(target, zoom, { animate: false });
    }, [leafletInstance, center, zoom, coordinates]);

    useEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        const container = leafletInstance.getContainer();
        let pointerFocus = false;
        const usePointer = () => {
            pointerFocus = true;
        };
        const useKeyboard = () => {
            pointerFocus = false;
        };
        /** @param {import('leaflet').LatLngLiteral} target */
        const updateJumpRunDirection = (target) => {
            if (!jumpRunStart) return;
            const offset = leafletInstance
                .project(target)
                .subtract(leafletInstance.project(jumpRunStart));
            if (offset.x === 0 && offset.y === 0) return;
            const direction =
                ((Math.atan2(offset.x, -offset.y) * 180) / Math.PI + 360) % 360;
            setJumpRunSettings((settings) => ({ ...settings, direction }));
        };
        /** @param {import('leaflet').LeafletMouseEvent} event */
        const followPointer = (event) => {
            if (jumpRunActive && placingJumpRunDirection)
                updateJumpRunDirection(event.latlng);
        };
        /** @type {import('leaflet').Point | null} */
        let touchStart = null;
        let touchDragged = false;
        /** @param {TouchEvent} event */
        const startDirectionTouch = (event) => {
            touchStart = null;
            touchDragged = false;
            if (
                !jumpRunActive ||
                !placingJumpRunDirection ||
                event.touches.length !== 1
            )
                return;
            if (
                event.target instanceof Element &&
                event.target.closest(".leaflet-control")
            )
                return;
            const touch = event.touches[0];
            if (touch) touchStart = point(touch.clientX, touch.clientY);
        };
        /** @param {TouchEvent} event */
        const followTouch = (event) => {
            if (event.touches.length !== 1) {
                touchStart = null;
                touchDragged = false;
                return;
            }
            const touch = event.touches[0];
            if (!touchStart || !touch) return;
            event.preventDefault();
            if (
                touchStart.distanceTo(point(touch.clientX, touch.clientY)) <
                    5 &&
                !touchDragged
            )
                return;
            touchDragged = true;
            const bounds = container.getBoundingClientRect();
            updateJumpRunDirection(
                leafletInstance.containerPointToLatLng(
                    point(
                        touch.clientX - bounds.left,
                        touch.clientY - bounds.top,
                    ),
                ),
            );
        };
        /** @param {TouchEvent} event */
        const finishDirectionTouch = (event) => {
            if (touchDragged) {
                // Prevent a synthetic click from starting another placement.
                event.preventDefault();
                setPlacingJumpRunDirection(false);
            }
            touchStart = null;
            touchDragged = false;
        };
        const cancelDirectionTouch = () => {
            touchStart = null;
            touchDragged = false;
        };
        /** @param {import('leaflet').LatLngLiteral} start */
        const addArrow = (start) => {
            if (jumpRunActive) {
                if (placingJumpRunDirection) {
                    updateJumpRunDirection(start);
                    setPlacingJumpRunDirection(false);
                } else {
                    setJumpRunStart(start);
                    setPlacingJumpRunDirection(true);
                }
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
        leafletInstance.on("mousemove", followPointer);
        container.addEventListener("touchstart", startDirectionTouch);
        container.addEventListener("touchmove", followTouch, {
            passive: false,
        });
        container.addEventListener("touchend", finishDirectionTouch, {
            passive: false,
        });
        container.addEventListener("touchcancel", cancelDirectionTouch);
        container.addEventListener("focus", selectCenter);
        container.addEventListener("keydown", selectWithKeyboard);
        return () => {
            container.removeEventListener("pointerdown", usePointer, true);
            document.removeEventListener("keydown", useKeyboard, true);
            leafletInstance.off("click", selectPoint);
            leafletInstance.off("mousemove", followPointer);
            container.removeEventListener("touchstart", startDirectionTouch);
            container.removeEventListener("touchmove", followTouch);
            container.removeEventListener("touchend", finishDirectionTouch);
            container.removeEventListener("touchcancel", cancelDirectionTouch);
            container.removeEventListener("focus", selectCenter);
            container.removeEventListener("keydown", selectWithKeyboard);
        };
    }, [
        leafletInstance,
        exitHeight,
        openingHeight,
        speedKmh,
        jumpRunActive,
        jumpRunStart,
        placingJumpRunDirection,
    ]);

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
        if (
            !leafletInstance ||
            activeLeafletRef.current !== leafletInstance ||
            !jumpRunStart
        )
            return;
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
            const isEndpoint = index === 0 || index === jumperCount - 1;
            const color =
                index === 0
                    ? "#22c55e"
                    : index === jumperCount - 1
                      ? "#ef4444"
                      : "#2563eb";
            circleMarker(start, {
                radius: isEndpoint ? 7 : 5,
                color: isEndpoint ? "white" : color,
                fillColor: isEndpoint ? color : "white",
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
        if (
            !leafletInstance ||
            activeLeafletRef.current !== leafletInstance ||
            !arrows.length
        )
            return;
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
        <section id="dropzone-map" aria-label=${t("map.region")}>
            ${scope.style}
            <div class="card-heading">
                <h2>
                    ${t("map.title")}
                    ${h(
                        Help,
                        { id: "map-wind-help", wide: true },
                        html`
                            <h3>${t("map.dataHelpTitle")}</h3>
                            <p>${t("map.forecastNatureHelp")}</p>
                            <p>${t("map.forecastLevelsHelp")}</p>
                            <p>${t("map.forecastImplicationHelp")}</p>
                            <p>
                                ${t("map.title")}:
                                Open-Meteo${time && data ? `, ${t("time.clock", formatClock(forecastTime(time, data.utc_offset_seconds)))}` : ` — ${t("map.sourceNoCurrent")}`}.
                            </p>
                            <p>≈ 4200-800 m: ${t("map.averageHelp")}</p>
                            <p>
                                ${t("map.groundObservationHelp")}
                                <br />
                                ${t("map.ground")}:
                                ${ground?.source === "roads" ? "Fintraffic" : "FMI"}${ground ? `, ${t("time.clock", formatClock(ground.time))}` : ` — ${t("map.sourceNoObservation")}`}${STATION_NAME.value ? ` (${STATION_NAME.value})` : ""}.
                            </p>

                            <h3>${t("map.usingHelpTitle")}</h3>
                            <p>${t("map.navigationHelp")}</p>
                            <p>${t("map.selectWind")} ${t("map.flowHelp")}</p>
                            <p>
                                N ${h(Icon, { name: "up" })} ·
                                ${t("map.legendHelp")}
                            </p>

                            <h3>${t("map.freefallHelpTitle")}</h3>
                            <p>${t("map.freefallHelp")}</p>

                            <h3>${t("map.jumpRunHelpTitle")}</h3>
                            <p>${t("map.jumpRunHelp")}</p>
                        `,
                    )}
                </h2>
                ${h(DataSource, {
                    sources: [
                        "Open-Meteo",
                        ground ? weatherSourceLabel(ground.source) : null,
                    ],
                })}
            </div>
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
                                  ${t("map.driftUnavailable")}
                              </div>
                          `
                        : null
                }
                ${
                    shareError
                        ? html`
                              <p role="status">${shareError}</p>
                          `
                        : null
                }
                <div class=${`map-frame${fullWindow ? " full-window" : ""}`}>
                    ${h(FreefallToolbar, {
                        fullWindow,
                        onShare: async () => {
                            setShareError("");
                            const url = new URL(location.href);
                            url.search = getQs({ map_full_window: "true" });
                            try {
                                await navigator.share({ url: url.href });
                            } catch (error) {
                                if (
                                    !(
                                        error instanceof DOMException &&
                                        error.name === "AbortError"
                                    )
                                )
                                    setShareError(t("map.shareFailed"));
                            }
                        },
                        onToggleFullWindow: () =>
                            setFullWindow((expanded) => !expanded),
                        jumpRunActive,
                        onToggleJumpRun: () => {
                            setJumpRunActive((active) => !active);
                            setPlacingJumpRunDirection(false);
                        },
                        jumpRun: {
                            settings: jumpRunSettings,
                            defaultJumpRunDirection,
                            defaultJumperCount,
                            jumpers,
                            nextJumper,
                            onNextJumperChange: setNextJumper,
                            onJumpersChange: setJumpers,
                            onChange: setJumpRunSettings,
                            onDefaultJumpRunDirectionChange: (direction) =>
                                navigateQs(
                                    {
                                        default_jump_run_direction:
                                            String(direction),
                                    },
                                    { replace: true },
                                ),
                            onDefaultJumperCountChange: (count) =>
                                navigateQs(
                                    { default_jumper_count: String(count) },
                                    { replace: true },
                                ),
                            onPosition: () => {
                                const [latitude, longitude] =
                                    coordinates?.split(",").map(Number) ?? [];
                                const initialCenter =
                                    latitude !== undefined &&
                                    longitude !== undefined &&
                                    Number.isFinite(latitude) &&
                                    Number.isFinite(longitude) &&
                                    Math.abs(latitude) <= 90 &&
                                    Math.abs(longitude) <= 180
                                        ? { lat: latitude, lng: longitude }
                                        : null;
                                const target =
                                    leafletInstance?.getCenter() ??
                                    center ??
                                    initialCenter;
                                if (!target) return;
                                const positionedJumpers = jumpRunStart
                                    ? jumpers
                                    : Array.from(
                                          { length: defaultJumperCount },
                                          () => ({ ...nextJumper }),
                                      );
                                const middleIndex = Math.max(
                                    0,
                                    (positionedJumpers.length - 1) / 2,
                                );
                                const middleJumpers = positionedJumpers.slice(
                                    Math.floor(middleIndex),
                                    Math.ceil(middleIndex) + 1,
                                );
                                if (!middleJumpers.length)
                                    middleJumpers.push(nextJumper);
                                const settings = jumpRunStart
                                    ? jumpRunSettings
                                    : {
                                          ...jumpRunSettings,
                                          direction: defaultJumpRunDirection,
                                      };
                                const winds = getMapWindData(now).freefallWinds;
                                const openingOffset = middleJumpers.reduce(
                                    (offset, jumper) => {
                                        const path = getFreefallDrift(
                                            winds,
                                            settings.exitHeight,
                                            jumper.speedKmh,
                                            jumper.openingHeight,
                                        );
                                        const opening = path?.[path.length - 1];
                                        return {
                                            east:
                                                offset.east +
                                                (opening?.east ?? 0) /
                                                    middleJumpers.length,
                                            north:
                                                offset.north +
                                                (opening?.north ?? 0) /
                                                    middleJumpers.length,
                                        };
                                    },
                                    { east: 0, north: 0 },
                                );
                                const middleExit = latLng(
                                    driftCoordinates(target, {
                                        height: 0,
                                        east: -openingOffset.east,
                                        north: -openingOffset.north,
                                    }),
                                );
                                setJumpRunSettings(settings);
                                setJumpRunStart(
                                    latLng(
                                        jumpRunCoordinates(
                                            middleExit,
                                            settings,
                                            -middleIndex,
                                        ),
                                    ),
                                );
                                if (!jumpRunStart)
                                    setJumpers(positionedJumpers);
                                setPlacingJumpRunDirection(false);
                            },
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
                                setPlacingJumpRunDirection(false);
                                setJumpers([{ ...DEFAULT_JUMPER }]);
                            } else setDriftArrows([]);
                        },
                        onUndo: () => {
                            if (jumpRunActive) {
                                if (jumperCount > 1)
                                    setJumpers((current) =>
                                        current.slice(0, -1),
                                    );
                                else {
                                    setJumpRunStart(null);
                                    setPlacingJumpRunDirection(false);
                                }
                            } else
                                setDriftArrows((arrows) => arrows.slice(0, -1));
                        },
                    })}
                    <div
                        class=${`map-viewport${placingJumpRunDirection ? " direction-setting" : ""}`}
                    >
                        ${
                            placingJumpRunDirection
                                ? html`
                                      <div class="direction-hint" role="status">
                                          ${t("map.directionPrompt")}
                                      </div>
                                  `
                                : null
                        }
                        <div
                            class=${`dz-map ${scope.end}`}
                            ref=${mapRef}
                            style=${{ touchAction: placingJumpRunDirection ? "none" : "pan-y" }}
                            role="region"
                            aria-label=${t("map.onMap", name)}
                        >
                            ${stationScope.style}
                            ${!coordinates ? t("common.waitingCoordinates") : null}
                        </div>
                        ${
                            jumpRunActive
                                ? html`
                                      <span
                                          class="jump-run-target"
                                          aria-hidden="true"
                                      ></span>
                                  `
                                : null
                        }
                        ${coordinates ? h(MapWindOverlay, { wind: selectedWind }) : null}
                    </div>
                </div>
            </div>
        </section>
    `;
}

/**
 * @param {import('leaflet').LatLngLiteral} start
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
