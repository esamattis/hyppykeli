// @ts-check
import { useId } from "preact/hooks";
import { h } from "htm/preact";

/**
 * Render style directly inside its scope root. Add end to a content wrapper
 * to exclude that wrapper's children from these rules.
 * Component rules are layered so custom CSS can override them.
 * @param {string} rules
 * @returns {CSSScope}
 */
export function useScope(rules) {
    const end = `scope-end-${useId()}`;
    return {
        end,
        style: h(
            "style",
            null,
            `@layer components { @scope to (.${CSS.escape(end)} > *) { ${rules} } }`,
        ),
    };
}

/**
 * Identity template tag for CSS formatting; interpolate trusted CSS only.
 * @param {TemplateStringsArray} strings
 * @param {...string} expressions
 * @returns {string}
 */
export function css(strings, ...expressions) {
    return strings.reduce(
        (result, string, index) => result + string + (expressions[index] ?? ""),
        "",
    );
}
