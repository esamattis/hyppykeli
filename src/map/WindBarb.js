// @ts-check
import { html } from "htm/preact";

/** @param {number | null} speed */
export function windBarbKnots(speed) {
    return speed !== null && Number.isFinite(speed) && speed >= 0
        ? Math.round((speed * 1.943844) / 5) * 5
        : null;
}

/** @param {{ speed: number | null, direction: number | null }} props */
export function WindBarb({ speed, direction }) {
    const knots = windBarbKnots(speed);
    const validSpeed = knots !== null;
    const validDirection = direction !== null && Number.isFinite(direction);
    if (!validSpeed || (speed !== 0 && !validDirection))
        return html`
            <svg width="32" height="36" viewBox="0 0 64 64" aria-hidden="true">
                <text
                    x="32"
                    y="40"
                    text-anchor="middle"
                    fill="currentColor"
                    class="text-px-28"
                >
                    ?
                </text>
            </svg>
        `;

    // Standard wind barbs use knots: a flag is 50, a full barb 10, a half barb 5.
    const flags = Math.floor((knots ?? 0) / 50);
    const fullBarbs = Math.floor(((knots ?? 0) % 50) / 10);
    const halfBarb = (knots ?? 0) % 10 >= 5;
    // Lean the marks beyond the shortened shaft tip.
    const shaftTip = 18;
    const spacing = Math.min(
        5,
        (38 - shaftTip) / Math.max(1, flags * 2 + fullBarbs + Number(halfBarb)),
    );
    let offset = 0;
    const marks = [];
    for (let index = 0; index < flags; index++) {
        const y = shaftTip + offset;
        marks.push(html`
            <path
                d=${`M 32 ${y} L 47 ${y - 5} L 32 ${y + spacing * 2} Z`}
                fill="currentColor"
            />
        `);
        offset += spacing * 2;
    }
    for (let index = 0; index < fullBarbs; index++) {
        const y = shaftTip + offset;
        marks.push(html`
            <path d=${`M 32 ${y} L 47 ${y - 5}`} />
        `);
        offset += spacing;
    }
    if (halfBarb) {
        const y =
            shaftTip + offset + (fullBarbs === 0 && flags === 0 ? spacing : 0);
        marks.push(html`
            <path d=${`M 32 ${y} L 40 ${y - 2.5}`} />
        `);
    }
    return html`
        <svg
            width="32"
            height="36"
            viewBox="0 0 64 64"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <g transform=${`rotate(${direction ?? 0} 32 32)`}>
                <circle cx="32" cy=${speed === 0 ? 32 : 50} r="5" />
                ${
                    speed === 0
                        ? null
                        : html`
                              <path d=${`M 32 45 L 32 ${shaftTip}`} />
                              ${marks}
                          `
                }
            </g>
        </svg>
    `;
}
