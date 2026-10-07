# Project guidance

Coding rules for AI agents and humans alike.

## Source organization

Group source modules by the feature that owns them:

- `src/app`: dropzone page composition, navigation, settings, and startup.
- `src/landing`: landing page and dropzone creation.
- `src/weather`: weather state, refresh orchestration, calculations, and UI.
- `src/weather/providers`: API requests, caching, and response parsing. Providers
  return data; refresh orchestration owns updates to weather signals.
- `src/map`: map UI, map state, freefall, and jump-run calculations.
- `src/manual`: manual UI and observation overrides.
- `src/shared`: reusable UI primitives and general-purpose helpers.

Keep component styles with their components. Use PascalCase filenames for
components and descriptive names for other modules. Import modules directly using
the `#app/` alias for modules under `src` (for example, `#app/weather/state.js`).
Shared styles, translations, dropzone listings, and ambient types remain at the
`src` root. Browser listeners and weather polling start explicitly through
`src/app/start.js`; importing state or calculation modules must not start polling.

## Translations

When adding or updating translations, update all other language translations to
match in the same change. Keep translation keys and meanings consistent across
all supported languages.

## Types and validation

The project uses TypeScript through JSDoc comments in `.js` files, with strict
mode enabled. Always check TypeScript diagnostics after code changes. `pn test`
includes this check; run `mise exec -- pnpm run tsc` when only checking types.

Purely visual changes do not need tests unless explicitly asked. Do not add or
run tests solely to verify styling, layout, or artwork for those changes.
Do not assert visual details such as colors, SVG stroke/fill values, styling,
layout, or artwork in tests. Test behavior and functionality instead.

For other changes, run `pn test` (`mise exec -- pnpm test` when invoking through
mise). This formats files, checks TypeScript diagnostics, and runs the headless
Playwright tests. The tests start their own HTTP server and cover desktop and
mobile views. Install Chromium if needed with
`mise exec -- pnpm exec playwright install chromium`.

Define helper types and interfaces in `types.d.ts`. They can be referenced globally
throughout the project.

## Dependencies and UI

Tooltips always use the `data-tooltip` attribute, not the native `title` attribute.
When referring to tooltips, this means the shared `data-tooltip` implementation.

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

Use mise to select Node from `devEngines.runtime` and pnpm from `packageManager`
in `package.json`. `mise.toml` enables reading these version declarations.
Run project scripts with `mise exec -- pnpm run <script>` (for example, `tsc`).

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

Always use the shared CSS color variables from `styles.css` when referencing
colors in CSS, inline styles, SVG, or animations. For canvas, charts, and map
APIs that require color values, read the variables through `getTheme()` in
`src/styles.js`. Do not hardcode color values outside the shared variable
definitions. Reuse variables consistently by semantic role; add a documented
variable in `styles.css` when a new color role is needed. Structural keywords
such as `transparent`, `currentColor`, and `none` are allowed. Static metadata
that cannot read CSS variables, such as `manifest.json`, must match the shared
palette.

## Spacing

Use the Tailwind-style margin and padding classes in `spacing.css` for ordinary
spacing (for example, `p-4`, `px-3`, `mt-2`, `mx-auto`, or `ps-1.5`). The scale is
based on `--spacing` (0.25rem); numbered tokens such as `--spacing-4` and
`--spacing-1-5` are defined in `styles.css`. Use those tokens for gaps and spacing
in responsive, descendant, or calculated CSS rules. Keep geometry-dependent
spacing coordinated: `p-panel` uses `--panel-padding`, which also controls the
map's full-bleed margins. Utilities are layered after components; unlayered
custom CSS still overrides them. No Tailwind dependency or build step is needed.

## Local runtime

The app is served by the user systemd unit `hyppykeli.service`, defined in
`/home/esamatti/.config/systemd/user/hyppykeli.service`.

- Working directory: `/home/esamatti/code/hyppykeli`
- Command: `/usr/bin/caddy run --config /home/esamatti/.config/hyppykeli/Caddyfile --adapter caddyfile`
- Caddy config: `/home/esamatti/.config/hyppykeli/Caddyfile`
- Local URL: `http://localhost:8488` (listens on all network interfaces)

The server serves this checkout directly, so source changes are available on
browser refresh without a build or service restart.

Check the service with `systemctl --user status hyppykeli.service`.
If needed, restart it with `systemctl --user restart hyppykeli.service`.
