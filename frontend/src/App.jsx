import { useEffect } from "react";
import { useCircuitStore, MAX_QUBITS } from "./store/circuitStore";
import GatePalette from "./components/GatePalette";
import CircuitGrid from "./components/CircuitGrid";
import ParamModal from "./components/ParamModal";
import ResultsPanel from "./components/ResultsPanel";

export default function App() {
  const numQubits = useCircuitStore((s) => s.numQubits);
  const loading = useCircuitStore((s) => s.loading);
  const error = useCircuitStore((s) => s.error);
  const setNumQubits = useCircuitStore((s) => s.setNumQubits);
  const isGridEmpty = useCircuitStore((s) => s.isGridEmpty);
  const run = useCircuitStore((s) => s.run);
  const cancelPending = useCircuitStore((s) => s.cancelPending);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") cancelPending();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelPending]);

  const changeQubits = (n) => {
    if (!isGridEmpty() && !window.confirm("Changing qubit count clears the circuit. Continue?")) return;
    setNumQubits(n);
  };

  return (
    <div className="app">
      <header>
        <h1>
          Quantum Odyssey <span>circuit lab</span>
        </h1>
        <div className="controls">
          <label>
            qubits
            <select value={numQubits} onChange={(e) => changeQubits(Number(e.target.value))}>
              {Array.from({ length: MAX_QUBITS }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <button className="run" onClick={run}>
            Run ▶
          </button>
        </div>
      </header>
      <div className={"progress" + (loading ? " on" : "")} />
      {error && <div className="banner">{error}</div>}
      <main>
        <section className="builder">
          <GatePalette />
          <CircuitGrid />
          <p className="hint">click to place · right-click to erase an op · Esc cancels a pending multi-qubit gate</p>
        </section>
        <ResultsPanel />
      </main>
      <ParamModal />
    </div>
  );
}
