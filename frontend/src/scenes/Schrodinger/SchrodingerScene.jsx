import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import Portal from "../../components/Portal";
import { useCircuitStore } from "../../store/circuitStore";
import { mulberry32, SEED } from "../QubitCity/cityConfig";
import { clockRef } from "../clock";

const CYAN = new THREE.Color("#00e5ff");
const PINK = new THREE.Color("#ff2d95");
const VIOLET = new THREE.Color("#7c3aed");

export default function SchrodingerScene({ reduced = false }) {
  const monoliths = useRef([]);
  const stripA = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#150a2e", emissive: VIOLET.clone(), emissiveIntensity: 2.6, fog: false }),
    []
  );
  const stripB = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2b0618", emissive: PINK.clone(), emissiveIntensity: 2.6, fog: false }),
    []
  );
  const orbAMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#06222b", emissive: CYAN, emissiveIntensity: 3, transparent: true, opacity: 0.55, fog: false }),
    []
  );
  const orbBMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2b0618", emissive: PINK, emissiveIntensity: 3, transparent: true, opacity: 0.55, fog: false }),
    []
  );
  const orbA = useRef();
  const orbB = useRef();
  const lid = useRef();
  const shards = useRef();
  const boxGroup = useRef();
  const state = useRef({ phase: "idle", t0: 0, chosen: 0, spoke: false });
  const setScripted = useCircuitStore((s) => s.setScriptedNarration);
  const setBoxCollapsed = useCircuitStore((s) => s.setBoxCollapsed);
  const restoreTick = useCircuitStore((s) => s.restoreTick);

  const defs = useMemo(() => {
    const rng = mulberry32(SEED + 9);
    return Array.from({ length: 12 }, (_, i) => ({
      a: (i / 12) * Math.PI * 2,
      h: 3 + rng() * 4,
      phase: rng() * Math.PI * 2,
      dir: i % 2 ? 1 : -1,
    }));
  }, []);

  const shardPositions = useMemo(() => {
    const rng = mulberry32(SEED + 10);
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      const a = rng() * Math.PI * 2;
      const r = 4 + rng() * 16;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = rng() * 12;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);

  useEffect(() => {
    // restore superposition
    if (restoreTick > 0) {
      state.current.phase = "idle";
      state.current.spoke = state.current.spoke; // proximity line stays consumed
      setScripted("The lid closes. Both histories resume — the box holds its two answers again.");
    }
  }, [restoreTick, setScripted]);

  const collapse = () => {
    const s = state.current;
    if (s.phase !== "idle") return;
    s.t0 = clockRef.t;
    s.phase = reduced ? "collapsed" : "intense";
    if (reduced) finishCollapse();
  };

  const finishCollapse = () => {
    const s = state.current;
    s.chosen = Math.random() < 0.5 ? 0 : 1;
    s.phase = "collapsed";
    const name = s.chosen === 0 ? "|A⟩" : "|B⟩";
    setScripted(`Observed. The wave collapsed — this time, ${name}. Run history again and the other answer waits. Only the odds were ever promised.`);
    setTimeout(() => useCircuitStore.getState().setBoxCollapsed(true), 2500);
  };

  useFrame(({ camera }, dt) => {
    const t = clockRef.t;
    const s = state.current;

    for (let i = 0; i < monoliths.current.length; i++) {
      const m = monoliths.current[i];
      if (!m) continue;
      const d = defs[i];
      m.scale.y = 1 + 0.35 * Math.sin(t * 0.35 + d.phase);
      m.rotation.y += d.dir * 0.06 * dt;
    }

    if (shards.current) {
      const arr = shards.current.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += 0.012;
        if (arr[i] > 12) arr[i] = 0;
      }
      shards.current.geometry.attributes.position.needsUpdate = true;
    }

    // intensify → collapse
    if (s.phase === "intense" && t - s.t0 > 1) finishCollapse();
    const speed = s.phase === "intense" ? 6 : 2;
    const collapsed = s.phase === "collapsed";
    const orbR = 0.35;

    if (orbA.current && orbB.current) {
      if (!collapsed) {
        orbA.current.position.set(Math.cos(t * speed) * orbR, 0, Math.sin(t * speed) * orbR);
        orbB.current.position.set(-Math.cos(t * speed) * orbR, 0, -Math.sin(t * speed) * orbR);
        orbAMat.opacity = THREE.MathUtils.damp(orbAMat.opacity, 0.35 + 0.35 * Math.sin(t * 2) * 0.5 + 0.35, 6, dt);
        orbBMat.opacity = THREE.MathUtils.damp(orbBMat.opacity, 0.35 + 0.35 * Math.sin(t * 2 + Math.PI) * 0.5 + 0.35, 6, dt);
        orbAMat.emissiveIntensity = THREE.MathUtils.damp(orbAMat.emissiveIntensity, s.phase === "intense" ? 5 : 3, 5, dt);
        orbBMat.emissiveIntensity = THREE.MathUtils.damp(orbBMat.emissiveIntensity, s.phase === "intense" ? 5 : 3, 5, dt);
        orbA.current.scale.setScalar(THREE.MathUtils.damp(orbA.current.scale.x, 1, 5, dt));
        orbB.current.scale.setScalar(THREE.MathUtils.damp(orbB.current.scale.x, 1, 5, dt));
      } else {
        const win = s.chosen === 0 ? orbA.current : orbB.current;
        const lose = s.chosen === 0 ? orbB.current : orbA.current;
        const winMat = s.chosen === 0 ? orbAMat : orbBMat;
        const loseMat = s.chosen === 0 ? orbBMat : orbAMat;
        const lam = reduced ? 20 : 4;
        win.position.x = THREE.MathUtils.damp(win.position.x, 0, lam, dt);
        win.position.z = THREE.MathUtils.damp(win.position.z, 0, lam, dt);
        win.scale.setScalar(THREE.MathUtils.damp(win.scale.x, 1.67, lam, dt));
        winMat.opacity = THREE.MathUtils.damp(winMat.opacity, 1, lam, dt);
        loseMat.opacity = THREE.MathUtils.damp(loseMat.opacity, 0, lam, dt);
        lose.scale.setScalar(THREE.MathUtils.damp(lose.scale.x, 0.4, lam, dt));
        // monolith strips + fog drift toward the chosen hue
        const hue = s.chosen === 0 ? CYAN : PINK;
        stripA.emissive.lerp(hue, Math.min(1, dt * 1.5));
        stripB.emissive.lerp(hue, Math.min(1, dt * 1.5));
      }
      if (!collapsed) {
        stripA.emissive.lerp(VIOLET, Math.min(1, dt * 1.5));
        stripB.emissive.lerp(PINK, Math.min(1, dt * 1.5));
      }
    }

    if (lid.current) {
      const target = collapsed ? -1.9 : 0;
      lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, target, reduced ? 20 : 4, dt);
    }

    // proximity beat (once)
    if (!s.spoke && boxGroup.current && camera.position.distanceTo(boxGroup.current.position) < 8) {
      s.spoke = true;
      setScripted("Inside, two histories run in parallel. Neither is real yet — the box is a superposition, |ψ⟩ = (|A⟩+|B⟩)/√2.");
    }
    void setBoxCollapsed;
  });

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#0b0614" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* monolith ring */}
      {defs.map((d, i) => (
        <group key={i} position={[Math.cos(d.a) * 17, 0, Math.sin(d.a) * 17]}>
          <mesh ref={(m) => (monoliths.current[i] = m)} position={[0, d.h / 2, 0]}>
            <boxGeometry args={[1.6, d.h, 1.6]} />
            <meshStandardMaterial color="#0e0a1e" roughness={0.85} metalness={0.15} />
          </mesh>
          <mesh position={[0, d.h * 0.75, 0.83]} material={i % 2 ? stripA : stripB}>
            <boxGeometry args={[0.12, d.h * 0.45, 0.04]} />
          </mesh>
        </group>
      ))}

      <points ref={shards}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={400} array={shardPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.09} color="#7c3aed" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </points>

      {/* pedestal + THE BOX */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 1, 24]} />
        <meshStandardMaterial color="#140b26" roughness={0.6} metalness={0.3} />
      </mesh>
      <group
        ref={boxGroup}
        position={[0, 1.75, 0]}
        onClick={(e) => {
          e.stopPropagation();
          collapse();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <mesh>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshStandardMaterial color="#7c3aed" transparent opacity={0.35} roughness={0.2} metalness={0.3} fog={false}>
          </meshStandardMaterial>
          <Edges color="#ff2d95" />
        </mesh>
        <group ref={lid} position={[0, 0.65, -0.65]}>
          <mesh position={[0, 0.03, 0.65]}>
            <boxGeometry args={[1.32, 0.06, 1.32]} />
            <meshStandardMaterial color="#7c3aed" transparent opacity={0.5} roughness={0.2} metalness={0.3} fog={false} />
          </mesh>
        </group>
        <mesh ref={orbA} material={orbAMat}>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
        <mesh ref={orbB} material={orbBMat}>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
      </group>

      <Portal to="city" label="RETURN TO THE CITY" position={[-10, 2.2, 8]} ringColor="#7c3aed" />
    </group>
  );
}
