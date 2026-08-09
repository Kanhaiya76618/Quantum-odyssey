import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Edges } from "@react-three/drei";
import { useCircuitStore } from "../../store/circuitStore";
import { GEO, MAT, GATE_STYLE } from "./gateAssets";

const NAMES = [...Object.keys(GATE_STYLE), "erase"];

function Tile({ name, x, y }) {
  const selected = useCircuitStore((s) => s.selectedGate === name);
  const setSelectedGate = useCircuitStore((s) => s.setSelectedGate);
  const [hover, setHover] = useState(false);
  const group = useRef();
  const isErase = name === "erase";
  const label = isErase ? "ERASE" : GATE_STYLE[name].label;
  const accent = isErase ? "#ff2d95" : "#00e5ff";

  useFrame((_, dt) => {
    const s = THREE.MathUtils.damp(group.current.scale.x, hover ? 1.12 : 1, 8, dt);
    group.current.scale.setScalar(s);
  });

  return (
    <group ref={group} position={[x, y, 0]}>
      <mesh
        geometry={GEO.tile}
        material={MAT.glassTile}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedGate(name);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <Edges color={accent} />
      </mesh>
      <Text position={[0, 0, 0.02]} fontSize={isErase ? 0.16 : 0.24} color={selected ? "#f3f8ff" : accent} anchorX="center" anchorY="middle">
        {label}
      </Text>
      {selected && <mesh geometry={GEO.ring} material={isErase ? MAT.invalid : MAT.famCyan} />}
    </group>
  );
}

// Holographic shelf, right of the platform, facing it.
export default function GatePalette3D() {
  return (
    <group position={[7.5, 1.6, 11.5]} rotation-y={-Math.PI / 2.4}>
      {NAMES.map((name, i) => (
        <Tile key={name} name={name} x={((i % 4) - 1.5) * 0.95} y={(2 - Math.floor(i / 4)) * 0.95} />
      ))}
      <Text position={[0, 2.85, 0]} fontSize={0.2} color="#8ea2c6" anchorX="center">
        GATE SHELF
      </Text>
    </group>
  );
}
