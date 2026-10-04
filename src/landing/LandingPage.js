// @ts-check
import { CreateDropzoneForm } from "#app/landing/CreateDropzoneForm.js";
import { Dropzones } from "#app/landing/Dropzones.js";
import { h, html } from "htm/preact";

export function LandingPage() {
    return html`
        ${h(Dropzones, {})}${h(CreateDropzoneForm, {})}
    `;
}
