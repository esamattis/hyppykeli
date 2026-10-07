// @ts-check

/** Nominal heights identify levels; calculations use forecast heights above the DZ.
 * @type {Array<{ level: OpenMeteoPressureLevel, height: number }>}
 */
export const WIND_LEVELS = [
    { level: "400", height: 7000 },
    { level: "500", height: 5500 },
    { level: "600", height: 4200 },
    { level: "700", height: 3000 },
    { level: "850", height: 1500 },
    { level: "925", height: 800 },
    { level: "1000", height: 110 },
];
