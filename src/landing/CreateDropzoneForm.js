// @ts-check
import { ClearableInput, FormField } from "#app/shared/FormFields.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { findClosestRoadStation } from "#app/weather/providers/roadStations.js";
import { DropzoneCoordinateMap } from "#app/landing/DropzoneCoordinateMap.js";
import { h, html } from "htm/preact";
import { useState } from "preact/hooks";

export function CreateDropzoneForm() {
    const scope = useScope(css`
        .field {
            display: flex;
        }
        .field > label {
            width: 200px;
            display: flex;
            flex-shrink: 0;
        }
        .desc {
            margin-left: 200px;
            margin-bottom: var(--spacing-1);
            color: var(--color-muted);
        }
        fieldset + fieldset {
            margin-top: var(--spacing-4);
        }

        .map-help {
            color: var(--color-muted);
        }

        .roadsid-button {
            margin: var(--spacing-1) 0 var(--spacing-2) 200px;
            padding: var(--spacing-1) var(--spacing-2);
        }

        @media (max-width: 600px) {
            .field {
                flex-direction: column;
                gap: var(--spacing-1);
            }
            .field > label {
                width: auto;
            }
            .desc {
                margin-left: 0;
                margin-bottom: var(--spacing-3);
            }
            .roadsid-button {
                margin-left: 0;
            }
        }
    `);
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
    });
    /** @param {import("preact").JSX.TargetedEvent<HTMLInputElement>} event */
    function updateField(event) {
        const { name, value } = event.currentTarget;
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

    /** @param {string} lat @param {string} lon */
    function selectCoordinates(lat, lon) {
        setFields((fields) => ({ ...fields, lat, lon }));
    }

    async function getRoadStation() {
        if (!fields.lat || !fields.lon) {
            alert(t("landing.coordinatesMissing"));
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

    /** @param {import("preact").JSX.TargetedSubmitEvent<HTMLFormElement>} event */
    function validateCoordinates(event) {
        const lat = Number(fields.lat);
        const lon = Number(fields.lon);
        const validCoordinates =
            fields.lat.trim() !== "" &&
            fields.lon.trim() !== "" &&
            Number.isFinite(lat) &&
            Number.isFinite(lon) &&
            lat >= -90 &&
            lat <= 90 &&
            lon >= -180 &&
            lon <= 180;
        if (!validCoordinates && !fields.fmisid && !fields.roadsid) {
            event.preventDefault();
            alert(t("landing.stationOrCoordinates"));
            return;
        }

        const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (
            event.currentTarget.querySelectorAll("input[name]")
        );
        for (const input of inputs) {
            if (input.value.trim() === "") input.disabled = true;
        }
    }

    return html`
        <h2 class="mt-8">${t("landing.create")}</h2>
        <form action="/dz/" onSubmit=${validateCoordinates}>
            ${scope.style}

            <fieldset>
                <legend>${t("landing.coordinates")}</legend>
                <p class="map-help mt-0">${t("landing.mapHelp")}</p>
                ${h(DropzoneCoordinateMap, {
                    lat: fields.lat,
                    lon: fields.lon,
                    onSelect: selectCoordinates,
                })}
                ${h(
                    FormField,
                    {
                        id: "lat",
                        label: t("landing.latitude"),
                        layout: "plain",
                        className: "field font-bold",
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
                <div class="desc italic text-em-0-8"></div>

                ${h(
                    FormField,
                    {
                        id: "lon",
                        label: t("landing.longitude"),
                        layout: "plain",
                        className: "field font-bold",
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
                <div class="desc italic text-em-0-8">
                    ${t("landing.decimal")}
                </div>
                ${h(
                    FormField,
                    {
                        id: "elevation",
                        label: t("settings.elevation"),
                        layout: "plain",
                        className: "field font-bold",
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
                <div class="desc italic text-em-0-8">
                    ${t("settings.elevationHelp")}
                </div>
            </fieldset>

            <fieldset>
                <legend>${t("landing.other")}</legend>
                ${h(
                    FormField,
                    {
                        id: "name",
                        label: t("landing.name"),
                        layout: "plain",
                        className: "field font-bold",
                    },
                    h(ClearableInput, {
                        name: "name",
                        placeholder: "My DZ",
                        value: fields.name,
                        label: "nimi",
                        onInput: updateField,
                        onClear: () => clearField("name"),
                    }),
                )}
                <div class="desc italic text-em-0-8"></div>

                ${h(
                    FormField,
                    {
                        id: "default_jump_run_direction",
                        label: t("landing.defaultJumpRunDirection"),
                        layout: "plain",
                        className: "field font-bold",
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
                        onClear: () => clearField("default_jump_run_direction"),
                    }),
                )}
                <div class="desc italic text-em-0-8">
                    ${t("landing.defaultJumpRunDirectionHelp")}
                </div>

                ${h(
                    FormField,
                    {
                        id: "default_jump_group_count",
                        label: t("landing.defaultJumperCount"),
                        layout: "plain",
                        className: "field font-bold",
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
                        onClear: () => clearField("default_jump_group_count"),
                    }),
                )}
                <div class="desc italic text-em-0-8">
                    ${t("landing.defaultJumperCountHelp")}
                </div>

                ${h(
                    FormField,
                    {
                        id: "fmisid",
                        label: "FMISID",
                        layout: "plain",
                        className: "field font-bold",
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

                <div class="desc italic text-em-0-8">
                    ${t("landing.fmiHelp")}${" "}
                    <a href="https://www.ilmatieteenlaitos.fi/havaintoasemat">
                        ${t("landing.here")}
                    </a>
                </div>

                ${h(
                    FormField,
                    {
                        id: "roadsid",
                        label: t("landing.roadStation"),
                        layout: "plain",
                        className: "field font-bold",
                    },
                    h(ClearableInput, {
                        name: "roadsid",
                        placeholder: "123445",
                        value: fields.roadsid,
                        label: t("landing.roadStation"),
                        onInput: updateField,
                        onClear: () => clearField("roadsid"),
                    }),
                )}
                <button
                    class="roadsid-button text-em-0-8"
                    id="get-roadsid"
                    type="button"
                    onClick=${getRoadStation}
                >
                    ${t("landing.nearestRoadStation")}
                </button>
                <div class="desc italic text-em-0-8">
                    ${t("landing.roadHelp")}${" "}
                    <a
                        href="https://www.digitraffic.fi/tieliikenne/#ties%C3%A4%C3%A4asemien-ajantasaiset-mittaustiedot"
                    >
                        Fintraffic
                    </a>
                    . Hae aseman ID${" "}
                    <a
                        href="https://tie.digitraffic.fi/api/weather/v1/stations"
                    >
                        ${t("landing.here")}
                    </a>
                </div>

                ${h(
                    FormField,
                    {
                        id: "icaocode",
                        label: "ICAO",
                        layout: "plain",
                        className: "field font-bold",
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
                <div class="desc italic text-em-0-8">
                    ${t("landing.icaoHelp")}
                </div>
            </fieldset>

            <input type="hidden" name="save" value="1" />

            <button class="create-dz mt-2.5">
                ${t("landing.createButton")}
            </button>
        </form>
        <p>${t("landing.savedLocally")}</p>
    `;
}
