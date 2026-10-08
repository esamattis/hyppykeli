// @ts-check
import { coordinateDistance } from "#app/shared/coordinates.js";
import { fetchCached } from "#app/shared/fetchCached.js";
import { CACHE_POLICIES } from "#app/weather/providers/cachePolicies.js";

/**
 * @param {LandingCoordinateSelection} coordinates
 * @param {AbortSignal} signal
 * @returns {Promise<string>}
 */
export async function fetchElevation({ lat, lon }, signal) {
    const url = new URL("https://api.open-meteo.com/v1/elevation");
    url.search = new URLSearchParams({
        latitude: lat,
        longitude: lon,
    }).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) return "";
    /** @type {OpenMeteoElevationResult} */
    const data = await response.json();
    const elevation = data.elevation?.[0];
    return typeof elevation === "number" &&
        Number.isFinite(elevation) &&
        elevation >= 0 &&
        elevation <= 4200
        ? String(elevation)
        : "";
}

/**
 * @param {LandingCoordinateSelection} coordinates
 * @param {AbortSignal} signal
 * @returns {Promise<string>}
 */
export async function fetchLocationName({ lat, lon }, signal) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({
        lat,
        lon,
        format: "jsonv2",
        "accept-language": "fi",
    }).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) return "";
    /** @type {NominatimReverseResult} */
    const location = await response.json();
    const address = location.address;
    return (
        location.name?.trim() ||
        address?.hamlet ||
        address?.suburb ||
        address?.village ||
        address?.town ||
        address?.city ||
        address?.municipality ||
        address?.road ||
        location.display_name?.split(",")[0]?.trim() ||
        ""
    );
}

/** @param {[number, number]} coordinates
 * @returns {Promise<NearbyStation | null>}
 */
async function findClosestFmiStation(coordinates) {
    const result = await fetchCached(
        "https://opendata.fmi.fi/wfs/fin?service=WFS&version=2.0.0&request=GetFeature&storedquery_id=fmi::ef::stations&networkid=121",
        {
            format: "text",
            cache: CACHE_POLICIES.stationMetadata,
            validate: (text) => {
                const doc = new DOMParser().parseFromString(
                    text,
                    "application/xml",
                );
                return (
                    !doc.querySelector("parsererror") &&
                    doc.getElementsByTagNameNS("*", "FeatureCollection")
                        .length > 0
                );
            },
        },
    );
    if (!result) return null;
    const doc = new DOMParser().parseFromString(result.data, "application/xml");
    /** @type {NearbyStation | null} */
    let closest = null;
    for (const facility of doc.getElementsByTagNameNS(
        "*",
        "EnvironmentalMonitoringFacility",
    )) {
        const id = facility
            .querySelector(
                'identifier[codeSpace="http://xml.fmi.fi/namespace/stationcode/fmisid"]',
            )
            ?.textContent?.trim();
        const name = facility
            .querySelector(
                'name[codeSpace="http://xml.fmi.fi/namespace/locationcode/name"]',
            )
            ?.textContent?.trim();
        const pos = facility
            .getElementsByTagNameNS("*", "pos")[0]
            ?.textContent?.trim()
            .split(/\s+/)
            .map(Number);
        if (!id || !name || pos?.length !== 2 || !pos.every(Number.isFinite))
            continue;
        const distance = coordinateDistance(
            coordinates,
            /** @type {[number, number]} */ (pos),
        );
        if (!closest || distance < closest.distance)
            closest = { id, name, distance };
    }
    return closest;
}

/**
 * @param {[number, number]} coordinates
 */
async function findClosestRoadStation(coordinates) {
    /** @type {CachedFetchResult<RoadStations> | undefined} */
    const result = await fetchCached(
        "https://tie.digitraffic.fi/api/weather/v1/stations",
        {
            format: "json",
            validate: (data) => Array.isArray(data?.features),
            cache: CACHE_POLICIES.stationMetadata,
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
        },
    );

    const stations = result?.data;
    const closest = stations?.features.reduce((prev, curr) => {
        if (!prev) {
            return curr;
        }

        const prevDistance = coordinateDistance(coordinates, [
            prev.geometry.coordinates[1],
            prev.geometry.coordinates[0],
        ]);

        const currDistance = coordinateDistance(coordinates, [
            curr.geometry.coordinates[1],
            curr.geometry.coordinates[0],
        ]);

        return prevDistance < currDistance ? prev : curr;
    }, stations.features[0]);

    return closest;
}

/** @param {[number, number]} coordinates
 * @returns {Promise<NearbyStations>}
 */
export async function findNearbyStations(coordinates) {
    // Station lists are shared and cached: finish their requests even if the
    // form moves to another location while they are loading.
    const [fmiResult, roadResult] = await Promise.allSettled([
        findClosestFmiStation(coordinates),
        findClosestRoadStation(coordinates),
    ]);
    const fmi = fmiResult.status === "fulfilled" ? fmiResult.value : null;
    const road = roadResult.status === "fulfilled" ? roadResult.value : null;
    const distance = road
        ? coordinateDistance(coordinates, [
              road.geometry.coordinates[1],
              road.geometry.coordinates[0],
          ])
        : Infinity;
    return {
        fmi: fmi && fmi.distance < 100000 ? fmi : null,
        fintraffic:
            road && distance < 100000
                ? {
                      id: String(road.id),
                      name: road.properties.name.replaceAll("_", " "),
                      distance,
                  }
                : null,
    };
}
