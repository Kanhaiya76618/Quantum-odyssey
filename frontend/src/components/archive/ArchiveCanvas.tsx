'use client';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  ContactShadows,
  Text,
  Edges,
  Line,
} from '@react-three/drei';
import * as THREE from 'three';
import { CENTURIES, type Century, type QuantumEvent } from '../../content/quantum_timeline';
import type { ArchiveState } from './ArchiveViewClient';
import ForkSignpost from './ForkSignpost';

interface ArchiveCanvasProps {
  archiveState: ArchiveState;
  onEnterCentury: (century: Century) => void;
  onOpenEvent: (event: QuantumEvent) => void;
  onHoverCentury: (century: Century | null) => void;
}

const CENTURY_Y_POSITIONS = [-3.6, -1.8, 0, 1.8, 3.6];

// --- 3D Room Props for Scientific Discovery Chambers ---
function RoomProp({ centuryId }: { centuryId: string }) {
  if (centuryId === 'c17') {
    // 1665 Newton's Optics Room — Glass Prism & Light Beam
    return (
      <group position={[0, 0.8, -1.5]}>
        <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.8, 3]} />
          <meshStandardMaterial color="#B9C4D6" roughness={0.2} transparent opacity={0.8} />
        </mesh>
        <Line points={[[-2, 0.4, 0], [0, 0.4, 0]]} color="#FFFFFF" lineWidth={3} />
        <Line points={[[0, 0.4, 0], [2, 0.1, 0]]} color="#EF4444" lineWidth={2} />
        <Line points={[[0, 0.4, 0], [2, 0.4, 0]]} color="#10B981" lineWidth={2} />
        <Line points={[[0, 0.4, 0], [2, 0.7, 0]]} color="#3B82F6" lineWidth={2} />
      </group>
    );
  }

  if (centuryId === 'c18_19') {
    // 1801 Young's Double Slit Chamber
    return (
      <group position={[0, 0.8, -1.5]}>
        <mesh position={[-0.8, 0.6, 0]}>
          <boxGeometry args={[0.1, 1.2, 2]} />
          <meshStandardMaterial color="#2B2B2B" />
        </mesh>
        <mesh position={[1.5, 0.6, 0]}>
          <boxGeometry args={[0.05, 1.2, 2.4]} />
          <meshStandardMaterial color="#F2F0EA" />
        </mesh>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((z, idx) => (
          <mesh key={idx} position={[1.52, 0.6 + z * 0.3, z * 0.8]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color="#2B2B2B" opacity={0.8 - Math.abs(z) * 0.2} transparent />
          </mesh>
        ))}
      </group>
    );
  }

  if (centuryId === 'c20_early') {
    // 1900 Planck / Einstein Thermal & Photoelectric Furnace
    return (
      <group position={[0, 0.8, -1.5]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.6, 0.7, 1.0, 16]} />
          <meshStandardMaterial color="#4A4740" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      </group>
    );
  }

  if (centuryId === 'c20_mid') {
    // 1925 Matrix Mechanics Chalkboard & Wave Chamber
    return (
      <group position={[0, 1.1, -2.2]}>
        <mesh>
          <boxGeometry args={[4.2, 1.8, 0.1]} />
          <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
        </mesh>
        <Text position={[0, 0.3, 0.08]} fontSize={0.28} color="#F2F0EA" anchorX="center">
          {"HΨ = EΨ  ·  [x, p] = iħ"}
        </Text>
      </group>
    );
  }

  // c20_late_c21: Modern Quantum Computer Cryostat Room
  return (
    <group position={[0, 1.4, -1.2]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.8, 0.6, 0.6, 16]} />
        <meshStandardMaterial color="#D97706" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.5, 0.3, 0.5, 16]} />
        <meshStandardMaterial color="#B9C4D6" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// --- Multi-Story Paper Building Floor ---
function CenturyBlock({
  century,
  yPos,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: {
  century: Century;
  yPos: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const clockRef = useRef(Math.random() * Math.PI * 2);
  const currentZ = useRef(0);

  const floorGeo = useMemo(() => new THREE.BoxGeometry(10.5, 0.45, 7.2), []);
  const roofGeo = useMemo(() => new THREE.BoxGeometry(10.8, 0.3, 7.5), []);
  const pillarGeo = useMemo(() => new THREE.BoxGeometry(0.4, 2.0, 0.4), []);
  const backWallGeo = useMemo(() => new THREE.BoxGeometry(9.8, 2.0, 0.15), []);

  useFrame((_, delta) => {
    clockRef.current += delta;
    if (!groupRef.current) return;

    const bobY = Math.sin(clockRef.current * 0.8) * 0.03;
    groupRef.current.position.y = yPos + bobY;
    groupRef.current.rotation.y = Math.sin(clockRef.current * 0.25) * 0.006;

    const targetZVal = isHovered ? 0.6 : 0;
    currentZ.current = THREE.MathUtils.damp(currentZ.current, targetZVal, 8, delta);
    groupRef.current.position.z = currentZ.current;
  });

  return (
    <group ref={groupRef} position={[0, yPos, 0]}>
      {/* Interactive floor slab */}
      <mesh
        geometry={floorGeo}
        receiveShadow
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={(e) => { e.stopPropagation(); onLeave(); document.body.style.cursor = 'default'; }}
      >
        <meshStandardMaterial
          color={isHovered ? '#DDD9CD' : '#EAE7DF'}
          roughness={0.92}
          metalness={0}
        />
        <Edges
          geometry={floorGeo}
          linewidth={isHovered ? 2.5 : 1.2}
          color={isHovered ? '#1A1A1A' : '#B8B4A8'}
        />
      </mesh>

      {/* Roof cornice */}
      <mesh geometry={roofGeo} position={[0, 2.15, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#F2F0EA" roughness={0.9} />
        <Edges geometry={roofGeo} color="#1A1A1A" linewidth={1} />
      </mesh>

      {/* Back Wall */}
      <mesh geometry={backWallGeo} position={[0, 1.0, -3.4]} receiveShadow>
        <meshStandardMaterial color="#E0DCD2" roughness={0.95} />
        <Edges geometry={backWallGeo} color="#C9C5BA" linewidth={1} />
      </mesh>

      {/* 4 Architectural Columns */}
      {[[-4.8, -3.2], [4.8, -3.2], [-4.8, 3.2], [4.8, 3.2]].map(([px, pz], i) => (
        <mesh key={i} geometry={pillarGeo} position={[px, 1.0, pz]} castShadow receiveShadow>
          <meshStandardMaterial color="#F2F0EA" roughness={0.9} />
          <Edges geometry={pillarGeo} color="#1A1A1A" linewidth={1} />
        </mesh>
      ))}

      {/* 3D Scientific Room Props for this era */}
      <RoomProp centuryId={century.id} />

      {/* Sharp High-Contrast Floor & Building Labels */}
      <Text
        position={[0, 0.3, 3.65]}
        fontSize={0.42}
        color="#1A1A1A"
        anchorX="center"
        anchorY="middle"
        maxWidth={9}
      >
        {century.label}
      </Text>
      <Text
        position={[0, 2.25, 3.78]}
        fontSize={0.22}
        color="#1A1A1A"
        anchorX="center"
        anchorY="middle"
      >
        {`${century.range} · ${century.count} DISCOVERIES`}
      </Text>
    </group>
  );
}

// --- Stair Connector Between Floors ---
function StairConnector({ fromY, toY }: { fromY: number; toY: number }) {
  const steps = 7;
  const stepHeight = (toY - fromY) / steps;
  const stepGeo = useMemo(() => new THREE.BoxGeometry(1.5, 0.12, 0.75), []);

  return (
    <group position={[5.4, fromY, 0]}>
      {Array.from({ length: steps }, (_, i) => (
        <mesh
          key={`step-${i}`}
          geometry={stepGeo}
          position={[0, i * stepHeight + stepHeight * 0.5, -i * 0.35]}
          receiveShadow
        >
          <meshStandardMaterial color="#EAE7DF" roughness={0.95} />
          <Edges geometry={stepGeo} color="#1A1A1A" linewidth={1} />
        </mesh>
      ))}
      <Line
        points={[
          [0.85, 0.4, 0],
          [0.85, stepHeight * steps + 0.4, -steps * 0.35],
        ]}
        color="#1A1A1A"
        lineWidth={1.5}
      />
    </group>
  );
}

// --- Year Station (Museum Plinth in Room) ---
function YearStation({
  event,
  position,
  isVisited,
  isActive,
  onClick,
}: {
  event: QuantumEvent;
  position: [number, number, number];
  isVisited: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const plinthGeo = useMemo(() => new THREE.BoxGeometry(1.3, 0.45, 0.85), []);
  const cardGeo = useMemo(() => new THREE.BoxGeometry(1.3, 1.7, 0.06), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetScale = isActive ? 1.1 : 1;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 10, delta),
    );
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerEnter={() => { document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { document.body.style.cursor = 'default'; }}
    >
      {/* Plinth Base */}
      <mesh geometry={plinthGeo} position={[0, 0.22, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={isActive ? '#E0DCD2' : '#EAE7DF'} roughness={0.95} />
        <Edges geometry={plinthGeo} color={isActive ? '#1A1A1A' : '#4A4740'} linewidth={isActive ? 2.2 : 1} />
      </mesh>

      {/* Standing Manuscript Panel */}
      <mesh geometry={cardGeo} position={[0, 1.25, -0.02]} receiveShadow castShadow>
        <meshStandardMaterial color="#F9F8F3" roughness={0.88} />
        <Edges geometry={cardGeo} color={isActive ? '#1A1A1A' : '#2B2B2B'} linewidth={isActive ? 2 : 1} />
      </mesh>

      {/* High-Contrast Sharp Year Label */}
      <Text
        position={[0, 1.5, 0.08]}
        fontSize={0.32}
        color="#1A1A1A"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.1}
      >
        {String(event.year)}
      </Text>

      {/* High-Contrast Title Label */}
      <Text
        position={[0, 1.12, 0.08]}
        fontSize={0.11}
        color="#2B2B2B"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.18}
        textAlign="center"
      >
        {event.title.length > 22 ? event.title.slice(0, 22) + '…' : event.title}
      </Text>

      {/* Visited indicator */}
      {isVisited && (
        <mesh position={[0, 0.52, 0.06]}>
          <circleGeometry args={[0.07, 16]} />
          <meshBasicMaterial color="#1A1A1A" />
        </mesh>
      )}
    </group>
  );
}

// --- Century Interior Room ---
function CenturyInterior({
  century,
  visitedIds,
  activeEventId,
  onOpenEvent,
}: {
  century: Century;
  visitedIds: Set<string>;
  activeEventId: string | null;
  onOpenEvent: (event: QuantumEvent) => void;
}) {
  const events = century.events;
  const hasFork = century.id === 'c20' || century.id === 'c21';
  const stationsPerRow = Math.ceil(events.length / 2);

  const stationPositions: [number, number, number][] = useMemo(() => {
    return events.map((evt, i) => {
      if (hasFork) {
        const isFoundations = evt.track === 'foundations';
        const trackEvents = events.filter(e => e.track === evt.track);
        const trackIdx = trackEvents.findIndex(e => e.id === evt.id);
        const row = isFoundations ? -3.8 : 3.8;
        const totalTrack = trackEvents.length;
        return [trackIdx * 3.2 - (totalTrack * 1.6), 0, row] as [number, number, number];
      }
      const col = i % stationsPerRow;
      const row = Math.floor(i / stationsPerRow);
      return [col * 3.2 - (stationsPerRow * 1.6), 0, row * 4.2 - 2.1] as [number, number, number];
    });
  }, [events, hasFork, stationsPerRow]);

  const floorGeo = useMemo(() => new THREE.PlaneGeometry(54, 26), []);

  const forkX = useMemo(() => {
    if (!hasFork) return -8;
    const computingEvents = events.filter(e => e.track === 'computing');
    if (computingEvents.length === 0) return -8;
    const firstComputingIdx = events.findIndex(e => e.id === computingEvents[0].id);
    const pos = stationPositions[firstComputingIdx];
    return pos ? pos[0] - 2.8 : -8;
  }, [hasFork, events, stationPositions]);

  return (
    <group>
      {/* Room Floor Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow geometry={floorGeo}>
        <meshStandardMaterial color="#F5F2EA" roughness={0.96} />
      </mesh>

      {/* Room Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <planeGeometry args={[60, 32]} />
        <meshBasicMaterial color="#F9F8F3" side={2} />
      </mesh>

      {/* High Contrast Room Grid Lines */}
      {Array.from({ length: 14 }, (_, i) => (
        <Line
          key={`grid-x-${i}`}
          points={[[-27, -0.29, i * 2 - 13], [27, -0.29, i * 2 - 13]]}
          color="#C9C5BA"
          lineWidth={1}
        />
      ))}
      {Array.from({ length: 28 }, (_, i) => (
        <Line
          key={`grid-z-${i}`}
          points={[[i * 2 - 27, -0.29, -13], [i * 2 - 27, -0.29, 13]]}
          color="#C9C5BA"
          lineWidth={1}
        />
      ))}

      {/* Room Props for this era */}
      <RoomProp centuryId={century.id} />

      {/* Signpost for split tracks */}
      {hasFork && <ForkSignpost position={[forkX, -0.27, 0]} />}

      {/* Floor connecting lines */}
      {stationPositions.length > 1 && !hasFork && (
        <Line
          points={stationPositions.map(p => [p[0], -0.28, p[2]] as [number, number, number])}
          color="#1A1A1A"
          lineWidth={2}
        />
      )}

      {hasFork && (() => {
        const foundationsPositions = events
          .map((e, i) => ({ e, pos: stationPositions[i] }))
          .filter(({ e }) => e.track === 'foundations')
          .map(({ pos }) => [pos[0], -0.28, pos[2]] as [number, number, number]);
        const computingPositions = events
          .map((e, i) => ({ e, pos: stationPositions[i] }))
          .filter(({ e }) => e.track === 'computing')
          .map(({ pos }) => [pos[0], -0.28, pos[2]] as [number, number, number]);
        return (
          <>
            {foundationsPositions.length > 1 && (
              <Line points={foundationsPositions} color="#1A1A1A" lineWidth={2} />
            )}
            {computingPositions.length > 1 && (
              <Line points={computingPositions} color="#4B5563" lineWidth={2} />
            )}
          </>
        );
      })()}

      {/* Year Stations */}
      {events.map((event, i) => (
        <YearStation
          key={event.id}
          event={event}
          position={stationPositions[i]}
          isVisited={visitedIds.has(event.id)}
          isActive={activeEventId === event.id}
          onClick={() => onOpenEvent(event)}
        />
      ))}
    </group>
  );
}

// --- Camera Controller ---
function CameraController({ archiveState }: { archiveState: ArchiveState }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0, 18));
  const lookAtPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (archiveState.mode === 'stack') {
      targetPos.current.set(0, 0, 18);
      lookAtPos.current.set(0, 0, 0);
    } else if (archiveState.mode === 'inside' || archiveState.mode === 'detail') {
      targetPos.current.set(0, 6, 12);
      lookAtPos.current.set(0, 0.8, 0);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, 3, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, 3, delta);
    camera.lookAt(lookAtPos.current);
  });

  return null;
}

// --- Main ArchiveCanvas ---
export default function ArchiveCanvas({
  archiveState,
  onEnterCentury,
  onOpenEvent,
  onHoverCentury,
}: ArchiveCanvasProps) {
  const [hoveredCenturyId, setHoveredCenturyId] = useState<string | null>(null);

  const handleHover = useCallback((century: Century) => {
    setHoveredCenturyId(century.id);
    onHoverCentury(century);
  }, [onHoverCentury]);

  const handleLeave = useCallback(() => {
    setHoveredCenturyId(null);
    onHoverCentury(null);
  }, [onHoverCentury]);

  useEffect(() => {
    return () => { document.body.style.cursor = 'default'; };
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 45, position: [0, 0, 18] }}
      style={{ background: '#F3F0E6', width: '100%', height: '100%', backgroundColor: '#F3F0E6' }}
      shadows={false}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', clearColor: '#F3F0E6' } as any}
    >
      <color attach="background" args={['#F3F0E6']} />
      <fogExp2 args={['#E8E4D8', 0.006]} />

      <ambientLight intensity={1.6} color="#FFFBF5" />
      <directionalLight position={[-10, 16, 10]} intensity={0.8} color="#FFF8EF" />
      <directionalLight position={[10, 8, -10]} intensity={0.4} color="#ECE7DA" />

      <ContactShadows
        position={[0, -5.0, 0]}
        opacity={0.3}
        blur={2.5}
        far={16}
        scale={30}
      />

      <CameraController archiveState={archiveState} />

      {archiveState.mode === 'stack' && (
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          target={[0, 0, 0]}
          minDistance={8}
          maxDistance={26}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate
          autoRotateSpeed={0.3}
        />
      )}

      {/* STACK MODE: 5 Multi-Story Building Floors + Stairs */}
      {archiveState.mode === 'stack' && (
        <group>
          {CENTURIES.map((century, i) => (
            <CenturyBlock
              key={century.id}
              century={century}
              yPos={CENTURY_Y_POSITIONS[i]}
              isHovered={hoveredCenturyId === century.id}
              onHover={() => handleHover(century)}
              onLeave={handleLeave}
              onClick={() => onEnterCentury(century)}
            />
          ))}

          {CENTURIES.slice(0, -1).map((_, i) => (
            <StairConnector
              key={`stair-${i}`}
              fromY={CENTURY_Y_POSITIONS[i] + 0.28}
              toY={CENTURY_Y_POSITIONS[i + 1] - 0.28}
            />
          ))}
        </group>
      )}

      {/* INSIDE ROOM MODE: 3D Year Working Room */}
      {(archiveState.mode === 'inside' || archiveState.mode === 'detail') &&
        archiveState.activeCentury && (
          <CenturyInterior
            century={archiveState.activeCentury}
            visitedIds={archiveState.visitedIds}
            activeEventId={archiveState.activeYear?.id ?? null}
            onOpenEvent={onOpenEvent}
          />
        )}
    </Canvas>
  );
}