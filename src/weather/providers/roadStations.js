// @ts-check
import { coordinateDistance } from "../../shared/coordinates.js";
import { fetchJSON } from "../../shared/fetchJSON.js";

/**
 * @param {[number, number]} coordinates
 */
export async function findClosestRoadStation(coordinates) {
    /** @type {RoadStations|undefined} */
    const stations = await fetchJSON(
        "https://tie.digitraffic.fi/api/weather/v1/stations",
        {
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
