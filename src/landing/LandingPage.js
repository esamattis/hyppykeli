// @ts-check
import { CreateDropzoneForm } from "./CreateDropzoneForm.js";
import { Dropzones } from "./Dropzones.js";
import { h, html } from "htm/preact";

export function LandingPage() {
    return html`
        ${h(Dropzones, {})}${h(CreateDropzoneForm, {})}
    `;
}
