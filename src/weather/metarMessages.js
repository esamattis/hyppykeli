// @ts-check
import { parseMETAR } from "#app/weather/metar.js";

/** @type {{ phenomenon: MetarPhenomenon, codes: string[] }[]} */
const phenomena = [
    { phenomenon: "thunderstorm", codes: ["TS"] },
    { phenomenon: "freezing", codes: ["FZ"] },
    { phenomenon: "rain", codes: ["RA", "DZ"] },
    { phenomenon: "snow", codes: ["SN", "SG"] },
    { phenomenon: "hail", codes: ["GR", "GS"] },
    { phenomenon: "icePellets", codes: ["PL"] },
    { phenomenon: "fog", codes: ["FG"] },
    { phenomenon: "mist", codes: ["BR"] },
];

/** @param {string[]} metars */
export function parseMetarMessages(metars) {
    return metars.map((metar) => {
        const m = parseMETAR(metar);
        /** @type MetarData */
        const metarData = {
            time: new Date(m.time),
            metar,
            cbWithoutLayer: m.cbWithoutLayer,
            phenomena: phenomena
                .filter(({ codes }) =>
                    m.weather?.some(({ abbreviation }) =>
                        codes.includes(abbreviation),
                    ),
                )
                .map(({ phenomenon }) => phenomenon),
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
