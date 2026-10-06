// @ts-check
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
            gap: 4px;
            align-self: end;
            min-width: 0;
            font-size: 0.7rem;
        }
        :scope.stacked-field {
            display: grid;
            gap: var(--form-field-gap, 6px);
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
            padding: 6px 8px;
        }
    `);
    const fieldLabel =
        label == null
            ? null
            : html`
                  <label for=${id}>${label}</label>
              `;
    return html`
        <div class=${`form-field ${layout}-field ${className}`}>
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
    label,
    placeholder,
    value,
    type = "text",
    step,
    min,
    max,
    onInput,
    onClear,
    onPaste,
}) {
    const scope = useScope(css`
        :scope {
            position: relative;
            display: inline-flex;
            max-width: 100%;
        }
        input {
            box-sizing: border-box;
            width: 22ch;
            padding: 8px 38px 8px 10px;
        }
        .clear-input {
            position: absolute;
            top: 50%;
            right: 4px;
            display: grid;
            width: 30px;
            height: 30px;
            padding: 0;
            border: 0;
            place-items: center;
            transform: translateY(-50%);
            background: transparent;
        }
    `);
    /** @type {import("preact").RefObject<HTMLInputElement | null>} */
    const inputRef = useRef(null);

    function clear() {
        onClear();
        inputRef.current?.focus();
    }

    return html`
        <div>
            ${scope.style}
            <input
                ref=${inputRef}
                id=${name}
                type=${type}
                name=${name}
                placeholder=${placeholder}
                step=${step}
                min=${min}
                max=${max}
                value=${value}
                onInput=${onInput}
                onPaste=${onPaste}
            />
            ${
                value
                    ? html`
                          <button
                              class="clear-input"
                              type="button"
                              aria-label=${t("landing.clear", label)}
                              title=${t("landing.clear", label)}
                              onClick=${clear}
                          >
                              ${h(Icon, { name: "close", size: 18 })}
                          </button>
                      `
                    : null
            }
        </div>
    `;
}

/** @param {CheckboxFieldProps} props */
export function CheckboxField({
    label,
    className = "",
    onCheckedChange,
    ...inputProps
}) {
    const scope = useScope(css`
        :scope {
            display: inline-flex;
            align-items: center;
            gap: var(--checkbox-gap, 6px);
            font-size: 0.8rem;
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
export function FieldHelp({ title, wide, children }) {
    return h(
        Help,
        { label: `${title}: ${t("common.help")}`, wide },
        html`
            <h3>${title}</h3>
            ${children}
        `,
    );
}
