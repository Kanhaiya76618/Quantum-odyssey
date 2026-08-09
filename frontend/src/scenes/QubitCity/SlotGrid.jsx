import { useState } from "react";
import { useCircuitStore, NUM_COLS } from "../../store/circuitStore";
import { GEO, MAT, GATE_STYLE, SLOT_X0, SLOT_DX, GATE_Y, zOfRail } from "./gateAssets";

// Invisible hitboxes over every rail cell. Clicking dispatches the SAME
// store.cellClick the flat grid uses — placement/pending/erase come free.
export default function SlotGrid() {
  const numQubits = useCircuitStore((s) => s.numQubits);
  const grid = useCircuitStore((s) => s.grid);
  const selectedGate = useCircuitStore((s) => s.selectedGate);
  const pending = useCircuitStore((s) => s.pending);
  const shake = useCircuitStore((s) => s.shake);
  const cellClick = useCircuitStore((s) => s.cellClick);
  const builderFocus = useCircuitStore((s) => s.builderFocus);
  const setBuilderFocus = useCircuitStore((s) => s.setBuilderFocus);
  const [hover, setHover] = useState(null);

  const ghostGeo = (() => {
    if (selectedGate === "erase") return null;
    if (pending) return pending.roles[pending.cells.length] === "control" ? GEO.ctrlSphere : GEO.targetRing;
    const kind = GATE_STYLE[selectedGate]?.kind;
    return kind === "torus" ? GEO.rotTorus : kind === "multi" ? GEO.ctrlSphere : GEO.singleBox;
  })();

  const slots = [];
  for (let q = 0; q < numQubits; q++) {
    for (let col = 0; col < NUM_COLS; col++) {
      slots.push([q, col]);
    }
  }

  return (
    <group>
      {slots.map(([q, col]) => (
        <mesh
          key={`${q}-${col}`}
          geometry={GEO.slotBox}
          material={MAT.hitbox}
          position={[SLOT_X0 + col * SLOT_DX, GATE_Y, zOfRail(q, numQubits)]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover({ q, col });
            if (!builderFocus) setBuilderFocus(true);
          }}
          onPointerOut={() => setHover((h) => (h && h.q === q && h.col === col ? null : h))}
          onClick={(e) => {
            e.stopPropagation();
            cellClick(q, col);
          }}
        />
      ))}

      {hover && !grid[hover.q]?.[hover.col] && ghostGeo && (
        <mesh
          geometry={ghostGeo}
          material={MAT.ghost}
          position={[SLOT_X0 + hover.col * SLOT_DX, GATE_Y, zOfRail(hover.q, numQubits)]}
        />
      )}

      {shake && (
        <mesh
          geometry={GEO.ring}
          material={MAT.invalid}
          rotation-x={-Math.PI / 2}
          position={[SLOT_X0 + shake.col * SLOT_DX, GATE_Y - 0.28, zOfRail(shake.q, numQubits)]}
        />
      )}
    </group>
  );
}
