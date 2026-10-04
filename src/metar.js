// @ts-check
// Forked from https://github.com/skydivejkl/metar.js
// Modified to use ES modules, typed JSDoc, and preserve cloud tokens.
/*
(The MIT License)

Copyright (c) 2013 Esa-Matti <esa-matti@suuronen.org>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/** @type {Record<string, string>} */
const CLOUDS = {
    NCD: "no clouds",
    SKC: "sky clear",
    CLR: "no clouds under 12,000 ft",
    NSC: "no significant",
    FEW: "few",
    SCT: "scattered",
    BKN: "broken",
    OVC: "overcast",
    VV: "vertical visibility",
};

/** @type {Record<string, string>} */
const WEATHER = {
    // Intensity
    "-": "light intensity",
    "+": "heavy intensity",
    VC: "in the vicinity",

    // Descriptor
    MI: "shallow",
    PR: "partial",
    BC: "patches",
    DR: "low drifting",
    BL: "blowing",
    SH: "showers",
    TS: "thunderstorm",
    FZ: "freezing",

    // Precipitation
    RA: "rain",
    DZ: "drizzle",
    SN: "snow",
    SG: "snow grains",
    IC: "ice crystals",
    PL: "ice pellets",
    GR: "hail",
    GS: "small hail",
    UP: "unknown precipitation",

    // Obscuration
    FG: "fog",
    VA: "volcanic ash",
    BR: "mist",
    HZ: "haze",
    DU: "widespread dust",
    FU: "smoke",
    SA: "sand",
    PY: "spray",

    // Other
    SQ: "squall",
    PO: "dust or sand whirls",
    DS: "duststorm",
    SS: "sandstorm",
    FC: "funnel cloud",
};

/** @type {Record<string, string>} */
const RECENT_WEATHER = {
    REBLSN: "Moderate/heavy blowing snow (visibility significantly reduced)reduced",
    REDS: "Dust Storm",
    REFC: "Funnel Cloud",
    REFZDZ: "Freezing Drizzle",
    REFZRA: "Freezing Rain",
    REGP: "Moderate/heavy snow pellets",
    REGR: "Moderate/heavy hail",
    REGS: "Moderate/heavy small hail",
    REIC: "Moderate/heavy ice crystals",
    REPL: "Moderate/heavy ice pellets",
    RERA: "Moderate/heavy rain",
    RESG: "Moderate/heavy snow grains",
    RESHGR: "Moderate/heavy hail showers",
    RESHGS: "Moderate/heavy small hail showers",
    // RESHGS: "Moderate/heavy snow pellet showers", // dual meaning?
    RESHPL: "Moderate/heavy ice pellet showers",
    RESHRA: "Moderate/heavy rain showers",
    RESHSN: "Moderate/heavy snow showers",
    RESN: "Moderate/heavy snow",
    RESS: "Sandstorm",
    RETS: "Thunderstorm",
    REUP: "Unidentified precipitation (AUTO obs. only)",
    REVA: "Volcanic Ash",
};

/**
 * @param {string} s
 * @param {Record<string, string>} map
 * @returns {MetarAbbreviation | undefined}
 */
function parseAbbreviation(s, map) {
    let abbreviation = "";
    let meaning;
    let length = 3;
    if (!s) return;
    while (length && !meaning) {
        abbreviation = s.slice(0, length);
        meaning = map[abbreviation];
        length--;
    }
    if (meaning) {
        return {
            abbreviation: abbreviation,
            meaning: meaning,
        };
    }
}

/**
 * @param {string} s
 * @returns {number}
 */
function asInt(s) {
    return parseInt(s, 10);
}

const variableWind = /^([0-9]{3})V([0-9]{3})$/;

/**
 * @param {string} s
 * @param {MetarAbbreviation[]} [res]
 * @returns {MetarAbbreviation[] | undefined}
 */
function parseWeatherAbbrv(s, res) {
    const weather = parseAbbreviation(s, WEATHER);
    if (weather) {
        res = res || [];
        res.push(weather);
        return parseWeatherAbbrv(s.slice(weather.abbreviation.length), res);
    }
    return res;
}

/**
 * Parse runway visual range. Retains the upstream `seperator` field spelling.
 * @param {string} rvrString
 * @returns {MetarRunwayVisibility | null}
 */
export function parseRVR(rvrString) {
    const matches =
        /(R\d{2})([LRC])?(\/)([PM])?(\d+)(?:V([PM])?(\d+))?([NUD])?(FT)?/.exec(
            rvrString,
        );
    if (!matches) return null;
    return {
        runway: matches[1] ?? "",
        direction: matches[2],
        seperator: matches[3] ?? "/",
        minIndicator: matches[4],
        minValue: matches[5] ?? "",
        variableIndicator: matches[7] ? "V" : undefined,
        maxIndicator: matches[6],
        maxValue: matches[7],
        trend: matches[8],
        unitsOfMeasure: matches[9],
    };
}

class METAR {
    /** @param {string} metarString */
    constructor(metarString) {
        this.fields = metarString.trim().replace(/=$/, "").split(/\s+/);
        this.i = -1;
        this.current = "";
        /** @type {MetarJSResponse} */
        this.result = {
            type: "METAR",
            station: "",
            time: new Date(),
            auto: false,
            correction: false,
            cavok: false,
            cbWithoutLayer: false,
            wind: {
                speed: null,
                gust: null,
                direction: null,
                variation: null,
                unit: "",
            },
            visibility: null,
            visibilityVariation: null,
            visibilityVariationDirection: null,
            weather: null,
            clouds: null,
            temperature: null,
            dewpoint: null,
            altimeterInHpa: null,
            altimeterInHg: null,
            recentSignificantWeather: null,
            recentSignificantWeatherDescription: null,
            rvr: null,
        };
    }
    /** @returns {string} */
    next() {
        this.i++;
        return (this.current = this.fields[this.i] ?? "");
    }

    /** @returns {string} */
    peek() {
        return this.fields[this.i + 1] ?? "";
    }

    parseType() {
        const token = this.peek();

        if (token === "METAR" || token === "SPECI") {
            this.next();
            this.result.type = token;
        } else {
            this.result.type = "METAR";
        }
    }

    parseStation() {
        this.next();
        this.result.station = this.current;
    }

    parseDate() {
        this.next();
        const d = new Date();
        d.setUTCDate(asInt(this.current.slice(0, 2)));
        d.setUTCHours(asInt(this.current.slice(2, 4)));
        d.setUTCMinutes(asInt(this.current.slice(4, 6)));
        this.result.time = d;
    }

    parseAuto() {
        this.result.auto = this.peek() === "AUTO";
        if (this.result.auto) this.next();
    }

    parseCorrection() {
        if (this.result.correction) {
            return;
        }

        const token = this.peek();
        this.result.correction = false;

        if (token.startsWith("CC")) {
            this.result.correction = token.slice(2, 3);
            this.next();
        }

        if (token === "COR") {
            this.result.correction = true;
            this.next();
        }
    }

    parseWind() {
        this.result.wind = {
            speed: null,
            gust: null,
            direction: null,
            variation: null,
            unit: "",
        };

        if (this.peek().match(/^[0-9]{1,4}(SM?)/)) {
            return;
        }
        this.next();

        const direction = this.current.slice(0, 3);
        if (direction === "VRB") {
            this.result.wind.direction = "VRB";
            this.result.wind.variation = true;
        } else {
            this.result.wind.direction = asInt(direction);
        }

        const gust = this.current.slice(5, 8);
        if (gust[0] === "G") {
            this.result.wind.gust = asInt(gust.slice(1));
        }

        this.result.wind.speed = asInt(this.current.slice(3, 5));

        const unitMatch = this.current.match(/KT|MPS|KPH|SM$/);
        if (unitMatch) {
            this.result.wind.unit = unitMatch[0];
        } else {
            throw new Error("Bad wind unit: " + this.current);
        }

        const varMatch = this.peek().match(variableWind);
        if (varMatch) {
            this.next();
            this.result.wind.variation = {
                min: asInt(varMatch[1] ?? ""),
                max: asInt(varMatch[2] ?? ""),
            };
        }
    }

    parseCavok() {
        this.result.cavok = this.peek() === "CAVOK";
        if (this.result.cavok) this.next();
    }

    parseVisibility() {
        const re = /^([0-9]+)([A-Z]{1,2})/g;
        this.result.visibility = null;
        this.result.visibilityVariation = null;
        this.result.visibilityVariationDirection = null;

        if (this.result.cavok) return;
        this.next();
        if (this.current === "////") return;
        this.result.visibility = asInt(this.current.slice(0, 4));

        // Look for a directional variation report
        if (this.peek().match(/^[0-9]+[N|E|S|W|NW|NE|SW|SE]/)) {
            this.next();

            let matches;
            while ((matches = re.exec(this.current)) != null) {
                if (matches.index === re.lastIndex) {
                    re.lastIndex++;
                }

                this.result.visibilityVariation = matches[1] ?? null;
                this.result.visibilityVariationDirection = matches[2] ?? null;
            }
        }
    }

    parseRunwayVisibility() {
        if (this.result.cavok) return;
        if (this.peek().match(/^R[0-9]+/)) {
            this.next();
            this.result.rvr = parseRVR(this.current);
            // TODO: peek is more than one RVR in METAR and parse
        }
    }

    parseWeather() {
        if (this.result.cavok) return;
        const weather = parseWeatherAbbrv(this.peek());

        if (!weather) return;
        if (!this.result.weather) this.result.weather = [];

        this.result.weather = this.result.weather.concat(weather);
        this.next();
        this.parseWeather();
    }

    parseClouds() {
        if (this.result.cavok) return;
        while (true) {
            const token = this.peek();
            if (/^\/{6}(?:CB|TCU)?$/.test(token)) {
                this.next();
                if (token.endsWith("CB")) this.result.cbWithoutLayer = true;
                continue;
            }
            const match =
                /^(NCD|SKC|CLR|NSC|FEW|SCT|BKN|OVC|VV)(\d{3}|\/{3})?(CB|TCU|\/{3})?$/.exec(
                    token,
                );
            if (!match) return;
            const abbreviation = match[1] ?? "";
            const height = match[2];
            this.next();
            const cloud = {
                abbreviation,
                meaning: CLOUDS[abbreviation] ?? "",
                metarCode: token,
                altitude:
                    height && /^\d{3}$/.test(height)
                        ? asInt(height) * 100
                        : null,
                cumulonimbus: match[3] === "CB",
            };
            this.result.clouds ??= [];
            this.result.clouds.push(cloud);
        }
    }

    parseTempDewpoint() {
        this.next();
        const replaced = this.current.replace(/M/g, "-");
        const a = replaced.split("/");
        if (2 !== a.length) return; // expecting XX/XX
        this.result.temperature = asInt(a[0] ?? "");
        this.result.dewpoint = asInt(a[1] ?? "");
    }

    parseAltimeter() {
        let temp;
        this.next();
        if (!this.current) return;

        // inches of mercury if AXXXX
        if (this.current.length === 5 && "A" === this.current[0]) {
            temp = this.current.slice(1, 3);
            temp += ".";
            temp += this.current.slice(3);
            this.result.altimeterInHg = parseFloat(temp);
        } else if (this.current.length && "Q" === this.current[0]) {
            temp = this.current.slice(1);
            this.result.altimeterInHpa = parseInt(temp, 10);
        }
    }

    parseRecentSignificantWeather() {
        this.next();

        if (!this.current) return;

        if (RECENT_WEATHER[this.current]) {
            this.result.recentSignificantWeather = this.current;
            this.result.recentSignificantWeatherDescription =
                RECENT_WEATHER[this.current] ?? null;
        }
    }

    parse() {
        this.parseType();
        this.parseCorrection();
        this.parseStation();
        this.parseDate();
        this.parseAuto();
        this.parseCorrection(); // Second possible position for the correction
        this.parseWind();
        this.parseCavok();
        this.parseVisibility();
        this.parseRunwayVisibility();
        this.parseWeather();
        this.parseClouds();
        this.parseTempDewpoint();
        this.parseAltimeter();
        this.parseRecentSignificantWeather();
    }
}

/**
 * @param {string} metarString
 * @returns {MetarJSResponse}
 */
export function parseMETAR(metarString) {
    const m = new METAR(metarString);
    m.parse();
    return m.result;
}
