import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCircuitStore } from "../../store/circuitStore";
import { GEO, MAT, zOfRail } from "./gateAssets";

const UP = new THREE.Vector3(0, 1, 0);

function Pod({ index, numQubits }) {
  const arrow = useRef();
  const shaft = useRef();
  const tip = useRef();
  const tq = useMemo(() => new THREE.Quaternion(), []);
  const tv = useMemo(() => new THREE.Vector3(), []);
  const bloch = useCircuitStore((s) => (s.results ? s.results.bloch[index] : null));

  useFrame((_, dt) => {
    let mixed = true;
    if (bloch) {
      // backend bloch z (|0⟩ axis) maps to three's Y-up
      tv.set(bloch.x, bloch.z, bloch.y);
      const len = tv.length();
      mixed = len < 0.05;
      if (!mixed) {
        tv.normalize();
        tq.setFromUnitVectors(UP, tv);
      } else tq.identity();
    } else tq.identity();
    arrow.current.quaternion.slerp(tq, Math.min(1, 6 * dt));
    const m = mixed && bloch ? MAT.arrowViolet : MAT.arrowCyan;
    if (shaft.current.material !== m) {
      shaft.current.material = m;
      tip.current.material = m;
    }
  });

  return (
    <group position={[-6.4, 0.85, zOfRail(index, numQubits)]}>
      <mesh material={MAT.wireMuted}>
        <sphereGeometry args={[0.32, 12, 10]} />
      </mesh>
      <mesh material={MAT.wireMuted} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.32, 0.008, 6, 32]} />
      </mesh>
      <group ref={arrow}>
        <mesh ref={shaft} position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3]} />
        </mesh>
        <mesh ref={tip} position={[0, 0.33, 0]}>
          <coneGeometry args={[0.07, 0.12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

export default function BlochPods() {
  const numQubits = useCircuitStore((s) => s.numQubits);
  return (
    <group>
      {Array.from({ length: numQubits }, (_, i) => (
        <Pod key={i} index={i} numQubits={numQubits} />
      ))}
    </group>
  );
}
