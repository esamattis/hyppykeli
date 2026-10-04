// @ts-check

/** @param {number} obsRange */
export function getObservationStartTime(obsRange) {
    const obsStartTime = new Date();
    obsStartTime.setHours(obsStartTime.getHours() - obsRange, 0, 0, 0);
    return obsStartTime;
}
