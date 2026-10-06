// @ts-check
import { FormField, NumberInput } from "#app/shared/FormFields.js";
import { t } from "#app/translations.js";
import { h, html } from "htm/preact";
import { FreefallHelp } from "#app/map/FreefallHelp.js";
import { useId } from "preact/hooks";

/** Shared opening-height and freefall-speed inputs; parents own their drafts.
 * @param {FreefallFieldsProps} props
 */
export function FreefallFields({
    exitHeight,
    openingDraft,
    speedDraft,
    openingRef,
    tableCells = false,
    onDraftChange,
    onChange,
    children,
}) {
    const id = useId();
    const opening = h(
        FormField,
        {
            id: `${id}-opening`,
            label: tableCells ? undefined : t("settings.openingHeight"),
            help: tableCells
                ? undefined
                : h(FreefallHelp, { field: "openingHeight" }),
            className: "freefall-field",
            labelClassName: "field-label",
        },
        h(NumberInput, {
            id: `${id}-opening`,
            "aria-label": tableCells ? t("settings.openingHeight") : undefined,
            required: true,
            min: 800,
            max: exitHeight - 1,
            step: 100,
            inputRef: openingRef,
            value: openingDraft,
            onDraftChange: (value) => onDraftChange("openingHeight", value),
            onValueChange: (value) => onChange("openingHeight", value),
        }),
    );
    const speed = h(
        FormField,
        {
            id: `${id}-speed`,
            label: tableCells ? undefined : t("settings.freefallSpeed"),
            help: tableCells
                ? undefined
                : h(FreefallHelp, { field: "freefallSpeed" }),
            className: "freefall-field",
            labelClassName: "field-label",
        },
        h(NumberInput, {
            id: `${id}-speed`,
            "aria-label": tableCells ? t("settings.freefallSpeed") : undefined,
            required: true,
            min: 20,
            step: 20,
            value: speedDraft,
            onDraftChange: (value) => onDraftChange("speedKmh", value),
            onValueChange: (value) => onChange("speedKmh", value),
        }),
    );
    if (tableCells)
        return html`
            <td>${speed}</td>
            <td>${opening}</td>
        `;
    return html`
        ${opening}${children}${speed}
    `;
}
