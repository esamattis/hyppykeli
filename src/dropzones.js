// @ts-check
import { t } from "./translations.js";

/** @type {LandingDropzone[]} */
export const completeDropzones = [
    {
        name: "EFJY",
        href: "/dz/?fmisid=137208&icaocode=EFJY",
        description: "– Tikkakoski, Jyväskylä",
    },
    {
        name: "EFUT",
        href: "/dz/?fmisid=101191&icaocode=EFUT",
        description: "– Utti, Kouvola",
    },
    {
        name: "EFPO",
        href: "/dz/?fmisid=101044&icaocode=EFPO",
        description: "– Pori",
    },
    {
        name: "EFLP",
        href: "/dz/?fmisid=101237&icaocode=EFLP",
        description: "– Lappeenranta",
    },
    {
        name: "EFKU",
        href: "/dz/?fmisid=101570&icaocode=EFKU",
        description: "– Rissala, Siilinjärvi",
    },
    {
        name: "EFOU",
        href: "/dz/?fmisid=101786&icaocode=EFOU",
        description: "– Oulunsalo, Oulu",
    },
    {
        name: "EFTP",
        href: "/dz/?name=EFTP&fmisid=101118&icaocode=EFTP",
        description: "– Tampere-Pirkkala",
    },
    {
        name: "EFTU",
        href: "/dz/?fmisid=101065&icaocode=EFTU",
        description: "– Turku",
    },
    {
        name: "EFKE",
        href: "/dz/?fmisid=101840&icaocode=EFKE",
        description: "- Lautiosaari, Keminmaa",
    },
    {
        name: "EFVA",
        href: "/dz/?fmisid=101462&icaocode=EFVA",
        description: "- Vaasa",
    },
];

/** @type {LandingDropzone[]} */
export const partialDropzones = [
    {
        name: "EFJM",
        href: "/dz/?fmisid=101291&lat=61.780727&lon=22.718886&name=EFJM",
        description: () => t("landing.partialJamijarvi"),
    },
    {
        name: "EFAL",
        href: "/dz/?roadsid=10035&lat=62.5551416&lon=23.571403&name=EFAL",
        description: () => t("landing.partialAlavus"),
    },
    {
        name: "EFLA",
        href: "/dz/?fmisid=104796&icaocode=EFLA&lat=61.146406&lon=25.693366",
        description: () => t("landing.partialVesivehmaa"),
    },
    {
        name: "EFIM",
        href: "/dz/?name=EFIM&roadsid=5004&icaocode=&lat=61.2496030163607&lon=28.90338474282989",
        description: () => t("landing.partialImmola"),
    },
    {
        name: "Meripuisto",
        href: "/dz/?icaocode=EFHK&fmisid=100968&name=Meripuisto&lat=60.155125&lon=24.945773",
        description: () => t("landing.partialMeripuisto"),
    },
];
