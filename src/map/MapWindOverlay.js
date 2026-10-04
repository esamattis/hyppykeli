// @ts-check
import { css, useScope } from "../useScope.js";
import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";

/** @param {MapWindLevel} wind @returns {MapWindMotion | null} */
export function getMapWindMotion({ speed, direction }) {
    if (
        speed === null ||
        direction === null ||
        !Number.isFinite(speed) ||
        !Number.isFinite(direction) ||
        speed <= 0
    ) {
        return null;
    }
    // Meteorological bearings describe where wind comes from. Canvas y grows
    // southwards, so a northerly wind travels down and an easterly wind left.
    const radians = (direction * Math.PI) / 180;
    return {
        x: -Math.sin(radians),
        y: Math.cos(radians),
        pixelsPerSecond: speed * 3,
        length: 6 + speed * 2,
    };
}

/** @param {{ wind: MapWindLevel }} props */
export function MapWindOverlay({ wind }) {
    const scope = useScope(css`
        :scope {
            position: absolute;
            inset: 0;
            z-index: 450;
            pointer-events: none;
            overflow: hidden;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    `);
    /** @type {import('preact').RefObject<HTMLCanvasElement>} */
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const motion = getMapWindMotion(wind);
        if (!motion) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
        let width = 0;
        let height = 0;
        const color = "#164e83";
        let frame = 0;
        let lastTime = 0;
        let visible = false;
        /** @type {MapWindParticle[]} */
        let particles = [];

        /** @param {number} elapsed */
        const draw = (elapsed) => {
            context.clearRect(0, 0, width, height);
            const padding = motion.length;
            const spanX = width + 2 * padding;
            const spanY = height + 2 * padding;
            const travel = motion.pixelsPerSecond * elapsed;
            context.lineWidth = 3;
            context.lineCap = "round";
            context.shadowColor = "white";
            context.shadowBlur = 2;
            for (const particle of particles) {
                particle.age += elapsed;
                if (particle.age >= particle.lifetime) {
                    particle.age = 0;
                    particle.x = Math.random() * spanX - padding;
                    particle.y = Math.random() * spanY - padding;
                }
                const opacity = Math.sin(
                    (Math.PI * particle.age) / particle.lifetime,
                );
                particle.x =
                    ((((particle.x + motion.x * travel + padding) % spanX) +
                        spanX) %
                        spanX) -
                    padding;
                particle.y =
                    ((((particle.y + motion.y * travel + padding) % spanY) +
                        spanY) %
                        spanY) -
                    padding;
                const tailX = particle.x - motion.x * motion.length;
                const tailY = particle.y - motion.y * motion.length;
                const gradient = context.createLinearGradient(
                    tailX,
                    tailY,
                    particle.x,
                    particle.y,
                );
                gradient.addColorStop(0, "transparent");
                gradient.addColorStop(1, color);
                context.strokeStyle = gradient;
                context.globalAlpha = 0.85 * opacity;
                context.beginPath();
                context.moveTo(tailX, tailY);
                context.lineTo(particle.x, particle.y);
                context.stroke();
            }
            context.globalAlpha = 1;
        };

        /** @param {number} time */
        const animate = (time) => {
            const elapsed = lastTime
                ? Math.min((time - lastTime) / 1000, 0.064)
                : 0;
            lastTime = time;
            draw(elapsed);
            frame = requestAnimationFrame(animate);
        };
        const updateAnimation = () => {
            cancelAnimationFrame(frame);
            lastTime = 0;
            if (!visible || document.hidden) return;
            draw(0);
            if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
        };
        const resize = new ResizeObserver(() => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            const padding = motion.length;
            const count = Math.min(160, Math.ceil((width * height) / 5000));
            particles = Array.from({ length: count }, () => {
                const lifetime = 1 + Math.random() * 1.5;
                return {
                    x: Math.random() * (width + 2 * padding) - padding,
                    y: Math.random() * (height + 2 * padding) - padding,
                    age: Math.random() * lifetime,
                    lifetime,
                };
            });
            updateAnimation();
        });
        const visibility = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            updateAnimation();
        });
        resize.observe(canvas);
        visibility.observe(canvas);
        reducedMotion.addEventListener("change", updateAnimation);
        document.addEventListener("visibilitychange", updateAnimation);
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            visibility.disconnect();
            reducedMotion.removeEventListener("change", updateAnimation);
            document.removeEventListener("visibilitychange", updateAnimation);
        };
    }, [wind.speed, wind.direction]);

    return html`
        <div class="map-wind-overlay" aria-hidden="true">
            ${scope.style}
            <canvas ref=${canvasRef}></canvas>
        </div>
    `;
}
