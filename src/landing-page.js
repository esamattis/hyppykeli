// @ts-check

import { h, html } from "htm/preact";
import { useState } from "preact/hooks";
import { css, useScope } from "./useScope.js";
import { coordinateDistance, fetchJSON } from "./utils.js";

import { completeDropzones, partialDropzones } from "./dropzones.js";

/**
 * @param {[number, number]} coordinates
 */
export async function findClosestRoadStation(coordinates) {
    /** @type {RoadStations|undefined} */
    const stations = await fetchJSON(
        "https://tie.digitraffic.fi/api/weather/v1/stations",
        {
            headers: {
                "Digitraffic-User": "hyppykeli.fi",
            },
        },
    );

    const closest = stations?.features.reduce((prev, curr) => {
        if (!prev) {
            return curr;
        }

        const prevDistance = coordinateDistance(coordinates, [
            prev.geometry.coordinates[1],
            prev.geometry.coordinates[0],
        ]);

        const currDistance = coordinateDistance(coordinates, [
            curr.geometry.coordinates[1],
            curr.geometry.coordinates[0],
        ]);

        return prevDistance < currDistance ? prev : curr;
    }, stations.features[0]);

    return closest;
}

export function redirectToDz() {
    const params = new URLSearchParams(window.location.search);
    const redirectName =
        new URLSearchParams(window.location.search).get("dz") ??
        localStorage.getItem("previous_dz");

    if (params.has("no_redirect")) {
        localStorage.removeItem("previous_dz");
        params.delete("no_redirect");
        history.replaceState(null, "", "?" + params.toString());
        return;
    }

    const usingBackButton =
        window.performance?.navigation.type ===
        window.performance.navigation.TYPE_BACK_FORWARD;

    if (usingBackButton || !redirectName) {
        return;
    }

    /** @type {QueryParams[]} */
    let saved = [];

    try {
        saved = JSON.parse(localStorage.getItem("saved_dzs") ?? "[]");
    } catch {}

    const savedDz = saved.find((s) => s.name === redirectName);

    if (savedDz) {
        const qs = new URLSearchParams(
            // @ts-ignore
            savedDz,
        );
        window.location.href = `/dz/?${qs.toString()}`;
        return;
    }

    const dz = [...completeDropzones, ...partialDropzones].find(
        (dz) => dz.name === redirectName,
    );

    if (dz) {
        window.location.href = dz.href;
        return;
    }
}

/** @param {{ dropzones: LandingDropzone[] }} props */
function DropzoneList({ dropzones }) {
    const scope = useScope(css`
        :scope p {
            padding: 12px 16px;
            margin: 8px 0;
            background: var(--color-surface-soft);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        }
        :scope a {
            font-size: 120%;
        }
    `);
    return html`
        <div class="dz-list">
            ${scope.style}
            ${[...dropzones]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                    (dz) => html`
                        <p key=${dz.name}>
                            <a href=${dz.href}>${dz.name}</a>
                            ${" "}${dz.description}
                        </p>
                    `,
                )}
        </div>
    `;
}

export function Dropzones() {
    return html`
        <h2>Hyppypaikat</h2>
        <p>Seuraaville hyppypaikoille löytyy kattavat säätiedot:</p>
        ${h(DropzoneList, { dropzones: completeDropzones })}
        <p>Vajaavaiset tiedot löytyvät myös seuraaville paikoille:</p>
        ${h(DropzoneList, { dropzones: partialDropzones })}
    `;
}

export function CreateDropzoneForm() {
    const headingScope = useScope(css`
        :scope {
            margin-top: 32px;
        }
    `);
    const scope = useScope(css`
        label {
            display: flex;
            font-weight: bold;
        }
        label > span {
            width: 200px;
            display: flex;
        }
        .desc {
            margin-left: 200px;
            font-style: italic;
            margin-bottom: 5px;
            color: var(--color-muted);
            font-size: 80%;
        }
        input[type="text"] {
            display: flex;
            width: 20ch;
            padding: 8px 10px;
        }

        .create-dz {
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            label {
                flex-direction: column;
                gap: 4px;
            }
            .desc {
                margin-left: 0;
                margin-bottom: 12px;
            }
        }
        label small {
            font-weight: normal;
            font-size: 75%;
        }
    `);
    const [fields, setFields] = useState({
        name: "",
        fmisid: "",
        roadsid: "",
        icaocode: "",
        lat: "",
        lon: "",
    });
    const [locating, setLocating] = useState(false);

    /** @param {import("preact").JSX.TargetedEvent<HTMLInputElement>} event */
    function updateField(event) {
        const { name, value } = event.currentTarget;
        setFields((fields) => ({ ...fields, [name]: value }));
    }

    /** @param {import("preact").JSX.TargetedClipboardEvent<HTMLInputElement>} event */
    function pasteCoordinates(event) {
        const text = event.clipboardData?.getData("text");
        if (!text?.includes(",")) {
            return;
        }
        event.preventDefault();
        const [lat, lon] = text.split(",");
        setFields((fields) => ({
            ...fields,
            lat: lat?.trim() ?? "",
            lon: lon?.trim() ?? "",
        }));
    }

    function getLocation() {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                setFields((fields) => ({
                    ...fields,
                    lat: position.coords.latitude.toString(),
                    lon: position.coords.longitude.toString(),
                }));
            },
            () => setLocating(false),
        );
    }

    async function getRoadStation() {
        if (!fields.lat || !fields.lon) {
            alert("Koordinaatit puuttuvat");
            return;
        }
        const station = await findClosestRoadStation([
            Number(fields.lat),
            Number(fields.lon),
        ]);
        if (station) {
            setFields((fields) => ({
                ...fields,
                name: station.properties.name.replaceAll("_", " "),
                roadsid: station.id.toString(),
            }));
        }
    }

    return html`
        <h2>${headingScope.style}Luo hyppypaikka</h2>
        <form action="/dz">
            ${scope.style}

            <fieldset>
                <label>
                    <span>Nimi</span>
                    <input
                        type="text"
                        name="name"
                        placeholder="My DZ"
                        value=${fields.name}
                        onInput=${updateField}
                    />
                </label>
                <div class="desc"></div>

                <label>
                    <span>FMISID</span>
                    <input
                        type="text"
                        name="fmisid"
                        placeholder="123445"
                        value=${fields.fmisid}
                        onInput=${updateField}
                    />
                </label>

                <div class="desc">
                    Hae Ilmatieteenlaitoksen havaintoaseman FMISID${" "}
                    <a href="https://www.ilmatieteenlaitos.fi/havaintoasemat">
                        täältä
                    </a>
                </div>

                <label>
                    <span>Fintraffic sääasema</span>
                    <input
                        type="text"
                        name="roadsid"
                        placeholder="123445"
                        value=${fields.roadsid}
                        onInput=${updateField}
                    />
                </label>
                <div class="desc">
                    Jos sopivaa Ilmatieteenlaitoksen havaintoasemaa ei löydy,
                    voit käyttää vaihtoehtoisesti${" "}
                    <a
                        href="https://www.digitraffic.fi/tieliikenne/#ties%C3%A4%C3%A4asemien-ajantasaiset-mittaustiedot"
                    >
                        Fintrafficin tieasääsemaa
                    </a>
                    . Hae aseman ID${" "}
                    <a
                        href="https://tie.digitraffic.fi/api/weather/v1/stations"
                    >
                        täältä
                    </a>
                </div>

                <label>
                    <span>ICAO</span>
                    <input
                        type="text"
                        name="icaocode"
                        placeholder="EFXY"
                        value=${fields.icaocode}
                        onInput=${updateField}
                    />
                </label>
                <div class="desc">
                    Nelikirjaminen lentokentän tunnus, esim. EFUT
                </div>
            </fieldset>

            <fieldset>
                <legend>Ennusteen koordinaatit</legend>
                <label>
                    <span>Lattitude</span>
                    <input
                        type="text"
                        name="lat"
                        placeholder="60.1234"
                        value=${fields.lat}
                        onInput=${updateField}
                        onPaste=${pasteCoordinates}
                    />
                </label>
                <div class="desc"></div>

                <label>
                    <span>Longitude</span>
                    <input
                        type="text"
                        name="lon"
                        placeholder="24.1234"
                        value=${fields.lon}
                        onInput=${updateField}
                    />
                </label>
                <div class="desc">
                    Desimaalimuodossa. Ei pakollinen. Käytetään havaintoaseman
                    sijaintia jos ei annettu.
                </div>
                <button
                    id="get-location"
                    type="button"
                    disabled=${locating}
                    onClick=${getLocation}
                >
                    Käytä nykyistä sijaintiani
                </button>
                ${" "}
                <button
                    id="get-roadsid"
                    type="button"
                    onClick=${getRoadStation}
                >
                    Hae lähin tieasema
                </button>
            </fieldset>

            <input type="hidden" name="save" value="1" />

            <button class="create-dz">Luo</button>
        </form>
        <p>
            Hyppypaikka tallennetaan vain tähän selaimeen. Hyppypaikan voi jakaa
            muille jakamalla sen linkin.
        </p>
    `;
}

export function LandingPage() {
    return html`
        ${h(Dropzones, {})}${h(CreateDropzoneForm, {})}
    `;
}
