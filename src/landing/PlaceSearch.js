// @ts-check
import { searchPlaces } from "#app/landing/api.js";
import { LANGUAGE, t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** @param {{ onSelect: (result: PlaceSearchResult) => void, disabled: boolean }} props */
export function PlaceSearch({ onSelect, disabled }) {
    const scope = useScope(css`
        .search-controls {
            display: flex;
            gap: var(--spacing-3);
        }
        input {
            flex: 1;
            min-width: 0;
        }
        .search-results {
            display: grid;
            gap: var(--spacing-3);
            list-style: none;
        }
        .search-results button {
            width: 100%;
            text-align: start;
            white-space: normal;
        }
    `);
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(
        /** @type {"landing.searchEmpty" | "landing.searchError" | null} */ (
            null
        ),
    );
    const [results, setResults] = useState(
        /** @type {PlaceSearchResult[]} */ ([]),
    );
    const requestRef = useRef(/** @type {AbortController | null} */ (null));
    const cacheRef = useRef(
        new Map(/** @type {[string, PlaceSearchResult[]][]} */ ([])),
    );
    useEffect(() => () => requestRef.current?.abort(), []);

    /** @param {import("preact").JSX.TargetedSubmitEvent<HTMLFormElement>} event */
    async function search(event) {
        event.preventDefault();
        const text = query.trim();
        if (!text || busy || disabled) return;
        const controller = new AbortController();
        requestRef.current = controller;
        const started = Date.now();
        setBusy(true);
        setMessage(null);
        setResults([]);
        try {
            const key = `${LANGUAGE.value}:${text}`;
            const places =
                cacheRef.current.get(key) ??
                (await searchPlaces(text, controller.signal));
            if (controller.signal.aborted) return;
            cacheRef.current.set(key, places);
            setResults(places);
            if (places[0]) onSelect(places[0]);
            else setMessage("landing.searchEmpty");
        } catch {
            if (!controller.signal.aborted) setMessage("landing.searchError");
        } finally {
            // Keep submitted searches at least one second apart.
            await new Promise((resolve) =>
                setTimeout(resolve, Math.max(0, 1000 - (Date.now() - started))),
            );
            if (!controller.signal.aborted) setBusy(false);
        }
    }

    return html`
        <div class="mb-4">
            ${scope.style}
            <form
                onSubmit=${search}
                role="search"
                aria-label=${t("landing.placeSearch")}
            >
                <label for="place-search">${t("landing.placeSearch")}</label>
                <div class="search-controls mt-3">
                    <input
                        id="place-search"
                        type="search"
                        value=${query}
                        disabled=${disabled}
                        onInput=${(/** @type {import("preact").JSX.TargetedEvent<HTMLInputElement>} */ event) => setQuery(event.currentTarget.value)}
                    />
                    <button
                        type="submit"
                        disabled=${disabled || busy || !query.trim()}
                    >
                        ${t(busy ? "landing.searching" : "landing.search")}
                    </button>
                </div>
            </form>
            <div role="status" aria-live="polite">
                ${
                    message &&
                    html`
                        <p>${t(message)}</p>
                    `
                }
            </div>
            ${
                results.length > 0 &&
                html`
                    <ul
                        class="search-results p-0 my-4"
                        aria-label=${t("landing.searchResults")}
                    >
                        ${results.map(
                            (result) => html`
                                <li
                                    key=${`${result.lat},${result.lon},${result.display_name}`}
                                >
                                    <button
                                        type="button"
                                        onClick=${() => onSelect(result)}
                                    >
                                        ${result.display_name}
                                    </button>
                                </li>
                            `,
                        )}
                    </ul>
                `
            }
        </div>
    `;
}
