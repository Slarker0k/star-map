// Deterministic PRNG utilities

export function mulberry32(seed: number) {
    let t = seed >>> 0;
    return function () {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function mixSeed(...parts: number[]) {
    // Simple hash mix for seeds
    let h = 0x9e3779b9;
    for (const p of parts) {
        let x = (p | 0) ^ (h >>> 16);
        x = Math.imul(x, 0x45d9f3b);
        x ^= x >>> 16;
        x = Math.imul(x, 0x45d9f3b);
        x ^= x >>> 16;
        h ^= x + 0x7feb352d + (h << 6) + (h >>> 2);
    }
    return h >>> 0;
}
