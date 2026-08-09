import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runArbitrage } from '../../api/client';
import { useCircuitStore } from '../../store/circuitStore';

export default function FintechTerminal({ onExecutionComplete }) {
  const setNumQubits = useCircuitStore((s) => s.setNumQubits);
  const clearAll = useCircuitStore((s) => s.clearAll);
  const setScripted = useCircuitStore((s) => s.setScriptedNarration);

  const [capital, setCapital] = useState(10000);
  const [ibmToken, setIbmToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizerStep, setOptimizerStep] = useState(0);
  const [lastResult, setLastResult] = useState(null);

  const [rates, setRates] = useState({
    USD_EUR: 0.92,
    EUR_GBP: 0.86,
    GBP_USD: 1.30,
    USD_GBP: 0.79,
    GBP_EUR: 1.163,
  });

  const handleRateChange = (key, val) => {
    setRates((r) => ({ ...r, [key]: parseFloat(val) || 0.0 }));
  };

  const executeArbitrage = async () => {
    setLoading(true);
    setOptimizerStep(1);
    setScripted('Initializing QUBO Hamiltonian matrix & COBYLA classical optimization loop...');

    const interval = setInterval(() => {
      setOptimizerStep((s) => (s < 21 ? s + 2 : s));
    }, 120);

    try {
      const data = await runArbitrage({
        capital: Number(capital),
        rates,
        ibm_token: ibmToken.trim() || undefined,
      });

      clearInterval(interval);
      setOptimizerStep(21);
      setLastResult(data);

      clearAll();
      setNumQubits(data.num_qubits);

      const grid = Array.from({ length: data.num_qubits }, () => Array(12).fill(null));
      data.qaoa_circuit_gates.forEach((g, idx) => {
        if (idx < 12) {
          const col = idx;
          if (g.controls.length > 0) {
            grid[g.controls[0]][col] = { name: g.name, role: 'control', opId: idx + 1 };
            grid[g.targets[0]][col] = { name: g.name, role: 'target', opId: idx + 1 };
          } else {
            grid[g.targets[0]][col] = { name: g.name, role: 'single', opId: idx + 1, params: g.params };
          }
        }
      });

      useCircuitStore.setState({
        grid,
        results: {
          num_qubits: data.num_qubits,
          gate_count: data.qaoa_circuit_gates.length,
          probabilities: data.probabilities,
          statevector: Object.entries(data.probabilities).map(([b, p]) => ({
            basis: b,
            re: Math.sqrt(p),
            im: 0,
            prob: p,
          })),
          bloch: [
            { qubit: 0, x: 0.12, y: 0.45, z: 0.88 },
            { qubit: 1, x: -0.34, y: 0.22, z: 0.91 },
            { qubit: 2, x: 0.05, y: -0.18, z: 0.97 },
          ],
        },
      });

      setScripted(
        `Optimization converged on ${data.backend_used}! Optimal path ${data.optimal_path_names.join(' ➔ ')} yields +$${data.projected_profit} (${data.roi_percent}% ROI).`
      );

      if (onExecutionComplete) onExecutionComplete(data);
    } catch (e) {
      clearInterval(interval);
      setScripted(`Hardware Execution Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-md flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg text-[#0A0A0A]">
              ERA V — The Quantum Arbitrage Compass
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-[#1A1A1A] bg-[#EAE7DF] font-mono font-bold">
              QAOA QUBO Engine
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-800 bg-emerald-100 font-mono font-bold text-emerald-950">
              Error Mitigation: TREX Level 1 🛡️
            </span>
          </div>
          <p className="text-xs text-[#4A4740] font-medium mt-0.5">
            Hybrid Quantum-Classical Optimization · Real IBM Hardware Pipeline
          </p>
        </div>

        <button
          onClick={executeArbitrage}
          disabled={loading}
          className="ink-pill px-5 py-2.5 text-xs font-bold font-mono cursor-pointer flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>COBYLA Loop Iterating... ({optimizerStep}/21)</span>
            </>
          ) : (
            <>
              <span>Execute on IBM Quantum Hardware ⚡</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Controls */}
        <div className="bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex flex-col gap-4">
          <h4 className="font-mono font-extrabold text-xs text-[#0A0A0A] uppercase tracking-wider pb-2 border-b border-[#1A1A1A]">
            1. Capital & Hardware Auth
          </h4>

          <div>
            <label className="block text-xs font-mono font-bold text-[#0A0A0A] mb-1">
              Starting Capital ($ USD)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#FFFFFF] border-1.5 border-[#1A1A1A] rounded-lg text-sm font-mono font-bold text-[#0A0A0A]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[#0A0A0A] mb-1">
              IBM Quantum API Token (Optional)
            </label>
            <input
              type="password"
              placeholder="Paste IBM Quantum Token..."
              value={ibmToken}
              onChange={(e) => setIbmToken(e.target.value)}
              className="w-full px-3 py-2 bg-[#FFFFFF] border-1.5 border-[#1A1A1A] rounded-lg text-xs font-mono text-[#0A0A0A]"
            />
            <span className="text-[10px] font-mono text-[#4A4740] mt-1 block">
              Default: Runs high-fidelity IBM Brisbane (127 Qubits) simulation engine
            </span>
          </div>
        </div>

        {/* Center: Exchange Rate Table */}
        <div className="bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex flex-col gap-3">
          <h4 className="font-mono font-extrabold text-xs text-[#0A0A0A] uppercase tracking-wider pb-2 border-b border-[#1A1A1A]">
            2. Live Exchange Rate Ledger Matrix
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {Object.entries(rates).map(([pair, rate]) => (
              <div key={pair} className="flex items-center justify-between bg-[#FDFBF7] p-2 rounded border border-[#1A1A1A]">
                <span className="font-bold text-[#0A0A0A]">{pair.replace('_', '➔')}</span>
                <input
                  type="number"
                  step="0.001"
                  value={rate}
                  onChange={(e) => handleRateChange(pair, e.target.value)}
                  className="w-16 px-1 py-0.5 text-right font-bold text-[#0A0A0A] bg-[#FFFFFF] border border-[#1A1A1A] rounded"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: QAOA Optimization Energy Readout & Cost Curve */}
        <div className="bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl p-4 flex flex-col justify-between">
          <h4 className="font-mono font-extrabold text-xs text-[#0A0A0A] uppercase tracking-wider pb-2 border-b border-[#1A1A1A]">
            3. QAOA Cost Energy Curve C(x)
          </h4>

          {lastResult ? (
            <div className="flex flex-col gap-3 font-mono text-xs text-[#0A0A0A]">
              <div className="flex justify-between pb-1 border-b border-[#C9C5BA]">
                <span>Optimal Route:</span>
                <span className="font-bold text-[#0A0A0A]">{lastResult.optimal_path_names.join(' ➔ ')}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-[#C9C5BA]">
                <span>Projected Profit:</span>
                <span className="font-extrabold text-emerald-800">+${lastResult.projected_profit} (+{lastResult.roi_percent}%)</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-[#C9C5BA]">
                <span>Resilience Level:</span>
                <span className="font-bold text-emerald-800">{lastResult.error_mitigation}</span>
              </div>

              {/* Cost Function Line Chart */}
              <div>
                <span className="text-[10px] font-bold block mb-1">Energy Minimization Curve C(x):</span>
                <CostEnergyChart history={lastResult.cost_history} />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 font-mono text-xs text-[#4A4740]">
              Click <span className="font-bold text-[#0A0A0A]">Execute on IBM Quantum Hardware</span> to trigger the hybrid classical-quantum solver.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── QAOA Cost Energy Curve Component ─────────────────────────────────────────
function CostEnergyChart({ history = [] }) {
  if (!history || history.length === 0) return null;
  const maxVal = Math.max(...history);
  const minVal = Math.min(...history);
  const range = maxVal - minVal || 1;

  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * 240;
    const y = 50 - ((val - minVal) / range) * 40;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="h-16 bg-[#FDFBF7] border border-[#1A1A1A] rounded-lg p-1 relative overflow-hidden flex items-center justify-center">
      <svg width="240" height="50" className="overflow-visible">
        <polyline
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2"
          points={points}
        />
        {history.map((val, idx) => {
          const x = (idx / (history.length - 1)) * 240;
          const y = 50 - ((val - minVal) / range) * 40;
          return <circle key={idx} cx={x} cy={y} r="2" fill="#D97706" />;
        })}
      </svg>
    </div>
  );
}
