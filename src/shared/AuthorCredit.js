// @ts-check
import { css, useScope } from "#app/useScope.js";
import { html } from "htm/preact";

export function AuthorCredit() {
    const scope = useScope(css`
        :scope {
            position: absolute;
            top: 0;
            right: 0;
        }
        a,
        a:visited,
        a:hover {
            color: inherit;
            border: none;
            text-decoration: none;
        }
    `);
    return html`
        <span class="author-credit text-rem-0-5 me-1">
            ${scope.style}by${" "}
            <a href="https://esamatti.fi">esamatti.fi</a>
            ,${" "}
            <a
                href="https://github.com/esamattis/hyppykeli/graphs/contributors?all=1"
            >
                friends
            </a>
            ${" "}and bots
        </span>
    `;
}
