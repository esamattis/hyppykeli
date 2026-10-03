# Project guidance

Coding rules for AI agents and humans alike.

## Types and validation

The project uses TypeScript through JSDoc comments in `.js` files, with strict
mode enabled. Always check TypeScript diagnostics after code changes by running
`npm run tsc`.

Define helper types and interfaces in `types.ts`. They can be referenced globally
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
