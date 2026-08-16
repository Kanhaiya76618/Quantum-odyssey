'use client';
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Edges, Line } from '@react-three/drei';
import * as THREE from 'three';

interface Century1600RoomProps {
  onSelectDiscovery?: (discoveryId: string) => void;
  position?: [number, number, number];
}

/**
 * 🏛️ ERA I: 1600s — The Dawn of Optics, Refraction & The Nature of Light
 *
 * Left Wing: The Era of Refraction (Snell's Law 1621 & Galileo 1610)
 * Right Wing: The Anomaly of Diffraction (Grimaldi 1665 & Hooke)
 * Centerpiece: The Finite Speed of Light 'c' (Ole Rømer 1676)
 */
export default function Century1600Room({
  onSelectDiscovery,
  position = [0, 0, 0],
}: Century1600RoomProps) {
  // Hover states for interactive gallery plaques
  const [hoveredLeft, setHoveredLeft] = useState(false);
  const [hoveredRight, setHoveredRight] = useState(false);
  const [hoveredCenter, setHoveredCenter] = useState(false);

  // Animation refs
  const orbRef = useRef<THREE.Mesh>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const centerWingRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Gentle pulsing for the speed of light orb (Io / Rømer)
    if (orbRef.current) {
      orbRef.current.position.y = 1.0 + Math.sin(t * 1.5) * 0.06;
      const scale = 1.0 + Math.sin(t * 2.0) * 0.04;
      orbRef.current.scale.set(scale, scale, scale);
    }

    // Smooth hover damping for plaques
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
      {/* ─── Paper & Ink Room Gallery Architecture ────────────────────────────── */}
      {/* Soft Ambient Light for Ink Readability */}
      <ambientLight intensity={0.6} color="#FFFDF8" />

      {/* Gallery Back Wall with Blueprint Grid Lines */}
      <mesh position={[0, 1.6, -3.2]} receiveShadow>
        <boxGeometry args={[16.0, 3.4, 0.15]} />
        <meshStandardMaterial color="#EAE7DF" roughness={0.96} />
        <Edges color="#C9C5BA" linewidth={1} />
      </mesh>

      {/* Gallery Wing Separator Pillars */}
      {[-5.2, 5.2].map((x, i) => (
        <mesh key={i} position={[x, 1.6, -1.5]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 3.4, 0.35]} />
          <meshStandardMaterial color="#F2F0EA" roughness={0.9} />
          <Edges color="#1A1A1A" linewidth={1.5} />
        </mesh>
      ))}

      {/* ─── LEFT WING: The Era of Refraction (Snell & Galileo) ─────────────────── */}
      <group position={[-5.8, 0, 0]}>
        {/* Spotlight shining directly on the refractive lens */}
        <spotLight
          position={[0, 3.5, 2.0]}
          target-position={[0, 1.2, 0]}
          angle={0.45}
          penumbra={0.6}
          intensity={1.2}
          color="#FFFDF5"
        />

        {/* 3D Convex Glass Lens (scaled flat on Z-axis) */}
        <group position={[0, 1.25, 0]}>
          <mesh scale={[1.1, 1.1, 0.22]} rotation={[0, 0, 0]}>
            <sphereGeometry args={[0.85, 32, 16]} />
            <meshStandardMaterial
              color="#C8D6E8"
              roughness={0.1}
              metalness={0.05}
              transparent
              opacity={0.82}
            />
            <Edges color="#1A1A1A" linewidth={1} />
          </mesh>

          {/* Incoming Straight Light Ray (Cylinder) */}
          <mesh position={[-1.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 2.2, 16]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>

          {/* Refracted & Bent Light Ray Through Focal Point */}
          <mesh position={[1.4, -0.22, 0]} rotation={[0, 0, -Math.PI / 3.4]}>
            <cylinderGeometry args={[0.025, 0.025, 2.2, 16]} />
            <meshBasicMaterial color="#3B82F6" />
          </mesh>

          {/* Focal Point Indicator */}
          <mesh position={[1.4, -0.65, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color="#EF4444" />
          </mesh>
        </group>

        {/* Refraction Plinth Pedestal */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#EAE7DF" roughness={0.92} />
          <Edges color="#1A1A1A" linewidth={1.5} />
        </mesh>

        {/* Interactive RoundedBox Discovery Plaque */}
        <group
          ref={leftWingRef}
          position={[0, 0.65, 0.65]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDiscovery?.('evt-1621');
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
          <RoundedBox
            args={[2.2, 0.75, 0.08]}
            radius={0.05}
            smoothness={4}
            receiveShadow
            castShadow
          >
            <meshStandardMaterial
              color={hoveredLeft ? '#FFFFFF' : '#FDFBF7'}
              roughness={0.88}
            />
            <Edges
              color="#1A1A1A"
              linewidth={hoveredLeft ? 2.5 : 1.5}
            />
          </RoundedBox>

          <Text
            position={[0, 0.16, 0.05]}
            fontSize={0.14}
            color="#0A0A0A"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            1621: Snell's Law
          </Text>

          <Text
            position={[0, -0.12, 0.05]}
            fontSize={0.11}
            color="#4A4740"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            1610: Galileo's Telescope · n₁sinθ₁ = n₂sinθ₂
          </Text>
        </group>
      </group>

      {/* ─── CENTERPIECE: The Finite Speed of Light 'c' (Ole Rømer 1676) ────── */}
      <group position={[0, 0, 0]}>
        {/* Soft PointLight glowing inside the Io Orb */}
        <pointLight position={[0, 1.2, 0]} intensity={1.5} distance={5} color="#F59E0B" />

        {/* Universal Speed of Light Symbol "c" */}
        <Text
          position={[0, 2.3, -0.2]}
          fontSize={0.65}
          color="#0A0A0A"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          c
        </Text>

        <Text
          position={[0, 1.82, -0.2]}
          fontSize={0.14}
          color="#D97706"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          c = 299,792,458 m/s
        </Text>

        {/* Emissive 3D Orb representing Jupiter's Moon Io */}
        <mesh ref={orbRef} position={[0, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#D97706"
            emissiveIntensity={0.65}
            roughness={0.2}
          />
          <Edges color="#1A1A1A" linewidth={1} />
        </mesh>

        {/* Delayed Light Ray Line from Io to Earth */}
        <Line
          points={[
            [-0.35, 1.0, 0],
            [-2.4, 0.4, 1.2],
          ]}
          color="#D97706"
          lineWidth={2.5}
        />
        <Line
          points={[
            [0.35, 1.0, 0],
            [2.4, 0.4, 1.2],
          ]}
          color="#D97706"
          lineWidth={2.5}
        />

        {/* Center Plinth Pedestal */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[1.1, 1.25, 0.5, 32]} />
          <meshStandardMaterial color="#EAE7DF" roughness={0.9} />
          <Edges color="#1A1A1A" linewidth={1.8} />
        </mesh>

        {/* Interactive RoundedBox Centerpiece Plaque */}
        <group
          ref={centerWingRef}
          position={[0, 0.65, 0.85]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDiscovery?.('evt-1676');
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
          <RoundedBox
            args={[2.6, 0.75, 0.08]}
            radius={0.05}
            smoothness={4}
            receiveShadow
            castShadow
          >
            <meshStandardMaterial
              color={hoveredCenter ? '#FFFFFF' : '#FDFBF7'}
              roughness={0.88}
            />
            <Edges
              color="#1A1A1A"
              linewidth={hoveredCenter ? 2.5 : 1.5}
            />
          </RoundedBox>

          <Text
            position={[0, 0.16, 0.05]}
            fontSize={0.14}
            color="#0A0A0A"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            1676: Finite Speed of Light
          </Text>

          <Text
            position={[0, -0.12, 0.05]}
            fontSize={0.11}
            color="#4A4740"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            Ole Rømer's Io Eclipse Delay · Foundation for E=hν & E=mc²
          </Text>
        </group>
      </group>

      {/* ─── RIGHT WING: The Anomaly of Diffraction (Grimaldi & Hooke) ──────── */}
      <group position={[5.8, 0, 0]}>
        {/* Solid Opaque Sphere Casting Shadow */}
        <group position={[0, 1.25, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.85} />
            <Edges color="#4A4740" linewidth={1} />
          </mesh>

          {/* Fading Concentric Diffraction Rings Behind Sphere */}
          {[0.75, 1.05, 1.35].map((r, idx) => (
            <mesh key={idx} position={[0, 0, -0.45 - idx * 0.15]}>
              <ringGeometry args={[r - 0.04, r, 32]} />
              <meshBasicMaterial
                color="#1A1A1A"
                transparent
                opacity={0.6 - idx * 0.18}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}

          {/* Incoming Light Rays Bending Around Sphere Edges */}
          <Line
            points={[
              [-1.8, 0.6, 0],
              [-0.55, 0.5, 0],
              [-0.2, 0.1, -0.8],
            ]}
            color="#10B981"
            lineWidth={2}
          />
          <Line
            points={[
              [1.8, 0.6, 0],
              [0.55, 0.5, 0],
              [0.2, 0.1, -0.8],
            ]}
            color="#10B981"
            lineWidth={2}
          />
        </group>

        {/* Diffraction Plinth Pedestal */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#EAE7DF" roughness={0.92} />
          <Edges color="#1A1A1A" linewidth={1.5} />
        </mesh>

        {/* Interactive RoundedBox Discovery Plaque */}
        <group
          ref={rightWingRef}
          position={[0, 0.65, 0.65]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDiscovery?.('evt-1665');
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
          <RoundedBox
            args={[2.2, 0.75, 0.08]}
            radius={0.05}
            smoothness={4}
            receiveShadow
            castShadow
          >
            <meshStandardMaterial
              color={hoveredRight ? '#FFFFFF' : '#FDFBF7'}
              roughness={0.88}
            />
            <Edges
              color="#1A1A1A"
              linewidth={hoveredRight ? 2.5 : 1.5}
            />
          </RoundedBox>

          <Text
            position={[0, 0.16, 0.05]}
            fontSize={0.14}
            color="#0A0A0A"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            1665: Grimaldi's Diffraction
          </Text>

          <Text
            position={[0, -0.12, 0.05]}
            fontSize={0.11}
            color="#4A4740"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            Light Bends Around Shadows · First Wave Anomaly
          </Text>
        </group>
      </group>
    </group>
  );
}
