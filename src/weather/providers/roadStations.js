// @ts-check
import { CACHE_POLICIES } from "#app/weather/providers/cachePolicies.js";
import { coordinateDistance } from "#app/shared/coordinates.js";
import { fetchJSON } from "#app/shared/fetchJSON.js";

/**
 * @param {[number, number]} coordinates
 */
export async function findClosestRoadStation(coordinates) {
    /** @type {RoadStations|undefined} */
    const stations = await fetchJSON(
        "https://tie.digitraffic.fi/api/weather/v1/stations",
        {
            validate: (data) => Array.isArray(data?.features),
            cache: CACHE_POLICIES.stationMetadata,
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
        },
    );

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
