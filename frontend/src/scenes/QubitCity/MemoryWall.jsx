import { Text, Edges } from "@react-three/drei";
import { useCircuitStore } from "../../store/circuitStore";
import { ACTS, ACT_HUE } from "../../content/timeline";
import { GEO, MAT } from "./gateAssets";

// Six glass act-panels arcing behind the QuantumCore. Click → journey at that act.
export default function MemoryWall() {
  const quality = useCircuitStore((s) => s.quality);
  if (quality === "lite") return null;

  return (
    <group>
      {ACTS.map((a, i) => {
        const ang = Math.PI + (-0.55 + (i / (ACTS.length - 1)) * 1.1);
        const x = Math.sin(ang) * 8.5;
        const z = Math.cos(ang) * 8.5;
        const hue = ACT_HUE[a.id];
        return (
          <group
            key={a.id}
            position={[x, 3.2 + (i % 2) * 0.55, z]}
            rotation-y={ang + Math.PI}
            onClick={(e) => {
              e.stopPropagation();
              useCircuitStore.getState().journeyToAct(a.id);
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <mesh geometry={GEO.tile} material={MAT.glassTile} scale={[3.2, 2, 1]}>
              <Edges color={hue} />
            </mesh>
            <Text position={[0, 0.22, 0.02]} fontSize={0.17} maxWidth={2.3} textAlign="center" color="#f3f8ff" anchorX="center">
              {a.title.toUpperCase()}
            </Text>
            <Text position={[0, -0.35, 0.02]} fontSize={0.13} color={hue} anchorX="center">
              {a.range}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
