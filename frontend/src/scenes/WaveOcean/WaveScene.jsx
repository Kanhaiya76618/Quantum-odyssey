import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import Portal from "../../components/Portal";
import { useCircuitStore } from "../../store/circuitStore";
import { clockRef } from "../clock";
import { waveParams } from "./waveState";

const OceanMaterial = shaderMaterial(
  { uTime: 0 },
  /* glsl */ `
  uniform float uTime;
  varying float vElev;
  varying vec3 vN;
  varying vec3 vWp;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 p = position.xy;
    float e =
      0.38 * sin(dot(p, vec2(1.0, 0.3)) * 0.25 + uTime * 0.7) +
      0.22 * sin(dot(p, vec2(-0.6, 1.0)) * 0.4 + uTime * 1.1) +
      0.12 * sin(dot(p, vec2(0.8, -0.7)) * 0.7 + uTime * 1.7) +
      0.03 * (hash(floor(p * 2.0)) - 0.5);
    // analytic normal from the three cos derivatives
    float dx =
      0.38 * 0.25 * 1.0 * cos(dot(p, vec2(1.0, 0.3)) * 0.25 + uTime * 0.7) +
      0.22 * 0.4 * -0.6 * cos(dot(p, vec2(-0.6, 1.0)) * 0.4 + uTime * 1.1) +
      0.12 * 0.7 * 0.8 * cos(dot(p, vec2(0.8, -0.7)) * 0.7 + uTime * 1.7);
    float dy =
      0.38 * 0.25 * 0.3 * cos(dot(p, vec2(1.0, 0.3)) * 0.25 + uTime * 0.7) +
      0.22 * 0.4 * 1.0 * cos(dot(p, vec2(-0.6, 1.0)) * 0.4 + uTime * 1.1) +
      0.12 * 0.7 * -0.7 * cos(dot(p, vec2(0.8, -0.7)) * 0.7 + uTime * 1.7);
    vElev = e;
    vec3 pos = vec3(position.x, position.y, e);
    vN = normalize(normalMatrix * normalize(vec3(-dx, -dy, 1.0)));
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWp = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`,
  /* glsl */ `
  uniform float uTime;
  varying float vElev;
  varying vec3 vN;
  varying vec3 vWp;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec3 deep = vec3(0.02, 0.157, 0.243);
    vec3 crest = vec3(0.0, 0.898, 1.0);
    vec3 col = mix(deep, crest, smoothstep(-0.1, 0.5, vElev));
    vec3 V = normalize(cameraPosition - vWp);
    float fres = pow(1.0 - max(dot(vN, V), 0.0), 3.0);
    col += crest * fres * 0.6;
    if (hash(floor(vWp.xz * 40.0) + floor(uTime * 3.0)) > 0.997) col += crest * 2.0;
    gl_FragColor = vec4(col, 1.0);
  }`
);
extend({ OceanMaterial });

const SlitScreenMaterial = shaderMaterial(
  { uTime: 0, uD: 1.5, uLambda: 0.7 },
  /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  /* glsl */ `
  uniform float uTime, uD, uLambda;
  varying vec2 vUv;
  float sinc(float u) { return abs(u) < 1e-4 ? 1.0 : sin(u) / u; }
  void main() {
    float L = 10.0;
    float x = (vUv.x - 0.5) * 16.0;
    float c = cos(3.14159265 * uD * x / (uLambda * L));
    float s = sinc(3.14159265 * 0.45 * x / (uLambda * L));
    float I = c * c * s * s;
    I *= 0.92 + 0.08 * sin(uTime * 2.0 + x * 3.0);
    vec3 col = mix(vec3(0.008, 0.075, 0.122), vec3(0.0, 0.898, 1.0), I);
    col += vec3(0.0, 0.898, 1.0) * smoothstep(0.85, 1.0, I) * 1.6;
    gl_FragColor = vec4(col, 1.0);
  }`
);
extend({ SlitScreenMaterial });

const RING_MAT = new THREE.MeshBasicMaterial({
  color: "#00e5ff",
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
});

export default function WaveScene() {
  const ocean = useRef();
  const screen = useRef();
  const emitterTip = useRef();
  const barrierL = useRef();
  const barrierC = useRef();
  const barrierR = useRef();
  const rings = useRef([]);
  const setScripted = useCircuitStore((s) => s.setScriptedNarration);

  const tipMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#06222b", emissive: "#00e5ff", emissiveIntensity: 3, roughness: 0.35, metalness: 0.2, fog: false,
      }),
    []
  );
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0a1826", roughness: 0.7, metalness: 0.2 }),
    []
  );
  const stripMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#06222b", emissive: "#00e5ff", emissiveIntensity: 2.4, roughness: 0.35, metalness: 0.2, fog: false,
      }),
    []
  );

  useEffect(() => {
    setScripted("One wave, released again and again, meets itself beyond the slits — and writes interference on the far screen.");
  }, [setScripted]);

  useFrame((_, dt) => {
    const t = clockRef.t;
    const { d, lambda } = waveParams;
    if (ocean.current) ocean.current.uTime = t;
    if (screen.current) {
      screen.current.uTime = t;
      screen.current.uD = THREE.MathUtils.damp(screen.current.uD, d, 6, dt);
      screen.current.uLambda = THREE.MathUtils.damp(screen.current.uLambda, lambda, 6, dt);
    }
    tipMat.emissiveIntensity = 3 + Math.sin((t * 3) / lambda) * 1;
    // barrier boxes derive from slit separation: gaps (.45 wide) at ±d/2
    const halfGap = 0.225;
    const innerHalf = Math.max(d / 2 - halfGap, 0.05);
    const outerStart = d / 2 + halfGap;
    if (barrierC.current) {
      barrierC.current.scale.x = THREE.MathUtils.damp(barrierC.current.scale.x, innerHalf * 2, 6, dt);
    }
    if (barrierL.current) {
      const w = 8 - outerStart;
      barrierL.current.scale.x = THREE.MathUtils.damp(barrierL.current.scale.x, w, 6, dt);
      barrierL.current.position.x = THREE.MathUtils.damp(barrierL.current.position.x, -(outerStart + w / 2), 6, dt);
    }
    if (barrierR.current) {
      const w = 8 - outerStart;
      barrierR.current.scale.x = THREE.MathUtils.damp(barrierR.current.scale.x, w, 6, dt);
      barrierR.current.position.x = THREE.MathUtils.damp(barrierR.current.position.x, outerStart + w / 2, 6, dt);
    }
    // ghost wavefronts expanding from the emitter, speed ∝ 1/λ
    for (let i = 0; i < rings.current.length; i++) {
      const m = rings.current[i];
      if (!m) continue;
      const phase = ((t * 0.55) / lambda + i / 6) % 1;
      m.scale.setScalar(0.4 + phase * 13);
      m.visible = phase < 0.96;
    }
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -8]}>
        <planeGeometry args={[160, 160, 128, 128]} />
        <oceanMaterial ref={ocean} />
      </mesh>

      {/* emitter pylon */}
      <group position={[0, 0, -8]}>
        <mesh position={[0, 1.2, 0]} material={wallMat}>
          <boxGeometry args={[0.3, 2.4, 0.3]} />
        </mesh>
        <mesh ref={emitterTip} position={[0, 2.6, 0]} material={tipMat}>
          <sphereGeometry args={[0.32, 16, 16]} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} ref={(m) => (rings.current[i] = m)} rotation-x={-Math.PI / 2} position={[0, 0.25, 0]} material={RING_MAT}>
            <torusGeometry args={[1, 0.02, 8, 48]} />
          </mesh>
        ))}
      </group>

      {/* double-slit barrier at z=-16 (unit-width boxes scaled in x) */}
      <group position={[0, 1.5, -16]}>
        <mesh ref={barrierL} material={wallMat}>
          <boxGeometry args={[1, 3, 0.4]} />
        </mesh>
        <mesh ref={barrierC} material={wallMat}>
          <boxGeometry args={[1, 3, 0.4]} />
        </mesh>
        <mesh ref={barrierR} material={wallMat}>
          <boxGeometry args={[1, 3, 0.4]} />
        </mesh>
        <mesh position={[0, 1.55, 0]} material={stripMat}>
          <boxGeometry args={[16, 0.08, 0.42]} />
        </mesh>
      </group>

      {/* detection screen */}
      <mesh position={[0, 2.25, -26]}>
        <planeGeometry args={[16, 4.5]} />
        <slitScreenMaterial ref={screen} />
      </mesh>

      <Portal to="city" label="RETURN TO THE CITY" position={[-10, 2.2, 4]} ringColor="#00e5ff" />
    </group>
  );
}
