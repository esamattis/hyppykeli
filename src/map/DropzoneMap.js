// @ts-check
import { QUERY_PARAMS, getQs, navigateQs } from "#app/app/settings.js";
import { Help } from "#app/shared/Help.js";
import { formatClock } from "#app/shared/dates.js";
import { Icon, WindArrow } from "#app/shared/icons.js";
import { cardHeadingStyles, getTheme } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { DataSource } from "#app/weather/DataSource.js";
import { forecastTime } from "#app/weather/providers/openMeteo.js";
import {
    FORECAST_COORDINATES,
    NAME,
    STATION_COORDINATES,
    STATION_NAME,
    weatherSourceLabel,
} from "#app/weather/state.js";
import { FreefallToolbar } from "#app/map/FreefallToolbar.js";
import { MapWindOverlay } from "#app/map/MapWindOverlay.js";
import {
    driftCoordinates,
    getFreefallDrift,
    getJumpRunVelocity,
    jumpRunCoordinates,
} from "#app/map/freefall.js";
import {
    isFiniteNumber,
    isValidJumpRunSettings,
    isValidJumper,
    isValidPosition,
    useMapState,
} from "#app/map/mapState.js";
import { getMapWindData } from "#app/map/windData.js";
import { h, html } from "htm/preact";
import {
    circleMarker,
    latLng,
    layerGroup,
    map,
    point,
    polyline,
    tileLayer,
} from "leaflet";
import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "preact/hooks";

/** @type {Readonly<JumpRunJumper>} */
const DEFAULT_JUMPER = { speedKmh: 180, openingHeight: 800 };

/**
 * First-exit position that puts the middle openings on the target.
 * @param {import('leaflet').LatLngLiteral} target
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {FreefallWindLevel[]} winds
 * @returns {import('leaflet').LatLng | null}
 */
function startForOpeningTarget(target, settings, group, winds) {
    const velocity = getJumpRunVelocity(winds, settings);
    if (!velocity || !group.length) return null;
    const middleIndex = Math.max(0, (group.length - 1) / 2);
    const middleJumpers = group.slice(
        Math.floor(middleIndex),
        Math.ceil(middleIndex) + 1,
    );
    if (!middleJumpers.length) return null;
    const openingOffset = middleJumpers.reduce(
        (offset, jumper) => {
            const path = getFreefallDrift(
                winds,
                settings.exitHeight,
                jumper.speedKmh,
                jumper.openingHeight,
                velocity.air,
            );
            const opening = path?.[path.length - 1];
            return {
                east: offset.east + (opening?.east ?? 0) / middleJumpers.length,
                north:
                    offset.north + (opening?.north ?? 0) / middleJumpers.length,
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
    return latLng(
        jumpRunCoordinates(middleExit, settings, -middleIndex, velocity.ground),
    );
}

/**
 * Where the middle of the group opens for an existing run.
 * @param {import('leaflet').LatLngLiteral} start
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {FreefallWindLevel[]} winds
 * @returns {import('leaflet').LatLngLiteral | null}
 */
function openingTargetForRun(start, settings, group, winds) {
    const velocity = getJumpRunVelocity(winds, settings);
    if (!velocity || !group.length) return null;
    const middleIndex = Math.max(0, (group.length - 1) / 2);
    const indexes = [
        ...new Set([Math.floor(middleIndex), Math.ceil(middleIndex)]),
    ];
    /** @type {import('leaflet').LatLng[]} */
    const openings = [];
    for (const index of indexes) {
        const jumper = group[index];
        if (!jumper) continue;
        const exit = latLng(
            jumpRunCoordinates(start, settings, index, velocity.ground),
        );
        const path = getFreefallDrift(
            winds,
            settings.exitHeight,
            jumper.speedKmh,
            jumper.openingHeight,
            velocity.air,
        );
        const opening = path?.[path.length - 1];
        if (!opening) continue;
        openings.push(latLng(driftCoordinates(exit, opening)));
    }
    if (!openings.length) return null;
    return {
        lat:
            openings.reduce((sum, point) => sum + point.lat, 0) /
            openings.length,
        lng:
            openings.reduce((sum, point) => sum + point.lng, 0) /
            openings.length,
    };
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
    const mapLayerScope = useScope(css`
        .weather-station-callout {
            background: var(--color-surface);
            color: var(--color-text);
            border-color: var(--color-border);
            font: inherit;
        }
        .jump-run-line {
            stroke: var(--map-direction-color, #2563eb);
            animation: dropzone-map-direction-dashes 700ms linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
            .jump-run-line {
                animation: none;
            }
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
        .direction-setting {
            --map-direction-color: #00aaff;
            --map-direction-animation: dropzone-map-direction-dashes 700ms
                linear infinite;
        }
        .direction-border {
            position: absolute;
            inset: 0;
            z-index: 700;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        .direction-border rect {
            width: calc(100% - 3px);
            height: calc(100% - 3px);
            fill: none;
            stroke: var(--map-direction-color);
            stroke-width: 3;
            stroke-dasharray: 8 6;
            animation: var(--map-direction-animation);
        }
        @keyframes dropzone-map-direction-dashes {
            to {
                stroke-dashoffset: -14;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .direction-setting {
                --map-direction-animation: none;
            }
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
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(0, 9rem));
            gap: 4px 16px;
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .wind-level-button {
            display: flex;
            width: 100%;
            height: 100%;
            align-items: center;
            gap: 4px;
            font-size: 0.8rem;
            padding: 4px 2px 4px 8px;
            border: 0;
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
    /** @type {import('preact').RefObject<(target: import('leaflet').LatLngLiteral) => void>} */
    const positionJumpRunAtRef = useRef(() => {});
    /** @type {import('preact').RefObject<(pointer: import('leaflet').LatLngLiteral) => void>} */
    const aimJumpRunAtRef = useRef(() => {});
    /** @type {import('preact').RefObject<import('leaflet').LatLngLiteral | null>} */
    const openingTargetRef = useRef(null);
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
    const [jumpRunStart, setJumpRunStart] = useMapState(
        "map_run_start",
        /** @type {import('leaflet').LatLngLiteral | null} */ (null),
        (value) => value === null || isValidPosition(value),
    );
    const [placingJumpRunDirection, setPlacingJumpRunDirection] =
        useState(false);
    const [draggingJumpRunDirection, setDraggingJumpRunDirection] =
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
            speedKmh: 157,
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
        QUERY_PARAMS.value.default_jump_group_count,
    );
    const defaultJumperCount =
        QUERY_PARAMS.value.default_jump_group_count?.trim() &&
        Number.isInteger(defaultJumperCountValue) &&
        defaultJumperCountValue >= 1 &&
        defaultJumperCountValue <= 100
            ? defaultJumperCountValue
            : 6;
    const [leafletInstance, setLeafletInstance] = useState(
        /** @type {import('leaflet').Map | null} */ (null),
    );
    const [driftMissing, setDriftMissing] = useState(false);
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
    const stationLabel = t(
        stationName?.endsWith("(Digitraffic)")
            ? "map.fintrafficStation"
            : "map.fmiStation",
    );
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
            leafletMap.remove();
        };
    }, [coordinates]);

    useLayoutEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        const container = leafletInstance.getContainer();
        if (placingJumpRunDirection) leafletInstance.dragging.disable();
        else leafletInstance.dragging.enable();
        // Choose dragging before Leaflet captures the pointer. In the embedded
        // map, one finger scrolls the page; in full window, it pans the map.
        /** @param {PointerEvent} event */
        const selectDragging = (event) => {
            if (
                placingJumpRunDirection ||
                (event.pointerType === "touch" && !fullWindow)
            )
                leafletInstance.dragging.disable();
            else leafletInstance.dragging.enable();
        };
        container.addEventListener("pointerdown", selectDragging, true);
        return () => {
            container.removeEventListener("pointerdown", selectDragging, true);
        };
    }, [leafletInstance, fullWindow, placingJumpRunDirection]);

    useLayoutEffect(() => {
        if (
            !leafletInstance ||
            activeLeafletRef.current !== leafletInstance ||
            !placingJumpRunDirection
        )
            return;
        const handlers = [
            leafletInstance.scrollWheelZoom,
            leafletInstance.doubleClickZoom,
            leafletInstance.touchZoom,
            leafletInstance.boxZoom,
            leafletInstance.keyboard,
        ];
        const enabledHandlers = handlers.filter((handler) => handler.enabled());
        const zoomControl = /** @type {import("leaflet").Control.Zoom & {
            disable: () => import("leaflet").Control.Zoom;
            enable: () => import("leaflet").Control.Zoom;
        }} */ (leafletInstance.zoomControl);
        handlers.forEach((handler) => handler.disable());
        zoomControl.disable();
        return () => {
            enabledHandlers.forEach((handler) => handler.enable());
            zoomControl.enable();
        };
    }, [leafletInstance, placingJumpRunDirection]);

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
        label.textContent = stationLabel;
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
        stationLabel,
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

    positionJumpRunAtRef.current = (target) => {
        if (!isValidPosition(target)) return;
        const creating = !jumpRunStart;
        const untouched =
            jumpers.length === 0 ||
            (jumpers.length === 1 &&
                jumpers[0]?.speedKmh === DEFAULT_JUMPER.speedKmh &&
                jumpers[0]?.openingHeight === DEFAULT_JUMPER.openingHeight);
        const positionedJumpers =
            !creating || !untouched
                ? jumpers
                : Array.from({ length: defaultJumperCount }, () => ({
                      ...nextJumper,
                  }));
        const settings = creating
            ? { ...jumpRunSettings, direction: defaultJumpRunDirection }
            : jumpRunSettings;
        const winds = getMapWindData(now).freefallWinds;
        const group = positionedJumpers.length
            ? positionedJumpers
            : [nextJumper];
        const start = startForOpeningTarget(target, settings, group, winds);
        if (!start) return;
        openingTargetRef.current = { lat: target.lat, lng: target.lng };
        if (creating) setJumpRunSettings(settings);
        setJumpRunStart(start);
        if (creating && untouched) setJumpers(positionedJumpers);
    };
    aimJumpRunAtRef.current = (pointer) => {
        const map = activeLeafletRef.current;
        const pivot = openingTargetRef.current;
        if (!map || !pivot || !isValidPosition(pointer)) return;
        const offset = map.project(pointer).subtract(map.project(pivot));
        if (offset.x === 0 && offset.y === 0) return;
        const direction =
            ((Math.atan2(offset.x, -offset.y) * 180) / Math.PI + 360) % 360;
        const settings = { ...jumpRunSettings, direction };
        const winds = getMapWindData(now).freefallWinds;
        const start = startForOpeningTarget(pivot, settings, jumpers, winds);
        if (!start) return;
        setJumpRunSettings(settings);
        setJumpRunStart(start);
    };
    /** @param {JumpRunSettings} next */
    const applyJumpRunSettings = (next) => {
        if (
            next.direction === jumpRunSettings.direction ||
            !jumpRunStart ||
            !jumpers.length
        ) {
            setJumpRunSettings(next);
            return;
        }
        const winds = getMapWindData(now).freefallWinds;
        if (!openingTargetRef.current) {
            const derived = openingTargetForRun(
                jumpRunStart,
                jumpRunSettings,
                jumpers,
                winds,
            );
            if (derived) openingTargetRef.current = derived;
        }
        const pivot = openingTargetRef.current;
        const start = pivot
            ? startForOpeningTarget(pivot, next, jumpers, winds)
            : null;
        if (!start) {
            setJumpRunSettings(next);
            return;
        }
        setJumpRunSettings(next);
        setJumpRunStart(start);
    };

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
        // Clicking positions the run. Direction mode stays on until the
        // direction button is pressed again. Dragging aims around the stored
        // opening through aimJumpRunAtRef, which also moves the start. This
        // effect must not depend on that start, or the gesture restarts.
        const directionPlacement = placingJumpRunDirection;
        /** @param {number} x @param {number} y */
        const aimAtClientPoint = (x, y) => {
            const bounds = container.getBoundingClientRect();
            aimJumpRunAtRef.current?.(
                leafletInstance.containerPointToLatLng(
                    point(x - bounds.left, y - bounds.top),
                ),
            );
        };
        /** @type {import('leaflet').Point | null} */
        let dragStart = null;
        let dragMoved = false;
        let pointerDrag = false;
        const finishDirectionDrag = () => {
            dragStart = null;
            dragMoved = false;
            pointerDrag = false;
            setDraggingJumpRunDirection(false);
        };
        /** @param {number} x @param {number} y */
        const followDirectionDrag = (x, y) => {
            if (!dragStart) return false;
            if (dragStart.distanceTo(point(x, y)) < 5 && !dragMoved)
                return false;
            dragMoved = true;
            setDraggingJumpRunDirection(true);
            aimAtClientPoint(x, y);
            return true;
        };
        /** @param {PointerEvent} event */
        const startDirectionPointer = (event) => {
            // Touch is handled with touch events. Handling it here as well drops
            // the gesture when the browser emits both event types.
            if (event.pointerType === "touch" || event.button !== 0) return;
            if (!directionPlacement || dragStart) return;
            if (
                event.target instanceof Element &&
                event.target.closest(".leaflet-control")
            )
                return;
            pointerDrag = true;
            dragMoved = false;
            dragStart = point(event.clientX, event.clientY);
            try {
                container.setPointerCapture(event.pointerId);
            } catch {
                // The pointer can end before capture is requested.
            }
        };
        /** @param {PointerEvent} event */
        const followDirectionPointer = (event) => {
            if (!pointerDrag) return;
            if (followDirectionDrag(event.clientX, event.clientY))
                event.preventDefault();
        };
        /** @param {PointerEvent} event */
        const finishDirectionPointer = (event) => {
            if (!pointerDrag) return;
            if (container.hasPointerCapture(event.pointerId))
                container.releasePointerCapture(event.pointerId);
            finishDirectionDrag();
        };
        /** @param {TouchEvent} event */
        const startDirectionTouch = (event) => {
            // A mouse drag already owns this gesture.
            if (pointerDrag) return;
            dragStart = null;
            dragMoved = false;
            if (!directionPlacement || event.touches.length !== 1) return;
            if (
                event.target instanceof Element &&
                event.target.closest(".leaflet-control")
            )
                return;
            const touch = event.touches[0];
            if (touch) dragStart = point(touch.clientX, touch.clientY);
        };
        /** @param {TouchEvent} event */
        const followDirectionTouch = (event) => {
            if (pointerDrag) return;
            if (event.touches.length !== 1) {
                finishDirectionDrag();
                return;
            }
            const touch = event.touches[0];
            if (!dragStart || !touch) return;
            event.preventDefault();
            followDirectionDrag(touch.clientX, touch.clientY);
        };
        /** @param {TouchEvent} event */
        const finishDirectionTouch = (event) => {
            if (pointerDrag) return;
            if (dragMoved) event.preventDefault();
            finishDirectionDrag();
        };
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        let pendingPoint;
        let doubleClickTimeStamp = -1;
        const cancelPendingPoint = () => {
            clearTimeout(pendingPoint);
            pendingPoint = undefined;
        };
        /** @param {import('leaflet').LatLngLiteral} target */
        const positionAt = (target) => {
            if (!directionPlacement) positionJumpRunAtRef.current?.(target);
        };
        /** @param {import('leaflet').LeafletMouseEvent} event */
        const cancelDoubleClick = (event) => {
            doubleClickTimeStamp = event.originalEvent.timeStamp;
            cancelPendingPoint();
        };
        /** @param {import('leaflet').LeafletMouseEvent} event */
        const selectPoint = (event) => {
            cancelPendingPoint();
            if (directionPlacement) return;
            // Leaflet can synthesize dblclick before dispatching the second
            // click, so also ignore that click by its original timestamp.
            if (
                event.originalEvent.detail > 1 ||
                event.originalEvent.timeStamp === doubleClickTimeStamp
            )
                return;
            const target = event.latlng;
            pendingPoint = setTimeout(() => {
                pendingPoint = undefined;
                positionAt(target);
            }, 300);
        };
        /** @param {KeyboardEvent} event */
        const selectWithKeyboard = (event) => {
            if (
                event.target === container &&
                !pointerFocus &&
                (event.key === "Enter" || event.key === " ")
            ) {
                event.preventDefault();
                positionAt(leafletInstance.getCenter());
            }
        };
        container.addEventListener("pointerdown", usePointer, true);
        document.addEventListener("keydown", useKeyboard, true);
        leafletInstance.on("click", selectPoint);
        leafletInstance.on("dblclick", cancelDoubleClick);
        container.addEventListener("pointerdown", startDirectionPointer);
        container.addEventListener("pointermove", followDirectionPointer);
        container.addEventListener("pointerup", finishDirectionPointer);
        container.addEventListener("pointercancel", finishDirectionPointer);
        container.addEventListener("touchstart", startDirectionTouch);
        container.addEventListener("touchmove", followDirectionTouch, {
            passive: false,
        });
        container.addEventListener("touchend", finishDirectionTouch, {
            passive: false,
        });
        container.addEventListener("touchcancel", finishDirectionTouch);
        container.addEventListener("keydown", selectWithKeyboard);
        return () => {
            cancelPendingPoint();
            setDraggingJumpRunDirection(false);
            container.removeEventListener("pointerdown", usePointer, true);
            document.removeEventListener("keydown", useKeyboard, true);
            leafletInstance.off("click", selectPoint);
            leafletInstance.off("dblclick", cancelDoubleClick);
            container.removeEventListener("pointerdown", startDirectionPointer);
            container.removeEventListener(
                "pointermove",
                followDirectionPointer,
            );
            container.removeEventListener("pointerup", finishDirectionPointer);
            container.removeEventListener(
                "pointercancel",
                finishDirectionPointer,
            );
            container.removeEventListener("touchstart", startDirectionTouch);
            container.removeEventListener("touchmove", followDirectionTouch);
            container.removeEventListener("touchend", finishDirectionTouch);
            container.removeEventListener("touchcancel", finishDirectionTouch);
            container.removeEventListener("keydown", selectWithKeyboard);
        };
    }, [leafletInstance, placingJumpRunDirection]);

    const { data, time, winds, averageWind, ground, freefallWinds } =
        getMapWindData(now);
    const jumpRunVelocity = getJumpRunVelocity(freefallWinds, jumpRunSettings);
    const jumperStarts =
        jumpRunStart && jumpRunVelocity
            ? Array.from({ length: jumperCount }, (_, index) =>
                  latLng(
                      jumpRunCoordinates(
                          jumpRunStart,
                          jumpRunSettings,
                          index,
                          jumpRunVelocity.ground,
                      ),
                  ),
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
    }, [
        leafletInstance,
        jumpRunStart,
        jumpRunSettings,
        jumperCount,
        data,
        time,
        now,
    ]);
    useEffect(() => {
        /** @type {Array<FreefallDriftArrow & { exitVelocity?: WindVector }>} */
        const arrows = jumperStarts.map((start, index) => ({
            start,
            exitHeight: jumpRunSettings.exitHeight,
            openingHeight:
                jumpers[index]?.openingHeight ?? DEFAULT_JUMPER.openingHeight,
            speedKmh: jumpers[index]?.speedKmh ?? DEFAULT_JUMPER.speedKmh,
            exitVelocity: jumpRunVelocity?.air,
        }));
        if (
            !leafletInstance ||
            activeLeafletRef.current !== leafletInstance ||
            !arrows.length
        ) {
            setDriftMissing(false);
            return;
        }
        const layers = layerGroup().addTo(leafletInstance);
        const forecastWinds = getMapWindData(now).freefallWinds;
        const lines = arrows.flatMap((settings) => {
            const path = getFreefallDrift(
                forecastWinds,
                settings.exitHeight,
                settings.speedKmh,
                settings.openingHeight,
                settings.exitVelocity,
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
        setDriftMissing(lines.length < arrows.length);
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
        jumpers,
        data,
        time,
        now,
        jumpRunStart,
        jumpRunSettings,
        jumperCount,
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
                    driftMissing
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
                    jumpRunStart && !jumpRunVelocity
                        ? html`
                              <p class="jump-run-unavailable" role="status">
                                  ${t("map.jumpRunUnavailable")}
                              </p>
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
                        jumpRun: {
                            settings: jumpRunSettings,
                            defaultJumperCount,
                            jumpers,
                            nextJumper,
                            onNextJumperChange: setNextJumper,
                            onJumpersChange: setJumpers,
                            onChange: applyJumpRunSettings,
                            onDefaultJumperCountChange: (count) =>
                                navigateQs(
                                    { default_jump_group_count: String(count) },
                                    { replace: true },
                                ),
                            directionActive: placingJumpRunDirection,
                            canAim: !!jumpRunStart,
                            onToggleDirection: () => {
                                if (
                                    !placingJumpRunDirection &&
                                    !openingTargetRef.current &&
                                    jumpRunStart
                                ) {
                                    const pivot = openingTargetForRun(
                                        jumpRunStart,
                                        jumpRunSettings,
                                        jumpers,
                                        getMapWindData(now).freefallWinds,
                                    );
                                    if (pivot) openingTargetRef.current = pivot;
                                }
                                setPlacingJumpRunDirection((active) => !active);
                            },
                            onAdd: () =>
                                setJumpers((current) => [
                                    ...current,
                                    { ...nextJumper },
                                ]),
                        },
                        arrowCount: jumpRunStart ? Math.max(1, jumperCount) : 0,
                        onClear: () => {
                            openingTargetRef.current = null;
                            setJumpRunStart(null);
                            setPlacingJumpRunDirection(false);
                            setJumpers([{ ...DEFAULT_JUMPER }]);
                        },
                        onUndo: () => {
                            if (jumperCount > 1)
                                setJumpers((current) => current.slice(0, -1));
                            else {
                                openingTargetRef.current = null;
                                setJumpRunStart(null);
                                setPlacingJumpRunDirection(false);
                            }
                        },
                    })}
                    <div
                        class=${`map-viewport${placingJumpRunDirection ? " direction-setting" : ""}`}
                    >
                        ${
                            placingJumpRunDirection
                                ? html`
                                      ${
                                          !draggingJumpRunDirection
                                              ? html`
                                                    <div
                                                        class="direction-hint"
                                                        role="status"
                                                    >
                                                        ${t("map.directionPrompt")}
                                                    </div>
                                                `
                                              : null
                                      }
                                      <svg
                                          class="direction-border"
                                          aria-hidden="true"
                                      >
                                          <rect x="1.5" y="1.5" />
                                      </svg>
                                  `
                                : null
                        }
                        <div
                            class=${`dz-map ${scope.end}`}
                            ref=${mapRef}
                            style=${{ touchAction: fullWindow || placingJumpRunDirection ? "none" : "pan-y" }}
                            role="region"
                            aria-label=${t("map.onMap", name)}
                        >
                            ${mapLayerScope.style}
                            ${!coordinates ? t("common.waitingCoordinates") : null}
                        </div>
                        <span class="jump-run-target" aria-hidden="true"></span>
                        ${coordinates ? h(MapWindOverlay, { wind: selectedWind }) : null}
                    </div>
                </div>
            </div>
        </section>
    `;
}
