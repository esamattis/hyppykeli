// @ts-check

/** Wind-aligned spawn slots keep particles apart without distance checks. */
export class WindParticleField {
    /** @type {MapWindParticle[]} */
    particles = [];
    /** @type {number[]} */
    availableSlots = [];
    width = 0;
    height = 0;
    columns = 1;
    rows = 1;
    offsetX = 0;
    offsetY = 0;

    /** @param {() => number} [random] */
    constructor(random = Math.random) {
        this.random = random;
    }

    /** @param {number} width @param {number} height */
    resize(width, height) {
        const initialized = this.width > 0 && this.height > 0;
        this.width = width;
        this.height = height;
        const count = Math.floor(
            Math.min(160, Math.ceil((width * height) / 5000)) * 0.75,
        );
        if (width <= 0 || height <= 0 || count === 0) {
            this.particles = [];
            this.availableSlots = [];
            return;
        }
        // Spare slots let each new lifetime start in a different random place.
        this.columns = Math.max(
            1,
            Math.ceil(Math.sqrt((count * 2 * width) / height)),
        );
        this.rows = Math.max(1, Math.ceil((count * 2) / this.columns));
        this.availableSlots = Array.from(
            { length: this.columns * this.rows },
            (_, index) => index,
        );
        this.offsetX %= width;
        this.offsetY %= height;
        this.particles = this.particles.slice(0, count);
        for (const particle of this.particles) this.place(particle);
        while (this.particles.length < count) {
            const lifetime = this.nextLifetime();
            const particle = {
                x: 0,
                y: 0,
                anchorX: 0,
                anchorY: 0,
                slot: -1,
                lifetime,
                // Start with a full, staggered field. Later additions appear
                // independently rather than all fading in on the same frame.
                age: initialized
                    ? -this.random() * 0.6
                    : ((this.particles.length + this.random()) / count) *
                      lifetime,
            };
            this.place(particle);
            this.particles.push(particle);
        }
        this.update(0, 0, 0);
    }

    nextLifetime() {
        return 5 + this.random() * 3;
    }

    /** @param {MapWindParticle} particle */
    place(particle) {
        const index = Math.floor(this.random() * this.availableSlots.length);
        const slot = this.availableSlots[index];
        if (slot === undefined) throw new Error("No free wind particle slot");
        particle.slot = slot;
        this.availableSlots[index] = this.availableSlots.at(-1) ?? 0;
        this.availableSlots.pop();
        // Jitter stays in the middle of each cell, retaining a gap between
        // neighbouring slots, including neighbours across the wrapped edges.
        particle.anchorX =
            ((particle.slot % this.columns) + 0.3 + this.random() * 0.4) *
            (this.width / this.columns);
        particle.anchorY =
            (Math.floor(particle.slot / this.columns) +
                0.3 +
                this.random() * 0.4) *
            (this.height / this.rows);
    }

    /** @param {number} elapsed @param {number} travelX @param {number} travelY */
    update(elapsed, travelX, travelY) {
        if (this.width <= 0 || this.height <= 0) return;
        // Translate all slots together, preserving spacing at any wind speed.
        this.offsetX =
            (((this.offsetX + travelX) % this.width) + this.width) % this.width;
        this.offsetY =
            (((this.offsetY + travelY) % this.height) + this.height) %
            this.height;
        for (const particle of this.particles) {
            particle.age += elapsed;
            if (particle.age >= particle.lifetime) {
                this.availableSlots.push(particle.slot);
                this.place(particle);
                particle.lifetime = this.nextLifetime();
                particle.age = -(0.05 + this.random() * 0.35);
            }
            particle.x = (particle.anchorX + this.offsetX) % this.width;
            particle.y = (particle.anchorY + this.offsetY) % this.height;
        }
    }
}
