// @ts-check
import { Button } from "#app/shared/Button.js";
import { cardHeadingStyles } from "#app/styles.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import { useEffect, useState } from "preact/hooks";

/** @type {Promise<void> | undefined} */
let stylesheet;

function loadStylesheet() {
    if (!stylesheet) {
        stylesheet = new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "/src/map/leaflet.css";
            link.onload = () => resolve();
            link.onerror = () => {
                link.remove();
                stylesheet = undefined;
                reject(new Error("Could not load Leaflet styles"));
            };
            document.head.append(link);
        });
    }
    return stylesheet;
}

// Keep the map's module tree out of the initial weather render. Its stylesheet
// and modules load together; mounting waits for both so Leaflet measures a styled map.
export function LazyDropzoneMap() {
    const [mapModule, setMapModule] = useState(
        /** @type {typeof import("#app/map/DropzoneMap.js") | null} */ (null),
    );
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const scope = useScope(css`
        :scope {
            grid-area: dropzone-map;
            min-height: 560px;
        }
        ${cardHeadingStyles}
    `);

    useEffect(() => {
        let active = true;
        setFailed(false);
        Promise.all([import("#app/map/DropzoneMap.js"), loadStylesheet()]).then(
            ([module]) => {
                if (active) setMapModule(module);
            },
            () => {
                if (active) setFailed(true);
            },
        );
        return () => {
            active = false;
        };
    }, [attempt]);

    if (mapModule) return h(mapModule.DropzoneMap, {});

    return html`
        <section
            id="dropzone-map"
            class="p-panel"
            aria-label=${t("map.region")}
            aria-busy=${!failed}
        >
            ${scope.style}
            <div class="card-heading"><h2>${t("map.title")}</h2></div>
            <p aria-live="polite">
                ${t(failed ? "common.error" : "map.loading")}
            </p>
            ${
                failed &&
                html`
                    ${h(
                        Button,
                        {
                            type: "button",
                            onClick: () => setAttempt(attempt + 1),
                        },
                        html`
                            ${t("common.retry")}
                        `,
                    )}
                `
            }
        </section>
    `;
}
