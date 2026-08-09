import { Text } from "@react-three/drei";
import { useCircuitStore } from "../../store/circuitStore";
import { COLORS, TRACKS } from "./cityConfig";

// live store subscription: rails track the builder's qubit count in real time
export default function WireTracks({ position = [0, 0.15, TRACKS.z] }) {
  const numQubits = useCircuitStore((s) => s.numQubits);
  const depth = numQubits * TRACKS.spacing + 1;

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[TRACKS.platformW, 0.3, depth]} />
        <meshStandardMaterial color={COLORS.base} roughness={0.9} metalness={0.1} />
      </mesh>
      {Array.from({ length: numQubits }, (_, i) => {
        const z = (i - (numQubits - 1) / 2) * TRACKS.spacing;
        return (
          <group key={i} position={[0, 0.18, z]}>
            <mesh>
              <boxGeometry args={[TRACKS.railLen, 0.06, 0.06]} />
              <meshStandardMaterial color="#000000" emissive={COLORS.cyan} emissiveIntensity={3} fog={false} />
            </mesh>
            <Text position={[-TRACKS.railLen / 2 - 0.3, 0.3, 0]} fontSize={0.35} color={COLORS.cyan} anchorX="right">
              {`|q${i}⟩`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
