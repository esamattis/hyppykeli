// @ts-check
import {
    EARTH_RADIUS_METRES,
    driftCoordinates,
    getWindAtHeight,
    jumpRunCoordinates,
} from "#app/map/freefall.js";

// Planning assumptions, also stated in the map help. This is wind drift only,
// not a canopy glide/reachability model.
const CANOPY_DESCENT_SPEED_MPS = 5;
const UPWIND_BUFFER_METRES = 50;

// Numerical tolerances are separate from the planning assumptions above.
const PROJECTION_MARGIN_METRES = 1;
const ZERO_WIND_TOLERANCE_MPS = 1e-6;
const CONSTRAINT_TOLERANCE_METRES = 1e-7;
// Unit-vector distance and determinant magnitude, respectively (dimensionless).
const DIRECTION_MATCH_TOLERANCE = 1e-10;
const PARALLEL_DIRECTION_TOLERANCE = 1e-10;

/** @param {WindVector} a @param {WindVector} b */
const dot = (a, b) => a.east * b.east + a.north * b.north;

/**
 * Closest feasible translation to the preferred wind-drift offset. In two
 * dimensions it is either the preference itself, a projection onto one edge,
 * or the intersection of two edges. Opposing constraints can be infeasible.
 * @param {WindVector} preferred
 * @param {OpeningWindConstraint[]} constraints
 * @returns {WindVector | null}
 */
function closestTranslation(preferred, constraints) {
    /** @type {WindVector | null} */
    let best = null;
    let distance = Infinity;
    /** @param {WindVector} candidate */
    const consider = (candidate) => {
        if (
            !Number.isFinite(candidate.east) ||
            !Number.isFinite(candidate.north) ||
            constraints.some(
                ({ direction, minimum }) =>
                    dot(candidate, direction) <
                    minimum - CONSTRAINT_TOLERANCE_METRES,
            )
        )
            return;
        const next = Math.hypot(
            candidate.east - preferred.east,
            candidate.north - preferred.north,
        );
        if (next < distance) {
            best = candidate;
            distance = next;
        }
    };
    consider(preferred);
    if (best) return best;
    for (const [index, a] of constraints.entries()) {
        const shift = a.minimum - dot(preferred, a.direction);
        consider({
            east: preferred.east + shift * a.direction.east,
            north: preferred.north + shift * a.direction.north,
        });
        for (const b of constraints.slice(index + 1)) {
            const determinant =
                a.direction.east * b.direction.north -
                a.direction.north * b.direction.east;
            if (Math.abs(determinant) < PARALLEL_DIRECTION_TOLERANCE) continue;
            consider({
                east:
                    (a.minimum * b.direction.north -
                        b.minimum * a.direction.north) /
                    determinant,
                north:
                    (a.direction.east * b.minimum -
                        b.direction.east * a.minimum) /
                    determinant,
            });
        }
    }
    return best;
}

/**
 * Place every predicted opening upwind of the landing point at every non-calm
 * layer below that opening. Prefer the offset compensating time-integrated
 * canopy wind drift, then enforce the individual layer constraints.
 * Winds use the application's nominal heights; they must include ground (0 m).
 * @param {import('leaflet').LatLngLiteral} target
 * @param {JumpRunSettings} settings
 * @param {JumpRunJumper[]} group
 * @param {JumpRunCalculation} calculation
 * @param {FreefallWindLevel[]} winds Descending altitude order, including ground.
 * @returns {import('leaflet').LatLngLiteral | null}
 */
export function startForAutomaticRun(
    target,
    settings,
    group,
    calculation,
    winds,
) {
    const { velocity } = calculation;
    if (!velocity || !group.length || winds.at(-1)?.height !== 0) return null;
    // A calm observation need not have a meaningful bearing.
    const profile = winds.map((wind) =>
        wind.speed === 0 ? { ...wind, direction: 0 } : wind,
    );
    /** @type {OpeningWindConstraint[]} */
    const constraints = [];
    const preferred = { east: 0, north: 0 };
    /** @type {AutomaticOpeningCheck[]} */
    const checks = [];
    for (const [index, jumper] of group.entries()) {
        const path = calculation.drift(jumper);
        const opening = path?.at(-1);
        if (!opening) return null;
        const seconds = settings.separationSeconds * index;
        const offset = {
            east: opening.east + velocity.ground.east * seconds,
            north: opening.north + velocity.ground.north * seconds,
        };
        const heights = [
            jumper.openingHeight,
            ...profile
                .filter((wind) => wind.height < jumper.openingHeight)
                .map((wind) => wind.height),
        ];
        const vectors = heights.map((height) =>
            getWindAtHeight(profile, height),
        );
        const drift = { east: 0, north: 0 };
        /** @type {WindVector[]} */
        const directions = [];
        for (const [layer, vector] of vectors.entries()) {
            if (!vector) return null;
            const speed = Math.hypot(vector.east, vector.north);
            if (speed > ZERO_WIND_TOLERANCE_MPS) {
                const direction = {
                    east: -vector.east / speed,
                    north: -vector.north / speed,
                };
                directions.push(direction);
                // The margin absorbs local-plane/spherical projection error;
                // the final geographic openings are checked below as well.
                const minimum =
                    UPWIND_BUFFER_METRES +
                    PROJECTION_MARGIN_METRES -
                    dot(offset, direction);
                const existing = constraints.find(
                    (item) =>
                        Math.hypot(
                            item.direction.east - direction.east,
                            item.direction.north - direction.north,
                        ) < DIRECTION_MATCH_TOLERANCE,
                );
                if (existing)
                    existing.minimum = Math.max(existing.minimum, minimum);
                else constraints.push({ direction, minimum });
            }
            const next = vectors[layer + 1];
            const height = heights[layer];
            const nextHeight = heights[layer + 1];
            if (next && height !== undefined && nextHeight !== undefined) {
                const time = (height - nextHeight) / CANOPY_DESCENT_SPEED_MPS;
                drift.east += ((vector.east + next.east) / 2) * time;
                drift.north += ((vector.north + next.north) / 2) * time;
            }
        }
        preferred.east -= (offset.east + drift.east) / group.length;
        preferred.north -= (offset.north + drift.north) / group.length;
        checks.push({ index, opening, directions });
    }
    const translation = closestTranslation(preferred, constraints);
    if (!translation) return null;
    const [lat, lng] = driftCoordinates(target, { height: 0, ...translation });
    const start = { lat, lng };
    // Check the same spherical positions that the map will render. Large offsets
    // or near-opposing winds must not escape the constraints through projection.
    for (const { index, opening, directions } of checks) {
        const [exitLat, exitLng] = jumpRunCoordinates(
            start,
            settings,
            index,
            velocity.ground,
        );
        const [openingLat, openingLng] = driftCoordinates(
            { lat: exitLat, lng: exitLng },
            opening,
        );
        const radians = Math.PI / 180;
        const from = target.lat * radians;
        const to = openingLat * radians;
        const delta = (openingLng - target.lng) * radians;
        const east = Math.sin(delta) * Math.cos(to);
        const north =
            Math.cos(from) * Math.sin(to) -
            Math.sin(from) * Math.cos(to) * Math.cos(delta);
        const length = Math.hypot(east, north);
        const distance =
            EARTH_RADIUS_METRES *
            Math.atan2(
                length,
                Math.sin(from) * Math.sin(to) +
                    Math.cos(from) * Math.cos(to) * Math.cos(delta),
            );
        const offset = length
            ? {
                  east: (east / length) * distance,
                  north: (north / length) * distance,
              }
            : { east: 0, north: 0 };
        if (
            directions.some(
                (direction) => dot(offset, direction) < UPWIND_BUFFER_METRES,
            )
        )
            return null;
    }
    return start;
}
