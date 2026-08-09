import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCircuitStore } from "../../store/circuitStore";
import { COLORS } from "./cityConfig";

// Eigen's hologram: nested wireframes + core + particle halo.
// speaking = store.eigen.loading || typing → core flares, rings accelerate.
export default function Eigen() {
  const group = useRef();
  const outer = useRef();
  const inner = useRef();
  const halo = useRef();
  const speaking = useCircuitStore((s) => s.eigen.loading || s.eigen.typing);

  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#06222b", emissive: COLORS.cyan, emissiveIntensity: 2.2,
        roughness: 0.3, metalness: 0.2, fog: false,
      }),
    []
  );
  const base = useRef(2.2);
  const tq = useMemo(() => new THREE.Quaternion(), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);

  const haloPositions = useMemo(() => {
    const arr = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * 1.3;
      arr[i * 3 + 1] = (Math.sin(i * 12.9898) * 0.5) * 0.3;
      arr[i * 3 + 2] = Math.sin(a) * 1.3;
    }
    return arr;
  }, []);

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    group.current.position.y = 4 + Math.sin(t * 0.7) * 0.15;
    const speed = speaking ? 2.2 : 1;
    outer.current.rotation.y += 0.3 * speed * dt;
    inner.current.rotation.y -= 0.42 * speed * dt;
    halo.current.rotation.y += 0.25 * speed * dt;
    // subtle attention: slerp ≤ .15 toward the camera
    m4.lookAt(camera.position, group.current.position, THREE.Object3D.DEFAULT_UP);
    tq.setFromRotationMatrix(m4);
    group.current.quaternion.slerp(tq, Math.min(0.15, 2 * dt));
    base.current = THREE.MathUtils.damp(base.current, speaking ? 4.5 : 2.2, 4, dt);
    coreMat.emissiveIntensity = base.current + Math.sin(t * 3) * 0.4;
  });

  return (
    <group ref={group} position={[-8, 4, 10]}>
      <mesh ref={outer}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#06222b" emissive={COLORS.cyan} emissiveIntensity={1.6} wireframe fog={false} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#150a2e" emissive={COLORS.purple} emissiveIntensity={1.8} wireframe fog={false} />
      </mesh>
      <mesh material={coreMat}>
        <sphereGeometry args={[0.22, 20, 20]} />
      </mesh>
      <points ref={halo}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={80} array={haloPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={COLORS.cyan} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </points>
    </group>
  );
}
