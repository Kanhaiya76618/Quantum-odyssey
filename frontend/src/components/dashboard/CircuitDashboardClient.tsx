import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircuitStore } from '../../store/circuitStore';
import { QUANTUM_EVENTS } from '../../content/quantum_timeline';

// ─── Paper & Ink Design Tokens ───────────────────────────────────────────────
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
  gridLine: 'rgba(26,26,26,0.05)', // Engineering paper drafting grid
  textPrimary: '#0A0A0A',      // Pure ink black
  textSoft: '#4A4740',         // Soft ink body
  textDim: '#78756C',          // Muted drafting annotations
};

const GATE_TYPES = ['H', 'X', 'Y', 'Z', 'CNOT', 'T', 'S', 'RZ', 'CX', 'SWAP'] as const;
type GateType = typeof GATE_TYPES[number];

const GATE_COLORS: Record<GateType, string> = {
  H: N.cyan, X: N.pink, Y: N.violet, Z: N.blue,
  CNOT: N.amber, T: '#C2410C', S: N.cyan, RZ: N.violet,
  CX: N.amber, SWAP: N.pink,
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
  { label: 'Gate Fidelity', value: '99.8%', color: '#059669', sub: 'avg per gate' },
  { label: 'T1 Coherence', value: '127 μs', color: N.pink, sub: 'decoherence time' },
];

function PaperGrid() {
  return (
    <div
      aria-hidden="true"
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

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <motion.article
      whileHover={{ scale: 1.02, y: -2 }}
      aria-label={`${label}: ${value} — ${sub}`}
      style={{
        background: '#FFFFFF',
        border: `1.5px solid #1A1A1A`,
        borderRadius: 14,
        padding: 'clamp(14px, 3vw, 20px) clamp(14px, 3vw, 22px)',
        boxShadow: `3px 3px 0px rgba(26,26,26,0.06)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', color: N.textDim, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: N.textSoft, fontWeight: 500 }}>
        {sub}
      </div>
    </motion.article>
  );
}

export default function CircuitDashboardPage() {
  const setView = useCircuitStore((s) => s.setView);
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

    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(26,26,26,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 36) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let j = 0; j < H; j += 36) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
    }

    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0A0A0A';
    ctx.fillText('QUANTUM CIRCUIT DASHBOARD — ARCHIVAL BLUEPRINT', 24, 28);

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
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD + LABEL_W, y);
      ctx.lineTo(PAD + LABEL_W + COLS * COL_W, y);
      ctx.stroke();

      ctx.font = '800 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0A0A0A';
      ctx.textAlign = 'right';
      ctx.fillText(q.label, PAD + LABEL_W - 8, y + 4);
      ctx.textAlign = 'left';

      circuitLayout.filter(g => g.qubit === qi).forEach(g => {
        const gx = PAD + LABEL_W + g.col * COL_W + COL_W / 2 - 18;
        const gy = y - 18;
        const color = GATE_COLORS[g.type as GateType] || N.cyan;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#1A1A1A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(gx, gy, 36, 36, 6);
        ctx.fill();
        ctx.stroke();
        ctx.font = `800 ${g.type.length > 2 ? 8 : 11}px "JetBrains Mono", monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(g.type, gx + 18, gy + 22);
        ctx.textAlign = 'left';
      });
    });

    const statsY = H - 40;
    ctx.fillStyle = '#F5F2EA';
    ctx.fillRect(0, statsY - 10, W, 50);
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, statsY - 10); ctx.lineTo(W, statsY - 10); ctx.stroke();

    const stats = [
      { label: 'GATES', value: '15', color: N.cyan },
      { label: 'DEPTH', value: '10', color: N.violet },
      { label: 'FIDELITY', value: '99.8%', color: '#059669' },
      { label: 'T1', value: '127μs', color: N.pink },
    ];
    stats.forEach((s, i) => {
      const sx = PAD + i * 180;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#4A4740';
      ctx.fillText(s.label, sx, statsY + 4);
      ctx.font = '800 15px "Fraunces", Georgia, serif';
      ctx.fillStyle = s.color;
      ctx.fillText(s.value, sx, statsY + 22);
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
    <div style={{ minHeight: '100vh', background: '#FDFBF7', color: '#0A0A0A', position: 'relative', overflow: 'hidden' }}>
      <PaperGrid />

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
          padding: '0 clamp(16px, 4vw, 32px)', minHeight: 64,
          borderBottom: `1.5px solid #1A1A1A`,
          background: 'rgba(253,251,247,0.92)', backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div aria-hidden="true" style={{ width: 28, height: 28, border: `1.5px solid #1A1A1A`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EAE7DF', flexShrink: 0 }}>
            <span style={{ fontSize: 14, color: '#0A0A0A', fontWeight: 800 }}>◈</span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 'clamp(15px, 3vw, 18px)', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em', margin: 0 }}>
            Circuit Dashboard
          </h1>
          <span aria-label="Analytics panel" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.violet, border: `1px solid ${N.violet}`, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.1em', fontWeight: 700 }}>
            ANALYTICS
          </span>
        </div>

        <nav aria-label="Dashboard navigation" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setView('machine-world')} aria-label="Go to Machine World" className="ghost-pill" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1A1A1A', background: '#EAE7DF', border: `1.5px solid #1A1A1A`, borderRadius: 999, padding: '6px 14px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
            ← Machine World
          </button>
          <button onClick={() => setView('archive')} aria-label="Go to Grand Quantum Museum" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4A4740', background: 'transparent', border: 'none', padding: '6px 8px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
            Grand Quantum Museum
          </button>
          <button onClick={() => setView('city')} aria-label="Go to Fintech Compass" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A0A0A', background: '#FEF3C7', border: `1.5px solid #D97706`, borderRadius: 999, padding: '6px 14px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 700 }}>
            Fintech Compass ⚡
          </button>
          <button
            onClick={exportCircuitImage}
            disabled={exporting}
            aria-label={exportDone ? 'Circuit saved as PNG' : exporting ? 'Generating export…' : 'Export circuit as PNG'}
            aria-busy={exporting}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
              color: '#FFFFFF',
              background: exportDone ? N.amber : exporting ? '#78756C' : '#1A1A1A',
              border: `1.5px solid #1A1A1A`,
              borderRadius: 999, padding: '6px 16px', cursor: exporting ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `2px 2px 0px rgba(26,26,26,0.12)`,
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
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'clamp(10px, 2vw, 16px)', marginBottom: 'clamp(20px, 4vw, 32px)' }}
        >
          {CIRCUIT_STATS.map(s => (
            <StatCard key={s.label} {...s} />
          ))}
          <StatCard label="QAOA Arbitrage" value="+$285.60" color={N.cyan} sub="IBM Brisbane (127Q)" />
        </motion.section>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24 }}
          className="lg:grid-cols-[1fr_380px]"
        >

          {/* Left: Tabs panel */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            aria-label="Circuit data panels"
            style={{ background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, overflow: 'hidden', boxShadow: '4px 4px 0px rgba(26,26,26,0.06)' }}
          >
            {/* Tab bar */}
            <div role="tablist" aria-label="Circuit data tabs" style={{ display: 'flex', borderBottom: `1.5px solid #1A1A1A`, background: '#F5F2EA', padding: '0 clamp(12px, 3vw, 20px)', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(['gates', 'qubits', 'archive'] as const).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`tabpanel-${tab}`}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em',
                    textTransform: 'uppercase', padding: '14px clamp(10px, 2vw, 16px)', background: 'none', border: 'none',
                    cursor: 'pointer', color: activeTab === tab ? '#0A0A0A' : '#78756C',
                    fontWeight: activeTab === tab ? 800 : 500,
                    borderBottom: activeTab === tab ? `3px solid #1A1A1A` : '3px solid transparent',
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
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#78756C', letterSpacing: '0.12em', marginBottom: 20, fontWeight: 700 }}>
                      {totalGates} TOTAL GATES ACROSS {GATE_TYPES.length} TYPES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {GATE_TYPES.map(type => {
                        const count = INITIAL_GATE_COUNTS[type];
                        const pct = (count / maxGateCount) * 100;
                        const color = GATE_COLORS[type];
                        return (
                          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div aria-hidden="true" style={{ width: 34, height: 34, border: `1.5px solid #1A1A1A`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F2EA', flexShrink: 0, boxShadow: '2px 2px 0px rgba(26,26,26,0.08)' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: type.length > 2 ? 8 : 11, fontWeight: 800, color }}>{type}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#0A0A0A', fontWeight: 600 }}>{type} Gate</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color, fontWeight: 800 }}>{count}×</span>
                              </div>
                              <div
                                role="meter"
                                aria-label={`${type} gate count: ${count}`}
                                aria-valuenow={count}
                                aria-valuemin={0}
                                aria-valuemax={maxGateCount}
                                style={{ height: 6, background: '#EAE7DF', borderRadius: 3, border: '1px solid #D8D4C7', overflow: 'hidden' }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                                  style={{ height: '100%', background: color, borderRadius: 2 }}
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
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#78756C', letterSpacing: '0.12em', marginBottom: 20, fontWeight: 700 }}>
                      3 QUBITS — CURRENT SUPERPOSITION STATES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {QUBIT_DATA.map(q => (
                        <article key={q.label} aria-label={`Qubit ${q.label} in state ${q.state}`} style={{ background: '#FDFBF7', border: `1.5px solid #1A1A1A`, borderRadius: 12, padding: 'clamp(14px, 3vw, 18px) clamp(14px, 3vw, 20px)', boxShadow: '3px 3px 0px rgba(26,26,26,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 800, color: '#0A0A0A' }}>{q.label}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#4A4740', marginLeft: 10, fontWeight: 600 }}>{q.state}</span>
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: q.color, border: `1px solid ${q.color}`, borderRadius: 4, padding: '2px 8px', fontWeight: 700, background: '#FFFFFF' }}>
                              SUPERPOSITION
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                              { label: '|0⟩ probability', value: q.prob0 },
                              { label: '|1⟩ probability', value: 1 - q.prob0 },
                            ].map(bar => (
                              <div key={bar.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4A4740', fontWeight: 600 }}>{bar.label}</span>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#0A0A0A', fontWeight: 800 }}>{(bar.value * 100).toFixed(0)}%</span>
                                </div>
                                <div
                                  role="meter"
                                  aria-label={`${bar.label}: ${(bar.value * 100).toFixed(0)}%`}
                                  aria-valuenow={Math.round(bar.value * 100)}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  style={{ height: 8, background: '#EAE7DF', borderRadius: 4, border: '1px solid #D8D4C7', overflow: 'hidden' }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${bar.value * 100}%` }}
                                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ height: '100%', background: q.color, borderRadius: 3 }}
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
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#78756C', letterSpacing: '0.12em', fontWeight: 700 }}>
                        COMPUTING TRACK — {archiveEvents.length} EVENTS
                      </div>
                      {bookmarkedEvents.size > 0 && (
                        <span aria-live="polite" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: N.amber, border: `1px solid ${N.amber}`, background: '#FEF3C7', borderRadius: 999, padding: '3px 10px', fontWeight: 700 }}>
                          ★ {bookmarkedEvents.size} bookmarked
                        </span>
                      )}
                    </div>
                    <ul role="list" aria-label="Archive events" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, WebkitOverflowScrolling: 'touch' }}>
                      {archiveEvents.map(event => (
                        <li
                          key={event.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '12px 14px', borderRadius: 10,
                            background: bookmarkedEvents.has(event.id) ? '#FEF3C7' : '#FDFBF7',
                            border: `1.5px solid ${bookmarkedEvents.has(event.id) ? N.amber : '#1A1A1A'}`,
                            boxShadow: '2px 2px 0px rgba(26,26,26,0.04)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, fontWeight: 800, color: '#0A0A0A', flexShrink: 0, width: 44, lineHeight: 1.3 }}>
                            {event.year}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#0A0A0A', fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>
                              {event.title}
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4A4740' }}>
                              {event.people.slice(0, 2).join(', ')}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleBookmark(event.id)}
                            aria-label={bookmarkedEvents.has(event.id) ? `Remove bookmark for ${event.title}` : `Bookmark ${event.title}`}
                            aria-pressed={bookmarkedEvents.has(event.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: bookmarkedEvents.has(event.id) ? N.amber : '#78756C', flexShrink: 0, padding: '4px 6px', transition: 'color 0.15s ease', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              style={{ background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, padding: 'clamp(14px, 3vw, 20px)', boxShadow: '4px 4px 0px rgba(26,26,26,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78756C', margin: 0, fontWeight: 700 }}>
                  Bookmarked Events
                </h2>
                <span aria-live="polite" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: N.amber, fontWeight: 700 }}>
                  {bookmarkedEvents.size} / {archiveEvents.length}
                </span>
              </div>
              <AnimatePresence>
                {bookmarkedEvents.size === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#78756C', textAlign: 'center', padding: '20px 0', margin: 0 }}
                  >
                    <span aria-hidden="true" style={{ display: 'block', fontSize: 24, marginBottom: 8, opacity: 0.5 }}>☆</span>
                    Bookmark events from the Archive tab
                  </motion.p>
                ) : (
                  <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }} aria-label="Bookmarked events list">
                    {QUANTUM_EVENTS.filter(e => bookmarkedEvents.has(e.id)).map(event => (
                      <motion.li
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FEF3C7', border: `1px solid ${N.amber}`, borderRadius: 8 }}
                      >
                        <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 14, fontWeight: 800, color: N.amber, flexShrink: 0, width: 38 }}>
                          {event.year}
                        </span>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#0A0A0A', flex: 1, lineHeight: 1.3, fontWeight: 500 }}>
                          {event.title}
                        </span>
                        <button
                          onClick={() => toggleBookmark(event.id)}
                          aria-label={`Remove bookmark for ${event.title}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: N.amber, fontSize: 14, padding: 4, minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              style={{ background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, padding: 'clamp(14px, 3vw, 20px)', position: 'relative', overflow: 'hidden', boxShadow: '4px 4px 0px rgba(26,26,26,0.06)' }}
            >
              <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78756C', marginBottom: 10, marginTop: 0, fontWeight: 700 }}>
                Export Circuit Blueprint
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#4A4740', lineHeight: 1.6, marginBottom: 16, marginTop: 0 }}>
                Export the full circuit diagram with gate layout, qubit wires, and measurement symbols as a high-resolution PNG archival blueprint.
              </p>
              <button
                onClick={exportCircuitImage}
                disabled={exporting}
                aria-label={exportDone ? 'Circuit saved as PNG' : exporting ? 'Generating export…' : 'Export circuit as PNG'}
                aria-busy={exporting}
                style={{
                  width: '100%', padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: exportDone ? N.amber : exporting ? '#78756C' : '#1A1A1A',
                  border: '1.5px solid #1A1A1A', borderRadius: 8, cursor: exporting ? 'wait' : 'pointer',
                  fontWeight: 700, transition: 'all 0.2s ease',
                  boxShadow: `2px 2px 0px rgba(26,26,26,0.12)`,
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
                    flex: 1, padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0A0A0A',
                    background: '#F5F2EA', border: `1.5px solid #1A1A1A`, borderRadius: 8,
                    cursor: 'pointer', textAlign: 'center', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', minHeight: 44,
                    fontWeight: 700,
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
              style={{ background: '#FFFFFF', border: `1.5px solid #1A1A1A`, borderRadius: 16, padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)', boxShadow: '4px 4px 0px rgba(26,26,26,0.06)' }}
            >
              <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#78756C', marginBottom: 12, marginTop: 0, fontWeight: 700 }}>
                Quick Navigation
              </h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
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
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: '#FDFBF7', border: `1.5px solid #1A1A1A`, borderRadius: 8,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', minHeight: 44,
                        boxShadow: '2px 2px 0px rgba(26,26,26,0.04)',
                      }}
                    >
                      <div aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: nav.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#0A0A0A', fontWeight: 800 }}>{nav.label}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#4A4740' }}>{nav.sub}</div>
                      </div>
                      <span aria-hidden="true" style={{ marginLeft: 'auto', color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          </div>
        </div>
      </main>
    </div>
  );
}
