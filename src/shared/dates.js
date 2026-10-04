// @ts-check
import { getIntlLocale, t } from "../translations.js";

/**
 * @param {Date} date
 */
export function formatClock(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * @param {Date} date
 */
export function formatDate(date) {
    return date.toLocaleDateString(getIntlLocale());
}

/**
 * @param {Date} date
 */
export function humanDayText(date) {
    const day = date.getDate();
    const today = new Date().getDate();

    if (day === today) {
        return t("common.today").toLocaleLowerCase(getIntlLocale());
    }

    if (day === today + 1) {
        return t("common.tomorrow").toLocaleLowerCase(getIntlLocale());
    }

    if (day === today + 2) {
        return t("common.dayAfterTomorrow");
    }

    return "";
}
