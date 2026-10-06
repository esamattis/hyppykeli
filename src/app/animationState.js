// @ts-check
import { signal } from "@preact/signals";

/** Shared gate for the app's continuous animations. */
export const ANIMATIONS_RUNNING = signal(true);

/** @type {Set<symbol>} */
const interactions = new Set();
/** @type {ReturnType<typeof setTimeout> | undefined} */
let resumeTimer;

function resumeAfterIdle() {
    clearTimeout(resumeTimer);
    if (interactions.size) return;
    resumeTimer = setTimeout(() => {
        ANIMATIONS_RUNNING.value = true;
    }, 1000);
}

/** Hold playback for an ongoing gesture; release starts the idle delay. */
export function holdAnimations() {
    const interaction = Symbol();
    interactions.add(interaction);
    clearTimeout(resumeTimer);
    ANIMATIONS_RUNNING.value = false;
    return () => {
        if (interactions.delete(interaction)) resumeAfterIdle();
    };
}
