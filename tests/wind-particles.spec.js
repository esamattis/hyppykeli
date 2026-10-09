import { expect, test } from "@playwright/test";
import { WindParticleField } from "#app/map/windParticles.js";

function seededRandom() {
    let seed = 12345;
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
}

test("particles reserve distinct slots with individual lifetimes and staggered ages", () => {
    const field = new WindParticleField(seededRandom());
    field.resize(800, 500);
    const count = field.particles.length;
    expect(count).toBeGreaterThan(0);
    expect(new Set(field.particles.map((p) => p.slot)).size).toBe(count);
    expect(new Set(field.particles.map((p) => p.lifetime)).size).toBe(count);
    expect(new Set(field.particles.map((p) => p.age)).size).toBe(count);
    expect(field.availableSlots.length + count).toBe(
        field.columns * field.rows,
    );
});

test("expired particles choose a fresh lifetime and wait a random interval before reappearing", () => {
    const field = new WindParticleField(seededRandom());
    field.resize(800, 500);
    const particle = field.particles[0];
    const lifetime = particle.lifetime;
    const anchor = [particle.anchorX, particle.anchorY];
    particle.age = lifetime - 0.01;
    field.update(0.02, 0, 0);
    expect(particle.lifetime).not.toBe(lifetime);
    expect([particle.anchorX, particle.anchorY]).not.toEqual(anchor);
    expect(particle.age).toBeLessThan(0);
    field.update(-particle.age + 0.01, 0, 0);
    expect(particle.age).toBeCloseTo(0.01);
});

test("slow and fast winds retain the same particle population and lifecycle timing", () => {
    const slow = new WindParticleField(seededRandom());
    const fast = new WindParticleField(seededRandom());
    slow.resize(800, 500);
    fast.resize(800, 500);
    const count = slow.particles.length;
    for (let frame = 0; frame < 1200; frame++) {
        slow.update(0.05, 0.015, -0.015);
        fast.update(0.05, 15, -15);
        for (const field of [slow, fast]) {
            expect(field.particles).toHaveLength(count);
            expect(new Set(field.particles.map((p) => p.slot)).size).toBe(
                count,
            );
            expect(field.availableSlots.length + count).toBe(
                field.columns * field.rows,
            );
            expect(
                field.particles.every(
                    (particle) =>
                        particle.x >= 0 &&
                        particle.x < field.width &&
                        particle.y >= 0 &&
                        particle.y < field.height,
                ),
            ).toBe(true);
        }
        expect(slow.particles.map((p) => [p.age, p.lifetime, p.slot])).toEqual(
            fast.particles.map((p) => [p.age, p.lifetime, p.slot]),
        );
    }
});

test("resizing reallocates slots without restarting existing particle lifetimes", () => {
    const field = new WindParticleField(seededRandom());
    field.resize(800, 500);
    field.update(1, 3, 4);
    const existing = field.particles.map((p) => [p.age, p.lifetime]);
    field.resize(1000, 600);
    expect(
        field.particles
            .slice(0, existing.length)
            .map((p) => [p.age, p.lifetime]),
    ).toEqual(existing);
    expect(new Set(field.particles.map((p) => p.slot)).size).toBe(
        field.particles.length,
    );
    field.resize(0, 0);
    expect(field.particles).toEqual([]);
    field.resize(400, 300);
    expect(field.particles.length).toBeGreaterThan(0);
});
