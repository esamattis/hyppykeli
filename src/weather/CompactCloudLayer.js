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
`;

/** @param {{ clouds: CloudLayer[], focusable?: boolean }} props */
export function CompactCloudLayers({ clouds, focusable = true }) {
    return html`
        ${clouds
            .toSorted((a, b) => a.base - b.base)
            .map((cloud) => h(CompactCloudLayer, { cloud, focusable }))}
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
    const label = type?.label ?? cloud.amount;
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
            ${h(Icon, { name: type?.icon ?? "cloudOvercast", size: 20, label })}
            ${cloud.cumulonimbus ? h(Icon, { name: "lightning", size: 14, label: t("cloud.cumulonimbus") }) : null}
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
    const scope = useScope(compactLayerStyles);
    const tooltip = `${layer.cover.toFixed(0)} % · ${layer.pressure} hPa · ${formatExactAltitude(layer.height)}`;
    return html`
        <div
            class="cloud-layer cloud-profile-layer map-cloud-layer"
            tabindex=${focusable ? 0 : undefined}
            data-tooltip=${tooltip}
        >
            ${scope.style}
            ${h(CloudCoverIcon, { percentage: layer.cover, size: 20 })}
            <span class="map-cloud-height">
                ${formatCloudBase(Math.round(layer.height / 100) * 100, "m")}
            </span>
        </div>
    `;
}
