// @ts-check
import { WindParticleField } from "#app/map/windParticles.js";
import { getTheme } from "#app/styles.js";
import { css, useScope } from "#app/useScope.js";
import { ANIMATIONS_RUNNING } from "#app/app/animationState.js";
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
        length: 10 + speed * 3,
    };
}

/** @param {{ wind: MapWindLevel, satellite: boolean }} props */
export function MapWindOverlay({ wind, satellite }) {
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

    const targetMotion = useRef(getMapWindMotion(wind));
    /** @type {import('preact').RefObject<(() => void) | null>} */
    const updateWind = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        let motion = targetMotion.current;
        let target = motion;
        let start = motion;
        let transitionTime = 0.3;
        const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
        const desktop = matchMedia("(min-width: 900px)");
        let width = 0;
        let height = 0;
        const theme = getTheme(canvas);
        const color = theme.mapWind;
        let frame = 0;
        let lastTime = 0;
        let visible = false;
        let ratio = 1;
        // Share one rasterized sprite across particles, rebuilding it only
        // when the wind changes or the canvas resolution changes.
        const sprite = document.createElement("canvas");
        const spriteContext = sprite.getContext("2d");
        if (!spriteContext) return;
        const margin = 6;
        /** @type {MapWindMotion | null} */
        let spriteMotion = null;
        let headX = 0;
        let headY = 0;
        const renderSprite = () => {
            if (!motion) return;
            spriteMotion = motion;
            const spriteWidth = Math.abs(motion.x * motion.length) + margin * 2;
            const spriteHeight =
                Math.abs(motion.y * motion.length) + margin * 2;
            headX = margin + Math.max(0, motion.x * motion.length);
            headY = margin + Math.max(0, motion.y * motion.length);
            sprite.width = Math.ceil(spriteWidth * ratio);
            sprite.height = Math.ceil(spriteHeight * ratio);
            spriteContext.setTransform(ratio, 0, 0, ratio, 0, 0);
            const tailX = headX - motion.x * motion.length;
            const tailY = headY - motion.y * motion.length;
            const gradient = spriteContext.createLinearGradient(
                tailX,
                tailY,
                headX,
                headY,
            );
            gradient.addColorStop(0, `rgb(from ${color} r g b / 0)`);
            gradient.addColorStop(1, color);
            spriteContext.strokeStyle = gradient;
            spriteContext.lineWidth = desktop.matches ? 2.5 : 1.5;
            spriteContext.lineCap = "round";
            spriteContext.beginPath();
            spriteContext.moveTo(tailX, tailY);
            spriteContext.lineTo(headX, headY);
            spriteContext.stroke();
        };
        const field = new WindParticleField();

        /** @param {number} elapsed */
        const draw = (elapsed) => {
            context.clearRect(0, 0, width, height);
            if (target !== targetMotion.current) {
                target = targetMotion.current;
                start = motion;
                transitionTime = 0;
            }
            if (!start || !target || reducedMotion.matches) {
                motion = target;
                start = target;
                transitionTime = 0.3;
            } else if (transitionTime >= 0.3) {
                motion = target;
            } else {
                transitionTime = Math.min(0.3, transitionTime + elapsed);
                const progress = transitionTime / 0.3;
                const eased = progress * progress * (3 - 2 * progress);
                const startAngle = Math.atan2(start.y, start.x);
                const targetAngle = Math.atan2(target.y, target.x);
                // Signed shortest turn also handles bearings across north.
                const turn = Math.atan2(
                    Math.sin(targetAngle - startAngle),
                    Math.cos(targetAngle - startAngle),
                );
                const angle = startAngle + turn * eased;
                motion =
                    progress === 1
                        ? target
                        : {
                              x: Math.cos(angle),
                              y: Math.sin(angle),
                              pixelsPerSecond:
                                  start.pixelsPerSecond +
                                  (target.pixelsPerSecond -
                                      start.pixelsPerSecond) *
                                      eased,
                              length:
                                  start.length +
                                  (target.length - start.length) * eased,
                          };
            }
            if (!motion || width <= 0 || height <= 0) return;
            if (spriteMotion !== motion) renderSprite();
            const travel = motion.pixelsPerSecond * elapsed;
            field.update(elapsed, motion.x * travel, motion.y * travel);
            for (const particle of field.particles) {
                if (particle.age < 0) continue;
                const opacity = Math.sin(
                    (Math.PI * particle.age) / particle.lifetime,
                );
                context.globalAlpha = opacity;
                context.drawImage(
                    sprite,
                    particle.x - headX,
                    particle.y - headY,
                    sprite.width / ratio,
                    sprite.height / ratio,
                );
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
            if (!visible || document.hidden || !ANIMATIONS_RUNNING.value)
                return;
            draw(0);
            if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
        };
        const updateParticleWidth = () => {
            renderSprite();
            updateAnimation();
        };
        const resize = new ResizeObserver(() => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            renderSprite();
            field.resize(width, height);
            updateAnimation();
        });
        const visibility = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            updateAnimation();
        });
        updateWind.current = updateAnimation;
        resize.observe(canvas);
        visibility.observe(canvas);
        reducedMotion.addEventListener("change", updateAnimation);
        desktop.addEventListener("change", updateParticleWidth);
        document.addEventListener("visibilitychange", updateAnimation);
        const unsubscribe = ANIMATIONS_RUNNING.subscribe(updateAnimation);
        return () => {
            updateWind.current = null;
            unsubscribe();
            cancelAnimationFrame(frame);
            resize.disconnect();
            visibility.disconnect();
            reducedMotion.removeEventListener("change", updateAnimation);
            desktop.removeEventListener("change", updateParticleWidth);
            document.removeEventListener("visibilitychange", updateAnimation);
        };
    }, [satellite]);

    useEffect(() => {
        targetMotion.current = getMapWindMotion(wind);
        updateWind.current?.();
    }, [wind.speed, wind.direction]);

    return html`
        <div class="map-wind-overlay" aria-hidden="true">
            ${scope.style}
            <canvas ref=${canvasRef}></canvas>
        </div>
    `;
}
