// @ts-check
import { QUERY_PARAMS } from "#app/app/settings.js";
import { html } from "htm/preact";

export function RenderInjectedCSS() {
    const css = QUERY_PARAMS.value.css;

    if (!css) {
        return null;
    }

    return html`
        <style dangerouslySetInnerHTML=${{ __html: atob(css) }}></style>
    `;
}
