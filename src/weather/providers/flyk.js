// @ts-check
import { fetchJSON } from "#app/shared/fetchJSON.js";

/**
 * Fetches METAR data from the Flyk API for a given ICAO code.
 *
 * @param {string} icaocode - The ICAO code of the airport.
 */
export async function fetchFlykMetar(icaocode) {
    /** @type {FlykMetar} */
    const data = await fetchJSON("https://flyk.com/api/metars.geojson");
    const re = new RegExp(`^(METAR|SPECI) ${icaocode} `);
    const features = data.features.find((f) => {
        return re.test(f.properties.text);
    });
    return features?.properties.text;
}
