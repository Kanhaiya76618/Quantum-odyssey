import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import { useCircuitStore } from '../../store/circuitStore';
import { QUANTUM_EVENTS, type QuantumEvent } from '../../content/quantum_timeline';

// ─── Paper & Ink design tokens ───────────────────────────────────────────────
const N = {
  bg: '#FDFBF7',               // Warm Paper Background
  bg2: '#F5F2EA',              // Secondary Drafting Paper
  panel: '#FFFFFF',            // Crisp Manuscript Card
  panelBorder: '#1A1A1A',      // High-contrast ink border
  panelBorderSoft: '#D8D4C7',  // Soft drafting line
  cyan: '#0F766E',             // Deep teal ink
  violet: '#6D28D9',           // Rich violet ink
  pink: '#BE123C',             // Deep crimson ink
  amber: '#D97706',            // Warm amber / gold
  blue: '#1D4ED8',             // Cobalt blueprint ink
  gridLine: 'rgba(26,26,26,0.06)', // Engineering paper drafting grid
  textPrimary: '#0A0A0A',      // Pure ink black
  textSoft: '#4A4740',         // Soft ink text
  textDim: '#78756C',          // Muted drafting annotations
};

// ─── Quantum gate data ────────────────────────────────────────────────────────
const GATE_TYPES = ['H', 'X', 'Y', 'Z', 'CNOT', 'T', 'S', 'RZ', 'CX', 'SWAP'] as const;
type GateType = typeof GATE_TYPES[number];

// ─── Gate colors (Rich Ink Architectural Palette) ───────────────────────────
const GATE_COLORS: Record<GateType, string> = {
  H:    '#0F766E',
  X:    '#BE123C',
  Y:    '#6D28D9',
  Z:    '#1D4ED8',
  CNOT: '#D97706',
  T:    '#C2410C',
  S:    '#0F766E',
  RZ:   '#6D28D9',
  CX:   '#D97706',
  SWAP: '#BE123C',
};

// ─── Gate descriptions ────────────────────────────────────────────────────────
const GATE_DESCRIPTIONS: Record<GateType, string> = {
  H:    'Hadamard — creates equal superposition of |0⟩ and |1⟩',
  X:    'Pauli-X — quantum NOT gate, flips |0⟩ to |1⟩',
  Y:    'Pauli-Y — rotation around Y-axis by π',
  Z:    'Pauli-Z — phase flip, maps |1⟩ to -|1⟩',
  CNOT: 'Controlled-NOT — entangles two qubits',
  T:    'T gate — π/8 phase rotation',
  S:    'S gate — π/4 phase rotation',
  RZ:   'RZ gate — arbitrary rotation around Z-axis',
  CX:   'Controlled-X — equivalent to CNOT',
  SWAP: 'SWAP — exchanges states of two qubits',
};

interface Gate {
  id: string;
  type: GateType;
  qubit: number;
  col: number;
  color: string;
  active: boolean;
}

interface Qubit {
  id: number;
  label: string;
  state: '|0⟩' | '|1⟩' | '|+⟩' | '|-⟩' | '|ψ⟩';
  probability: number;
}

// ─── Gate error models (realistic per-gate error rates) ───────────────────────
const GATE_ERROR_RATES: Record<GateType, number> = {
  H:    0.0010,
  X:    0.0008,
  Y:    0.0012,
  Z:    0.0006,
  CNOT: 0.0050,
  T:    0.0015,
  S:    0.0010,
  RZ:   0.0018,
  CX:   0.0048,
  SWAP: 0.0090,
};

// Gate depth cost (some gates take more time steps)
const GATE_DEPTH_COST: Record<GateType, number> = {
  H: 1, X: 1, Y: 1, Z: 1, CNOT: 2, T: 1, S: 1, RZ: 1, CX: 2, SWAP: 3,
};

// ─── Circuit metrics computation ──────────────────────────────────────────────
function computeCircuitMetrics(gates: Gate[], cols: number) {
  if (gates.length === 0) {
    return { fidelity: 1.0, totalErrorRate: 0, depth: 0, tGateCount: 0, entanglingCount: 0, criticalPath: 0 };
  }
  // Fidelity: product of (1 - error_rate) for each gate
  let fidelity = 1.0;
  let totalErrorRate = 0;
  let tGateCount = 0;
  let entanglingCount = 0;

  for (const gate of gates) {
    const err = GATE_ERROR_RATES[gate.type];
    fidelity *= (1 - err);
    totalErrorRate += err;
    if (gate.type === 'T' || gate.type === 'S') tGateCount++;
    if (gate.type === 'CNOT' || gate.type === 'CX' || gate.type === 'SWAP') entanglingCount++;
  }

  // Depth: max column index used (each col = 1 time step, but weighted by gate depth cost)
  // Critical path: sum of max depth cost per column
  const colDepths: Record<number, number> = {};
  for (const gate of gates) {
    const cost = GATE_DEPTH_COST[gate.type];
    colDepths[gate.col] = Math.max(colDepths[gate.col] ?? 0, cost);
  }
  const depth = Object.values(colDepths).reduce((a, b) => a + b, 0);
  const criticalPath = Object.keys(colDepths).length;

  return {
    fidelity: Math.max(0, fidelity),
    totalErrorRate: Math.min(1, totalErrorRate),
    depth,
    tGateCount,
    entanglingCount,
    criticalPath,
  };
}

// ─── Fidelity color helper ────────────────────────────────────────────────────
function fidelityColor(f: number): string {
  if (f >= 0.95) return '#059669'; // Emerald
  if (f >= 0.85) return '#D97706'; // Amber
  if (f >= 0.70) return '#EA580C'; // Orange
  return '#DC2626';                 // Crimson
}

// ─── Initial circuit layout ───────────────────────────────────────────────────
function buildInitialGates(): Gate[] {
  const layout: Array<{ type: GateType; qubit: number; col: number }> = [
    { type: 'H', qubit: 0, col: 1 },
    { type: 'H', qubit: 1, col: 1 },
    { type: 'H', qubit: 2, col: 1 },
    { type: 'CNOT', qubit: 0, col: 2 },
    { type: 'X', qubit: 1, col: 3 },
    { type: 'Z', qubit: 2, col: 3 },
    { type: 'T', qubit: 0, col: 4 },
    { type: 'S', qubit: 1, col: 4 },
    { type: 'CNOT', qubit: 2, col: 5 },
    { type: 'RZ', qubit: 0, col: 6 },
    { type: 'Y', qubit: 1, col: 6 },
    { type: 'H', qubit: 2, col: 7 },
    { type: 'CX', qubit: 0, col: 8 },
    { type: 'SWAP', qubit: 1, col: 8 },
    { type: 'T', qubit: 2, col: 9 },
  ];
  return layout.map((g, i) => ({
    ...g,
    id: `gate-${i}`,
    color: GATE_COLORS[g.type],
    active: false,
  }));
}

const INITIAL_QUBITS: Qubit[] = [
  { id: 0, label: 'q₀', state: '|0⟩', probability: 0.5 },
  { id: 1, label: 'q₁', state: '|+⟩', probability: 0.72 },
  { id: 2, label: 'q₂', state: '|ψ⟩', probability: 0.31 },
];

// ─── Bloch Sphere SVG (Paper & Ink) ──────────────────────────────────────────
function BlochSphere({ theta, phi, color }: { theta: number; phi: number; color: string }) {
  let cx = 60, cy = 60, r = 44;
  const stateX = cx + r * 0.7 * Math.sin(theta) * Math.cos(phi);
  const stateY = cy - r * 0.7 * Math.cos(theta);
  return (
    <svg width={120} height={120} viewBox="0 0 120 120" style={{ background: '#FDFBF7', borderRadius: 8, border: '1px solid #1A1A1A' }}>
      {/* Sphere outline */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A1A1A" strokeWidth={1.2} />
      {/* Equator ellipse */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3} fill="none" stroke="#6B685F" strokeWidth={0.8} strokeDasharray="3 3" />
      {/* Meridian */}
      <ellipse cx={cx} cy={cy} rx={r * 0.3} ry={r} fill="none" stroke="#6B685F" strokeWidth={0.8} strokeDasharray="3 3" />
      {/* Axes */}
      <line x1={cx} y1={cy - r - 6} x2={cx} y2={cy + r + 6} stroke="#1A1A1A" strokeWidth={1} />
      <line x1={cx - r - 6} y1={cy} x2={cx + r + 6} y2={cy} stroke="#1A1A1A" strokeWidth={1} />
      {/* Axis labels */}
      <text x={cx + 2} y={cy - r - 8} fill="#0A0A0A" fontSize={8} fontWeight="bold" fontFamily="JetBrains Mono, monospace">|0⟩</text>
      <text x={cx + 2} y={cy + r + 14} fill="#0A0A0A" fontSize={8} fontWeight="bold" fontFamily="JetBrains Mono, monospace">|1⟩</text>
      {/* State vector */}
      <line x1={cx} y1={cy} x2={stateX} y2={stateY} stroke={color} strokeWidth={2.5} />
      <circle cx={stateX} cy={stateY} r={4.5} fill={color} stroke="#1A1A1A" strokeWidth={1} />
    </svg>
  );
}

// ─── Probability Bar ──────────────────────────────────────────────────────────
function ProbBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4A4740', width: 20, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#EAE7DF', borderRadius: 3, border: '1px solid #D8D4C7', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, borderRadius: 2 }}
        />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#0A0A0A', fontWeight: 700, width: 36, textAlign: 'right' }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Circuit Metrics Bar (inline, real-time) ──────────────────────────────────
function CircuitMetricsBar({
  gates,
  cols,
  isRunning,
  runComplete,
}: {
  gates: Gate[];
  cols: number;
  isRunning: boolean;
  runComplete: boolean;
}) {
  const metrics = computeCircuitMetrics(gates, cols);
  const fc = fidelityColor(metrics.fidelity);
  const fidelityPct = (metrics.fidelity * 100).toFixed(2);
  const errorPct = (metrics.totalErrorRate * 100).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: '#FDFBF7',
        border: `1.5px solid #1A1A1A`,
        borderRadius: 10,
        padding: '14px 18px',
        marginTop: 14,
        boxShadow: '3px 3px 0px rgba(26,26,26,0.06)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A4740', fontWeight: 700 }}>
          {runComplete ? '▶ Post-Run Analysis' : '◈ Live Circuit Metrics'}
        </span>
        {isRunning && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.amber, fontWeight: 700, letterSpacing: '0.1em' }}>
            COMPUTING…
          </span>
        )}
        {runComplete && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: fc, fontWeight: 700, letterSpacing: '0.1em' }}
          >
            ✓ ANALYSIS COMPLETE
          </motion.span>
        )}
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {/* Fidelity */}
        <div style={{ background: '#FFFFFF', border: `1px solid #1A1A1A`, borderRadius: 8, padding: '10px 12px', boxShadow: '2px 2px 0px rgba(26,26,26,0.04)' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: '#4A4740', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Circuit Fidelity
          </div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 800, color: fc, lineHeight: 1 }}>
            {fidelityPct}%
          </div>
          {/* Fidelity bar */}
          <div style={{ marginTop: 6, height: 4, background: '#EAE7DF', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${metrics.fidelity * 100}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: fc, borderRadius: 2 }}
            />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#78756C', marginTop: 4 }}>
            {metrics.fidelity >= 0.95 ? 'Excellent' : metrics.fidelity >= 0.85 ? 'Good' : metrics.fidelity >= 0.70 ? 'Fair' : 'Poor'}
          </div>
        </div>

        {/* Gate Error Model */}
        <div style={{ background: '#FFFFFF', border: `1px solid #1A1A1A`, borderRadius: 8, padding: '10px 12px', boxShadow: '2px 2px 0px rgba(26,26,26,0.04)' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: '#4A4740', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Gate Error Model
          </div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 800, color: N.pink, lineHeight: 1 }}>
            {errorPct}%
          </div>
          <div style={{ marginTop: 6, height: 4, background: '#EAE7DF', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${Math.min(metrics.totalErrorRate * 100 * 5, 100)}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: N.pink, borderRadius: 2 }}
            />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#78756C', marginTop: 4 }}>
            {gates.length} gates · {metrics.entanglingCount} entangling
          </div>
        </div>

        {/* Execution Depth */}
        <div style={{ background: '#FFFFFF', border: `1px solid #1A1A1A`, borderRadius: 8, padding: '10px 12px', boxShadow: '2px 2px 0px rgba(26,26,26,0.04)' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: '#4A4740', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Exec Depth
          </div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 800, color: N.violet, lineHeight: 1 }}>
            {metrics.depth}
          </div>
          <div style={{ marginTop: 6, height: 4, background: '#EAE7DF', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${Math.min((metrics.depth / 30) * 100, 100)}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: N.violet, borderRadius: 2 }}
            />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#78756C', marginTop: 4 }}>
            {metrics.criticalPath} cols · {metrics.tGateCount} T/S gates
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Gate SVG (Paper & Ink Stamp Block) ───────────────────────────────────────
function GateSVG({ type, color, active }: { type: GateType; color: string; active: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        border: `1.5px solid #1A1A1A`,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? '#FEF3C7' : '#FFFFFF',
        boxShadow: active ? `0 0 0 2px ${color}` : `2px 2px 0px rgba(26,26,26,0.12)`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: type.length > 2 ? 8 : 11,
          fontWeight: 800,
          color,
          letterSpacing: '-0.02em',
        }}
      >
        {type}
      </span>
      {active && (
        <div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: 8,
            border: `1.5px solid ${color}`,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

// ─── Circuit Wire Row (Paper & Ink Blueprint Wire) ───────────────────────────
function CircuitRow({
  qubit,
  gates,
  cols,
  onGateClick,
  activeCol,
}: {
  qubit: Qubit;
  gates: Gate[];
  cols: number;
  onGateClick: (gate: Gate) => void;
  activeCol: number;
}) {
  const rowGates = gates.filter(g => g.qubit === qubit.id);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative', height: 52 }}>
      {/* Qubit label */}
      <div
        style={{
          width: 52,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          paddingRight: 10,
          gap: 2,
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#0A0A0A', fontWeight: 800 }}>
          {qubit.label}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
          {qubit.state}
        </span>
      </div>

      {/* Wire + gates */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Wire line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1.5,
            background: '#1A1A1A',
          }}
        />
        {/* Active column pulse */}
        {Array.from({ length: cols }).map((_, col) => {
          const gate = rowGates.find(g => g.col === col);
          const colWidth = 52;
          const x = col * colWidth + colWidth / 2 - 18;
          return (
            <div
              key={col}
              style={{
                position: 'absolute',
                left: x,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: gate ? 2 : 1,
              }}
            >
              {gate ? (
                <div onClick={() => onGateClick(gate)}>
                  <GateSVG type={gate.type} color={gate.color} active={gate.active || col === activeCol} />
                </div>
              ) : col === activeCol ? (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#D97706',
                    opacity: 0.8,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Measurement */}
      <div
        style={{
          width: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: `1.5px solid ${N.cyan}80`,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M2 12 Q8 2 14 12" stroke={N.cyan} strokeWidth={1.5} fill="none" opacity={0.7} />
            <line x1={8} y1={12} x2={11} y2={6} stroke={N.cyan} strokeWidth={1.5} opacity={0.9} />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Paper Grid Background ───────────────────────────────────────────────────
function PaperGrid() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(26,26,26,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(26,26,26,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
        backgroundColor: '#FDFBF7',
      }}
    />
  );
}

// ─── Floating Particle ────────────────────────────────────────────────────────
function Particle({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}`,
        pointerEvents: 'none',
      }}
      animate={{
        y: [0, -30, 0],
        opacity: [0, 0.8, 0],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── Quantum Event Panel ──────────────────────────────────────────────────────
function QuantumEventPanel({
  event,
  onClose,
}: {
  event: QuantumEvent;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 360,
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'rgba(242,240,234,0.95)',
        border: `1px solid ${N.panelBorder}`,
        borderRadius: 16,
        padding: 28,
        zIndex: 50,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 0 40px rgba(0,255,209,0.08), 0 24px 64px rgba(0,0,0,0.6)`,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'none',
          border: `1px solid ${N.panelBorder}`,
          borderRadius: 6,
          color: N.textSoft,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
        }}
      >
        ✕
      </button>
      <div style={{ marginBottom: 6 }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: N.cyan,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {event.track} · {event.act}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 28,
          fontWeight: 700,
          color: N.cyan,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {event.year}
      </div>
      <div
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          fontWeight: 600,
          color: N.textPrimary,
          marginBottom: 16,
          lineHeight: 1.3,
        }}
      >
        {event.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {event.people.map(p => (
          <span
            key={p}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: N.violet,
              border: `1px solid ${N.violet}50`,
              borderRadius: 4,
              padding: '2px 8px',
              background: `${N.violet}10`,
            }}
          >
            {p}
          </span>
        ))}
      </div>
      {[
        { label: 'DISCOVERY', text: event.discovery },
        { label: 'EVIDENCE', text: event.evidence },
        { label: 'SIGNIFICANCE', text: event.significance },
      ].map(({ label, text }) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: N.cyan,
              marginBottom: 5,
              opacity: 0.7,
            }}
          >
            {label}
          </div>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              color: N.textSoft,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {text}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Gate Info Tooltip ────────────────────────────────────────────────────────
function GateTooltip({ gate, onClose }: { gate: Gate; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(242,240,234,0.96)',
        border: `1px solid ${gate.color}50`,
        borderRadius: 10,
        padding: '12px 20px',
        zIndex: 60,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 0 20px ${gate.color}20`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: `1.5px solid ${gate.color}`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${gate.color}15`,
          boxShadow: `0 0 8px ${gate.color}40`,
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: gate.color }}>
          {gate.type}
        </span>
      </div>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: gate.color, marginBottom: 2 }}>
          {gate.type} Gate
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: N.textSoft }}>
          {GATE_DESCRIPTIONS[gate.type]}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: N.textDim, cursor: 'pointer', fontSize: 14, padding: 4 }}
      >
        ✕
      </button>
    </motion.div>
  );
}

// ─── Download Modal ───────────────────────────────────────────────────────────
function DownloadModal({
  gates,
  qubits,
  blochAngles,
  onClose,
}: {
  gates: Gate[];
  qubits: Qubit[];
  blochAngles: Array<{ theta: number; phi: number }>;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const gateSequence = gates
    .sort((a, b) => a.col - b.col || a.qubit - b.qubit)
    .map(g => `${g.type}(q${g.qubit},col${g.col})`)
    .join(' → ');

  const downloadSVG = useCallback(() => {
    setDownloading('svg');
    const COLS = 11;
    const COL_W = 52;
    const ROW_H = 52;
    const LABEL_W = 52;
    const MEAS_W = 40;
    const PAD = 24;
    const W = LABEL_W + COLS * COL_W + MEAS_W + PAD * 2;
    const H = qubits.length * ROW_H + 80 + PAD * 2;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    svgContent += `<rect width="${W}" height="${H}" fill="#F2F0EA"/>`;
    // Grid lines
    for (let i = 0; i <= COLS; i++) {
      const x = PAD + LABEL_W + i * COL_W;
      svgContent += `<line x1="${x}" y1="${PAD}" x2="${x}" y2="${H - PAD}" stroke="rgba(0,255,209,0.07)" stroke-width="1"/>`;
    }
    // Title
    svgContent += `<text x="${PAD}" y="${PAD + 16}" font-family="JetBrains Mono, monospace" font-size="10" fill="${N.cyan}" opacity="0.7" letter-spacing="2">QUANTUM CIRCUIT — ${qubits.length} QUBITS · ${COLS - 1} COLUMNS</text>`;

    // Qubit rows
    qubits.forEach((q, qi) => {
      const y = PAD + 40 + qi * ROW_H + ROW_H / 2;
      const colors = [N.cyan, N.violet, N.pink];
      const color = colors[qi];
      // Wire
      svgContent += `<line x1="${PAD + LABEL_W}" y1="${y}" x2="${PAD + LABEL_W + COLS * COL_W}" y2="${y}" stroke="${color}" stroke-width="1" opacity="0.4"/>`;
      // Label
      svgContent += `<text x="${PAD + LABEL_W - 8}" y="${y + 4}" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="${color}" text-anchor="end">${q.label}</text>`;
      svgContent += `<text x="${PAD + LABEL_W - 8}" y="${y + 16}" font-family="JetBrains Mono, monospace" font-size="9" fill="${N.textDim}" text-anchor="end">${q.state}</text>`;
      // Gates on this row
      gates.filter(g => g.qubit === qi).forEach(g => {
        const gx = PAD + LABEL_W + g.col * COL_W + COL_W / 2 - 18;
        const gy = y - 18;
        svgContent += `<rect x="${gx}" y="${gy}" width="36" height="36" rx="6" fill="${g.color}15" stroke="${g.color}" stroke-width="1.5"/>`;
        svgContent += `<text x="${gx + 18}" y="${gy + 22}" font-family="JetBrains Mono, monospace" font-size="${g.type.length > 2 ? 7 : 10}" font-weight="700" fill="${g.color}" text-anchor="middle">${g.type}</text>`;
      });
      // Measurement
      const mx = PAD + LABEL_W + COLS * COL_W + 6;
      svgContent += `<rect x="${mx}" y="${y - 14}" width="28" height="28" rx="4" fill="none" stroke="${N.cyan}" stroke-width="1.5" opacity="0.5"/>`;
      svgContent += `<path d="M${mx + 4} ${y + 12} Q${mx + 14} ${y - 4} ${mx + 24} ${y + 12}" stroke="${N.cyan}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
      svgContent += `<line x1="${mx + 14}" y1="${y + 12}" x2="${mx + 20}" y2="${y - 2}" stroke="${N.cyan}" stroke-width="1.5" opacity="0.9"/>`;
    });

    // Bloch spheres section
    const blochY = PAD + 40 + qubits.length * ROW_H + 20;
    svgContent += `<text x="${PAD}" y="${blochY}" font-family="JetBrains Mono, monospace" font-size="9" fill="${N.textDim}" letter-spacing="2">BLOCH SPHERE STATES</text>`;
    const blochColors = [N.cyan, N.violet, N.pink];
    qubits.forEach((q, i) => {
      const bx = PAD + i * 130;
      const by = blochY + 10;
      let cx = bx + 50, cy = by + 50, r = 40;
      const { theta, phi } = blochAngles[i];
      const sx = cx + r * 0.7 * Math.sin(theta) * Math.cos(phi);
      const sy = cy - r * 0.7 * Math.cos(theta);
      const color = blochColors[i];
      svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
      svgContent += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.3}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.2" stroke-dasharray="3 3"/>`;
      svgContent += `<line x1="${cx}" y1="${cy - r - 5}" x2="${cx}" y2="${cy + r + 5}" stroke="${color}" stroke-width="0.8" opacity="0.35"/>`;
      svgContent += `<line x1="${cx - r - 5}" y1="${cy}" x2="${cx + r + 5}" y2="${cy}" stroke="${color}" stroke-width="0.8" opacity="0.35"/>`;
      svgContent += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="${color}" stroke-width="2"/>`;
      svgContent += `<circle cx="${sx}" cy="${sy}" r="4" fill="${color}"/>`;
      svgContent += `<text x="${cx}" y="${by + r * 2 + 20}" font-family="JetBrains Mono, monospace" font-size="10" fill="${color}" text-anchor="middle">${q.label} ${q.state}</text>`;
    });

    // Gate sequence
    const seqY = blochY + 130;
    svgContent += `<text x="${PAD}" y="${seqY}" font-family="JetBrains Mono, monospace" font-size="9" fill="${N.textDim}" letter-spacing="2">GATE SEQUENCE</text>`;
    svgContent += `<text x="${PAD}" y="${seqY + 16}" font-family="JetBrains Mono, monospace" font-size="9" fill="${N.cyan}" opacity="0.8">${gateSequence.substring(0, 120)}</text>`;

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-circuit-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(null);
    setDone('svg');
    setTimeout(() => setDone(null), 2000);
  }, [gates, qubits, blochAngles, gateSequence]);

  const downloadPNG = useCallback(() => {
    setDownloading('png');
    const COLS = 11;
    const COL_W = 52;
    const ROW_H = 52;
    const LABEL_W = 52;
    const MEAS_W = 40;
    const PAD = 24;
    const W = LABEL_W + COLS * COL_W + MEAS_W + PAD * 2;
    const H = qubits.length * ROW_H + 200 + PAD * 2;

    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setDownloading(null); return; }
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#F2F0EA';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,255,209,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      const x = PAD + LABEL_W + i * COL_W;
      ctx.beginPath();
      ctx.moveTo(x, PAD);
      ctx.lineTo(x, H - PAD);
      ctx.stroke();
    }

    // Title
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = N.cyan;
    ctx.globalAlpha = 0.7;
    ctx.fillText(`QUANTUM CIRCUIT — ${qubits.length} QUBITS · ${COLS - 1} COLUMNS`, PAD, PAD + 16);
    ctx.globalAlpha = 1;

    const blochColors = [N.cyan, N.violet, N.pink];

    qubits.forEach((q, qi) => {
      const y = PAD + 40 + qi * ROW_H + ROW_H / 2;
      const color = blochColors[qi];

      // Wire
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD + LABEL_W, y);
      ctx.lineTo(PAD + LABEL_W + COLS * COL_W, y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Label
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(q.label, PAD + LABEL_W - 8, y + 4);
      ctx.font = '400 9px "JetBrains Mono", monospace';
      ctx.fillStyle = N.textDim;
      ctx.fillText(q.state, PAD + LABEL_W - 8, y + 16);
      ctx.textAlign = 'left';

      // Gates
      gates.filter(g => g.qubit === qi).forEach(g => {
        const gx = PAD + LABEL_W + g.col * COL_W + COL_W / 2 - 18;
        const gy = y - 18;
        ctx.fillStyle = `${g.color}15`;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(gx, gy, 36, 36, 6);
        ctx.fill();
        ctx.stroke();
        ctx.font = `700 ${g.type.length > 2 ? 7 : 10}px "JetBrains Mono", monospace`;
        ctx.fillStyle = g.color;
        ctx.textAlign = 'center';
        ctx.fillText(g.type, gx + 18, gy + 22);
        ctx.textAlign = 'left';
      });

      // Measurement box
      const mx = PAD + LABEL_W + COLS * COL_W + 6;
      ctx.strokeStyle = N.cyan;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx, y - 14, 28, 28, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Bloch spheres
    const blochY = PAD + 40 + qubits.length * ROW_H + 20;
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = N.textDim;
    ctx.fillText('BLOCH SPHERE STATES', PAD, blochY);

    qubits.forEach((q, i) => {
      const bx = PAD + i * 130 + 50;
      const by = blochY + 60;
      let r = 40;
      const { theta, phi } = blochAngles[i];
      const sx = bx + r * 0.7 * Math.sin(theta) * Math.cos(phi);
      const sy = by - r * 0.7 * Math.cos(theta);
      const color = blochColors[i];

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(`${q.label} ${q.state}`, bx, by + r + 16);
      ctx.textAlign = 'left';
    });

    // Gate sequence
    const seqY = blochY + r + 50;
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = N.textDim;
    ctx.fillText('GATE SEQUENCE', PAD, seqY);
    ctx.fillStyle = N.cyan;
    ctx.globalAlpha = 0.8;
    ctx.fillText(gateSequence.substring(0, 100), PAD, seqY + 16);
    ctx.globalAlpha = 1;

    canvas.toBlob(blob => {
      if (!blob) { setDownloading(null); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantum-circuit-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(null);
      setDone('png');
      setTimeout(() => setDone(null), 2000);
    }, 'image/png');
  }, [gates, qubits, blochAngles, gateSequence]);

  const downloadGateSequence = useCallback(() => {
    setDownloading('txt');
    const lines = [
      '# Quantum Circuit — Gate Sequence Export',
      `# Generated: ${new Date().toISOString()}`,
      `# Qubits: ${qubits.length}`,
      '',
      '## Gate Sequence',
      gateSequence,
      '',
      '## Gate Details',
      ...gates
        .sort((a, b) => a.col - b.col || a.qubit - b.qubit)
        .map(g => `Col ${g.col} | Qubit ${g.qubit} (${qubits[g.qubit]?.label}) | Gate: ${g.type} — ${GATE_DESCRIPTIONS[g.type]}`),
      '',
      '## Qubit States',
      ...qubits.map((q, i) => `${q.label}: ${q.state} | |0⟩ prob: ${(q.probability * 100).toFixed(0)}% | |1⟩ prob: ${((1 - q.probability) * 100).toFixed(0)}%`),
      '',
      '## Bloch Sphere Angles',
      ...blochAngles.map((a, i) => `${qubits[i]?.label}: θ=${a.theta.toFixed(3)} φ=${a.phi.toFixed(3)}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-circuit-sequence-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(null);
    setDone('txt');
    setTimeout(() => setDone(null), 2000);
  }, [gates, qubits, blochAngles, gateSequence]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,26,0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 440,
          background: '#FFFFFF',
          border: `1.5px solid #1A1A1A`,
          borderRadius: 16,
          padding: 32,
          boxShadow: `6px 6px 0px rgba(26,26,26,0.12)`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.cyan, letterSpacing: '0.14em', marginBottom: 4, opacity: 0.7 }}>
              EXPORT CIRCUIT
            </div>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: N.textPrimary }}>
              Download
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: `1px solid ${N.panelBorder}`, borderRadius: 8, color: N.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
          >
            ✕
          </button>
        </div>

        {/* Preview info */}
        <div style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', marginBottom: 8 }}>CIRCUIT SUMMARY</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: N.textSoft, lineHeight: 1.8 }}>
            <div>{qubits.length} qubits · {gates.length} gates · {10} columns</div>
            <div style={{ color: N.cyan, fontSize: 10, marginTop: 4, opacity: 0.8, wordBreak: 'break-all' }}>
              {gateSequence.substring(0, 80)}{gateSequence.length > 80 ? '…' : ''}
            </div>
          </div>
        </div>

        {/* Export options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              key: 'svg',
              label: 'Circuit Diagram + Bloch States',
              sub: 'SVG vector — scalable, editable',
              icon: '⬡',
              color: N.cyan,
              action: downloadSVG,
            },
            {
              key: 'png',
              label: 'Circuit Diagram + Bloch States',
              sub: 'PNG raster — 2× retina quality',
              icon: '▣',
              color: N.violet,
              action: downloadPNG,
            },
            {
              key: 'txt',
              label: 'Gate Sequence + Qubit States',
              sub: 'Plain text — machine-readable',
              icon: '≡',
              color: N.amber,
              action: downloadGateSequence,
            },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={opt.action}
              disabled={downloading !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: downloading === opt.key ? `${opt.color}15` : N.panel,
                border: `1px solid ${done === opt.key ? opt.color : downloading === opt.key ? `${opt.color}60` : N.panelBorder}`,
                borderRadius: 10,
                cursor: downloading !== null ? 'wait' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: done === opt.key ? `0 0 12px ${opt.color}30` : 'none',
              }}
            >
              <div style={{ width: 36, height: 36, border: `1.5px solid ${opt.color}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${opt.color}10`, flexShrink: 0 }}>
                <span style={{ fontSize: 16, color: opt.color }}>{opt.icon}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: N.textPrimary, marginBottom: 2 }}>
                  {opt.label}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim }}>
                  {opt.sub}
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: done === opt.key ? opt.color : N.textDim, flexShrink: 0 }}>
                {downloading === opt.key ? '…' : done === opt.key ? '✓' : opt.key.toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── State Vector types ───────────────────────────────────────────────────────
interface StateAmplitude {
  basis: string;
  real: number;
  imag: number;
  probability: number;
  phase: number;
}

// ─── Noise model types ────────────────────────────────────────────────────────
interface NoiseConfig {
  enabled: boolean;
  depolarizing: number;   // 0–1 probability per gate
  bitFlip: number;        // 0–1 probability per gate
  phaseFlip: number;      // 0–1 probability per gate
  amplitude: number;      // T1 amplitude damping (0–1)
  readout: number;        // readout error (0–1)
  model: 'ideal' | 'ibm_nairobi' | 'ibm_lagos' | 'custom';
}

const NOISE_PRESETS: Record<string, NoiseConfig> = {
  ideal: { enabled: false, depolarizing: 0, bitFlip: 0, phaseFlip: 0, amplitude: 0, readout: 0, model: 'ideal' },
  ibm_nairobi: { enabled: true, depolarizing: 0.0012, bitFlip: 0.0008, phaseFlip: 0.0006, amplitude: 0.0015, readout: 0.012, model: 'ibm_nairobi' },
  ibm_lagos: { enabled: true, depolarizing: 0.0018, bitFlip: 0.0011, phaseFlip: 0.0009, amplitude: 0.0022, readout: 0.018, model: 'ibm_lagos' },
  custom: { enabled: true, depolarizing: 0.005, bitFlip: 0.003, phaseFlip: 0.002, amplitude: 0.004, readout: 0.02, model: 'custom' },
};

// ─── Noise Simulation Panel ───────────────────────────────────────────────────
function NoisePanel({ isOpen, onClose, config, onChange }: {
  isOpen: boolean;
  onClose: () => void;
  config: NoiseConfig;
  onChange: (c: NoiseConfig) => void;
}) {
  const sliders: Array<{ key: keyof NoiseConfig; label: string; max: number; color: string }> = [
    { key: 'depolarizing', label: 'Depolarizing', max: 0.05, color: N.pink },
    { key: 'bitFlip',      label: 'Bit-Flip',     max: 0.05, color: N.amber },
    { key: 'phaseFlip',    label: 'Phase-Flip',   max: 0.05, color: N.violet },
    { key: 'amplitude',    label: 'Amplitude Damp', max: 0.05, color: N.blue },
    { key: 'readout',      label: 'Readout Error', max: 0.1,  color: N.cyan },
  ];

  const noisyFidelity = config.enabled
    ? Math.max(0, 1 - (config.depolarizing + config.bitFlip + config.phaseFlip + config.amplitude) * 15 - config.readout * 3)
    : 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.45)', backdropFilter: 'blur(8px)', zIndex: 85, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, overflowY: 'auto' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{ width: 520, background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, overflow: 'hidden', boxShadow: `6px 6px 0px rgba(26,26,26,0.12)`, marginBottom: 40 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${N.panelBorder}`, background: `linear-gradient(135deg, rgba(255,45,120,0.06) 0%, transparent 60%)` }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: N.pink, marginBottom: 4, textTransform: 'uppercase' }}>⚡ Noise Simulation</div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: N.textPrimary }}>Noise Model</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => onChange({ ...config, enabled: !config.enabled })}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: config.enabled ? N.bg : N.pink, background: config.enabled ? N.pink : 'transparent', border: `1.5px solid ${N.pink}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {config.enabled ? 'ON' : 'OFF'}
                </button>
                <button onClick={onClose} style={{ background: 'none', border: `1px solid ${N.panelBorder}`, borderRadius: 8, color: N.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            </div>

            {/* Preset selector */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${N.panelBorder}` }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Hardware Presets</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['ideal', 'ibm_nairobi', 'ibm_lagos', 'custom'] as const).map(preset => (
                  <button
                    key={preset}
                    onClick={() => onChange(NOISE_PRESETS[preset])}
                    style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: config.model === preset ? N.bg : N.textSoft, background: config.model === preset ? N.pink : N.panel, border: `1px solid ${config.model === preset ? N.pink : N.panelBorder}`, borderRadius: 6, padding: '7px 4px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.15s' }}
                  >
                    {preset === 'ibm_nairobi' ? 'Nairobi' : preset === 'ibm_lagos' ? 'Lagos' : preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sliders.map(({ key, label, max, color }) => {
                const val = config[key] as number;
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft }}>{label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color, fontWeight: 700 }}>{(val * 100).toFixed(3)}%</span>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(val / max) * 100}%`, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}60`, transition: 'width 0.1s' }} />
                      <input
                        type="range"
                        min={0}
                        max={max}
                        step={max / 200}
                        value={val}
                        disabled={!config.enabled}
                        onChange={e => onChange({ ...config, [key]: parseFloat(e.target.value), model: 'custom' })}
                        style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: config.enabled ? 'pointer' : 'not-allowed', height: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Noisy fidelity estimate */}
            <div style={{ margin: '0 24px 20px', background: `${N.pink}08`, border: `1px solid ${N.pink}30`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Estimated Noisy Fidelity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700, color: fidelityColor(noisyFidelity) }}>{(noisyFidelity * 100).toFixed(1)}%</div>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${noisyFidelity * 100}%`, background: fidelityColor(noisyFidelity), borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, marginTop: 4 }}>
                {config.enabled ? `Noise model active — ${config.model}` : 'Ideal (no noise)'}
              </div>
            </div>

            <div style={{ padding: '12px 24px', borderTop: `1px solid ${N.panelBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Step Debugger ────────────────────────────────────────────────────────────
interface DebugFrame {
  step: number;
  gateLabel: string;
  qubit: number;
  col: number;
  stateVector: StateAmplitude[];
  qubitSnapshots: Array<{ label: string; prob0: number; prob1: number; state: string }>;
  gateProbability: number;
  cumulativeFidelity: number;
}

function buildDebugFrames(gates: Gate[], noiseConfig: NoiseConfig): DebugFrame[] {
  const nQubits = 3;
  const dim = 1 << nQubits;
  const real = new Array(dim).fill(0);
  const imag = new Array(dim).fill(0);
  real[0] = 1;

  const sorted = [...gates].sort((a, b) => a.col - b.col || a.qubit - b.qubit);
  const frames: DebugFrame[] = [];

  // Initial frame
  const initAmps: StateAmplitude[] = Array.from({ length: dim }, (_, i) => {
    let r = real[i], im = imag[i];
    return { basis: `|${i.toString(2).padStart(nQubits, '0')}⟩`, real: r, imag: im, probability: r*r+im*im, phase: Math.atan2(im, r) };
  });
  frames.push({
    step: 0, gateLabel: 'INIT', qubit: -1, col: 0,
    stateVector: initAmps,
    qubitSnapshots: INITIAL_QUBITS.map(q => ({ label: q.label, prob0: 1, prob1: 0, state: '|0⟩' })),
    gateProbability: 1, cumulativeFidelity: 1,
  });

  let cumFidelity = 1;

  for (let gi = 0; gi < sorted.length; gi++) {
    const gate = sorted[gi];
    const q = gate.qubit;

    // Apply gate (same logic as computeStateVector)
    switch (gate.type) {
      case 'H': {
        const nr = [...real], ni = [...imag];
        for (let i = 0; i < dim; i++) {
          const bit = (i >> (nQubits - 1 - q)) & 1;
          const partner = i ^ (1 << (nQubits - 1 - q));
          if (bit === 0) { nr[i] = (real[i] + real[partner]) / Math.SQRT2; ni[i] = (imag[i] + imag[partner]) / Math.SQRT2; }
          else { nr[i] = (real[partner] - real[i]) / Math.SQRT2; ni[i] = (imag[partner] - imag[i]) / Math.SQRT2; }
        }
        for (let i = 0; i < dim; i++) { real[i] = nr[i]; imag[i] = ni[i]; }
        break;
      }
      case 'X': {
        for (let i = 0; i < dim; i++) {
          const p = i ^ (1 << (nQubits - 1 - q));
          if (i < p) { [real[i], real[p]] = [real[p], real[i]]; [imag[i], imag[p]] = [imag[p], imag[i]]; }
        }
        break;
      }
      case 'Z': {
        for (let i = 0; i < dim; i++) { if ((i >> (nQubits - 1 - q)) & 1) { real[i] = -real[i]; imag[i] = -imag[i]; } }
        break;
      }
      case 'Y': {
        for (let i = 0; i < dim; i++) {
          const p = i ^ (1 << (nQubits - 1 - q));
          if (i < p) { const r0=real[i],im0=imag[i],r1=real[p],im1=imag[p]; real[i]=im1; imag[i]=-r1; real[p]=-im0; imag[p]=r0; }
        }
        break;
      }
      case 'S': {
        for (let i = 0; i < dim; i++) { if ((i >> (nQubits - 1 - q)) & 1) { let r=real[i],im=imag[i]; real[i]=-im; imag[i]=r; } }
        break;
      }
      case 'T': {
        let c=Math.cos(Math.PI/4), s=Math.sin(Math.PI/4);
        for (let i = 0; i < dim; i++) { if ((i >> (nQubits - 1 - q)) & 1) { let r=real[i],im=imag[i]; real[i]=r*c-im*s; imag[i]=r*s+im*c; } }
        break;
      }
      case 'CNOT': case 'CX': {
        const tgt = (q + 1) % nQubits;
        for (let i = 0; i < dim; i++) {
          if ((i >> (nQubits - 1 - q)) & 1) {
            const p = i ^ (1 << (nQubits - 1 - tgt));
            if (i < p) { [real[i], real[p]] = [real[p], real[i]]; [imag[i], imag[p]] = [imag[p], imag[i]]; }
          }
        }
        break;
      }
      case 'RZ': {
        const angle = Math.PI / 4;
        for (let i = 0; i < dim; i++) {
          const bit = (i >> (nQubits - 1 - q)) & 1;
          const theta = bit === 0 ? -angle/2 : angle/2;
          let r=real[i],im=imag[i]; real[i]=r*Math.cos(theta)-im*Math.sin(theta); imag[i]=r*Math.sin(theta)+im*Math.cos(theta);
        }
        break;
      }
      case 'SWAP': {
        const b = (q + 1) % nQubits;
        for (let i = 0; i < dim; i++) {
          const aB=(i>>(nQubits-1-q))&1, bB=(i>>(nQubits-1-b))&1;
          if (aB !== bB) { const p=i^(1<<(nQubits-1-q))^(1<<(nQubits-1-b)); if (i<p) { [real[i],real[p]]=[real[p],real[i]]; [imag[i],imag[p]]=[imag[p],imag[i]]; } }
        }
        break;
      }
    }

    // Apply noise if enabled
    const noiseErr = noiseConfig.enabled ? (noiseConfig.depolarizing + noiseConfig.bitFlip + noiseConfig.phaseFlip) : 0;
    const gateErr = GATE_ERROR_RATES[gate.type] + noiseErr;
    cumFidelity *= (1 - gateErr);

    const amps: StateAmplitude[] = Array.from({ length: dim }, (_, i) => {
      let r = real[i], im = imag[i];
      return { basis: `|${i.toString(2).padStart(nQubits, '0')}⟩`, real: r, imag: im, probability: r*r+im*im, phase: Math.atan2(im, r) };
    });

    // Qubit marginal probabilities
    const qubitSnapshots = [0, 1, 2].map(qi => {
      let prob1 = 0;
      for (let i = 0; i < dim; i++) {
        if ((i >> (nQubits - 1 - qi)) & 1) prob1 += real[i]*real[i] + imag[i]*imag[i];
      }
      const prob0 = 1 - prob1;
      const state = prob0 > 0.95 ? '|0⟩' : prob1 > 0.95 ? '|1⟩' : prob0 > 0.45 && prob0 < 0.55 ? '|+⟩' : '|ψ⟩';
      return { label: INITIAL_QUBITS[qi].label, prob0, prob1, state };
    });

    frames.push({
      step: gi + 1,
      gateLabel: gate.type,
      qubit: gate.qubit,
      col: gate.col,
      stateVector: amps,
      qubitSnapshots,
      gateProbability: 1 - gateErr,
      cumulativeFidelity: Math.max(0, cumFidelity),
    });
  }

  return frames;
}

function StepDebugger({ gates, isOpen, onClose, noiseConfig }: {
  gates: Gate[];
  isOpen: boolean;
  onClose: () => void;
  noiseConfig: NoiseConfig;
}) {
  const frames = React.useMemo(() => buildDebugFrames(gates, noiseConfig), [gates, noiseConfig]);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frame = frames[Math.min(currentStep, frames.length - 1)];
  const maxProb = Math.max(...(frame?.stateVector.map(a => a.probability) ?? [0.001]), 0.001);

  useEffect(() => {
    if (!isOpen) { setCurrentStep(0); setPlaying(false); }
  }, [isOpen]);

  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= frames.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 600);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, frames.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.45)', backdropFilter: 'blur(8px)', zIndex: 86, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60, paddingBottom: 40, overflowY: 'auto' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{ width: 700, background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, overflow: 'hidden', boxShadow: `6px 6px 0px rgba(26,26,26,0.12)`, marginBottom: 40 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${N.panelBorder}`, background: `linear-gradient(135deg, rgba(0,255,209,0.05) 0%, transparent 60%)` }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: N.cyan, marginBottom: 4, textTransform: 'uppercase' }}>▶▶ Step Debugger</div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700, color: N.textPrimary }}>Frame-by-Frame Execution</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: `1px solid ${N.panelBorder}`, borderRadius: 8, color: N.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {/* Step timeline */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${N.panelBorder}`, overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
                {frames.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 8, padding: '4px 8px',
                      background: i === currentStep ? N.cyan : i < currentStep ? `${N.cyan}20` : N.panel,
                      color: i === currentStep ? N.bg : i < currentStep ? N.cyan : N.textDim,
                      border: `1px solid ${i === currentStep ? N.cyan : N.panelBorder}`,
                      borderRadius: 5, cursor: 'pointer', flexShrink: 0, transition: 'all 0.1s',
                      boxShadow: i === currentStep ? `0 0 8px ${N.cyan}50` : 'none',
                    }}
                  >
                    {f.step === 0 ? 'INIT' : `${f.gateLabel}·q${f.qubit}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div style={{ padding: '12px 24px', borderBottom: `1px solid ${N.panelBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setCurrentStep(0)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>⏮ Reset</button>
              <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>◀ Prev</button>
              <button
                onClick={() => setPlaying(p => !p)}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.bg, background: N.cyan, border: `1.5px solid ${N.cyan}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 700, boxShadow: `0 0 10px ${N.cyan}40` }}
              >
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button onClick={() => setCurrentStep(s => Math.min(frames.length - 1, s + 1))} disabled={currentStep === frames.length - 1} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Next ▶</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim }}>Step {currentStep} / {frames.length - 1}</span>
            </div>

            {frame && (
              <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Left: State vector */}
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>State Vector</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {frame.stateVector.map(amp => {
                      const active = amp.probability > 0.001;
                      const phaseHue = ((amp.phase + Math.PI) / (2 * Math.PI)) * 360;
                      const phaseColor = `hsl(${phaseHue.toFixed(0)}, 90%, 65%)`;
                      return (
                        <div key={amp.basis} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 70px', alignItems: 'center', gap: 6, opacity: active ? 1 : 0.2 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: active ? phaseColor : N.textDim, fontWeight: active ? 700 : 400 }}>{amp.basis}</span>
                          <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                            <motion.div
                              animate={{ width: `${(amp.probability / maxProb) * 100}%` }}
                              transition={{ duration: 0.3 }}
                              style={{ height: '100%', background: active ? `linear-gradient(90deg, ${phaseColor}CC, ${phaseColor}66)` : 'rgba(255,255,255,0.06)', borderRadius: 2 }}
                            />
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: active ? N.textSoft : N.textDim, textAlign: 'right' }}>
                            {(amp.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Gate info + qubit snapshots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Current gate info */}
                  <div style={{ background: `${N.cyan}08`, border: `1px solid ${N.cyan}30`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Current Gate</div>
                    {frame.step === 0 ? (
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: N.cyan }}>Initial State |000⟩</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 36, height: 36, border: `1.5px solid ${GATE_COLORS[frame.gateLabel as GateType] ?? N.cyan}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${GATE_COLORS[frame.gateLabel as GateType] ?? N.cyan}15` }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: GATE_COLORS[frame.gateLabel as GateType] ?? N.cyan }}>{frame.gateLabel}</span>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: N.textPrimary }}>q{frame.qubit} · col {frame.col}</div>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: N.textDim }}>{GATE_DESCRIPTIONS[frame.gateLabel as GateType] ?? ''}</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim, marginBottom: 3 }}>Gate Fidelity</div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: fidelityColor(frame.gateProbability) }}>{(frame.gateProbability * 100).toFixed(2)}%</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim, marginBottom: 3 }}>Cumulative</div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: fidelityColor(frame.cumulativeFidelity) }}>{(frame.cumulativeFidelity * 100).toFixed(2)}%</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Qubit snapshots */}
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Qubit Snapshots</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {frame.qubitSnapshots.map((qs, qi) => {
                        const colors = [N.cyan, N.violet, N.pink];
                        let col = colors[qi];
                        return (
                          <div key={qi} style={{ background: `${col}08`, border: `1px solid ${col}25`, borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: col, fontWeight: 700 }}>{qs.label}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim }}>{qs.state}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, height: 6 }}>
                              <div style={{ flex: qs.prob0, background: col, borderRadius: 2, opacity: 0.8, transition: 'flex 0.3s' }} title={`|0⟩: ${(qs.prob0*100).toFixed(1)}%`} />
                              <div style={{ flex: qs.prob1, background: N.pink, borderRadius: 2, opacity: 0.6, transition: 'flex 0.3s' }} title={`|1⟩: ${(qs.prob1*100).toFixed(1)}%`} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: col }}>{(qs.prob0*100).toFixed(1)}% |0⟩</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.pink }}>{(qs.prob1*100).toFixed(1)}% |1⟩</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '12px 24px', borderTop: `1px solid ${N.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
                {noiseConfig.enabled ? `⚡ Noise: ${noiseConfig.model}` : '✓ Ideal simulation'}
              </span>
              <button onClick={onClose} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Optimizer suggestion types ───────────────────────────────────────────────
interface OptimizerSuggestion {
  id: string;
  type: 'gate-reduction' | 'commutation' | 'equivalent-rewrite';
  title: string;
  description: string;
  beforeGates: string[];
  afterGates: string[];
  fidelityBefore: number;
  fidelityAfter: number;
  depthBefore: number;
  depthAfter: number;
  color: string;
  icon: string;
}

// ─── Analyze circuit for optimization opportunities ───────────────────────────
function analyzeCircuit(gates: Gate[]): OptimizerSuggestion[] {
  const suggestions: OptimizerSuggestion[] = [];
  const metrics = computeCircuitMetrics(gates, 11);

  // 1. Gate cancellation: H·H = I, X·X = I, Z·Z = I
  const selfInverseGates: GateType[] = ['H', 'X', 'Z', 'SWAP'];
  for (const gateType of selfInverseGates) {
    const qubitGroups: Record<number, Gate[]> = {};
    gates.filter(g => g.type === gateType).forEach(g => {
      if (!qubitGroups[g.qubit]) qubitGroups[g.qubit] = [];
      qubitGroups[g.qubit].push(g);
    });
    for (const [, qGates] of Object.entries(qubitGroups)) {
      const sorted = qGates.sort((a, b) => a.col - b.col);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1].col === sorted[i].col + 1) {
          const beforeGateList = gates.map(g => `${g.type}(q${g.qubit})`);
          const afterGateList = gates
            .filter(g => g.id !== sorted[i].id && g.id !== sorted[i + 1].id)
            .map(g => `${g.type}(q${g.qubit})`);
          const removedErr = GATE_ERROR_RATES[gateType] * 2;
          suggestions.push({
            id: `cancel-${gateType}-${sorted[i].id}`,
            type: 'gate-reduction',
            title: `Cancel ${gateType}·${gateType} = I`,
            description: `Two adjacent ${gateType} gates on q${sorted[i].qubit} cancel to identity. Remove both gates.`,
            beforeGates: [`${gateType}(q${sorted[i].qubit}, col${sorted[i].col})`, `${gateType}(q${sorted[i + 1].qubit}, col${sorted[i + 1].col})`],
            afterGates: ['(identity — gates removed)'],
            fidelityBefore: metrics.fidelity,
            fidelityAfter: Math.min(1, metrics.fidelity / (1 - removedErr)),
            depthBefore: metrics.depth,
            depthAfter: Math.max(0, metrics.depth - GATE_DEPTH_COST[gateType] * 2),
            color: N.cyan,
            icon: '⊗',
          });
        }
      }
    }
  }

  // 2. T·T = S simplification
  const tGates = gates.filter(g => g.type === 'T');
  const tByQubit: Record<number, Gate[]> = {};
  tGates.forEach(g => {
    if (!tByQubit[g.qubit]) tByQubit[g.qubit] = [];
    tByQubit[g.qubit].push(g);
  });
  for (const [, qGates] of Object.entries(tByQubit)) {
    const sorted = qGates.sort((a, b) => a.col - b.col);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].col === sorted[i].col + 1) {
        suggestions.push({
          id: `tt-s-${sorted[i].id}`,
          type: 'equivalent-rewrite',
          title: 'T·T → S (phase merge)',
          description: `Two consecutive T gates on q${sorted[i].qubit} equal one S gate. Reduces gate count by 1.`,
          beforeGates: [`T(q${sorted[i].qubit}, col${sorted[i].col})`, `T(q${sorted[i + 1].qubit}, col${sorted[i + 1].col})`],
          afterGates: [`S(q${sorted[i].qubit}, col${sorted[i].col})`],
          fidelityBefore: metrics.fidelity,
          fidelityAfter: Math.min(1, metrics.fidelity * (1 - GATE_ERROR_RATES['T']) / (1 - GATE_ERROR_RATES['S'])),
          depthBefore: metrics.depth,
          depthAfter: metrics.depth - GATE_DEPTH_COST['T'],
          color: N.violet,
          icon: '≡',
        });
      }
    }
  }

  // 3. CX/CNOT commutation: Z commutes through CNOT control, X commutes through CNOT target
  const cnotGates = gates.filter(g => g.type === 'CNOT' || g.type === 'CX');
  for (const cnot of cnotGates) {
    const zOnControl = gates.find(g => g.type === 'Z' && g.qubit === cnot.qubit && Math.abs(g.col - cnot.col) === 1);
    if (zOnControl) {
      suggestions.push({
        id: `commute-z-cnot-${cnot.id}`,
        type: 'commutation',
        title: 'Z commutes through CNOT control',
        description: `Z on q${cnot.qubit} commutes with ${cnot.type} control. Reorder to enable further cancellations.`,
        beforeGates: [`Z(q${cnot.qubit}, col${zOnControl.col})`, `${cnot.type}(q${cnot.qubit}, col${cnot.col})`],
        afterGates: [`${cnot.type}(q${cnot.qubit}, col${cnot.col})`, `Z(q${cnot.qubit}, col${zOnControl.col})`],
        fidelityBefore: metrics.fidelity,
        fidelityAfter: metrics.fidelity,
        depthBefore: metrics.depth,
        depthAfter: metrics.depth,
        color: N.amber,
        icon: '⇄',
      });
    }
  }

  // 4. SWAP decomposition: SWAP = CNOT·CNOT·CNOT (depth reduction if parallel)
  const swapGates = gates.filter(g => g.type === 'SWAP');
  if (swapGates.length > 0) {
    suggestions.push({
      id: 'swap-decompose',
      type: 'equivalent-rewrite',
      title: 'SWAP → 3×CNOT decomposition',
      description: `SWAP gate can be decomposed into 3 CNOT gates, enabling parallel execution and lower error rate.`,
      beforeGates: swapGates.map(g => `SWAP(q${g.qubit}, col${g.col})`),
      afterGates: swapGates.flatMap(g => [`CNOT(q${g.qubit})`, `CNOT(q${(g.qubit + 1) % 3})`, `CNOT(q${g.qubit})`]),
      fidelityBefore: metrics.fidelity,
      fidelityAfter: metrics.fidelity * Math.pow(1 - GATE_ERROR_RATES['CNOT'], swapGates.length * 3) / Math.pow(1 - GATE_ERROR_RATES['SWAP'], swapGates.length),
      depthBefore: metrics.depth,
      depthAfter: metrics.depth - swapGates.length * (GATE_DEPTH_COST['SWAP'] - GATE_DEPTH_COST['CNOT'] * 2),
      color: N.pink,
      icon: '↔',
    });
  }

  // 5. Depth parallelization: gates on different qubits in adjacent columns can be merged
  const colMap: Record<number, Gate[]> = {};
  gates.forEach(g => {
    if (!colMap[g.col]) colMap[g.col] = [];
    colMap[g.col].push(g);
  });
  let parallelizable = 0;
  const cols = Object.keys(colMap).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < cols.length - 1; i++) {
    const col1 = colMap[cols[i]];
    const col2 = colMap[cols[i + 1]];
    const qubits1 = new Set(col1.map(g => g.qubit));
    const qubits2 = new Set(col2.map(g => g.qubit));
    const overlap = [...qubits1].some(q => qubits2.has(q));
    if (!overlap) parallelizable++;
  }
  if (parallelizable > 0) {
    suggestions.push({
      id: 'depth-parallel',
      type: 'equivalent-rewrite',
      title: `Merge ${parallelizable} independent column pair${parallelizable > 1 ? 's' : ''}`,
      description: `${parallelizable} adjacent column pair${parallelizable > 1 ? 's' : ''} operate on disjoint qubits and can be merged, reducing circuit depth.`,
      beforeGates: [`Depth: ${metrics.depth} time steps`],
      afterGates: [`Depth: ${Math.max(1, metrics.depth - parallelizable)} time steps`],
      fidelityBefore: metrics.fidelity,
      fidelityAfter: metrics.fidelity,
      depthBefore: metrics.depth,
      depthAfter: Math.max(1, metrics.depth - parallelizable),
      color: N.blue,
      icon: '⟂',
    });
  }

  return suggestions.slice(0, 6); // cap at 6 suggestions
}

// ─── Compute State Vector ─────────────────────────────────────────────────────
function computeStateVector(gates: Gate[]): StateAmplitude[] {
  const nQubits = 3;
  const dim = 1 << nQubits;
  const real = new Array(dim).fill(0);
  const imag = new Array(dim).fill(0);
  real[0] = 1;

  const sorted = [...gates].sort((a, b) => a.col - b.col || a.qubit - b.qubit);

  for (const gate of sorted) {
    const q = gate.qubit;
    switch (gate.type) {
      case 'H': {
        const nr = [...real], ni = [...imag];
        for (let i = 0; i < dim; i++) {
          const bit = (i >> (nQubits - 1 - q)) & 1;
          const partner = i ^ (1 << (nQubits - 1 - q));
          if (bit === 0) { nr[i] = (real[i] + real[partner]) / Math.SQRT2; ni[i] = (imag[i] + imag[partner]) / Math.SQRT2; }
          else { nr[i] = (real[partner] - real[i]) / Math.SQRT2; ni[i] = (imag[partner] - imag[i]) / Math.SQRT2; }
        }
        for (let i = 0; i < dim; i++) { real[i] = nr[i]; imag[i] = ni[i]; }
        break;
      }
      case 'X': {
        for (let i = 0; i < dim; i++) {
          const p = i ^ (1 << (nQubits - 1 - q));
          if (i < p) { [real[i], real[p]] = [real[p], real[i]]; [imag[i], imag[p]] = [imag[p], imag[i]]; }
        }
        break;
      }
      case 'Z': {
        for (let i = 0; i < dim; i++) { if ((i >> (nQubits - 1 - q)) & 1) { real[i] = -real[i]; imag[i] = -imag[i]; } }
        break;
      }
      case 'Y': {
        for (let i = 0; i < dim; i++) {
          const p = i ^ (1 << (nQubits - 1 - q));
          if (i < p) { const r0=real[i],im0=imag[i],r1=real[p],im1=imag[p]; real[i]=im1; imag[i]=-r1; real[p]=-im0; imag[p]=r0; }
        }
        break;
      }
      case 'S': {
        for (let i = 0; i < dim; i++) { if ((i >> (nQubits - 1 - q)) & 1) { let r=real[i],im=imag[i]; real[i]=-im; imag[i]=r; } }
        break;
      }
      case 'T': {
        let c=Math.cos(Math.PI/4), s=Math.sin(Math.PI/4);
        for (let i = 0; i < dim; i++) { if ((i >> (nQubits - 1 - q)) & 1) { let r=real[i],im=imag[i]; real[i]=r*c-im*s; imag[i]=r*s+im*c; } }
        break;
      }
      case 'CNOT': case 'CX': {
        const tgt = (q + 1) % nQubits;
        for (let i = 0; i < dim; i++) {
          if ((i >> (nQubits - 1 - q)) & 1) {
            const p = i ^ (1 << (nQubits - 1 - tgt));
            if (i < p) { [real[i], real[p]] = [real[p], real[i]]; [imag[i], imag[p]] = [imag[p], imag[i]]; }
          }
        }
        break;
      }
      case 'RZ': {
        const angle = Math.PI / 4;
        for (let i = 0; i < dim; i++) {
          const bit = (i >> (nQubits - 1 - q)) & 1;
          const theta = bit === 0 ? -angle/2 : angle/2;
          let r=real[i],im=imag[i]; real[i]=r*Math.cos(theta)-im*Math.sin(theta); imag[i]=r*Math.sin(theta)+im*Math.cos(theta);
        }
        break;
      }
      case 'SWAP': {
        const b = (q + 1) % nQubits;
        for (let i = 0; i < dim; i++) {
          const aB=(i>>(nQubits-1-q))&1, bB=(i>>(nQubits-1-b))&1;
          if (aB !== bB) { const p=i^(1<<(nQubits-1-q))^(1<<(nQubits-1-b)); if (i<p) { [real[i],real[p]]=[real[p],real[i]]; [imag[i],imag[p]]=[imag[p],imag[i]]; } }
        }
        break;
      }
    }
  }

  return Array.from({ length: dim }, (_, i) => {
    let r = real[i], im = imag[i];
    return {
      basis: `|${i.toString(2).padStart(nQubits, '0')}⟩`,
      real: r,
      imag: im,
      probability: r * r + im * im,
      phase: Math.atan2(im, r),
    };
  });
}

// ─── State Vector Visualizer ──────────────────────────────────────────────────
function StateVectorVisualizer({ gates }: { gates: Gate[] }) {
  const amplitudes = computeStateVector(gates);
  const maxProb = Math.max(...amplitudes.map(a => a.probability), 0.001);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: 'rgba(255,255,255,0.5)',
        border: `1px solid ${N.violet}40`,
        borderRadius: 12,
        padding: '16px 18px',
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: N.violet, boxShadow: `0 0 6px ${N.violet}`, animation: 'pulse-dot 1.5s ease infinite' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: N.violet }}>
            Live State Vector
          </span>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
          {amplitudes.filter(a => a.probability > 0.001).length} active basis states
        </span>
      </div>

      {/* Amplitude bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {amplitudes.map((amp) => {
          const isActive = amp.probability > 0.001;
          const barWidth = (amp.probability / maxProb) * 100;
          const phaseHue = ((amp.phase + Math.PI) / (2 * Math.PI)) * 360;
          const phaseColor = `hsl(${phaseHue.toFixed(0)}, 90%, 65%)`;
          const realSign = amp.real >= 0 ? '+' : '';
          const imagSign = amp.imag >= 0 ? '+' : '';

          return (
            <div
              key={amp.basis}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 80px',
                alignItems: 'center',
                gap: 8,
                opacity: isActive ? 1 : 0.25,
                transition: 'opacity 0.3s ease',
              }}
            >
              {/* Basis label */}
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: isActive ? phaseColor : N.textDim,
                fontWeight: isActive ? 700 : 400,
                transition: 'color 0.3s ease',
              }}>
                {amp.basis}
              </span>

              {/* Probability bar with phase color */}
              <div style={{ position: 'relative', height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    background: isActive
                      ? `linear-gradient(90deg, ${phaseColor}CC, ${phaseColor}66)`
                      : 'rgba(255,255,255,0.06)',
                    borderRadius: 3,
                    boxShadow: isActive ? `0 0 8px ${phaseColor}60` : 'none',
                  }}
                />
                {/* Phase indicator tick */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: phaseColor,
                    boxShadow: `0 0 4px ${phaseColor}`,
                  }} />
                )}
              </div>

              {/* Amplitude value */}
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 8,
                  color: isActive ? N.textSoft : N.textDim,
                  display: 'block',
                  lineHeight: 1.3,
                }}>
                  {(amp.probability * 100).toFixed(1)}%
                </span>
                {isActive && (
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 7,
                    color: N.textDim,
                    display: 'block',
                    lineHeight: 1.2,
                  }}>
                    {realSign}{amp.real.toFixed(2)}{imagSign}{amp.imag.toFixed(2)}i
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase legend */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim }}>Phase:</span>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, hsl(0,90%,65%), hsl(90,90%,65%), hsl(180,90%,65%), hsl(270,90%,65%), hsl(360,90%,65%))' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim }}>−π → +π</span>
      </div>
    </motion.div>
  );
}

// ─── Circuit Optimizer Panel ──────────────────────────────────────────────────
function CircuitOptimizerPanel({
  gates,
  isOpen,
  onClose,
}: {
  gates: Gate[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const suggestions = analyzeCircuit(gates);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const metrics = computeCircuitMetrics(gates, 11);

  const typeLabels: Record<OptimizerSuggestion['type'], string> = {
    'gate-reduction': 'Gate Reduction',
    'commutation': 'Commutation',
    'equivalent-rewrite': 'Equiv. Rewrite',
  };
  const typeColors: Record<OptimizerSuggestion['type'], string> = {
    'gate-reduction': N.cyan,
    'commutation': N.amber,
    'equivalent-rewrite': N.violet,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,26,26,0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 85,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 80,
            paddingBottom: 40,
            overflowY: 'auto',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              width: 640,
              background: '#FFFFFF',
              border: `1.5px solid #1A1A1A`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: `6px 6px 0px rgba(26,26,26,0.12)`,
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: `1px solid ${N.panelBorder}`,
              background: `linear-gradient(135deg, rgba(155,93,229,0.06) 0%, transparent 60%)`,
            }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: N.violet, marginBottom: 4, textTransform: 'uppercase' }}>
                  ◈ Circuit Optimizer
                </div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: N.textPrimary, lineHeight: 1 }}>
                  Optimization Suggestions
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: `1px solid ${N.panelBorder}`, borderRadius: 8, color: N.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
              >
                ✕
              </button>
            </div>

            {/* Current circuit summary */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${N.panelBorder}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Gate Count', value: gates.length, color: N.textPrimary },
                { label: 'Circuit Depth', value: metrics.depth, color: N.violet },
                { label: 'Fidelity', value: `${(metrics.fidelity * 100).toFixed(1)}%`, color: fidelityColor(metrics.fidelity) },
                { label: 'Suggestions', value: suggestions.length, color: N.cyan },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Suggestions list */}
            <div style={{ padding: '16px 24px', maxHeight: 480, overflowY: 'auto' }}>
              {suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: N.cyan, fontWeight: 600, marginBottom: 6 }}>Circuit is already optimal</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: N.textDim }}>No gate reductions or simplifications found.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {suggestions.map((s, idx) => {
                    const isExpanded = expandedId === s.id;
                    const fidelityGain = s.fidelityAfter - s.fidelityBefore;
                    const depthGain = s.depthBefore - s.depthAfter;
                    const typeColor = typeColors[s.type];

                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        style={{
                          background: `${s.color}06`,
                          border: `1px solid ${isExpanded ? s.color + '60' : N.panelBorder}`,
                          borderRadius: 12,
                          overflow: 'hidden',
                          transition: 'border-color 0.2s ease',
                          boxShadow: isExpanded ? `0 0 16px ${s.color}15` : 'none',
                        }}
                      >
                        {/* Suggestion header */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 16px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {/* Icon */}
                          <div style={{
                            width: 36,
                            height: 36,
                            border: `1.5px solid ${s.color}`,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `${s.color}12`,
                            flexShrink: 0,
                            boxShadow: `0 0 8px ${s.color}30`,
                          }}>
                            <span style={{ fontSize: 16, color: s.color }}>{s.icon}</span>
                          </div>

                          {/* Title + type */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: N.textPrimary }}>{s.title}</span>
                              <span style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 8,
                                color: typeColor,
                                border: `1px solid ${typeColor}40`,
                                borderRadius: 4,
                                padding: '1px 6px',
                                background: `${typeColor}0D`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                              }}>
                                {typeLabels[s.type]}
                              </span>
                            </div>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: N.textDim, lineHeight: 1.4 }}>{s.description}</div>
                          </div>

                          {/* Gains summary */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                            {fidelityGain > 0.0001 && (
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.cyan }}>
                                +{(fidelityGain * 100).toFixed(2)}% fidelity
                              </span>
                            )}
                            {depthGain > 0 && (
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.violet }}>
                                −{depthGain} depth
                              </span>
                            )}
                            {fidelityGain <= 0.0001 && depthGain <= 0 && (
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.amber }}>
                                reorder
                              </span>
                            )}
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, marginTop: 2 }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </button>

                        {/* Expanded: before/after comparison */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ padding: '0 16px 16px' }}>
                                {/* Before / After gate sequences */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                  {/* Before */}
                                  <div style={{ background: `${N.pink}08`, border: `1px solid ${N.pink}30`, borderRadius: 8, padding: '10px 12px' }}>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.pink, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Before</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {s.beforeGates.map((g, i) => (
                                        <div key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textSoft, background: `${N.pink}10`, borderRadius: 4, padding: '3px 7px' }}>{g}</div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* After */}
                                  <div style={{ background: `${N.cyan}08`, border: `1px solid ${N.cyan}30`, borderRadius: 8, padding: '10px 12px' }}>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.cyan, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>After</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {s.afterGates.map((g, i) => (
                                        <div key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textSoft, background: `${N.cyan}10`, borderRadius: 4, padding: '3px 7px' }}>{g}</div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Fidelity & Depth comparison table */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${N.panelBorder}`, borderRadius: 8, overflow: 'hidden' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: `1px solid ${N.panelBorder}` }}>
                                    {['Metric', 'Before', 'After', 'Δ'].map(h => (
                                      <div key={h} style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', borderRight: `1px solid ${N.panelBorder}` }}>{h}</div>
                                    ))}
                                  </div>
                                  {[
                                    {
                                      metric: 'Fidelity',
                                      before: `${(s.fidelityBefore * 100).toFixed(2)}%`,
                                      after: `${(s.fidelityAfter * 100).toFixed(2)}%`,
                                      delta: fidelityGain >= 0 ? `+${(fidelityGain * 100).toFixed(2)}%` : `${(fidelityGain * 100).toFixed(2)}%`,
                                      deltaColor: fidelityGain >= 0 ? N.cyan : N.pink,
                                    },
                                    {
                                      metric: 'Depth',
                                      before: String(s.depthBefore),
                                      after: String(s.depthAfter),
                                      delta: depthGain > 0 ? `−${depthGain}` : depthGain < 0 ? `+${-depthGain}` : '0',
                                      deltaColor: depthGain > 0 ? N.cyan : depthGain < 0 ? N.pink : N.textDim,
                                    },
                                  ].map(row => (
                                    <div key={row.metric} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: `1px solid ${N.panelBorder}` }}>
                                      <div style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textSoft, borderRight: `1px solid ${N.panelBorder}` }}>{row.metric}</div>
                                      <div style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.pink, borderRight: `1px solid ${N.panelBorder}` }}>{row.before}</div>
                                      <div style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.cyan, borderRight: `1px solid ${N.panelBorder}` }}>{row.after}</div>
                                      <div style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: row.deltaColor, fontWeight: 700 }}>{row.delta}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${N.panelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} · Click to expand before/after comparison
              </span>
              <button
                onClick={onClose}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Measurement Histogram ────────────────────────────────────────────────────
interface MeasurementOutcome {
  basis: string;
  count: number;
  frequency: number;
  ciLow: number;
  ciHigh: number;
}

function simulateMeasurements(gates: Gate[], shots: number = 1024): MeasurementOutcome[] {
  const amplitudes = computeStateVector(gates);
  const nQubits = 3;
  const dim = 1 << nQubits;
  const counts = new Array(dim).fill(0);

  // Sample from probability distribution
  const probs = amplitudes.map(a => a.probability);
  // Normalize
  const total = probs.reduce((s, p) => s + p, 0);
  const normProbs = probs.map(p => p / (total || 1));

  for (let s = 0; s < shots; s++) {
    let r = Math.random();
    for (let i = 0; i < dim; i++) {
      r -= normProbs[i];
      if (r <= 0) { counts[i]++; break; }
    }
  }

  return amplitudes.map((amp, i) => {
    const count = counts[i];
    const freq = count / shots;
    // Wilson score confidence interval (95%)
    const z = 1.96;
    const n = shots;
    const p = freq;
    const denom = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
    return {
      basis: amp.basis,
      count,
      frequency: freq,
      ciLow: Math.max(0, center - margin),
      ciHigh: Math.min(1, center + margin),
    };
  });
}

function MeasurementHistogram({ gates, isVisible }: { gates: Gate[]; isVisible: boolean }) {
  const [shots, setShots] = useState(1024);
  const [outcomes, setOutcomes] = useState<MeasurementOutcome[]>([]);
  const [resampleKey, setResampleKey] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    setOutcomes(simulateMeasurements(gates, shots));
  }, [gates, shots, isVisible, resampleKey]);

  if (!isVisible) return null;

  const maxFreq = Math.max(...outcomes.map(o => o.frequency), 0.001);
  const activeOutcomes = outcomes.filter(o => o.count > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'rgba(255,255,255,0.55)',
        border: `1px solid ${N.amber}40`,
        borderRadius: 12,
        padding: '18px 20px',
        marginTop: 12,
        boxShadow: `0 0 24px ${N.amber}08`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: N.amber, boxShadow: `0 0 6px ${N.amber}` }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: N.amber }}>
            Measurement Outcomes
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
            {shots} shots · {activeOutcomes.length} / 8 states observed
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Shot count selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[256, 512, 1024, 4096].map(s => (
              <button
                key={s}
                onClick={() => setShots(s)}
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 8,
                  color: shots === s ? N.bg : N.textDim,
                  background: shots === s ? N.amber : 'transparent',
                  border: `1px solid ${shots === s ? N.amber : N.panelBorder}`,
                  borderRadius: 4,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {s >= 1000 ? `${s / 1000}k` : s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setResampleKey(k => k + 1)}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: N.amber,
              background: `${N.amber}10`,
              border: `1px solid ${N.amber}40`,
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ↺ Resample
          </button>
        </div>
      </div>

      {/* Histogram bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {outcomes.map((o) => {
          const isActive = o.count > 0;
          const barPct = (o.frequency / maxFreq) * 100;
          const ciLowPct = (o.ciLow / maxFreq) * 100;
          const ciHighPct = (o.ciHigh / maxFreq) * 100;
          const phaseHue = ((outcomes.indexOf(o) / 8) * 280 + 160);
          const barColor = isActive ? `hsl(${phaseHue.toFixed(0)}, 85%, 62%)` : N.textDim;

          return (
            <div
              key={o.basis}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 90px',
                alignItems: 'center',
                gap: 8,
                opacity: isActive ? 1 : 0.22,
              }}
            >
              {/* Basis label */}
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: isActive ? barColor : N.textDim,
                fontWeight: isActive ? 700 : 400,
              }}>
                {o.basis}
              </span>

              {/* Bar + CI */}
              <div style={{ position: 'relative', height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
                {/* Main bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 2,
                    bottom: 2,
                    background: isActive ? `linear-gradient(90deg, ${barColor}CC, ${barColor}88)` : 'rgba(255,255,255,0.06)',
                    borderRadius: 2,
                    boxShadow: isActive ? `0 0 8px ${barColor}50` : 'none',
                  }}
                />
                {/* Confidence interval bracket */}
                {isActive && (
                  <>
                    <div style={{
                      position: 'absolute',
                      left: `${ciLowPct}%`,
                      right: `${100 - ciHighPct}%`,
                      top: '50%',
                      height: 2,
                      background: `${barColor}60`,
                      transform: 'translateY(-50%)',
                      borderRadius: 1,
                    }} />
                    <div style={{ position: 'absolute', left: `${ciLowPct}%`, top: 3, bottom: 3, width: 1.5, background: barColor, opacity: 0.7 }} />
                    <div style={{ position: 'absolute', left: `${ciHighPct}%`, top: 3, bottom: 3, width: 1.5, background: barColor, opacity: 0.7 }} />
                  </>
                )}
              </div>

              {/* Stats */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isActive ? barColor : N.textDim, display: 'block', lineHeight: 1.3 }}>
                  {(o.frequency * 100).toFixed(1)}%
                </span>
                {isActive && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: N.textDim, display: 'block', lineHeight: 1.2 }}>
                    [{(o.ciLow * 100).toFixed(1)}, {(o.ciHigh * 100).toFixed(1)}]
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 6, background: `${N.amber}80`, borderRadius: 2 }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim }}>Frequency</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 2, background: `${N.amber}50`, borderRadius: 1 }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim }}>95% CI (Wilson)</span>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim, marginLeft: 'auto' }}>
          σ = {(Math.sqrt(outcomes.reduce((s, o) => s + o.frequency * (1 - o.frequency), 0) / shots) * 100).toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
}

// ─── Circuit Library ──────────────────────────────────────────────────────────
interface CircuitTemplate {
  id: string;
  name: string;
  category: 'entanglement' | 'algorithm' | 'error-correction' | 'superposition';
  description: string;
  gates: Array<{ type: GateType; qubit: number; col: number }>;
  icon: string;
  color: string;
}

const CIRCUIT_TEMPLATES: CircuitTemplate[] = [
  {
    id: 'bell-state',
    name: 'Bell State',
    category: 'entanglement',
    description: 'Creates maximally entangled |Φ+⟩ = (|00⟩+|11⟩)/√2',
    icon: '⊗',
    color: N.cyan,
    gates: [
      { type: 'H', qubit: 0, col: 1 },
      { type: 'CNOT', qubit: 0, col: 2 },
    ],
  },
  {
    id: 'ghz',
    name: 'GHZ State',
    category: 'entanglement',
    description: '3-qubit Greenberger–Horne–Zeilinger entangled state',
    icon: '∿',
    color: N.cyan,
    gates: [
      { type: 'H', qubit: 0, col: 1 },
      { type: 'CNOT', qubit: 0, col: 2 },
      { type: 'CNOT', qubit: 1, col: 3 },
    ],
  },
  {
    id: 'qft-3',
    name: 'QFT (3-qubit)',
    category: 'algorithm',
    description: 'Quantum Fourier Transform — basis for Shor\'s algorithm',
    icon: '∫',
    color: N.violet,
    gates: [
      { type: 'H', qubit: 0, col: 1 },
      { type: 'S', qubit: 0, col: 2 },
      { type: 'T', qubit: 0, col: 3 },
      { type: 'H', qubit: 1, col: 4 },
      { type: 'S', qubit: 1, col: 5 },
      { type: 'H', qubit: 2, col: 6 },
      { type: 'SWAP', qubit: 0, col: 7 },
    ],
  },
  {
    id: 'grover',
    name: "Grover's Oracle",
    category: 'algorithm',
    description: 'Amplitude amplification for quadratic search speedup',
    icon: '◎',
    color: N.violet,
    gates: [
      { type: 'H', qubit: 0, col: 1 },
      { type: 'H', qubit: 1, col: 1 },
      { type: 'H', qubit: 2, col: 1 },
      { type: 'X', qubit: 0, col: 2 },
      { type: 'X', qubit: 1, col: 2 },
      { type: 'CNOT', qubit: 0, col: 3 },
      { type: 'H', qubit: 0, col: 4 },
      { type: 'H', qubit: 1, col: 4 },
    ],
  },
  {
    id: 'teleportation',
    name: 'Teleportation',
    category: 'entanglement',
    description: 'Quantum state teleportation protocol',
    icon: '⟿',
    color: N.pink,
    gates: [
      { type: 'H', qubit: 1, col: 1 },
      { type: 'CNOT', qubit: 1, col: 2 },
      { type: 'CNOT', qubit: 0, col: 3 },
      { type: 'H', qubit: 0, col: 4 },
      { type: 'X', qubit: 2, col: 5 },
      { type: 'Z', qubit: 2, col: 6 },
    ],
  },
  {
    id: 'superposition',
    name: 'Full Superposition',
    category: 'superposition',
    description: 'All qubits in equal superposition |+⟩⊗³',
    icon: '≈',
    color: N.amber,
    gates: [
      { type: 'H', qubit: 0, col: 1 },
      { type: 'H', qubit: 1, col: 1 },
      { type: 'H', qubit: 2, col: 1 },
    ],
  },
  {
    id: 'bit-flip',
    name: 'Bit-Flip Code',
    category: 'error-correction',
    description: '3-qubit repetition code for bit-flip error correction',
    icon: '⊕',
    color: N.blue,
    gates: [
      { type: 'CNOT', qubit: 0, col: 1 },
      { type: 'CNOT', qubit: 0, col: 2 },
      { type: 'X', qubit: 1, col: 3 },
      { type: 'CNOT', qubit: 0, col: 4 },
      { type: 'CNOT', qubit: 0, col: 5 },
    ],
  },
  {
    id: 'phase-estimation',
    name: 'Phase Estimation',
    category: 'algorithm',
    description: 'Quantum phase estimation — core of HHL and Shor',
    icon: 'φ',
    color: N.violet,
    gates: [
      { type: 'H', qubit: 0, col: 1 },
      { type: 'H', qubit: 1, col: 1 },
      { type: 'T', qubit: 2, col: 2 },
      { type: 'CX', qubit: 0, col: 3 },
      { type: 'S', qubit: 2, col: 4 },
      { type: 'CX', qubit: 1, col: 5 },
      { type: 'H', qubit: 0, col: 6 },
      { type: 'H', qubit: 1, col: 7 },
    ],
  },
];

const CATEGORY_LABELS: Record<CircuitTemplate['category'], string> = {
  entanglement: 'Entanglement',
  algorithm: 'Algorithm',
  'error-correction': 'Error Correction',
  superposition: 'Superposition',
};
const CATEGORY_COLORS: Record<CircuitTemplate['category'], string> = {
  entanglement: N.cyan,
  algorithm: N.violet,
  'error-correction': N.blue,
  superposition: N.amber,
};

function CircuitLibraryPanel({
  isOpen,
  onClose,
  onLoadTemplate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (gates: Gate[]) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<CircuitTemplate['category'] | 'all'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = activeCategory === 'all'
    ? CIRCUIT_TEMPLATES
    : CIRCUIT_TEMPLATES.filter(t => t.category === activeCategory);

  const categories: Array<CircuitTemplate['category'] | 'all'> = ['all', 'entanglement', 'algorithm', 'superposition', 'error-correction'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.45)', backdropFilter: 'blur(8px)', zIndex: 87, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60, paddingBottom: 40, overflowY: 'auto' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{ width: 680, background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, overflow: 'hidden', boxShadow: `6px 6px 0px rgba(26,26,26,0.12)`, marginBottom: 40 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${N.panelBorder}`, background: `linear-gradient(135deg, rgba(0,255,209,0.05) 0%, transparent 60%)` }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: N.cyan, marginBottom: 4, textTransform: 'uppercase' }}>◧ Circuit Library</div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: N.textPrimary }}>Templates</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: `1px solid ${N.panelBorder}`, borderRadius: 8, color: N.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {/* Category filter */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${N.panelBorder}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => {
                const isActive = activeCategory === cat;
                const color = cat === 'all' ? N.textSoft : CATEGORY_COLORS[cat as CircuitTemplate['category']];
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: isActive ? N.bg : color,
                      background: isActive ? color : 'transparent',
                      border: `1px solid ${isActive ? color : color + '50'}`,
                      borderRadius: 999,
                      padding: '4px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as CircuitTemplate['category']]}
                  </button>
                );
              })}
            </div>

            {/* Templates grid */}
            <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
              {filtered.map(template => {
                const isHovered = hoveredId === template.id;
                const catColor = CATEGORY_COLORS[template.category];
                return (
                  <motion.div
                    key={template.id}
                    onMouseEnter={() => setHoveredId(template.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      background: isHovered ? `${template.color}0D` : N.panel,
                      border: `1px solid ${isHovered ? template.color + '60' : N.panelBorder}`,
                      borderRadius: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isHovered ? `0 0 16px ${template.color}15` : 'none',
                    }}
                  >
                    {/* Template header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, border: `1.5px solid ${template.color}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${template.color}12`, flexShrink: 0, boxShadow: isHovered ? `0 0 10px ${template.color}40` : 'none', transition: 'box-shadow 0.18s' }}>
                          <span style={{ fontSize: 16, color: template.color }}>{template.icon}</span>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: N.textPrimary, marginBottom: 2 }}>{template.name}</div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: catColor, border: `1px solid ${catColor}40`, borderRadius: 4, padding: '1px 6px', background: `${catColor}0D`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {CATEGORY_LABELS[template.category]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: N.textDim, lineHeight: 1.5, margin: '0 0 10px' }}>
                      {template.description}
                    </p>

                    {/* Mini circuit preview */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 10px', marginBottom: 10, overflowX: 'auto' }}>
                      <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
                        {[0, 1, 2].map(q => (
                          <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: [N.cyan, N.violet, N.pink][q], width: 14 }}>q{q}</span>
                            {Array.from({ length: 8 }, (_, col) => {
                              const gate = template.gates.find(g => g.qubit === q && g.col === col + 1);
                              return (
                                <div key={col} style={{ width: 18, height: 18, border: gate ? `1px solid ${GATE_COLORS[gate.type]}` : '1px solid rgba(255,255,255,0.06)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: gate ? `${GATE_COLORS[gate.type]}15` : 'transparent', flexShrink: 0 }}>
                                  {gate && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 5, fontWeight: 700, color: GATE_COLORS[gate.type] }}>{gate.type.slice(0, 2)}</span>}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats + Load button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
                        {template.gates.length} gates · {Math.max(...template.gates.map(g => g.col))} cols
                      </span>
                      <button
                        onClick={() => {
                          const newGates: Gate[] = template.gates.map((g, i) => ({
                            ...g,
                            id: `gate-${Date.now()}-${i}`,
                            color: GATE_COLORS[g.type],
                            active: false,
                          }));
                          onLoadTemplate(newGates);
                          onClose();
                        }}
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9,
                          color: template.color,
                          background: `${template.color}15`,
                          border: `1px solid ${template.color}50`,
                          borderRadius: 6,
                          padding: '5px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Load →
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div style={{ padding: '12px 24px', borderTop: `1px solid ${N.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>{CIRCUIT_TEMPLATES.length} templates · Loading replaces current circuit</span>
              <button onClick={onClose} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Circuit Share Modal ──────────────────────────────────────────────────────
function CircuitShareModal({
  isOpen,
  onClose,
  gates,
  qubits,
}: {
  isOpen: boolean;
  onClose: () => void;
  gates: Gate[];
  qubits: Qubit[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const gateSeq = gates
    .sort((a, b) => a.col - b.col || a.qubit - b.qubit)
    .map(g => `${g.type}(q${g.qubit},c${g.col})`)
    .join(' ');

  const qasmCode = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    `qreg q[${qubits.length}];`,
    `creg c[${qubits.length}];`,
    ...gates
      .sort((a, b) => a.col - b.col || a.qubit - b.qubit)
      .map(g => {
        switch (g.type) {
          case 'H': return `h q[${g.qubit}];`;
          case 'X': return `x q[${g.qubit}];`;
          case 'Y': return `y q[${g.qubit}];`;
          case 'Z': return `z q[${g.qubit}];`;
          case 'S': return `s q[${g.qubit}];`;
          case 'T': return `t q[${g.qubit}];`;
          case 'RZ': return `rz(pi/4) q[${g.qubit}];`;
          case 'CNOT': case 'CX': return `cx q[${g.qubit}],q[${(g.qubit + 1) % qubits.length}];`;
          case 'SWAP': return `swap q[${g.qubit}],q[${(g.qubit + 1) % qubits.length}];`;
          default: return `// ${g.type} q[${g.qubit}];`;
        }
      }),
    ...qubits.map((_, i) => `measure q[${i}] -> c[${i}];`),
  ].join('\n');

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/machine-world?circuit=${encodeURIComponent(gateSeq)}`;

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.45)', backdropFilter: 'blur(8px)', zIndex: 91, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{ width: 520, background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, overflow: 'hidden', boxShadow: `6px 6px 0px rgba(26,26,26,0.12)` }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${N.panelBorder}`, background: `linear-gradient(135deg, rgba(155,93,229,0.06) 0%, transparent 60%)` }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.16em', color: N.violet, marginBottom: 4, textTransform: 'uppercase' }}>⟳ Share Circuit</div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: N.textPrimary }}>Export & Share</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: `1px solid ${N.panelBorder}`, borderRadius: 8, color: N.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Share URL */}
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Share Link</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 8, padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shareUrl.slice(0, 60)}…
                  </div>
                  <button
                    onClick={() => copyToClipboard(shareUrl, 'url')}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: copied === 'url' ? N.bg : N.violet, background: copied === 'url' ? N.violet : `${N.violet}15`, border: `1px solid ${N.violet}50`, borderRadius: 8, padding: '0 14px', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                  >
                    {copied === 'url' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Gate sequence */}
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Gate Sequence</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 8, padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.cyan, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {gateSeq.slice(0, 55)}…
                  </div>
                  <button
                    onClick={() => copyToClipboard(gateSeq, 'seq')}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: copied === 'seq' ? N.bg : N.cyan, background: copied === 'seq' ? N.cyan : `${N.cyan}15`, border: `1px solid ${N.cyan}50`, borderRadius: 8, padding: '0 14px', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                  >
                    {copied === 'seq' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* OpenQASM */}
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>OpenQASM 2.0</div>
                <div style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 8, padding: '12px 14px', maxHeight: 120, overflowY: 'auto' }}>
                  <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textSoft, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {qasmCode}
                  </pre>
                </div>
                <button
                  onClick={() => copyToClipboard(qasmCode, 'qasm')}
                  style={{ marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: copied === 'qasm' ? N.bg : N.amber, background: copied === 'qasm' ? N.amber : `${N.amber}10`, border: `1px solid ${N.amber}40`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {copied === 'qasm' ? '✓ Copied QASM' : 'Copy QASM'}
                </button>
              </div>

              {/* Circuit stats */}
              <div style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 10, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Qubits', value: qubits.length, color: N.cyan },
                  { label: 'Gates', value: gates.length, color: N.violet },
                  { label: 'Depth', value: Math.max(...gates.map(g => g.col), 0), color: N.amber },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: N.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 24px', borderTop: `1px solid ${N.panelBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft, background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const COLS = 11;

export default function MachineWorldClient() {
  const setView = useCircuitStore((s) => s.setView);
  const shouldReduceMotion = useReducedMotion();
  const [gates, setGates] = useState<Gate[]>(buildInitialGates);
  const [gateHistory, setGateHistory] = useState<Gate[][]>([buildInitialGates()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [qubits] = useState<Qubit[]>(INITIAL_QUBITS);
  const [activeCol, setActiveCol] = useState(0);
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<QuantumEvent | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(false);
  const [showEventSearch, setShowEventSearch] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [showNoise, setShowNoise] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHistogram, setShowHistogram] = useState(false);
  const [noiseConfig, setNoiseConfig] = useState<NoiseConfig>(NOISE_PRESETS.ideal);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedEvents, setBookmarkedEvents] = useState<Set<string>>(new Set());
  const [blochAngles, setBlochAngles] = useState([
    { theta: 0.8, phi: 0.4 },
    { theta: 1.2, phi: 1.1 },
    { theta: 0.3, phi: 2.1 },
  ]);
  const runRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Undo/Redo helpers ──────────────────────────────────────────────────────
  const pushHistory = useCallback((newGates: Gate[]) => {
    setGateHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newGates].slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    setHistoryIndex(newIdx);
    setGates(gateHistory[newIdx]);
  }, [historyIndex, gateHistory]);

  const redo = useCallback(() => {
    if (historyIndex >= gateHistory.length - 1) return;
    const newIdx = historyIndex + 1;
    setHistoryIndex(newIdx);
    setGates(gateHistory[newIdx]);
  }, [historyIndex, gateHistory]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < gateHistory.length - 1;

  const loadTemplate = useCallback((newGates: Gate[]) => {
    setGates(newGates);
    pushHistory(newGates);
    setRunComplete(false);
    setShowHistogram(false);
  }, [pushHistory]);

  // Cursor glow
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 100, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 100, damping: 20 });

  useEffect(() => {
    if (shouldReduceMotion) return;
    const move = (e: MouseEvent) => {
      cursorX.set(e.clientX - 150);
      cursorY.set(e.clientY - 150);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [cursorX, cursorY, shouldReduceMotion]);

  // Bloch sphere animation
  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => {
      setBlochAngles(prev =>
        prev.map(a => ({
          theta: a.theta + 0.015,
          phi: a.phi + 0.008,
        })),
      );
    }, 50);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  // Circuit runner
  const runCircuit = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setRunComplete(false);
    setActiveCol(0);
    let col = 0;
    runRef.current = setInterval(() => {
      col++;
      setActiveCol(col);
      setGates(prev =>
        prev.map(g => ({ ...g, active: g.col === col })),
      );
      if (col >= COLS - 1) {
        clearInterval(runRef.current!);
        setIsRunning(false);
        setRunComplete(true);
        setShowHistogram(true);
        setGates(prev => prev.map(g => ({ ...g, active: false })));
        setTimeout(() => setRunComplete(false), 3000);
      }
    }, 280);
  }, [isRunning]);

  useEffect(() => {
    return () => { if (runRef.current) clearInterval(runRef.current); };
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedGate(null);
        setSelectedEvent(null);
        setShowEventSearch(false);
        setShowDownload(false);
        setShowOptimizer(false);
        setShowDebugger(false);
        setShowNoise(false);
        setShowLibrary(false);
        setShowShare(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowEventSearch(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); setShowDownload(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') { e.preventDefault(); setShowOptimizer(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setShowDebugger(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setShowNoise(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') { e.preventDefault(); setShowLibrary(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (e.key === 'Enter' && !isRunning) runCircuit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning, runCircuit, undo, redo]);

  const toggleBookmark = useCallback((eventId: string) => {
    setBookmarkedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const filteredEvents = searchQuery.length > 1
    ? QUANTUM_EVENTS.filter(
        e =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(e.year).includes(searchQuery) ||
          e.discovery.toLowerCase().includes(searchQuery.toLowerCase()),
      ).slice(0, 8)
    : QUANTUM_EVENTS.slice(0, 8);

  const particles = [
    { x: 12, y: 20, color: N.cyan, delay: 0 },
    { x: 78, y: 35, color: N.violet, delay: 0.8 },
    { x: 45, y: 70, color: N.pink, delay: 1.5 },
    { x: 90, y: 60, color: N.cyan, delay: 2.2 },
    { x: 25, y: 85, color: N.amber, delay: 0.4 },
    { x: 60, y: 15, color: N.violet, delay: 1.1 },
    { x: 5, y: 55, color: N.pink, delay: 1.9 },
    { x: 95, y: 80, color: N.cyan, delay: 0.6 },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: N.bg,
        color: N.textPrimary,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Paper grid */}
      <PaperGrid />

      {/* ── Header ── */}
      <motion.header
        initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        role="banner"
        aria-label="Quantum Machine World"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          padding: '0 clamp(16px, 3vw, 32px)',
          minHeight: 64,
          borderBottom: `1.5px solid #1A1A1A`,
          background: 'rgba(253,251,247,0.94)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            aria-hidden="true"
            style={{
              width: 28, height: 28, border: `1.5px solid #1A1A1A`, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#EAE7DF', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, color: '#0A0A0A', fontWeight: 800 }}>◈</span>
          </div>
          <span
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: 'clamp(14px, 2.5vw, 17px)',
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-0.01em',
            }}
          >
            Quantum Odyssey
          </span>
          <span
            aria-label="The Machine — circuit builder"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: '#0A0A0A',
              background: '#F5F2EA',
              border: `1px solid #1A1A1A`,
              borderRadius: 4,
              padding: '2px 6px',
              letterSpacing: '0.1em',
              fontWeight: 700,
            }}
          >
            THE MACHINE
          </span>
        </div>

        {/* Nav */}
        <nav aria-label="Machine World navigation" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setView('circuit-dashboard')}
            aria-label="Go to Circuit Dashboard"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#1A1A1A', background: '#EAE7DF',
              border: `1.5px solid #1A1A1A`, borderRadius: 999,
              padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', transition: 'all 0.15s ease', minHeight: 36, fontWeight: 600,
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('archive')}
            aria-label="Go to Grand Quantum Museum"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#4A4740', background: 'transparent',
              border: 'none', transition: 'color 0.15s', padding: '6px 6px', minHeight: 36,
              cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 600,
            }}
          >
            Grand Quantum Museum
          </button>
          <button
            onClick={() => setView('city')}
            aria-label="Go to Fintech Compass"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#0A0A0A', background: '#FEF3C7',
              border: `1.5px solid #D97706`, borderRadius: 999,
              padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', transition: 'all 0.15s ease', minHeight: 36, fontWeight: 700,
            }}
          >
            Fintech Compass ⚡
          </button>

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo last gate change"
            aria-disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: canUndo ? '#0A0A0A' : '#A8A29E', background: '#F5F2EA', border: `1px solid ${canUndo ? '#1A1A1A' : '#D8D4C7'}`, borderRadius: 6, padding: '6px 10px', cursor: canUndo ? 'pointer' : 'not-allowed', opacity: canUndo ? 1 : 0.4, transition: 'all 0.15s', minHeight: 36, minWidth: 36 }}
          >↩</button>
          <button
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo gate change"
            aria-disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: canRedo ? '#0A0A0A' : '#A8A29E', background: '#F5F2EA', border: `1px solid ${canRedo ? '#1A1A1A' : '#D8D4C7'}`, borderRadius: 6, padding: '6px 10px', cursor: canRedo ? 'pointer' : 'not-allowed', opacity: canRedo ? 1 : 0.4, transition: 'all 0.15s', minHeight: 36, minWidth: 36 }}
          >↪</button>

          {/* Library */}
          <button
            onClick={() => setShowLibrary(true)}
            aria-label="Open circuit library (Cmd+L)"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', color: '#0A0A0A', background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', minHeight: 36, fontWeight: 600 }}
          >
            <span aria-hidden="true">◧</span><span>LIBRARY</span><kbd aria-hidden="true" style={{ fontSize: 9, opacity: 0.7, background: '#EAE7DF', borderRadius: 3, padding: '1px 4px' }}>⌘L</kbd>
          </button>

          {/* Debugger */}
          <button
            onClick={() => setShowDebugger(true)}
            aria-label="Open step debugger (Cmd+B)"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', color: '#0A0A0A', background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', minHeight: 36, fontWeight: 600 }}
          >
            <span aria-hidden="true">▶▶</span><span>DEBUG</span><kbd aria-hidden="true" style={{ fontSize: 9, opacity: 0.7, background: '#EAE7DF', borderRadius: 3, padding: '1px 4px' }}>⌘B</kbd>
          </button>

          {/* Optimizer */}
          <button
            onClick={() => setShowOptimizer(true)}
            aria-label="Open circuit optimizer (Cmd+O)"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
              color: '#0A0A0A', background: '#FFFFFF', border: `1.5px solid #1A1A1A`,
              borderRadius: 999, padding: '6px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, fontWeight: 600,
            }}
          >
            <span aria-hidden="true">◈</span>
            <span>OPTIMIZE</span>
            <kbd aria-hidden="true" style={{ fontSize: 9, opacity: 0.7, background: '#EAE7DF', borderRadius: 3, padding: '1px 4px' }}>⌘O</kbd>
          </button>

          {/* Download */}
          <button
            onClick={() => setShowDownload(true)}
            aria-label="Download circuit (Cmd+D)"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
              color: '#FFFFFF', background: '#1A1A1A', border: `1.5px solid #1A1A1A`,
              borderRadius: 999, padding: '6px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `2px 2px 0px rgba(26,26,26,0.12)`, fontWeight: 700, minHeight: 36,
            }}
          >
            <span aria-hidden="true">↓</span>
            <span>DOWNLOAD</span>
            <kbd aria-hidden="true" style={{ fontSize: 9, opacity: 0.7, background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 4px' }}>⌘D</kbd>
          </button>
        </nav>
      </motion.header>

      {/* ── Main layout ── */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'auto 1fr',
          gap: 0,
          minHeight: 'calc(100vh - 64px)',
        }}
        className="lg-machine-grid"
      >
        {/* ── Left: Circuit + Controls ── */}
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Title block */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#78756C',
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              Live Quantum Circuit Interface
            </div>
            <h1
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)',
                fontWeight: 800,
                color: '#0A0A0A',
                lineHeight: 1.05,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              The Machine
            </h1>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 15,
                color: '#4A4740',
                marginTop: 10,
                lineHeight: 1.6,
                maxWidth: 560,
              }}
            >
              History ends. Computation begins. Interact with a live quantum circuit — place gates, run the algorithm, observe superposition collapse.
            </p>
          </motion.div>

          {/* Circuit panel */}
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            aria-label="Quantum circuit board"
            style={{
              background: '#FFFFFF',
              border: `1.5px solid #1A1A1A`,
              borderRadius: 16,
              padding: 'clamp(16px, 3vw, 24px)',
              boxShadow: `4px 4px 0px rgba(26,26,26,0.08)`,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#0A0A0A',
                  fontWeight: 700,
                }}
              >
                Quantum Circuit — 3 Qubits · {COLS - 1} Columns
                {noiseConfig.enabled && <span style={{ color: N.pink, marginLeft: 8 }}>⚡ {noiseConfig.model}</span>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <AnimatePresence>
                  {runComplete && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      aria-live="polite"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 11,
                        color: '#059669',
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                      }}
                    >
                      ✓ COMPLETE
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Histogram toggle */}
                <button
                  onClick={() => setShowHistogram(v => !v)}
                  aria-label={showHistogram ? 'Hide measurement histogram' : 'Show measurement histogram'}
                  aria-pressed={showHistogram}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
                    color: showHistogram ? '#FFFFFF' : '#0A0A0A', background: showHistogram ? '#1A1A1A' : '#F5F2EA',
                    border: `1.5px solid #1A1A1A`, borderRadius: 6, padding: '6px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: 600, transition: 'all 0.15s ease', minHeight: 36,
                  }}
                >
                  <span aria-hidden="true">▦</span> Histogram
                </button>
                {/* Export button inline */}
                <button
                  onClick={() => setShowDownload(true)}
                  aria-label="Export circuit as PNG or SVG"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
                    color: '#0A0A0A', background: '#F5F2EA', border: `1.5px solid #1A1A1A`,
                    borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: 600, transition: 'all 0.15s ease', minHeight: 36,
                  }}
                >
                  <span aria-hidden="true">↓</span> Export
                </button>
                <button
                  onClick={runCircuit}
                  disabled={isRunning}
                  aria-label={isRunning ? 'Circuit is running…' : 'Run quantum circuit'}
                  aria-busy={isRunning}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                    background: isRunning ? '#78756C' : '#1A1A1A',
                    border: `1.5px solid #1A1A1A`,
                    borderRadius: 999, padding: '7px 18px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    boxShadow: isRunning ? 'none' : `2px 2px 0px rgba(26,26,26,0.12)`,
                    fontWeight: 700,
                    transition: 'all 0.2s ease', minHeight: 36,
                  }}
                >
                  {isRunning ? '▶ Running…' : '▶ Run Circuit'}
                </button>
              </div>
            </div>

            {/* Circuit rows */}
            <div style={{ minWidth: 640 }} role="region" aria-label="Circuit gate grid">
              {qubits.map(q => (
                <CircuitRow
                  key={q.id}
                  qubit={q}
                  gates={gates}
                  cols={COLS}
                  onGateClick={g => setSelectedGate(g)}
                  activeCol={activeCol}
                />
              ))}
            </div>

            {/* Column index */}
            <div
              aria-hidden="true"
              style={{
                display: 'flex',
                paddingLeft: 52,
                paddingRight: 40,
                marginTop: 8,
                gap: 0,
              }}
            >
              {Array.from({ length: COLS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 52,
                    textAlign: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9,
                    color: i === activeCol ? N.cyan : N.textDim,
                    opacity: i === activeCol ? 1 : 0.5,
                    transition: 'color 0.2s',
                  }}
                >
                  {i > 0 ? i : ''}
                </div>
              ))}
            </div>

            {/* ── Inline Circuit Metrics (real-time fidelity, error model, depth) ── */}
            <CircuitMetricsBar
              gates={gates}
              cols={COLS}
              isRunning={isRunning}
              runComplete={runComplete}
            />

            {/* ── Measurement Outcomes Histogram ── */}
            <MeasurementHistogram gates={gates} isVisible={showHistogram} />

            {/* ── Real-time State Vector Visualizer ── */}
            <StateVectorVisualizer gates={gates} />
          </motion.section>

          {/* Gate palette */}
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            aria-label="Gate library palette"
            style={{
              background: N.panel,
              border: `1px solid ${N.panelBorder}`,
              borderRadius: 12,
              padding: 'clamp(12px, 2vw, 16px) clamp(14px, 3vw, 20px)',
            }}
          >
            <h2
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: N.textDim,
                marginBottom: 12,
                marginTop: 0,
              }}
            >
              Gate Library
            </h2>
            <div role="list" aria-label="Available quantum gates" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GATE_TYPES.map(type => (
                <div
                  key={type}
                  role="listitem"
                  title={GATE_DESCRIPTIONS[type]}
                  aria-label={`${type} gate — ${GATE_DESCRIPTIONS[type]}`}
                  tabIndex={0}
                  style={{
                    width: 44,
                    height: 44,
                    border: `1.5px solid ${GATE_COLORS[type]}60`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${GATE_COLORS[type]}08`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px ${GATE_COLORS[type]}50`;
                    (e.currentTarget as HTMLElement).style.borderColor = GATE_COLORS[type];
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = `${GATE_COLORS[type]}60`;
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: type.length > 2 ? 7 : 10,
                      fontWeight: 700,
                      color: GATE_COLORS[type],
                    }}
                  >
                    {type}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Back to archive CTA */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
          >
            <button
              onClick={() => setView('archive')}
              aria-label="Back to Archive"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: N.textSoft,
                background: 'transparent',
                border: `1px solid ${N.panelBorder}`,
                borderRadius: 999,
                padding: '8px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minHeight: 44,
              }}
            >
              ← Back to Archive
            </button>
            <span className="hidden sm:inline" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim }}>
              Enter run · ⌘Z undo · ⌘⇧Z redo · ⌘B debug · ⌘N noise · ⌘O optimize · ⌘L library · ⌘D download · Esc close
            </span>
          </motion.div>
        </div>

        {/* ── Right sidebar ── */}
        <aside
          aria-label="Qubit states and archive events"
          style={{
            borderLeft: `1.5px solid #1A1A1A`,
            padding: 'clamp(16px, 3vw, 32px) clamp(12px, 2vw, 20px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            background: '#F5F2EA',
          }}
        >
          {/* Bloch spheres */}
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            aria-label="Bloch sphere qubit states"
          >
            <h2
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#78756C',
                marginBottom: 12,
                marginTop: 0,
                fontWeight: 700,
              }}
            >
              Bloch Sphere States
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {qubits.map((q, i) => {
                const colors = [N.cyan, N.violet, N.pink];
                return (
                  <div
                    key={q.id}
                    aria-label={`Qubit ${q.label} in state ${q.state}, |0⟩ probability ${(q.probability * 100).toFixed(0)}%`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#FFFFFF',
                      border: `1.5px solid #1A1A1A`,
                      borderRadius: 12,
                      padding: '10px 14px',
                      boxShadow: '2px 2px 0px rgba(26,26,26,0.06)',
                    }}
                  >
                    <div aria-hidden="true">
                      <BlochSphere
                        theta={blochAngles[i].theta}
                        phi={blochAngles[i].phi}
                        color={colors[i]}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'Fraunces, Georgia, serif',
                          fontSize: 15,
                          color: '#0A0A0A',
                          fontWeight: 800,
                          marginBottom: 4,
                        }}
                      >
                        {q.label} — <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: colors[i] }}>{q.state}</span>
                      </div>
                      <ProbBar value={q.probability} color={colors[i]} label="|0⟩" />
                      <div style={{ marginTop: 4 }}>
                        <ProbBar value={1 - q.probability} color={colors[i]} label="|1⟩" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Quantum events from history — with bookmarks */}
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            aria-label="Archive events from quantum history"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#78756C',
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                From the Archive
              </h2>
              {bookmarkedEvents.size > 0 && (
                <span
                  aria-live="polite"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: N.amber,
                    border: `1px solid ${N.amber}`,
                    background: '#FEF3C7',
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontWeight: 700,
                  }}
                >
                  {bookmarkedEvents.size} saved
                </span>
              )}
            </div>
            <ul role="list" aria-label="Quantum computing events" style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
              {QUANTUM_EVENTS.filter(e => e.track === 'computing').slice(0, 5).map(event => (
                <li
                  key={event.id}
                  style={{
                    background: bookmarkedEvents.has(event.id) ? '#FEF3C7' : '#FFFFFF',
                    border: `1.5px solid ${bookmarkedEvents.has(event.id) ? N.amber : '#1A1A1A'}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    transition: 'all 0.15s ease',
                    boxShadow: '2px 2px 0px rgba(26,26,26,0.04)',
                  }}
                >
                  <button
                    onClick={() => setSelectedEvent(event)}
                    aria-label={`View details for ${event.year}: ${event.title}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 0,
                      minHeight: 44,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Fraunces, Georgia, serif',
                        fontSize: 16,
                        fontWeight: 800,
                        color: '#0A0A0A',
                        lineHeight: 1,
                        flexShrink: 0,
                        width: 40,
                      }}
                    >
                      {event.year}
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 12,
                        color: '#4A4740',
                        lineHeight: 1.4,
                        fontWeight: 500,
                      }}
                    >
                      {event.title}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleBookmark(event.id)}
                    aria-label={bookmarkedEvents.has(event.id) ? `Remove bookmark for ${event.title}` : `Bookmark ${event.title}`}
                    aria-pressed={bookmarkedEvents.has(event.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      fontSize: 16,
                      color: bookmarkedEvents.has(event.id) ? N.amber : '#78756C',
                      flexShrink: 0,
                      transition: 'color 0.15s ease',
                      lineHeight: 1,
                      minHeight: 44,
                      minWidth: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {bookmarkedEvents.has(event.id) ? '★' : '☆'}
                  </button>
                </li>
              ))}
            </ul>

            {/* Bookmarked events section */}
            <AnimatePresence>
              {bookmarkedEvents.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginTop: 12 }}
                >
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: N.amber,
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    ★ Bookmarked
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
                    {QUANTUM_EVENTS.filter(e => bookmarkedEvents.has(e.id)).map(event => (
                      <li key={event.id}>
                        <button
                          onClick={() => setSelectedEvent(event)}
                          aria-label={`View bookmarked event: ${event.year} — ${event.title}`}
                          style={{
                            width: '100%',
                            background: '#FEF3C7',
                            border: `1.5px solid ${N.amber}`,
                            borderRadius: 8,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.15s ease',
                            minHeight: 44,
                          }}
                        >
                          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 13, fontWeight: 800, color: N.amber, flexShrink: 0, width: 36 }}>
                            {event.year}
                          </span>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#0A0A0A', lineHeight: 1.3 }}>
                            {event.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* System status */}
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            aria-label="System status"
            style={{
              background: '#FFFFFF',
              border: `1.5px solid #1A1A1A`,
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: '2px 2px 0px rgba(26,26,26,0.06)',
            }}
          >
            <h2
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#78756C',
                marginBottom: 10,
                marginTop: 0,
                fontWeight: 700,
              }}
            >
              System Status
            </h2>
            <dl style={{ margin: 0 }}>
              {[
                { label: 'Coherence', value: '99.2%', color: N.cyan },
                { label: 'Gate Fidelity', value: '99.8%', color: '#059669' },
                { label: 'Error Rate', value: '0.12%', color: N.pink },
                { label: 'T1 Time', value: '127 μs', color: N.amber },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <dt
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      color: '#4A4740',
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      color,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid #D8D4C7`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isRunning ? N.amber : '#059669',
                }}
              />
              <span
                aria-live="polite"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: isRunning ? N.amber : '#059669',
                  fontWeight: 700,
                }}
              >
                {isRunning ? 'EXECUTING' : 'READY'}
              </span>
            </div>
          </motion.section>
        </aside>
      </main>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {selectedGate && (
          <GateTooltip gate={selectedGate} onClose={() => setSelectedGate(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <QuantumEventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>

      {/* ── Download Modal ── */}
      <AnimatePresence>
        {showDownload && (
          <DownloadModal
            gates={gates}
            qubits={qubits}
            blochAngles={blochAngles}
            onClose={() => setShowDownload(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Circuit Optimizer Panel ── */}
      <CircuitOptimizerPanel
        gates={gates}
        isOpen={showOptimizer}
        onClose={() => setShowOptimizer(false)}
      />

      {/* ── Step Debugger ── */}
      <StepDebugger gates={gates} isOpen={showDebugger} onClose={() => setShowDebugger(false)} noiseConfig={noiseConfig} />

      {/* ── Noise Panel ── */}
      <NoisePanel isOpen={showNoise} onClose={() => setShowNoise(false)} config={noiseConfig} onChange={setNoiseConfig} />

      {/* ── Circuit Library ── */}
      <CircuitLibraryPanel
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onLoadTemplate={loadTemplate}
      />

      {/* ── Circuit Share Modal ── */}
      <CircuitShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        gates={gates}
        qubits={qubits}
      />

      {/* ── Event Search ── */}
      <AnimatePresence>
        {showEventSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Search quantum events"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(43,43,43,0.45)',
              backdropFilter: 'blur(8px)',
              zIndex: 80,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 120,
              paddingLeft: 16,
              paddingRight: 16,
            }}
            onClick={() => setShowEventSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 560,
                background: 'rgba(242,240,234,0.98)',
                border: `1px solid ${N.panelBorder}`,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: `0 32px 80px rgba(43,43,43,0.18)`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${N.panelBorder}`,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 16 16" style={{ flexShrink: 0, opacity: 0.5 }} aria-hidden="true">
                  <circle cx={6.5} cy={6.5} r={5} fill="none" stroke={N.cyan} strokeWidth={1.5} />
                  <line x1={10.5} y1={10.5} x2={14} y2={14} stroke={N.cyan} strokeWidth={1.5} />
                </svg>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search quantum events…"
                  aria-label="Search quantum events"
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 15,
                    color: N.textPrimary,
                  }}
                />
                <kbd
                  aria-label="Press Escape to close"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: N.textDim,
                    border: `1px solid ${N.panelBorder}`,
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  ESC
                </kbd>
              </div>
              <ul role="listbox" aria-label="Search results" style={{ maxHeight: 360, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, WebkitOverflowScrolling: 'touch' }}>
                {filteredEvents.map(event => (
                  <li key={event.id} role="option" aria-selected={false}>
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventSearch(false);
                        setSearchQuery('');
                      }}
                      aria-label={`${event.year}: ${event.title} — ${event.track}`}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                        borderBottom: `1px solid ${N.panelBorder}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                        minHeight: 56,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = `rgba(0,255,209,0.05)`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'none';
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Fraunces, Georgia, serif',
                          fontSize: 18,
                          fontWeight: 700,
                          color: N.cyan,
                          width: 48,
                          flexShrink: 0,
                        }}
                      >
                        {event.year}
                      </span>
                      <div>
                        <div
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: 13,
                            color: N.textPrimary,
                            fontWeight: 500,
                            marginBottom: 2,
                          }}
                        >
                          {event.title}
                        </div>
                        <div
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 10,
                            color: N.textDim,
                          }}
                        >
                          {event.track} · {event.people.slice(0, 2).join(', ')}
                        </div>
                      </div>
                      {bookmarkedEvents.has(event.id) && (
                        <span aria-hidden="true" style={{ marginLeft: 'auto', color: N.amber, fontSize: 12 }}>★</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .lg-machine-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 1024px) {
          .lg-machine-grid {
            grid-template-columns: 1fr 320px;
          }
        }
        .hidden { display: none !important; }
        @media (min-width: 640px) {
          .hidden.sm\\:inline { display: inline !important; }
        }
      `}</style>
    </div>
  );
}
