import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useCircuitStore } from "../../store/circuitStore";
import { GEO, MAT } from "./gateAssets";

const SLOTS = 8;
const BAR_DX = 0.8;

// Holographic probability plaza. Bar heights chase targets with damp(λ=6).
export default function HoloHistogram() {
  const results = useCircuitStore((s) => s.results);
  const numQubits = useCircuitStore((s) => s.numQubits);
  const bars = useRef([]);
  const labels = useRef([]);
  const targets = useRef(new Array(SLOTS).fill(0.02));

  const mats = useMemo(() => Array.from({ length: SLOTS }, () => MAT.barCyan.clone()), []);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);

  const entries = useMemo(() => {
    if (!results) return [];
    return Object.entries(results.probabilities)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, SLOTS);
  }, [results]);

  useEffect(() => {
    for (let i = 0; i < SLOTS; i++) targets.current[i] = entries[i] ? entries[i][1] * 4 + 0.02 : 0.02;
  }, [entries]);

  useFrame((_, dt) => {
    let maxT = 0;
    for (let i = 0; i < SLOTS; i++) if (targets.current[i] > maxT) maxT = targets.current[i];
    for (let i = 0; i < SLOTS; i++) {
      const mesh = bars.current[i];
      if (!mesh) continue;
      const h = THREE.MathUtils.damp(mesh.scale.y, targets.current[i], 6, dt);
      mesh.scale.y = h;
      mesh.position.y = 0.2 + h / 2;
      const lbl = labels.current[i];
      if (lbl) lbl.position.y = 0.2 + h + 0.3;
      mats[i].emissiveIntensity = THREE.MathUtils.damp(
        mats[i].emissiveIntensity,
        targets.current[i] >= maxT - 1e-6 && targets.current[i] > 0.05 ? 3.6 : 2.8,
        6,
        dt
      );
    }
  });

  return (
    <group position={[0, 0, 15.5]}>
      <mesh position={[0, 0.1, 0]} material={MAT.glassFloor}>
        <boxGeometry args={[SLOTS * BAR_DX + 0.8, 0.2, 1.6]} />
      </mesh>
      <Text position={[-(SLOTS * BAR_DX) / 2 - 0.1, 0.32, 0.9]} fontSize={0.18} color="#8ea2c6" anchorX="left">
        {`q${numQubits - 1}…q0`}
      </Text>
      {Array.from({ length: SLOTS }, (_, i) => {
        const x = (i - (SLOTS - 1) / 2) * BAR_DX;
        const e = entries[i];
        return (
          <group key={i}>
            <mesh ref={(m) => (bars.current[i] = m)} geometry={GEO.bar} material={mats[i]} position={[x, 0.21, 0]} scale={[1, 0.02, 1]} />
            <group ref={(g) => (labels.current[i] = g)} position={[x, 0.5, 0]} visible={!!e}>
              <Text position={[0, 0.22, 0]} fontSize={0.22} color="#f3f8ff" anchorX="center">
                {e ? `${(e[1] * 100).toFixed(1)}%` : ""}
              </Text>
              <Text position={[0, -0.04, 0]} fontSize={0.2} color="#8ea2c6" anchorX="center">
                {e ? `|${e[0]}⟩` : ""}
              </Text>
            </group>
          </group>
        );
      })}
    </group>
  );
}
