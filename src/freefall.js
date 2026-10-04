// @ts-check
export const FREEFALL_EXIT = 4000;
export const FREEFALL_OPENING = 800;
export const FREEFALL_SPEED = 180 / 3.6;

/**
 * Integrate linearly interpolated wind vectors during a constant-speed descent.
 * Offsets are metres east/north of exit; bearings are meteorological (from).
 * @param {FreefallWindLevel[]} winds Descending altitude order.
 * @param {number} [exitHeight]
 * @param {number} [speedKmh]
 * @param {number} [openingHeight]
 * @returns {FreefallDriftPoint[] | null}
 */
export function getFreefallDrift(
    winds,
    exitHeight = FREEFALL_EXIT,
    speedKmh = FREEFALL_SPEED * 3.6,
    openingHeight = FREEFALL_OPENING,
) {
    if (
        !Number.isFinite(exitHeight) ||
        exitHeight <= openingHeight ||
        exitHeight > 4200 ||
        !Number.isFinite(openingHeight) ||
        openingHeight < 800 ||
        !Number.isFinite(speedKmh) ||
        speedKmh <= 0 ||
        winds.length !== 4 ||
        winds.some(
            ({ height, speed, direction }, index) =>
                height !== [4200, 3000, 1500, 800][index] ||
                speed === null ||
                !Number.isFinite(speed) ||
                speed < 0 ||
                direction === null ||
                !Number.isFinite(direction),
        )
    )
        return null;

    const vectors = winds.map(({ height, speed, direction }) => {
        const radians = ((direction ?? 0) * Math.PI) / 180;
        return {
            height,
            east: -Math.sin(radians) * (speed ?? 0),
            north: -Math.cos(radians) * (speed ?? 0),
        };
    });
    /** @param {number} height */
    const atHeight = (height) => {
        const index = vectors.findIndex(
            (wind, i) =>
                wind.height >= height &&
                (vectors[i + 1]?.height ?? Infinity) <= height,
        );
        const upper = vectors[index];
        const lower = vectors[index + 1];
        if (!upper || !lower) throw new Error("Missing freefall wind layer");
        const fraction =
            (upper.height - height) / (upper.height - lower.height);
        return {
            east: upper.east + (lower.east - upper.east) * fraction,
            north: upper.north + (lower.north - upper.north) * fraction,
        };
    };
    const path = [{ height: exitHeight, east: 0, north: 0 }];
    let east = 0;
    let north = 0;
    for (let height = exitHeight; height > openingHeight;) {
        const boundary =
            vectors.find((wind) => wind.height < height)?.height ??
            FREEFALL_OPENING;
        const nextHeight = Math.max(height - 100, boundary, openingHeight);
        const from = atHeight(height);
        const to = atHeight(nextHeight);
        const seconds = (height - nextHeight) / (speedKmh / 3.6);
        east += ((from.east + to.east) / 2) * seconds;
        north += ((from.north + to.north) / 2) * seconds;
        path.push({ height: nextHeight, east, north });
        height = nextHeight;
    }
    return path;
}

/**
 * Project an offset onto a sphere using distance and bearing from the exit.
 * @param {import('leaflet').LatLng} start
 * @param {FreefallDriftPoint} offset
 * @returns {[number, number]}
 */
export function driftCoordinates(start, { east, north }) {
    const distance = Math.hypot(east, north) / 6371000;
    const bearing = Math.atan2(east, north);
    const lat = (start.lat * Math.PI) / 180;
    const lon = (start.lng * Math.PI) / 180;
    const endLat = Math.asin(
        Math.sin(lat) * Math.cos(distance) +
            Math.cos(lat) * Math.sin(distance) * Math.cos(bearing),
    );
    const endLon =
        lon +
        Math.atan2(
            Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
            Math.cos(distance) - Math.sin(lat) * Math.sin(endLat),
        );
    return [
        (endLat * 180) / Math.PI,
        (((endLon * 180) / Math.PI + 540) % 360) - 180,
    ];
}
