import { Grid } from "@react-three/drei";
import { COLORS } from "./cityConfig";

export default function NeonGrid() {
  return (
    <group>
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={4}
        cellColor={COLORS.gridCell}
        sectionColor={COLORS.cyan}
        fadeDistance={90}
        fadeStrength={2}
        position={[0, 0.01, 0]}
      />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color={COLORS.ground} />
      </mesh>
    </group>
  );
}
