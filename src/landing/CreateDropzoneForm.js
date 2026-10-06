// @ts-check
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { findClosestRoadStation } from "#app/weather/providers/roadStations.js";
import { DropzoneCoordinateMap } from "#app/landing/DropzoneCoordinateMap.js";
import { h, html } from "htm/preact";
import { useRef, useState } from "preact/hooks";

/**
 * @param {{
 *   name: string,
 *   label: string,
 *   placeholder: string,
 *   value: string,
 *   type?: "text" | "number",
 *   step?: string,
 *   min?: number,
 *   max?: number,
 *   onInput: (event: import("preact").JSX.TargetedEvent<HTMLInputElement>) => void,
 *   onClear: () => void,
 *   onPaste?: (event: import("preact").JSX.TargetedClipboardEvent<HTMLInputElement>) => void,
 * }} props
 */
function ClearableInput({
    name,
    label,
    placeholder,
    value,
    type = "text",
    step,
    min,
    max,
    onInput,
    onClear,
    onPaste,
}) {
    const scope = useScope(css`
        :scope {
            position: relative;
            display: inline-flex;
            max-width: 100%;
        }
        input {
            box-sizing: border-box;
            width: 22ch;
            padding: 8px 38px 8px 10px;
        }
        .clear-input {
            position: absolute;
            top: 50%;
            right: 4px;
            display: grid;
            width: 30px;
            height: 30px;
            padding: 0;
            border: 0;
            place-items: center;
            transform: translateY(-50%);
            background: transparent;
        }
    `);
    /** @type {import("preact").RefObject<HTMLInputElement | null>} */
    const inputRef = useRef(null);

    function clear() {
        onClear();
        inputRef.current?.focus();
    }

    return html`
        <div>
            ${scope.style}
            <input
                ref=${inputRef}
                id=${name}
                type=${type}
                name=${name}
                placeholder=${placeholder}
                step=${step}
                min=${min}
                max=${max}
                value=${value}
                onInput=${onInput}
                onPaste=${onPaste}
            />
            ${
                value
                    ? html`
                          <button
                              class="clear-input"
                              type="button"
                              aria-label=${t("landing.clear", label)}
                              title=${t("landing.clear", label)}
                              onClick=${clear}
                          >
                              ${h(Icon, { name: "close", size: 18 })}
                          </button>
                      `
                    : null
            }
        </div>
    `;
}

export function CreateDropzoneForm() {
    const headingScope = useScope(css`
        :scope {
            margin-top: 32px;
        }
    `);
    const scope = useScope(css`
        .field {
            display: flex;
            font-weight: bold;
        }
        .field > label {
            width: 200px;
            display: flex;
            flex-shrink: 0;
        }
        .desc {
            margin-left: 200px;
            font-style: italic;
            margin-bottom: 5px;
            color: var(--color-muted);
            font-size: 80%;
        }
        fieldset + fieldset {
            margin-top: 16px;
        }

        .map-help {
            margin-top: 0;
            color: var(--color-muted);
        }

        .roadsid-button {
            margin: 4px 0 8px 200px;
            padding: 4px 8px;
            font-size: 80%;
        }

        .create-dz {
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            .field {
                flex-direction: column;
                gap: 4px;
            }
            .field > label {
                width: auto;
            }
            .desc {
                margin-left: 0;
                margin-bottom: 12px;
            }
            .roadsid-button {
                margin-left: 0;
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
        <h2>${headingScope.style}${t("landing.create")}</h2>
        <form action="/dz" onSubmit=${validateCoordinates}>
            ${scope.style}

            <fieldset>
                <legend>${t("landing.coordinates")}</legend>
                <p class="map-help">${t("landing.mapHelp")}</p>
                ${h(DropzoneCoordinateMap, {
                    lat: fields.lat,
                    lon: fields.lon,
                    onSelect: selectCoordinates,
                })}

                <div class="field">
                    <label for="lat">${t("landing.latitude")}</label>
                    ${h(ClearableInput, {
                        name: "lat",
                        placeholder: "60.1234",
                        value: fields.lat,
                        label: "leveysaste",
                        onInput: updateField,
                        onPaste: pasteCoordinates,
                        onClear: () => clearField("lat"),
                    })}
                </div>
                <div class="desc"></div>

                <div class="field">
                    <label for="lon">${t("landing.longitude")}</label>
                    ${h(ClearableInput, {
                        name: "lon",
                        placeholder: "24.1234",
                        value: fields.lon,
                        label: "pituusaste",
                        onInput: updateField,
                        onClear: () => clearField("lon"),
                    })}
                </div>
                <div class="desc">${t("landing.decimal")}</div>
                <div class="field">
                    <label for="elevation">${t("settings.elevation")}</label>
                    ${h(ClearableInput, {
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
                    })}
                </div>
                <div class="desc">${t("settings.elevationHelp")}</div>
            </fieldset>

            <fieldset>
                <legend>${t("landing.other")}</legend>
                <div class="field">
                    <label for="name">${t("landing.name")}</label>
                    ${h(ClearableInput, {
                        name: "name",
                        placeholder: "My DZ",
                        value: fields.name,
                        label: "nimi",
                        onInput: updateField,
                        onClear: () => clearField("name"),
                    })}
                </div>
                <div class="desc"></div>

                <div class="field">
                    <label for="default_jump_run_direction">
                        ${t("landing.defaultJumpRunDirection")}
                    </label>
                    ${h(ClearableInput, {
                        name: "default_jump_run_direction",
                        placeholder: "180",
                        value: fields.default_jump_run_direction,
                        label: t("landing.defaultJumpRunDirection"),
                        type: "number",
                        min: 0,
                        max: 360,
                        onInput: updateField,
                        onClear: () => clearField("default_jump_run_direction"),
                    })}
                </div>
                <div class="desc">
                    ${t("landing.defaultJumpRunDirectionHelp")}
                </div>

                <div class="field">
                    <label for="default_jump_group_count">
                        ${t("landing.defaultJumperCount")}
                    </label>
                    ${h(ClearableInput, {
                        name: "default_jump_group_count",
                        placeholder: "6",
                        value: fields.default_jump_group_count,
                        label: t("landing.defaultJumperCount"),
                        type: "number",
                        min: 1,
                        max: 100,
                        onInput: updateField,
                        onClear: () => clearField("default_jump_group_count"),
                    })}
                </div>
                <div class="desc">${t("landing.defaultJumperCountHelp")}</div>

                <div class="field">
                    <label for="fmisid">FMISID</label>
                    ${h(ClearableInput, {
                        name: "fmisid",
                        placeholder: "123445",
                        value: fields.fmisid,
                        label: "FMISID",
                        onInput: updateField,
                        onClear: () => clearField("fmisid"),
                    })}
                </div>

                <div class="desc">
                    ${t("landing.fmiHelp")}${" "}
                    <a href="https://www.ilmatieteenlaitos.fi/havaintoasemat">
                        ${t("landing.here")}
                    </a>
                </div>

                <div class="field">
                    <label for="roadsid">${t("landing.roadStation")}</label>
                    ${h(ClearableInput, {
                        name: "roadsid",
                        placeholder: "123445",
                        value: fields.roadsid,
                        label: t("landing.roadStation"),
                        onInput: updateField,
                        onClear: () => clearField("roadsid"),
                    })}
                </div>
                <button
                    class="roadsid-button"
                    id="get-roadsid"
                    type="button"
                    onClick=${getRoadStation}
                >
                    ${t("landing.nearestRoadStation")}
                </button>
                <div class="desc">
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

                <div class="field">
                    <label for="icaocode">ICAO</label>
                    ${h(ClearableInput, {
                        name: "icaocode",
                        placeholder: "EFXY",
                        value: fields.icaocode,
                        label: "ICAO",
                        onInput: updateField,
                        onClear: () => clearField("icaocode"),
                    })}
                </div>
                <div class="desc">${t("landing.icaoHelp")}</div>
            </fieldset>

            <input type="hidden" name="save" value="1" />

            <button class="create-dz">${t("landing.createButton")}</button>
        </form>
        <p>${t("landing.savedLocally")}</p>
    `;
}
