// @ts-check
import { QUERY_PARAMS, navigateQs } from "#app/app/settings.js";
import { getMapWindData } from "#app/map/windData.js";
import { Dialog } from "#app/shared/Dialog.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { parseMetarMessages } from "#app/weather/metarMessages.js";
import {
    LATEST_OBSERVATION,
    METARS,
    OBSERVATIONS,
} from "#app/weather/state.js";
import {
    DEV_ACTIVE,
    parseGroundObservations,
} from "#app/developer/overrides.js";
import { h, html } from "htm/preact";
import { useImperativeHandle, useRef, useState } from "preact/hooks";

function fields() {
    return /** @type {DeveloperField[]} */ ([
        {
            key: "DEV_debug",
            label: t("developer.debug"),
            checkbox: true,
        },
        { key: "DEV_mock", label: t("developer.mock"), checkbox: true },
        { key: "DEV_metar", label: t("developer.metar") },
        { key: "DEV_map_speed", label: t("developer.mapSpeed") },
        {
            key: "DEV_map_direction",
            label: t("developer.mapDirection"),
            max: 360,
        },
    ]);
}

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

/** @param {QueryParams} params */
function formatQueryParams(params) {
    return JSON.stringify(
        Object.fromEntries(
            Object.entries(params).map(([key, value]) => {
                if (key.startsWith("map_") && value) {
                    try {
                        return [key, JSON.parse(value)];
                    } catch {}
                }
                return [key, value];
            }),
        ),
        null,
        2,
    );
}

/** @param {{ onEdit: () => void }} props */
export function DeveloperBanner({ onEdit }) {
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
        .developer-banner-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
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
                <strong>${t("developer.active")}</strong>
                ${" "}${t("developer.testSettings")}
            </span>
            <div class="developer-banner-actions">
                <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-controls="developer-mode"
                    onClick=${onEdit}
                >
                    ${t("developer.edit")}
                </button>
                <button type="button" onClick=${clearOverrides}>
                    ${t("developer.restore")}
                </button>
            </div>
        </aside>
    `;
}

/** @param {{ onOpen: () => void, editorRef: import('preact').RefObject<DeveloperModeHandle> }} props */
export function DeveloperMode(props) {
    const scope = useScope(css`
        :scope.developer-controls {
            margin-top: 20px;
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
        .developer-query {
            margin-top: 24px;
        }
        .developer-query pre {
            max-height: 320px;
            margin-bottom: 0;
            padding: 12px;
            overflow: auto;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-surface-soft);
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font-family: var(--font-mono);
            font-size: 0.8rem;
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
        props.onOpen();
    }

    useImperativeHandle(props.editorRef, () => ({ open }));

    /**
     * @param {number} index
     * @param {"gust" | "speed" | "direction"} key
     * @param {Event & { currentTarget: HTMLInputElement }} event
     */
    function editObservation(index, key, event) {
        const value = event.currentTarget.value;
        const edited = observations.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [key]: value } : row,
        );
        setObservations(edited);
        setObservationsEdited(true);
        setStatus("");
        setCopyUrl("");
        applyValues(values, edited, true);
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
        setStatus(t("developer.saved"));
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
            setStatus(t("developer.copied"));
        } catch {
            setCopyUrl(location.href);
            setStatus(t("developer.copyFailed"));
        }
    }

    /**
     * @param {QueryParams} [editedValues]
     * @param {DeveloperObservationInput[]} [editedObservations]
     * @param {boolean} [groundEdited]
     */
    function applyValues(
        editedValues = values,
        editedObservations = observations,
        groundEdited = observationsEdited,
    ) {
        if (!dialogRef.current?.querySelector("form")?.checkValidity()) {
            setError(t("developer.windInvalid"));
            return false;
        }
        const metar = editedValues.DEV_metar?.trim();
        if (metar) {
            try {
                const parsed = parseMetarMessages([metar])[0];
                if (!parsed || !Number.isFinite(parsed.time.getTime())) {
                    throw new Error("Invalid METAR time");
                }
            } catch {
                setError(t("developer.metarInvalid"));
                return false;
            }
        }
        const groundObservations = groundEdited
            ? serializeObservations(editedObservations)
            : editedValues.DEV_ground_obs;
        if (
            groundObservations &&
            !parseGroundObservations(groundObservations)
        ) {
            setError(t("developer.observationsInvalid"));
            return false;
        }
        const params = {
            ...Object.fromEntries(
                fields().map(({ key }) => [
                    key,
                    editedValues[key]?.trim() || undefined,
                ]),
            ),
            DEV_ground_obs: groundObservations,
            DEV_ground_gust: undefined,
            DEV_ground_avg: undefined,
            DEV_ground_direction: undefined,
        };
        if (
            Object.entries(params).some(
                ([key, value]) =>
                    QUERY_PARAMS.value[/** @type {DeveloperKey} */ (key)] !==
                    value,
            )
        ) {
            navigateQs(params, { replace: true });
        }
        setError("");
        return true;
    }

    return html`
        <div class="developer-controls">
            ${scope.style}
            <button
                type="button"
                aria-haspopup="dialog"
                aria-controls="developer-mode"
                onClick=${open}
            >
                ${t("developer.title")}
            </button>
        </div>
        ${h(
            Dialog,
            {
                dialogRef,
                id: "developer-mode",
                labelledBy: "developer-mode-title",
            },
            html`
                ${scope.style}
                <h2 id="developer-mode-title">${t("developer.title")}</h2>
                <p>${t("developer.description")}</p>
                <p>${t("developer.mapOverride")}</p>
                <div class="developer-actions">
                    <button type="button" onClick=${captureCurrentValues}>
                        ${t("developer.capture")}
                    </button>
                    <button type="button" onClick=${copyCurrentUrl}>
                        ${t("developer.copyUrl")}
                    </button>
                </div>
                <p>${t("developer.immediate")}</p>
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
                            ${t("developer.shareUrl")}
                            <input
                                type="text"
                                readonly
                                value=${copyUrl}
                                onFocus=${/** @param {FocusEvent & { currentTarget: HTMLInputElement }} event */ (event) => event.currentTarget.select()}
                            />
                        </label>
                    `
                }
                <form
                    onSubmit=${/** @param {SubmitEvent} event */ (event) => event.preventDefault()}
                >
                    <div class="developer-fields">
                        ${fields().map(({ key, label, max, checkbox }) => {
                            /** @param {Event & { currentTarget: HTMLInputElement | HTMLTextAreaElement }} event */
                            const onInput = (event) => {
                                const editedValues = {
                                    ...values,
                                    [key]:
                                        checkbox &&
                                        event.currentTarget instanceof
                                            HTMLInputElement
                                            ? event.currentTarget.checked
                                                ? "1"
                                                : undefined
                                            : event.currentTarget.value,
                                };
                                setValues(editedValues);
                                setStatus("");
                                setCopyUrl("");
                                applyValues(editedValues);
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
                    <h3>${t("developer.groundTitle")}</h3>
                    <p>${t("developer.groundHelp")}</p>
                    <table class="developer-observations">
                        <thead>
                            <tr>
                                <th scope="col">
                                    ${t("developer.minutesAgo")}
                                </th>
                                <th scope="col">${t("weather.gustUnit")}</th>
                                <th scope="col">
                                    ${t("developer.meanWindUnit")}
                                </th>
                                <th scope="col">
                                    ${t("developer.directionUnit")}
                                </th>
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
                                                    gust: t("weather.gust"),
                                                    speed: t(
                                                        "developer.meanWind",
                                                    ),
                                                    direction:
                                                        t("weather.direction"),
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
                        <button
                            type="button"
                            onClick=${() => {
                                clearOverrides();
                                dialogRef.current?.close();
                            }}
                        >
                            ${t("developer.clear")}
                        </button>
                    </div>
                </form>
                <section
                    class="developer-query"
                    aria-labelledby="developer-query-title"
                >
                    <h3 id="developer-query-title">
                        ${t("developer.queryString")}
                    </h3>
                    <pre>${formatQueryParams(QUERY_PARAMS.value)}</pre>
                </section>
            `,
        )}
    `;
}
