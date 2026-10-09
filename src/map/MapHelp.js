// @ts-check
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";

export function MapHelp() {
    const scope = useScope(css`
        .symbols {
            display: grid;
            gap: var(--spacing-4);
            list-style: none;
        }
        .symbols li {
            display: grid;
            grid-template-columns: 64px minmax(0, 1fr);
            align-items: start;
            gap: var(--spacing-3);
        }
        .symbols svg {
            width: 64px;
            height: 44px;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        .run {
            stroke: var(--color-map-direction);
        }
        .first {
            stroke: var(--color-map-first-jumper);
        }
        .last {
            stroke: var(--color-map-last-jumper);
        }
        .drift {
            stroke: var(--color-map-drift);
        }
        .canopy {
            stroke: var(--color-map-canopy-reach);
            fill: color-mix(
                in srgb,
                var(--color-map-canopy-reach) 15%,
                transparent
            );
        }
        .wingsuit {
            stroke: var(--color-map-wingsuit-reach);
            fill: color-mix(
                in srgb,
                var(--color-map-wingsuit-reach) 15%,
                transparent
            );
        }
        .wind {
            stroke: var(--color-map-wind);
        }
        @media (max-width: 500px) {
            .symbols li {
                grid-template-columns: 44px minmax(0, 1fr);
                gap: var(--spacing-2);
            }
            .symbols svg {
                width: 44px;
            }
        }
    `);
    return html`
        <div>
            ${scope.style}
            <h3>${t("map.symbolsHelpTitle")}</h3>
            <ul class="symbols p-0">
                <li>
                    <svg
                        viewBox="0 0 64 44"
                        aria-hidden="true"
                        stroke-width="3"
                    >
                        <path
                            class="run"
                            d="M 3 22 H 61"
                            stroke-dasharray="5 5"
                        />
                        <circle class="first" cx="15" cy="22" r="5" />
                        <circle class="run" cx="32" cy="22" r="5" />
                        <circle class="last" cx="49" cy="22" r="5" />
                    </svg>
                    <span>${t("map.symbolsRunHelp")}</span>
                </li>
                <li>
                    <svg class="drift" viewBox="0 0 64 44" aria-hidden="true">
                        <path d="M 4 7 C 35 7 12 24 35 24" stroke-width="4" />
                        <path d="M 35 24 Q 48 24 58 38" stroke-width="1.5" />
                    </svg>
                    <span>${t("map.symbolsDriftHelp")}</span>
                </li>
                <li>
                    <svg viewBox="0 0 64 44" aria-hidden="true">
                        <circle
                            class="canopy"
                            cx="32"
                            cy="22"
                            r="14"
                            stroke-width="2"
                            stroke-dasharray="5 4"
                        />
                    </svg>
                    <span>${t("map.symbolsCanopyReachHelp")}</span>
                </li>
                <li>
                    <svg viewBox="0 0 64 44" aria-hidden="true">
                        <circle
                            class="wingsuit"
                            cx="30"
                            cy="22"
                            r="20"
                            stroke-width="2"
                            stroke-dasharray="5 4"
                        />
                        <circle
                            class="canopy"
                            cx="35"
                            cy="22"
                            r="7"
                            stroke-width="1.5"
                            stroke-dasharray="3 3"
                        />
                    </svg>
                    <span>${t("map.symbolsWingsuitReachHelp")}</span>
                </li>
                <li>
                    <svg
                        class="wind"
                        viewBox="0 0 64 44"
                        aria-hidden="true"
                        stroke-width="2"
                    >
                        <path
                            d="M 6 12 H 45 M 38 5 L 45 12 L 38 19 M 15 28 H 35 M 8 36 H 56"
                        />
                    </svg>
                    <span>${t("map.symbolsWindHelp")}</span>
                </li>
            </ul>
            <h3>${t("map.featuresHelpTitle")}</h3>
            <p>${t("map.featuresHelp")}</p>
            <h3>${t("map.accuracyHelpTitle")}</h3>
            <p>${t("map.accuracyHelp")}</p>
        </div>
    `;
}
