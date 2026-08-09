import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import GlassPanel from './GlassPanel';

function BlochSphereGlyph() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bloch sphere isometric glyph">
      <circle cx="40" cy="40" r="30" stroke="var(--ink)" strokeWidth="1.5" />
      <ellipse cx="40" cy="40" rx="30" ry="10" stroke="var(--ink)" strokeWidth="1.5" />
      <line x1="40" y1="10" x2="40" y2="70" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="40" cy="10" r="2.5" fill="var(--ink)" />
      <line x1="40" y1="40" x2="60" y2="25" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="60" cy="25" r="2" fill="var(--ink)" />
    </svg>
  );
}

function AtomOrbitGlyph() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Atom orbit isometric glyph">
      <circle cx="40" cy="40" r="5" fill="var(--ink)" />
      <ellipse cx="40" cy="40" rx="30" ry="12" stroke="var(--ink)" strokeWidth="1.5" />
      <ellipse cx="40" cy="40" rx="30" ry="12" stroke="var(--ink)" strokeWidth="1.5" transform="rotate(60 40 40)" />
      <ellipse cx="40" cy="40" rx="30" ry="12" stroke="var(--ink)" strokeWidth="1.5" transform="rotate(120 40 40)" />
      <circle cx="70" cy="40" r="2.5" fill="var(--ink)" />
    </svg>
  );
}

function WaveInterferenceGlyph() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Wave interference isometric glyph">
      <rect x="20" y="15" width="2" height="18" fill="var(--ink)" />
      <rect x="20" y="47" width="2" height="18" fill="var(--ink)" />
      <rect x="58" y="10" width="2" height="60" fill="var(--ink)" />
      {[0, 1, 2, 3, 4].map(i => (
        <rect
          key={`fringe-${i}`}
          x="62" y={14 + i * 12}
          width="4"
          height={6 - Math.abs(i - 2) * 1.5}
          fill="var(--ink)"
          opacity={1 - Math.abs(i - 2) * 0.25}
        />
      ))}
      <path d="M22,24 Q40,15 58,20" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
      <path d="M22,56 Q40,65 58,60" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
    </svg>
  );
}

function CircuitGateGlyph() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Quantum circuit gate isometric glyph">
      <line x1="8" y1="30" x2="72" y2="30" stroke="var(--ink)" strokeWidth="1.5" />
      <line x1="8" y1="50" x2="72" y2="50" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="20" y="22" width="16" height="16" stroke="var(--ink)" strokeWidth="1.5" fill="var(--paper)" />
      <text x="28" y="34" textAnchor="middle" fontSize="9" fill="var(--ink)" fontFamily="var(--font-display)">H</text>
      <circle cx="52" cy="30" r="5" stroke="var(--ink)" strokeWidth="1.5" fill="var(--paper)" />
      <line x1="52" y1="25" x2="52" y2="35" stroke="var(--ink)" strokeWidth="1.5" />
      <line x1="47" y1="30" x2="57" y2="30" stroke="var(--ink)" strokeWidth="1.5" />
      <line x1="52" y1="35" x2="52" y2="50" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="52" cy="50" r="3" fill="var(--ink)" />
    </svg>
  );
}

const GLYPHS = [
  { id: 'glyph-bloch', label: 'Bloch Sphere', depth: 2, depthFactor: 0.8, Component: BlochSphereGlyph, initialX: 60, initialY: 20, delay: 1.0 },
  { id: 'glyph-atom', label: 'Atom Orbit', depth: 1, depthFactor: 0.4, Component: AtomOrbitGlyph, initialX: 260, initialY: 60, delay: 1.15 },
  { id: 'glyph-wave', label: 'Wave Interference', depth: 3, depthFactor: 1.2, Component: WaveInterferenceGlyph, initialX: 140, initialY: 200, delay: 1.3 },
  { id: 'glyph-circuit', label: 'Circuit Gate', depth: 1, depthFactor: 0.5, Component: CircuitGateGlyph, initialX: 320, initialY: 180, delay: 1.45 },
];

export default function IsoGlyphs() {
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const handleMove = (e: MouseEvent) => {
      pointerX.set((e.clientX / window.innerWidth - 0.5) * 2);
      pointerY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [shouldReduceMotion, pointerX, pointerY]);

  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {GLYPHS.map((glyph) => (
        <GlyphItem
          key={glyph.id}
          glyph={glyph}
          pointerX={pointerX}
          pointerY={pointerY}
          shouldReduceMotion={!!shouldReduceMotion}
        />
      ))}
    </div>
  );
}

function GlyphItem({
  glyph,
  pointerX,
  pointerY,
  shouldReduceMotion,
}: {
  glyph: (typeof GLYPHS)[number];
  pointerX: ReturnType<typeof useMotionValue<number>>;
  pointerY: ReturnType<typeof useMotionValue<number>>;
  shouldReduceMotion: boolean;
}) {
  const springConfig = { stiffness: 60, damping: 20, mass: 0.8 };
  const driftX = useSpring(pointerX, springConfig);
  const driftY = useSpring(pointerY, springConfig);

  const { Component } = glyph;
  const parallaxStrength = glyph.depthFactor * 8;

  return (
    <motion.div
      className="absolute"
      style={{
        left: glyph.initialX,
        top: glyph.initialY,
        x: shouldReduceMotion ? 0 : (driftX as unknown as number) * parallaxStrength,
        y: shouldReduceMotion ? 0 : (driftY as unknown as number) * parallaxStrength,
      }}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: glyph.delay, type: 'spring', stiffness: 100, damping: 20 }}
    >
      <GlassPanel
        depth={glyph.depth as 1 | 2 | 3}
        className="p-4"
        style={{ width: 120, height: 120 }}
        whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -3 }}
        transition={{ duration: 0.2 }}
        data-liquid
      >
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <Component />
          <span
            className="font-body text-ink-soft text-center leading-tight"
            style={{ fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            {glyph.label}
          </span>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
