// @ts-check
import { FormField, NumberInput } from "#app/shared/FormFields.js";
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
    MANUAL_ACTIVE,
    parseGroundObservations,
    parseUpperWinds,
} from "#app/manual/overrides.js";
import { h, html } from "htm/preact";
import { useId, useImperativeHandle, useRef, useState } from "preact/hooks";

/** @param {ManualObservation[]} observations */
function toObservationInputs(observations) {
    return observations.map(({ gust, speed, direction, age }) => ({
        gust: gust !== undefined && gust >= 0 ? gust.toString() : "",
        speed: speed !== undefined && speed >= 0 ? speed.toString() : "",
        direction: direction?.toString() ?? "",
        age,
    }));
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

/** @param {number} [now] @returns {ManualUpperWindInput[]} */
function currentUpperWinds(now) {
    return getMapWindData(now)
        .winds.slice(1, 6)
        .map(({ speed, direction }) => ({
            speed: speed?.toString() ?? "",
            direction: direction?.toString() ?? "",
        }));
}

/** @param {ManualUpperWindInput[]} winds */
function serializeUpperWinds(winds) {
    return winds
        .map(({ speed, direction }) => `${speed.trim()},${direction.trim()}`)
        .join(";");
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
    if (!MANUAL_ACTIVE.value) return null;
    return html`
        <aside class="developer-banner" role="status">
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
        /** @type {ManualObservationInput[]} */ ([]),
    );
    const [observationsEdited, setObservationsEdited] = useState(false);

    const [upperWinds, setUpperWinds] = useState(
        /** @type {ManualUpperWindInput[]} */ ([]),
    );
    const [upperWindsEdited, setUpperWindsEdited] = useState(false);

    function open() {
        setValues({ ...QUERY_PARAMS.value });
        setError("");
        setStatus("");
        setCopyUrl("");
        const now = Date.now();
        const saved = parseGroundObservations(
            QUERY_PARAMS.value.MANUAL_ground_obs,
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
        setUpperWinds(currentUpperWinds(now));
        setUpperWindsEdited(false);
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

    /**
     * @param {number} index
     * @param {"speed" | "direction"} key
     * @param {Event & { currentTarget: HTMLInputElement }} event
     */
    function editUpperWind(index, key, event) {
        const value = event.currentTarget.value;
        const edited = upperWinds.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [key]: value } : row,
        );
        setUpperWinds(edited);
        setUpperWindsEdited(true);
        setStatus("");
        setCopyUrl("");
        applyValues(values, observations, observationsEdited, edited, true);
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
            MANUAL_ground_gust: undefined,
            MANUAL_ground_avg: undefined,
            MANUAL_ground_direction: undefined,
        };
        navigateQs(captured);
        setValues({ ...QUERY_PARAMS.value });
        setObservations(inputs);
        setUpperWinds(winds);
        setUpperWindsEdited(false);
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
     * @param {ManualUpperWindInput[]} [editedUpperWinds]
     * @param {boolean} [upperEdited]
     */
    function applyValues(
        editedValues = values,
        editedObservations = observations,
        groundEdited = observationsEdited,
        editedUpperWinds = upperWinds,
        upperEdited = upperWindsEdited,
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
        const groundObservations = groundEdited
            ? serializeObservations(editedObservations)
            : editedValues.MANUAL_ground_obs;
        if (
            groundObservations &&
            !parseGroundObservations(groundObservations)
        ) {
            setError(t("manual.observationsInvalid"));
            return false;
        }
        const upper = upperEdited
            ? serializeUpperWinds(editedUpperWinds)
            : editedValues.MANUAL_upper_winds;
        if (upper && !parseUpperWinds(upper)) {
            setError(t("manual.windInvalid"));
            return false;
        }
        const params = {
            MANUAL_upper_winds: upper,
            MANUAL_metar: metar || undefined,
            MANUAL_ground_obs: groundObservations,
            MANUAL_ground_gust: undefined,
            MANUAL_ground_avg: undefined,
            MANUAL_ground_direction: undefined,
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
                <div class="developer-actions">
                    <button type="button" onClick=${captureCurrentValues}>
                        ${t("manual.capture")}
                    </button>
                    <button type="button" onClick=${copyCurrentUrl}>
                        ${t("manual.copyUrl")}
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
                    <h3>${t("manual.upperTitle")}</h3>
                    <p>${t("manual.upperHelp")}</p>
                    <table class="developer-observations developer-upper-winds">
                        <thead>
                            <tr>
                                <th scope="col">${t("manual.altitude")}</th>
                                <th scope="col">${t("manual.meanWindUnit")}</th>
                                <th scope="col">
                                    ${t("manual.directionUnit")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${upperWinds.map((wind, index) => {
                                const height = [4200, 3000, 1500, 800, 110][
                                    index
                                ];
                                return html`
                                    <tr>
                                        <th scope="row">≈ ${height} m</th>
                                        ${
                                            /** @type {const} */ ([
                                                "speed",
                                                "direction",
                                            ]).map(
                                                (key) => html`
                                                    <td>
                                                        ${h(NumberInput, {
                                                            name: `MANUAL_upper_winds_${index}_${key}`,
                                                            "aria-label": `${key === "speed" ? t("manual.meanWind") : t("weather.direction")}, ≈ ${height} m`,
                                                            min: 0,
                                                            max:
                                                                key ===
                                                                "direction"
                                                                    ? 360
                                                                    : undefined,
                                                            step: "any",
                                                            value: wind[key],
                                                            onInput: (event) =>
                                                                editUpperWind(
                                                                    index,
                                                                    key,
                                                                    event,
                                                                ),
                                                        })}
                                                    </td>
                                                `,
                                            )
                                        }
                                    </tr>
                                `;
                            })}
                        </tbody>
                    </table>
                    <h3>${t("manual.groundTitle")}</h3>
                    <p>${t("manual.groundHelp")}</p>
                    <table class="developer-observations">
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
                                                        ${h(NumberInput, {
                                                            name: `MANUAL_ground_obs_${index}_${key}`,
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
                                                            value: observation[
                                                                key
                                                            ],
                                                            onInput: (event) =>
                                                                editObservation(
                                                                    index,
                                                                    key,
                                                                    event,
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
                            ${t("manual.clear")}
                        </button>
                    </div>
                </form>
                <section
                    class="developer-query"
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
