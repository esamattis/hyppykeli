// @ts-check
import { t } from "#app/translations.js";

export function cloudTypes() {
    return /** @type {Record<string, CloudTypeDetails>} */ ({
        NCD: {
            label: t("cloud.none"),
            icon: "cloudClear",
            coverage: t("cloud.noneObserved"),
            explanation: t("cloud.noneDescription"),
        },
        NSC: {
            label: t("cloud.noSignificant"),
            icon: "cloudNsc",
            coverage: t("cloud.noSignificantCoverage"),
            explanation: t("cloud.noSignificantDescription"),
        },
        FEW: {
            label: t("cloud.fewShort"),
            icon: "cloudFew",
            coverage: t("cloud.coverage", "1–2/8"),
            explanation: t("cloud.fewDescription"),
        },
        SCT: {
            label: t("cloud.scatteredShort"),
            icon: "cloudScattered",
            coverage: t("cloud.coverage", "3–4/8"),
            explanation: t("cloud.scatteredDescription"),
        },
        BKN: {
            label: t("cloud.brokenShort"),
            icon: "cloudBroken",
            coverage: t("cloud.coverage", "5–7/8"),
            explanation: t("cloud.brokenDescription"),
        },
        OVC: {
            label: t("cloud.overcast"),
            icon: "cloudOvercast",
            coverage: t("cloud.coverage", "8/8"),
            explanation: t("cloud.overcastDescription"),
        },
        VV: {
            label: t("cloud.fogEmphasis"),
            icon: "cloudFog",
            coverage: t("cloud.skyObscured"),
            explanation: t("cloud.verticalVisibilityDescription"),
        },
    });
}
