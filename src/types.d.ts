interface WakeLockToggleProps {
    compact?: boolean;
}

type Signal<T> = import("@preact/signals").Signal<T>;
type ReadonlySignal<T> = import("@preact/signals").ReadonlySignal<T>;

type ButtonProps = import("preact").JSX.IntrinsicElements["button"] & {
    "data-tooltip"?: string;
};

interface GeographicPosition {
    lat: number;
    lng: number;
}

type TranslationCatalog<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => string
        ? (...args: A) => string
        : string;
};

type TranslationArgs<T> = T extends (...args: infer A) => string ? A : [];

interface WindRange {
    min: number;
    max: number;
}

interface CompassWindSample {
    time: Date;
    gust: number;
    direction: number;
}

interface OpenMeteoWeatherData {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    hourly_units: OpenMeteoHourlyUnits;
    hourly: OpenMeteoHourlyData;
}

interface OpenMeteoHourlyUnits {
    time: string;
    wind_speed_10m: string;
    wind_gusts_10m: string;
    windspeed_1000hPa: string;
    windspeed_925hPa: string;
    windspeed_850hPa: string;
    windspeed_700hPa: string;
    windspeed_600hPa: string;
    windspeed_500hPa: string;
    windspeed_400hPa: string;
    winddirection_1000hPa: string;
    winddirection_925hPa: string;
    winddirection_850hPa: string;
    winddirection_700hPa: string;
    winddirection_600hPa: string;
    winddirection_500hPa: string;
    winddirection_400hPa: string;
}

type OpenMeteoPressureLevel =
    | "1000"
    | "925"
    | "850"
    | "700"
    | "600"
    | "500"
    | "400";

type OpenMeteoCloudPressureLevel = Exclude<
    OpenMeteoPressureLevel,
    "400" | "500"
>;

interface MapWindLevel {
    label: string;
    speed: number | null;
    direction: number | null;
}

interface SelectableMapWindLevel extends MapWindLevel {
    altitudeTooltip?: string;
    id: string;
}

interface MapAltitudeWindLevel
    extends SelectableMapWindLevel, FreefallWindLevel {}

interface AutomaticOpeningCheck {
    index: number;
    opening: FreefallDriftPoint;
    directions: WindVector[];
}

interface OpeningWindConstraint {
    direction: WindVector;
    minimum: number;
}

interface FreefallWindLevel extends MapWindLevel {
    height: number;
}

interface WindVector {
    east: number;
    north: number;
}

interface JumpRunVelocity {
    air: WindVector;
    ground: WindVector;
}

interface FreefallDriftPoint extends WindVector {
    height: number;
}

interface FreefallMotion extends FreefallDriftPoint {
    eastSpeed: number;
    northSpeed: number;
    downSpeed: number;
}

interface FreefallDriftArrow {
    start: import("leaflet").LatLngLiteral;
    exitHeight: number;
    openingHeight: number;
    speedKmh: number;
}

interface JumpRunJumper {
    speedKmh: number;
    openingHeight: number;
}

interface JumpRunJumperDraft {
    speedKmh: string;
    openingHeight: string;
}

interface JumpRunDirectionGesture {
    direction: number;
    offset: import("leaflet").Point;
    center: import("leaflet").LatLngLiteral;
}

type JumpRunPlacement = "opening" | "center" | "landing";

interface JumpRunSettings {
    exitHeight: number;
    direction: number;
    speedKmh: number;
    separationSeconds: number;
    wingsuitGlideRatio: number;
    wingsuitDescentRateMps: number;
    canopyGlideRatio: number;
    canopyDescentRateMps: number;
}

interface CanopyReachArea extends WindVector {
    radius: number;
}

interface ReachAreasProps {
    kind?: "canopy" | "wingsuit";
    map: import("leaflet").Map | null;
    target: import("leaflet").LatLngLiteral | null;
    winds: FreefallWindLevel[];
    openingHeights: number[];
    settings: JumpRunSettings;
    satellite: boolean;
}

interface JumpRunControlsProps {
    settings: JumpRunSettings;
    defaultJumperCount: number;
    jumpers: JumpRunJumper[];
    nextJumper: JumpRunJumper;
    onNextJumperChange: (
        jumper: JumpRunJumper | ((current: JumpRunJumper) => JumpRunJumper),
    ) => void;
    onJumpersChange: (jumpers: JumpRunJumper[]) => void;
    onChange: (settings: JumpRunSettings) => void;
    onDefaultJumperCountChange: (count: number) => void;
    directionActive: boolean;
    canAim: boolean;
    selectedWindDirection: number | null;
    onToggleDirection: () => void;
    onResetDirection: () => void;
    onAdd: () => void;
}

interface JumpRunPositionControlsProps extends JumpRunControlsProps {
    arrowCount: number;
    onUndo: () => void;
    canPosition: boolean;
    onPosition: () => void;
    children?: import("preact").ComponentChildren;
}

interface ToolbarWindLevel {
    altitudeTooltip?: string;
    heightLabel: string;
    speedLabel: string;
    id: string;
    label: string;
    text: string;
    knots: number | null;
    graphic: import("preact").ComponentChildren;
    arrow: import("preact").ComponentChildren;
    selected: boolean;
}

interface FreefallToolbarProps {
    errors: string[];
    automaticJumpRun: boolean;
    onAutomaticJumpRunChange: (checked: boolean) => void;
    canPosition: boolean;
    onPosition: () => void;
    fullWindow: boolean;
    onToggleFullWindow: () => void;
    onShare: () => void;
    jumpRun: JumpRunControlsProps;
    jumpRunLengthMeters: number | null;
    openingDistances: (number | null)[];
    freefallDistances: (number | null)[];
    canopyDistances: (number | null)[];
    canopyReach: import("preact").ComponentChildren;
    wingsuitReach: import("preact").ComponentChildren;
    arrowCount: number;
    onClear: () => void;
    onUndo: () => void;
    windLevels: {
        levels: ToolbarWindLevel[];
        onSelect: (id: string) => void;
    };
}

interface MapNavigationControlsProps {
    fullWindow: boolean;
    map: import("leaflet").Map | null;
    zoom: number;
    satellite: boolean;
    onToggleSatellite: () => void;
    disabled: boolean;
    canFit: boolean;
    onFit: () => void;
    canFocusStation: boolean;
    onFocusStation: () => void;
}

interface MapWindMotion {
    x: number;
    y: number;
    pixelsPerSecond: number;
    length: number;
}

interface MapWindParticle {
    x: number;
    y: number;
    anchorX: number;
    anchorY: number;
    slot: number;
    age: number;
    lifetime: number;
}

interface ForecastAltitudeProps {
    height: number;
    reference: string;
    approximate?: boolean;
}

interface OpenMeteoCloudProfile {
    time: Date;
    layers: {
        pressure: OpenMeteoPressureLevel;
        cover: number;
        /** Height above the configured dropzone, in metres. */
        height: number;
    }[];
}

type OpenMeteoCloudHourlyData = {
    [
        Field in
            | `cloud_cover_${OpenMeteoCloudPressureLevel}hPa`
            | `geopotential_height_${OpenMeteoPressureLevel}hPa`
    ]: (number | null)[];
};

interface OpenMeteoHourlyData extends OpenMeteoCloudHourlyData {
    time: string[];
    windspeed_1000hPa: number[];
    windspeed_925hPa: number[];
    windspeed_850hPa: number[];
    windspeed_700hPa: number[];
    windspeed_600hPa: number[];
    windspeed_500hPa: number[];
    windspeed_400hPa: number[];
    winddirection_1000hPa: number[];
    winddirection_925hPa: number[];
    winddirection_850hPa: number[];
    winddirection_700hPa: number[];
    winddirection_600hPa: number[];
    winddirection_500hPa: number[];
    winddirection_400hPa: number[];
    wind_speed_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    temperature_2m: (number | null)[];
    dew_point_2m: (number | null)[];
    precipitation_probability: (number | null)[];
    cloud_cover_low: (number | null)[];
    cloud_cover_mid: (number | null)[];
}

interface FormattedTableData {
    pressureLevels: {
        pressure: string;
        height: string;
    }[];
    todayData: Record<string, AverageWindSpeeds>;
    tomorrowData: Record<string, AverageWindSpeeds>;
}

type AverageWindSpeeds = {
    [key: string]: {
        altitude?: number | null;
        speed: number | null;
        direction: number | null;
    };
};

type OpenMeteoDayData = Record<
    string,
    {
        data: AverageWindSpeeds;
        isCurrentBlock: boolean;
    }
>;

interface WindTableDay {
    title: string;
    tableData: OpenMeteoDayData;
    isToday: boolean;
    isPast?: boolean;
    id?: string;
}

/**
 * Interface representing weather data.
 */
interface WeatherData {
    source: "metar" | "fmi" | "roads" | "openmeteo" | "forecast" | "mock";
    gust?: number;
    speed?: number;
    direction?: number;
    temperature?: number;
    dewPoint?: number;
    rain?: number;
    lowCloudCover?: number;
    middleCloudCover?: number;
    middleOnlyCloudCover?: number;
    highCloudCover?: number;
    totalCloudCover?: number;
    time: Date;
}

/**
 * Interface representing a cloud layer.
 */
interface CloudLayer {
    metarCode?: string;
    cumulonimbus?: boolean;
    base: number;
    amount: string;
    unit: string;
    href?: string;
}

/**
 * Interface representing METAR data.
 */
type MetarPhenomenon =
    | "thunderstorm"
    | "freezing"
    | "rain"
    | "snow"
    | "hail"
    | "icePellets"
    | "fog"
    | "mist";

interface MetarData {
    clouds: CloudLayer[];
    phenomena: MetarPhenomenon[];
    temperature: number;
    dewpoint?: number;
    wind: {
        direction: number | "VRB";
        gust: number | undefined;
        speed: number;
        unit: string;
    };
    metar: string;
    cbWithoutLayer: boolean;
    time: Date;
    elevation?: number;
}

/**
 * Interface representing query parameters.
 */
type MapQueryKey = Extract<keyof QueryParams, `map_${string}`>;
interface MapStateValues {
    map_satellite: boolean;
    map_zoom: number;
    map_center_lat: number | null;
    map_center_lon: number | null;
    map_full_window: boolean;
    map_wind: string;
    map_run_start: import("leaflet").LatLngLiteral | null;
    map_run_automatic: boolean;
    map_jumpers: JumpRunJumper[];
    map_next_jumper: JumpRunJumper;
    map_run_settings: JumpRunSettings;
}
type MapStateKey = keyof MapStateValues;

interface QueryParams {
    map_satellite?: string;
    map_zoom?: string;
    map_center_lat?: string;
    map_center_lon?: string;
    map_full_window?: string;
    map_wind?: string;
    map_run_start_lat?: string;
    map_run_start_lon?: string;
    map_run_automatic?: string;
    /** Semicolon-separated speed in km/h, opening height in metres above DZ. */
    map_jumpers?: string;
    map_next_jumper_speed?: string;
    map_next_jumper_opening_height?: string;
    map_run_direction?: string;
    /** Aircraft true airspeed in km/h. */
    map_run_speed?: string;
    /** Exit separation in seconds. */
    map_run_separation?: string;
    /** Exit height in metres above the dropzone. */
    map_run_exit_height?: string;
    /** Still-air canopy glide ratio (horizontal distance / height lost). */
    map_canopy_glide_ratio?: string;
    /** Still-air wingsuit glide ratio. */
    map_wingsuit_glide_ratio?: string;
    /** Wingsuit vertical descent speed in metres per second. */
    map_wingsuit_descent_rate?: string;
    /** Canopy vertical descent speed in metres per second. */
    map_canopy_descent_rate?: string;
    MANUAL_ground_obs?: string;
    MANUAL_metar?: string;
    MANUAL_upper_winds?: string;
    __gusts?: string;
    __speeds?: string;
    __directions?: string;
    fmisid?: string;
    roadsid?: string;
    icaocode?: string;
    lat?: string;
    lon?: string;
    elevation?: string;
    default_jump_run_direction?: string;
    default_jump_group_count?: string;
    name?: string;
    save?: string;
}

type ManualKey = Extract<keyof QueryParams, `MANUAL_${string}`>;

interface ManualObservation {
    gust?: number;
    speed?: number;
    direction?: number;
    age: number;
}

interface ManualUpperWindInput {
    pressure?: OpenMeteoPressureLevel;
    /** Metres above the dropzone; empty values use the forecast height. */
    height: string;
    speed: string;
    direction: string;
}

interface ManualObservationInput {
    gust: string;
    speed: string;
    direction: string;
    age: number;
}

/**
 * FMI stored query names
 */
type StoredQuery =
    | "fmi::avi::observations::iwxxm"
    | "fmi::observations::weather::timevaluepair"
    | "fmi::forecast::edited::weather::scandinavia::point::timevaluepair";

interface FlykMetar {
    type: string;
    features: FlykMetarFeature[];
}

interface FlykMetarFeature {
    type: string;
    geometry: FlykMetarGeometry;
    properties: FlykMetarProperties;
}

interface FlykMetarGeometry {
    type: string;
    coordinates: number[];
}

interface FlykMetarProperties {
    text: string;
    code: string;
    day: number;
    date: string;
    time: string;
    auto: boolean;
    wind: number;
    windDirection: number;
    visibility: string;
    temp: number;
    dewpoint: number;
    pressure: number;
    humidity: number;
    cavok: boolean;
    cloudiness: string;
    cloudbase: number;
    cloudbaseMeters: number;
    higherClouds: any[];
    ceiling: {
        code: string;
        feet_agl: number;
        meters_agl: number;
    };
    lat: number;
    lng: number;
    parsed: string;
    name: string;
    textOffset: number[];
    iconImage: string;
}

interface MetarAbbreviation {
    abbreviation: string;
    meaning: string;
}

interface MetarCloud extends MetarAbbreviation {
    metarCode: string;
    altitude: number | null;
    cumulonimbus: boolean;
}

interface MetarRunwayVisibility {
    runway: string;
    direction?: string;
    seperator: string;
    minIndicator?: string;
    minValue: string;
    variableIndicator?: string;
    maxIndicator?: string;
    maxValue?: string;
    trend?: string;
    unitsOfMeasure?: string;
}

interface MetarJSResponse {
    type: "METAR" | "SPECI";
    correction: boolean | string;
    station: string;
    time: Date;
    auto: boolean;
    wind: {
        speed: number | null;
        gust: number | null;
        direction: number | "VRB" | null;
        variation: boolean | { min: number; max: number } | null;
        unit: string;
    };
    cavok: boolean;
    cbWithoutLayer: boolean;
    visibility: number | null;
    visibilityVariation: string | null;
    visibilityVariationDirection: string | null;
    weather: MetarAbbreviation[] | null;
    clouds: MetarCloud[] | null;
    temperature: number | null;
    dewpoint: number | null;
    altimeterInHpa: number | null;
    altimeterInHg: number | null;
    recentSignificantWeather: string | null;
    recentSignificantWeatherDescription: string | null;
    rvr: MetarRunwayVisibility | null;
}

interface RoadSensorValue {
    id: number;
    stationId: number;
    name: string;
    shortName: string;
    measuredTime: string;
    value: number;
    unit: string;
}

interface RoadStationObservations {
    id: number;
    dataUpdatedTime: string;
    sensorValues: RoadSensorValue[];
}

interface RoadStationHistory {
    id: string;
    dataUpdatedTime: string;
    values: RoadStationHistoryValue[];
}

interface RoadStationHistoryValue {
    id: number;
    stationId: number;
    measuredTime: string;
    value: number;
}

interface RoadStations {
    type: string;
    dataUpdatedTime: string;
    features: {
        type: string;
        id: number;
        geometry: {
            type: string;
            coordinates: [number, number, number];
        };
        properties: {
            id: number;
            name: string;
            collectionStatus: string;
            state: string | null;
            dataUpdatedTime: string;
        };
    }[];
}
interface RoadStationInfoDetailed {
    type: string;
    id: number;
    geometry: {
        type: string;
        coordinates: [number, number, number];
    };
    properties: {
        id: number;
        name: string;
        collectionStatus: string;
        state: string | null;
        dataUpdatedTime: string;
        collectionInterval: number;
        names: {
            fi: string;
            sv: string;
            en: string;
        };
        roadAddress: {
            roadNumber: number;
            roadSection: number;
            distanceFromRoadSectionStart: number;
            carriageway: string;
            side: string;
            contractArea: string;
            contractAreaCode: number;
        };
        liviId: string;
        country: string | null;
        startTime: string;
        repairMaintenanceTime: string | null;
        annualMaintenanceTime: string | null;
        purpose: string | null;
        municipality: string;
        municipalityCode: number;
        province: string;
        provinceCode: number;
        stationType: string;
        master: boolean;
        sensors: number[];
    };
}

interface CSSScope {
    end: string;
    style: import("preact").VNode;
}

interface LandingDropzone {
    /** Map location for dropzones whose URLs use station-derived coordinates. */
    mapCoordinates?: [number, number];
    name: string;
    qs: { [Key in keyof QueryParams]?: string | number };
    description: string | (() => string);
}

type ThemePreference = "system" | "light" | "dark";

interface IconProps {
    name:
        | "weatherStation"
        | "screenAwake"
        | "separation"
        | "monitor"
        | "sun"
        | "moon"
        | "plane"
        | "plus"
        | "minus"
        | "settings"
        | "share"
        | "expand"
        | "fitView"
        | "globe"
        | "collapse"
        | "close"
        | "warning"
        | "help"
        | "table"
        | "up"
        | "chart"
        | "wind"
        | "windLevels"
        | "compass"
        | "pen"
        | "undo"
        | "trash"
        | "menu"
        | "location"
        | "heading"
        | "rotateClockwise"
        | "rotateCounterclockwise"
        | "lightning"
        | "storm"
        | "arrow"
        | "calm"
        | "missing"
        | "cloudClear"
        | "cloudNsc"
        | "cloudFew"
        | "cloudScattered"
        | "cloudBroken"
        | "cloudOvercast"
        | "cloudRain"
        | "cloudSnow"
        | "cloudHail"
        | "cloudIcePellets"
        | "cloudMist"
        | "freezing"
        | "cloudFog";
    size?: number | string;
    label?: string;
    className?: string;
    rotation?: number;
}

interface WindArrowProps {
    direction: number | null | undefined;
    size?: number | string;
    label?: string;
}

interface CloudTypeDetails {
    label: string;
    icon: IconProps["name"];
    coverage: string;
    explanation: string;
}

interface ManualModeHandle {
    open: () => void;
}

interface FreefallFieldsProps {
    children?: import("preact").ComponentChildren;
    exitHeight: number;
    openingDraft: string;
    speedDraft: string;
    openingRef?: import("preact").RefObject<HTMLInputElement>;
    tableCells?: boolean;
    onDraftChange: (field: keyof JumpRunJumper, value: string) => void;
    onChange: (field: keyof JumpRunJumper, value: number) => void;
}

interface FormFieldProps {
    id: string;
    label?: import("preact").ComponentChildren;
    help?: import("preact").ComponentChildren;
    layout?: "compact" | "stacked" | "plain";
    className?: string;
    labelClassName?: string;
    children?: import("preact").ComponentChildren;
}

interface FieldHelpProps {
    title: string;
    tooltip?: string;
    wide?: boolean;
    children?: import("preact").ComponentChildren;
}

type NumberInputProps = Omit<
    import("preact").JSX.InputHTMLAttributes<HTMLInputElement>,
    "type" | "onInput" | "ref"
> & {
    inputRef?: import("preact").Ref<HTMLInputElement>;
    onDraftChange?: (value: string) => void;
    onValueChange?: (value: number, input: HTMLInputElement) => void;
    onInput?: import("preact").JSX.InputEventHandler<HTMLInputElement>;
};

type CheckboxFieldProps = Omit<
    import("preact").JSX.InputHTMLAttributes<HTMLInputElement>,
    "type" | "class" | "className" | "children" | "onChange"
> & {
    label: import("preact").ComponentChildren;
    className?: string;
    onCheckedChange?: (checked: boolean) => void;
};

interface ClearableInputProps {
    required?: boolean;
    name: string;
    id?: string;
    label: string;
    "aria-label"?: string;
    placeholder?: string;
    value: string;
    type?: "text" | "number";
    step?: string;
    min?: number;
    max?: number;
    onInput: import("preact").JSX.InputEventHandler<HTMLInputElement>;
    onClear: () => void;
    onPaste?: import("preact").JSX.ClipboardEventHandler<HTMLInputElement>;
}

interface SpeedPresetsProps {
    onSelect: (speedKmh: number) => void;
}

interface ToolbarButtonProps {
    showTooltip?: boolean;
    label: string;
    icon: IconProps["name"];
    size?: IconProps["size"];
    className?: string;
    pressed?: boolean;
    disabled?: boolean;
    hasPopup?: "dialog" | "menu";
    expanded?: boolean;
    controls?: string;
    popoverTarget?: string;
    onClick?: () => void;
}

interface DropdownMenuItem {
    label: string;
    icon: IconProps["name"];
    size?: IconProps["size"];
    disabled?: boolean;
    /** Set for a checkable action. Omit for a normal action. */
    pressed?: boolean;
    /** Close the menu after selection. Defaults to true. */
    closeOnSelect?: boolean;
    onSelect: () => void;
}

interface DropdownMenuProps {
    id?: string;
    label: string;
    icon?: IconProps["name"];
    size?: IconProps["size"];
    disabled?: boolean;
    /** Pressed style for the trigger, separate from whether the menu is open. */
    pressed?: boolean;
    items?: DropdownMenuItem[];
    menuClass?: string;
    /** Replaces the icon trigger. The accessible name stays `label`. */
    trigger?: import("preact").ComponentChildren;
    children?: import("preact").ComponentChildren;
}

interface DataSourceProps {
    sources?: Array<string | null | undefined>;
    children?: import("preact").ComponentChildren;
    plural?: boolean;
}

interface FmiRequestOptions {
    forceFetch?: boolean;
    signal?: AbortSignal;
    cacheOnly?: boolean;
    onCacheStatus?: (stale: boolean) => void;
    onLoading: (delta: number) => void;
}

interface FmiForecastOptions extends FmiRequestOptions {
    range: number;
}

interface FmiObservationOptions extends FmiRequestOptions {
    startTime: Date;
}

interface JumpRunCalculation {
    velocity: JumpRunVelocity | null;
    drift: (jumper: JumpRunJumper) => FreefallDriftPoint[] | null;
}

interface ResponseCachePolicy<T> {
    key?: string;
    maxFetchAgeMs?: number;
    measurementMaxAgeMs?: number;
    minFetchIntervalMs: number;
    measurementTime?: (data: T) => number;
}

interface CachedFetchOptions<T> {
    forceFetch?: boolean;
    onLoading?: (delta: number) => void;
    signal?: AbortSignal;
    format: "json" | "text";
    headers?: Record<string, string>;
    cache: ResponseCachePolicy<T>;
    cacheOnly?: boolean;
    validate?: (data: T) => boolean;
}

interface CachedFetchResult<T> {
    data: T;
    fromCache: boolean;
    stale: boolean;
    error?: string;
}

interface CachedResponseEntry<T> {
    hasData: boolean;
    data: T;
    fetchedAt: number;
    lastAttemptAt: number;
    measurementAt: number | null;
    error?: string;
    failureCount?: number;
}

interface FetchJSONOptions<T> {
    forceFetch?: boolean;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    cache: ResponseCachePolicy<T>;
    cacheOnly?: boolean;
    validate?: (data: T) => boolean;
}

interface WeatherRefresh {
    key: string;
    controller: AbortController;
    promise: Promise<void>;
}

interface LandingCoordinateSelection {
    lat: string;
    lon: string;
}

interface NominatimReverseResult {
    address?: {
        hamlet?: string;
        suburb?: string;
        village?: string;
        town?: string;
        city?: string;
        municipality?: string;
        road?: string;
    };
    name?: string;
    display_name?: string;
}

interface OpenMeteoElevationResult {
    elevation?: number[];
}

interface NearbyStation {
    id: string;
    name: string;
    /** Distance from the selected dropzone in metres. */
    distance: number;
}
interface NearbyStations {
    fmi: NearbyStation | null;
    fintraffic: NearbyStation | null;
}

interface StoredResponseCacheEntry {
    key: string;
    entry: CachedResponseEntry<unknown>;
    accessedAt: number;
    bytes: number;
}

interface PlaceSearchResult extends LandingCoordinateSelection {
    display_name: string;
}
