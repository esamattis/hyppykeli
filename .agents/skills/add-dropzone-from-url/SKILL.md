---
name: add-dropzone-from-url
description: Add a predefined Hyppykeli dropzone to the landing-page lists from a shared /dz/ URL, omitting map view, run position, and query parameters that match effective defaults.
---

# Add a dropzone from a URL

Predefined dropzones live in `src/dropzones.js`, in `completeDropzones` and
`partialDropzones`. Adding a stored dropzone here makes it available in the
landing-page list and map; browser-local saved dropzones are a separate feature.

Parse the supplied URL with `URL` and `URLSearchParams`. Use its landing
coordinates (`lat` and `lon`), name, elevation in metres AMSL, weather station
identifiers, and nondefault jump settings in the entry's `qs` object. Preserve
coordinate precision and the supplied location rather than substituting airport
coordinates or an earlier reference list. Match an existing entry by ICAO or name
before adding a duplicate. Do not invent weather identifiers. Locations without
METAR coverage belong in `partialDropzones`, following the existing entries.

Never add `map_center_lat`, `map_center_lon`, `map_zoom`, `map_run_start_lat`, or
`map_run_start_lon` to a predefined dropzone, even when supplied in the URL and
different from defaults. These are temporary map-view and run-position state;
let the app choose the view and position the run for the current conditions.

Read the current fallback values in `src/map/DropzoneMap.js`, the encodings in
`src/map/mapQuery.js`, and constants in `src/map/freefall.js`,
`src/map/wingsuit.js`, and `src/map/canopy.js` before trimming parameters. Compare
numeric values numerically, including computed defaults such as `80 / 3.6`.
After excluding the five fields above, omit other parameters when leaving them
out produces the same effective setup.

In particular, `default_jump_group_count` controls a group when creating a run,
whereas the fallback for `map_jumpers` is a single jumper. Do not assume a
six-jumper list matches the `map_jumpers` fallback just because six is the
default creation count. Check the actual initialization and placement behavior
before omitting or replacing group settings.
Preserve nondefault settings and explicit cleared values when omission changes
behavior. Store scalar fields and jumper encodings using the existing query
schema, not JSON blobs.

Use the listing name for the entry's `name`; retain `qs.name` when the URL uses
it to name the opened dropzone. Follow existing description conventions. Add
translated descriptions in every supported language in `src/translations.js`
when needed. A landing coordinate pair in `qs` also supplies its map pin, so no
`mapCoordinates` fallback is needed for that entry.

Update affected list-count expectations in `tests/landing-page.spec.js` and run
`mise exec -- pnpm test` as required by the project. Review the generated link
to confirm nondefault landing and jump settings survive, the five excluded
fields are absent, and default scalar settings are omitted. Keep unrelated
dropzones and application defaults unchanged.
