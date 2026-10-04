// @ts-check
import { h, html } from "htm/preact";
import { useRef, useState } from "preact/hooks";
import { Dialog } from "./components.js";
import { getMapWindData } from "./DropzoneMap.js";
import { css, useScope } from "./useScope.js";
import {
    DEV_ACTIVE,
    QUERY_PARAMS,
    OBSERVATIONS,
    LATEST_OBSERVATION,
    METARS,
    parseGroundObservations,
    navigateQs,
    parseMetarMessages,
} from "./data.js";

/** @type {DeveloperField[]} */
const FIELDS = [
    {
        key: "DEV_debug",
        label: "Debug-tila (konsolilokit ja kaikki havaintoajat)",
        checkbox: true,
    },
    { key: "DEV_mock", label: "Käytä FMI:n esimerkkitietoja", checkbox: true },
    { key: "DEV_metar", label: "METAR-teksti" },
    { key: "DEV_map_speed", label: "Kartan tuulen nopeus (m/s)" },
    { key: "DEV_map_direction", label: "Kartan tuulen suunta (°)", max: 360 },
];

/** @param {DeveloperObservation[]} observations */
function toObservationInputs(observations) {
    return observations.map(({ gust, speed, direction, age }) => ({
        gust: gust !== undefined && gust >= 0 ? gust.toString() : "",
        speed: speed !== undefined && speed >= 0 ? speed.toString() : "",
        direction: direction?.toString() ?? "",
        age,
    }));
}

/** @param {DeveloperObservationInput[]} observations */
function serializeObservations(observations) {
    return (
        observations
            .map(({ gust, speed, direction, age }) =>
                [gust.trim(), speed.trim(), direction.trim(), age].join(","),
            )
            .join(";") || undefined
    );
}

function clearOverrides() {
    navigateQs(
        Object.fromEntries(
            Object.entries(QUERY_PARAMS.value).filter(
                ([key]) => !key.startsWith("DEV_"),
            ),
        ),
        { mode: "replace" },
    );
}

export function DeveloperBanner() {
    const scope = useScope(css`
        :scope {
            margin: 20px 20px 0;
            padding: 12px 16px;
            border: 2px solid var(--color-warning);
            border-radius: var(--radius-panel);
            background: var(--color-surface);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
        }
        @media (max-width: 550px) {
            :scope {
                margin: 12px 12px 0;
            }
        }
    `);
    if (!DEV_ACTIVE.value) return null;
    return html`
        <aside class="developer-banner" role="status">
            ${scope.style}
            <span>
                <strong>Kehittäjätila käytössä.</strong>
                ${" "} Käytössä on testiasetuksia.
            </span>
            <button type="button" onClick=${clearOverrides}>
                Palauta oikeat tiedot
            </button>
        </aside>
    `;
}

export function DeveloperMode() {
    const scope = useScope(css`
        :scope:is(footer) {
            grid-area: developer-controls;
            text-align: center;
        }
        :scope:is(dialog) {
            width: 520px;
            max-height: calc(100dvh - 24px);
            box-sizing: border-box;
        }
        h2 {
            margin-top: 0;
        }
        .developer-fields {
            display: grid;
            gap: 14px;
        }
        label {
            display: grid;
            gap: 6px;
        }
        label.developer-checkbox {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        input[type="checkbox"] {
            width: auto;
            flex-shrink: 0;
        }
        input,
        textarea {
            width: 100%;
            box-sizing: border-box;
        }
        textarea {
            min-height: 100px;
            resize: vertical;
            font-family: var(--font-mono);
        }
        .developer-observations {
            width: 100%;
            margin-top: 14px;
            border-collapse: collapse;
        }
        .developer-observations th,
        .developer-observations td {
            padding: 4px;
            text-align: left;
        }
        .developer-observations input {
            min-width: 0;
        }
        .developer-observations th:first-child {
            white-space: nowrap;
        }
        .developer-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }
        .developer-error {
            color: var(--color-danger);
        }
    `);
    /** @type {import("preact").RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    const [values, setValues] = useState(/** @type {QueryParams} */ ({}));
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [copyUrl, setCopyUrl] = useState("");
    const [observations, setObservations] = useState(
        /** @type {DeveloperObservationInput[]} */ ([]),
    );
    const [observationsEdited, setObservationsEdited] = useState(false);

    function open() {
        setValues({ ...QUERY_PARAMS.value });
        setError("");
        setStatus("");
        setCopyUrl("");
        const now = Date.now();
        const saved = parseGroundObservations(
            QUERY_PARAMS.value.DEV_ground_obs,
        );
        let recent =
            saved ??
            OBSERVATIONS.value
                .filter((observation) => {
                    const age = now - observation.time.getTime();
                    return age >= 0 && age <= 60 * 60 * 1000;
                })
                .map((observation) => ({
                    ...observation,
                    age:
                        Math.round((now - observation.time.getTime()) / 6000) /
                        10,
                }));
        if (!recent.length) {
            // Provide an editable hour even when the station has no recent data.
            recent = Array.from({ length: 7 }, (_, index) => ({
                gust: LATEST_OBSERVATION.value?.gust,
                speed: LATEST_OBSERVATION.value?.speed,
                direction: LATEST_OBSERVATION.value?.direction,
                age: index * 10,
            }));
        }
        setObservations(toObservationInputs(recent));
        setObservationsEdited(false);
        dialogRef.current?.showModal();
    }

    /**
     * @param {number} index
     * @param {"gust" | "speed" | "direction"} key
     * @param {Event & { currentTarget: HTMLInputElement }} event
     */
    function editObservation(index, key, event) {
        const value = event.currentTarget.value;
        setObservations((previous) =>
            previous.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [key]: value } : row,
            ),
        );
        setObservationsEdited(true);
        setError("");
        setStatus("");
        setCopyUrl("");
    }

    function captureCurrentValues() {
        const now = Date.now();
        let recent = OBSERVATIONS.value
            .filter((observation) => {
                const age = now - observation.time.getTime();
                return age >= 0 && age <= 60 * 60 * 1000;
            })
            .map((observation) => ({
                ...observation,
                age: Math.round((now - observation.time.getTime()) / 6000) / 10,
            }));
        if (!recent.length && LATEST_OBSERVATION.value) {
            recent = [{ ...LATEST_OBSERVATION.value, age: 0 }];
        }
        const inputs = toObservationInputs(recent);
        const { averageWind } = getMapWindData(now);
        const captured = {
            DEV_ground_obs: serializeObservations(inputs),
            DEV_metar: METARS.value?.[0]?.metar,
            DEV_map_speed: averageWind.speed?.toString(),
            DEV_map_direction: averageWind.direction?.toString(),
            DEV_ground_gust: undefined,
            DEV_ground_avg: undefined,
            DEV_ground_direction: undefined,
        };
        navigateQs(captured);
        setValues({ ...QUERY_PARAMS.value });
        setObservations(inputs);
        setObservationsEdited(false);
        setError("");
        setCopyUrl("");
        setStatus("Nykyiset arvot tallennettu osoitteeseen.");
    }

    async function copyCurrentUrl() {
        if (
            !dialogRef.current?.querySelector("form")?.reportValidity() ||
            !applyValues()
        )
            return;
        try {
            await navigator.clipboard.writeText(location.href);
            setCopyUrl("");
            setStatus("Osoite kopioitu.");
        } catch {
            setCopyUrl(location.href);
            setStatus(
                "Kopiointi ei onnistunut. Kopioi osoite alla olevasta kentästä.",
            );
        }
    }

    /** @param {SubmitEvent} event */
    function save(event) {
        event.preventDefault();
        if (applyValues()) dialogRef.current?.close();
    }

    function applyValues() {
        const metar = values.DEV_metar?.trim();
        if (metar) {
            try {
                const parsed = parseMetarMessages([metar])[0];
                if (!parsed || !Number.isFinite(parsed.time.getTime())) {
                    throw new Error("Invalid METAR time");
                }
            } catch {
                setError(
                    "METAR-tekstin lukeminen epäonnistui. Tarkista teksti.",
                );
                return false;
            }
        }
        const groundObservations = observationsEdited
            ? serializeObservations(observations)
            : values.DEV_ground_obs;
        if (
            groundObservations &&
            !parseGroundObservations(groundObservations)
        ) {
            setError("Tarkista havaintojen tuuliarvot ja suunnat.");
            return false;
        }
        navigateQs({
            ...Object.fromEntries(
                FIELDS.map(({ key }) => [
                    key,
                    values[key]?.trim() || undefined,
                ]),
            ),
            DEV_ground_obs: groundObservations,
            DEV_ground_gust: undefined,
            DEV_ground_avg: undefined,
            DEV_ground_direction: undefined,
        });
        setError("");
        return true;
    }

    return html`
        <footer class="developer-controls">
            ${scope.style}
            <button
                type="button"
                aria-haspopup="dialog"
                aria-controls="developer-mode"
                onClick=${open}
            >
                Kehittäjätila
            </button>
        </footer>
        ${h(
            Dialog,
            {
                dialogRef,
                id: "developer-mode",
                labelledBy: "developer-mode-title",
            },
            html`
                ${scope.style}
                <h2 id="developer-mode-title">Kehittäjätila</h2>
                <p>
                    Testiarvot tallennetaan osoitteen DEV_-parametreihin. Tyhjä
                    METAR- tai karttakenttä käyttää oikeita tietoja.
                </p>
                <p>
                    Kartan arvot korvaavat vapaapudotuksen keskituulen ja
                    animaation.
                </p>
                <div class="developer-actions">
                    <button type="button" onClick=${captureCurrentValues}>
                        Tallenna nykyiset arvot testiarvoiksi
                    </button>
                    <button type="button" onClick=${copyCurrentUrl}>
                        Kopioi URL
                    </button>
                </div>
                <p>Osoitteen kopiointi tallentaa myös dialogin muokkaukset.</p>
                ${
                    status &&
                    html`
                        <p role="status">${status}</p>
                    `
                }
                ${
                    copyUrl &&
                    html`
                        <label>
                            Jaettava osoite
                            <input
                                type="text"
                                readonly
                                value=${copyUrl}
                                onFocus=${/** @param {FocusEvent & { currentTarget: HTMLInputElement }} event */ (event) => event.currentTarget.select()}
                            />
                        </label>
                    `
                }
                <form onSubmit=${save}>
                    <div class="developer-fields">
                        ${FIELDS.map(({ key, label, max, checkbox }) => {
                            /** @param {Event & { currentTarget: HTMLInputElement | HTMLTextAreaElement }} event */
                            const onInput = (event) => {
                                setValues((previous) => ({
                                    ...previous,
                                    [key]:
                                        checkbox &&
                                        event.currentTarget instanceof
                                            HTMLInputElement
                                            ? event.currentTarget.checked
                                                ? "1"
                                                : undefined
                                            : event.currentTarget.value,
                                }));
                                setError("");
                                setStatus("");
                                setCopyUrl("");
                            };
                            if (checkbox) {
                                return html`
                                    <label class="developer-checkbox">
                                        <input
                                            name=${key}
                                            type="checkbox"
                                            checked=${values[key] === "1"}
                                            onInput=${onInput}
                                        />
                                        ${label}
                                    </label>
                                `;
                            }
                            return html`
                                <label>
                                    ${label}
                                    ${
                                        key === "DEV_metar"
                                            ? html`
                                                  <textarea
                                                      name=${key}
                                                      value=${values[key] ?? ""}
                                                      onInput=${onInput}
                                                      spellcheck="false"
                                                  />
                                              `
                                            : html`
                                                  <input
                                                      name=${key}
                                                      type="number"
                                                      min="0"
                                                      max=${max}
                                                      step="any"
                                                      value=${values[key] ?? ""}
                                                      onInput=${onInput}
                                                  />
                                              `
                                    }
                                </label>
                            `;
                        })}
                    </div>
                    <h3>Maanpinnan havainnot viimeiseltä tunnilta</h3>
                    <p>
                        Uusin rivi on nykyinen maanpinnan tuuli. Taulukon
                        muokkaus korvaa viimeisen tunnin havainnot. Tyhjä
                        tuuliarvo tarkoittaa puuttuvaa havaintoa. Suunta −1
                        tarkoittaa vaihtelevaa tuulta.
                    </p>
                    <table class="developer-observations">
                        <thead>
                            <tr>
                                <th scope="col">Min sitten</th>
                                <th scope="col">Puuska (m/s)</th>
                                <th scope="col">Keski (m/s)</th>
                                <th scope="col">Suunta (°)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${observations.map(
                                (observation, index) => html`
                                    <tr>
                                        <th scope="row">${observation.age}</th>
                                        ${
                                            /** @type {const} */ ([
                                                "gust",
                                                "speed",
                                                "direction",
                                            ]).map((key) => {
                                                const label = {
                                                    gust: "Puuska",
                                                    speed: "Keskituuli",
                                                    direction: "Suunta",
                                                }[key];
                                                return html`
                                                    <td>
                                                        <input
                                                            type="number"
                                                            name=${`DEV_ground_obs_${index}_${key}`}
                                                            aria-label=${`${label}, ${observation.age} min sitten`}
                                                            min=${key === "direction" ? -1 : 0}
                                                            max=${key === "direction" ? 360 : undefined}
                                                            step="any"
                                                            value=${observation[key]}
                                                            onInput=${/** @param {Event & { currentTarget: HTMLInputElement }} event */ (event) => editObservation(index, key, event)}
                                                        />
                                                    </td>
                                                `;
                                            })
                                        }
                                    </tr>
                                `,
                            )}
                        </tbody>
                    </table>
                    ${
                        error
                            ? html`
                                  <p class="developer-error" role="alert">
                                      ${error}
                                  </p>
                              `
                            : null
                    }
                    <div class="developer-actions">
                        <button type="submit">Käytä testiarvoja</button>
                        <button
                            type="button"
                            onClick=${() => {
                                clearOverrides();
                                dialogRef.current?.close();
                            }}
                        >
                            Tyhjennä testiarvot
                        </button>
                        <button
                            type="button"
                            onClick=${() => dialogRef.current?.close()}
                        >
                            Peruuta
                        </button>
                    </div>
                </form>
            `,
        )}
    `;
}
