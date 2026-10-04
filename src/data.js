// @ts-check
// docs https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=describeStoredQueries&
import { computed, effect, signal } from "@preact/signals";
import {
    isNullish,
    hasValidWindData,
    knotsToMs,
    removeNullish,
    safeParseNumber,
    fetchJSON,
} from "./utils.js";
import { fetchHighWinds } from "./om.js";
// just exposes the parseMETAR global
import "metar";

/** @type {Signal<QueryParams[]>} */
export const SAVED_DZs = signal(
    (() => {
        try {
            return JSON.parse(window.localStorage.getItem("saved_dzs") ?? "[]");
        } catch {
            return [];
        }
    })(),
);

/**
 * @param {string|null|undefined} name
 */
export function saveCurrentDz(name) {
    name = name ?? undefined;
    let qp = QUERY_PARAMS.value;
    const index = SAVED_DZs.value.findIndex((dz) => dz.name == name);

    qp = { ...qp, name, save: undefined };

    if (index === -1) {
        SAVED_DZs.value = [...SAVED_DZs.value, qp];
    } else {
        SAVED_DZs.value = SAVED_DZs.value.with(index, qp);
    }

    window.localStorage.setItem("saved_dzs", JSON.stringify(SAVED_DZs));
}

/**
 * @param {string} name
 */
export function removeSavedDz(name) {
    const filtered = SAVED_DZs.value.filter((dz) => dz.name !== name);
    window.localStorage.setItem("saved_dzs", JSON.stringify(filtered));
    SAVED_DZs.value = filtered;
}

/**
 * Current URLSearchParams (query string) in the location bar
 *
 * @type {Signal<QueryParams>}
 */
export const QUERY_PARAMS = signal(
    Object.fromEntries(new URLSearchParams(location.search)),
);

export const DEV_DEBUG = computed(() => QUERY_PARAMS.value.DEV_debug === "1");
export const DEV_MOCK = computed(() => QUERY_PARAMS.value.DEV_mock === "1");

/**
 * Logs wind calculations when developer debug mode is enabled.
 * @param {...any} args
 */
export function debug(...args) {
    if (DEV_DEBUG.value) console.log(...args);
}

export const DEV_ACTIVE = computed(() =>
    Object.entries(QUERY_PARAMS.value).some(
        ([key, value]) => key.startsWith("DEV_") && !!value?.trim(),
    ),
);

/** @param {DeveloperKey} key */
export function getDevNumber(key) {
    const text = QUERY_PARAMS.value[key]?.trim();
    if (!text) return undefined;
    const value = Number(text);
    const max = key.endsWith("direction") ? 360 : Infinity;
    return Number.isFinite(value) && value >= 0 && value <= max
        ? value
        : undefined;
}

/**
 * Decode newest-first rows: gust, average speed, direction, age in minutes.
 * Empty wind values represent missing data. Invalid overrides use live data.
 * @param {string | undefined} text
 * @returns {DeveloperObservation[] | undefined}
 */
export function parseGroundObservations(text) {
    if (!text?.trim()) return undefined;
    const rows = text.split(";").map((row) => row.split(","));
    /** @type {DeveloperObservation[]} */
    const observations = [];
    for (const row of rows) {
        if (row.length !== 4 || !row[3]?.trim()) return undefined;
        const numbers = row.map((value) =>
            value.trim() ? Number(value) : undefined,
        );
        const [gust, speed, direction, age] = numbers;
        if (
            numbers.some(
                (value) => value !== undefined && !Number.isFinite(value),
            ) ||
            (gust !== undefined && gust < 0) ||
            (speed !== undefined && speed < 0) ||
            (direction !== undefined && (direction < -1 || direction > 360)) ||
            age === undefined ||
            age < 0 ||
            age > 60
        )
            return undefined;
        observations.push({ gust, speed, direction, age });
    }
    return observations.sort((a, b) => a.age - b.age);
}

/**
 * @type {Signal<string|undefined>}
 */
export const NAME = signal(QUERY_PARAMS.value.name);

/**
 * @type {Signal<number>}
 */
export const LOADING = signal(0);

/**
 * @type {Signal<boolean>}
 */
export const STALE_FORECASTS = signal(true);

/**
 * @type {Signal<string | undefined>}
 */
export const STATION_NAME = signal(undefined);

/**
 * @type {Signal<WeatherData[]>}
 */
const LIVE_OBSERVATIONS = signal([]);

export const OBSERVATIONS = computed(() => {
    const live = LIVE_OBSERVATIONS.value;
    const overrides = parseGroundObservations(
        QUERY_PARAMS.value.DEV_ground_obs,
    );
    if (!overrides) return live;
    const now = Date.now();
    const cutoff = now - 60 * 60 * 1000;
    const recent = live.filter(
        (observation) => observation.time.getTime() >= cutoff,
    );
    const edited = overrides.map(({ age, gust, speed, direction }, index) => ({
        ...recent[index],
        source: /** @type {const} */ ("mock"),
        time: new Date(now - age * 60 * 1000),
        gust,
        speed,
        direction,
    }));
    return [
        ...edited,
        ...live.filter((observation) => observation.time.getTime() < cutoff),
    ];
});

export const HAS_WIND_OBSERVATIONS = computed(() => {
    let count = 0;

    for (const obs of OBSERVATIONS.value) {
        if (hasValidWindData(obs)) {
            count++;
        }

        // At least two observations with wind data
        if (count > 1) {
            return true;
        }
    }

    return false;
});

/**
 * @type {Signal<WeatherData|undefined>}
 */
export const HOVERED_OBSERVATION = signal(undefined);

/**
 * @type {ReadonlySignal<WeatherData|undefined>}
 */
export const LATEST_OBSERVATION = computed(() => {
    const obs = OBSERVATIONS.value[0];

    if (obs && (obs.source === "mock" || hasValidWindData(obs))) {
        return OBSERVATIONS.value[0];
    }

    const metar = METARS.value?.[0];
    if (!metar) {
        return;
    }

    const speed = metar.wind.speed;
    const gust = metar.wind.gust;

    /** @type {WeatherData} */
    const metarObs = {
        source: "metar",
        lowCloudCover: undefined,
        middleCloudCover: undefined,
        temperature: obs?.temperature ?? metar.temperature,
        dewPoint: obs?.dewPoint ?? metar.dewpoint,
        time: metar.time,
        gust: isNullish(gust) ? undefined : knotsToMs(gust),
        speed: isNullish(speed) ? undefined : knotsToMs(speed),
        direction:
            typeof metar.wind.direction === "number"
                ? metar.wind.direction
                : undefined,
    };

    if (hasValidWindData(metarObs)) {
        return metarObs;
    }
});

/**
 * @type {Signal<WeatherData[]>}
 */
export const FORECASTS = signal([]);

/**
 * @type {Signal<WeatherData[]>}
 */
export const HOURLY_CLOUD_FORECASTS = computed(() => {
    const now = Date.now();
    return FORECASTS.value
        .filter(
            (forecast) =>
                forecast.time.getTime() > now &&
                forecast.time.getMinutes() === 0,
        )
        .slice(0, 12);
});

/**
 * @type {Signal<MetarData[] | undefined>}
 */
const LIVE_METARS = signal(undefined);

export const METARS = computed(() => {
    const text = QUERY_PARAMS.value.DEV_metar?.trim();
    if (!text) return LIVE_METARS.value;
    try {
        return parseMetarMessages([text]);
    } catch {
        return LIVE_METARS.value;
    }
});

/**
 * @type {Signal<string|null>}
 */
export const STATION_COORDINATES = signal(null);

/**
 * @type {Signal<string|null>}
 */
export const FORECAST_COORDINATES = signal(null);

if (QUERY_PARAMS.value.lat && QUERY_PARAMS.value.lon) {
    FORECAST_COORDINATES.value = `${QUERY_PARAMS.value.lat},${QUERY_PARAMS.value.lon}`;
}

/**
 * @type {Signal<string|null>}
 */
export const FORECAST_LOCATION_NAME = signal(null);

/**
 * @type {Signal<string[]>}
 */
export const ERRORS = signal([]);

/**
 *  How many days in the future the forecast is for.
 *  0 = today, 1 = tomorrow, 2 = day after tomorrow, etc.
 *
 * @type {Signal<number>}
 */
export const FORECAST_DAY = computed(() => {
    const day = QUERY_PARAMS.value.forecast_day;
    return day ? Number(day) : 0;
});

effect(() => {
    if (!QUERY_PARAMS.value.save) {
        return;
    }

    const name =
        NAME.value ?? QUERY_PARAMS.value.name ?? QUERY_PARAMS.value.icaocode;

    if (!name) {
        return;
    }

    saveCurrentDz(name);
    navigateQs({ save: undefined }, { replace: true });
});

/**
 * @type {Signal<Date>}
 */
export const FORECAST_DATE = computed(() => {
    const day = FORECAST_DAY.value;

    STALE_FORECASTS.value = true;

    if (day === 0) {
        return new Date();
    }

    const date = new Date();
    date.setDate(date.getDate() + day);
    return date;
});

/**
 * @type {Signal<{ [K in StoredQuery]?: string}>}
 */
export const RAW_DATA = signal({});

/** @type {ReturnType<typeof setTimeout>} */
let timer;

HOVERED_OBSERVATION.subscribe(() => {
    clearTimeout(timer);

    timer = setTimeout(() => {
        HOVERED_OBSERVATION.value = undefined;
    }, 5_000);
});

document.addEventListener("click", (e) => {
    if (e.target instanceof Element && !e.target.closest(".chart")) {
        HOVERED_OBSERVATION.value = undefined;
    }
});

/**
 * Makes a request to the FMI API with the given options.
 * @param {StoredQuery} storedQuery - The stored query ID for the request.
 * @param {Object} params - The parameters for the request.
 * @param {string} [exampleUrl]
 * @returns {Promise<Document|undefined|"error">} The parsed XML document from the response.
 * @throws Will throw an error if the request fails.
 */
export async function fmiRequest(storedQuery, params, exampleUrl) {
    const useExample = DEV_MOCK.value;

    const url = new URL(`https://opendata.fmi.fi/wfs?request=getFeature`);
    url.searchParams.set("storedquery_id", storedQuery);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    LOADING.value += 1;
    try {
        const response = await fetch(useExample ? (exampleUrl ?? url) : url);
        if (response.status === 404) {
            return;
        }

        if (!response.ok) {
            return "error";
        }

        let data;
        try {
            const text = await response.text();
            RAW_DATA.value = {
                ...RAW_DATA.value,
                [storedQuery]: text,
            };
            const parser = new DOMParser();
            data = parser.parseFromString(text, "application/xml");
        } catch (error) {
            console.error("ERROR", url.toString(), error);
            return "error";
        }

        return data;
    } finally {
        LOADING.value -= 1;
    }
}

/**
 * @param {Document} doc
 * @param {string} path
 * @returns {Element|null}
 */
function xpath(doc, path) {
    const node = doc.evaluate(
        path,
        doc,
        function (prefix) {
            switch (prefix) {
                case "wml2":
                    return "http://www.opengis.net/waterml/2.0";
                case "gml":
                    return "http://www.opengis.net/gml/3.2";
                default:
                    return null;
            }
        },
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
    ).singleNodeValue;

    if (node instanceof Element) {
        return node;
    }

    return null;
}

/**
 * @param {Element} node
 * @param {number} fallback
 */
function pointsToTimeSeries(node, fallback) {
    return Array.from(node.querySelectorAll("point")).map((point) => {
        const value = Number(point.querySelector("value")?.innerHTML);
        return {
            value: isNaN(value) ? fallback : value,
            time: new Date(
                point.querySelector("time")?.innerHTML ?? new Date(),
            ),
        };
    });
}

/**
 * @param {Document} doc
 * @param {string} id
 * @param {number} fallback
 */
function parseTimeSeries(doc, id, fallback) {
    const node = xpath(doc, `//wml2:MeasurementTimeseries[@gml:id="${id}"]`);
    if (!node) {
        return [];
    }

    return pointsToTimeSeries(node, fallback);
}

/**
 * @param {string} msg
 */
export function addError(msg) {
    ERRORS.value = [...ERRORS.value, msg];
}

/**
 * @param {string} coordinates
 */
async function fetchFmiForecasts(coordinates) {
    const forecastRange = Math.max(
        12,
        Number(QUERY_PARAMS.value.forecast_range) || 12,
    );

    const forecastStartTime = new Date();
    const forecastEndTime = new Date();
    forecastEndTime.setHours(
        forecastEndTime.getHours() + forecastRange,
        0,
        0,
        0,
    );

    const day = FORECAST_DAY.value;
    if (day > 0) {
        forecastStartTime.setHours(7, 0, 0, 0);
        forecastStartTime.setDate(forecastStartTime.getDate() + day);
        forecastEndTime.setHours(21, 0, 0, 0);
        forecastEndTime.setDate(forecastEndTime.getDate() + day);
    }

    const cacheBust = Math.floor(Date.now() / 30_000);

    const forecastXml = await fmiRequest(
        // "fmi::forecast::hirlam::surface::point::timevaluepair",
        // "ecmwf::forecast::surface::point::simple",
        // "ecmwf::forecast::surface::point::timevaluepair",
        "fmi::forecast::edited::weather::scandinavia::point::timevaluepair",
        {
            cch: cacheBust,

            starttime: forecastStartTime.toISOString(),
            endtime: forecastEndTime.toISOString(),

            timestep: 10,
            // parameters: FORECAST_PAREMETERS.join(","),
            // parameters: "WindGust",
            // LowCloudCover, MiddleCloudCover, HighCloudCover, MiddleAndLowCloudCover
            parameters: [
                "HourlyMaximumGust",
                "WindDirection",
                "WindSpeedMS",
                "LowCloudCover",
                "MiddleAndLowCloudCover",
                "Temperature",
                "DewPoint",
                "PoP", // precipitation probability
            ].join(","),
            // place: "Utti",
            latlon: coordinates,
        },
        "/example_data/forecast.xml",
    );

    if (forecastXml === "error") {
        addError("Virhe ennusteiden hakemisessa.");
        return;
    }

    if (!forecastXml) {
        addError("Ennusteita ei löytynyt");
        return;
    }

    // const allFeatures = Array.from(
    //     forecastXml.querySelectorAll("SF_SpatialSamplingFeature"),
    // ).map((el) => el.getAttribute("gml:id"));
    // console.log(allFeatures);

    const gustForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-HourlyMaximumGust",
        -1,
    );

    const speedForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-WindSpeedMS",
        -1,
    );

    const popForecasts = parseTimeSeries(forecastXml, "mts-1-1-PoP", 0);

    const temperatureForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-Temperature",
        -100,
    );

    const dewPointForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-DewPoint",
        -100,
    );

    const directionForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-WindDirection",
        -1,
    );

    const cloudCoverForecasts = parseTimeSeries(
        forecastXml,
        // "mts-1-1-MiddleAndLowCloudCover",
        "mts-1-1-LowCloudCover",
        -1,
    );

    const middleCloudCoverForecasts = parseTimeSeries(
        forecastXml,
        // "mts-1-1-MiddleCloudCover",
        "mts-1-1-MiddleAndLowCloudCover",
        -1,
    );

    const locationCollection = forecastXml.querySelector("LocationCollection");
    const locationName = locationCollection?.querySelector("name")?.innerHTML;
    const regionName = locationCollection?.querySelector("region")?.innerHTML;
    FORECAST_LOCATION_NAME.value = `${locationName}, ${regionName}`;
    if (!NAME.value) {
        NAME.value = locationName;
    }

    /** @type {WeatherData[]} */
    const combinedForecasts = gustForecasts.map((gust, i) => {
        return {
            source: "forecast",
            gust: gust.value,
            direction: directionForecasts[i]?.value ?? -1,
            speed: speedForecasts[i]?.value ?? -1,
            time: gust.time,
            lowCloudCover: cloudCoverForecasts[i]?.value,
            middleCloudCover: middleCloudCoverForecasts[i]?.value,
            rain: popForecasts[i]?.value,
            temperature: temperatureForecasts[i]?.value,
            dewPoint: dewPointForecasts[i]?.value,
        };
    });

    FORECASTS.value = combinedForecasts;
    STALE_FORECASTS.value = false;
}

/**
 * Fetches METAR data from the Flyk API for a given ICAO code.
 *
 * @param {string} icaocode - The ICAO code of the airport.
 */
async function fetchFlykMetar(icaocode) {
    /** @type {FlykMetar} */
    const data = await fetchJSON("https://flyk.com/api/metars.geojson");
    const re = new RegExp(`^(METAR|SPECI) ${icaocode} `);
    const features = data.features.find((f) => {
        return re.test(f.properties.text);
    });
    return features?.properties.text;
}

/**
 * @param {string[]} metars
 */
function setMETARSfromMetarMessage(metars) {
    LIVE_METARS.value = parseMetarMessages(metars);
}

/** @param {string[]} metars */
export function parseMetarMessages(metars) {
    return metars.map((metar) => {
        const m = parseMETAR(metar);

        /** @type MetarData */
        const metarData = {
            time: new Date(m.time),
            metar,
            cb: /[^ ]CB /.test(metar),
            wind: {
                gust: m.wind.gust ?? undefined,
                speed: m.wind.speed ?? undefined,
                direction: m.wind.direction,
                unit: m.wind.unit.toLowerCase(),
            },
            temperature: m.temperature,
            clouds:
                m.clouds?.map((cloud) => {
                    return {
                        amount: cloud.abbreviation,
                        base: cloud.altitude,
                        unit: "ft",
                    };
                }) ?? [],
        };

        return metarData;
    });
}

function getObservationStartTime() {
    const obsRange = Number(QUERY_PARAMS.value.observation_range) || 12;
    const obsStartTime = new Date();
    obsStartTime.setHours(obsStartTime.getHours() - obsRange, 0, 0, 0);
    return obsStartTime;
}

/**
 * @param {string} fmisid
 */
export async function fetchFmiObservations(fmisid) {
    const icaocode = QUERY_PARAMS.value.icaocode;
    const customName = QUERY_PARAMS.value.name;

    NAME.value = customName || icaocode || undefined;
    if (NAME.value) {
        localStorage.setItem("previous_dz", NAME.value);
    }

    const obsStartTime = getObservationStartTime();

    const cacheBust = Math.floor(Date.now() / 30_000);

    if (icaocode) {
        // intentionally not awaiting, it can be updated on the background
        fetchFlykMetar(icaocode).then((metar) => {
            if (metar) {
                setMETARSfromMetarMessage([metar]);
            } else {
                addError(`Ei METAR-sanomaa kentälle ${icaocode}.`);
            }
        });
    } else {
        addError("Ei METAR tietoja.");
    }

    const doc = await fmiRequest(
        "fmi::observations::weather::timevaluepair",
        {
            cch: cacheBust,
            starttime: obsStartTime.toISOString(),
            // endtime:
            parameters: [
                "winddirection",
                "windspeedms",
                "windgust",
                "t2m",
                "td",
            ],
            fmisid,
        },
        "/example_data/observations.xml",
    );

    if (!doc) {
        addError(`Havaintoasemaa ${fmisid} ei löytynyt.`);
        return;
    }

    if (doc === "error") {
        addError(
            `Virhe Ilmatieteenlaitoksen havaintoaseman ${fmisid} tietojen hakemisessa.`,
        );
        return;
    }

    // const allFeatures = Array.from(
    //     doc.querySelectorAll("SF_SpatialSamplingFeature"),
    // ).map((el) => el.getAttribute("gml:id"));
    // console.log(allFeatures.join(", "));

    // <gml:name codeSpace="http://xml.fmi.fi/namespace/locationcode/name">Kouvola Utti lentoasema</gml:name>
    const name = xpath(
        doc,
        "//gml:name[@codeSpace='http://xml.fmi.fi/namespace/locationcode/name']",
    )?.innerHTML;

    if (!name) {
        addError(`Havaintoasema ${fmisid} ei taida toimia tässä.`);
        return;
    }

    STATION_NAME.value = name + " (FMI)";

    STATION_COORDINATES.value =
        doc.querySelector("pos")?.innerHTML.trim().split(/\s+/).join(",") ??
        null;

    if (!FORECAST_COORDINATES.value) {
        FORECAST_COORDINATES.value = STATION_COORDINATES.value;
    }

    const gusts = parseTimeSeries(doc, "obs-obs-1-1-windgust", -1).reverse();
    const windSpeed = parseTimeSeries(
        doc,
        "obs-obs-1-1-windspeedms",
        -1,
    ).reverse();
    const directions = parseTimeSeries(
        doc,
        "obs-obs-1-1-winddirection",
        -1,
    ).reverse();

    const temperatures = parseTimeSeries(doc, "obs-obs-1-1-t2m", -99).reverse();
    const dewPoints = parseTimeSeries(doc, "obs-obs-1-1-td", -99).reverse();

    /** @type {WeatherData[]} */
    const combined = gusts.map((gust, i) => {
        return {
            source: "fmi",
            gust: gust.value,
            speed: windSpeed[i]?.value,
            direction: directions[i]?.value,
            time: gust.time,
            middleCloudCover: undefined,
            lowCloudCover: undefined,
            temperature: temperatures[i]?.value,
            dewPoint: dewPoints[i]?.value,
        };
    });

    mockAllEntries(combined);

    LIVE_OBSERVATIONS.value = combined;
}

/**
 * @param {WeatherData[]} target
 */
function mockAllEntries(target) {
    mockEntries({
        target: target,
        targetKey: "direction",
        queryKey: "__directions",
    });

    mockEntries({
        target: target,
        targetKey: "gust",
        queryKey: "__gusts",
    });

    mockEntries({
        target: target,
        targetKey: "speed",
        queryKey: "__speeds",
    });
}

/**
 * @template {keyof WeatherData} TKeys
 * @template {keyof QueryParams} QKeys
 *
 * @param {Object} params
 * @param {QKeys} params.queryKey
 * @param {TKeys} params.targetKey
 * @param {WeatherData[]} params.target
 */
function mockEntries(params) {
    // do not allow mocking on the production site
    if (location.hostname === "hyppykeli.fi") {
        return;
    }

    const mock =
        QUERY_PARAMS.value[params.queryKey]
            ?.split(",")
            .map((num) => Number(num))
            .reverse() ?? [];

    let index = 0;
    for (const value of mock) {
        const entry = params.target[index];
        if (entry) {
            // @ts-ignore
            entry[params.targetKey] = value;
        }
        index++;
    }
}

/**
 * @param {string} roadsid
 */
async function fetchRoadStationInfo(roadsid) {
    const res = await fetch(
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}`,
        {
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
        },
    );

    if (!res.ok) {
        addError(`Virhe Digitraffic API:ssa: ${res.status}`);
        return;
    }

    /** @type {RoadStationInfoDetailed} */
    const data = await res.json();

    STATION_COORDINATES.value = `${data.geometry.coordinates[1]},${data.geometry.coordinates[0]}`;
    if (!FORECAST_COORDINATES.value) {
        FORECAST_COORDINATES.value = STATION_COORDINATES.value;
    }
    STATION_NAME.value = data.properties.names.fi + " (Digitraffic)";
}

/**
 * @param {string} roadsid
 */
async function fetchRoadObservations(roadsid) {
    const obsStartTime = getObservationStartTime();

    // load in background as not so important
    /** @type {Promise<RoadStationHistory|undefined>} */
    const historyPromise = fetchJSON(
        // `https://tie.digitraffic.fi/api/beta/weather-history-data/${roadsid}?` +
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}/data/history?` +
            new URLSearchParams({
                from: obsStartTime.toISOString(),
                to: new Date().toISOString(),
            }),
        {
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
        },
    );

    /** @type {RoadStationObservations|undefined} */
    const data = await fetchJSON(
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}/data`,
        {
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
        },
    );

    if (!data) {
        return;
    }

    const gust = data.sensorValues.find((v) => v.name === "MAKSIMITUULI");
    const wind = data.sensorValues.find((v) => v.name === "KESKITUULI");
    const windDirection = data.sensorValues.find(
        (v) => v.name === "TUULENSUUNTA",
    );
    const temperature = data.sensorValues.find((v) => v.name === "ILMA");
    const dewPoint = data.sensorValues.find((v) => v.name === "KASTEPISTE");

    /** @type {WeatherData} */
    const obs = {
        source: "roads",
        speed: wind?.value,
        gust: gust?.value,
        direction: windDirection?.value,
        temperature: temperature?.value,
        dewPoint: dewPoint?.value,
        time: new Date(data.dataUpdatedTime),
    };

    LIVE_OBSERVATIONS.value = [obs];

    const history = await historyPromise;
    if (!history) {
        return;
    }

    if (!gust) {
        return;
    }

    const gusts = history.values.filter((v) => v.id === gust.id);

    /** @type {WeatherData[]} */
    const combined = gusts.flatMap((roadObservation) => {
        // just pick gusts to get an single array of observations
        if (roadObservation.id !== gust.id) {
            return [];
        }

        const otherObservations = history.values.filter(
            (h) => h.measuredTime === roadObservation.measuredTime,
        );

        // find matching history for other values than the gust
        const windHistory = otherObservations.find(
            (ob) => ob.id === wind?.id,
        )?.value;

        const directionHistory = otherObservations.find(
            (ob) => ob.id === windDirection?.id,
        )?.value;

        const temperatureHistory = otherObservations.find(
            (ob) => ob.id === temperature?.id,
        )?.value;

        const dewPointHistory = otherObservations.find(
            (ob) => ob.id === dewPoint?.id,
        )?.value;

        return {
            source: "roads",
            time: new Date(roadObservation.measuredTime),
            gust: roadObservation.value,
            speed: windHistory,
            direction: directionHistory,
            temperature: temperatureHistory,
            dewPoint: dewPointHistory,
        };
    });

    combined.reverse();

    const full = [obs, ...combined];

    mockAllEntries(full);

    LIVE_OBSERVATIONS.value = full;
}

async function fetchObservations() {
    if (QUERY_PARAMS.value.fmisid) {
        await fetchFmiObservations(QUERY_PARAMS.value.fmisid);
    } else if (QUERY_PARAMS.value.roadsid) {
        await Promise.all([
            fetchRoadObservations(QUERY_PARAMS.value.roadsid),
            fetchRoadStationInfo(QUERY_PARAMS.value.roadsid),
        ]);
    } else {
        addError(
            "Ilmatieteenlaitoksen eikä tiehallinnon havaintoasemaa ole määritetty.",
        );
    }
}

export async function updateWeatherData() {
    ERRORS.value = [];
    if (FORECAST_COORDINATES.value) {
        // we can fetch everyting in parallel if we have manually provided coordinates
        await Promise.all([
            fetchObservations(),
            fetchFmiForecasts(FORECAST_COORDINATES.value),
            fetchHighWinds(FORECAST_COORDINATES.value),
        ]);
    } else {
        // otherwise we need to fetch the stationdata first to get the station coordinates
        await fetchObservations();
        if (FORECAST_COORDINATES.value) {
            await Promise.all([
                fetchFmiForecasts(FORECAST_COORDINATES.value),
                fetchHighWinds(FORECAST_COORDINATES.value),
            ]);
        } else {
            addError("Koordinaattien haku epännistui havaintoasemalta.");
        }
    }
}

/**
 * Update the query string in the url bar and update the global QUERY_PARAMS signal.
 *
 * @param {QueryParams} params
 * @param {Object} [options]
 * @param {"merge" | "replace"} [options.mode] defaults to "merge"
 * @param {boolean} [options.replace]
 */
export function navigateQs(params, options) {
    if (!options?.mode || options?.mode === "merge") {
        QUERY_PARAMS.value = {
            ...QUERY_PARAMS.value,
            ...params,
        };
    } else {
        QUERY_PARAMS.value = params;
    }

    const qs = new URLSearchParams(removeNullish(QUERY_PARAMS.value));

    if (options?.replace) {
        history.replaceState(null, "", `?${qs}`);
    } else {
        history.pushState(null, "", `?${qs}`);
    }
}

window.addEventListener("popstate", () => {
    QUERY_PARAMS.value = Object.fromEntries(
        new URLSearchParams(location.search),
    );
});

/**
 * Get query string for for <a href> rendering
 *
 * @param {QueryParams} [params]
 * @param {"merge" | "replace"} [mode]
 */
export function getQs(params, mode) {
    let query;

    if (!mode || mode === "merge") {
        query = {
            ...QUERY_PARAMS.value,
            ...params,
        };
    } else {
        query = params;
    }

    return "?" + new URLSearchParams(removeNullish(query)).toString();
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        updateWeatherData();
    }
});

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        updateWeatherData();
    }
});

setInterval(updateWeatherData, 60000);

let initial = true;

// listen to query string changes and refretch the data on changes
QUERY_PARAMS.subscribe(() => {
    updateWeatherData().then(() => {
        if (!initial) {
            return;
        }

        initial = false;

        // Scroll to url fragment after the intial data is loaded
        // since anchor positions change after the data load
        const fragment = location.hash;
        if (!fragment) {
            return;
        }

        let element;

        try {
            element = document.querySelector(fragment);
        } catch (error) {}

        if (element) {
            element.scrollIntoView();
        }
    });
});

// Constants for WIND_VARIATIONS
const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

/** @type {Record<string, string>} */
const COLOR_MAPPINGS = {
    0: "#E6DB00",
    1: "#2CF000",
    2: "orange",
    3: "red",
    4: "#AC0000",
};

const SPEED_THRESHOLDS = {
    LOW: 2,
    MEDIUM: 6,
    HIGH: 8,
};

const GUST_THRESHOLDS = {
    LOW: 3,
    MEDIUM: 4,
    HIGH: 7,
    VERY_HIGH: 9.5,
};

export const GUST_DIFF_THRESHOLDS = {
    MEDIUM: 4,
    HIGH: 5.5,
    VERY_HIGH: 7,
};

const WIND_REF_BASE_TABLE = [
    { gustSpeed: GUST_THRESHOLDS.VERY_HIGH, avgSpeed: 0, windRef: 4 },
    {
        gustSpeed: GUST_THRESHOLDS.HIGH,
        avgSpeed: SPEED_THRESHOLDS.HIGH,
        windRef: 3,
    },
    {
        gustSpeed: GUST_THRESHOLDS.MEDIUM,
        avgSpeed: SPEED_THRESHOLDS.MEDIUM,
        windRef: 2,
    },
    { gustSpeed: GUST_THRESHOLDS.MEDIUM, avgSpeed: 0, windRef: 2 },
    { gustSpeed: GUST_THRESHOLDS.LOW, avgSpeed: 0, windRef: 1 },
    { gustSpeed: 0, avgSpeed: 0, windRef: 0 },
];

const GUST_DIFF_TABLE = [
    { diff: GUST_DIFF_THRESHOLDS.VERY_HIGH, increment: 1 },
    { diff: GUST_DIFF_THRESHOLDS.HIGH, increment: 0.5 },
    { diff: GUST_DIFF_THRESHOLDS.MEDIUM, increment: 0.25 },
    { diff: 0, increment: 0 },
];

const DIRECTION_VARIATION_TABLE = [
    { gustSpeed: GUST_THRESHOLDS.VERY_HIGH, direction: 180, increment: 1 },
    { gustSpeed: GUST_THRESHOLDS.HIGH, direction: 90, increment: 1 },
    { gustSpeed: GUST_THRESHOLDS.HIGH, direction: 45, increment: 0.5 },
    { gustSpeed: GUST_THRESHOLDS.MEDIUM, direction: 90, increment: 0.5 },
    { gustSpeed: GUST_THRESHOLDS.MEDIUM, direction: 45, increment: 0.25 },
    { gustSpeed: GUST_THRESHOLDS.LOW, direction: 90, increment: 0.25 },
    { gustSpeed: 0, direction: 0, increment: 0 },
];

// Helper functions for WIND_VARIATIONS

/**
 * @param {number[]} directions
 */
export function calculateVariationRange(directions) {
    debug(`calculateVariationRange: directions = ${directions}`);
    let maxDiff = 0;
    for (let i = 0; i < directions.length; i++) {
        for (let j = i + 1; j < directions.length; j++) {
            const diff = Math.abs((directions[i] ?? 0) - (directions[j] ?? 0));
            const adjustedDiff = Math.min(diff, 360 - diff);
            maxDiff = Math.max(maxDiff, adjustedDiff);
        }
    }
    return maxDiff;
}

/**
 * @param {number} avgSpeed
 * @param {number} gustSpeed
 */
function findBaseWindRef(avgSpeed, gustSpeed) {
    for (const entry of WIND_REF_BASE_TABLE) {
        if (gustSpeed >= entry.gustSpeed && avgSpeed >= entry.avgSpeed) {
            debug("BASE WINDREF: " + entry.windRef);
            return entry.windRef;
        }
    }
    return 0;
}

/**
 * @param {number} gustDiff
 */
function findGustDiffIncrement(gustDiff) {
    for (const entry of GUST_DIFF_TABLE) {
        if (gustDiff >= entry.diff) {
            return entry.increment;
        }
    }
    return 0;
}

/**
 * @param {number} directionVariation
 * @param {number} gustSpeed
 */
function findDirectionVariationIncrement(directionVariation, gustSpeed) {
    for (const entry of DIRECTION_VARIATION_TABLE) {
        if (
            gustSpeed >= entry.gustSpeed &&
            directionVariation >= entry.direction
        ) {
            return entry.increment;
        }
    }
    return 0;
}

/**
 * @param {number} avgSpeed
 * @param {number} gustSpeed
 * @param {number} directionVariation
 */
function calculateWindRef(avgSpeed, gustSpeed, directionVariation) {
    debug(
        `calculateWindRef: avgSpeed = ${avgSpeed}, gustSpeed = ${gustSpeed}, directionVariation = ${directionVariation}`,
    );

    let windRef = findBaseWindRef(avgSpeed, gustSpeed);
    const gustDiff = gustSpeed - avgSpeed;
    const gustDiffIncrement = findGustDiffIncrement(gustDiff);
    windRef += gustDiffIncrement;

    const directionVariationIncrement = findDirectionVariationIncrement(
        directionVariation,
        gustSpeed,
    );
    windRef += directionVariationIncrement;

    const result = Math.min(Math.max(Math.round(windRef), 0), 4);
    debug(`calculateWindRef: result = ${result}`);
    return result;
}

/**
 * @param {WeatherData[]} observations
 */
function filterRecentObservations(observations) {
    if (DEV_DEBUG.value) return observations;
    const thirtyMinutesAgo = new Date(Date.now() - THIRTY_MINUTES_IN_MS);
    return observations.filter(
        (obs) => obs.time >= thirtyMinutesAgo && obs.direction !== -1,
    );
}

/**
 * @param {WeatherData[]} observations
 */
function extractAndFilterData(observations) {
    const directions = observations
        .map((obs) => obs.direction)
        .filter((dir) => dir != null);
    const speeds = observations
        .map((obs) => obs.speed)
        .filter((speed) => speed != null);
    const gusts = observations
        .map((obs) => obs.gust)
        .filter((gust) => gust != null);
    return { directions, speeds, gusts };
}

/**
 * @param {number[]} directions
 * @param {number[]} speeds
 * @param {number[]} gusts
 */
function calculateWindData(directions, speeds, gusts) {
    const variationRange = calculateVariationRange(directions);
    const averageSpeed =
        speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const maxGust = Math.max(...gusts);
    return { variationRange, averageSpeed, maxGust };
}

export const WIND_VARIATIONS = computed(() => {
    debug("WIND_VARIATIONS: Calculating...");

    const observations = OBSERVATIONS.value;

    debug("WIND_VARIATIONS: observations = ", observations);

    const recentObservations = filterRecentObservations(observations);

    if (recentObservations.length === 0) {
        console.warn("WIND_VARIATIONS: No recent observations available");
        return undefined;
    }

    const { directions, speeds, gusts } =
        extractAndFilterData(recentObservations);

    if (directions.length === 0 || speeds.length === 0 || gusts.length === 0) {
        console.warn("WIND_VARIATIONS: Insufficient data after filtering");
        return undefined;
    }

    const { variationRange, averageSpeed, maxGust } = calculateWindData(
        directions,
        speeds,
        gusts,
    );

    const windRefValue = calculateWindRef(
        averageSpeed,
        maxGust,
        variationRange,
    );
    const windRef = [0, 1, 2, 3, 4][windRefValue];

    if (windRef === undefined) {
        console.error(
            "WIND_VARIATIONS: Invalid wind reference value calculated",
        );
        return undefined;
    }

    const result = {
        variationRange,
        windRef,
        color: COLOR_MAPPINGS[windRef] ?? "green",
        averageSpeed,
        maxGust,
    };

    debug("WIND_VARIATIONS: result = ", result);
    return result;
});

document.addEventListener("fetchjsonerror", (event) => {
    if (event instanceof CustomEvent && event.detail.message) {
        addError(event.detail.message);
    }
});
