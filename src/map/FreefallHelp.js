// @ts-check
import { FieldHelp } from "#app/shared/FormFields.js";
import { t } from "#app/translations.js";
import { h, html } from "htm/preact";

/** @param {{ field: "openingHeight" | "freefallSpeed" }} props */
export function FreefallHelp({ field }) {
    const title = t(`settings.${field}`);
    return h(
        FieldHelp,
        { title, wide: true },
        html`
            ${
                field === "openingHeight"
                    ? html`
                          <p>${t("settings.openingRange")}</p>
                          <p>${t("settings.altitudeReferenceHelp")}</p>
                      `
                    : html`
                          <p>${t("settings.freefallSpeedHelp")}</p>
                      `
            }
            <p>${t("settings.nextJumperHelp")}</p>
        `,
    );
}
