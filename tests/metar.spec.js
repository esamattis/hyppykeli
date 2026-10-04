// Ported from https://github.com/skydivejkl/metar.js/blob/master/test/metar.test.js
import { test, expect } from "@playwright/test";
import { parseMETAR as parseMetar, parseRVR } from "#app/weather/metar.js";

test.describe("METAR parser", function () {
    test("can parse type", function () {
        let m = parseMetar("SPECI EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.type).toEqual("SPECI");

        m = parseMetar("METAR EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.type).toEqual("METAR");

        m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.type).toEqual("METAR");
    });

    test("can parse station", function () {
        let m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.station).toEqual("EFJY");
    });

    test("can parse time of observation", function () {
        let m = parseMetar("EFJY 181750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.time.getUTCDate()).toEqual(18);
        expect(m.time.getUTCHours()).toEqual(17);
        expect(m.time.getUTCMinutes()).toEqual(50);
    });

    test("can parse auto", function () {
        let m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.auto).toEqual(true);
    });

    test("can parse correction", function () {
        let m = parseMetar(
            "CYZF 241700Z CCA 32012G18KT 12SM BKN007 OVC042 M02/M05 A2956",
        );
        expect(m.correction).toEqual("A");

        m = parseMetar("PAOM 302353Z COR 32005KT 10SM CLR M03/M09 A2993");
        expect(m.correction).toEqual(true);

        m = parseMetar(
            "KCNO 302353Z COR 25013KT 10SM FEW180 23/14 A2994 RMK AO2 SLP133 T02330139 10306 20217 55002",
        );
        expect(m.correction).toEqual(true);

        // The correction can appear here too
        m = parseMetar("METAR COR EFUT 060620Z 01008KT CAVOK M10/M12 Q1021=");
        expect(m.correction).toEqual(true);

        // Just assert that the values are parsed
        expect(m.dewpoint).toEqual(-12);
        expect(m.wind).toEqual({
            direction: 10,
            gust: null,
            speed: 8,
            unit: "KT",
            variation: null,
        });
    });

    test("can parse metar without auto", function () {
        let m = parseMetar("EFJY 171750Z 29007KT CAVOK 15/12 Q1006");
        expect(m.wind.direction).toEqual(290);
        expect(!m.auto).toBeTruthy();
    });

    test("can parse CAVOK", function () {
        let m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
        expect(m.cavok).toEqual(true);
    });

    test.describe("for winds", function () {
        test("can parse direction", function () {
            let m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
            expect(m.wind.direction).toEqual(290);
        });
        test("can parse speed", function () {
            let m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
            expect(m.wind.speed).toEqual(7);
            expect(m.wind.unit).toEqual("KT");
        });
        test("can parse variable directions", function () {
            let m = parseMetar(
                "EFHF 171820Z AUTO 29007KT 240V330 CAVOK 15/11 Q1010",
            );
            expect(m.wind.variation).toEqual({ min: 240, max: 330 });
        });
        test("can parse small variable directions", function () {
            let m = parseMetar("EFVA 171850Z AUTO VRB02KT CAVOK 15/11 Q1008");
            expect(m.wind.speed).toEqual(2);
            expect(m.wind.variation).toEqual(true);
            expect(m.wind.direction).toEqual("VRB");
        });
        test("can parse gusts", function () {
            let m = parseMetar(
                "EFVA 171850Z AUTO 24028G42KT CAVOK 15/11 Q1008",
            );
            expect(m.wind.speed).toEqual(28);
            expect(!m.wind.variation).toBeTruthy();
            expect(m.wind.direction).toEqual(240);
            expect(m.wind.gust).toEqual(42);
        });

        test("can parse MPS speed", function () {
            let m = parseMetar(
                "ULLI 172030Z 23004MPS 9999 -SHRA SCT022CB BKN043 OVC066 13/10 Q1010 NOSIG",
            );
            expect(m.wind.speed).toEqual(4);
            expect(m.wind.unit).toEqual("MPS");
        });
    });

    test.describe("for visibility", function () {
        test("parses no visibility for CAVOK", function () {
            let m = parseMetar("EFJY 171750Z AUTO 29007KT CAVOK 15/12 Q1006");
            expect(!m.visibility).toBeTruthy();
        });
        test("can parse visibility", function () {
            let m = parseMetar(
                "EFET 171920Z AUTO 04007KT 010V070 9999 OVC035 09/05 Q1009",
            );
            expect(m.visibility).toEqual(9999);
        });
        test("can skip missing visibility", function () {
            let m = parseMetar(
                "EFHF 172050Z AUTO 26003KT //// SKC 13/10 Q1012",
            );
            expect(m.visibility).toEqual(null);
            expect(m.clouds).toEqual([
                {
                    metarCode: "SKC",
                    abbreviation: "SKC",
                    meaning: "sky clear",
                    cumulonimbus: false,
                    altitude: null,
                },
            ]);
        });
        test("can parse visibility directional variation", function () {
            let m = parseMetar(
                "EFJY 201120Z 30001KT 9999 1500NW -SN SCT002 BKN007 M17/M18 Q1031",
            );
            expect(m.visibility).toEqual(9999);
            expect(m.visibilityVariation).toEqual("1500");
            expect(m.visibilityVariationDirection).toEqual("NW");
        });

        test("can parse minimum visibility without a direction", function () {
            const m = parseMetar(
                "METAR EFKU 041220Z AUTO 22008KT 9999 4700 SHRA BKN006 //////CB 12/11 Q1011=",
            );

            expect(m.visibility).toEqual(9999);
            expect(m.visibilityVariation).toEqual("4700");
            expect(m.visibilityVariationDirection).toEqual(null);
            expect(m.clouds).toMatchObject([
                { metarCode: "BKN006", altitude: 600 },
            ]);
            expect(m.cbWithoutLayer).toBe(true);
            expect(m.temperature).toBe(12);
            expect(m.dewpoint).toBe(11);
            expect(m.altimeterInHpa).toBe(1011);
        });

        test("can parse clouds after directional visibility", () => {
            let m = parseMetar(
                "EFJY 201120Z 30001KT 9999 1500NW -SN SCT002 BKN007 M17/M18 Q1031",
            );
            expect(m.clouds).toEqual([
                {
                    metarCode: "SCT002",
                    abbreviation: "SCT",
                    altitude: 200,
                    cumulonimbus: false,
                    meaning: "scattered",
                },
                {
                    metarCode: "BKN007",
                    abbreviation: "BKN",
                    altitude: 700,
                    cumulonimbus: false,
                    meaning: "broken",
                },
            ]);
        });
    });

    test.describe("for weather conditions", function () {
        test("can parse it", function () {
            let m = parseMetar(
                "EFKI 171950Z 00000KT 9999 MIFG FEW012 SCT200 10/10 Q1006",
            );
            expect(m.weather).toEqual([
                { abbreviation: "MI", meaning: "shallow" },
                { abbreviation: "FG", meaning: "fog" },
            ]);
        });
        test("can parse single attribute weather", function () {
            let m = parseMetar(
                "EFKI 172020Z AUTO 00000KT 2600 BR SKC 09/09 Q1006",
            );
            expect(m.weather).toEqual([
                { abbreviation: "BR", meaning: "mist" },
            ]);
        });
        test("can parse three attribute weather", function () {
            let m = parseMetar(
                "ULLI 172030Z 23004MPS 9999 -SHRA SCT022CB BKN043 OVC066 13/10 Q1010 NOSIG",
            );
            expect(m.weather).toEqual([
                { abbreviation: "-", meaning: "light intensity" },
                { abbreviation: "SH", meaning: "showers" },
                { abbreviation: "RA", meaning: "rain" },
            ]);
        });

        test("can parse multiple weather conditions", function () {
            let m = parseMetar(
                "EFJY 092120Z AUTO 05003KT 9999 -SHRA VCSH SCT006 OVC028CB 13/13 Q1014",
            );
            expect(m.weather).toEqual([
                { abbreviation: "-", meaning: "light intensity" },
                { abbreviation: "SH", meaning: "showers" },
                { abbreviation: "RA", meaning: "rain" },
                { abbreviation: "VC", meaning: "in the vicinity" },
                { abbreviation: "SH", meaning: "showers" },
            ]);

            expect(2).toEqual(m.clouds.length);
        });
    });

    test.describe("for clouds", function () {
        test("can parse single cloud level", function () {
            let m = parseMetar(
                "EFET 171920Z AUTO 04007KT 010V070 9999 OVC035 09/05 Q1009",
            );
            expect(m.clouds).toEqual([
                {
                    metarCode: "OVC035",
                    abbreviation: "OVC",
                    meaning: "overcast",
                    cumulonimbus: false,
                    altitude: 3500,
                },
            ]);
        });

        test("can parse no cloud", function () {
            // "//////" Element not available from an automated observation.
            let m = parseMetar(
                "EFVA 171520Z AUTO 31010KT 270V340 9999 ////// 09/03 Q1009",
            );
            expect(m.clouds).toEqual(null);
        });

        test("can parse cloud with second directional visibility", function () {
            let m = parseMetar(
                "EFJY 201120Z 30001KT 9999 1500NW -SN SCT002 BKN007 M17/M18 Q1031",
            );

            expect(m.clouds[0]).toEqual({
                metarCode: "SCT002",
                abbreviation: "SCT",
                meaning: "scattered",
                cumulonimbus: false,
                altitude: 200,
            });

            expect(m.clouds[1]).toEqual({
                metarCode: "BKN007",
                abbreviation: "BKN",
                meaning: "broken",
                cumulonimbus: false,
                altitude: 700,
            });
        });

        test("can parse multiple cloud levels", function () {
            let m = parseMetar(
                "EFVR 171950Z AUTO 27006KT 220V310 9999 FEW012 SCT015 BKN060 13/12 Q1006",
            );
            expect(m.clouds[0]).toEqual({
                metarCode: "FEW012",
                abbreviation: "FEW",
                meaning: "few",
                cumulonimbus: false,
                altitude: 1200,
            });
            expect(m.clouds[1]).toEqual({
                metarCode: "SCT015",
                abbreviation: "SCT",
                meaning: "scattered",
                cumulonimbus: false,
                altitude: 1500,
            });
            expect(m.clouds[2]).toEqual({
                metarCode: "BKN060",
                abbreviation: "BKN",
                meaning: "broken",
                cumulonimbus: false,
                altitude: 6000,
            });
        });

        test("runway visibility does not break cloud parsing", function () {
            let m = parseMetar(
                "EFJY 082120Z AUTO 00000KT 9999 R30/1300U BKN083 BKN101 15/12 Q1013",
            );
            expect(m.clouds).toBeTruthy();
        });

        test("can parse without altitude", function () {
            let m = parseMetar(
                "EFKI 172020Z AUTO 00000KT 2600 BR SKC 09/09 Q1006",
            );
            expect(m.clouds).toEqual([
                {
                    metarCode: "SKC",
                    abbreviation: "SKC",
                    altitude: null,
                    cumulonimbus: false,
                    meaning: "sky clear",
                },
            ]);

            expect(m.visibility).toEqual(2600);
        });

        test("can parse NCD (no clouds)", function () {
            let m = parseMetar(
                "EFKA 181750Z AUTO 30007KT //// NCD 16/04 Q1015",
            );
            expect(m.visibility).toEqual(null);
            expect(m.clouds).toEqual([
                {
                    metarCode: "NCD",
                    abbreviation: "NCD",
                    altitude: null,
                    cumulonimbus: false,
                    meaning: "no clouds",
                },
            ]);
        });

        test("can parse NSC (no significant clouds)", function () {
            let m = parseMetar(
                "EFKA 181750Z AUTO 30007KT //// NSC 16/04 Q1015",
            );
            expect(m.visibility).toEqual(null);
            expect(m.clouds).toEqual([
                {
                    metarCode: "NSC",
                    abbreviation: "NSC",
                    altitude: null,
                    cumulonimbus: false,
                    meaning: "no significant",
                },
            ]);
        });

        test("can parse VV", function () {
            let m = parseMetar(
                "EFVR 171950Z AUTO 27006KT 220V310 9999 VV060 13/12 Q1006",
            );
            expect(m.clouds).toEqual([
                {
                    metarCode: "VV060",
                    abbreviation: "VV",
                    altitude: 6000,
                    cumulonimbus: false,
                    meaning: "vertical visibility",
                },
            ]);
        });

        test("can parse cumulonimbus", function () {
            let m = parseMetar(
                "EFJY 201050Z AUTO 16007KT 9999 -SHRA OVC060CB 15/09 Q1017",
            );
            expect(m.clouds).toEqual([
                {
                    metarCode: "OVC060CB",
                    abbreviation: "OVC",
                    altitude: 6000,
                    meaning: "overcast",
                    cumulonimbus: true,
                },
            ]);
        });
    });

    test.describe("for temp/dewpoint", function () {
        test("can parse it", function () {
            let m = parseMetar(
                "EFKI 171950Z 00000KT 9999 MIFG FEW012 SCT200 10/11 Q1006",
            );
            expect(m.temperature).toEqual(10);
            expect(m.dewpoint).toEqual(11);
        });

        test("can parse neg", function () {
            let m = parseMetar(
                "KLZZ 302355Z AUTO 00000KT 10SM CLR 04/M02 A3029 RMK AO2 T00391018 10070 20031",
            );
            expect(m.temperature).toEqual(4);
            expect(m.dewpoint).toEqual(-2);
        });

        test("can parse both neg", function () {
            let m = parseMetar(
                "CYZF 241700Z 32012G18KT 12SM BKN007 OVC042 M02/M03 A2956 RMK SC7SC1 SLP024",
            );
            expect(m.temperature).toEqual(-2);
            expect(m.dewpoint).toEqual(-3);
        });
    });

    test.describe("for altimeter", function () {
        test("can parse hPa pressure", function () {
            let m = parseMetar(
                "EFKI 171950Z 00000KT 9999 MIFG FEW012 SCT200 10/11 Q1006",
            );
            expect(m.altimeterInHpa).toEqual(1006);
        });

        test("can parse inches of mercury", function () {
            let m = parseMetar(
                "KLZZ 302355Z AUTO 00000KT 10SM CLR 04/M02 A3029 RMK AO2 T00391018 10070 20031",
            );
            expect(m.altimeterInHg).toEqual(30.29);
        });
    });

    test.describe("for recent significant weather", function () {
        test("can parse Moderate/heavy rain showers [RESHRA]", function () {
            let m = parseMetar(
                "EFKI 171950Z 00000KT 9999 MIFG FEW012 SCT200 10/11 Q1006 RESHRA",
            );
            expect(m.recentSignificantWeather).toEqual("RESHRA");
            expect(m.recentSignificantWeatherDescription).toEqual(
                "Moderate/heavy rain showers",
            );
        });

        test("can parse Auto recent weather Unidentified precipitation", function () {
            let m = parseMetar(
                "EFKI 171950Z 00000KT 9999 MIFG FEW012 SCT200 10/11 Q1006 REUP",
            );
            expect(m.recentSignificantWeather).toEqual("REUP");
            expect(m.recentSignificantWeatherDescription).toEqual(
                "Unidentified precipitation (AUTO obs. only)",
            );
        });

        test("can parse obs without recent weather", function () {
            let m = parseMetar(
                "EFKI 171950Z 00000KT 9999 MIFG FEW012 SCT200 10/11 Q1006=",
            );
            expect(m.recentSignificantWeather).toEqual(null);
            expect(m.recentSignificantWeatherDescription).toEqual(null);
        });
    });

    test.describe("for rvr", function () {
        test("runway can be parsed", function () {
            let m = parseMetar(
                "EFJY 082120Z AUTO 00000KT 9999 R30/1300U BKN083 BKN101 15/12 Q1013",
            );
            expect(m.rvr.runway).toBe("R30");
            expect(m.rvr.seperator).toBe("/");
            expect(m.rvr.minValue).toBe("1300");
            expect(m.rvr.trend).toBe("U");
        });
    });
});

test.describe("cloud parsing extensions", () => {
    for (const groups of [
        "//////CB",
        "OVC005 //////CB",
        "//////CB FEW005 SCT015CB",
        "FEW005CB //////CB SCT015",
    ]) {
        test(`consumes CB without a layer: ${groups}`, () => {
            const m = parseMetar(
                `METAR EFJY 040720Z AUTO 19007KT 9999 ${groups} 11/09 Q1014=`,
            );
            expect(m.cbWithoutLayer).toBe(true);
            expect(m.clouds?.map((cloud) => cloud.metarCode) ?? []).toEqual(
                groups.split(" ").filter((token) => token !== "//////CB"),
            );
            expect(m.temperature).toBe(11);
            expect(m.dewpoint).toBe(9);
            expect(m.altimeterInHpa).toBe(1014);
        });
    }

    for (const code of ["VV///", "BKN///", "FEW///CB", "SCT015TCU", "BKN000"]) {
        test(`preserves cloud token ${code}`, () => {
            const m = parseMetar(
                `EFJY 040720Z 19007KT 9999 ${code} 11/09 Q1014`,
            );
            expect(m.clouds).toHaveLength(1);
            expect(m.clouds[0]).toMatchObject({
                metarCode: code,
                altitude: code.includes("///")
                    ? null
                    : code === "BKN000"
                      ? 0
                      : 1500,
                cumulonimbus: code.endsWith("CB"),
            });
            expect(m.cbWithoutLayer).toBe(false);
            expect(m.temperature).toBe(11);
            expect(m.altimeterInHpa).toBe(1014);
        });
    }

    test("parses known cloud heights with unavailable cloud types", () => {
        const m = parseMetar(
            "METAR EFLA 041150Z AUTO 22005KT 200V260 9999 -RA SCT007/// BKN009/// OVC014/// 12/11 Q1014 RERA=",
        );

        expect(m.clouds).toMatchObject([
            { metarCode: "SCT007///", altitude: 700 },
            { metarCode: "BKN009///", altitude: 900 },
            { metarCode: "OVC014///", altitude: 1400 },
        ]);
        expect(m.temperature).toBe(12);
        expect(m.dewpoint).toBe(11);
        expect(m.altimeterInHpa).toBe(1014);
    });

    test("consumes unavailable cloud data without losing temperature or pressure", () => {
        const m = parseMetar("EFJY 040720Z 19007KT 9999 ////// 11/09 Q1014");
        expect(m.clouds).toBeNull();
        expect(m.cbWithoutLayer).toBe(false);
        expect(m.temperature).toBe(11);
        expect(m.dewpoint).toBe(9);
        expect(m.altimeterInHpa).toBe(1014);
    });

    test("ignores cloud and CB tokens in remarks and trends", () => {
        for (const suffix of [
            "RMK //////CB BKN005CB",
            "TEMPO BKN005CB //////CB",
        ]) {
            const m = parseMetar(
                `EFJY 040720Z 19007KT 9999 SCT015 11/09 Q1014 ${suffix}`,
            );
            expect(m.cbWithoutLayer).toBe(false);
            expect(m.clouds).toHaveLength(1);
            expect(m.clouds[0]).toMatchObject({
                metarCode: "SCT015",
                cumulonimbus: false,
            });
        }
    });

    test("accepts whitespace between tokens", () => {
        const m = parseMetar(
            "  EFJY\t040720Z  19007KT\n9999\tOVC005\t//////CB 11/09 Q1014=  ",
        );
        expect(m.clouds[0].metarCode).toBe("OVC005");
        expect(m.cbWithoutLayer).toBe(true);
        expect(m.temperature).toBe(11);
    });
});

test.describe("runway visual range helper", () => {
    test("parses variable range, limits, runway side and feet", () => {
        expect(parseRVR("R30L/M0600VP1200UFT")).toEqual({
            runway: "R30",
            direction: "L",
            seperator: "/",
            minIndicator: "M",
            minValue: "0600",
            variableIndicator: "V",
            maxIndicator: "P",
            maxValue: "1200",
            trend: "U",
            unitsOfMeasure: "FT",
        });
    });
    test("returns null for a missing runway range", () => {
        expect(parseRVR("////")).toBeNull();
    });
});
