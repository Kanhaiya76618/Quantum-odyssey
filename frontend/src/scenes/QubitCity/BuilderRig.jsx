import { useMemo } from "react";
import { useCircuitStore, NUM_COLS } from "../../store/circuitStore";
import WireTracks from "./WireTracks";
import SlotGrid from "./SlotGrid";
import GateMesh from "./GateMesh";
import BlochPods from "./BlochPods";
import FloorHolo from "./FloorHolo";
import { MAT } from "./gateAssets";

// grid -> one entry per placed op (column-major, min-qubit-first = serialize order)
function collectOps(grid, numQubits) {
  const ops = [];
  for (let col = 0; col < NUM_COLS; col++) {
    const seen = new Set();
    for (let q = 0; q < numQubits; q++) {
      const cell = grid[q][col];
      if (!cell || seen.has(cell.opId)) continue;
      seen.add(cell.opId);
      const cells = [];
      let params = [];
      for (let r = 0; r < numQubits; r++) {
        const c = grid[r][col];
        if (!c || c.opId !== cell.opId) continue;
        cells.push({ q: r, role: c.role });
        if (c.params) params = c.params;
      }
      ops.push({ opId: cell.opId, name: cell.name, col, cells, params });
    }
  }
  return ops;
}

export default function BuilderRig() {
  const grid = useCircuitStore((s) => s.grid);
  const numQubits = useCircuitStore((s) => s.numQubits);
  const ops = useMemo(() => collectOps(grid, numQubits), [grid, numQubits]);
  const opIndex = useMemo(() => useCircuitStore.getState().opIndexByOpId(), [grid, numQubits]);

  return (
    <group position={[0, 0, 10]}>
      <WireTracks position={[0, 0.15, 0]} />

      {/* floor: glass sheet + ONE merged holo shader plane (traces/hex/waves/nodes) */}
      <mesh position={[0, -0.06, 0]} material={MAT.glassFloor}>
        <cylinderGeometry args={[9, 9, 0.08, 48]} />
      </mesh>
      <FloorHolo />

      <SlotGrid />
      {ops.map((op) => (
        <GateMesh key={op.opId} op={op} index={opIndex[op.opId]} numQubits={numQubits} />
      ))}
      <BlochPods />
    </group>
  );
}
