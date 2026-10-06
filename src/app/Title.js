// @ts-check
import { FormField } from "#app/shared/FormFields.js";
import { Dialog } from "#app/shared/Dialog.js";
import { FromNow } from "#app/shared/FromNow.js";
import { Help } from "#app/shared/Help.js";
import { Icon } from "#app/shared/icons.js";
import { isNullish } from "#app/shared/values.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { LATEST_OBSERVATION, NAME } from "#app/weather/state.js";
import {
    DROPZONE_ELEVATION,
    QUERY_PARAMS,
    navigateQs,
} from "#app/app/settings.js";
import { h, html } from "htm/preact";
import { useId, useRef, useState } from "preact/hooks";

export function Title() {
    const scope = useScope(css`
        :scope {
            grid-area: title;
            margin: 0;
            padding-left: 8px;
            box-sizing: border-box;
            max-width: 100%;
            width: 100%;
            word-break: break-word;
        }
        .nowrap {
            white-space: nowrap;
        }

        .title-name-row {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .title-name {
            min-width: 0;
        }

        .title-elevation {
            display: block;
            font-size: 0.75rem;
            font-weight: normal;
            color: var(--color-muted);
        }

        .edit-name {
            display: inline-flex;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 5px;
            color: var(--color-primary);
            background: transparent;
            border: 0;
            border-radius: 50%;
        }

        .edit-name:hover {
            color: var(--color-primary-hover);
            background: var(--color-surface-hover);
        }

        .title-temp {
            min-height: 1.5em;
            font-size: 65%;
            color: var(--color-muted);
            font-family: var(--font-mono);
        }

        .title-name,
        .title-temp {
            display: block;
        }
    `);
    const dialogScope = useScope(css`
        :scope:is(dialog) {
            width: min(420px, calc(100vw - 24px));
            box-sizing: border-box;
        }

        h2 {
            margin-top: 0;
        }

        .name-field {
            --form-field-gap: 8px;
        }

        .name-hint {
            color: var(--color-muted);
            font-size: 0.85rem;
        }

        .name-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }
    `);
    /** @type {import('preact').RefObject<HTMLDialogElement>} */
    const dialogRef = useRef(null);
    /** @type {import('preact').RefObject<HTMLInputElement>} */
    const inputRef = useRef(null);
    const [nameDraft, setNameDraft] = useState("");
    const dialogTitleId = useId();

    const openNameEditor = () => {
        setNameDraft(QUERY_PARAMS.value.name?.trim() || NAME.value);
        dialogRef.current?.showModal();
        inputRef.current?.focus();
        inputRef.current?.select();
    };

    /** @param {SubmitEvent} event */
    const saveName = (event) => {
        event.preventDefault();
        navigateQs({ name: nameDraft.trim() || undefined });
        dialogRef.current?.close();
    };

    const time = LATEST_OBSERVATION.value?.time;
    const temperature = LATEST_OBSERVATION.value?.temperature;

    const temps = isNullish(temperature)
        ? null
        : {
              1: temperature - 6.5 * 1,
              2: temperature - 6.5 * 2,
              3: temperature - 6.5 * 3,
              4: temperature - 6.5 * 4,
          };

    return html`
        <h1 id="title">
            ${scope.style}
            <span class="title-name-row">
                <span class="title-name">${NAME}</span>
                <button
                    class="edit-name"
                    type="button"
                    aria-label=${t("title.edit")}
                    title=${t("title.edit")}
                    aria-haspopup="dialog"
                    onClick=${openNameEditor}
                >
                    ${h(Icon, { name: "pen", size: 20 })}
                </button>
            </span>
            <span class="title-elevation">
                ${t("title.elevation", String(Math.round(DROPZONE_ELEVATION.value)))}
            </span>
            <span class="title-temp">
                ${
                    temps
                        ? html`
                              <span>
                                  <span class="nowrap">
                                      ${t("title.groundTemperature", temperature?.toFixed(0) ?? "")}
                                  </span>
                                  ${" "}
                                  <span class="nowrap">
                                      ${t("title.altitudeTemperature", temps[4].toFixed(0))}
                                  </span>
                                  ${h(
                                      Help,
                                      {},
                                      html`
                                          <p>${t("title.temperatureHelp")}</p>

                                          <ul>
                                              <li>
                                                  1km ${temps[1].toFixed(1)}°C
                                              </li>
                                              <li>
                                                  2km ${temps[2].toFixed(1)}°C
                                              </li>
                                              <li>
                                                  3km ${temps[3].toFixed(1)}°C
                                              </li>
                                              <li>
                                                  4km ${temps[4].toFixed(1)}°C
                                              </li>
                                          </ul>

                                          <p>${h(FromNow, { date: time })}</p>
                                      `,
                                  )}
                              </span>
                          `
                        : null
                }
            </span>
        </h1>
        ${h(
            Dialog,
            { dialogRef, labelledBy: dialogTitleId },
            html`
                ${dialogScope.style}
                <div>
                    <h2 id=${dialogTitleId}>${t("title.edit")}</h2>
                    <form onSubmit=${saveName}>
                        ${h(
                            FormField,
                            {
                                id: `${dialogTitleId}-name`,
                                label: t("menu.namePrompt"),
                                layout: "stacked",
                                className: "name-field",
                            },
                            h("input", {
                                id: `${dialogTitleId}-name`,
                                ref: inputRef,
                                name: "name",
                                type: "text",
                                value: nameDraft,
                                onInput: (event) =>
                                    setNameDraft(event.currentTarget.value),
                            }),
                        )}
                        <p class="name-hint">${t("title.emptyName")}</p>
                        <div class="name-actions">
                            <button type="submit">${t("common.save")}</button>
                        </div>
                    </form>
                </div>
            `,
        )}
    `;
}
