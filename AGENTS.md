# Project guidance

Coding rules for AI agents and humans alike.

## Types and validation

The project uses TypeScript through JSDoc comments in `.js` files, with strict
mode enabled. Always check TypeScript diagnostics after code changes by running
`npm run tsc`.

Define helper types and interfaces in `types.d.ts`. They can be referenced globally
throughout the project.

## Dependencies and UI

This is a bundlerless project. Third-party dependencies live in `vendor` and are
referenced through the import map in `dz/index.html`.

The UI uses Preact and the `htm` tagged template literal helper, avoiding a JSX
compilation step.

When rendering a local custom component that takes props inside an `htm`
template, use `h` from `htm/preact` so its props are typechecked correctly:

```js
import { h, html } from "htm/preact";

html`
    ${h(
        Help,
        { label: "?" },
        html`
            <p class="metar" style="font-size: 120%">
                ${cloud.amount}${" "}${cloud.base}${cloud.unit}
            </p>
        `,
    )}
`;
```

## Tooling

Use mise for the Node version in `mise.toml`. The pnpm version is pinned by
`packageManager` in `package.json`, rather than by mise. Run project scripts with
`mise exec -- corepack pnpm run <script>` (for example, `tsc`).

## Component CSS

Use `css` and `useScope` from `src/useScope.js` for component styles. Render
`${scope.style}` directly inside the DOM element that owns the styles; use
`:scope` to style that element. Components with sibling roots need a style node
inside each root. Call hooks before conditional returns.

Add `scope.end` to a content wrapper's classes when the component's rules should
exclude supplied children. This excludes the wrapper's children, not the wrapper
itself, and does not block inheritance or styles from other scopes.

Share reusable CSS snippets in `src/styles.js`. Keep page defaults and theme rules
in `styles.css`; static landing-page sections use inline native `@scope` rules.
Component styles use the `components` layer so unlayered custom CSS from the CSS
editor can override them. Keep existing IDs and classes used by custom CSS.
`@scope` does not isolate keyframe names, so prefix animation names by component.

## Local runtime

The app is served by the user systemd unit `hyppykeli.service`, defined in
`/home/esamatti/.config/systemd/user/hyppykeli.service`.

- Working directory: `/home/esamatti/code/hyppykeli`
- Command: `/usr/bin/python3 -m http.server 8488 --bind 0.0.0.0`
- Local URL: `http://localhost:8488` (listens on all network interfaces)

The server serves this checkout directly, so source changes are available on
browser refresh without a build or service restart.

Check the service with `systemctl --user status hyppykeli.service`.
If needed, restart it with `systemctl --user restart hyppykeli.service`.
