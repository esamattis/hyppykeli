# Maatuulitietojen Hakuprosessi (FMI & Digitraffic)

## Johdanto

Tämä dokumentti kuvaa, miten Hyppykeli-sovellus hakee ja käsittelee maatuulihavaintoja Ilmatieteen laitoksen (FMI) ja Digitrafficin (tiehallinto) avoimista rajapinnoista. Tavoitteena on tuottaa yhtenäinen `WeatherData`-objektien sarja, joka edustaa tuulihavaintoja ajan funktiona.

## Tavoiteltu Datamalli (`WeatherData`)

Kaikki haetut ja käsitellyt havainnot pyritään muuntamaan seuraavaan `WeatherData`-muotoon:

```typescript
/**
 * Interface representing weather data.
 */
interface WeatherData {
    source: "metar" | "fmi" | "roads" | "forecast" | "mock"; // Lähteen tyyppi
    gust?: number;          // Puuskanopeus (m/s), valinnainen
    speed?: number;         // Tuulen keskinopeus (m/s), valinnainen
    direction?: number;     // Tuulen suunta (asteina, 0-360), valinnainen
    temperature?: number;   // Lämpötila (Celsius), valinnainen
    dewPoint?: number;      // Kastepiste (Celsius), valinnainen
    rain?: number;          // Sateen todennäköisyys/määrä (riippuu lähteestä), valinnainen
    lowCloudCover?: number; // Alapilvisyys (%), valinnainen
    middleCloudCover?: number; // Keskipilvisyys (%), valinnainen
    time: Date;             // Havainnon aikaleima
}
```
*Lähde: `src/types.d.ts`*

## 1. Ilmatieteen laitos (FMI)

FMI:n dataa käytetään, kun sovellukselle annetaan FMI:n havaintoaseman tunniste (`fmisid`).

### 1.1. Datan Haku (`fetchFmiObservations`)

- **Pääfunktio:** `fetchFmiObservations(fmisid)` tiedostossa `src/data.js`.
- **Rajapintakutsu:** Käyttää `fmiRequest`-apufunktiota kutsuakseen FMI:n WFS (Web Feature Service) -rajapintaa.
- **Stored Query:** `fmi::observations::weather::timevaluepair`
- **Parametrit:**
    - `fmisid`: Havaintoaseman tunniste.
    - `starttime`: Havaintojakson alkuaika (yleensä 12 tuntia menneisyyteen).
    - `parameters`: Haettavat parametrit, vähintään:
        - `winddirection` (tuulen suunta)
        - `windspeedms` (tuulen nopeus m/s)
        - `windgust` (tuulen puuska m/s)
        - `t2m` (lämpötila 2m korkeudella)
        - `td` (kastepiste)
    - `cch`: Välimuistin ohitusparametri (cache buster).
- **Vastausmuoto:** XML

```javascript
// Yksinkertaistettu rakenne funktiosta src/data.js
async function fetchFmiObservations(fmisid) {
    const obsStartTime = getObservationStartTime(); // Hakee alkuaika (esim. 12h taaksepäin)
    const cacheBust = Math.floor(Date.now() / 30_000); // Välimuistin ohitus

    // ... (METAR-hakujen logiikka, jos icaocode on annettu) ...

    const doc = await fmiRequest( // Kutsuu FMI:n rajapintaa
        "fmi::observations::weather::timevaluepair",
        {
            cch: cacheBust,
            starttime: obsStartTime.toISOString(),
            parameters: [ // Määritellään haettavat suureet
                "winddirection",
                "windspeedms",
                "windgust",
                "t2m",
                "td",
            ],
            fmisid, // Aseman tunniste
        },
        // "/example_data/observations.xml" // Mock-data kehitykseen
    );

    if (!doc || doc === "error") {
        // Virheenkäsittely...
        return;
    }

    // ... (Aseman nimen ja koordinaattien luku XML:stä) ...
    STATION_NAME.value = name + " (FMI)";
    STATION_COORDINATES.value = coordinates;
    if (!FORECAST_COORDINATES.value) {
        FORECAST_COORDINATES.value = STATION_COORDINATES.value;
    }

    // Jäsennetään aikasarjat XML-dokumentista
    const gusts = parseTimeSeries(doc, "obs-obs-1-1-windgust", -1).reverse();
    const windSpeed = parseTimeSeries(doc, "obs-obs-1-1-windspeedms", -1).reverse();
    const directions = parseTimeSeries(doc, "obs-obs-1-1-winddirection", -1).reverse();
    const temperatures = parseTimeSeries(doc, "obs-obs-1-1-t2m", -99).reverse();
    const dewPoints = parseTimeSeries(doc, "obs-obs-1-1-td", -99).reverse();

    // Yhdistetään aikasarjat WeatherData-objekteiksi
    const combined = gusts.map((gust, i) => ({
        source: "fmi",
        gust: gust.value,
        speed: windSpeed[i]?.value,
        direction: directions[i]?.value,
        time: gust.time,
        temperature: temperatures[i]?.value,
        dewPoint: dewPoints[i]?.value,
        // Muut kentät (pilvisyys yms.) tässä tapauksessa undefined
    }));

    // ... (Mock-datan käsittely kehitystilassa) ...

    OBSERVATIONS.value = combined; // Tallennetaan tulokset sovelluksen tilaan
}
```

### 1.2. Rajapintakutsun Apufunktio (`fmiRequest`)

- **Funktio:** `fmiRequest(storedQuery, params, mock)` tiedostossa `src/data.js`.
- **Tehtävä:** Rakentaa FMI WFS -pyynnön URL-osoitteen annettujen parametrien perusteella ja tekee HTTP GET -pyynnön käyttäen `fetchJSON`-apufunktiota. Jäsentää vastauksen XML DOM -objektiksi.
- **Virheenkäsittely:** Palauttaa `undefined` 404-virheessä ja `"error"` muissa virhetilanteissa.

```javascript
// Yksinkertaistettu rakenne funktiosta src/data.js
async function fmiRequest(storedQuery, params, mock) {
    // ... (Mock-datan käsittely kehitystilassa) ...

    const url = new URL(`https://opendata.fmi.fi/wfs?request=getFeature`);
    url.searchParams.set("storedquery_id", storedQuery);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    LOADING.value += 1; // Indikoi latauksen alkua
    try {
        // Käyttää fetchJSON-apufunktiota (ks. src/utils.js)
        const response = await fetch(mock ?? url);
        if (response.status === 404) return undefined;
        if (!response.ok) return "error";

        const text = await response.text();
        // ... (Raakadatan tallennus) ...
        const parser = new DOMParser();
        const data = parser.parseFromString(text, "application/xml"); // Jäsentää XML:n
        return data;
    } catch (error) {
        console.error("ERROR", url.toString(), error);
        return "error";
    } finally {
        LOADING.value -= 1; // Indikoi latauksen loppua
    }
}
```

### 1.3. Aikasarjojen Jäsennys (`parseTimeSeries`)

- **Funktio:** `parseTimeSeries(doc, id, fallback)` tiedostossa `src/data.js`.
- **Tehtävä:** Etsii XML DOM -objektista tietyn `gml:id`:n omaavan `wml2:MeasurementTimeseries` -elementin ja poimii siitä aika-arvo-parit (`wml2:point`).
- **XPath:** Käyttää XPath-kyselyä oikean elementin löytämiseen.
- **Palautusarvo:** Taulukko objekteja, joissa kussakin on `time` (Date) ja `value` (number).

```javascript
// Yksinkertaistettu rakenne funktiosta src/data.js
function parseTimeSeries(doc, id, fallback) {
    // Etsii oikean aikasarjaelementin XPathilla
    const node = xpath(doc, `//wml2:MeasurementTimeseries[@gml:id="${id}"]`);
    if (!node) return [];

    // Poimii pisteet (aika-arvo-parit) elementistä
    return Array.from(node.querySelectorAll("point")).map((point) => {
        const value = Number(point.querySelector("value")?.innerHTML);
        return {
            value: isNaN(value) ? fallback : value, // Käyttää fallback-arvoa, jos arvo puuttuu/virheellinen
            time: new Date(point.querySelector("time")?.innerHTML ?? new Date()),
        };
    });
}

// xpath-apufunktio (myös src/data.js) hoitaa nimiavaruuksien määrittelyn
function xpath(doc, path) {
    // ... (XPath-evaluointi nimiavaruuksien kanssa) ...
}
```

## 2. Digitraffic (Tiesääasemat)

Digitrafficin dataa käytetään, kun sovellukselle annetaan tiesääaseman tunniste (`roadsid`).

### 2.1. Datan Haku (`fetchRoadObservations` & `fetchRoadStationInfo`)

- **Pääfunktio:** `fetchRoadObservations(roadsid)` tiedostossa `src/data.js`. Hakee varsinaiset havainnot.
- **Aseman tiedot:** `fetchRoadStationInfo(roadsid)` (kutsutaan rinnakkain `fetchRoadObservations`:n kanssa) hakee aseman perustiedot, kuten nimen ja koordinaatit.
- **Rajapintakutsut:** Käyttää `fetchJSON`-apufunktiota kutsuakseen Digitrafficin REST API:a.
    - **Nykyhetken data:** `https://tie.digitraffic.fi/api/weather/v1/stations/{roadsid}/data`
    - **Historiadata:** `https://tie.digitraffic.fi/api/beta/weather-history-data/{roadsid}?from={starttime}`
    - **Aseman tiedot:** `https://tie.digitraffic.fi/api/weather/v1/stations/{roadsid}`
- **Parametrit:**
    - `roadsid`: Tiesääaseman tunniste.
    - `from` (historiadata): Havaintojakson alkuaika ISO-muodossa.
- **Vastausmuoto:** JSON
- **Otsake:** Pyynnöissä on oltava `Digitraffic-User` -otsake.

```javascript
// Yksinkertaistettu rakenne funktiosta src/data.js
async function fetchRoadObservations(roadsid) {
    const obsStartTime = getObservationStartTime(); // Alkuaika

    // Haetaan historiadata taustalla (ei kriittinen)
    const historyPromise = fetchJSON(
        `https://tie.digitraffic.fi/api/beta/weather-history-data/${roadsid}?` +
            new URLSearchParams({ from: obsStartTime.toISOString() }),
        { headers: { "Digitraffic-User": "hyppykeli.fi" } },
    );

    // Haetaan viimeisin havainto
    const data = await fetchJSON(
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}/data`,
        { headers: { "Digitraffic-User": "hyppykeli.fi" } },
    );

    if (!data) return; // Virheenkäsittely

    // Etsitään halutut sensorit JSON-vastauksesta nimellä
    const gust = data.sensorValues.find((v) => v.name === "MAKSIMITUULI");
    const wind = data.sensorValues.find((v) => v.name === "KESKITUULI");
    const windDirection = data.sensorValues.find((v) => v.name === "TUULENSUUNTA");
    const temperature = data.sensorValues.find((v) => v.name === "ILMA");
    const dewPoint = data.sensorValues.find((v) => v.name === "KASTEPISTE");

    // Muodostetaan WeatherData-objekti viimeisimmästä havainnosta
    const obs = {
        source: "roads",
        speed: wind?.value,
        gust: gust?.value,
        direction: windDirection?.value,
        temperature: temperature?.value,
        dewPoint: dewPoint?.value,
        time: new Date(data.dataUpdatedTime),
    };

    OBSERVATIONS.value = [obs]; // Tallennetaan viimeisin havainto

    // Käsitellään historiadata, kun se on valmis
    const history = await historyPromise;
    if (!history || !gust) return; // Tarvitaan historia ja tieto puuska-anturista

    // Muunnetaan historia WeatherData-muotoon
    const combined = history.flatMap((roadObservation) => {
        // Käsitellään vain puuska-anturin dataa pääloopissa
        if (roadObservation.sensorId !== gust.id) return [];

        // Etsitään muut vastaavat sensorit samalta aikaleimalta
        const otherObservations = history.filter(
            (h) => h.measuredTime === roadObservation.measuredTime,
        );
        const windHistory = otherObservations.find((ob) => ob.sensorId === wind?.id)?.sensorValue;
        // ... vastaavasti muille sensoreille (direction, temp, dewPoint) ...

        return {
            source: "roads",
            time: new Date(roadObservation.measuredTime),
            gust: roadObservation.sensorValue,
            speed: windHistory,
            // ... muut arvot ...
        };
    });

    combined.reverse(); // Käännetään järjestys uusimmasta vanhimpaan
    const full = [obs, ...combined]; // Yhdistetään viimeisin ja historia

    // ... (Mock-datan käsittely) ...

    OBSERVATIONS.value = full; // Tallennetaan koko sarja
}

// Aseman perustietojen haku (nimi, koordinaatit)
async function fetchRoadStationInfo(roadsid) {
    const data = await fetchJSON(
        `https://tie.digitraffic.fi/api/weather/v1/stations/${roadsid}`,
        { headers: { "Digitraffic-User": "hyppykeli.fi" } },
    );

    if (!data) return; // Virheenkäsittely

    // Tallennetaan koordinaatit ja nimi sovelluksen tilaan
    STATION_COORDINATES.value = `${data.geometry.coordinates[1]},${data.geometry.coordinates[0]}`;
    if (!FORECAST_COORDINATES.value) {
        FORECAST_COORDINATES.value = STATION_COORDINATES.value;
    }
    STATION_NAME.value = data.properties.names.fi + " (Digitraffic)";
}
```

### 2.2. Digitraffic Datamallit (Esimerkkejä)

```typescript
// Tiedostosta src/types.d.ts

// Viimeisin havainto (/data)
interface RoadStationObservations {
    id: number;
    dataUpdatedTime: string; // Aikaleima
    sensorValues: RoadSensorValue[]; // Taulukko sensoriarvoja
}

interface RoadSensorValue {
    id: number;
    stationId: number;
    name: string; // Sensorin nimi, esim. "KESKITUULI"
    shortName: string;
    measuredTime: string;
    value: number; // Sensorin mittaama arvo
    unit: string; // Yksikkö
}

// Historiadata (/weather-history-data)
interface RoadStationHistoryValue {
    roadStationId: number;
    sensorId: number; // Sensorin ID, jota voi verrata /data -vastauksen sensoreihin
    sensorValue: number; // Mitattu arvo
    measuredTime: string; // Aikaleima
}

// Aseman tiedot (/stations/{roadsid})
interface RoadStationInfoDetailed {
    // ... paljon metatietoa ...
    geometry: {
        type: string;
        coordinates: [number, number, number]; // [lon, lat, alt]
    };
    properties: {
        id: number;
        name: string; // Aseman virallinen nimi
        names: { // Nimet eri kielillä
            fi: string;
            sv: string;
            en: string;
        };
        // ... lisää ominaisuuksia ...
    };
}
```

## 3. Yhteiset Apufunktiot

### 3.1. Verkkopyynnöt (`fetchJSON`)

- **Funktio:** `fetchJSON(url, options)` tiedostossa `src/utils.js`.
- **Tehtävä:** Tekee HTTP GET -pyynnön annettuun URL-osoitteeseen ja jäsentää vastauksen JSON-muodosta. Sisältää perustason virheenkäsittelyn ja ilmoittaa virheistä globaalin `fetchjsonerror`-tapahtuman kautta.
- **Käyttö:** Sekä FMI- että Digitraffic-kutsut käyttävät tätä funktion sisäisesti (FMI `fmiRequest`:n kautta).

```javascript
// Yksinkertaistettu rakenne funktiosta src/utils.js
async function fetchJSON(url, options) {
    const { hostname, pathname, search } = new URL(url);

    try {
        const res = await fetch(url, {
            headers: options?.headers, // Lisää mahdolliset otsakkeet (esim. Digitraffic-User)
        });

        if (!res.ok) {
            // Ilmoita virheestä tapahtumalla
            const errorEvent = new CustomEvent("fetchjsonerror", {
                detail: {
                    message: `Virhe ${hostname} API:ssa: ${res.status}, parametrit: ${pathname}${search}`,
                },
            });
            document.dispatchEvent(errorEvent);
            return undefined; // Palauta undefined virhetilanteessa
        }

        return await res.json(); // Palauta jäsennetty JSON
    } catch (error) {
        // Verkkotason virhe
        const errorEvent = new CustomEvent("fetchjsonerror", {
            detail: { message: `Verkkopyyntö epäonnistui: ${url}` },
        });
        document.dispatchEvent(errorEvent);
        return undefined;
    }
}
```

## Yhteenveto

Maatuulitiedot kerätään joko FMI:n XML-pohjaisesta WFS-palvelusta tai Digitrafficin JSON-pohjaisesta REST API:sta riippuen käytettävissä olevasta asematunnisteesta. Molemmissa tapauksissa data jäsennetään ja muunnetaan yhtenäiseen `WeatherData`-muotoon, joka sisältää aikaleiman sekä tuulen suunnan, nopeuden ja puuskanopeuden (jos saatavilla). Tämä data tallennetaan sovelluksen tilaan (`OBSERVATIONS`-signaali) jatkokäyttöä varten.
