import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial, Text } from "@react-three/drei";
import { useCircuitStore } from "../store/circuitStore";
import { clockRef } from "../scenes/clock";

const PortalDiscMaterial = shaderMaterial(
  { uTime: 0, uA: new THREE.Color("#00e5ff"), uB: new THREE.Color("#7c3aed") },
  /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  /* glsl */ `
  uniform float uTime; uniform vec3 uA, uB; varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float s = smoothstep(0.25, 0.75, 0.5 + 0.5 * sin(ang * 6.0 + r * 7.0 - uTime * 1.4));
    vec3 col = mix(uA, uB, r);
    float alpha = s * smoothstep(1.0, 0.75, r);
    gl_FragColor = vec4(col * 1.5, alpha);
  }`
);
extend({ PortalDiscMaterial });

// ONE shared disc material for every portal (additive budget)
const discMat = new PortalDiscMaterial();
discMat.transparent = true;
discMat.blending = THREE.AdditiveBlending;
discMat.depthWrite = false;

export default function Portal({ to, label, position, ringColor = "#ff2d95" }) {
  const group = useRef();
  const ring = useRef();
  const [hover, setHover] = useState(false);
  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0f1e",
        emissive: ringColor,
        emissiveIntensity: 3.2,
        roughness: 0.35,
        metalness: 0.2,
        fog: false,
      }),
    [ringColor]
  );

  useFrame((_, dt) => {
    const t = clockRef.t;
    discMat.uTime = t;
    group.current.position.y = position[1] + Math.sin(t * 0.9 + position[0]) * 0.2;
    ring.current.rotation.z += 0.25 * dt;
    ringMat.emissiveIntensity = THREE.MathUtils.damp(ringMat.emissiveIntensity, hover ? 4.5 : 3.2, 8, dt);
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        useCircuitStore.getState().travelTo(to);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      <mesh ref={ring} material={ringMat}>
        <torusGeometry args={[1.6, 0.12, 14, 48]} />
      </mesh>
      <mesh material={discMat}>
        <circleGeometry args={[1.45, 48]} />
      </mesh>
      <Text position={[0, 2.35, 0]} fontSize={0.42} color="#e6f1ff" anchorX="center">
        {label}
      </Text>
    </group>
  );
}
