'use client';
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Edges, Line } from '@react-three/drei';
import * as THREE from 'three';

interface Century1700RoomProps {
  onSelectDiscovery?: (discoveryId: string) => void;
  position?: [number, number, number];
}

/**
 * 🏛️ ERA I: 1700s — The Enlightenment & The Nature of Light
 *
 * Left Wing: Isaac Newton's Opticks & Corpuscular Particle Theory (1704)
 * Centerpiece: Charles-Augustin de Coulomb's Torsion Balance (1785)
 * Right Wing: Thomas Young's Wave Superposition & Bradley's Aberration (1727 / 1793)
 */
export default function Century1700Room({
  onSelectDiscovery,
  position = [0, 0, 0],
}: Century1700RoomProps) {
  const [hoveredLeft, setHoveredLeft] = useState(false);
  const [hoveredRight, setHoveredRight] = useState(false);
  const [hoveredCenter, setHoveredCenter] = useState(false);

  const torsionRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const centerWingRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Subtle harmonic oscillation of the Coulomb torsion balance rod
    if (torsionRef.current) {
      torsionRef.current.rotation.y = Math.sin(t * 1.2) * 0.18;
    }

    // Plaque hover smooth scaling
    if (leftWingRef.current) {
      const target = hoveredLeft ? 1.05 : 1.0;
      leftWingRef.current.scale.setScalar(
        THREE.MathUtils.damp(leftWingRef.current.scale.x, target, 10, delta)
      );
    }

    if (rightWingRef.current) {
      const target = hoveredRight ? 1.05 : 1.0;
      rightWingRef.current.scale.setScalar(
        THREE.MathUtils.damp(rightWingRef.current.scale.x, target, 10, delta)
      );
    }

    if (centerWingRef.current) {
      const target = hoveredCenter ? 1.05 : 1.0;
      centerWingRef.current.scale.setScalar(
        THREE.MathUtils.damp(centerWingRef.current.scale.x, target, 10, delta)
      );
    }
  });

  return (
    <group position={position}>
      {/* Soft Ambient Light */}
      <ambientLight intensity={0.6} color="#FFFDF8" />

      {/* Gallery Back Wall */}
      <mesh position={[0, 1.8, -3.2]} receiveShadow>
        <boxGeometry args={[16.5, 3.6, 0.15]} />
        <meshStandardMaterial color="#EAE7DF" roughness={0.96} />
        <Edges color="#C9C5BA" linewidth={1} />
      </mesh>

      {/* Gallery Wing Separator Columns */}
      {[-5.4, 5.4].map((x, i) => (
        <mesh key={i} position={[x, 1.8, -1.5]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 3.6, 0.35]} />
          <meshStandardMaterial color="#F2F0EA" roughness={0.9} />
          <Edges color="#1A1A1A" linewidth={1.5} />
        </mesh>
      ))}

      {/* ─── LEFT WING: Newton's Opticks & Particles (1704) ────────────────────── */}
      <group position={[-5.8, 0, 0]}>
        <spotLight
          position={[0, 3.5, 2.0]}
          target-position={[0, 1.2, 0]}
          angle={0.45}
          penumbra={0.6}
          intensity={1.2}
          color="#FFFDF5"
        />

        {/* 3D Glass Prism */}
        <group position={[0, 1.35, 0]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.9, 3]} />
            <meshStandardMaterial
              color="#D0DDEE"
              roughness={0.1}
              metalness={0.1}
              transparent
              opacity={0.85}
            />
            <Edges color="#1A1A1A" linewidth={1.2} />
          </mesh>

          {/* Incoming White Beam */}
          <Line points={[[-2.2, 0, 0], [0, 0, 0]]} color="#FFFFFF" lineWidth={3.5} />

          {/* Refracted Spectrum Fans */}
          <Line points={[[0, 0, 0], [2.2, -0.3, 0.3]]} color="#EF4444" lineWidth={2.5} />
          <Line points={[[0, 0, 0], [2.2, -0.1, 0.15]]} color="#F59E0B" lineWidth={2.5} />
          <Line points={[[0, 0, 0], [2.2, 0.1, 0]]} color="#10B981" lineWidth={2.5} />
          <Line points={[[0, 0, 0], [2.2, 0.3, -0.15]]} color="#3B82F6" lineWidth={2.5} />
          <Line points={[[0, 0, 0], [2.2, 0.5, -0.3]]} color="#8B5CF6" lineWidth={2.5} />
        </group>

        {/* Pedestal */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#EAE7DF" roughness={0.92} />
          <Edges color="#1A1A1A" linewidth={1.5} />
        </mesh>

        {/* Interactive Plaque */}
        <group
          ref={leftWingRef}
          position={[0, 0.65, 0.65]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDiscovery?.('evt-1704');
          }}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredLeft(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredLeft(false);
            document.body.style.cursor = 'default';
          }}
        >
          <RoundedBox args={[2.4, 0.75, 0.08]} radius={0.05} smoothness={4} receiveShadow castShadow>
            <meshStandardMaterial color={hoveredLeft ? '#FFFFFF' : '#FDFBF7'} roughness={0.88} />
            <Edges color="#1A1A1A" linewidth={hoveredLeft ? 2.5 : 1.5} />
          </RoundedBox>

          <Text position={[0, 0.16, 0.05]} fontSize={0.14} color="#0A0A0A" anchorX="center" anchorY="middle">
            1704: Newton's Opticks
          </Text>
          <Text position={[0, -0.12, 0.05]} fontSize={0.11} color="#4A4740" anchorX="center" anchorY="middle">
            Prism Spectrum · Corpuscular Particle Theory
          </Text>
        </group>
      </group>

      {/* ─── CENTERPIECE: Coulomb's Torsion Balance (1785) ───────────────────── */}
      <group position={[0, 0, 0]}>
        <pointLight position={[0, 1.5, 0]} intensity={1.4} distance={6} color="#F59E0B" />

        {/* Formula Display */}
        <Text position={[0, 2.4, -0.2]} fontSize={0.24} color="#0A0A0A" anchorX="center" anchorY="middle">
          {"F = k · (q₁q₂) / r²"}
        </Text>
        <Text position={[0, 2.05, -0.2]} fontSize={0.12} color="#D97706" anchorX="center" anchorY="middle">
          Electrostatic Inverse-Square Law · Quantum Atomic Binding
        </Text>

        {/* Torsion Balance Apparatus */}
        <group position={[0, 0.8, 0]}>
          {/* Vertical Torsion Suspension Wire */}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1.1, 16]} />
            <meshStandardMaterial color="#1A1A1A" metalness={0.8} />
          </mesh>

          {/* Oscillating Balance Arm with Charged Spheres */}
          <group ref={torsionRef}>
            <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 1.8, 16]} />
              <meshStandardMaterial color="#1A1A1A" metalness={0.7} />
            </mesh>

            {/* Charged Sphere q1 */}
            <mesh position={[-0.9, 0.05, 0]}>
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshStandardMaterial color="#B89C50" metalness={0.85} roughness={0.2} />
              <Edges color="#1A1A1A" linewidth={1} />
            </mesh>

            {/* Charged Sphere q2 */}
            <mesh position={[0.9, 0.05, 0]}>
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshStandardMaterial color="#B89C50" metalness={0.85} roughness={0.2} />
              <Edges color="#1A1A1A" linewidth={1} />
            </mesh>
          </group>

          {/* Concentric Inverse Square Field Rings */}
          {[0.5, 0.85, 1.2].map((r, i) => (
            <mesh key={i} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r - 0.02, r, 32]} />
              <meshBasicMaterial color="#D97706" opacity={0.45 - i * 0.12} transparent side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>

        {/* Center Plinth */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[1.2, 1.35, 0.5, 32]} />
          <meshStandardMaterial color="#EAE7DF" roughness={0.9} />
          <Edges color="#1A1A1A" linewidth={1.8} />
        </mesh>

        {/* Interactive Plaque */}
        <group
          ref={centerWingRef}
          position={[0, 0.65, 0.85]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDiscovery?.('evt-1785');
          }}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredCenter(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredCenter(false);
            document.body.style.cursor = 'default';
          }}
        >
          <RoundedBox args={[2.8, 0.75, 0.08]} radius={0.05} smoothness={4} receiveShadow castShadow>
            <meshStandardMaterial color={hoveredCenter ? '#FFFFFF' : '#FDFBF7'} roughness={0.88} />
            <Edges color="#1A1A1A" linewidth={hoveredCenter ? 2.5 : 1.5} />
          </RoundedBox>

          <Text position={[0, 0.16, 0.05]} fontSize={0.14} color="#0A0A0A" anchorX="center" anchorY="middle">
            1785: Coulomb's Inverse-Square Law
          </Text>
          <Text position={[0, -0.12, 0.05]} fontSize={0.11} color="#4A4740" anchorX="center" anchorY="middle">
            Torsion Balance · Electron-Nucleus Force Foundation
          </Text>
        </group>
      </group>

      {/* ─── RIGHT WING: Wave Superposition & Bradley (1727 / 1793) ───────────── */}
      <group position={[5.8, 0, 0]}>
        {/* Wave Resonator & Bradley Star Rig */}
        <group position={[0, 1.35, 0]}>
          {/* Wave Ripple Rings */}
          {[-0.6, 0.6].map((x, idx) => (
            <group key={idx} position={[x, 0, 0]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#1A1A1A" />
              </mesh>
              {[0.3, 0.55, 0.8].map((r, ri) => (
                <mesh key={ri} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[r - 0.02, r, 24]} />
                  <meshBasicMaterial color="#2563EB" opacity={0.5 - ri * 0.14} transparent side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          ))}
          <Line points={[[-0.6, 0, 0], [1.2, 0.8, -0.6]]} color="#4B5563" lineWidth={2} />
          <Line points={[[0.6, 0, 0], [1.2, 0.8, -0.6]]} color="#4B5563" lineWidth={2} />
        </group>

        {/* Pedestal */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#EAE7DF" roughness={0.92} />
          <Edges color="#1A1A1A" linewidth={1.5} />
        </mesh>

        {/* Interactive Plaque */}
        <group
          ref={rightWingRef}
          position={[0, 0.65, 0.65]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDiscovery?.('evt-1793');
          }}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredRight(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredRight(false);
            document.body.style.cursor = 'default';
          }}
        >
          <RoundedBox args={[2.5, 0.75, 0.08]} radius={0.05} smoothness={4} receiveShadow castShadow>
            <meshStandardMaterial color={hoveredRight ? '#FFFFFF' : '#FDFBF7'} roughness={0.88} />
            <Edges color="#1A1A1A" linewidth={hoveredRight ? 2.5 : 1.5} />
          </RoundedBox>

          <Text position={[0, 0.16, 0.05]} fontSize={0.14} color="#0A0A0A" anchorX="center" anchorY="middle">
            1793: Wave Analogy & Bradley
          </Text>
          <Text position={[0, -0.12, 0.05]} fontSize={0.11} color="#4A4740" anchorX="center" anchorY="middle">
            Sound-Light Superposition · 1727 Stellar Aberration
          </Text>
        </group>
      </group>
    </group>
  );
}
