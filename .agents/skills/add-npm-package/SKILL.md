---
name: add-npm-package
description: Add or update npm dependencies in Hyppykeli, including committed vendor bundles and browser import-map entries. Use when changing this project's dependencies or explaining its dependency workflow.
---

# Add npm packages to Hyppykeli

This project serves source files directly without an application bundler. Browser
dependencies are bundled separately with esbuild into `vendor/build`, committed
to Git, and resolved through the import map in `dz/index.html`. Installing an npm
package alone does not make it available in the browser.

Read `package.json`, `build.sh`, the relevant `vendor` entry files, and the import
map before changing dependencies. The README favors limiting additional libraries
to reduce maintenance; respect an explicit request to add a package.

## Browser dependencies

1. Install with `mise exec -- pnpm add <package>`. Mise selects Node and pnpm from
   the declarations in `package.json` through `mise.toml`.
2. Add a small entry module at `vendor/<entry>.js` that re-exports the required
   package API. Match the package's actual exports: `export *` does not re-export
   a default export. Existing entries show the conventions, including Chart.js's
   `chart.js/auto` entry.
3. Extend `build.sh` to bundle the entry into `vendor/build` as minified ESM.
   Preact-dependent bundles must use `--external:preact` to share the app's Preact
   instance. Preserve the existing `preact/hooks` entry's direct module-path
   workaround; its comment explains why the usual re-export is insufficient.
4. Add the import specifier used by app code to the import map in `dz/index.html`,
   pointing to `/vendor/build/<entry>.js`. Map any exposed subpath imports
   explicitly as needed. Source modules can then use bare package imports.
5. Run `mise exec -- pnpm run build` and `mise exec -- pnpm run tsc`. Check the
   affected browser behavior when integrating a package into the UI.

Include the manifest, lockfile, vendor entry, generated bundle, build script, and
import-map changes in the resulting patch as applicable. Generated vendor bundles
are tracked artifacts; regenerate them rather than editing them by hand. Review
the build diff for unrelated bundle churn. Commit only when the user requests it.

For upgrades, update the dependency with pnpm, regenerate its bundles, and check
whether exports, import-map entries, or app usage need adjustment.

## Development-only dependencies

Use `mise exec -- pnpm add -D <package>` for tooling that does not run in the
browser. Update the relevant scripts or configuration as needed; no vendor entry
or import-map mapping is required. Run the affected tooling and, after code
changes, `mise exec -- pnpm run tsc`.

The local HTTP server serves this checkout directly. Browser refresh picks up
source and vendor changes without a server restart.
