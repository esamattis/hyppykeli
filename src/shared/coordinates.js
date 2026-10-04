// @ts-check

/**
 * @param {number} degrees
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * @param {[number,number]|string} coord1
 * @param {[number,number]|string} coord2
 */
export function coordinateDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters

    if (typeof coord1 === "string") {
        coord1 = /** @type {[number, number]} */ (
            coord1.split(",").map(Number)
        );
    }

    if (typeof coord2 === "string") {
        coord2 = /** @type {[number, number]} */ (
            coord2.split(",").map(Number)
        );
    }

    const lat1 = toRadians(coord1[0]);
    const lon1 = toRadians(coord1[1]);
    const lat2 = toRadians(coord2[0]);
    const lon2 = toRadians(coord2[1]);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}
