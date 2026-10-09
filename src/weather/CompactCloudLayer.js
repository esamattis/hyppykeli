// @ts-check
import { CloudCoverIcon, Icon } from "#app/shared/icons.js";
import { formatExactAltitude } from "#app/weather/altitudes.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { formatCloudBase } from "#app/weather/calculations.js";
import { cloudTypes } from "#app/weather/cloudTypes.js";
import { h, html } from "htm/preact";

const compactLayerStyles = css`
    :scope {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: var(--spacing-1-5);
        white-space: nowrap;
    }
    .map-cloud-height {
        font-variant-numeric: tabular-nums;
    }
    .cloud-storm-icon {
        position: relative;
        isolation: isolate;
        display: inline-block;
        flex-shrink: 0;
        width: 30px;
        height: 24px;
    }
    .cloud-storm-icon > svg:first-of-type {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
    }
    .cloud-storm-icon > .cloud-lightning {
        position: absolute;
        right: -2px;
        bottom: -2px;
        z-index: 0;
    }
`;

/** @param {{ metar: MetarData, focusable?: boolean }} props */
export function CompactMetarClouds({ metar, focusable = true }) {
    const scope = useScope(compactLayerStyles);
    const clouds = metar.clouds.filter(
        (cloud) => !["NCD", "NSC", "SKC", "CLR"].includes(cloud.amount),
    );
    const hasWeather = Boolean(
        clouds.length || metar.phenomena.length || metar.cbWithoutLayer,
    );
    const cavok = !metar.clouds.length && metar.metar.includes("CAVOK");
    const noSignificantClouds = metar.clouds.some(
        (cloud) => cloud.amount === "NSC",
    );
    const label = t(noSignificantClouds ? "cloud.noSignificant" : "cloud.none");

    return html`
        ${
            cavok
                ? h(CompactCavok, { focusable })
                : hasWeather
                  ? h(CompactCloudLayers, { clouds, focusable })
                  : html`
                        <div
                            class="cloud-clear map-cloud-layer"
                            tabindex=${focusable ? 0 : undefined}
                            data-tooltip=${label}
                        >
                            ${scope.style}
                            ${h(Icon, { name: noSignificantClouds ? "cloudNsc" : "cloudClear", size: 20, label })}
                        </div>
                    `
        }
        ${h(CompactMetarWeather, { phenomena: metar.phenomena, focusable })}
        ${metar.cbWithoutLayer ? h(CompactUnknownCumulonimbus, { focusable }) : null}
    `;
}

/** @param {{ clouds: CloudLayer[], focusable?: boolean }} props */
export function CompactCloudLayers({ clouds, focusable = true }) {
    return html`
        ${clouds
            .toSorted(
                (a, b) =>
                    (Number.isFinite(a.base) ? a.base : Infinity) -
                    (Number.isFinite(b.base) ? b.base : Infinity),
            )
            .map((cloud) => h(CompactCloudLayer, { cloud, focusable }))}
    `;
}

/** @type {Record<MetarPhenomenon, IconProps["name"]>} */
export const metarPhenomenonIcons = {
    thunderstorm: "storm",
    freezing: "freezing",
    rain: "cloudRain",
    snow: "cloudSnow",
    hail: "cloudHail",
    icePellets: "cloudIcePellets",
    fog: "cloudFog",
    mist: "cloudMist",
};

/** @param {{ phenomena: MetarPhenomenon[], focusable?: boolean }} props */
export function CompactMetarWeather({ phenomena, focusable = true }) {
    return html`
        ${phenomena.map((phenomenon) => h(CompactMetarPhenomenon, { phenomenon, focusable }))}
    `;
}

/** @param {{ phenomenon: MetarPhenomenon, focusable: boolean }} props */
function CompactMetarPhenomenon({ phenomenon, focusable }) {
    const scope = useScope(compactLayerStyles);
    const label = t(`weather.${phenomenon}`);
    return html`
        <div
            class=${`cloud-${phenomenon} map-cloud-layer`}
            tabindex=${focusable ? 0 : undefined}
            data-tooltip=${phenomenon === "fog" ? t("weather.fogTooltip") : label}
        >
            ${scope.style}
            ${h(Icon, { name: metarPhenomenonIcons[phenomenon], size: 24, label })}
        </div>
    `;
}

/** @param {{ focusable?: boolean }} props */
export function CompactUnknownCumulonimbus({ focusable = true }) {
    const scope = useScope(compactLayerStyles);
    const label = t("cloud.cumulonimbus");
    return html`
        <div
            class="cloud-layer map-cloud-layer"
            tabindex=${focusable ? 0 : undefined}
            role="img"
            aria-label=${label}
            data-tooltip=${`${label} · ${t("cloud.cumulonimbusDescription")} ${t("cloud.cumulonimbusUnknown")}`}
        >
            ${scope.style} ${h(Icon, { name: "lightning", size: 20 })}
            ${h(Icon, { name: "lightning", size: 20 })}
        </div>
    `;
}

/** @param {{ layers: OpenMeteoCloudProfile["layers"], focusable?: boolean }} props */
export function CompactOpenMeteoCloudLayers({ layers, focusable = true }) {
    return html`
        ${layers
            .filter((layer) => layer.cover > 0)
            .toSorted((a, b) => a.height - b.height)
            .map((layer) =>
                h(CompactOpenMeteoCloudLayer, { layer, focusable }),
            )}
    `;
}

/** @param {{ focusable?: boolean }} props */
export function CompactCavok({ focusable = true }) {
    const scope = useScope(compactLayerStyles);
    return html`
        <div
            class="cloud-clear map-cloud-layer"
            tabindex=${focusable ? 0 : undefined}
            data-tooltip=${t("cloud.cavokMessage")}
        >
            ${scope.style}
            ${h(Icon, { name: "cloudNsc", size: 20, label: t("cloud.cavok") })}
            <span>CAVOK</span>
        </div>
    `;
}

/** @param {{ cloud: CloudLayer, focusable?: boolean }} props */
export function CompactCloudLayer({ cloud, focusable = true }) {
    const scope = useScope(compactLayerStyles);
    const type = cloudTypes()[cloud.amount];
    const label =
        type?.label ??
        (cloud.cumulonimbus ? t("cloud.cumulonimbus") : cloud.amount);
    const hasBase =
        Number.isFinite(cloud.base) && !["NCD", "NSC"].includes(cloud.amount);
    const tooltip = `${label}${hasBase ? ` · ${t(cloud.amount === "VV" ? "cloud.verticalVisibility" : "cloud.base")}: ${cloud.base} ${cloud.unit}` : ""}`;

    return html`
        <div
            class="cloud-layer map-cloud-layer"
            tabindex=${focusable ? 0 : undefined}
            data-tooltip=${tooltip}
        >
            ${scope.style}
            ${
                cloud.cumulonimbus
                    ? html`
                          <span class="cloud-storm-icon">
                              ${h(Icon, { name: type?.icon ?? "cloudOvercast", size: 20, label })}
                              ${h(Icon, { name: "lightning", size: 18, className: "cloud-lightning", label: t("cloud.cumulonimbus") })}
                          </span>
                      `
                    : h(Icon, {
                          name: type?.icon ?? "cloudOvercast",
                          size: 20,
                          label,
                      })
            }
            ${
                hasBase
                    ? html`
                          <span class="map-cloud-height">
                              ${formatCloudBase(cloud.base, cloud.unit, { approximate: true }).replace(/^≈ /, "")}
                          </span>
                      `
                    : null
            }
        </div>
    `;
}

/** @param {{ layer: OpenMeteoCloudProfile["layers"][number], focusable?: boolean }} props */
export function CompactOpenMeteoCloudLayer({ layer, focusable = true }) {
    const scope = useScope(css`
        ${compactLayerStyles}
        .cloud-cover {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1;
            gap: var(--spacing-0-5);
        }
        .cloud-cover-percentage {
            color: var(--color-muted);
            line-height: 1.1;
            font-variant-numeric: tabular-nums;
        }
    `);
    const tooltip = `${layer.cover.toFixed(0)} % · ${layer.pressure} hPa · ${formatExactAltitude(layer.height)}`;
    return html`
        <div
            class="cloud-layer cloud-profile-layer map-cloud-layer"
            tabindex=${focusable ? 0 : undefined}
            data-tooltip=${tooltip}
        >
            ${scope.style}
            ${h(CloudCoverIcon, { percentage: layer.cover, size: 24 })}
            <span class="cloud-cover">
                <span
                    class="cloud-cover-percentage font-sans font-semibold text-rem-0-5 wind-barb-large:text-rem-0-65"
                >
                    ${layer.cover.toFixed(0)}%
                </span>
                <span class="map-cloud-height">
                    ${formatCloudBase(Math.round(layer.height / 100) * 100, "m")}
                </span>
            </span>
        </div>
    `;
}
