import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useCircuitStore } from "../../store/circuitStore";
import { formatTheta } from "../../components/CircuitGrid";
import { GEO, MAT, GATE_STYLE, SLOT_X0, SLOT_DX, GATE_Y, zOfRail } from "./gateAssets";
import { spawnFx } from "./FxPool";
import { clockRef } from "../clock";

const LABEL = "#e6f1ff";

// One placed op. Geometries are shared; the ONE family material is cloned per gate
// (bounded ≤64) so Eigen's referenced-gate pulse can drive per-gate emissive.
export default function GateMesh({ op, index, numQubits }) {
  const style = GATE_STYLE[op.name];
  const mat = useMemo(() => style.mat.clone(), [style]);
  useEffect(() => () => mat.dispose(), [mat]);

  const group = useRef();
  const born = useRef(-1);
  const refGates = useCircuitStore((s) => s.eigen.referencedGates);
  const refAt = useCircuitStore((s) => s.eigen.referencedAt);

  const x = SLOT_X0 + op.col * SLOT_DX;
  const zs = op.cells.map((c) => zOfRail(c.q, numQubits));
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  const zMid = (zMin + zMax) / 2;
  const phase = (op.opId % 7) * 0.9;

  useEffect(() => {
    // placement FX comes from the shared pool (BuilderRig group sits at z=10)
    spawnFx(x, 0.2, 10 + zMid, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const t = clockRef.t;
    if (born.current < 0) born.current = t;
    group.current.position.y = GATE_Y + Math.sin(t * 1.2 + phase) * 0.02;
    group.current.rotation.z = Math.sin(t * 0.9 + phase) * 0.035;
    const hot = refGates.includes(index) && Date.now() - refAt < 4000;
    const target = hot ? 4.25 + Math.sin(t * 4) * 1.25 : 3;
    mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, target, 8, dt);
  });

  const click = (e) => {
    e.stopPropagation();
    useCircuitStore.getState().cellClick(op.cells[0].q, op.col);
  };
  const erase = (e) => {
    e.stopPropagation();
    useCircuitStore.getState().eraseAt(op.cells[0].q, op.col);
  };

  const controls = op.cells.filter((c) => c.role === "control");
  const targets = op.cells.filter((c) => c.role === "target");

  return (
    <group ref={group} position={[x, GATE_Y, 0]} onClick={click} onContextMenu={erase}>

      {style.kind === "box" && (
        <>
          <mesh geometry={GEO.singleBox} material={mat} position={[0, 0, zMid]} />
          <Text position={[0, 0, zMid + 0.36]} fontSize={0.3} color={LABEL} anchorX="center" anchorY="middle">
            {style.label}
          </Text>
        </>
      )}

      {style.kind === "torus" && (
        <>
          <mesh geometry={GEO.rotTorus} material={mat} position={[0, 0, zMid]} />
          <Text position={[0, 0, zMid + 0.14]} fontSize={0.22} color={LABEL} anchorX="center" anchorY="middle">
            {style.label}
          </Text>
          <Text position={[0, -0.56, zMid + 0.1]} fontSize={0.16} color="#ff2d95" anchorX="center" anchorY="middle">
            {formatTheta(op.params[0])}
          </Text>
        </>
      )}

      {style.kind === "multi" && (
        <>
          {zMax > zMin && (
            <mesh geometry={GEO.beam} material={MAT.beam} rotation-x={Math.PI / 2} position={[0, 0, zMid]} scale={[1, zMax - zMin, 1]} />
          )}
          {op.name !== "swap" &&
            controls.map((c) => (
              <mesh key={c.q} geometry={GEO.ctrlSphere} material={mat} position={[0, 0, zOfRail(c.q, numQubits)]} />
            ))}
          {(op.name === "cx" || op.name === "ccx") &&
            targets.map((c) => {
              const z = zOfRail(c.q, numQubits);
              return (
                <group key={c.q} position={[0, 0, z]}>
                  <mesh geometry={GEO.targetRing} material={mat} />
                  <mesh geometry={GEO.crossBar} material={mat} />
                  <mesh geometry={GEO.crossBar} material={mat} rotation-z={Math.PI / 2} />
                </group>
              );
            })}
          {op.name === "cz" &&
            targets.map((c) => (
              <group key={c.q} position={[0, 0, zOfRail(c.q, numQubits)]}>
                <mesh geometry={GEO.ctrlSphere} material={mat} />
                <Text position={[0, 0.34, 0]} fontSize={0.2} color={LABEL} anchorX="center" anchorY="middle">
                  Z
                </Text>
              </group>
            ))}
          {op.name === "swap" &&
            op.cells.map((c) => (
              <group key={c.q} position={[0, 0, zOfRail(c.q, numQubits)]}>
                <mesh geometry={GEO.crossBar} material={mat} rotation-z={Math.PI / 4} />
                <mesh geometry={GEO.crossBar} material={mat} rotation-z={-Math.PI / 4} />
              </group>
            ))}
        </>
      )}
    </group>
  );
}
