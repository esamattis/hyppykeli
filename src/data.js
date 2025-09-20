// @ts-check
// docs https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=describeStoredQueries&
import { computed, effect, signal } from "@preact/signals";
import {
    debug,
    filterNullish,
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
export const OBSERVATIONS = signal([]);

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
 * @type {Signal<WeatherData|undefined>}
 */
export const LATEST_OBSERVATION = computed(() => {
    const obs = OBSERVATIONS.value[0];

    if (obs && hasValidWindData(obs)) {
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
 * @type {Signal<WeatherData|undefined>}
 */
export const SINGLE_FORECAST = computed(() => {
    const inTwoHours = Date.now() + 2 * 60 * 60 * 1000;
    return FORECASTS.value.find((fore) => {
        return fore.time.getTime() > inTwoHours;
    });
});

/**
 * @type {Signal<number>}
 */
export const GUST_TREND = computed(() => {
    const maxAge = Date.now() + 1000 * 60 * 60;
    const latestGust = OBSERVATIONS.value[0]?.gust ?? 0;

    const recentGusts = FORECASTS.value.flatMap((point) => {
        if (point.time.getTime() <= maxAge) {
            return point.gust;
        }

        return [];
    });

    if (recentGusts.length === 0) {
        return 0;
    }

    const avg =
        filterNullish(recentGusts).reduce((sum, gust) => sum + gust, 0) /
        recentGusts.length;

    return -latestGust + avg;
});

/**
 * @type {Signal<MetarData[] | undefined>}
 */
export const METARS = signal(undefined);

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
 * @param {string} [mock]
 * @returns {Promise<Document|undefined|"error">} The parsed XML document from the response.
 * @throws Will throw an error if the request fails.
 */
export async function fmiRequest(storedQuery, params, mock) {
    const allowMock = new URL(location.href).searchParams.has("mock");
    if (!allowMock) {
        mock = undefined;
    }

    const url = new URL(`https://opendata.fmi.fi/wfs?request=getFeature`);
    url.searchParams.set("storedquery_id", storedQuery);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    LOADING.value += 1;
    try {
        const response = await fetch(mock ?? url);
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
    const forecastRange = Number(QUERY_PARAMS.value.forecast_range) || 12;

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
    const parsed = metars.map((metar) => {
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

    METARS.value = parsed;
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

    OBSERVATIONS.value = combined;
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

    OBSERVATIONS.value = [obs];

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

    OBSERVATIONS.value = full;
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

// --- Konfiguraatio: Dynaamisen tuuliriskin (WindRef) laskenta ---
// Tämä malli laskee tuuliriskin (windRef 0-4) useiden tekijöiden perusteella.
// Se on suunniteltu reagoimaan herkemmin ja tarkemmin vaarallisiin olosuhteisiin
// kuin aiempi, suoraviivaisempi malli. Laskenta perustuu pisteiden keräämiseen
// eri riskitekijöistä, ja lopullinen pistemäärä muunnetaan windRef-arvoksi.

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

// Kynnysarvot eri tuulennopeuksille (m/s)
const GUST_THRESHOLDS = { LOW: 3, MEDIUM: 5, HIGH: 7, VERY_HIGH: 9 };
const SPEED_THRESHOLDS = { LOW: 2.5, MEDIUM: 4, HIGH: 6 };
const GUST_DIFF_THRESHOLDS = { MEDIUM: 3, HIGH: 4.5, VERY_HIGH: 6 };

// 1. Perusriski: Lasketaan puuskan ja keskituulen voimakkuuden perusteella.
// Nämä antavat pohjan riskipisteille.
const BASE_RISK_POINTS_GUST = [
    { threshold: 0, score: 0 },
    { threshold: GUST_THRESHOLDS.LOW, score: 0.5 },
    { threshold: GUST_THRESHOLDS.MEDIUM, score: 1.0 },
    { threshold: GUST_THRESHOLDS.HIGH, score: 2.0 },
    { threshold: GUST_THRESHOLDS.VERY_HIGH, score: 3.0 },
    { threshold: 12, score: 3.5 }, // Yläraja interpolaatiolle
];
const BASE_RISK_POINTS_AVG = [
    { threshold: 0, score: 0 },
    { threshold: SPEED_THRESHOLDS.LOW, score: 0.25 },
    { threshold: SPEED_THRESHOLDS.MEDIUM, score: 0.5 },
    { threshold: SPEED_THRESHOLDS.HIGH, score: 1.5 },
];

// 2. Puuskaisuusriski: Lasketaan puuskan ja keskituulen erotuksen perusteella.
// Suuri erotus on merkittävä riskitekijä.
const GUST_DIFF_POINTS = [
    { threshold: 0, score: 0 },
    { threshold: GUST_DIFF_THRESHOLDS.MEDIUM, score: 0.25 },
    { threshold: GUST_DIFF_THRESHOLDS.HIGH, score: 0.5 },
    { threshold: GUST_DIFF_THRESHOLDS.VERY_HIGH, score: 1.0 },
];

// 3. Suunnanvaihtelun riski: Lasketaan suunnan vaihtelulle peruspisteet,
// joita painotetaan tuulen voimakkuudella. Suuri vaihtelu kovassa tuulessa on vaarallisinta.
const DIRECTION_VARIATION_BASE_POINTS = [
    { threshold: 0, score: 0 },
    { threshold: 45, score: 0.25 },
    { threshold: 90, score: 0.5 },
    { threshold: 180, score: 1.0 },
];
const DIRECTION_WEIGHT_POINTS_BY_GUST = [
    { threshold: GUST_THRESHOLDS.LOW, weight: 1.0 },
    { threshold: GUST_THRESHOLDS.MEDIUM, weight: 1.5 },
    { threshold: GUST_THRESHOLDS.HIGH, weight: 2.0 },
    { threshold: GUST_THRESHOLDS.VERY_HIGH, weight: 3.0 },
];

// 4. Lopputulos: Muunnetaan lopullinen riskipistemäärä windRef-arvoksi (0-4).
const FINAL_SCORE_TO_WINDREF_THRESHOLDS = [
    { score: 1.0, windRef: 1 },
    { score: 2.5, windRef: 2 },
    { score: 4.5, windRef: 3 },
    { score: 5.0, windRef: 4 },
];

/**
 * Apufunktio, joka interpoloi arvon lineaarisesti annettujen pisteiden välillä.
 * @param {number} value - Arvo, jolle interpolaatio tehdään (esim. tuulennopeus).
 * @param {Array<{threshold: number, [key: string]: number}>} points - Taulukko pisteitä.
 * @param {string} key - Interpoloitavan arvon avain ('score' tai 'weight').
 * @returns {number} Interpoloitu arvo.
 */
function interpolateValue(value, points, key) {
    // KORJAUS: Varmistetaan, että points-taulukko ei ole tyhjä.
    if (!points || points.length === 0) {
        console.error(
            `interpolateValue kutsuttu tyhjällä taulukolla, avain: "${key}".`,
        );
        return 0;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    // KORJAUS: Varmistetaan, että firstPoint ja lastPoint ovat olemassa.
    if (!firstPoint || !lastPoint) {
        return 0;
    }

    if (value <= firstPoint.threshold) return firstPoint[key] ?? 0;
    if (value >= lastPoint.threshold) return lastPoint[key] ?? 0;

    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];

        // KORJAUS: Varmistetaan, että p1 ja p2 ovat olemassa loopin sisällä.
        if (p1 && p2 && value >= p1.threshold && value <= p2.threshold) {
            // Vältetään jakaminen nollalla, jos thresholdit ovat samat.
            if (p2.threshold === p1.threshold) return p1[key] ?? 0;

            const t = (value - p1.threshold) / (p2.threshold - p1.threshold);
            const val1 = p1[key] ?? 0;
            const val2 = p2[key] ?? 0;
            return val1 + t * (val2 - val1);
        }
    }
    return 0; // Fallback
}

/**
 * Laskee tuuliriskin (windRef 0-4) ja muut dynaamiset parametrit.
 * @param {number} averageSpeed - Keskituuli (m/s).
 * @param {number} maxGust - Maksimipuuska (m/s).
 * @param {number} variationRange - Tuulen suunnan vaihtelu (astetta, 0-180).
 * @returns {{finalScore: number, windRef: number}}
 */
function calculateRefinedWindRisk(averageSpeed, maxGust, variationRange) {
    const baseGustScore = interpolateValue(
        maxGust,
        BASE_RISK_POINTS_GUST,
        "score",
    );
    const baseAvgScore = interpolateValue(
        averageSpeed,
        BASE_RISK_POINTS_AVG,
        "score",
    );
    const gustDiff = Math.max(0, maxGust - averageSpeed);
    const gustDiffScore = interpolateValue(gustDiff, GUST_DIFF_POINTS, "score");
    const directionVariationBaseScore = interpolateValue(
        variationRange,
        DIRECTION_VARIATION_BASE_POINTS,
        "score",
    );
    const directionWeight = interpolateValue(
        maxGust,
        DIRECTION_WEIGHT_POINTS_BY_GUST,
        "weight",
    );
    const directionVariationWeightedScore =
        directionVariationBaseScore * directionWeight;
    const finalScore =
        baseGustScore +
        baseAvgScore +
        gustDiffScore +
        directionVariationWeightedScore;

    let windRef = 0;
    for (const threshold of FINAL_SCORE_TO_WINDREF_THRESHOLDS) {
        if (finalScore >= threshold.score) {
            windRef = threshold.windRef;
        } else {
            break;
        }
    }
    return { finalScore, windRef };
}

// (Tähän väliin jäävät vanhat apufunktiot: calculateAverageDirection, calculateVariationRange, jne.)
// Varmista, että ne ovat olemassa ja toimivat kuten ennenkin. Alla on niiden kopiot UPSTREAM-tiedostosta.

/**
 * @param {number[]} directions
 */
function calculateAverageDirection(directions) {
    debug(`calculateAverageDirection: directions = ${directions}`);
    const sumSin = directions.reduce(
        (sum, dir) => sum + Math.sin((dir * Math.PI) / 180),
        0,
    );
    const sumCos = directions.reduce(
        (sum, dir) => sum + Math.cos((dir * Math.PI) / 180),
        0,
    );
    const result = ((Math.atan2(sumSin, sumCos) * 180) / Math.PI + 360) % 360;
    debug(`calculateAverageDirection: result = ${result}`);
    return result;
}

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

// ... muut apufunktiot (`filterRecentObservations`, `extractAndFilterData`, `calculateWindData`, `calculateExtraWidth`)
// pysyvät ennallaan. Varmista, että ne ovat olemassa tässä tiedostossa.

const MAX_EXTRA_WIDTH = 30;
const EXTRA_WIDTH_MULTIPLIER = 3;

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
    const averageDirection = calculateAverageDirection(directions);
    const variationRange = calculateVariationRange(directions);
    const averageSpeed =
        speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const maxGust = Math.max(...gusts);
    return { averageDirection, variationRange, averageSpeed, maxGust };
}

/**
 * @param {number} maxGust
 * @param {number} averageSpeed
 */
function calculateExtraWidth(maxGust, averageSpeed) {
    return Math.min(
        Math.max(
            Math.round((maxGust - averageSpeed) * EXTRA_WIDTH_MULTIPLIER),
            0,
        ),
        MAX_EXTRA_WIDTH,
    );
}

/**
 * Laskee tuulen variaatiot annetusta datasta
 * @param {WeatherData[]} weatherData
 * @returns {WindVariations|undefined}
 */
function calculateWindVariationsFromData(weatherData) {
    const { directions, speeds, gusts } = extractAndFilterData(weatherData);
    if (directions.length < 1 || speeds.length === 0 || gusts.length === 0) {
        debug(
            "calculateWindVariationsFromData: Ei riittävästi dataa laskentaan.",
        );
        return undefined;
    }

    const { averageDirection, variationRange, averageSpeed, maxGust } =
        calculateWindData(directions, speeds, gusts);
    const { finalScore, windRef } = calculateRefinedWindRisk(
        averageSpeed,
        maxGust,
        variationRange,
    );

    const windRefColors = ["#E6DB00", "#2CF000", "orange", "red", "#AC0000"];

    return {
        variationRange,
        averageDirection,
        windRef,
        color: windRefColors[windRef] ?? "grey",
        extraWidth: calculateExtraWidth(maxGust, averageSpeed),
        averageSpeed,
        maxGust,
        finalScore,
    };
}

/** @type {ReadonlySignal<WindVariations|undefined>} */
export const WIND_VARIATIONS = computed(() => {
    debug("WIND_VARIATIONS: Calculating...");
    const observations = OBSERVATIONS.value;
    const recentObservations = observations.filter(
        (obs) =>
            Date.now() - obs.time.getTime() < THIRTY_MINUTES_IN_MS &&
            hasValidWindData(obs),
    );

    // Fallback 1: Hyväksy yksi havainto jos se on alle 5 minuuttia vanha
    if (recentObservations.length === 1) {
        const singleObs = recentObservations[0];
        if (!singleObs) return undefined;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (singleObs.time.getTime() > fiveMinutesAgo) {
            debug("WIND_VARIATIONS: Käytetään yhtä tuoretta havaintoa.");
            // Luo synteettinen toinen piste pienellä variaatiolla animaatiota varten
            const syntheticObs = {
                ...singleObs,
                direction:
                    singleObs.direction != null
                        ? (singleObs.direction + 10) % 360
                        : undefined,
                speed:
                    singleObs.speed != null
                        ? Math.max(0, singleObs.speed - 0.5)
                        : undefined,
                gust: singleObs.gust || singleObs.speed,
                source: singleObs.source,
                time: singleObs.time,
            };
            return calculateWindVariationsFromData([singleObs, syntheticObs]);
        }
    }

    // Fallback 2: Käytä ennustedata jos havaintoja ei riitä
    if (recentObservations.length < 2) {
        debug(
            "WIND_VARIATIONS: Ei riittävästi havaintoja, käytetään ennustedataa.",
        );
        const forecasts = FORECASTS.value;
        const currentTime = Date.now();
        const recentForecasts = forecasts
            .filter(
                (fore) =>
                    Math.abs(fore.time.getTime() - currentTime) <
                        THIRTY_MINUTES_IN_MS && hasValidWindData(fore),
            )
            .slice(0, 3); // Ota korkeintaan 3 lähintä ennustepistettä

        if (recentForecasts.length >= 2) {
            debug("WIND_VARIATIONS: Löydettiin riittävästi ennustedataa.");
            return calculateWindVariationsFromData(recentForecasts);
        }

        debug("WIND_VARIATIONS: Ei riittävästi dataa animaatioille.");
        return undefined;
    }

    // Käytä normaalia logiikkaa kun havaintoja on riittävästi
    const result = calculateWindVariationsFromData(recentObservations);
    debug("WIND_VARIATIONS: result = ", result);
    return result;
});

document.addEventListener("fetchjsonerror", (event) => {
    if (event instanceof CustomEvent && event.detail.message) {
        addError(event.detail.message);
    }
});
