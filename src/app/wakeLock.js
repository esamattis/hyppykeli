// @ts-check
import { signal } from "@preact/signals";

export const WAKE_LOCK_ACTIVE = signal(false);
export const WAKE_LOCK_PENDING = signal(false);
export const WAKE_LOCK_FAILED = signal(false);

/** @type {WakeLockSentinel | undefined} */
let lock;
let requested = false;
let started = false;

export function supportsWakeLock() {
    return typeof navigator.wakeLock?.request === "function";
}

async function acquire() {
    if (WAKE_LOCK_PENDING.value || lock || document.hidden) return;
    WAKE_LOCK_PENDING.value = true;
    WAKE_LOCK_FAILED.value = false;
    try {
        const sentinel = await navigator.wakeLock.request("screen");
        lock = sentinel;
        WAKE_LOCK_ACTIVE.value = !sentinel.released;
        sentinel.addEventListener("release", () => {
            if (lock !== sentinel) return;
            lock = undefined;
            WAKE_LOCK_ACTIVE.value = false;
        });
        if (sentinel.released) lock = undefined;
    } catch {
        requested = false;
        WAKE_LOCK_FAILED.value = true;
    } finally {
        WAKE_LOCK_PENDING.value = false;
    }
}

export async function toggleWakeLock() {
    if (WAKE_LOCK_PENDING.value) return;
    WAKE_LOCK_FAILED.value = false;
    if (lock) {
        requested = false;
        WAKE_LOCK_PENDING.value = true;
        try {
            await lock.release();
            lock = undefined;
            WAKE_LOCK_ACTIVE.value = false;
        } catch {
            WAKE_LOCK_FAILED.value = true;
        } finally {
            WAKE_LOCK_PENDING.value = false;
        }
    } else {
        requested = true;
        await acquire();
    }
}

export function startWakeLock() {
    if (started || !supportsWakeLock()) return;
    started = true;
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && requested) void acquire();
    });
}
