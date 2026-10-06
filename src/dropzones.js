// @ts-check
import { t } from "#app/translations.js";

// URL elevations are metres AMSL, converted from feet using 1 ft = 0.3048 m.
// EFPO uses 44.5 ft (44–45 ft); EFTP uses 390.5 ft (390–391 ft).
/** @type {LandingDropzone[]} */
export const completeDropzones = [
    {
        name: "EFJY",
        qs: {
            fmisid: 137208,
            icaocode: "EFJY",
            default_jump_group_count: 4,
            default_jump_run_direction: 315,
            direction: 331,
            lat: 62.40711121411343,
            lon: 25.664491653442386,
            elevation: 140.208,
        },
        description: "– Tikkakoski, Jyväskylä",
    },
    {
        name: "EFUT",
        qs: {
            fmisid: 101191,
            icaocode: "EFUT",
            lat: 60.89755354967867,
            lon: 26.926031112670902,
            map_zoom: 14,
            default_jump_run_direction: 78,
            default_jump_group_count: 8,
            elevation: 103.3272,
        },
        description: "– Utti, Kouvola",
    },
    {
        name: "EFPO",
        qs: {
            fmisid: 101044,
            icaocode: "EFPO",
            elevation: 13.5636,
        },
        description: "– Pori",
    },
    {
        name: "EFLP",
        qs: {
            fmisid: 101237,
            icaocode: "EFLP",
            elevation: 106.3752,
        },
        description: "– Lappeenranta",
    },
    {
        name: "EFKU",
        qs: {
            fmisid: 101570,
            icaocode: "EFKU",
            elevation: 98.7552,
        },
        description: "– Rissala, Siilinjärvi",
    },
    {
        name: "EFOU",
        qs: {
            fmisid: 101786,
            icaocode: "EFOU",
            elevation: 14.6304,
        },
        description: "– Oulunsalo, Oulu",
    },
    {
        name: "EFTP",
        qs: {
            name: "EFTP",
            fmisid: 101118,
            icaocode: "EFTP",
            elevation: 119.0244,
        },
        description: "– Tampere-Pirkkala",
    },
    {
        name: "EFTU",
        qs: {
            fmisid: 101065,
            icaocode: "EFTU",
            elevation: 49.0728,
        },
        description: "– Turku",
    },
    {
        name: "EFKE",
        qs: {
            fmisid: 101840,
            icaocode: "EFKE",
            elevation: 18.8976,
        },
        description: "- Lautiosaari, Keminmaa",
    },
    {
        name: "EFVA",
        qs: {
            fmisid: 101462,
            icaocode: "EFVA",
            elevation: 6.4008,
        },
        description: "- Vaasa",
    },
];

/** @type {LandingDropzone[]} */
export const partialDropzones = [
    {
        name: "EFJM",
        qs: {
            fmisid: 101291,
            lat: 61.780727,
            lon: 22.718886,
            name: "EFJM",
            elevation: 153.924,
        },
        description: () => t("landing.partialJamijarvi"),
    },
    {
        name: "EFAL",
        qs: {
            roadsid: 10035,
            lat: 62.5551416,
            lon: 23.571403,
            name: "EFAL",
            elevation: 124.0536,
        },
        description: () => t("landing.partialAlavus"),
    },
    {
        name: "EFLA",
        qs: {
            fmisid: 104796,
            icaocode: "EFLA",
            lat: 61.146406,
            lon: 25.693366,
            elevation: 153.0096,
        },
        description: () => t("landing.partialVesivehmaa"),
    },
    {
        name: "EFIM",
        qs: {
            name: "EFIM",
            roadsid: 5004,
            icaocode: "",
            lat: 61.2496030163607,
            lon: 28.90338474282989,
            elevation: 103.0224,
        },
        description: () => t("landing.partialImmola"),
    },
    {
        name: "Meripuisto",
        qs: {
            icaocode: "EFHK",
            fmisid: 100968,
            name: "Meripuisto",
            lat: 60.155125,
            lon: 24.945773,
        },
        description: () => t("landing.partialMeripuisto"),
    },
];

/** @param {LandingDropzone} dropzone */
export function dropzoneHref(dropzone) {
    const params = new URLSearchParams(
        Object.entries(dropzone.qs).map(([key, value]) => [key, String(value)]),
    );
    return `/dz/?${params.toString()}`;
}
