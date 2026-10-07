// @ts-check
import { ClearableInput } from "#app/shared/FormFields.js";
import {
    QUERY_PARAMS,
    DROPZONE_ELEVATION,
    navigateQs,
} from "#app/app/settings.js";
import { OM_DATA } from "#app/weather/state.js";
import { parseUpperWinds } from "#app/manual/overrides.js";
import {
    currentUpperWinds,
    currentUpperWindsFromForecast,
    serializeUpperWinds,
} from "#app/manual/windInputs.js";
import { t } from "#app/translations.js";
import { manualObservationTableStyles } from "#app/styles.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";

function currentInputs() {
    const winds = currentUpperWinds();
    const saved = parseUpperWinds(QUERY_PARAMS.value.MANUAL_upper_winds);
    const keys = /** @type {const} */ (["height", "speed", "direction"]);
    const defaults = new Set(
        winds.flatMap((_, index) => {
            const savedIndex = index - (saved?.length === 5 ? 2 : 0);
            const row = saved?.[savedIndex];
            return keys
                .filter((key) => !row || !row[key])
                .map((key) => `MANUAL_upper_winds_${index}_${key}`);
        }),
    );
    return { winds, defaults };
}

/** @param {{ refreshKey?: number, tableClassName?: string, idPrefix?: string, explainDrift?: boolean, onChange?: () => void }} props */
export function ManualWindTable({
    refreshKey,
    tableClassName = "",
    idPrefix = "",
    explainDrift = false,
    onChange,
}) {
    const scope = useScope(css`
        :scope {
            min-width: 0;
            margin-top: 16px;
        }
        h3 {
            margin: 0;
            font-size: 0.8rem;
        }
        ${manualObservationTableStyles}
        .wind-table-actions {
            margin-top: 12px;
        }
        .developer-error {
            color: var(--color-danger);
        }
    `);
    /** @type {import('preact').RefObject<HTMLElement>} */
    const sectionRef = useRef(null);
    const [inputs, setInputs] = useState(currentInputs);
    const [error, setError] = useState("");
    const manual = QUERY_PARAMS.value.MANUAL_upper_winds;
    const lastApplied = useRef(manual);
    const forecast = OM_DATA.value;
    const elevation = DROPZONE_ELEVATION.value;
    const upperWinds = inputs.winds;

    function refresh() {
        setInputs(currentInputs());
        setError("");
        lastApplied.current = QUERY_PARAMS.value.MANUAL_upper_winds;
    }
    useEffect(() => {
        refresh();
    }, [forecast, elevation, refreshKey]);
    useEffect(() => {
        if (manual !== lastApplied.current) refresh();
    }, [manual]);

    /** @param {string} name @param {string} value @param {number} [decimals] */
    function inputValues(name, value, decimals = 0) {
        return inputs.defaults.has(name)
            ? {
                  value: "",
                  placeholder: value
                      ? Number(value).toFixed(decimals)
                      : undefined,
              }
            : { value };
    }

    /** @param {number} index @param {"height" | "speed" | "direction"} key @param {string} value */
    function editUpperWind(index, key, value) {
        const name = `MANUAL_upper_winds_${index}_${key}`;
        const defaults = new Set(inputs.defaults);
        if (value) defaults.delete(name);
        else defaults.add(name);
        const live = currentUpperWindsFromForecast()[index]?.[key] ?? "";
        const edited = upperWinds.map((wind, i) =>
            i === index ? { ...wind, [key]: value || live } : wind,
        );
        setInputs({ winds: edited, defaults });
        onChange?.();
        const overrides = edited.map((wind, index) => ({
            ...wind,
            ...Object.fromEntries(
                /** @type {const} */ (["height", "speed", "direction"]).map(
                    (key) => [
                        key,
                        defaults.has(`MANUAL_upper_winds_${index}_${key}`)
                            ? ""
                            : wind[key],
                    ],
                ),
            ),
        }));
        const serialized = overrides.some(
            (wind) => wind.height || wind.speed || wind.direction,
        )
            ? serializeUpperWinds(overrides)
            : undefined;
        if (
            (serialized && !parseUpperWinds(serialized)) ||
            !Array.from(
                sectionRef.current?.querySelectorAll("input") ?? [],
            ).every((input) => input.checkValidity())
        ) {
            setError(t("manual.windInvalid"));
            return;
        }
        setError("");
        lastApplied.current = serialized;
        navigateQs({ MANUAL_upper_winds: serialized }, { replace: true });
    }

    function resetUpperWinds() {
        navigateQs({ MANUAL_upper_winds: undefined }, { replace: true });
        refresh();
        onChange?.();
    }

    return html`
        <section class="manual-wind-editor" ref=${sectionRef}>
            ${scope.style}
            <h3>${t("manual.upperTitle")}</h3>
            <table
                class=${`manual-observation-table manual-wind-table ${tableClassName}`}
            >
                <thead>
                    <tr>
                        <th scope="col">hPa</th>
                        <th scope="col">${t("manual.altitude")}</th>
                        <th scope="col">${t("manual.meanWindUnit")}</th>
                        <th scope="col">${t("manual.directionUnit")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${upperWinds.map((wind, index) => {
                        const height = wind.height;
                        return html`
                            <tr>
                                <th scope="row">${wind.pressure}</th>
                                <td>
                                    ${h(ClearableInput, {
                                        name: `MANUAL_upper_winds_${index}_height`,
                                        id: idPrefix
                                            ? `${idPrefix}-MANUAL_upper_winds_${index}_height`
                                            : undefined,
                                        type: "number",
                                        label: `${t("manual.altitude")}, ${index + 1}`,
                                        onClear: () =>
                                            editUpperWind(index, "height", ""),
                                        "aria-label": `${t("manual.altitude")}, ${index + 1}`,
                                        step: "any",
                                        ...inputValues(
                                            `MANUAL_upper_winds_${index}_height`,
                                            height ?? "",
                                        ),
                                        onInput: (event) =>
                                            editUpperWind(
                                                index,
                                                "height",
                                                event.currentTarget.value,
                                            ),
                                    })}
                                </td>
                                ${
                                    /** @type {const} */ ([
                                        "speed",
                                        "direction",
                                    ]).map(
                                        (key) => html`
                                            <td>
                                                ${h(ClearableInput, {
                                                    name: `MANUAL_upper_winds_${index}_${key}`,
                                                    id: idPrefix
                                                        ? `${idPrefix}-MANUAL_upper_winds_${index}_${key}`
                                                        : undefined,
                                                    type: "number",
                                                    label: `${key === "speed" ? t("manual.meanWind") : t("weather.direction")}, ${height ? `${height} m` : index + 1}`,
                                                    onClear: () =>
                                                        editUpperWind(
                                                            index,
                                                            key,
                                                            "",
                                                        ),
                                                    "aria-label": `${key === "speed" ? t("manual.meanWind") : t("weather.direction")}, ${height ? `${height} m` : index + 1}`,
                                                    min: 0,
                                                    max:
                                                        key === "direction"
                                                            ? 360
                                                            : undefined,
                                                    step: "any",
                                                    ...inputValues(
                                                        `MANUAL_upper_winds_${index}_${key}`,
                                                        wind[key],
                                                        key === "speed" ? 1 : 0,
                                                    ),
                                                    onInput: (event) =>
                                                        editUpperWind(
                                                            index,
                                                            key,
                                                            event.currentTarget
                                                                .value,
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
            <div class="wind-table-actions">
                <button type="button" onClick=${resetUpperWinds}>
                    ${t("manual.resetUpperWinds")}
                </button>
            </div>

            ${
                error &&
                html`
                    <p class="developer-error" role="alert">${error}</p>
                `
            }
            <p>${t("manual.upperHelp")}</p>
            ${
                explainDrift &&
                html`
                    <p>${t("manual.freefallWindHelp")}</p>
                    <p>${t("manual.canopyWindHelp")}</p>
                    <p>${t("manual.windRangeHelp")}</p>
                `
            }
            ${
                upperWinds.some(
                    (wind) => wind.height && Number(wind.height) <= 0,
                ) &&
                html`
                    <p>${t("manual.belowGroundHelp")}</p>
                `
            }
        </section>
    `;
}
