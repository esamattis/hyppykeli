// @ts-check
import { Button } from "#app/shared/Button.js";
import { Help } from "#app/shared/Help.js";
import { Icon } from "#app/shared/icons.js";
import { t } from "#app/translations.js";
import { css, useScope } from "#app/useScope.js";
import { h, html } from "htm/preact";
import { useRef } from "preact/hooks";

/** A label, optional help, and control. Parents own page layouts and drafts.
 * @param {FormFieldProps} props
 */
export function FormField({
    id,
    label,
    help,
    layout = "compact",
    className = "",
    labelClassName = "",
    children,
}) {
    const scope = useScope(css`
        :scope.compact-field {
            display: grid;
            gap: var(--spacing-1);
            align-self: end;
            min-width: 0;
        }
        :scope.stacked-field {
            display: grid;
            gap: var(--form-field-gap, var(--spacing-1-5));
        }
        :scope.compact-field > .form-field-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        :scope.compact-field > .form-field-label > label {
            display: block;
            margin: 0;
            overflow-wrap: anywhere;
        }
        :scope:is(.compact-field, .stacked-field) > input,
        :scope.stacked-field > textarea {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }
        :scope.compact-field > input[type="number"] {
            min-height: 36px;
            padding: var(--spacing-1-5) var(--spacing-2);
        }
    `);
    const fieldLabel =
        label == null
            ? null
            : html`
                  <label
                      class=${layout === "plain" ? labelClassName : ""}
                      for=${id}
                  >
                      ${label}
                  </label>
              `;
    return html`
        <div
            class=${`form-field ${layout}-field ${layout === "compact" ? "text-rem-0-7" : ""} ${className}`}
        >
            ${scope.style}
            ${
                layout === "compact" || help
                    ? label == null
                        ? null
                        : html`
                              <div
                                  class=${`form-field-label ${labelClassName}`}
                              >
                                  ${fieldLabel}
                                  ${
                                      help &&
                                      html`
                                          <span class=${scope.end}>
                                              ${help}
                                          </span>
                                      `
                                  }
                              </div>
                          `
                    : fieldLabel
            }
            ${children}
        </div>
    `;
}

/** Keep drafts editable and notify value consumers only after native validation.
 * Raw onInput remains available for editors that store incomplete values.
 * @param {NumberInputProps} props
 */
export function NumberInput({
    inputRef,
    onDraftChange,
    onValueChange,
    onInput,
    ...props
}) {
    return h("input", {
        ...props,
        ref: inputRef,
        type: "number",
        onInput: (event) => {
            const input = event.currentTarget;
            onDraftChange?.(input.value);
            if (onValueChange && input.checkValidity())
                onValueChange(Number(input.value), input);
            onInput?.(event);
        },
    });
}

/** @param {ClearableInputProps} props */
export function ClearableInput({
    name,
    id,
    label,
    "aria-label": ariaLabel,
    placeholder,
    value,
    type = "text",
    step,
    min,
    max,
    onInput,
    onClear,
    onPaste,
    required,
}) {
    const scope = useScope(css`
        :scope {
            position: relative;
            display: inline-flex;
            max-width: 100%;
            width: var(--clearable-input-width, auto);
        }
        input {
            box-sizing: border-box;
            width: var(--clearable-input-width, 22ch);
            padding: var(--spacing-2) var(--spacing-9-5) var(--spacing-2)
                var(--spacing-2-5);
        }
        .clear-input {
            position: absolute;
            top: 50%;
            right: 4px;
            display: grid;
            width: 30px;
            height: 30px;
            border: 0;
            place-items: center;
            transform: translateY(-50%);
            background: transparent;
        }
    `);
    /** @type {import("preact").RefObject<HTMLInputElement | null>} */
    const inputRef = useRef(null);

    function clear() {
        if (inputRef.current) inputRef.current.value = "";
        onClear();
        inputRef.current?.focus();
    }

    return html`
        <div>
            ${scope.style}
            <input
                ref=${inputRef}
                id=${id ?? name}
                type=${type}
                name=${name}
                aria-label=${ariaLabel}
                placeholder=${placeholder}
                step=${step}
                min=${min}
                max=${max}
                value=${value}
                required=${required}
                onInput=${onInput}
                onPaste=${onPaste}
            />
            ${
                value
                    ? html`
                          ${h(
                              Button,
                              {
                                  class: "clear-input p-0",
                                  type: "button",
                                  "aria-label": t("landing.clear", label),
                                  "data-tooltip": t("landing.clear", label),
                                  onClick: clear,
                              },
                              html`
                                  ${h(Icon, { name: "close", size: 18 })}
                              `,
                          )}
                      `
                    : null
            }
        </div>
    `;
}

/** @param {CheckboxFieldProps} props */
export function CheckboxField({
    label,
    className = "text-rem-0-8",
    onCheckedChange,
    ...inputProps
}) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            gap: var(--checkbox-gap, var(--spacing-1-5));
            cursor: pointer;
        }
    `);
    return html`
        <label class=${className}>
            ${scope.style}
            ${h("input", {
                ...inputProps,
                type: "checkbox",
                onChange: (event) =>
                    onCheckedChange?.(event.currentTarget.checked),
            })}
            ${label}
        </label>
    `;
}

/** @param {FieldHelpProps} props */
export function FieldHelp({ title, tooltip, wide, children }) {
    return h(
        Help,
        { label: `${title}: ${t("common.help")}`, tooltip, wide },
        html`
            <h3>${title}</h3>
            ${children}
        `,
    );
}
