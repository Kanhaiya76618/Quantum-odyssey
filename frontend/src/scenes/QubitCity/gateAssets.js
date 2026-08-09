// Shared, module-level geometries/materials — created ONCE, reused by every gate instance.
import * as THREE from "three";

export const GEO = Object.freeze({
  singleBox: new THREE.BoxGeometry(0.7, 0.7, 0.7),
  rotTorus: new THREE.TorusGeometry(0.34, 0.08, 12, 32),
  ctrlSphere: new THREE.SphereGeometry(0.15, 16, 16),
  targetRing: new THREE.TorusGeometry(0.3, 0.05, 10, 28),
  crossBar: new THREE.CylinderGeometry(0.04, 0.04, 0.62),
  beam: new THREE.CylinderGeometry(0.03, 0.03, 1),
  slotBox: new THREE.BoxGeometry(0.85, 0.5, 0.85),
  tile: new THREE.PlaneGeometry(0.8, 0.8),
  ring: new THREE.TorusGeometry(0.55, 0.03, 8, 40),
  bar: new THREE.BoxGeometry(0.5, 1, 0.5),
});

const std = (color, emissive, intensity = 3) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.2,
    fog: false,
  });

export const MAT = Object.freeze({
  famCyan: std("#06222b", "#00e5ff"),
  famViolet: std("#150a2e", "#7c3aed"),
  famPink: std("#2b0618", "#ff2d95"),
  target: std("#06222b", "#00e5ff"),
  beam: std("#150a2e", "#7c3aed", 2.2),
  hitbox: new THREE.MeshBasicMaterial({ visible: false }),
  ghost: new THREE.MeshStandardMaterial({
    color: "#00e5ff", emissive: "#00e5ff", emissiveIntensity: 1.2,
    transparent: true, opacity: 0.35, depthWrite: false, fog: false,
  }),
  invalid: std("#2b0618", "#ff2d95", 4),
  glassTile: new THREE.MeshStandardMaterial({
    color: "#0d1224", transparent: true, opacity: 0.75,
    roughness: 0.3, metalness: 0.1, fog: false,
  }),
  glassFloor: new THREE.MeshStandardMaterial({
    color: "#0c1224", transparent: true, opacity: 0.35,
    roughness: 0.15, metalness: 0.3, fog: false,
  }),
  holoRing: new THREE.MeshBasicMaterial({
    color: "#00e5ff", transparent: true, opacity: 0.22, fog: false,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }),
  wireMuted: new THREE.MeshBasicMaterial({ color: "#8b9bb4", wireframe: true, transparent: true, opacity: 0.5, fog: false }),
  arrowCyan: std("#06222b", "#00e5ff", 2.5),
  arrowViolet: std("#150a2e", "#7c3aed", 2.5),
  barCyan: std("#06222b", "#00e5ff", 2.8),
});

// name → shape family + shared material + label
export const GATE_STYLE = Object.freeze({
  h: { kind: "box", mat: MAT.famCyan, label: "H" },
  s: { kind: "box", mat: MAT.famCyan, label: "S" },
  sdg: { kind: "box", mat: MAT.famCyan, label: "S†" },
  x: { kind: "box", mat: MAT.famViolet, label: "X" },
  y: { kind: "box", mat: MAT.famViolet, label: "Y" },
  z: { kind: "box", mat: MAT.famViolet, label: "Z" },
  t: { kind: "box", mat: MAT.famPink, label: "T" },
  tdg: { kind: "box", mat: MAT.famPink, label: "T†" },
  rx: { kind: "torus", mat: MAT.famCyan, label: "RX" },
  ry: { kind: "torus", mat: MAT.famCyan, label: "RY" },
  rz: { kind: "torus", mat: MAT.famCyan, label: "RZ" },
  p: { kind: "torus", mat: MAT.famCyan, label: "P" },
  cx: { kind: "multi", mat: MAT.famViolet, label: "CX" },
  cz: { kind: "multi", mat: MAT.famViolet, label: "CZ" },
  swap: { kind: "multi", mat: MAT.famPink, label: "SWAP" },
  ccx: { kind: "multi", mat: MAT.famViolet, label: "CCX" },
});

export const SLOT_X0 = -5.225;
export const SLOT_DX = 0.95;
export const GATE_Y = 0.71;
export const zOfRail = (q, n) => (q - (n - 1) / 2) * 1.2;
