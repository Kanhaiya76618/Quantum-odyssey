import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircuitStore, NUM_COLS, MAX_QUBITS } from '../store/circuitStore';
import GatePalette from '../components/GatePalette';
import CircuitGrid from '../components/CircuitGrid';
import ResultsPanel from '../components/ResultsPanel';
import EigenPanel from '../components/EigenPanel';
import FintechTerminal from '../components/fintech/FintechTerminal';

export default function OdysseyWorld() {
  const era = useCircuitStore((s) => s.era);
  const travelTo = useCircuitStore((s) => s.travelTo);
  const commitEra = useCircuitStore((s) => s.commitEra);
  const pendingEra = useCircuitStore((s) => s.pendingEra);
  const numQubits = useCircuitStore((s) => s.numQubits);
  const setNumQubits = useCircuitStore((s) => s.setNumQubits);
  const grid = useCircuitStore((s) => s.grid);
  const loading = useCircuitStore((s) => s.loading);
  const error = useCircuitStore((s) => s.error);
  const results = useCircuitStore((s) => s.results);
  const isGridEmpty = useCircuitStore((s) => s.isGridEmpty);
  const run = useCircuitStore((s) => s.run);
  const setView = useCircuitStore((s) => s.setView);
  const setScripted = useCircuitStore((s) => s.setScriptedNarration);

  const [skylineTab, setSkylineTab] = useState('blueprint');
  const [fintechResultModal, setFintechResultModal] = useState(null);

  // Auto commit pending era changes
  useEffect(() => {
    if (pendingEra) {
      commitEra();
    }
  }, [pendingEra, commitEra]);

  const changeQubits = (n) => {
    if (!isGridEmpty() && !window.confirm('Changing qubit count clears the circuit. Continue?')) return;
    setNumQubits(n);
  };

  // Compute column density / tower types for 2D skyline
  const columnTowers = Array.from({ length: NUM_COLS }, (_, colIdx) => {
    const colGates = [];
    for (let q = 0; q < numQubits; q++) {
      const cell = grid[q]?.[colIdx];
      if (cell) colGates.push(cell);
    }
    return {
      colIdx,
      count: colGates.length,
      hasMulti: colGates.some((g) => g.role === 'control' || g.role === 'target'),
      primaryGate: colGates[0]?.name?.toUpperCase() || null,
    };
  });

  const handleFintechComplete = (data) => {
    setSkylineTab('density');
    setFintechResultModal(data);
  };

  return (
    <div className="w-full min-h-screen bg-[#F2F0EA] text-[#1A1A1A] font-body flex flex-col">
      {/* 2D Qubit City Paper Sub-Header */}
      <header className="px-6 py-4 border-b-2 border-[#1A1A1A] bg-[#EAE7DF] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] text-[#F2F0EA] flex items-center justify-center font-bold text-lg">
            {era === 'city' ? '🏙' : era === 'wave' ? '🌊' : era === 'schrodinger' ? '📦' : '💹'}
          </div>
          <div>
            <div className="font-display font-extrabold text-lg text-[#0A0A0A] tracking-tight flex items-center gap-2">
              {era === 'city' && 'ERA IV — QUBIT CITY (2D BLUEPRINT)'}
              {era === 'wave' && 'ERA I/II — WAVE OCEAN & DOUBLE SLIT'}
              {era === 'schrodinger' && "ERA III — SCHRÖDINGER'S CAT ROOM"}
              {era === 'fintech' && 'ERA V — THE QUANTUM ARBITRAGE COMPASS'}
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-[#1A1A1A] bg-[#FDFBF7] font-mono uppercase tracking-wider">
                Paper Architecture
              </span>
            </div>
            <p className="text-xs text-[#4A4740] font-medium">
              {era === 'city' && '2D Quantum Circuit Grid & City Monolith Engine'}
              {era === 'wave' && 'Wave-Particle Duality & Interference Fringe Laboratory'}
              {era === 'schrodinger' && 'Quantum Superposition & Wavefunction Collapse Experiment'}
              {era === 'fintech' && 'QAOA QUBO Optimization Engine · Real IBM Hardware Execution'}
            </p>
          </div>
        </div>

        {/* Era selector & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#FDFBF7] border border-[#1A1A1A] rounded-full p-1">
            {['city', 'wave', 'schrodinger', 'fintech'].map((eId) => (
              <button
                key={eId}
                onClick={() => travelTo(eId)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  era === eId
                    ? 'bg-[#1A1A1A] text-[#F2F0EA]'
                    : 'text-[#1A1A1A] hover:bg-[#EAE7DF]'
                }`}
              >
                {eId === 'city'
                  ? 'Qubit City'
                  : eId === 'wave'
                  ? 'Wave Ocean'
                  : eId === 'schrodinger'
                  ? "Schrödinger's Room"
                  : 'Fintech Compass'}
              </button>
            ))}
          </div>

          <button
            className="ink-pill px-4 py-2 text-xs font-bold font-mono cursor-pointer flex items-center gap-2"
            onClick={() => run()}
            disabled={loading}
          >
            {loading && <span className="spinner" aria-hidden="true" />}
            Run Circuit ▶
          </button>

          <button
            onClick={() => setView('builder')}
            className="hairline-pill px-3.5 py-2 text-xs font-bold text-[#1A1A1A] bg-[#FDFBF7] border border-[#1A1A1A] rounded-full cursor-pointer hover:bg-[#EAE7DF]"
          >
            Full Lab View ⟶
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 max-w-[1700px] w-full mx-auto">
        {/* Left Column: Interactive Simulation or Qubit City Workspace */}
        <div className="flex-1 flex flex-col gap-6">
          {era === 'fintech' && (
            <FintechTerminal onExecutionComplete={handleFintechComplete} />
          )}

          {(era === 'city' || era === 'fintech') && (
            <>
              {/* 2D Qubit City Skyline / Quantum Density View */}
              <section className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#0A0A0A] font-display">
                      {era === 'fintech' ? 'QAOA Optimization Circuit Monoliths' : '2D City Skyline & Gate Monoliths'}
                    </span>
                    <span className="text-xs text-[#4A4740] font-mono">
                      ({NUM_COLS} City Blocks · {numQubits} Qubit Bus Lines)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button
                      onClick={() => setSkylineTab('blueprint')}
                      className={`px-3 py-1 rounded-md border border-[#1A1A1A] cursor-pointer ${
                        skylineTab === 'blueprint' ? 'bg-[#1A1A1A] text-[#F2F0EA]' : 'bg-[#EAE7DF]'
                      }`}
                    >
                      Architectural View
                    </button>
                    <button
                      onClick={() => setSkylineTab('density')}
                      className={`px-3 py-1 rounded-md border border-[#1A1A1A] cursor-pointer ${
                        skylineTab === 'density' ? 'bg-[#1A1A1A] text-[#F2F0EA]' : 'bg-[#EAE7DF]'
                      }`}
                    >
                      Quantum Density
                    </button>
                  </div>
                </div>

                {skylineTab === 'blueprint' ? (
                  /* 2D Paper Skyline Rendering */
                  <div className="h-44 bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex items-end justify-between relative overflow-hidden engineering-grid">
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1A1A1A]" />
                    {columnTowers.map(({ colIdx, count, hasMulti, primaryGate }) => {
                      const heightPercent = count === 0 ? 18 : 25 + count * 22;
                      return (
                        <div
                          key={colIdx}
                          className="flex-1 flex flex-col items-center justify-end h-full px-1 z-10 group"
                        >
                          <div
                            className={`w-full max-w-[48px] border-2 border-[#1A1A1A] rounded-t-md transition-all duration-300 flex flex-col items-center justify-between p-1.5 shadow-sm relative ${
                              count > 0 ? 'bg-[#FDFBF7]' : 'bg-[#E0DCD2] opacity-60'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="w-full h-1 bg-[#1A1A1A] rounded-full mb-1" />
                            {primaryGate ? (
                              <span className="text-[10px] font-extrabold font-mono text-[#0A0A0A] bg-[#EAE7DF] px-1 rounded border border-[#1A1A1A]">
                                {primaryGate}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-[#4A4740]">col {colIdx}</span>
                            )}
                            {hasMulti && (
                              <div className="w-full text-center text-[9px] font-bold text-[#D97706] bg-amber-100 border border-amber-500 rounded my-0.5">
                                BRIDGE
                              </div>
                            )}
                            <div className="w-full grid grid-cols-2 gap-0.5 mt-1">
                              <div className="h-1 bg-[#1A1A1A] rounded-xs opacity-70" />
                              <div className="h-1 bg-[#1A1A1A] rounded-xs opacity-70" />
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#1A1A1A] mt-1">
                            C{colIdx}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Quantum Wave Density Heatmap View */
                  <QuantumDensityView results={results} numQubits={numQubits} />
                )}
              </section>

              {/* 2D Circuit Grid & Gate Palette Section */}
              <section className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1A1A1A]">
                  <h3 className="font-display font-bold text-base text-[#0A0A0A]">
                    {era === 'fintech' ? 'QAOA Quantum Ansatz Rail Grid' : 'Circuit Rail Grid'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1.5">
                      Qubits:
                      <select
                        value={numQubits}
                        onChange={(e) => changeQubits(Number(e.target.value))}
                        className="bg-[#EAE7DF] text-[#0A0A0A] border border-[#1A1A1A] rounded px-2 py-0.5 font-mono text-xs font-bold cursor-pointer"
                      >
                        {Array.from({ length: MAX_QUBITS }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} Qubit{i + 1 > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-4 p-3 bg-red-100 border border-red-600 text-red-900 rounded-lg text-xs font-semibold flex items-center justify-between"
                    >
                      <span>⚠️ Simulation Notice: {error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <GatePalette />
                <div className="mt-4">
                  <CircuitGrid />
                </div>
                <p className="mt-3 text-xs text-[#4A4740] font-mono">
                  Click to place gates · Right-click to erase · Esc cancels multi-qubit placement
                </p>
              </section>
            </>
          )}

          {era === 'wave' && <WaveOceanLab setScripted={setScripted} />}

          {era === 'schrodinger' && <SchrodingerCatLab setScripted={setScripted} />}
        </div>

        {/* Right Column: Quantum Simulation Results + Eigen Companion */}
        <div className="w-full xl:w-[460px] flex flex-col gap-6">
          <div className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-5 shadow-md">
            <h3 className="font-display font-bold text-base text-[#0A0A0A] mb-3 pb-2 border-b border-[#1A1A1A] flex items-center justify-between">
              <span>Simulation Readout</span>
              <span className="text-xs font-mono font-normal text-[#4A4740]">
                {results ? `${results.num_qubits} Qubits · ${results.gate_count} Gates` : 'Idle'}
              </span>
            </h3>
            <ResultsPanel />
          </div>

          <div className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-5 shadow-md">
            <EigenPanel variant="sidebar" />
          </div>
        </div>
      </main>

      {/* Fintech Outcome Paper Manuscript Modal */}
      <AnimatePresence>
        {fintechResultModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setFintechResultModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-2xl max-w-xl w-full flex flex-col gap-4 text-[#0A0A0A]"
            >
              <div className="flex items-start justify-between pb-3 border-b-2 border-[#1A1A1A]">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4A4740]">
                    Quantum Odyssey Hardware Manuscript
                  </span>
                  <h3 className="font-display font-bold text-2xl text-[#0A0A0A] mt-0.5">
                    Arbitrage Route Discovered!
                  </h3>
                </div>
                <button
                  onClick={() => setFintechResultModal(null)}
                  className="w-8 h-8 rounded-full border border-[#1A1A1A] bg-[#EAE7DF] font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex flex-col gap-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span>Optimal Currency Cycle:</span>
                  <span className="font-extrabold text-[#0A0A0A]">{fintechResultModal.optimal_path_names.join(' ➔ ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Capital:</span>
                  <span className="font-bold">${fintechResultModal.initial_capital.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Capital:</span>
                  <span className="font-bold text-emerald-800">${fintechResultModal.final_capital.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#C9C5BA] text-base">
                  <span>Projected Net Profit:</span>
                  <span className="font-extrabold text-emerald-700">+${fintechResultModal.projected_profit} ({fintechResultModal.roi_percent}% ROI)</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-600 rounded-lg text-xs font-mono text-amber-950 flex flex-col gap-1">
                <div className="font-bold">⚡ Hardware System Telemetry:</div>
                <div>Provider: {fintechResultModal.backend_used}</div>
                <div>QAOA Layer: p=1 Ansatz ({fintechResultModal.num_qubits} Qubits)</div>
                <div>Execution Speed: {fintechResultModal.execution_time_ms} ms</div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setFintechResultModal(null)}
                  className="ink-pill px-5 py-2 text-xs font-bold font-mono cursor-pointer"
                >
                  Close Manuscript
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Quantum Density Visualizer ───────────────────────────────────────────────
function QuantumDensityView({ results, numQubits }) {
  const probs = results?.probabilities || { '000': 0.4312, '011': 0.1157, '110': 0.1378, '111': 0.1444 };
  const entries = Object.entries(probs);

  return (
    <div className="h-44 bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden engineering-grid">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-[#0A0A0A] pb-2 border-b border-[#1A1A1A]">
        <span>Quantum Wave Amplitude Density |Ψ(x)|² (QAOA State Spikes)</span>
        <span>{numQubits} Qubit Hilbert Space</span>
      </div>

      <div className="flex-1 flex items-center justify-around gap-3 py-2">
        {entries.map(([state, prob]) => {
          const heightPct = Math.max(12, Math.round(prob * 100));
          return (
            <div key={state} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[11px] font-mono font-bold text-[#0A0A0A]">
                {(prob * 100).toFixed(1)}%
              </span>
              <div className="w-full max-w-[54px] bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-t-md relative overflow-hidden h-full flex items-end p-1">
                <div
                  className="w-full bg-[#1A1A1A] rounded-t-xs transition-all duration-500"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-extrabold text-[#0A0A0A] bg-[#FDFBF7] px-1.5 py-0.5 rounded border border-[#1A1A1A]">
                |{state}⟩
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wave Ocean Laboratory Component ──────────────────────────────────────────
function WaveOceanLab({ setScripted }) {
  const [slitDistance, setSlitDistance] = useState(1.5);
  const [wavelength, setWavelength] = useState(0.7);
  const [photonsFired, setPhotonsFired] = useState(128);
  const canvasRef = useRef(null);

  useEffect(() => {
    setScripted("One wave, released again and again, meets itself beyond the slits — writing double-slit interference fringes on the far screen.");
  }, [setScripted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.clientWidth);
    const height = (canvas.height = canvas.clientHeight);

    ctx.fillStyle = '#EAE7DF';
    ctx.fillRect(0, 0, width, height);

    const slitX = width * 0.3;
    const gap = slitDistance * 18;

    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(slitX, 0); ctx.lineTo(slitX, height / 2 - gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(slitX, height / 2 - gap / 3); ctx.lineTo(slitX, height / 2 + gap / 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(slitX, height / 2 + gap); ctx.lineTo(slitX, height); ctx.stroke();

    const screenX = width * 0.9;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 2;

    for (let y = 0; y < height; y += 2) {
      const theta = (y - height / 2) / (height / 2);
      const alpha = (Math.PI * slitDistance * 4 * theta) / wavelength;
      const intensity = Math.pow(Math.cos(alpha), 2);
      const px = screenX - intensity * 90;
      if (y === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  }, [slitDistance, wavelength, photonsFired]);

  return (
    <section className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-md flex flex-col gap-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
        <div>
          <h2 className="font-display font-bold text-lg text-[#0A0A0A]">
            Double-Slit Wave Interference Rig
          </h2>
          <p className="text-xs text-[#4A4740] font-medium">
            Adjust slit spacing & wavelength to observe wave-particle interference fringes
          </p>
        </div>
        <button
          onClick={() => setPhotonsFired((c) => c + 64)}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F2F0EA] rounded-xl text-xs font-bold font-mono cursor-pointer hover:scale-102 transition-all"
        >
          Fire Photons ⚡ ({photonsFired} Fired)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex flex-col gap-4">
          <h4 className="font-mono font-extrabold text-xs text-[#0A0A0A] uppercase tracking-wider pb-2 border-b border-[#1A1A1A]">
            Rig Parameters
          </h4>

          <div>
            <div className="flex justify-between text-xs font-mono font-bold text-[#0A0A0A] mb-1">
              <span>Slit Distance (d)</span>
              <span>{slitDistance.toFixed(2)} mm</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="3.0"
              step="0.05"
              value={slitDistance}
              onChange={(e) => setSlitDistance(Number(e.target.value))}
              className="w-full cursor-pointer accent-[#1A1A1A]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono font-bold text-[#0A0A0A] mb-1">
              <span>Wavelength (λ)</span>
              <span>{wavelength.toFixed(2)} μm</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.2"
              step="0.02"
              value={wavelength}
              onChange={(e) => setWavelength(Number(e.target.value))}
              className="w-full cursor-pointer accent-[#1A1A1A]"
            />
          </div>

          <div className="p-3 bg-[#FDFBF7] border border-[#1A1A1A] rounded-lg font-mono text-xs font-bold text-[#0A0A0A]">
            Interference Law: <br />
            <span className="text-[#2B2B2B]">Δy = λ · L / d</span>
          </div>
        </div>

        <div className="lg:col-span-2 h-72 border-2 border-[#1A1A1A] rounded-xl overflow-hidden relative">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    </section>
  );
}

// ─── Schrödinger's Cat Room Component ─────────────────────────────────────────
function SchrodingerCatLab({ setScripted }) {
  const [state, setState] = useState('superposition');
  const [observeCount, setObserveCount] = useState(0);

  useEffect(() => {
    setScripted("Inside the box, two histories run in parallel. Neither is real yet — the cat is in superposition |ψ⟩ = 1/√2 |Alive⟩ + 1/√2 |Dead⟩.");
  }, [setScripted]);

  const observeBox = () => {
    const outcome = Math.random() < 0.5 ? 'alive' : 'dead';
    setState(outcome);
    setObserveCount((c) => c + 1);
    setScripted(
      `Observed! The wave function collapsed into |${outcome.toUpperCase()}⟩. History was written by measurement.`
    );
  };

  const resetSuperposition = () => {
    setState('superposition');
    setScripted("The lid closes. Both histories resume in superposition |ψ⟩ = 1/√2 |Alive⟩ + 1/√2 |Dead⟩.");
  };

  return (
    <section className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-md flex flex-col gap-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
        <div>
          <h2 className="font-display font-bold text-lg text-[#0A0A0A]">
            Schrödinger's Cat Superposition Thought Experiment
          </h2>
          <p className="text-xs text-[#4A4740] font-medium">
            Perform quantum measurement to trigger wavefunction collapse
          </p>
        </div>

        <div className="flex items-center gap-3">
          {state !== 'superposition' && (
            <button
              onClick={resetSuperposition}
              className="px-4 py-2 bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl text-xs font-bold text-[#1A1A1A] cursor-pointer hover:bg-[#DEDACF]"
            >
              Reset Superposition 🔄
            </button>
          )}
          <button
            onClick={observeBox}
            className="px-4 py-2 bg-[#1A1A1A] text-[#F2F0EA] rounded-xl text-xs font-bold font-mono cursor-pointer hover:scale-102 transition-all"
          >
            Observe Quantum Box (Collapse) 📦
          </button>
        </div>
      </div>

      <div className="bg-[#EAE7DF] border-2 border-[#1A1A1A] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
        <div className="text-6xl mb-2">
          {state === 'superposition' ? '📦✨' : state === 'alive' ? '😸' : '🙀'}
        </div>

        <div className="font-display font-extrabold text-xl text-[#0A0A0A]">
          {state === 'superposition' && 'State: |ψ⟩ = 1/√2 |Alive⟩ + 1/√2 |Dead⟩'}
          {state === 'alive' && 'State Collapsed: |Alive⟩ (Probability 50%)'}
          {state === 'dead' && 'State Collapsed: |Dead⟩ (Probability 50%)'}
        </div>

        <p className="max-w-xl text-sm font-medium text-[#2B2B2B]">
          {state === 'superposition' &&
            'Until observed, the quantum system exists in a linear superposition of all possible states.'}
          {state === 'alive' &&
            'Measurement forced the quantum wave to collapse into a single definite outcome.'}
          {state === 'dead' &&
            'Measurement forced the quantum wave to collapse into a single definite outcome.'}
        </p>

        <div className="mt-2 text-xs font-mono font-bold text-[#1A1A1A] bg-[#FDFBF7] px-3 py-1 rounded-full border border-[#1A1A1A]">
          Observations Performed: {observeCount}
        </div>
      </div>
    </section>
  );
}
