import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import { COLORS, PARTICLES, SEED, mulberry32 } from "./cityConfig";
import { useCircuitStore } from "../../store/circuitStore";

const TIER_SCALE = { cinema: 1, balanced: 0.6, lite: 0.4 };

export default function Particles() {
  const attrRef = useRef();
  const quality = useCircuitStore((s) => s.quality);
  const count = Math.round(PARTICLES.count * (TIER_SCALE[quality] || 0.6));

  const positions = useMemo(() => {
    const rng = mulberry32(SEED + 1);
    const [bx, by, bz] = PARTICLES.box;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rng() - 0.5) * bx;
      arr[i * 3 + 1] = rng() * by;
      arr[i * 3 + 2] = (rng() - 0.5) * bz;
    }
    return arr;
  }, [count]);

  useFrame(() => {
    const attr = attrRef.current;
    if (!attr) return;
    const arr = attr.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] += PARTICLES.riseSpeed;
      if (arr[i] > PARTICLES.box[1]) arr[i] = 0;
    }
    attr.needsUpdate = true;
  });

  return (
    <points key={count}>
      <bufferGeometry>
        <bufferAttribute ref={attrRef} attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLES.size}
        sizeAttenuation
        color={COLORS.particle}
        transparent
        opacity={PARTICLES.opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}
