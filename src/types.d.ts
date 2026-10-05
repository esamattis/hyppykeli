type Signal<T> = import("@preact/signals").Signal<T>;
type ReadonlySignal<T> = import("@preact/signals").ReadonlySignal<T>;

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
    winddirection_1000hPa: string;
    winddirection_925hPa: string;
    winddirection_850hPa: string;
    winddirection_700hPa: string;
    winddirection_600hPa: string;
}

type OpenMeteoPressureLevel = "1000" | "925" | "850" | "700" | "600";

interface MapWindLevel {
    label: string;
    speed: number | null;
    direction: number | null;
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
}

interface JumpRunSettings {
    exitHeight: number;
    direction: number;
    speedKmh: number;
    separationSeconds: number;
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
    onToggleDirection: () => void;
    onAdd: () => void;
}

interface FreefallToolbarProps {
    fullWindow: boolean;
    onToggleFullWindow: () => void;
    onShare: () => void;
    jumpRun: JumpRunControlsProps;
    arrowCount: number;
    onClear: () => void;
    onUndo: () => void;
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
    age: number;
    lifetime: number;
}

interface OpenMeteoCloudProfile {
    time: Date;
    layers: {
        pressure: OpenMeteoPressureLevel;
        cover: number;
        height: number;
    }[];
}

type OpenMeteoCloudHourlyData = {
    [
        Field in
            | `cloud_cover_${OpenMeteoPressureLevel}hPa`
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
    winddirection_1000hPa: number[];
    winddirection_925hPa: number[];
    winddirection_850hPa: number[];
    winddirection_700hPa: number[];
    winddirection_600hPa: number[];
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
interface MetarData {
    clouds: CloudLayer[];
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

interface QueryParams {
    map_zoom?: string;
    map_center_lat?: string;
    map_center_lon?: string;
    map_full_window?: string;
    map_wind?: string;
    map_run_start?: string;
    map_jumpers?: string;
    map_next_jumper?: string;
    map_run_settings?: string;
    DEV_debug?: string;
    DEV_mock?: string;
    DEV_ground_obs?: string;
    DEV_ground_gust?: string;
    DEV_ground_avg?: string;
    DEV_ground_direction?: string;
    DEV_metar?: string;
    DEV_map_speed?: string;
    DEV_map_direction?: string;
    __gusts?: string;
    __speeds?: string;
    __directions?: string;
    rc?: string;
    fmisid?: string;
    roadsid?: string;
    icaocode?: string;
    lat?: string;
    lon?: string;
    default_jump_run_direction?: string;
    default_jump_group_count?: string;
    name?: string;
    observation_range?: string;
    forecast_day?: string;
    forecast_range?: string;
    css?: string;
    save?: string;
}

type DeveloperKey = Extract<keyof QueryParams, `DEV_${string}`>;

interface DeveloperObservation {
    gust?: number;
    speed?: number;
    direction?: number;
    age: number;
}

interface DeveloperObservationInput {
    gust: string;
    speed: string;
    direction: string;
    age: number;
}

interface DeveloperField {
    key: DeveloperKey;
    label: string;
    max?: number;
    checkbox?: boolean;
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
    name: string;
    href: string;
    description: string | (() => string);
}

interface IconProps {
    name:
        | "plane"
        | "plus"
        | "minus"
        | "settings"
        | "share"
        | "expand"
        | "collapse"
        | "close"
        | "help"
        | "table"
        | "up"
        | "chart"
        | "wind"
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

interface DeveloperModeHandle {
    open: () => void;
}

interface FreefallFieldsProps {
    children?: import("preact").ComponentChildren;
    exitHeight: number;
    openingDraft: string;
    speedDraft: string;
    openingRef?: import("preact").RefObject<HTMLInputElement>;
    speedFirst?: boolean;
    onDraftChange: (field: keyof JumpRunJumper, value: string) => void;
    onChange: (field: keyof JumpRunJumper, value: number) => void;
}

interface SpeedPresetsProps {
    onSelect: (speedKmh: number) => void;
}

interface ToolbarButtonProps {
    label: string;
    icon: IconProps["name"];
    size?: IconProps["size"];
    className?: string;
    pressed?: boolean;
    disabled?: boolean;
    hasPopup?: "dialog";
    onClick: () => void;
}

interface DataSourceProps {
    sources?: Array<string | null | undefined>;
    children?: import("preact").ComponentChildren;
    plural?: boolean;
}

interface FmiRequestOptions {
    mock: boolean;
    onLoading: (delta: number) => void;
}

interface FmiForecastOptions extends FmiRequestOptions {
    range: number;
    day: number;
}

interface FmiObservationOptions extends FmiRequestOptions {
    startTime: Date;
}

interface JumpRunCalculation {
    velocity: JumpRunVelocity | null;
    drift: (jumper: JumpRunJumper) => FreefallDriftPoint[] | null;
}
