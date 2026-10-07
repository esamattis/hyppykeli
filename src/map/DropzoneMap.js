// @ts-check
import { CheckboxField } from "#app/shared/FormFields.js";
import { startForAutomaticRun } from "#app/map/automaticPlacement.js";
import { holdAnimations } from "#app/app/animationState.js";
import { getCanopyDrift } from "#app/map/canopy.js";
import {
    DROPZONE_ELEVATION,
    QUERY_PARAMS,
    getQs,
    navigateQs,
} from "#app/app/settings.js";
import { Help } from "#app/shared/Help.js";
import { formatClock } from "#app/shared/dates.js";
import { isValidPosition, parseCoordinates } from "#app/shared/coordinates.js";
import { Icon, WindArrow } from "#app/shared/icons.js";
import { cardHeadingStyles, getTheme } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { DataSource } from "#app/weather/DataSource.js";
import { forecastTime } from "#app/weather/providers/openMeteo.js";
import {
    FORECAST_COORDINATES,
    LANDING_COORDINATES,
    NAME,
    STATION_COORDINATES,
    STATION_NAME,
    weatherSourceLabel,
} from "#app/weather/state.js";
import { WindBarb, windBarbKnots } from "#app/map/WindBarb.js";
import { FreefallToolbar } from "#app/map/FreefallToolbar.js";
import { MapWindOverlay } from "#app/map/MapWindOverlay.js";
import { MapCloudSummary } from "#app/map/MapCloudSummary.js";
import { MapCompass } from "#app/map/MapCompass.js";
import { MapNavigationControls } from "#app/map/MapNavigationControls.js";
import {
    driftCoordinates,
    getWindLevelsInRange,
    jumpRunCoordinates,
} from "#app/map/freefall.js";
import {
    isFiniteNumber,
    isValidJumpRunSettings,
    isValidJumper,
    useMapState,
} from "#app/map/mapState.js";
import {
    createJumpRunCalculator,
    startForOpeningTarget,
    startForRunCenter,
    openingTargetForRun,
} from "#app/map/jumpRun.js";
import { getMapWindData } from "#app/map/windData.js";
import { h, html } from "htm/preact";
import {
    circleMarker,
    DomEvent,
    latLng,
    latLngBounds,
    layerGroup,
    map,
    point,
    polyline,
    popup,
    tileLayer,
} from "leaflet";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "preact/hooks";

/** @type {Readonly<JumpRunJumper>} */
const DEFAULT_JUMPER = { speedKmh: 180, openingHeight: 800 };

/** @param {MapWindLevel} wind */
function windReading(wind) {
    const validSpeed =
        wind.speed !== null && Number.isFinite(wind.speed) && wind.speed >= 0;
    const validDirection =
        wind.direction !== null && Number.isFinite(wind.direction);
    const direction = validDirection
        ? ((wind.direction ?? 0) + 360) % 360
        : null;
    const speedLabel = validSpeed
        ? `${Math.round(wind.speed ?? 0)} m/s`
        : t("common.noData");
    const text =
        validSpeed && direction !== null
            ? `${speedLabel} ${Math.round(direction) % 360}°`
            : speedLabel;
    const graphic =
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
                        speedLabel,
                        direction,
                    ),
                })
              : h(Icon, {
                    name: "missing",
                    size: 20,
                    label: t("map.windLabelMissing", wind.label),
                });
    return { text, speedLabel, graphic };
}

export function DropzoneMap() {
    const mapLayerScope = useScope(css`
        .leaflet-bar a {
            background: var(--color-map-control);
        }
        .leaflet-bar a:hover,
        .leaflet-bar a:focus-visible {
            background: var(--color-map-control-hover);
        }
        .weather-station-callout {
            background: var(--color-surface);
            color: var(--color-text);
            border-color: var(--color-border);
            font: inherit;
        }
        .jump-run-placement .leaflet-popup-content-wrapper,
        .jump-run-placement .leaflet-popup-tip {
            background: var(--color-surface);
            color: var(--color-text);
        }
        .jump-run-placement .leaflet-popup-content > div {
            display: grid;
            gap: var(--spacing-1-5);
        }
        .jump-run-placement button {
            font: inherit;
            cursor: pointer;
            background: var(--color-map-control);
        }
        .jump-run-placement button:hover {
            background: var(--color-map-control-hover);
        }
        .jump-run-placement .leaflet-popup-tip-container {
            translate: calc(-1 * var(--placement-offset-x, 0px)) 0;
        }
        .jump-run-placement-below .leaflet-popup-tip-container {
            top: -20px;
            bottom: auto;
            transform: scaleY(-1);
        }
        .jump-run-line {
            stroke: var(--map-direction-color, var(--color-map-direction));
            animation: dropzone-map-direction-dashes 700ms linear infinite;
            animation-play-state: var(--animation-play-state, running);
        }
        .freefall-drift-line,
        .parachute-drift-line {
            opacity: 0.65;
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
            container: fullscreen-map / size;
        }
        .map-frame.full-window .dz-map {
            flex: 1;
            min-height: 0;
        }
        .map-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: var(--spacing-4);
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
        .map-errors {
            position: absolute;
            bottom: calc(80px + env(safe-area-inset-bottom));
            left: 12px;
            z-index: 700;
            max-width: min(24rem, calc(100% - 24px));
            padding: var(--spacing-2) var(--spacing-2-5);
            border: 1px solid var(--color-warning);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
            color: var(--color-text);
            box-shadow: var(--shadow-floating);
            font-size: 0.75rem;
            line-height: 1.4;
            pointer-events: none;
        }
        @media (max-width: 360px) {
            .map-errors {
                bottom: calc(122px + env(safe-area-inset-bottom));
            }
        }
        .map-errors p {
            margin: 0;
        }
        .map-errors p + p {
            margin-top: var(--spacing-1-5);
        }
        .dz-map {
            position: relative;
            min-height: 440px;
            background: var(--color-surface-hover);
        }
        .direction-setting .dz-map {
            cursor: crosshair;
        }
        .map-viewport:not(.map-visible) {
            --animation-play-state: paused;
        }
        .direction-setting {
            --map-direction-color: var(--color-map-direction);
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
            animation-play-state: var(--animation-play-state, running);
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
        .direction-hint {
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 600;
            max-width: calc(100% - 100px);
            border: 1px solid var(--color-primary);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
            color: var(--color-text);
            text-align: center;
            font-size: 0.8rem;
            pointer-events: none;
        }
        ${cardHeadingStyles}
        .card-heading {
            flex-wrap: wrap;
            align-items: center;
        }
    `);
    /** @type {import('preact').RefObject<HTMLDivElement>} */
    const mapRef = useRef(null);
    const [mapVisible, setMapVisible] = useState(false);
    /** @type {import('preact').RefObject<import('leaflet').Map | null>} */
    const activeLeafletRef = useRef(null);
    /** @type {import('preact').RefObject<(target: import('leaflet').LatLngLiteral, placement?: JumpRunPlacement) => void>} */
    const positionJumpRunAtRef = useRef(() => {});
    /** @type {import('preact').RefObject<(pointer: import('leaflet').Point) => JumpRunDirectionGesture | null>} */
    const beginDirectionDragRef = useRef(() => null);
    /** @type {import('preact').RefObject<(direction: number, center: import('leaflet').LatLngLiteral) => void>} */
    const aimJumpRunAtRef = useRef(() => {});
    /** @type {import('preact').RefObject<import('leaflet').LatLngLiteral | null>} */
    const directionCenterRef = useRef(null);
    const directionCenterKeyRef = useRef("");
    /** @type {import('preact').RefObject<import('leaflet').LatLngLiteral | null>} */
    const openingTargetRef = useRef(null);
    const openingTargetKeyRef = useRef("");
    const calculateJumpRun = useMemo(createJumpRunCalculator, []);
    const calculateAutomaticRun = useMemo(createJumpRunCalculator, []);
    const [shareError, setShareError] = useState("");
    const [now, setNow] = useState(Date.now());
    const [fullWindow, setFullWindow] = useMapState(
        "map_full_window",
        false,
        (value) => typeof value === "boolean",
    );
    const [selectedWindId, setSelectedWindId] = useMapState(
        "map_wind",
        "average",
        (value) => typeof value === "string",
    );
    const [jumpRunStart, setJumpRunStart] = useMapState(
        "map_run_start",
        /** @type {import('leaflet').LatLngLiteral | null} */ (null),
        (value) => value === null || isValidPosition(value),
    );
    const [automaticJumpRun, setAutomaticJumpRun] = useMapState(
        "map_run_automatic",
        true,
        (value) => typeof value === "boolean",
    );
    const disableAutomaticJumpRun = () => {
        if (QUERY_PARAMS.peek().map_run_automatic !== "false")
            setAutomaticJumpRun(false);
    };
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
    const [jumpRunSettings, setJumpRunSettings] = useMapState(
        "map_run_settings",
        /** @type {JumpRunSettings} */ ({
            direction: defaultJumpRunDirection,
            speedKmh: 157,
            separationSeconds: 5,
            exitHeight: 4000,
        }),
        isValidJumpRunSettings,
    );
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
    const [placementUnavailable, setPlacementUnavailable] = useState(
        /** @type {JumpRunPlacement | null} */ (null),
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
    useEffect(() => {
        const container = mapRef.current;
        if (!container) return;
        const observer = new IntersectionObserver(([entry]) => {
            setMapVisible(entry?.isIntersecting ?? false);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [coordinates]);
    const stationCoordinates = STATION_COORDINATES.value;
    const stationName = STATION_NAME.value;
    const stationLabel = t(
        stationName?.endsWith("(Digitraffic)")
            ? "map.fintrafficStation"
            : "map.fmiStation",
    );
    const landingCoordinates = LANDING_COORDINATES.value;
    const hasSeparateLandingCoordinates = !!parseCoordinates(
        QUERY_PARAMS.value.lat,
        QUERY_PARAMS.value.lon,
    );
    const name = NAME.value ?? "DZ";
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useLayoutEffect(() => {
        if (!fullWindow) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [fullWindow]);

    useLayoutEffect(() => {
        if (!fullWindow && !placingJumpRunDirection) return;
        /** @param {KeyboardEvent} event */
        const exit = (event) => {
            if (
                event.key === "Escape" &&
                !document.querySelector("dialog:modal")
            ) {
                if (placingJumpRunDirection) setPlacingJumpRunDirection(false);
                else setFullWindow(false);
            }
        };
        document.addEventListener("keydown", exit);
        return () => {
            document.removeEventListener("keydown", exit);
        };
    }, [fullWindow, placingJumpRunDirection]);

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
            zoomControl: false,
            scrollWheelZoom: false,
            touchZoom: true,
            bounceAtZoomLimits: false,
            zoomSnap: 0,
            tapHold: false,
        }).setView(center ?? [lat, lon], zoom);
        activeLeafletRef.current = leafletMap;
        setLeafletInstance(leafletMap);
        setPlacingJumpRunDirection(false);

        // Leaflet drops wheel zoom requests during its zoom animation. Tiny
        // fractional steps therefore feel slow; use its default wheel steps,
        // while keeping fractional zoom for smooth two-finger pan and pinch.
        const useWheelZoomSteps = () => {
            leafletMap.options.zoomSnap = 1;
        };
        const useTouchZoomSteps = () => {
            leafletMap.options.zoomSnap = 0;
        };
        container.addEventListener("wheel", useWheelZoomSteps, {
            capture: true,
            passive: true,
        });
        container.addEventListener("touchstart", useTouchZoomSteps, {
            capture: true,
            passive: true,
        });

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
        /** @type {(() => void) | undefined} */
        let releaseZoom;
        const pauseMapAnimations = () => {
            releaseZoom ??= holdAnimations();
        };
        const releaseMapAnimations = () => {
            releaseZoom?.();
            releaseZoom = undefined;
        };
        leafletMap.on("zoomstart", pauseMapAnimations);
        leafletMap.on("zoomend", releaseMapAnimations);
        saveView();
        const observer = new ResizeObserver(([entry]) => {
            const frame = container.closest(".map-frame");
            if (entry && frame instanceof HTMLElement) {
                frame.style.setProperty(
                    "--map-viewport-height",
                    `${entry.contentRect.height}px`,
                );
            }
            leafletMap.invalidateSize({ pan: false });
        });
        observer.observe(mapRef.current);
        return () => {
            leafletMap.off("zoomstart", pauseMapAnimations);
            leafletMap.off("zoomend", releaseMapAnimations);
            releaseMapAnimations();
            if (activeLeafletRef.current === leafletMap)
                activeLeafletRef.current = null;
            observer.disconnect();
            container.removeEventListener("wheel", useWheelZoomSteps, true);
            container.removeEventListener(
                "touchstart",
                useTouchZoomSteps,
                true,
            );
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
            leafletInstance.doubleClickZoom,
            leafletInstance.touchZoom,
            leafletInstance.boxZoom,
            leafletInstance.keyboard,
        ];
        const enabledHandlers = handlers.filter((handler) => handler.enabled());
        handlers.forEach((handler) => handler.disable());
        return () => {
            // Coordinate changes and unmounts can remove the map before this
            // cleanup runs. Only restore controls on the map still in use.
            if (activeLeafletRef.current !== leafletInstance) return;
            enabledHandlers.forEach((handler) => handler.enable());
        };
    }, [leafletInstance, placingJumpRunDirection]);

    useLayoutEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        if (fullWindow && !placingJumpRunDirection)
            leafletInstance.scrollWheelZoom.enable();
        else leafletInstance.scrollWheelZoom.disable();
    }, [leafletInstance, fullWindow, placingJumpRunDirection]);

    useEffect(() => {
        if (
            !leafletInstance ||
            activeLeafletRef.current !== leafletInstance ||
            !hasSeparateLandingCoordinates ||
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
        hasSeparateLandingCoordinates,
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

    const {
        data,
        time,
        winds,
        averageWind,
        ground,
        freefallWinds,
        canopyWinds,
    } = getMapWindData(now);
    const elevation = DROPZONE_ELEVATION.value;
    const upperWindOverride = QUERY_PARAMS.value.MANUAL_upper_winds;
    const calculation = calculateJumpRun(freefallWinds, jumpRunSettings);
    const jumpRunVelocity = calculation.velocity;
    /** @param {import('leaflet').LatLngLiteral | null} start @param {JumpRunSettings} settings @param {JumpRunJumper[]} group */
    const openingKey = (start, settings, group) =>
        JSON.stringify([start, settings, group, freefallWinds]);
    const currentOpeningTarget = () => {
        // Preserve the target across rotations, but derive it again after
        // other edits or restored URL state.
        const key = openingKey(jumpRunStart, jumpRunSettings, jumpers);
        if (key !== openingTargetKeyRef.current) {
            openingTargetRef.current = jumpRunStart
                ? openingTargetForRun(
                      jumpRunStart,
                      jumpRunSettings,
                      jumpers,
                      calculation,
                  )
                : null;
            openingTargetKeyRef.current = key;
        }
        return openingTargetRef.current;
    };
    /** @param {import('leaflet').LatLngLiteral} target @param {import('leaflet').LatLngLiteral} start @param {JumpRunSettings} settings @param {JumpRunJumper[]} group */
    const savePositionedRun = (target, start, settings, group) => {
        setPlacementUnavailable(null);
        openingTargetRef.current = { lat: target.lat, lng: target.lng };
        openingTargetKeyRef.current = openingKey(start, settings, group);
        navigateQs(
            {
                map_run_start: JSON.stringify(start),
                map_run_settings: JSON.stringify(settings),
                map_jumpers: JSON.stringify(group),
            },
            { replace: true },
        );
    };

    const placementGroup = () => {
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
        return positionedJumpers.length ? positionedJumpers : [nextJumper];
    };
    /** @param {import('leaflet').LatLngLiteral} target @param {JumpRunPlacement} [placement] */
    const positionJumpRunAt = (target, placement = "opening") => {
        if (!isValidPosition(target)) return;
        disableAutomaticJumpRun();
        const creating = !jumpRunStart;
        const settings =
            creating && !QUERY_PARAMS.value.map_run_settings
                ? { ...jumpRunSettings, direction: defaultJumpRunDirection }
                : jumpRunSettings;
        const group = placementGroup();
        const calculation = calculateJumpRun(freefallWinds, settings);
        const start =
            placement === "landing"
                ? startForAutomaticRun(
                      target,
                      settings,
                      group,
                      calculation,
                      canopyWinds,
                  )
                : placement === "center"
                  ? startForRunCenter(target, settings, group, calculation)
                  : startForOpeningTarget(target, settings, group, calculation);
        const openingTarget =
            placement === "opening"
                ? target
                : start &&
                  openingTargetForRun(start, settings, group, calculation);
        setPlacementUnavailable(start && openingTarget ? null : placement);
        if (!start || !openingTarget) return;
        savePositionedRun(openingTarget, start, settings, group);
    };
    positionJumpRunAtRef.current = positionJumpRunAt;
    // Wind directions describe where the wind comes from. Pick the end
    // of the configured axis with a headwind; keep the axis in a crosswind.
    /** @param {number} direction */
    const directionIntoWind = (direction) =>
        averageWind.speed !== null &&
        averageWind.speed > 0 &&
        averageWind.direction !== null &&
        Math.cos(((direction - averageWind.direction) * Math.PI) / 180) < -1e-10
            ? (direction + 180) % 360
            : direction;
    const intoWindDirection = directionIntoWind(defaultJumpRunDirection);
    const automaticSettings = {
        ...jumpRunSettings,
        direction: directionIntoWind(
            jumpRunStart ||
                (QUERY_PARAMS.value.map_run_settings &&
                    QUERY_PARAMS.value.map_run_start !== "null")
                ? jumpRunSettings.direction
                : defaultJumpRunDirection,
        ),
    };
    const automaticGroup = placementGroup();
    const automaticPlacementKey = JSON.stringify([
        landingCoordinates,
        automaticSettings,
        automaticGroup,
        freefallWinds,
        canopyWinds,
    ]);
    const automaticStart = useMemo(
        () =>
            landingCoordinates
                ? startForAutomaticRun(
                      landingCoordinates,
                      automaticSettings,
                      automaticGroup,
                      calculateAutomaticRun(freefallWinds, automaticSettings),
                      canopyWinds,
                  )
                : null,
        [automaticPlacementKey],
    );
    const canPositionAutomatic = !!automaticStart;
    /** @param {boolean} [preserveExistingView] */
    const positionAutomaticJumpRun = (preserveExistingView = false) => {
        const leafletMap = activeLeafletRef.current;
        if (!automaticStart || !leafletMap) return;
        setPlacingJumpRunDirection(false);
        const calculation = calculateAutomaticRun(
            freefallWinds,
            automaticSettings,
        );
        const target = openingTargetForRun(
            automaticStart,
            automaticSettings,
            automaticGroup,
            calculation,
        );
        if (!target || !calculation.velocity) return;
        savePositionedRun(
            target,
            automaticStart,
            automaticSettings,
            automaticGroup,
        );
        // Updating an existing run with the placement button keeps the user's
        // viewport, even when the updated paths extend outside it.
        if (preserveExistingView && jumpRunStart) return;
        fitJumpRunView(
            automaticStart,
            automaticSettings,
            automaticGroup,
            calculation,
            true,
        );
    };
    /**
     * Fit the current flight paths using the same view as automatic placement.
     * @param {import('leaflet').LatLngLiteral} start
     * @param {JumpRunSettings} settings
     * @param {JumpRunJumper[]} group
     * @param {JumpRunCalculation} calculation
     * @param {boolean} [animate]
     */
    const fitJumpRunView = (
        start,
        settings,
        group,
        calculation,
        animate = false,
    ) => {
        const leafletMap = activeLeafletRef.current;
        if (!leafletMap || !calculation.velocity) return;
        const bounds = latLngBounds([start]);
        if (landingCoordinates) bounds.extend(landingCoordinates);
        for (const [index, jumper] of group.entries()) {
            const exit = latLng(
                jumpRunCoordinates(
                    start,
                    settings,
                    index,
                    calculation.velocity.ground,
                ),
            );
            bounds.extend(exit);
            const freefall = calculation
                .drift(jumper)
                ?.map((offset) => driftCoordinates(exit, offset));
            for (const position of freefall ?? []) bounds.extend(position);
            const opening = freefall?.at(-1);
            if (!opening) continue;
            const canopy = getCanopyDrift(canopyWinds, jumper.openingHeight);
            for (const offset of canopy ?? [])
                bounds.extend(driftCoordinates(latLng(opening), offset));
        }
        const padding = matchMedia("(min-width: 900px)").matches ? 200 : 75;
        leafletMap.flyToBounds(bounds, {
            padding: [padding, padding],
            animate:
                animate &&
                !matchMedia("(prefers-reduced-motion: reduce)").matches,
            duration: 0.5,
        });
    };
    const canPositionView =
        !!leafletInstance && !!jumpRunStart && !!jumpRunVelocity;
    /** @param {boolean} [animate] */
    const positionView = (animate = false) => {
        if (!jumpRunStart) return;
        fitJumpRunView(
            jumpRunStart,
            jumpRunSettings,
            jumpers,
            calculation,
            animate,
        );
    };
    const previousFullWindow = useRef(fullWindow);
    useLayoutEffect(() => {
        if (previousFullWindow.current === fullWindow) return;
        previousFullWindow.current = fullWindow;
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        leafletInstance.invalidateSize({ pan: false });
        positionView();
    }, [fullWindow, leafletInstance]);
    const automaticUpdateKey = JSON.stringify([
        landingCoordinates,
        freefallWinds,
        canopyWinds,
    ]);
    const lastAutomaticUpdate = useRef(
        jumpRunStart || QUERY_PARAMS.peek().map_run_start === "null"
            ? automaticUpdateKey
            : null,
    );
    useEffect(() => {
        if (
            !automaticJumpRun ||
            !canPositionAutomatic ||
            !leafletInstance ||
            QUERY_PARAMS.peek().map_run_start === "null" ||
            lastAutomaticUpdate.current === automaticUpdateKey
        )
            return;
        lastAutomaticUpdate.current = automaticUpdateKey;
        positionAutomaticJumpRun();
    });
    beginDirectionDragRef.current = (pointer) => {
        const map = activeLeafletRef.current;
        if (!map || !jumpRunStart || !jumpers.length) return null;
        const center = jumpRunVelocity
            ? latLng(
                  jumpRunCoordinates(
                      jumpRunStart,
                      jumpRunSettings,
                      (jumpers.length - 1) / 2,
                      jumpRunVelocity.ground,
                  ),
              )
            : directionCenterKeyRef.current ===
                openingKey(jumpRunStart, jumpRunSettings, jumpers)
              ? directionCenterRef.current
              : null;
        if (!center) return null;
        const bounds = map.getContainer().getBoundingClientRect();
        let offset = pointer
            .subtract(point(bounds.left, bounds.top))
            .subtract(map.latLngToContainerPoint(center));
        // A drag starting near the pivot needs a stable rotation radius.
        if (offset.distanceTo(point(0, 0)) < 40) {
            const radians = (jumpRunSettings.direction * Math.PI) / 180;
            offset = point(Math.sin(radians) * 40, -Math.cos(radians) * 40);
        }
        return { direction: jumpRunSettings.direction, offset, center };
    };
    aimJumpRunAtRef.current = (direction, center) => {
        if (!Number.isFinite(direction)) return;
        disableAutomaticJumpRun();
        const settings = { ...jumpRunSettings, direction };
        const calculation = calculateJumpRun(freefallWinds, settings);
        // Keep the gesture's exit-sequence center fixed even when the new
        // heading changes ground speed, or passes through an infeasible track.
        const start = startForRunCenter(center, settings, jumpers, calculation);
        const opening =
            start && openingTargetForRun(start, settings, jumpers, calculation);
        // Retain the center so another drag can recover after releasing on
        // an infeasible heading, until a different edit or wind update occurs.
        directionCenterRef.current = center;
        directionCenterKeyRef.current = openingKey(
            start ?? jumpRunStart,
            settings,
            jumpers,
        );
        if (start && opening)
            savePositionedRun(opening, start, settings, jumpers);
        else setJumpRunSettings(settings);
    };
    /** @param {JumpRunJumper[]} group */
    const applyJumpers = (group) => {
        disableAutomaticJumpRun();
        if (
            !jumpRunStart ||
            !jumpRunVelocity ||
            !group.length ||
            group.length === jumpers.length
        ) {
            setJumpers(group);
            return;
        }
        // Keep the exit-sequence center fixed as its length changes.
        const [lat, lng] = jumpRunCoordinates(
            jumpRunStart,
            jumpRunSettings,
            (jumpers.length - group.length) / 2,
            jumpRunVelocity.ground,
        );
        navigateQs(
            {
                map_run_start: JSON.stringify({ lat, lng }),
                map_jumpers: JSON.stringify(group),
            },
            { replace: true },
        );
    };
    /** @param {JumpRunSettings} next */
    const applyJumpRunSettings = (next) => {
        disableAutomaticJumpRun();
        if (
            next.direction === jumpRunSettings.direction ||
            !jumpRunStart ||
            !jumpers.length
        ) {
            setJumpRunSettings(next);
            return;
        }
        // Canopy drift is independent of heading. Keeping the middle opening
        // fixed also keeps the middle predicted landing fixed as winds and
        // jumper profiles stay the same. Recalculate freefall for the new track.
        const pivot = currentOpeningTarget();
        const start = pivot
            ? startForOpeningTarget(
                  pivot,
                  next,
                  jumpers,
                  calculateJumpRun(freefallWinds, next),
              )
            : null;
        if (!start) {
            // There is no opening to derive for an infeasible heading. Retain
            // the last target so returning to a feasible heading can recover.
            openingTargetKeyRef.current = openingKey(
                jumpRunStart,
                next,
                jumpers,
            );
            setJumpRunSettings(next);
            return;
        }
        if (pivot) savePositionedRun(pivot, start, next, jumpers);
    };

    useLayoutEffect(() => {
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
        // Clicking asks to position the run, or exits direction mode without moving it.
        // Dragging rotates relative to its initial bearing around the center
        // of the exit sequence. Keep this effect independent of the run start
        // and heading so a rotation does not reset the gesture.
        const directionPlacement = placingJumpRunDirection;
        /** @type {JumpRunDirectionGesture | null} */
        let directionGesture = null;
        /** @type {import('leaflet').Point | null} */
        let pendingAim = null;
        /** @type {number | null} */
        let aimFrame = null;
        /** @param {number} x @param {number} y */
        const aimAtClientPoint = (x, y) => {
            if (!dragStart || !directionGesture) return;
            const initial = directionGesture.offset;
            const offset = initial.add(point(x, y).subtract(dragStart));
            if (offset.x === 0 && offset.y === 0) return;
            const rotation =
                Math.atan2(offset.x, -offset.y) -
                Math.atan2(initial.x, -initial.y);
            const direction =
                (((directionGesture.direction + (rotation * 180) / Math.PI) %
                    360) +
                    360) %
                360;
            aimJumpRunAtRef.current?.(direction, directionGesture.center);
        };
        const flushDirectionAim = () => {
            if (aimFrame !== null) cancelAnimationFrame(aimFrame);
            aimFrame = null;
            const target = pendingAim;
            pendingAim = null;
            if (target) aimAtClientPoint(target.x, target.y);
        };
        /** @type {import('leaflet').Point | null} */
        let dragStart = null;
        let dragMoved = false;
        let directionDragged = false;
        let pointerDrag = false;
        const finishDirectionDrag = () => {
            // Commit the last movement even when release precedes the next frame.
            flushDirectionAim();
            directionDragged = dragMoved;
            dragStart = null;
            directionGesture = null;
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
            pendingAim = point(x, y);
            if (aimFrame === null)
                aimFrame = requestAnimationFrame(flushDirectionAim);
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
            directionDragged = false;
            dragMoved = false;
            dragStart = point(event.clientX, event.clientY);
            directionGesture =
                beginDirectionDragRef.current?.(dragStart) ?? null;
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
            directionDragged = false;
            dragStart = null;
            directionGesture = null;
            dragMoved = false;
            if (!directionPlacement || event.touches.length !== 1) return;
            if (
                event.target instanceof Element &&
                event.target.closest(".leaflet-control")
            )
                return;
            const touch = event.touches[0];
            if (touch) {
                dragStart = point(touch.clientX, touch.clientY);
                directionGesture =
                    beginDirectionDragRef.current?.(dragStart) ?? null;
            }
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
            if (followDirectionDrag(touch.clientX, touch.clientY))
                event.preventDefault();
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
        /** @type {import('leaflet').Popup | null} */
        let placementCallout = null;
        /** @type {HTMLElement | null} */
        let placementContent = null;
        /** @type {Event | null} */
        let dismissedClick = null;
        const dismissPlacement = () => {
            cancelPendingPoint();
            const element = placementCallout?.getElement();
            placementCallout?.remove();
            // Leaflet fades removed popups out; their buttons must stop
            // receiving taps immediately when choosing or cancelling a point.
            element?.remove();
            placementCallout = null;
            placementContent = null;
        };
        /** @param {MouseEvent} event */
        const dismissOutside = (event) => {
            if (!placementCallout && pendingPoint === undefined) return;
            if (
                event.target instanceof Node &&
                placementContent?.contains(event.target)
            )
                return;
            dismissedClick = event;
            dismissPlacement();
        };
        /** @param {KeyboardEvent} event */
        const dismissWithKeyboard = (event) => {
            if (event.key === "Escape") dismissPlacement();
        };
        /** @param {import('leaflet').LatLngLiteral} target */
        const confirmPositionAt = (target) => {
            dismissPlacement();
            placementContent = document.createElement("div");
            /** @type {Array<[JumpRunPlacement, string]>} */
            const options = [
                ["center", t("map.centerJumpRunPosition")],
                ["opening", t("map.confirmJumpRunPosition")],
                ["landing", t("map.parachuteLandingPosition")],
            ];
            for (const [placement, label] of options) {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = label;
                button.addEventListener("click", (event) => {
                    event.stopPropagation();
                    dismissPlacement();
                    positionJumpRunAtRef.current?.(target, placement);
                });
                placementContent.append(button);
            }
            DomEvent.disableClickPropagation(placementContent);
            placementCallout = popup({
                closeButton: false,
                autoPan: false,
                className: "jump-run-placement",
                maxWidth: Math.min(300, container.clientWidth - 40),
            })
                .setLatLng(target)
                .setContent(placementContent)
                .openOn(leafletInstance);
            // Keep all three choices inside the map without panning away from
            // the selected point. Near the top edge, show the callout below it.
            const element = placementCallout.getElement();
            if (!element) return;
            const mapBounds = container.getBoundingClientRect();
            let bounds = element.getBoundingClientRect();
            const offset = point(0, 7);
            if (bounds.top < mapBounds.top + 8) {
                element.classList.add("jump-run-placement-below");
                offset.y = bounds.height + 33;
                placementCallout.options.offset = offset;
                placementCallout.update();
                bounds = element.getBoundingClientRect();
            }
            offset.x =
                Math.max(0, mapBounds.left + 8 - bounds.left) +
                Math.min(0, mapBounds.right - 8 - bounds.right);
            element.style.setProperty("--placement-offset-x", `${offset.x}px`);
            placementCallout.options.offset = offset;
            placementCallout.update();
        };
        /** @param {import('leaflet').LatLngLiteral} target */
        const positionAt = (target) => {
            if (!directionPlacement) positionJumpRunAtRef.current?.(target);
        };
        /** @param {import('leaflet').LeafletMouseEvent} event */
        const cancelDoubleClick = (event) => {
            doubleClickTimeStamp = event.originalEvent.timeStamp;
            dismissPlacement();
        };
        /** @param {import('leaflet').LeafletMouseEvent} event */
        const selectPoint = (event) => {
            if (event.originalEvent === dismissedClick) return;
            cancelPendingPoint();
            if (directionPlacement) {
                if (!directionDragged) setPlacingJumpRunDirection(false);
                return;
            }
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
                confirmPositionAt(target);
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
        document.addEventListener("click", dismissOutside, true);
        document.addEventListener("keydown", dismissWithKeyboard);
        leafletInstance.on("movestart", dismissPlacement);
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
            dismissPlacement();
            document.removeEventListener("click", dismissOutside, true);
            document.removeEventListener("keydown", dismissWithKeyboard);
            leafletInstance.off("movestart", dismissPlacement);
            if (aimFrame !== null) cancelAnimationFrame(aimFrame);
            pendingAim = null;
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
    // Keep Leaflet layers mounted across weather updates and minute ticks.
    const runLayers = useMemo(
        () => ({
            group: layerGroup(),
            line: polyline([], {
                color: getTheme().mapDirection,
                weight: 3,
                dashArray: "8 6",
                interactive: false,
                className: "jump-run-line",
            }),
            markers: /** @type {import('leaflet').CircleMarker[]} */ ([]),
        }),
        [leafletInstance],
    );
    const driftLayers = useMemo(
        () => ({
            group: layerGroup(),
            freefall: /** @type {import('leaflet').Polyline[]} */ ([]),
            canopy: /** @type {import('leaflet').Polyline[]} */ ([]),
        }),
        [leafletInstance],
    );
    useEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        runLayers.group.addTo(leafletInstance);
        driftLayers.group.addTo(leafletInstance);
        return () => {
            runLayers.group.remove();
            driftLayers.group.remove();
        };
    }, [leafletInstance, runLayers, driftLayers]);
    useEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        const { group, line, markers } = runLayers;
        if (!jumpRunStart) {
            group.clearLayers();
            markers.length = 0;
            return;
        }
        line.addTo(group);
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
        const theme = getTheme();
        jumperStarts.forEach((start, index) => {
            const isEndpoint = index === 0 || index === jumperCount - 1;
            const color =
                index === 0
                    ? theme.success
                    : index === jumperCount - 1
                      ? theme.danger
                      : theme.mapDirection;
            const options = {
                radius: isEndpoint ? 7 : 5,
                color: isEndpoint ? theme.surface : color,
                fillColor: isEndpoint ? color : theme.surface,
                fillOpacity: 1,
                weight: 2,
                interactive: false,
                className: "jump-run-jumper",
            };
            const marker = markers[index] ?? circleMarker(start, options);
            markers[index] = marker;
            marker.setLatLng(start).setStyle(options).addTo(group);
        });
        for (const marker of markers.splice(jumperStarts.length))
            group.removeLayer(marker);
        return () => {
            leafletInstance.off("moveend zoomend resize", updateLine);
        };
    }, [
        leafletInstance,
        runLayers,
        jumpRunStart,
        jumpRunSettings,
        jumperCount,
        data,
        upperWindOverride,
        elevation,
        time,
        now,
    ]);
    useEffect(() => {
        if (!leafletInstance || activeLeafletRef.current !== leafletInstance)
            return;
        const { group, freefall, canopy } = driftLayers;
        let missing = false;
        const theme = getTheme();
        jumperStarts.forEach((start, index) => {
            const jumper = jumpers[index] ?? DEFAULT_JUMPER;
            const path = calculation.drift(jumper);
            const positions =
                path?.map((offset) => driftCoordinates(start, offset)) ?? [];
            const opening = positions.at(-1);
            const canopyPath =
                opening && getCanopyDrift(canopyWinds, jumper.openingHeight);
            const canopyPositions =
                opening && canopyPath
                    ? canopyPath.map((offset) =>
                          driftCoordinates(latLng(opening), offset),
                      )
                    : [];
            missing ||= !path;
            const freefallLine =
                freefall[index] ??
                polyline([], {
                    color: theme.mapDrift,
                    weight: 3,
                    lineCap: "round",
                    interactive: false,
                    className: "freefall-drift-line",
                });
            const canopyLine =
                canopy[index] ??
                polyline([], {
                    color: theme.mapDrift,
                    weight: 1,
                    lineCap: "round",
                    interactive: false,
                    className: "parachute-drift-line",
                });
            freefall[index] = freefallLine;
            canopy[index] = canopyLine;
            freefallLine.setLatLngs(positions);
            canopyLine.setLatLngs(canopyPositions);
            if (positions.length) freefallLine.addTo(group);
            else group.removeLayer(freefallLine);
            if (canopyPositions.length) canopyLine.addTo(group);
            else group.removeLayer(canopyLine);
        });
        for (const lines of [freefall, canopy]) {
            for (const line of lines.splice(jumperStarts.length))
                group.removeLayer(line);
        }
        setDriftMissing(missing);
    }, [
        leafletInstance,
        driftLayers,
        jumpers,
        data,
        upperWindOverride,
        elevation,
        ground,
        time,
        now,
        jumpRunStart,
        jumpRunSettings,
        jumperCount,
    ]);
    const openingHeights = [...jumpers, nextJumper].map(
        (jumper) => jumper.openingHeight,
    );
    const usedHeights = new Set(
        [
            ...getWindLevelsInRange(
                freefallWinds,
                Math.min(...openingHeights),
                jumpRunSettings.exitHeight,
            ),
            ...getWindLevelsInRange(
                canopyWinds,
                0,
                Math.max(...openingHeights),
            ),
        ].map((wind) => wind.height),
    );
    const displayedWinds = winds.filter(
        (wind) =>
            wind.id === "average" ||
            (wind.id === "ground"
                ? usedHeights.has(0)
                : freefallWinds.some(
                      (level) =>
                          level === wind && usedHeights.has(level.height),
                  )),
    );
    const selectedWind =
        displayedWinds.find((wind) => wind.id === selectedWindId) ??
        averageWind;
    const selectedWindDirection =
        selectedWind.speed !== null &&
        isFiniteNumber(selectedWind.speed) &&
        selectedWind.speed > 0 &&
        selectedWind.direction !== null &&
        isFiniteNumber(selectedWind.direction) &&
        selectedWind.direction >= 0 &&
        selectedWind.direction <= 360
            ? selectedWind.direction % 360
            : null;

    const driftError = driftMissing ? t("map.driftUnavailable") : "";
    const jumpRunError =
        placementUnavailable || (jumpRunStart && !jumpRunVelocity)
            ? t(
                  placementUnavailable === "landing"
                      ? "map.automaticRunUnavailable"
                      : "map.jumpRunUnavailable",
              )
            : "";
    const previousErrorsRef = useRef(/** @type {string[]} */ ([]));
    useEffect(() => {
        const errors = [driftError, jumpRunError, shareError].filter(
            (error) => error !== "",
        );
        // Log each error when it appears, without repeating it on every drag frame.
        for (const error of errors)
            if (!previousErrorsRef.current.includes(error))
                console.error(error);
        previousErrorsRef.current = errors;
    }, [driftError, jumpRunError, shareError]);

    /** @param {boolean} checked */
    function changeAutomaticJumpRun(checked) {
        setAutomaticJumpRun(checked);
        if (checked) {
            lastAutomaticUpdate.current = null;
            if (!jumpRunStart)
                navigateQs({ map_run_start: undefined }, { replace: true });
            positionAutomaticJumpRun();
        }
    }

    return html`
        <section
            class="p-panel"
            id="dropzone-map"
            aria-label=${t("map.region")}
        >
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
                            <p>
                                <span
                                    tabindex=${averageWind.altitudeTooltip ? 0 : undefined}
                                    data-tooltip=${averageWind.altitudeTooltip}
                                >
                                    ${averageWind.label}
                                </span>
                                : ${t("map.averageHelp")}
                            </p>
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
                            <h3>${t("map.automaticHelpTitle")}</h3>
                            <p>${t("map.automaticHelp")}</p>
                            <p>${t("map.automaticLimitsHelp")}</p>
                            <p>${t("settings.altitudeReferenceHelp")}</p>
                            <h3>${t("map.positioningHelpTitle")}</h3>
                            <p>${t("map.positioningHelp")}</p>
                            <h3>${t("map.directionHelpTitle")}</h3>
                            <p>${t("map.directionControlsHelp")}</p>
                        `,
                    )}
                </h2>
                ${h(CheckboxField, {
                    className: "automatic-jump-run",
                    label: t("map.automaticUpdate"),
                    checked: automaticJumpRun,
                    onCheckedChange: changeAutomaticJumpRun,
                })}
                ${h(DataSource, {
                    sources: [
                        "Open-Meteo",
                        ground ? weatherSourceLabel(ground.source) : null,
                    ],
                })}
            </div>
            <div class="map-layout">
                <div class=${`map-frame${fullWindow ? " full-window" : ""}`}>
                    ${h(FreefallToolbar, {
                        fullWindow,
                        automaticJumpRun,
                        onAutomaticJumpRunChange: changeAutomaticJumpRun,
                        canPosition: canPositionAutomatic,
                        onPosition: () => positionAutomaticJumpRun(true),
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
                        jumpRunLengthMeters:
                            jumpRunStart && jumpRunVelocity && jumperCount > 0
                                ? Math.hypot(
                                      jumpRunVelocity.ground.east,
                                      jumpRunVelocity.ground.north,
                                  ) *
                                  jumpRunSettings.separationSeconds *
                                  (jumperCount - 1)
                                : null,
                        jumpRun: {
                            settings: jumpRunSettings,
                            defaultJumperCount,
                            jumpers,
                            nextJumper,
                            onNextJumperChange: setNextJumper,
                            onJumpersChange: applyJumpers,
                            onChange: applyJumpRunSettings,
                            onDefaultJumperCountChange: (count) =>
                                navigateQs(
                                    { default_jump_group_count: String(count) },
                                    { replace: true },
                                ),
                            directionActive: placingJumpRunDirection,
                            canAim: !!jumpRunStart,
                            selectedWindDirection,
                            onResetDirection: () => {
                                setPlacingJumpRunDirection(false);
                                applyJumpRunSettings({
                                    ...jumpRunSettings,
                                    direction: intoWindDirection,
                                });
                            },
                            onToggleDirection: () => {
                                setPlacingJumpRunDirection((active) => !active);
                            },
                            onAdd: () =>
                                applyJumpers([...jumpers, { ...nextJumper }]),
                        },
                        windLevels: {
                            levels: displayedWinds.map((wind) => {
                                const reading = windReading(wind);
                                return {
                                    id: wind.id,
                                    heightLabel:
                                        wind.id === "ground"
                                            ? "0 m"
                                            : wind.label
                                                  .replace(/^≈ /, "")
                                                  .replace("-", "–\n"),
                                    altitudeTooltip: wind.altitudeTooltip,
                                    label: wind.label,
                                    text: reading.text,
                                    speedLabel: reading.speedLabel,
                                    knots: windBarbKnots(wind.speed),
                                    arrow: reading.graphic,
                                    graphic: h(WindBarb, {
                                        speed: wind.speed,
                                        direction: wind.direction,
                                    }),
                                    selected: wind.id === selectedWind.id,
                                };
                            }),
                            onSelect: setSelectedWindId,
                        },
                        arrowCount: jumpRunStart ? Math.max(1, jumperCount) : 0,
                        onClear: () => {
                            disableAutomaticJumpRun();
                            setPlacementUnavailable(null);
                            openingTargetRef.current = null;
                            setJumpRunSettings({
                                ...jumpRunSettings,
                                direction: defaultJumpRunDirection,
                            });
                            setJumpRunStart(null);
                            setPlacingJumpRunDirection(false);
                            setJumpers([{ ...DEFAULT_JUMPER }]);
                        },
                        onUndo: () => {
                            disableAutomaticJumpRun();
                            if (jumperCount > 1)
                                applyJumpers(jumpers.slice(0, -1));
                            else {
                                openingTargetRef.current = null;
                                setJumpRunSettings({
                                    ...jumpRunSettings,
                                    direction: defaultJumpRunDirection,
                                });
                                setJumpRunStart(null);
                                setPlacingJumpRunDirection(false);
                            }
                        },
                    })}
                    <div
                        class=${`map-viewport${mapVisible ? " map-visible" : ""}${placingJumpRunDirection ? " direction-setting" : ""}`}
                    >
                        ${
                            driftError || jumpRunError || shareError
                                ? html`
                                      <div class="map-errors" role="status">
                                          ${
                                              driftError
                                                  ? html`
                                                        <p
                                                            class="freefall-drift-summary"
                                                        >
                                                            ${driftError}
                                                        </p>
                                                    `
                                                  : null
                                          }
                                          ${
                                              jumpRunError
                                                  ? html`
                                                        <p
                                                            class=${`jump-run-unavailable${placementUnavailable === "landing" ? " automatic-run-unavailable" : ""}`}
                                                        >
                                                            ${jumpRunError}
                                                        </p>
                                                    `
                                                  : null
                                          }
                                          ${
                                              shareError
                                                  ? html`
                                                        <p>${shareError}</p>
                                                    `
                                                  : null
                                          }
                                      </div>
                                  `
                                : null
                        }
                        ${
                            placingJumpRunDirection
                                ? html`
                                      ${
                                          !draggingJumpRunDirection
                                              ? html`
                                                    <div
                                                        class="direction-hint py-2 px-3"
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
                        ${coordinates ? h(MapWindOverlay, { wind: selectedWind }) : null}
                        ${fullWindow ? h(MapCloudSummary, {}) : null}
                        ${fullWindow ? h(MapCompass, {}) : null}
                        ${h(MapNavigationControls, {
                            map: leafletInstance,
                            zoom,
                            disabled: placingJumpRunDirection,
                            canFit: canPositionView,
                            onFit: () => positionView(true),
                        })}
                    </div>
                </div>
            </div>
        </section>
    `;
}
