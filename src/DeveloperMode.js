// @ts-check
import { h, html } from "htm/preact";
import { useRef, useState } from "preact/hooks";
import { Dialog } from "./components.js";
import { css, useScope } from "./useScope.js";
import {
    DEV_ACTIVE,
    QUERY_PARAMS,
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
    { key: "DEV_ground_gust", label: "Maanpinnan puuska (m/s)" },
    { key: "DEV_ground_avg", label: "Maanpinnan keskituuli (m/s)" },
    { key: "DEV_ground_direction", label: "Maanpinnan suunta (°)", max: 360 },
    { key: "DEV_metar", label: "METAR-teksti" },
    { key: "DEV_map_speed", label: "Kartan tuulen nopeus (m/s)" },
    { key: "DEV_map_direction", label: "Kartan tuulen suunta (°)", max: 360 },
];

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

    function open() {
        setValues({ ...QUERY_PARAMS.value });
        setError("");
        dialogRef.current?.showModal();
    }

    /** @param {SubmitEvent} event */
    function save(event) {
        event.preventDefault();
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
                return;
            }
        }
        navigateQs(
            Object.fromEntries(
                FIELDS.map(({ key }) => [
                    key,
                    values[key]?.trim() || undefined,
                ]),
            ),
        );
        dialogRef.current?.close();
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
                    kenttä käyttää oikeita tietoja.
                </p>
                <p>
                    Kartan arvot korvaavat vapaapudotuksen keskituulen ja
                    animaation.
                </p>
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
