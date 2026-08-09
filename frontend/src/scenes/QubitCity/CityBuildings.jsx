import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CITY, COLORS, SEED, mulberry32 } from "./cityConfig";

// instanceColor tints diffuse only; patch the emissive term so each strip glows in its own color
const emissivePatch = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <emissivemap_fragment>",
    `#include <emissivemap_fragment>
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	totalEmissiveRadiance *= vColor;
#endif`
  );
};

export default function CityBuildings() {
  const boxRef = useRef();
  const stripRef = useRef();

  const { buildings, strips } = useMemo(() => {
    const rng = mulberry32(SEED);
    const { gridCells, cellSize, clearingRadius, count, size, height, neonFraction, neonPinkWeight } = CITY;
    const center = (gridCells - 1) / 2;

    const cells = [];
    for (let i = 0; i < gridCells; i++)
      for (let j = 0; j < gridCells; j++)
        if (Math.hypot(i - center, j - center) > clearingRadius) cells.push([i, j]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const buildings = [];
    const strips = [];
    for (let n = 0; n < count; n++) {
      const [ci, cj] = cells[n % cells.length];
      const w = size.min + rng() * size.span;
      const d = size.min + rng() * size.span;
      const h = height.min + rng() * height.span;
      const x = (ci - center) * cellSize + (rng() - 0.5) * 1.2;
      const z = (cj - center) * cellSize + (rng() - 0.5) * 1.2;
      const rot = (rng() - 0.5) * 0.24;
      buildings.push({ x, z, w, d, h, rot });

      if (rng() < neonFraction) {
        const sx = rng() < 0.5 ? -1 : 1;
        const sz = rng() < 0.5 ? -1 : 1;
        const r = rng();
        const color = r < neonPinkWeight ? COLORS.pink : r < 0.55 ? COLORS.cyan : COLORS.purple;
        // corner of the (Y-rotated) building, in world space
        const lx = sx * (w / 2);
        const lz = sz * (d / 2);
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        strips.push({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos, y: h * 0.35, sh: h * 0.7, rot, color });
      }
    }
    return { buildings, strips };
  }, []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    buildings.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      boxRef.current.setMatrixAt(i, dummy.matrix);
    });
    boxRef.current.instanceMatrix.needsUpdate = true;
    boxRef.current.computeBoundingSphere();

    const color = new THREE.Color();
    strips.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.set(0.08, s.sh, 0.08);
      dummy.updateMatrix();
      stripRef.current.setMatrixAt(i, dummy.matrix);
      stripRef.current.setColorAt(i, color.set(s.color));
    });
    stripRef.current.instanceMatrix.needsUpdate = true;
    stripRef.current.instanceColor.needsUpdate = true;
    stripRef.current.computeBoundingSphere();
  }, [buildings, strips]);

  return (
    <group>
      <instancedMesh ref={boxRef} args={[null, null, buildings.length]} frustumCulled>
        <boxGeometry />
        <meshStandardMaterial color={COLORS.base} roughness={0.9} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={stripRef} args={[null, null, strips.length]} frustumCulled>
        <boxGeometry />
        {/* fog={false}: neon must pierce the murk and stay HDR-bright for bloom */}
        <meshStandardMaterial color="#000000" emissive="#ffffff" emissiveIntensity={3.5} fog={false} onBeforeCompile={emissivePatch} />
      </instancedMesh>
    </group>
  );
}
