// @ts-check
import { t } from "../translations.js";
import { formatClock } from "./dates.js";
import { html } from "htm/preact";
import { useCallback, useEffect, useState } from "preact/hooks";

/**
 * Set value returned by the setter function to the state every second.
 *
 * @param {() => T} setter
 * @template {any} T
 * @returns {T}
 */
function useInterval(setter) {
    const [state, setState] = useState(/** @type {T} */ (setter()));
    useEffect(() => {
        setState(setter());
        const interval = setInterval(() => {
            setState(setter());
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [setter]);

    return state;
}

/**
 * @param {Object} props
 * @param {Date} [props.date]
 */
export function FromNow(props) {
    const createFromNow = useCallback(() => {
        if (!props.date) {
            return "";
        }

        const diffInMinutes = Math.round(
            -(Date.now() - props.date.getTime()) / 1000 / 60,
        );

        if (Math.abs(diffInMinutes) > 120) {
            const diffInHours = Math.round(diffInMinutes / 60);
            return t("fromNow.hours", diffInHours);
        }

        return t("fromNow.minutes", diffInMinutes);
    }, [props.date]);

    if (!props.date) {
        return null;
    }

    const fromNow = useInterval(createFromNow);

    return html`
        <span class="from-now">${fromNow}</span>
        ${" "}
        <small>(${t("time.clock", formatClock(props.date))})</small>
    `;
}
