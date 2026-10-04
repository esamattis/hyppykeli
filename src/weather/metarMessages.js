// @ts-check
import { parseMETAR } from "./metar.js";

/** @param {string[]} metars */
export function parseMetarMessages(metars) {
    return metars.map((metar) => {
        const m = parseMETAR(metar);
        /** @type MetarData */
        const metarData = {
            time: new Date(m.time),
            metar,
            cbWithoutLayer: m.cbWithoutLayer,
            wind: {
                gust: m.wind.gust ?? undefined,
                speed: m.wind.speed ?? NaN,
                direction: m.wind.direction ?? NaN,
                unit: m.wind.unit.toLowerCase(),
            },
            temperature: m.temperature ?? NaN,
            clouds:
                m.clouds?.map((cloud) => {
                    return {
                        metarCode: cloud.metarCode,
                        cumulonimbus: cloud.cumulonimbus,
                        amount: cloud.abbreviation,
                        base: cloud.altitude ?? NaN,
                        unit: "ft",
                    };
                }) ?? [],
        };

        return metarData;
    });
}
