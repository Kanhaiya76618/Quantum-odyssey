import { useRef } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { useCircuitStore } from "../../store/circuitStore";
import { clockRef } from "../clock";

// MERGE, DON'T STACK: circuit traces + hex hologram + probability waves +
// blinking nodes = terms of ONE frag shader on ONE plane.
const FloorHoloMaterial = shaderMaterial(
  {
    uTime: 0,
    uTraces: 0.35,
    uHex: 0.25,
    uWaves: 0.3,
    uNodes: 0.8,
    uColor: new THREE.Color("#00e5ff"),
  },
  /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  /* glsl */ `
  uniform float uTime, uTraces, uHex, uWaves, uNodes;
  uniform vec3 uColor;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.73))), p.x);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 18.0;
    float r = length(p);
    float fade = smoothstep(9.0, 5.5, r);

    // circuit traces: sparse grid lines that flicker per row/col
    vec2 g = fract(p * 0.55);
    float fx = step(0.965, g.x) * (0.4 + 0.6 * step(0.55, hash(vec2(floor(p.x * 0.55), 7.0) )));
    float fy = step(0.965, g.y) * (0.4 + 0.6 * step(0.55, hash(vec2(3.0, floor(p.y * 0.55)))));
    float traces = max(fx, fy);

    // hex hologram
    vec2 hp = p * 0.9;
    vec2 hid = floor(hp / vec2(1.5, 0.866));
    vec2 hl = mod(hp, vec2(1.5, 0.866)) - vec2(0.75, 0.433);
    float hex = smoothstep(0.62, 0.7, hexDist(hl)) * (0.5 + 0.5 * sin(uTime * 0.6 + hash(hid) * 6.28));

    // probability waves: expanding rings
    float waves = smoothstep(0.75, 1.0, sin(r * 2.2 - uTime * 1.4) * 0.5 + 0.5) * smoothstep(9.0, 2.0, r);

    // blinking nodes
    vec2 cell = floor(p * 0.8);
    float n = hash(cell);
    float nodes = step(0.93, n) * smoothstep(0.35, 0.0, length(fract(p * 0.8) - 0.5)) *
      (0.5 + 0.5 * sin(uTime * 3.0 + n * 40.0));

    float a = (traces * uTraces + hex * uHex + waves * uWaves + nodes * uNodes) * fade;
    gl_FragColor = vec4(uColor * 1.4, a);
  }`
);
extend({ FloorHoloMaterial });

export default function FloorHolo() {
  const mat = useRef();
  const quality = useCircuitStore((s) => s.quality);

  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    m.uTime = clockRef.t;
    // lite: single-term feel (waves+traces); balanced/cinema: all layers
    m.uHex = quality === "lite" ? 0 : 0.25;
    m.uNodes = quality === "lite" ? 0 : 0.8;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
      <planeGeometry args={[18, 18]} />
      <floorHoloMaterial ref={mat} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
