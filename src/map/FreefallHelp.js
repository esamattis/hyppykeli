// @ts-check
import { Help } from "#app/shared/Help.js";
import { t } from "#app/translations.js";
import { h, html } from "htm/preact";

/** @param {{ field: "openingHeight" | "freefallSpeed" }} props */
export function FreefallHelp({ field }) {
    const title = t(`settings.${field}`);
    return h(
        Help,
        { label: `${title}: ${t("common.help")}`, wide: true },
        html`
            <h3>${title}</h3>
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
