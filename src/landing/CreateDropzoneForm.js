// @ts-check
import { Button } from "#app/shared/Button.js";
import { writeMapQuery } from "#app/map/mapQuery.js";
import {
    DEFAULT_CANOPY_DESCENT_RATE_MPS,
    DEFAULT_CANOPY_GLIDE_RATIO,
} from "#app/map/canopy.js";
import {
    fetchElevation,
    fetchLocationName,
    findNearbyStations,
} from "#app/landing/api.js";
import { parseCoordinates } from "#app/shared/coordinates.js";
import { ClearableInput, FormField } from "#app/shared/FormFields.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** @param {{ coordinates: LandingCoordinateSelection | null }} props */
export function CreateDropzoneForm({ coordinates }) {
    const scope = useScope(css`
        :scope {
            --clearable-input-width: 100%;
        }
        fieldset {
            min-width: 0;
            border: 0;
            background: transparent;
        }
        .form-section {
            background: var(--color-surface-soft);
            border: 1px solid var(--color-border);
            border-radius: var(--spacing-3);
        }
        .section-heading {
            color: var(--color-primary);
        }
        .fields-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: var(--spacing-5);
            align-items: start;
        }
        .coordinates-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .field {
            display: grid;
            gap: var(--spacing-2);
            min-width: 0;
        }
        .field > label {
            line-height: 1.4;
        }
        .desc {
            margin-top: var(--spacing-1-5);
            line-height: 1.5;
            color: var(--color-muted);
        }
        .station-summary {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-2);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-left: 3px solid var(--color-primary);
            border-radius: var(--spacing-2);
            color: var(--color-text);
        }
        .station-distance {
            color: var(--color-primary);
            background: var(--color-surface-hover);
            border-radius: var(--spacing-1);
            white-space: nowrap;
        }
        .station-options {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-2);
        }
        .station-options label {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-2);
            cursor: pointer;
            border: 1px solid var(--color-border);
            border-radius: var(--spacing-2);
            background: var(--color-surface);
        }
        .station-options label:has(input:checked) {
            border-color: var(--color-primary);
            background: var(--color-surface-hover);
            color: var(--color-primary);
        }
        @media (max-width: 700px) {
            .fields-grid {
                grid-template-columns: minmax(0, 1fr);
            }
        }
    `);
    const [stations, setStations] = useState(
        /** @type {NearbyStations} */ ({ fmi: null, fintraffic: null }),
    );
    const [stationSource, setStationSource] = useState("fmi");
    const [fields, setFields] = useState({
        name: "",
        fmisid: "",
        roadsid: "",
        icaocode: "",
        lat: "",
        lon: "",
        elevation: "",
        default_jump_run_direction: "",
        default_jump_group_count: "",
        exitHeight: "",
    });
    /** @param {import("preact").JSX.TargetedEvent<HTMLInputElement>} event */
    function updateField(event) {
        const { name, value } = event.currentTarget;
        if (name === "name") suggestedNameRef.current = "";
        if (name === "elevation") suggestedElevationRef.current = "";
        setFields((fields) => ({ ...fields, [name]: value }));
    }

    /** @param {string} name */
    function clearField(name) {
        setFields((fields) => ({ ...fields, [name]: "" }));
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

    /** @type {import("preact").RefObject<HTMLFormElement | null>} */
    const formRef = useRef(null);
    const suggestedNameRef = useRef("");
    const suggestedElevationRef = useRef("");
    useEffect(() => {
        if (!coordinates) return;
        setFields((fields) => ({ ...fields, ...coordinates }));
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        formRef.current?.querySelector("input")?.focus({ preventScroll: true });
        const controller = new AbortController();
        fetchLocationName(coordinates, controller.signal)
            .then((name) => {
                if (controller.signal.aborted || !name) return;
                setFields((fields) => {
                    if (fields.name && fields.name !== suggestedNameRef.current)
                        return fields;
                    suggestedNameRef.current = name;
                    return { ...fields, name };
                });
            })
            .catch(() => {
                // The selected coordinates remain usable when name lookup fails.
            });
        fetchElevation(coordinates, controller.signal)
            .then((elevation) => {
                if (controller.signal.aborted || !elevation) return;
                setFields((fields) => {
                    if (
                        fields.elevation &&
                        fields.elevation !== suggestedElevationRef.current
                    )
                        return fields;
                    suggestedElevationRef.current = elevation;
                    return { ...fields, elevation };
                });
            })
            .catch(() => {
                // Elevation can still be entered manually if lookup fails.
            });
        return () => controller.abort();
    }, [coordinates]);

    useEffect(() => {
        const position = parseCoordinates(fields.lat, fields.lon);
        setStations({ fmi: null, fintraffic: null });
        if (!position) return;
        const controller = new AbortController();
        setFields((fields) => ({ ...fields, fmisid: "", roadsid: "" }));
        findNearbyStations([position.lat, position.lng]).then((stations) => {
            if (controller.signal.aborted) return;
            setStations(stations);
            setFields((fields) => ({
                ...fields,
                fmisid: stations.fmi?.id ?? "",
                roadsid: stations.fintraffic?.id ?? "",
            }));
            setStationSource(
                stations.fintraffic &&
                    (!stations.fmi ||
                        stations.fintraffic.distance < stations.fmi.distance)
                    ? "fintraffic"
                    : "fmi",
            );
        });
        return () => controller.abort();
    }, [fields.lat, fields.lon]);

    /** @param {import("preact").JSX.TargetedSubmitEvent<HTMLFormElement>} event */
    function submitForm(event) {
        const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (
            event.currentTarget.querySelectorAll("input[name]")
        );
        for (const input of inputs) {
            if (
                input.type === "radio" ||
                input.name === "exitHeight" ||
                input.value.trim() === "" ||
                (input.name === "fmisid" && stationSource !== "fmi") ||
                (input.name === "roadsid" && stationSource !== "fintraffic")
            )
                input.disabled = true;
        }
    }

    return html`
        <h2 class="mt-8">${t("landing.create")}</h2>
        <form
            id="create-dropzone"
            ref=${formRef}
            action="/dz/"
            onSubmit=${submitForm}
        >
            ${scope.style}

            <p class="mt-0">${t("landing.onlyNameRequired")}</p>
            <fieldset class="p-0 my-4 mx-0">
                <section
                    class="form-section p-5 mb-4"
                    aria-labelledby="locationGroup-heading"
                >
                    <h3
                        id="locationGroup-heading"
                        class="section-heading text-rem-1 font-semibold mt-0 mb-4"
                    >
                        ${t("landing.locationGroup")}
                    </h3>
                    ${h(
                        FormField,
                        {
                            id: "name",
                            label: t("landing.name"),
                            layout: "plain",
                            className: "field",
                            labelClassName: "font-semibold",
                        },
                        h(ClearableInput, {
                            name: "name",
                            required: true,
                            placeholder: "My DZ",
                            value: fields.name,
                            label: "nimi",
                            onInput: updateField,
                            onClear: () => clearField("name"),
                        }),
                    )}
                    <div class="fields-grid coordinates-grid mt-4">
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "lat",
                                    label: t("landing.latitude"),
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "lat",
                                    placeholder: "60.1234",
                                    value: fields.lat,
                                    label: "leveysaste",
                                    onInput: updateField,
                                    onPaste: pasteCoordinates,
                                    onClear: () => clearField("lat"),
                                }),
                            )}
                        </div>
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "lon",
                                    label: t("landing.longitude"),
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "lon",
                                    placeholder: "24.1234",
                                    value: fields.lon,
                                    label: "pituusaste",
                                    onInput: updateField,
                                    onClear: () => clearField("lon"),
                                }),
                            )}
                            <div class="desc text-rem-0-8">
                                ${t("landing.decimal")}
                            </div>
                        </div>
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "elevation",
                                    label: t("settings.elevation"),
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "elevation",
                                    placeholder: "0",
                                    value: fields.elevation,
                                    step: "any",
                                    label: t("settings.elevation"),
                                    type: "number",
                                    min: 0,
                                    max: 4200,
                                    onInput: updateField,
                                    onClear: () => clearField("elevation"),
                                }),
                            )}
                            <div class="desc text-rem-0-8">
                                ${t("settings.elevationHelp")}
                            </div>
                        </div>
                    </div>
                </section>
                <section
                    class="form-section p-5 mb-4"
                    aria-labelledby="weatherGroup-heading"
                >
                    <h3
                        id="weatherGroup-heading"
                        class="section-heading text-rem-1 font-semibold mt-0 mb-4"
                    >
                        ${t("landing.weatherGroup")}
                    </h3>
                    <div class="mb-4">
                        <div class="field">
                            <span
                                id="station-source-label"
                                class="font-semibold"
                            >
                                ${t("landing.stationSource")}
                            </span>
                            <div
                                class="station-options"
                                role="radiogroup"
                                aria-labelledby="station-source-label"
                            >
                                <label
                                    class="font-semibold text-rem-0-9 px-3 py-2"
                                >
                                    <input
                                        type="radio"
                                        name="station-source"
                                        value="fmi"
                                        checked=${stationSource === "fmi"}
                                        onChange=${() => setStationSource("fmi")}
                                    />
                                    FMI
                                </label>
                                <label
                                    class="font-semibold text-rem-0-9 px-3 py-2"
                                >
                                    <input
                                        type="radio"
                                        name="station-source"
                                        value="fintraffic"
                                        checked=${stationSource === "fintraffic"}
                                        onChange=${() => setStationSource("fintraffic")}
                                    />
                                    Fintraffic
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="fields-grid">
                        <div>
                            ${html`
                                <div
                                    class="station-fields"
                                    hidden=${stationSource !== "fmi"}
                                >
                                    ${h(
                                        FormField,
                                        {
                                            id: "fmisid",
                                            label: `FMISID (${t("landing.optional")})`,
                                            layout: "plain",
                                            className: "field",
                                            labelClassName: "font-semibold",
                                        },
                                        h(ClearableInput, {
                                            name: "fmisid",
                                            placeholder: "123445",
                                            value: fields.fmisid,
                                            label: "FMISID",
                                            onInput: updateField,
                                            onClear: () => clearField("fmisid"),
                                        }),
                                    )}
                                    ${
                                        stations.fmi &&
                                        html`
                                            <div
                                                class="desc station-summary text-rem-0-9 px-3 py-2"
                                                aria-live="polite"
                                            >
                                                <strong class="font-semibold">
                                                    ${stations.fmi.name}
                                                </strong>
                                                <span
                                                    class="station-distance font-semibold text-rem-0-8 px-2 py-1"
                                                >
                                                    ${`${(stations.fmi.distance / 1000).toFixed(1)} km`}
                                                </span>
                                            </div>
                                        `
                                    }
                                    <div class="desc text-rem-0-8">
                                        ${t("landing.fmiHelp")}${" "}
                                        <a
                                            href="https://www.ilmatieteenlaitos.fi/havaintoasemat"
                                        >
                                            ${t("landing.here")}
                                        </a>
                                    </div>
                                </div>
                            `}
                            ${html`
                                <div
                                    class="station-fields"
                                    hidden=${stationSource !== "fintraffic"}
                                >
                                    ${h(
                                        FormField,
                                        {
                                            id: "roadsid",
                                            label: `${t("landing.roadStation")} (${t("landing.optional")})`,
                                            layout: "plain",
                                            className: "field",
                                            labelClassName: "font-semibold",
                                        },
                                        h(ClearableInput, {
                                            name: "roadsid",
                                            placeholder: "123445",
                                            value: fields.roadsid,
                                            label: t("landing.roadStation"),
                                            onInput: updateField,
                                            onClear: () =>
                                                clearField("roadsid"),
                                        }),
                                    )}
                                    ${
                                        stations.fintraffic &&
                                        html`
                                            <div
                                                class="desc station-summary text-rem-0-9 px-3 py-2"
                                                aria-live="polite"
                                            >
                                                <strong class="font-semibold">
                                                    ${stations.fintraffic.name}
                                                </strong>
                                                <span
                                                    class="station-distance font-semibold text-rem-0-8 px-2 py-1"
                                                >
                                                    ${`${(stations.fintraffic.distance / 1000).toFixed(1)} km`}
                                                </span>
                                            </div>
                                        `
                                    }
                                    <div class="desc text-rem-0-8">
                                        ${t("landing.roadHelp")}${" "}
                                        <a
                                            href="https://tie.digitraffic.fi/api/weather/v1/stations"
                                        >
                                            ${t("landing.here")}
                                        </a>
                                    </div>
                                </div>
                            `}
                        </div>
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "icaocode",
                                    label: `ICAO (${t("landing.optional")})`,
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "icaocode",
                                    placeholder: "EFXY",
                                    value: fields.icaocode,
                                    label: "ICAO",
                                    onInput: updateField,
                                    onClear: () => clearField("icaocode"),
                                }),
                            )}
                            <div class="desc text-rem-0-8">
                                ${t("landing.icaoHelp")}
                            </div>
                        </div>
                    </div>
                </section>
                <section
                    class="form-section p-5 mb-4"
                    aria-labelledby="jumpRunGroup-heading"
                >
                    <h3
                        id="jumpRunGroup-heading"
                        class="section-heading text-rem-1 font-semibold mt-0 mb-4"
                    >
                        ${t("landing.jumpRunGroup")}
                    </h3>
                    <div class="fields-grid coordinates-grid">
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "default_jump_run_direction",
                                    label: t("landing.defaultJumpRunDirection"),
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "default_jump_run_direction",
                                    placeholder: "180",
                                    value: fields.default_jump_run_direction,
                                    label: t("landing.defaultJumpRunDirection"),
                                    type: "number",
                                    min: 0,
                                    max: 360,
                                    onInput: updateField,
                                    onClear: () =>
                                        clearField(
                                            "default_jump_run_direction",
                                        ),
                                }),
                            )}
                            <div class="desc text-rem-0-8">
                                ${t("landing.defaultJumpRunDirectionHelp")}
                            </div>
                        </div>
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "default_jump_group_count",
                                    label: t("landing.defaultJumperCount"),
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "default_jump_group_count",
                                    placeholder: "6",
                                    value: fields.default_jump_group_count,
                                    label: t("landing.defaultJumperCount"),
                                    type: "number",
                                    min: 1,
                                    max: 100,
                                    onInput: updateField,
                                    onClear: () =>
                                        clearField("default_jump_group_count"),
                                }),
                            )}
                            <div class="desc text-rem-0-8">
                                ${t("landing.defaultJumperCountHelp")}
                            </div>
                        </div>
                        <div>
                            ${h(
                                FormField,
                                {
                                    id: "exitHeight",
                                    label: t("landing.defaultExitAltitude"),
                                    layout: "plain",
                                    className: "field",
                                    labelClassName: "font-semibold",
                                },
                                h(ClearableInput, {
                                    name: "exitHeight",
                                    placeholder: "4000",
                                    value: fields.exitHeight,
                                    label: t("landing.defaultExitAltitude"),
                                    type: "number",
                                    min: 801,
                                    onInput: updateField,
                                    onClear: () => clearField("exitHeight"),
                                }),
                            )}
                            <div class="desc text-rem-0-8">
                                ${t("landing.defaultExitAltitudeHelp")}
                            </div>
                        </div>
                    </div>
                </section>
            </fieldset>

            ${
                fields.exitHeight &&
                Object.entries(
                    writeMapQuery("map_run_settings", {
                        direction: Number(
                            fields.default_jump_run_direction || 0,
                        ),
                        speedKmh: 157,
                        separationSeconds: 5,
                        exitHeight: Number(fields.exitHeight),
                        canopyGlideRatio: DEFAULT_CANOPY_GLIDE_RATIO,
                        canopyDescentRateMps: DEFAULT_CANOPY_DESCENT_RATE_MPS,
                    }),
                ).map(([name, value]) =>
                    h("input", { type: "hidden", name, value }),
                )
            }

            <input type="hidden" name="save" value="1" />

            ${h(
                Button,
                { class: "create-dz mt-2.5", type: "submit" },
                html`
                    ${t("landing.createButton")}
                `,
            )}
        </form>
        <p>${t("landing.savedLocally")}</p>
    `;
}
