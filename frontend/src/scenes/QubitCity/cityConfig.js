// cityConfig.js — every tunable for the Qubit City scene + deterministic RNG
export const SEED = 42;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COLORS = {
  bg: "#050510",
  base: "#0a0f1e",
  ground: "#04040c",
  ambient: "#1b1e3a",
  dirLight: "#4455ff",
  cyan: "#00e5ff",
  purple: "#7c3aed",
  pink: "#ff2d95",
  particle: "#66f0ff",
  gridCell: "#123",
};

export const FOG_DENSITY = 0.045;

export const CITY = {
  count: 500,
  gridCells: 24,
  cellSize: 4,
  clearingRadius: 5, // in cells
  size: { min: 1.2, span: 1.4 }, // width/depth = min + rng * span
  height: { min: 2, span: 16 },
  neonFraction: 0.35,
  neonPinkWeight: 0.1,
};

export const PARTICLES = { count: 1500, box: [120, 40, 120], size: 0.12, opacity: 0.5, riseSpeed: 0.008 };

export const CORE = { outerR: 2.2, innerR: 1.4, torusR: 3.6, torusTube: 0.06, floatY: 5 };

export const TRACKS = { railLen: 12, platformW: 14, spacing: 1.2, z: 10 };

export const INTRO = { from: [70, 45, 70], to: [26, 16, 26], duration: 3 };
