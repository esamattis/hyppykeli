// @ts-check

export const FREEFALL_EXIT = 4000;
export const FREEFALL_OPENING = 800;
export const FREEFALL_SPEED = 180 / 3.6;

/**
 * Estimate wind-only drift at constant descent speed, or simulate a jump exit
 * with gravity and drag when the aircraft exit velocity is supplied.
 * Offsets are metres east/north of exit; bearings are meteorological (from).
 * @param {FreefallWindLevel[]} winds Descending altitude order.
 * @param {number} [exitHeight]
 * @param {number} [speedKmh]
 * @param {number} [openingHeight]
 * @param {WindVector} [exitVelocity] Initial air-relative velocity (m/s); enables
 * a descent from zero vertical speed with drag acting on the full velocity vector.
 * @returns {FreefallDriftPoint[] | null}
 */
export function getFreefallDrift(
    winds,
    exitHeight = FREEFALL_EXIT,
    speedKmh = FREEFALL_SPEED * 3.6,
    openingHeight = FREEFALL_OPENING,
    exitVelocity,
) {
    if (
        !Number.isFinite(exitHeight) ||
        exitHeight <= openingHeight ||
        exitHeight > 4200 ||
        !Number.isFinite(openingHeight) ||
        openingHeight < 800 ||
        !Number.isFinite(speedKmh) ||
        speedKmh <= 0 ||
        (exitVelocity &&
            (!Number.isFinite(exitVelocity.east) ||
                !Number.isFinite(exitVelocity.north))) ||
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

    if (exitVelocity)
        return getJumpDrift(
            winds,
            exitHeight,
            speedKmh / 3.6,
            openingHeight,
            exitVelocity,
        );

    /** @param {number} height */
    const atHeight = (height) => getWindAtHeight(winds, height);
    const fallSpeed = speedKmh / 3.6;
    const path = [{ height: exitHeight, east: 0, north: 0 }];
    let east = 0;
    let north = 0;
    for (let height = exitHeight; height > openingHeight;) {
        const boundary =
            winds.find((wind) => wind.height < height)?.height ??
            FREEFALL_OPENING;
        const nextHeight = Math.max(height - 100, boundary, openingHeight);
        const from = atHeight(height);
        const to = atHeight(nextHeight);
        if (!from || !to) return null;
        const seconds = (height - nextHeight) / fallSpeed;
        east += ((from.east + to.east) / 2) * seconds;
        north += ((from.north + to.north) / 2) * seconds;
        path.push({ height: nextHeight, east, north });
        height = nextHeight;
    }
    return path;
}

/**
 * Simulate a level-aircraft exit using gravity and quadratic drag. The selected
 * freefall speed calibrates the drag coefficient as terminal vertical speed.
 * Positions and velocities are relative to the ground; drag uses the local
 * air-relative velocity, so changing winds accelerate the jumper gradually.
 * @param {FreefallWindLevel[]} winds
 * @param {number} exitHeight
 * @param {number} terminalSpeed
 * @param {number} openingHeight
 * @param {WindVector} exitVelocity
 * @returns {FreefallDriftPoint[] | null}
 */
function getJumpDrift(
    winds,
    exitHeight,
    terminalSpeed,
    openingHeight,
    exitVelocity,
) {
    const gravity = 9.80665;
    const drag = gravity / terminalSpeed ** 2;
    const exitWind = getWindAtHeight(winds, exitHeight);
    if (!exitWind) return null;
    /** @type {FreefallMotion} */
    let motion = {
        height: exitHeight,
        east: 0,
        north: 0,
        eastSpeed: exitVelocity.east + exitWind.east,
        northSpeed: exitVelocity.north + exitWind.north,
        downSpeed: 0,
    };
    /** @param {FreefallMotion} state @returns {FreefallMotion} */
    const derivative = (state) => {
        // RK stages may overshoot the opening altitude on the final step.
        const wind = getWindAtHeight(
            winds,
            Math.max(openingHeight, state.height),
        );
        if (!wind) throw new Error("Missing jump-drift wind layer");
        const east = state.eastSpeed - wind.east;
        const north = state.northSpeed - wind.north;
        const resistance = drag * Math.hypot(east, north, state.downSpeed);
        return {
            height: -state.downSpeed,
            east: state.eastSpeed,
            north: state.northSpeed,
            eastSpeed: -resistance * east,
            northSpeed: -resistance * north,
            downSpeed: gravity - resistance * state.downSpeed,
        };
    };
    /** @param {FreefallMotion} state @param {FreefallMotion} slope @param {number} seconds @returns {FreefallMotion} */
    const advance = (state, slope, seconds) => ({
        height: state.height + slope.height * seconds,
        east: state.east + slope.east * seconds,
        north: state.north + slope.north * seconds,
        eastSpeed: state.eastSpeed + slope.eastSpeed * seconds,
        northSpeed: state.northSpeed + slope.northSpeed * seconds,
        downSpeed: state.downSpeed + slope.downSpeed * seconds,
    });
    /** @param {FreefallMotion} state @param {number} seconds */
    const step = (state, seconds) => {
        const a = derivative(state);
        const b = derivative(advance(state, a, seconds / 2));
        const c = derivative(advance(state, b, seconds / 2));
        const d = derivative(advance(state, c, seconds));
        return advance(
            state,
            {
                height: (a.height + 2 * b.height + 2 * c.height + d.height) / 6,
                east: (a.east + 2 * b.east + 2 * c.east + d.east) / 6,
                north: (a.north + 2 * b.north + 2 * c.north + d.north) / 6,
                eastSpeed:
                    (a.eastSpeed +
                        2 * b.eastSpeed +
                        2 * c.eastSpeed +
                        d.eastSpeed) /
                    6,
                northSpeed:
                    (a.northSpeed +
                        2 * b.northSpeed +
                        2 * c.northSpeed +
                        d.northSpeed) /
                    6,
                downSpeed:
                    (a.downSpeed +
                        2 * b.downSpeed +
                        2 * c.downSpeed +
                        d.downSpeed) /
                    6,
            },
            seconds,
        );
    };
    const path = [{ height: exitHeight, east: 0, north: 0 }];
    let elapsed = 0;
    let nextSample = 0.25;
    // Bound work for implausibly slow or extreme speeds supplied in shared URLs.
    for (let iteration = 0; iteration < 100000; iteration++) {
        const wind = getWindAtHeight(winds, motion.height);
        if (!wind) return null;
        const relativeSpeed = Math.hypot(
            motion.eastSpeed - wind.east,
            motion.northSpeed - wind.north,
            motion.downSpeed,
        );
        const seconds = Math.min(
            0.05,
            0.2 / (drag * Math.max(relativeSpeed, terminalSpeed)),
        );
        let next = step(motion, seconds);
        if (next.height <= openingHeight) {
            // Refine the final time instead of interpolating distance by height:
            // height is quadratic in time immediately after a level exit.
            let low = 0;
            let high = seconds;
            for (let i = 0; i < 30; i++) {
                const middle = (low + high) / 2;
                next = step(motion, middle);
                if (next.height > openingHeight) low = middle;
                else high = middle;
            }
            path.push({
                height: openingHeight,
                east: next.east,
                north: next.north,
            });
            return path;
        }
        motion = next;
        elapsed += seconds;
        if (elapsed >= nextSample - 1e-9) {
            path.push({
                height: motion.height,
                east: motion.east,
                north: motion.north,
            });
            nextSample += elapsed < 10 ? 0.25 : 1;
        }
    }
    return null;
}

/**
 * Interpolate wind vectors, not bearings, at an altitude (metres).
 * @param {FreefallWindLevel[]} winds Descending altitude order; speeds in m/s.
 * @param {number} height
 * @returns {WindVector | null}
 */
export function getWindAtHeight(winds, height) {
    if (!Number.isFinite(height)) return null;
    const exactIndex = winds.findIndex((wind) => wind.height === height);
    const upperIndex =
        exactIndex >= 0
            ? exactIndex
            : winds.findIndex(
                  (wind, index) =>
                      wind.height >= height &&
                      (winds[index + 1]?.height ?? wind.height) <= height,
              );
    const upper = winds[upperIndex];
    const lower = upper?.height === height ? upper : winds[upperIndex + 1];
    if (
        !upper ||
        !lower ||
        [upper, lower].some(
            ({ speed, direction }) =>
                speed === null ||
                !Number.isFinite(speed) ||
                speed < 0 ||
                direction === null ||
                !Number.isFinite(direction),
        )
    )
        return null;
    const fraction =
        upper.height === lower.height
            ? 0
            : (upper.height - height) / (upper.height - lower.height);
    const vectors = [upper, lower].map((wind) => {
        const radians = ((wind.direction ?? 0) * Math.PI) / 180;
        return {
            east: -Math.sin(radians) * (wind.speed ?? 0),
            north: -Math.cos(radians) * (wind.speed ?? 0),
        };
    });
    const [from, to] = vectors;
    if (!from || !to) return null;
    return {
        east: from.east + (to.east - from.east) * fraction,
        north: from.north + (to.north - from.north) * fraction,
    };
}

/**
 * Solve the wind triangle for the selected ground track and true airspeed.
 * @param {FreefallWindLevel[]} winds
 * @param {JumpRunSettings} settings direction is the ground track, speedKmh is TAS.
 * @returns {JumpRunVelocity | null} null if wind is missing or track is infeasible.
 */
export function getJumpRunVelocity(winds, settings) {
    const wind = getWindAtHeight(winds, settings.exitHeight);
    const airspeed = settings.speedKmh / 3.6;
    if (
        !wind ||
        !Number.isFinite(airspeed) ||
        airspeed <= 0 ||
        !Number.isFinite(settings.direction)
    )
        return null;
    const radians = (settings.direction * Math.PI) / 180;
    const east = Math.sin(radians);
    const north = Math.cos(radians);
    const alongWind = wind.east * east + wind.north * north;
    const crossWind = wind.east * north - wind.north * east;
    if (Math.abs(crossWind) > airspeed) return null;
    const groundSpeed =
        Math.sqrt(Math.max(0, airspeed ** 2 - crossWind ** 2)) + alongWind;
    if (groundSpeed <= 0) return null;
    const ground = { east: east * groundSpeed, north: north * groundSpeed };
    return {
        ground,
        air: {
            east: ground.east - wind.east,
            north: ground.north - wind.north,
        },
    };
}

/**
 * Project an offset onto a sphere using distance and bearing from the exit.
 * @param {import('leaflet').LatLngLiteral} start
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

/**
 * @param {import('leaflet').LatLngLiteral} start
 * @param {JumpRunSettings} settings
 * @param {number} index
 * @param {WindVector} groundVelocity Ground velocity in m/s.
 * @returns {[number, number]}
 */
export function jumpRunCoordinates(start, settings, index, groundVelocity) {
    const seconds = settings.separationSeconds * index;
    return driftCoordinates(start, {
        height: 0,
        east: groundVelocity.east * seconds,
        north: groundVelocity.north * seconds,
    });
}
