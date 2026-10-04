// @ts-check
import { t } from "../../translations.js";

/**
 * Makes a request to the FMI API with the given options.
 * @param {StoredQuery} storedQuery - The stored query ID for the request.
 * @param {Object} params - The parameters for the request.
 * @param {string | undefined} exampleUrl
 * @param {FmiRequestOptions} options
 * @returns {Promise<Document|undefined|"error">} The parsed XML document from the response.
 * @throws Will throw an error if the request fails.
 */
export async function fmiRequest(storedQuery, params, exampleUrl, options) {
    const useExample = options.mock;

    const url = new URL(`https://opendata.fmi.fi/wfs?request=getFeature`);
    url.searchParams.set("storedquery_id", storedQuery);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    options.onLoading(1);
    try {
        const response = await fetch(
            useExample ? (exampleUrl ?? url) : url,
        ).catch(() => null);
        if (!response) {
            return "error";
        }
        if (response.status === 404) {
            return;
        }

        if (!response.ok) {
            return "error";
        }

        let data;
        try {
            const text = await response.text();
            const parser = new DOMParser();
            data = parser.parseFromString(text, "application/xml");
        } catch (error) {
            console.error("ERROR", url.toString(), error);
            return "error";
        }

        return data;
    } finally {
        options.onLoading(-1);
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
 * @param {string} coordinates
 * @param {FmiForecastOptions} options
 */
export async function fetchFmiForecasts(coordinates, options) {
    const forecastRange = Math.max(12, options.range);

    const forecastStartTime = new Date();
    const forecastEndTime = new Date();
    forecastEndTime.setHours(
        forecastEndTime.getHours() + forecastRange,
        0,
        0,
        0,
    );

    const day = options.day;
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
            // TotalCloudCover, LowCloudCover, MediumCloudCover,
            // HighCloudCover, MiddleAndLowCloudCover
            parameters: [
                "HourlyMaximumGust",
                "WindDirection",
                "WindSpeedMS",
                "TotalCloudCover",
                "LowCloudCover",
                "MediumCloudCover",
                "HighCloudCover",
                "MiddleAndLowCloudCover",
                "Temperature",
                "DewPoint",
                "PoP", // precipitation probability
            ].join(","),
            // place: "Utti",
            latlon: coordinates,
        },
        "/example_data/forecast.xml",
        options,
    );

    if (forecastXml === "error") {
        return false;
    }

    if (!forecastXml) {
        return false;
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
        "mts-1-1-MiddleAndLowCloudCover",
        -1,
    );

    const middleOnlyCloudCoverForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-MediumCloudCover",
        -1,
    );

    const highCloudCoverForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-HighCloudCover",
        -1,
    );

    const totalCloudCoverForecasts = parseTimeSeries(
        forecastXml,
        "mts-1-1-TotalCloudCover",
        -1,
    );

    const locationCollection = forecastXml.querySelector("LocationCollection");
    const locationName = locationCollection?.querySelector("name")?.innerHTML;
    const regionName = locationCollection?.querySelector("region")?.innerHTML;

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
            middleOnlyCloudCover: middleOnlyCloudCoverForecasts[i]?.value,
            highCloudCover: highCloudCoverForecasts[i]?.value,
            totalCloudCover: totalCloudCoverForecasts[i]?.value,
            rain: popForecasts[i]?.value,
            temperature: temperatureForecasts[i]?.value,
            dewPoint: dewPointForecasts[i]?.value,
        };
    });

    return {
        forecasts: combinedForecasts,
        forecastName: locationName?.trim() || undefined,
        locationName:
            [locationName, regionName].filter(Boolean).join(", ") || null,
    };
}

/**
 * @param {string} fmisid
 * @param {FmiObservationOptions} options
 */
export async function fetchFmiObservations(fmisid, options) {
    const obsStartTime = options.startTime;

    const cacheBust = Math.floor(Date.now() / 30_000);

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
        options,
    );

    if (!doc) {
        throw new Error(t("error.stationNotFound", fmisid));
    }

    if (doc === "error") {
        throw new Error(t("error.fmiFetch", fmisid));
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
        throw new Error(t("error.stationInvalid", fmisid));
    }

    const coordinates =
        doc.querySelector("pos")?.innerHTML.trim().split(/\s+/).join(",") ??
        null;

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

    return { observations: combined, name: name + " (FMI)", coordinates };
}
