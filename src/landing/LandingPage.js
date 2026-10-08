// @ts-check
import { CreateDropzoneForm } from "#app/landing/CreateDropzoneForm.js";
import { Dropzones } from "#app/landing/Dropzones.js";
import { Tooltips } from "#app/shared/Tooltips.js";
import { h, html } from "htm/preact";
import { useState } from "preact/hooks";

export function LandingPage() {
    const [coordinates, setCoordinates] = useState(
        /** @type {LandingCoordinateSelection | null} */ (null),
    );
    return html`
        ${h(Dropzones, { onSelect: (lat, lon) => setCoordinates({ lat, lon }) })}
        ${h(CreateDropzoneForm, { coordinates })}${h(Tooltips, {})}
    `;
}
