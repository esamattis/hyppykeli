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
            lat: 62.4064,
            lon: 25.66659,
            elevation: 140.208,
        },
        description: "– Tikkakoski, Jyväskylä",
    },
    {
        name: "EFUT",
        qs: {
            fmisid: 101191,
            icaocode: "EFUT",
            lat: 60.897667,
            lon: 26.923463,
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
            lat: 61.463506,
            lon: 21.802454,
            default_jump_run_direction: 123.86831214563642,
            elevation: 13.5636,
        },
        description: "– Pori",
    },
    {
        name: "EFLP",
        qs: {
            fmisid: 101237,
            icaocode: "EFLP",
            lat: 61.042405,
            lon: 28.141267,
            default_jump_run_direction: 246.94481365446393,
            elevation: 106.3752,
        },
        description: "– Lappeenranta",
    },
    {
        name: "EFKU",
        qs: {
            fmisid: 101570,
            icaocode: "EFKU",
            lat: 63.011771,
            lon: 27.790722,
            default_jump_run_direction: 158.73545711208953,
            elevation: 98.7552,
        },
        description: "– Rissala, Siilinjärvi",
    },
    {
        name: "EFOU",
        qs: {
            fmisid: 101786,
            icaocode: "EFOU",
            lat: 64.932771,
            lon: 25.37715,
            default_jump_run_direction: 119.46945423942509,
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
            lat: 61.423181,
            lon: 23.606832,
            default_jump_run_direction: 66.34997828860338,
            elevation: 119.0244,
        },
        description: "– Tampere-Pirkkala",
    },
    {
        name: "EFTU",
        qs: {
            fmisid: 101065,
            icaocode: "EFTU",
            lat: 60.508069,
            lon: 22.264605,
            default_jump_run_direction: 84.28013807069266,
            elevation: 49.0728,
        },
        description: "– Turku",
    },
    {
        name: "EFKE",
        mapCoordinates: [65.7787, 24.5821],
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
            lat: 63.040657,
            lon: 21.771495,
            default_jump_run_direction: 163.12222940870856,
            elevation: 6.4008,
        },
        description: "- Vaasa",
    },
];

/** @type {LandingDropzone[]} */
export const partialDropzones = [
    {
        name: "EERA",
        qs: {
            name: "EERA — Kuusiku",
            lat: 58.9967,
            lon: 24.71593,
            elevation: 58,
            default_jump_run_direction: 180,
        },
        description: "— Kuusiku",
    },
    {
        name: "EFJM",
        qs: {
            fmisid: 101291,
            default_jump_run_direction: 93.88406444150928,
            lat: 61.776668,
            lon: 22.715127,
            name: "EFJM",
            elevation: 153.924,
        },
        description: () => t("landing.partialJamijarvi"),
    },
    {
        name: "EFAL",
        qs: {
            roadsid: 10035,
            default_jump_run_direction: 79.0089716837789,
            lat: 62.555172,
            lon: 23.570746,
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
            default_jump_run_direction: 248.64169605454686,
            lat: 61.147931,
            lon: 25.692989,
            elevation: 153.0096,
        },
        description: () => t("landing.partialVesivehmaa"),
    },
    {
        name: "EFIM",
        qs: {
            name: "EFIM",
            roadsid: 5004,
            default_jump_run_direction: 199.66293421973296,
            icaocode: "",
            lat: 61.248389,
            lon: 28.899139,
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
            lat: 60.155164,
            lon: 24.946002,
        },
        description: () => t("landing.partialMeripuisto"),
    },
    {
        name: "Yyteri",
        qs: {
            name: "Yyteri",
            lat: 61.56679,
            lon: 21.52327,
            elevation: 3,
            roadsid: 2020,
            map_run_exit_height: 1300,
            map_jumpers:
                "s180h800_s180h800_s180h800_s180h800_s180h800_s180h800",
        },
        description: () => t("landing.partialYyteri"),
    },
];

/** @param {LandingDropzone} dropzone */
export function dropzoneHref(dropzone) {
    const params = new URLSearchParams(
        Object.entries(dropzone.qs).map(([key, value]) => [key, String(value)]),
    );
    return `/dz/?${params.toString()}`;
}

/** @param {LandingDropzone} dropzone @returns {[number, number] | undefined} */
export function dropzoneCoordinates({ qs, mapCoordinates }) {
    return qs.lat != null && qs.lon != null
        ? [Number(qs.lat), Number(qs.lon)]
        : mapCoordinates;
}
