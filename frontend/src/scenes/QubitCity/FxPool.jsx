import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { GEO, MAT } from "./gateAssets";
import { clockRef } from "../clock";

// ONE pooled FX system: 12 pre-allocated ring quads, recycled, shared material.
// Fade is faked by scale (shared additive material stays untouched) — zero clones.
const POOL_SIZE = 12;
const slots = Array.from({ length: POOL_SIZE }, () => ({ start: -1, base: 1, mesh: null }));
let cursor = 0;
let reducedFx = false;
export const setReducedFx = (v) => (reducedFx = v);

export function spawnFx(x, y, z, scale = 1) {
  const s = slots[cursor];
  cursor = (cursor + 1) % POOL_SIZE;
  s.start = clockRef.t;
  s.base = scale;
  if (s.mesh) s.mesh.position.set(x, y, z);
}

export default function FxPool() {
  const group = useRef();
  const items = useMemo(() => slots, []);

  useFrame(() => {
    const t = clockRef.t;
    for (let i = 0; i < POOL_SIZE; i++) {
      const s = items[i];
      const m = s.mesh;
      if (!m) continue;
      const age = s.start < 0 ? 1 : t - s.start;
      if (age < 0.4) {
        m.visible = true;
        // reduced motion: final frame only
        const k = reducedFx ? 1 : age / 0.4;
        m.scale.setScalar(s.base * (0.2 + k * 1.3));
      } else m.visible = false;
    }
  });

  return (
    <group ref={group}>
      {items.map((s, i) => (
        <mesh
          key={i}
          ref={(m) => (s.mesh = m)}
          geometry={GEO.ring}
          material={MAT.ghost}
          rotation-x={-Math.PI / 2}
          visible={false}
        />
      ))}
    </group>
  );
}
