'use client';
import React, { useMemo, useRef } from 'react';
import { Text, Line, Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ForkSignpost — the 1980 fork visual for the 20th-century interior.
 * Renders an ink signpost post with two angled arms pointing toward
 * the "Foundations" lane (negative Z) and "Computing" lane (positive Z),
 * plus lane divider lines and subtle lane labels on the floor.
 */
export default function ForkSignpost({ position = [0, 0, 0] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  // Shared geometries
  const postGeo = useMemo(() => new THREE.BoxGeometry(0.07, 1.8, 0.07), []);
  const armGeo = useMemo(() => new THREE.BoxGeometry(1.6, 0.07, 0.07), []);
  const arrowHeadGeo = useMemo(() => new THREE.ConeGeometry(0.1, 0.22, 4), []);
  const baseGeo = useMemo(() => new THREE.BoxGeometry(0.4, 0.06, 0.4), []);

  // Gentle idle sway
  const swayRef = useRef(Math.random() * Math.PI * 2);
  useFrame((_, delta) => {
    swayRef.current += delta * 0.4;
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(swayRef.current) * 0.008;
    }
  });

  const inkMat = <meshStandardMaterial color="#2B2B2B" roughness={0.85} metalness={0} />;
  const paperMat = <meshStandardMaterial color="#F2F0EA" roughness={0.95} metalness={0} />;

  return (
    <group ref={groupRef} position={position}>
      {/* Base plate */}
      <mesh geometry={baseGeo} position={[0, 0.03, 0]}>
        {paperMat}
        <Edges geometry={baseGeo} color="#2B2B2B" linewidth={1} />
      </mesh>

      {/* Vertical post */}
      <mesh geometry={postGeo} position={[0, 0.9, 0]}>
        {inkMat}
      </mesh>

      {/* ── Foundations arm (points toward negative Z / left lane) ── */}
      <group position={[0, 1.55, 0]} rotation={[0, 0, Math.PI * 0.08]}>
        <mesh geometry={armGeo} position={[-0.7, 0, 0]}>
          {inkMat}
        </mesh>
        {/* Arrow head */}
        <mesh geometry={arrowHeadGeo} position={[-1.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          {inkMat}
        </mesh>
        {/* Sign board */}
        <mesh position={[-0.7, 0.22, 0]}>
          <boxGeometry args={[1.3, 0.32, 0.04]} />
          {paperMat}
          <Edges color="#2B2B2B" linewidth={0.8} />
        </mesh>
        <Text
          position={[-0.7, 0.22, 0.04]}
          fontSize={0.13}
          color="#2B2B2B"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
        >
          FOUNDATIONS
        </Text>
      </group>

      {/* ── Computing arm (points toward positive Z / right lane) ── */}
      <group position={[0, 1.25, 0]} rotation={[0, 0, -Math.PI * 0.08]}>
        <mesh geometry={armGeo} position={[0.7, 0, 0]}>
          {inkMat}
        </mesh>
        {/* Arrow head */}
        <mesh geometry={arrowHeadGeo} position={[1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          {inkMat}
        </mesh>
        {/* Sign board */}
        <mesh position={[0.7, 0.22, 0]}>
          <boxGeometry args={[1.3, 0.32, 0.04]} />
          {paperMat}
          <Edges color="#2B2B2B" linewidth={0.8} />
        </mesh>
        <Text
          position={[0.7, 0.22, 0.04]}
          fontSize={0.13}
          color="#2B2B2B"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
        >
          COMPUTING
        </Text>
      </group>

      {/* Year label on post */}
      <Text
        position={[0, 0.62, 0.08]}
        fontSize={0.16}
        color="#1A1A1A"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        1980
      </Text>
      <Text
        position={[0, 0.44, 0.08]}
        fontSize={0.1}
        color="#2B2B2B"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        THE FORK
      </Text>

      {/* Lane divider line on floor — dashed feel via two segments */}
      <Line
        points={[[-20, -0.28, 0], [20, -0.28, 0]]}
        color="#C9C5BA"
        lineWidth={1.2}
        dashed
        dashSize={0.6}
        gapSize={0.3}
      />

      {/* Lane label: FOUNDATIONS (negative Z side) */}
      <Text
        position={[-12, -0.27, -3.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#C9C5BA"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        FOUNDATIONS
      </Text>

      {/* Lane label: COMPUTING (positive Z side) */}
      <Text
        position={[-12, -0.27, 3.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#C9C5BA"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        COMPUTING
      </Text>
    </group>
  );
}
