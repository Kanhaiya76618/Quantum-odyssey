import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCircuitStore } from "../../store/circuitStore";
import { COLORS, CORE } from "./cityConfig";
import { spawnFx } from "./FxPool";
import { clockRef } from "../clock";

// Core brightness follows circuit complexity; new results fire a decaying flash.
export default function QuantumCore() {
  const group = useRef();
  const outer = useRef();
  const inner = useRef();
  const torus = useRef();
  const ring2 = useRef();
  const orbit = useRef();
  const outerMat = useRef();
  const base = useRef(3);
  const flash = useRef(0);
  const results = useCircuitStore((s) => s.results);
  const runPulse = useCircuitStore((s) => s.runPulse);
  const gateCount = results ? results.gate_count : 0;

  // MEANING HIERARCHY: small pulse per /simulate; medium for user-pressed Run ▶;
  // the MASSIVE success sequence stays reserved for real-hardware/VQE results.
  useEffect(() => {
    if (results) flash.current = Math.max(flash.current, 0.9);
  }, [results]);
  useEffect(() => {
    if (runPulse > 0) {
      flash.current = 2.4;
      spawnFx(0, 0.4, 0, 3.2);
    }
  }, [runPulse]);

  const orbitPositions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * 5;
      arr[i * 3 + 1] = Math.sin(i * 7.31) * 0.5;
      arr[i * 3 + 2] = Math.sin(a) * 5;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    const t = clockRef.t;
    group.current.position.y = CORE.floatY + Math.sin(t * 0.8) * 0.3;
    outer.current.rotation.y += 0.15 * dt;
    inner.current.rotation.y -= 0.15 * dt;
    torus.current.rotation.z += 0.1 * dt;
    ring2.current.rotation.z -= 0.14 * dt;
    orbit.current.rotation.y += 0.12 * dt;
    base.current = THREE.MathUtils.damp(base.current, 2 + 1.6 * Math.min(gateCount / 24, 1), 3, dt);
    flash.current = THREE.MathUtils.damp(flash.current, 0, 2.5, dt);
    outerMat.current.emissiveIntensity = base.current + Math.sin(t * 1.5) + flash.current;
    const s = 1 + flash.current * 0.06;
    outer.current.scale.setScalar(s);
  });

  return (
    <group ref={group} position={[0, CORE.floatY, 0]}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[CORE.outerR, 1]} />
        <meshStandardMaterial ref={outerMat} wireframe color={COLORS.base} emissive={COLORS.cyan} emissiveIntensity={3} fog={false} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[CORE.innerR, 0]} />
        <meshStandardMaterial color={COLORS.base} emissive={COLORS.purple} emissiveIntensity={2} fog={false} />
      </mesh>
      <mesh ref={torus} rotation-x={Math.PI / 2}>
        <torusGeometry args={[CORE.torusR, CORE.torusTube, 12, 64]} />
        <meshStandardMaterial color={COLORS.base} emissive={COLORS.pink} emissiveIntensity={3} fog={false} />
      </mesh>
      <mesh ref={ring2} rotation-x={Math.PI / 2}>
        <torusGeometry args={[4.4, 0.04, 10, 64]} />
        <meshStandardMaterial color={COLORS.base} emissive={COLORS.purple} emissiveIntensity={2.4} fog={false} />
      </mesh>
      <points ref={orbit}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={120} array={orbitPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.08} color={COLORS.cyan} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </points>
    </group>
  );
}
