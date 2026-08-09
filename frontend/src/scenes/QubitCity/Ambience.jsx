import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mulberry32, SEED, COLORS } from "./cityConfig";
import { useCircuitStore } from "../../store/circuitStore";
import { clockRef } from "../clock";

const CRYSTAL_COLORS = [COLORS.cyan, COLORS.purple, COLORS.pink];
// quality tiers: rivers/crystals/star-shell counts
const TIER = {
  cinema: { rivers: 3, crystals: 7, stars: true },
  balanced: { rivers: 2, crystals: 6, stars: true },
  lite: { rivers: 1, crystals: 3, stars: false },
};

// Deep-space dressing: distant star shell, floating data crystals,
// and probability "energy rivers" weaving under the platform.
export default function Ambience() {
  const shell = useRef();
  const crystals = useRef([]);
  const rivers = useRef();
  const tier = TIER[useCircuitStore((s) => s.quality)] || TIER.balanced;

  const starPositions = useMemo(() => {
    const rng = mulberry32(SEED + 2);
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 100 + rng() * 40;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 - 10;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  const crystalDefs = useMemo(() => {
    const rng = mulberry32(SEED + 3);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rng();
      return {
        pos: [Math.cos(a) * (26 + rng() * 12), 7 + rng() * 10, Math.sin(a) * (26 + rng() * 12)],
        kind: i % 3,
        color: CRYSTAL_COLORS[i % 3],
        speed: 0.08 + rng() * 0.12,
        bob: 0.6 + rng() * 0.8,
        phase: rng() * Math.PI * 2,
        scale: 1 + rng() * 1.4,
      };
    });
  }, []);

  const riverCurves = useMemo(() => {
    const rng = mulberry32(SEED + 4);
    return [COLORS.cyan, COLORS.purple, COLORS.pink].map((color, k) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = 12 + k * 2.5 + rng() * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, -3.5 - k * 1.2 + Math.sin(a * 2 + k) * 0.8, Math.sin(a) * r + 6));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      return { curve, color };
    });
  }, []);

  useFrame((_, dt) => {
    const t = clockRef.t;
    if (shell.current) shell.current.rotation.y += 0.004 * dt;
    rivers.current.rotation.y += 0.015 * dt;
    for (let i = 0; i < crystals.current.length; i++) {
      const c = crystals.current[i];
      if (!c) continue;
      const d = crystalDefs[i];
      c.rotation.y += d.speed * dt;
      c.rotation.x += d.speed * 0.6 * dt;
      c.position.y = d.pos[1] + Math.sin(t * 0.4 + d.phase) * d.bob;
    }
  });

  return (
    <group>
      {tier.stars && (
        <points ref={shell}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={800} array={starPositions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.35} color="#9fd8ff" transparent opacity={0.7} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </points>
      )}

      {crystalDefs.slice(0, tier.crystals).map((d, i) => (
        <mesh key={i} ref={(m) => (crystals.current[i] = m)} position={d.pos} scale={d.scale}>
          {d.kind === 0 ? <icosahedronGeometry args={[1.1, 0]} /> : d.kind === 1 ? <octahedronGeometry args={[1.1, 0]} /> : <dodecahedronGeometry args={[1, 0]} />}
          <meshBasicMaterial color={d.color} wireframe transparent opacity={0.35} fog={false} />
        </mesh>
      ))}

      <group ref={rivers}>
        {riverCurves.slice(0, tier.rivers).map(({ curve, color }, i) => (
          <mesh key={i}>
            <tubeGeometry args={[curve, 96, 0.12 - i * 0.02, 6, true]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
