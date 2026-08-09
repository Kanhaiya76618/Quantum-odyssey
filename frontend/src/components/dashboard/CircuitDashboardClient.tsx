import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircuitStore } from '../../store/circuitStore';
import { QUANTUM_EVENTS } from '../../content/quantum_timeline';

const N = {
  bg: '#050A14',
  bg2: '#080F1E',
  panel: 'rgba(0,255,209,0.04)',
  panelBorder: 'rgba(0,255,209,0.18)',
  cyan: '#00FFD1',
  violet: '#9B5DE5',
  pink: '#FF2D78',
  amber: '#FFB800',
  blue: '#3B82F6',
  gridLine: 'rgba(0,255,209,0.07)',
  textPrimary: '#E8F4F0',
  textSoft: 'rgba(232,244,240,0.55)',
  textDim: 'rgba(232,244,240,0.28)',
};

const GATE_TYPES = ['H', 'X', 'Y', 'Z', 'CNOT', 'T', 'S', 'RZ', 'CX', 'SWAP'] as const;
type GateType = typeof GATE_TYPES[number];

const GATE_COLORS: Record<GateType, string> = {
  H: N.cyan, X: N.pink, Y: N.violet, Z: N.amber,
  CNOT: N.cyan, T: N.pink, S: N.violet, RZ: N.amber,
  CX: N.blue, SWAP: N.cyan,
};

const INITIAL_GATE_COUNTS: Record<GateType, number> = {
  H: 4, X: 1, Y: 1, Z: 1, CNOT: 2, T: 2, S: 1, RZ: 1, CX: 1, SWAP: 1,
};

const QUBIT_DATA = [
  { label: 'q₀', state: '|0⟩', prob0: 0.50, color: N.cyan },
  { label: 'q₁', state: '|+⟩', prob0: 0.72, color: N.violet },
  { label: 'q₂', state: '|ψ⟩', prob0: 0.31, color: N.pink },
];

const CIRCUIT_STATS = [
  { label: 'Total Gates', value: '15', color: N.cyan, sub: 'across 3 qubits' },
  { label: 'Circuit Depth', value: '10', color: N.violet, sub: 'columns' },
  { label: 'Gate Fidelity', value: '99.8%', color: N.amber, sub: 'avg per gate' },
  { label: 'T1 Coherence', value: '127 μs', color: N.pink, sub: 'decoherence time' },
];

function NeonGrid() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${N.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${N.gridLine} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    />
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      aria-label={`${label}: ${value} — ${sub}`}
      style={{
        background: N.panel,
        border: `1px solid ${color}30`,
        borderRadius: 14,
        padding: 'clamp(14px, 3vw, 20px) clamp(14px, 3vw, 22px)',
        boxShadow: `0 0 20px ${color}08`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', color: N.textDim, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color, lineHeight: 1, marginBottom: 4, textShadow: `0 0 20px ${color}40` }}>
        {value}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim }}>
        {sub}
      </div>
    </motion.article>
  );
}

export default function CircuitDashboardPage() {
  const [bookmarkedEvents, setBookmarkedEvents] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'gates' | 'qubits' | 'archive'>('gates');
  const [exportDone, setExportDone] = useState(false);
  const [exporting, setExporting] = useState(false);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarkedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exportCircuitImage = useCallback(() => {
    setExporting(true);
    const W = 800, H = 320;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setExporting(false); return; }
    ctx.scale(2, 2);

    ctx.fillStyle = '#050A14';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(0,255,209,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 48) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let j = 0; j < H; j += 48) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
    }

    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = N.cyan;
    ctx.globalAlpha = 0.7;
    ctx.fillText('QUANTUM CIRCUIT DASHBOARD — EXPORT', 24, 28);
    ctx.globalAlpha = 1;

    const COLS = 11, COL_W = 52, ROW_H = 52, LABEL_W = 52, PAD = 24;
    const circuitLayout = [
      { type: 'H', qubit: 0, col: 1 }, { type: 'H', qubit: 1, col: 1 }, { type: 'H', qubit: 2, col: 1 },
      { type: 'CNOT', qubit: 0, col: 2 }, { type: 'X', qubit: 1, col: 3 }, { type: 'Z', qubit: 2, col: 3 },
      { type: 'T', qubit: 0, col: 4 }, { type: 'S', qubit: 1, col: 4 }, { type: 'CNOT', qubit: 2, col: 5 },
      { type: 'RZ', qubit: 0, col: 6 }, { type: 'Y', qubit: 1, col: 6 }, { type: 'H', qubit: 2, col: 7 },
      { type: 'CX', qubit: 0, col: 8 }, { type: 'SWAP', qubit: 1, col: 8 }, { type: 'T', qubit: 2, col: 9 },
    ];

    QUBIT_DATA.forEach((q, qi) => {
      const y = 50 + qi * ROW_H + ROW_H / 2;
      ctx.strokeStyle = q.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD + LABEL_W, y);
      ctx.lineTo(PAD + LABEL_W + COLS * COL_W, y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = q.color;
      ctx.textAlign = 'right';
      ctx.fillText(q.label, PAD + LABEL_W - 8, y + 4);
      ctx.textAlign = 'left';

      circuitLayout.filter(g => g.qubit === qi).forEach(g => {
        const gx = PAD + LABEL_W + g.col * COL_W + COL_W / 2 - 18;
        const gy = y - 18;
        const color = GATE_COLORS[g.type as GateType] || N.cyan;
        ctx.fillStyle = `${color}15`;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(gx, gy, 36, 36, 6);
        ctx.fill();
        ctx.stroke();
        ctx.font = `700 ${g.type.length > 2 ? 7 : 10}px "JetBrains Mono", monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(g.type, gx + 18, gy + 22);
        ctx.textAlign = 'left';
      });
    });

    const statsY = H - 40;
    ctx.fillStyle = 'rgba(0,255,209,0.04)';
    ctx.fillRect(0, statsY - 10, W, 50);
    ctx.strokeStyle = N.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, statsY - 10); ctx.lineTo(W, statsY - 10); ctx.stroke();

    const stats = [
      { label: 'GATES', value: '15', color: N.cyan },
      { label: 'DEPTH', value: '10', color: N.violet },
      { label: 'FIDELITY', value: '99.8%', color: N.amber },
      { label: 'T1', value: '127μs', color: N.pink },
    ];
    stats.forEach((s, i) => {
      const sx = PAD + i * 180;
      ctx.font = '400 9px "JetBrains Mono", monospace';
      ctx.fillStyle = N.textDim;
      ctx.fillText(s.label, sx, statsY + 4);
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillStyle = s.color;
      ctx.fillText(s.value, sx, statsY + 20);
    });

    canvas.toBlob(blob => {
      if (!blob) { setExporting(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `circuit-dashboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    }, 'image/png');
  }, []);

  const archiveEvents = QUANTUM_EVENTS.filter(e => e.track === 'computing').slice(0, 12);
  const totalGates = Object.values(INITIAL_GATE_COUNTS).reduce((a, b) => a + b, 0);
  const maxGateCount = Math.max(...Object.values(INITIAL_GATE_COUNTS));

  return (
    <div style={{ minHeight: '100vh', background: N.bg, color: N.textPrimary, position: 'relative', overflow: 'hidden' }}>
      <NeonGrid />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        role="banner"
        aria-label="Circuit Dashboard"
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
          padding: '0 clamp(16px, 4vw, 32px)', minHeight: 60,
          borderBottom: `1px solid ${N.panelBorder}`,
          background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div aria-hidden="true" style={{ width: 28, height: 28, border: `1.5px solid ${N.cyan}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${N.cyan}40`, flexShrink: 0 }}>
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
              <rect x={2} y={2} width={4} height={4} fill={N.cyan} opacity={0.8} rx={1} />
              <rect x={8} y={2} width={4} height={4} fill={N.violet} opacity={0.8} rx={1} />
              <rect x={2} y={8} width={4} height={4} fill={N.pink} opacity={0.8} rx={1} />
              <rect x={8} y={8} width={4} height={4} fill={N.amber} opacity={0.8} rx={1} />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 700, color: N.textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Circuit Dashboard
          </h1>
          <span aria-label="Analytics panel" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.violet, border: `1px solid ${N.violet}40`, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.1em' }}>
            ANALYTICS
          </span>
        </div>

        <nav aria-label="Dashboard navigation" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setView('machine-world')} aria-label="Go to Machine World" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: N.textSoft, background: 'transparent', border: `1px solid ${N.panelBorder}`, borderRadius: 999, padding: '6px 12px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            ← Machine World
          </button>
          <button onClick={() => setView('archive')} aria-label="Go to Grand Quantum Museum" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: N.textSoft, background: 'transparent', border: 'none', padding: '6px 4px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            Grand Quantum Museum
          </button>
          <button onClick={() => setView('city')} aria-label="Go to Fintech Compass" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: N.cyan, background: 'transparent', border: `1px solid ${N.cyan}50`, borderRadius: 999, padding: '6px 12px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            Fintech Compass ⚡
          </button>
          <button
            onClick={exportCircuitImage}
            disabled={exporting}
            aria-label={exportDone ? 'Circuit saved as PNG' : exporting ? 'Generating export…' : 'Export circuit as PNG'}
            aria-busy={exporting}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
              color: exportDone ? N.bg : N.bg,
              background: exportDone ? N.amber : exporting ? N.textDim : N.cyan,
              border: `1.5px solid ${exportDone ? N.amber : exporting ? N.textDim : N.cyan}`,
              borderRadius: 999, padding: '6px 14px', cursor: exporting ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 0 12px ${exportDone ? N.amber : N.cyan}40`,
              fontWeight: 700, transition: 'all 0.2s ease', minHeight: 36,
            }}
          >
            {exportDone ? '✓ Saved' : exporting ? '…' : '↓ Export PNG'}
          </button>
        </nav>
      </motion.header>

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 2, padding: 'clamp(16px, 4vw, 32px)', maxWidth: 1280, margin: '0 auto' }}>

        {/* Stat cards */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          aria-label="Circuit statistics"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'clamp(10px, 2vw, 16px)', marginBottom: 'clamp(20px, 4vw, 32px)' }}
        >
          {CIRCUIT_STATS.map(s => (
            <StatCard key={s.label} {...s} />
          ))}
          <StatCard label="QAOA Arbitrage" value="+$285.60" color={N.cyan} sub="IBM Brisbane (127Q)" />
        </motion.section>

        {/* Two-column layout — stacks on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24 }}
          className="lg:grid-cols-[1fr_380px]"
        >

          {/* Left: Tabs panel */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            aria-label="Circuit data panels"
            style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 16, overflow: 'hidden' }}
          >
            {/* Tab bar */}
            <div role="tablist" aria-label="Circuit data tabs" style={{ display: 'flex', borderBottom: `1px solid ${N.panelBorder}`, padding: '0 clamp(12px, 3vw, 20px)', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(['gates', 'qubits', 'archive'] as const).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`tabpanel-${tab}`}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
                    textTransform: 'uppercase', padding: '14px clamp(10px, 2vw, 16px)', background: 'none', border: 'none',
                    cursor: 'pointer', color: activeTab === tab ? N.cyan : N.textDim,
                    borderBottom: activeTab === tab ? `2px solid ${N.cyan}` : '2px solid transparent',
                    transition: 'all 0.15s ease', marginBottom: -1, whiteSpace: 'nowrap', minHeight: 44,
                  }}
                >
                  {tab === 'gates' ? 'Gate Distribution' : tab === 'qubits' ? 'Qubit States' : 'Archive Events'}
                </button>
              ))}
            </div>

            <div style={{ padding: 'clamp(16px, 3vw, 24px) clamp(14px, 3vw, 20px)' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'gates' && (
                  <motion.div
                    key="gates"
                    role="tabpanel"
                    id="tabpanel-gates"
                    aria-labelledby="tab-gates"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', marginBottom: 20 }}>
                      {totalGates} TOTAL GATES ACROSS {GATE_TYPES.length} TYPES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {GATE_TYPES.map(type => {
                        const count = INITIAL_GATE_COUNTS[type];
                        const pct = (count / maxGateCount) * 100;
                        const color = GATE_COLORS[type];
                        return (
                          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div aria-hidden="true" style={{ width: 32, height: 32, border: `1.5px solid ${color}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}10`, flexShrink: 0 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: type.length > 2 ? 7 : 10, fontWeight: 700, color }}>{type}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textSoft }}>{type} Gate</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color, fontWeight: 700 }}>{count}×</span>
                              </div>
                              <div
                                role="meter"
                                aria-label={`${type} gate count: ${count}`}
                                aria-valuenow={count}
                                aria-valuemin={0}
                                aria-valuemax={maxGateCount}
                                style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                                  style={{ height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}60` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'qubits' && (
                  <motion.div
                    key="qubits"
                    role="tabpanel"
                    id="tabpanel-qubits"
                    aria-labelledby="tab-qubits"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em', marginBottom: 20 }}>
                      3 QUBITS — CURRENT SUPERPOSITION STATES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {QUBIT_DATA.map(q => (
                        <article key={q.label} aria-label={`Qubit ${q.label} in state ${q.state}`} style={{ background: `${q.color}06`, border: `1px solid ${q.color}25`, borderRadius: 12, padding: 'clamp(14px, 3vw, 18px) clamp(14px, 3vw, 20px)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: q.color }}>{q.label}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: N.textDim, marginLeft: 10 }}>{q.state}</span>
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: q.color, border: `1px solid ${q.color}40`, borderRadius: 4, padding: '2px 8px' }}>
                              SUPERPOSITION
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                              { label: '|0⟩ probability', value: q.prob0 },
                              { label: '|1⟩ probability', value: 1 - q.prob0 },
                            ].map(bar => (
                              <div key={bar.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.textDim }}>{bar.label}</span>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: q.color, fontWeight: 700 }}>{(bar.value * 100).toFixed(0)}%</span>
                                </div>
                                <div
                                  role="meter"
                                  aria-label={`${bar.label}: ${(bar.value * 100).toFixed(0)}%`}
                                  aria-valuenow={Math.round(bar.value * 100)}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${bar.value * 100}%` }}
                                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ height: '100%', background: q.color, borderRadius: 3, boxShadow: `0 0 8px ${q.color}60` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'archive' && (
                  <motion.div
                    key="archive"
                    role="tabpanel"
                    id="tabpanel-archive"
                    aria-labelledby="tab-archive"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim, letterSpacing: '0.12em' }}>
                        COMPUTING TRACK — {archiveEvents.length} EVENTS
                      </div>
                      {bookmarkedEvents.size > 0 && (
                        <span aria-live="polite" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.amber, border: `1px solid ${N.amber}40`, borderRadius: 999, padding: '2px 8px' }}>
                          ★ {bookmarkedEvents.size} bookmarked
                        </span>
                      )}
                    </div>
                    <ul role="list" aria-label="Archive events" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, WebkitOverflowScrolling: 'touch' }}>
                      {archiveEvents.map(event => (
                        <li
                          key={event.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 12px', borderRadius: 8,
                            background: bookmarkedEvents.has(event.id) ? `${N.amber}08` : N.panel,
                            border: `1px solid ${bookmarkedEvents.has(event.id) ? N.amber + '50' : N.panelBorder}`,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, fontWeight: 700, color: N.cyan, flexShrink: 0, width: 40, lineHeight: 1.3 }}>
                            {event.year}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: N.textPrimary, fontWeight: 500, marginBottom: 2, lineHeight: 1.3 }}>
                              {event.title}
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: N.textDim }}>
                              {event.people.slice(0, 2).join(', ')}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleBookmark(event.id)}
                            aria-label={bookmarkedEvents.has(event.id) ? `Remove bookmark for ${event.title}` : `Bookmark ${event.title}`}
                            aria-pressed={bookmarkedEvents.has(event.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: bookmarkedEvents.has(event.id) ? N.amber : N.textDim, flexShrink: 0, padding: '4px 6px', transition: 'color 0.15s ease', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {bookmarkedEvents.has(event.id) ? '★' : '☆'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Right: Bookmarks + Circuit preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Bookmarked events */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              aria-label="Bookmarked events"
              style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 14, padding: 'clamp(14px, 3vw, 20px)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: N.textDim, margin: 0 }}>
                  Bookmarked Events
                </h2>
                <span aria-live="polite" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.amber }}>
                  {bookmarkedEvents.size} / {archiveEvents.length}
                </span>
              </div>
              <AnimatePresence>
                {bookmarkedEvents.size === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: N.textDim, textAlign: 'center', padding: '20px 0', margin: 0 }}
                  >
                    <span aria-hidden="true" style={{ display: 'block', fontSize: 24, marginBottom: 8, opacity: 0.4 }}>☆</span>
                    Bookmark events from the Archive tab
                  </motion.p>
                ) : (
                  <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }} aria-label="Bookmarked events list">
                    {QUANTUM_EVENTS.filter(e => bookmarkedEvents.has(e.id)).map(event => (
                      <motion.li
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: `${N.amber}08`, border: `1px solid ${N.amber}30`, borderRadius: 8 }}
                      >
                        <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 13, fontWeight: 700, color: N.amber, flexShrink: 0, width: 36 }}>
                          {event.year}
                        </span>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: N.textSoft, flex: 1, lineHeight: 1.3 }}>
                          {event.title}
                        </span>
                        <button
                          onClick={() => toggleBookmark(event.id)}
                          aria-label={`Remove bookmark for ${event.title}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: N.amber, fontSize: 12, padding: 4, minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ★
                        </button>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Export circuit card */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              aria-label="Export circuit"
              style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 14, padding: 'clamp(14px, 3vw, 20px)', position: 'relative', overflow: 'hidden' }}
            >
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${N.cyan}60, transparent)` }} />
              <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: N.textDim, marginBottom: 12, marginTop: 0 }}>
                Export Circuit
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: N.textSoft, lineHeight: 1.6, marginBottom: 16, marginTop: 0 }}>
                Export the full circuit diagram with gate layout, qubit wires, and measurement symbols as a high-resolution PNG image.
              </p>
              <button
                onClick={exportCircuitImage}
                disabled={exporting}
                aria-label={exportDone ? 'Circuit saved as PNG' : exporting ? 'Generating export…' : 'Export circuit as PNG'}
                aria-busy={exporting}
                style={{
                  width: '100%', padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: exportDone ? N.bg : N.bg,
                  background: exportDone ? N.amber : exporting ? N.textDim : N.cyan,
                  border: 'none', borderRadius: 8, cursor: exporting ? 'wait' : 'pointer',
                  fontWeight: 700, transition: 'all 0.2s ease',
                  boxShadow: `0 0 16px ${exportDone ? N.amber : N.cyan}40`,
                  minHeight: 44,
                }}
              >
                {exportDone ? '✓ Circuit Saved as PNG' : exporting ? 'Generating…' : '↓ Export Circuit as PNG'}
              </button>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setView('machine-world')}
                  aria-label="Open Machine World circuit builder"
                  style={{
                    flex: 1, padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: N.cyan,
                    background: 'transparent', border: `1px solid ${N.cyan}40`, borderRadius: 8,
                    cursor: 'pointer', textAlign: 'center', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', minHeight: 44,
                    transition: 'all 0.15s ease',
                  }}
                >
                  Open Machine →
                </button>
              </div>
            </motion.section>

            {/* Quick nav */}
            <motion.nav
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              aria-label="Quick navigation"
              style={{ background: N.panel, border: `1px solid ${N.panelBorder}`, borderRadius: 14, padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)' }}
            >
              <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: N.textDim, marginBottom: 12, marginTop: 0 }}>
                Quick Navigation
              </h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { viewName: 'machine-world', label: 'Machine World', sub: 'Interactive gate canvas', color: N.cyan },
                  { viewName: 'archive', label: 'Grand Quantum Museum', sub: '3D timeline building', color: N.violet },
                  { viewName: 'city', label: 'Qubit City & Fintech Compass', sub: 'QAOA hardware solver', color: N.amber },
                  { viewName: 'landing', label: 'Paper Landing Screen', sub: 'Quantum Odyssey home', color: N.pink },
                ].map(nav => (
                  <li key={nav.viewName}>
                    <button
                      onClick={() => setView(nav.viewName as any)}
                      aria-label={`${nav.label} — ${nav.sub}`}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        background: 'transparent', border: `1px solid ${N.panelBorder}`, borderRadius: 8,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', minHeight: 44,
                      }}
                    >
                      <div aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: nav.color, boxShadow: `0 0 6px ${nav.color}`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: nav.color, fontWeight: 700 }}>{nav.label}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: N.textDim }}>{nav.sub}</div>
                      </div>
                      <span aria-hidden="true" style={{ marginLeft: 'auto', color: N.textDim, fontSize: 12 }}>→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
        .lg\\:grid-cols-\\[1fr_380px\\] {
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .lg\\:grid-cols-\\[1fr_380px\\] {
            grid-template-columns: 1fr 380px;
          }
        }
      `}</style>
    </div>
  );
}
