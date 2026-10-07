// @ts-check
import { ClearableInput, FormField } from "#app/shared/FormFields.js";
import { QUERY_PARAMS, navigateQs } from "#app/app/settings.js";
import { ManualWindTable } from "#app/manual/ManualWindTable.js";
import {
    currentUpperWinds,
    serializeUpperWinds,
} from "#app/manual/windInputs.js";
import { Dialog } from "#app/shared/Dialog.js";
import { t } from "#app/translations.js";
import { manualObservationTableStyles } from "#app/styles.js";
import { css, useScope } from "#app/useScope.js";
import { parseMetarMessages } from "#app/weather/metarMessages.js";
import {
    LATEST_OBSERVATION,
    LIVE_OBSERVATIONS,
    METARS,
    OBSERVATIONS,
} from "#app/weather/state.js";
import {
    MANUAL_ACTIVE,
    parseGroundObservations,
} from "#app/manual/overrides.js";
import { h, html } from "htm/preact";
import { useId, useImperativeHandle, useRef, useState } from "preact/hooks";

/** @param {number} count */
function observationFieldNames(count) {
    return Array.from({ length: count }, (_, index) =>
        ["gust", "speed", "direction"].map(
            (key) => `MANUAL_ground_obs_${index}_${key}`,
        ),
    ).flat();
}

/** @param {ManualObservation[]} observations */
function toObservationInputs(observations) {
    return observations.map(({ gust, speed, direction, age }) => ({
        gust: gust !== undefined && gust >= 0 ? gust.toString() : "",
        speed: speed !== undefined && speed >= 0 ? speed.toString() : "",
        direction: direction?.toString() ?? "",
        age,
    }));
}

/** @param {number} [now] @param {boolean} [useManual] */
function currentGroundObservations(now = Date.now(), useManual = true) {
    const saved = useManual
        ? parseGroundObservations(QUERY_PARAMS.value.MANUAL_ground_obs)
        : undefined;
    /** @type {ManualObservation[]} */
    let recent = (useManual ? OBSERVATIONS.value : LIVE_OBSERVATIONS.value)
        .filter((observation) => {
            const age = now - observation.time.getTime();
            return age >= 0 && age <= 60 * 60 * 1000;
        })
        .map((observation) => ({
            ...observation,
            age: Math.round((now - observation.time.getTime()) / 6000) / 10,
        }));
    if (!recent.length) {
        // Provide an editable hour even when the station has no recent data.
        recent = Array.from({ length: 7 }, (_, index) => ({
            age: index * 10,
        }));
    }
    if (saved) {
        const merged = OBSERVATIONS.value;
        recent = saved.map((row, index) => ({
            ...merged[index],
            ...row,
            gust: row.gust ?? merged[index]?.gust,
            speed: row.speed ?? merged[index]?.speed,
            direction: row.direction ?? merged[index]?.direction,
        }));
    }
    return toObservationInputs(recent);
}

/** @param {ManualObservationInput[]} observations */
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
                ([key]) => !key.startsWith("MANUAL_"),
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
export function ManualBanner({ onEdit }) {
    const scope = useScope(css`
        :scope {
            margin: var(--spacing-4) var(--spacing-4) 0;
            border: 2px solid var(--color-warning);
            border-radius: var(--radius-panel);
            background: var(--color-surface);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: var(--spacing-3);
        }
        .developer-banner-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-2);
        }
        @media (max-width: 550px) {
            :scope {
                margin: var(--spacing-3) var(--spacing-3) 0;
            }
        }
    `);
    if (!MANUAL_ACTIVE.value) return null;
    return html`
        <aside class="developer-banner py-3 px-4" role="status">
            ${scope.style}
            <span>
                <strong>${t("manual.active")}</strong>
                ${" "}${t("manual.manualValues")}
            </span>
            <div class="developer-banner-actions">
                <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-controls="developer-mode"
                    onClick=${onEdit}
                >
                    ${t("manual.edit")}
                </button>
                <button type="button" onClick=${clearOverrides}>
                    ${t("manual.restore")}
                </button>
            </div>
        </aside>
    `;
}

/** @param {{ onOpen: () => void, editorRef: import('preact').RefObject<ManualModeHandle> }} props */
export function ManualMode(props) {
    const fieldId = useId();
    const scope = useScope(css`
        :scope.developer-controls {
            min-width: 0;
        }
        :scope:is(dialog) {
            width: 520px;
            padding-inline-end: var(--spacing-16);
            max-height: calc(100dvh - 24px);
            box-sizing: border-box;
        }
        h2 {
            margin-top: 0;
        }
        .developer-fields {
            display: grid;
            gap: var(--spacing-3-5);
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
        ${manualObservationTableStyles}
        .developer-observations th:first-child {
            width: 3.25rem;
        }
        .developer-observations input {
            padding-inline-start: var(--spacing-1);
        }
        .ground-observations-title {
            font-size: 0.8rem;
        }

        .developer-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-2-5);
        }
        .developer-error {
            color: var(--color-danger);
        }

        .developer-query pre {
            max-height: 320px;
            margin-bottom: 0;
            padding: var(--spacing-3);
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
        /** @type {ManualObservationInput[]} */ ([]),
    );
    const [observationsEdited, setObservationsEdited] = useState(false);

    const [windSession, setWindSession] = useState(0);

    const [defaultFields, setDefaultFields] = useState(
        /** @type {Set<string>} */ (new Set()),
    );

    /** @param {string} name @param {string} value @param {number} [decimals] */
    function inputValues(name, value, decimals = 0) {
        return defaultFields.has(name)
            ? {
                  value: "",
                  placeholder: value
                      ? Number(value).toFixed(decimals)
                      : undefined,
              }
            : { value };
    }

    function open() {
        setValues({ ...QUERY_PARAMS.value });
        setError("");
        setStatus("");
        setCopyUrl("");
        const now = Date.now();
        const ground = currentGroundObservations(now);
        setDefaultFields(
            new Set(
                observationFieldNames(ground.length).filter((name) => {
                    const [, index, key] =
                        name.match(
                            /MANUAL_ground_obs_(\d+)_(gust|speed|direction)/,
                        ) ?? [];
                    const row = parseGroundObservations(
                        QUERY_PARAMS.value.MANUAL_ground_obs,
                    )?.[Number(index)];
                    return (
                        !row ||
                        row[
                            /** @type {"gust" | "speed" | "direction"} */ (key)
                        ] === undefined
                    );
                }),
            ),
        );
        setWindSession((session) => session + 1);
        setObservations(ground);
        setObservationsEdited(false);
        dialogRef.current?.showModal();
        props.onOpen();
    }

    useImperativeHandle(props.editorRef, () => ({ open }));

    /**
     * @param {number} index
     * @param {"gust" | "speed" | "direction"} key
     * @param {string} value
     */
    function editObservation(index, key, value) {
        const name = `MANUAL_ground_obs_${index}_${key}`;
        const defaults = new Set(defaultFields);
        if (value) defaults.delete(name);
        else defaults.add(name);
        setDefaultFields(defaults);
        const live =
            currentGroundObservations(undefined, false)[index]?.[key] ?? "";
        const edited = observations.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [key]: value || live } : row,
        );
        setObservations(edited);
        setObservationsEdited(true);
        setStatus("");
        setCopyUrl("");
        applyValues(values, edited, true, defaults);
    }

    /** @param {QueryParams} params */
    function resetOverrides(params) {
        navigateQs(params, { replace: true });
        setValues({ ...values, ...params });
        setError("");
        setStatus("");
        setCopyUrl("");
    }

    function resetGroundObservations() {
        resetOverrides({
            MANUAL_ground_obs: undefined,
        });
        const ground = currentGroundObservations();
        setObservations(ground);
        setDefaultFields(
            (fields) =>
                new Set([...fields, ...observationFieldNames(ground.length)]),
        );
        setObservationsEdited(false);
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
        const winds = currentUpperWinds(now);
        const captured = {
            MANUAL_ground_obs: serializeObservations(inputs),
            MANUAL_metar: METARS.value?.[0]?.metar,
            MANUAL_upper_winds: serializeUpperWinds(winds),
        };
        navigateQs(captured);
        setValues({ ...QUERY_PARAMS.value });
        setDefaultFields(new Set());
        setObservations(inputs);
        setWindSession((session) => session + 1);
        setObservationsEdited(false);
        setError("");
        setCopyUrl("");
        setStatus(t("manual.saved"));
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
            setStatus(t("manual.copied"));
        } catch {
            setCopyUrl(location.href);
            setStatus(t("manual.copyFailed"));
        }
    }

    /**
     * @param {QueryParams} [editedValues]
     * @param {ManualObservationInput[]} [editedObservations]
     * @param {boolean} [groundEdited]
     * @param {Set<string>} [defaults]
     */
    function applyValues(
        editedValues = values,
        editedObservations = observations,
        groundEdited = observationsEdited,
        defaults = defaultFields,
    ) {
        if (!dialogRef.current?.querySelector("form")?.checkValidity()) {
            setError(t("manual.windInvalid"));
            return false;
        }
        const metar = editedValues.MANUAL_metar?.trim();
        if (metar) {
            try {
                const parsed = parseMetarMessages([metar])[0];
                if (!parsed || !Number.isFinite(parsed.time.getTime())) {
                    throw new Error("Invalid METAR time");
                }
            } catch {
                setError(t("manual.metarInvalid"));
                return false;
            }
        }
        const overrides = editedObservations.map((row, index) => ({
            ...row,
            ...Object.fromEntries(
                /** @type {const} */ (["gust", "speed", "direction"]).map(
                    (key) => [
                        key,
                        defaults.has(`MANUAL_ground_obs_${index}_${key}`)
                            ? ""
                            : row[key],
                    ],
                ),
            ),
        }));
        const groundObservations = groundEdited
            ? overrides.some((row) => row.gust || row.speed || row.direction)
                ? serializeObservations(overrides)
                : undefined
            : editedValues.MANUAL_ground_obs;
        if (
            groundObservations &&
            !parseGroundObservations(groundObservations)
        ) {
            setError(t("manual.observationsInvalid"));
            return false;
        }
        const params = {
            MANUAL_metar: metar || undefined,
            MANUAL_ground_obs: groundObservations,
        };
        if (
            Object.entries(params).some(
                ([key, value]) =>
                    QUERY_PARAMS.value[/** @type {ManualKey} */ (key)] !==
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
                ${t("manual.title")}
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
                <h2 id="developer-mode-title">${t("manual.title")}</h2>
                <p>${t("manual.description")}</p>
                <div class="developer-actions mt-5">
                    <button type="button" onClick=${captureCurrentValues}>
                        ${t("manual.capture")}
                    </button>
                    <button type="button" onClick=${copyCurrentUrl}>
                        ${t("manual.copyUrl")}
                    </button>
                    <button
                        type="button"
                        onClick=${() => {
                            clearOverrides();
                            dialogRef.current?.close();
                        }}
                    >
                        ${t("manual.clear")}
                    </button>
                </div>
                <p>${t("manual.immediate")}</p>
                ${
                    status &&
                    html`
                        <p role="status">${status}</p>
                    `
                }
                ${
                    copyUrl &&
                    html`
                        ${h(
                            FormField,
                            {
                                id: `${fieldId}-share`,
                                label: t("manual.shareUrl"),
                                layout: "stacked",
                                className: "manual-field",
                            },
                            h("input", {
                                id: `${fieldId}-share`,
                                type: "text",
                                readOnly: true,
                                value: copyUrl,
                                onFocus: (event) =>
                                    event.currentTarget.select(),
                            }),
                        )}
                    `
                }
                <form
                    onSubmit=${/** @param {SubmitEvent} event */ (event) => event.preventDefault()}
                >
                    <div class="developer-fields">
                        ${h(
                            FormField,
                            {
                                id: `${fieldId}-metar`,
                                label: t("manual.metar"),
                                layout: "stacked",
                                className: "manual-field",
                            },
                            html`
                                <textarea
                                    id=${`${fieldId}-metar`}
                                    name="MANUAL_metar"
                                    value=${values.MANUAL_metar ?? ""}
                                    onInput=${
                                        /** @param {import("preact").JSX.TargetedEvent<HTMLTextAreaElement>} event */ (
                                            event,
                                        ) => {
                                            const editedValues = {
                                                ...values,
                                                MANUAL_metar:
                                                    event.currentTarget.value,
                                            };
                                            setValues(editedValues);
                                            setStatus("");
                                            setCopyUrl("");
                                            applyValues(editedValues);
                                        }
                                    }
                                    spellcheck="false"
                                />
                            `,
                        )}
                    </div>
                    ${h(ManualWindTable, {
                        refreshKey: windSession,
                        tableClassName: "developer-upper-winds",
                        onChange: () => {
                            setStatus("");
                            setCopyUrl("");
                            setError("");
                        },
                    })}
                    <h3 class="ground-observations-title m-0 mt-5">
                        ${t("manual.groundTitle")}
                    </h3>
                    <table
                        class="manual-observation-table developer-observations"
                    >
                        <thead>
                            <tr>
                                <th scope="col">${t("manual.minutesAgo")}</th>
                                <th scope="col">${t("weather.gustUnit")}</th>
                                <th scope="col">${t("manual.meanWindUnit")}</th>
                                <th scope="col">
                                    ${t("manual.directionUnit")}
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
                                                    speed: t("manual.meanWind"),
                                                    direction:
                                                        t("weather.direction"),
                                                }[key];
                                                return html`
                                                    <td>
                                                        ${h(ClearableInput, {
                                                            name: `MANUAL_ground_obs_${index}_${key}`,
                                                            type: "number",
                                                            label: `${label}, ${observation.age} min sitten`,
                                                            onClear: () =>
                                                                editObservation(
                                                                    index,
                                                                    key,
                                                                    "",
                                                                ),
                                                            "aria-label": `${label}, ${observation.age} min sitten`,
                                                            min:
                                                                key ===
                                                                "direction"
                                                                    ? -1
                                                                    : 0,
                                                            max:
                                                                key ===
                                                                "direction"
                                                                    ? 360
                                                                    : undefined,
                                                            step: "any",
                                                            ...inputValues(
                                                                `MANUAL_ground_obs_${index}_${key}`,
                                                                observation[
                                                                    key
                                                                ],
                                                                key ===
                                                                    "direction"
                                                                    ? 0
                                                                    : 1,
                                                            ),
                                                            onInput: (event) =>
                                                                editObservation(
                                                                    index,
                                                                    key,
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                                ),
                                                        })}
                                                    </td>
                                                `;
                                            })
                                        }
                                    </tr>
                                `,
                            )}
                        </tbody>
                    </table>
                    <div class="ground-table-actions mt-3">
                        <button
                            type="button"
                            onClick=${resetGroundObservations}
                        >
                            ${t("manual.resetGroundObservations")}
                        </button>
                    </div>
                    <p>${t("manual.groundHelp")}</p>
                    ${
                        error
                            ? html`
                                  <p class="developer-error" role="alert">
                                      ${error}
                                  </p>
                              `
                            : null
                    }
                </form>
                <section
                    class="developer-query mt-6"
                    aria-labelledby="developer-query-title"
                >
                    <h3 id="developer-query-title">
                        ${t("manual.queryString")}
                    </h3>
                    <pre>${formatQueryParams(QUERY_PARAMS.value)}</pre>
                </section>
            `,
        )}
    `;
}
