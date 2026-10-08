// @ts-check
import { h, html } from "htm/preact";
import { Help } from "#app/shared/Help.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";

const weatherKeys = /** @type {const} */ ({
    VC: "metar.weatherVC",
    MI: "metar.weatherMI",
    PR: "metar.weatherPR",
    BC: "metar.weatherBC",
    DR: "metar.weatherDR",
    BL: "metar.weatherBL",
    SH: "metar.weatherSH",
    TS: "metar.weatherTS",
    FZ: "metar.weatherFZ",
    RA: "metar.weatherRA",
    DZ: "metar.weatherDZ",
    SN: "metar.weatherSN",
    SG: "metar.weatherSG",
    IC: "metar.weatherIC",
    PL: "metar.weatherPL",
    GR: "metar.weatherGR",
    GS: "metar.weatherGS",
    UP: "metar.weatherUP",
    FG: "metar.weatherFG",
    VA: "metar.weatherVA",
    BR: "metar.weatherBR",
    HZ: "metar.weatherHZ",
    DU: "metar.weatherDU",
    FU: "metar.weatherFU",
    SA: "metar.weatherSA",
    PY: "metar.weatherPY",
    SQ: "metar.weatherSQ",
    PO: "metar.weatherPO",
    DS: "metar.weatherDS",
    SS: "metar.weatherSS",
    FC: "metar.weatherFC",
});
const cloudKeys = /** @type {const} */ ({
    FEW: "cloud.fewDescription",
    SCT: "cloud.scatteredDescription",
    BKN: "cloud.brokenDescription",
    OVC: "cloud.overcastDescription",
    VV: "cloud.verticalVisibilityDescription",
    NCD: "cloud.noneDescription",
    NSC: "cloud.noSignificantDescription",
    SKC: "metar.skc",
    CLR: "metar.clr",
});
const fixedKeys = /** @type {const} */ ({
    METAR: "metar.report",
    SPECI: "metar.special",
    AUTO: "metar.auto",
    COR: "metar.correction",
    CAVOK: "metar.cavok",
    NOSIG: "metar.nosig",
    BECMG: "metar.becmg",
    TEMPO: "metar.tempo",
    NSW: "metar.nsw",
    NIL: "metar.nil",
    "=": "metar.end",
});

/** @param {string} code */
function describeGroup(code) {
    const fixed = fixedKeys[/** @type {keyof typeof fixedKeys} */ (code)];
    if (fixed) return t(fixed);
    if (/^CC[A-Z]$/.test(code)) return t("metar.correction");
    let match;
    if ((match = /^(\d{2})(\d{2})(\d{2})Z$/.exec(code))) {
        return `${t("metar.day", String(Number(match[1])))} ${t("metar.utc", `${match[2]}:${match[3]}`)}`;
    }
    if (
        (match = /^(\d{3}|VRB)(P?\d{2,3})(?:G(P?\d{2,3}))?(KT|MPS|KPH)$/.exec(
            code,
        ))
    ) {
        const unit =
            match[4] === "KT"
                ? t("metar.knots")
                : match[4] === "MPS"
                  ? "m/s"
                  : "km/h";
        const reading = (/** @type {string} */ value) =>
            `${value.startsWith("P") ? ">" : ""}${Number(value.replace(/^P/, ""))} ${unit}`;
        return [
            code === "00000" + match[4]
                ? t("metar.calm")
                : match[1] === "VRB"
                  ? t("metar.variable")
                  : t("metar.direction", String(Number(match[1]))),
            t("metar.speed", reading(match[2] ?? "")),
            match[3] ? t("metar.gust", reading(match[3])) : "",
            t("metar.windFormat"),
        ]
            .filter(Boolean)
            .join(" ");
    }
    if ((match = /^(\d{3})V(\d{3})$/.exec(code)))
        return t("metar.variation", `${Number(match[1])}–${Number(match[2])}`);
    if ((match = /^(\d{4})(NDV|NE|SE|SW|NW|N|E|S|W)?$/.exec(code))) {
        const visibility =
            match[1] === "9999"
                ? t("metar.visibility10")
                : match[1] === "0000"
                  ? t("metar.visibility50")
                  : t(
                        "metar.visibility",
                        `${Number(match[1])}${match[2] ? ` (${match[2]})` : ""}`,
                    );
        return [visibility, match[2] === "NDV" ? t("metar.ndv") : ""]
            .filter(Boolean)
            .join(" ");
    }
    if (/^(?:\d+ )?[PM]?\d+(?:\/\d+)?SM$/.test(code))
        return t("metar.miles", code.replace(/SM$/, ""));
    if (/^R\d{2}[LCR]?\//.test(code)) return t("metar.rvr");
    if (
        (match =
            /^(FEW|SCT|BKN|OVC|VV|NCD|NSC|SKC|CLR|\/{3})(\d{3}|\/{3})?(CB|TCU|\/{3})?$/.exec(
                code,
            ))
    ) {
        const key = cloudKeys[/** @type {keyof typeof cloudKeys} */ (match[1])];
        return [
            key ? t(key) : t("metar.unknownCover"),
            match[1] === "///"
                ? ""
                : match[2] === "///"
                  ? t("metar.unknownHeight")
                  : match[2]
                    ? t("metar.height", String(Number(match[2]) * 100))
                    : "",
            match[3] === "CB"
                ? t("cloud.cumulonimbusDescription")
                : match[3] === "TCU"
                  ? t("metar.tcu")
                  : match[3] === "///"
                    ? t("metar.unknownType")
                    : "",
        ]
            .filter(Boolean)
            .join(" ");
    }
    if ((match = /^(M?\d{2}|\/{2})\/(M?\d{2}|\/{2})?$/.exec(code))) {
        const temperature = (/** @type {string | undefined} */ value) =>
            value && value !== "//"
                ? String(Number(value.replace("M", "-")))
                : "?";
        return t(
            "metar.temperature",
            `${temperature(match[1])} / ${temperature(match[2])}`,
        );
    }
    if (/^Q\d{4}$/.test(code))
        return t("metar.pressure", String(Number(code.slice(1))));
    if (/^A\d{4}$/.test(code))
        return t("metar.inches", (Number(code.slice(1)) / 100).toFixed(2));
    if (/^(FM|TL|AT)\d{4}$/.test(code)) return t("metar.trendTime");
    const recent = code.startsWith("RE");
    const intensity = /^[+-]/.test(code) ? code[0] : "";
    const body = code.slice(recent ? 2 : intensity ? 1 : 0);
    const pairs = body.match(/.{2}/g) ?? [];
    if (
        pairs.length &&
        pairs.join("") === body &&
        pairs.every((part) => part in weatherKeys)
    ) {
        return [
            recent
                ? t("metar.recent")
                : intensity === "-"
                  ? t("metar.light")
                  : intensity === "+"
                    ? t("metar.heavy")
                    : /RA|DZ|SN|SG|PL|GR|GS|UP/.test(body) &&
                        !body.startsWith("VC")
                      ? t("metar.moderate")
                      : "",
            ...pairs.map((part) =>
                t(weatherKeys[/** @type {keyof typeof weatherKeys} */ (part)]),
            ),
        ]
            .filter(Boolean)
            .join(" ");
    }
    return t("metar.unknown");
}

/** @param {string} report */
export function explainMetar(report) {
    const tokens = report
        .trim()
        .replace(/=$/, " =")
        .split(/\s+/)
        .filter(Boolean);
    let stationSeen = false;
    return tokens.flatMap((code, index) => {
        if (tokens.slice(0, index).includes("RMK")) return [];
        if (code === "RMK")
            return [
                {
                    code: tokens.slice(index).join(" "),
                    description: t("metar.remarks"),
                },
            ];
        if (
            !stationSeen &&
            /^[A-Z][A-Z0-9]{3}$/.test(code) &&
            !["AUTO", "CAVOK"].includes(code)
        ) {
            stationSeen = true;
            return [{ code, description: t("metar.station", code) }];
        }
        if (
            /^\d+$/.test(code) &&
            /^\d+\/\d+SM$/.test(tokens[index + 1] ?? "")
        ) {
            return [
                {
                    code: `${code} ${tokens[index + 1]}`,
                    description: describeGroup(`${code} ${tokens[index + 1]}`),
                },
            ];
        }
        if (/^\d+\/\d+SM$/.test(code) && /^\d+$/.test(tokens[index - 1] ?? ""))
            return [];
        return [{ code, description: describeGroup(code) }];
    });
}

/** @param {{ report: string }} props */
export function MetarHelp({ report }) {
    const scope = useScope(css`
        :scope {
            color: var(--color-text);
        }
        .metar {
            overflow-wrap: anywhere;
            white-space: normal;
        }
        .metar-report {
            display: block;
            background: var(--color-surface-hover);
            border-radius: var(--radius-sm);
        }
        .metar-intro,
        .metar-explanations {
            line-height: 1.4;
        }
        .metar-group {
            border-top: 1px solid var(--color-border);
        }

        dd {
            margin-inline-start: 0;
        }
    `);
    return h(
        Help,
        { id: "metar-help", label: t("metar.help"), wide: true },
        html`
            <section class="metar-help">
                ${scope.style}
                <h3 class="mt-0">${t("metar.help")}</h3>
                <code
                    class="metar font-mono metar-report p-3"
                    tabindex="0"
                    aria-label="METAR"
                >
                    ${report}
                </code>
                <p class="metar-intro text-rem-0-8125 my-2">
                    ${t("metar.intro")}
                </p>
                <dl class="metar-explanations text-rem-0-8125 mb-0">
                    ${explainMetar(report).map(
                        ({ code, description }) => html`
                            <div class="metar-group py-1.5">
                                <dt class="font-heading metar font-mono">
                                    ${code}
                                </dt>
                                <dd class="mt-0.5">${description}</dd>
                            </div>
                        `,
                    )}
                </dl>
            </section>
        `,
    );
}
