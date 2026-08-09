import { lazy, Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCircuitStore, MAX_QUBITS } from "./store/circuitStore";
import GatePalette from "./components/GatePalette";
import CircuitGrid from "./components/CircuitGrid";
import ParamModal from "./components/ParamModal";
import ResultsPanel from "./components/ResultsPanel";
import HeroHeader from "./components/landing/HeroHeader";
import PaperHeroClient from "./components/landing/PaperHeroClient";

const ArchiveViewClient = lazy(() => import("./components/archive/ArchiveViewClient"));
const MachineWorldClient = lazy(() => import("./components/machine/MachineWorldClient"));
const CircuitDashboardClient = lazy(() => import("./components/dashboard/CircuitDashboardClient"));
const OdysseyWorld = lazy(() => import("./scenes/OdysseyWorld"));
const JourneyView = lazy(() => import("./views/Journey/JourneyView"));

function AppHeader({ view }) {
  const numQubits = useCircuitStore((s) => s.numQubits);
  const loading = useCircuitStore((s) => s.loading);
  const setView = useCircuitStore((s) => s.setView);
  const setNumQubits = useCircuitStore((s) => s.setNumQubits);
  const isGridEmpty = useCircuitStore((s) => s.isGridEmpty);
  const run = useCircuitStore((s) => s.run);

  const changeQubits = (n) => {
    if (!isGridEmpty() && !window.confirm("Changing qubit count clears the circuit. Continue?")) return;
    setNumQubits(n);
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-line bg-paper sticky top-0 z-40">
      <button className="home-btn cursor-pointer bg-transparent border-0 flex items-center gap-2" onClick={() => setView("landing")} aria-label="Back to landing page">
        <span className="mark text-xl text-ink" aria-hidden="true">◈</span>
        <span className="wordmark font-display text-ink font-semibold text-lg">QUANTUM ODYSSEY</span>
        <span className="sub text-xs text-ink-soft uppercase font-body tracking-wider">
          {view === "city" ? "qubit city" : "circuit lab"}
        </span>
      </button>

      <div className="controls flex items-center gap-3">
        <button className="nav-link-paper cursor-pointer bg-transparent border-0 text-xs font-bold uppercase" onClick={() => setView("archive")}>
          Grand Quantum Museum
        </button>
        <button className="nav-link-paper cursor-pointer bg-transparent border-0 text-xs uppercase" onClick={() => setView("machine-world")}>
          Machine World
        </button>
        <button className="nav-link-paper cursor-pointer bg-transparent border-0 text-xs uppercase" onClick={() => setView("circuit-dashboard")}>
          Dashboard
        </button>

        <label className="flex items-center gap-2 text-xs font-mono text-ink-soft">
          qubits
          <select
            value={numQubits}
            onChange={(e) => changeQubits(Number(e.target.value))}
            className="bg-paper-2 text-ink border border-line rounded px-2 py-1 font-mono text-sm"
          >
            {Array.from({ length: MAX_QUBITS }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        {view === "builder" && (
          <button
            className="ink-pill px-4 py-2 text-xs font-mono cursor-pointer flex items-center gap-2"
            onClick={() => {
              useCircuitStore.getState().pingRun();
              run();
            }}
            disabled={loading}
          >
            {loading && <span className="spinner" aria-hidden="true" />}
            Run ▶
          </button>
        )}
        <button className="ghost-pill px-3 py-1.5 text-xs font-mono cursor-pointer" onClick={() => setView(view === "city" ? "builder" : "city")}>
          {view === "city" ? "⟵ Builder" : "⟶ Qubit City"}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const view = useCircuitStore((s) => s.view);
  const loading = useCircuitStore((s) => s.loading);
  const error = useCircuitStore((s) => s.error);
  const cancelPending = useCircuitStore((s) => s.cancelPending);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") cancelPending();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelPending]);

  return (
    <div className="app bg-paper text-ink min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className="view-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {(view === "landing" || view === "paper-landing") && (
            <>
              <HeroHeader />
              <PaperHeroClient />
            </>
          )}

          {view === "archive" && (
            <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading 3D Paper Archive…</div>}>
              <ArchiveViewClient />
            </Suspense>
          )}

          {view === "machine-world" && (
            <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading Machine World…</div>}>
              <MachineWorldClient />
            </Suspense>
          )}

          {view === "circuit-dashboard" && (
            <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading Circuit Dashboard…</div>}>
              <CircuitDashboardClient />
            </Suspense>
          )}

          {view === "builder" && (
            <>
              <AppHeader view={view} />
              <div className={"progress" + (loading ? " on" : "")} />
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="banner bg-stone-200 border border-stone-400 text-stone-800 p-3 mx-5 mt-3 rounded text-sm"
                    role="alert"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: [0, -8, 8, -8, 8, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <main className="p-6 flex gap-6">
                <section className="builder flex-1">
                  <GatePalette />
                  <CircuitGrid />
                  <p className="hint mt-3 text-xs text-ink-soft font-mono">
                    click to place · right-click to erase an op · Esc cancels a pending multi-qubit gate
                  </p>
                </section>
                <ResultsPanel />
              </main>
            </>
          )}

          {view === "city" && (
            <>
              <AppHeader view={view} />
              <Suspense fallback={<div className="city-loading text-ink-soft">loading qubit city…</div>}>
                <OdysseyWorld />
              </Suspense>
            </>
          )}

          {view === "journey" && (
            <Suspense fallback={<div className="city-loading text-ink-soft font-bold">Entering Grand Quantum Museum…</div>}>
              <ArchiveViewClient />
            </Suspense>
          )}
        </motion.div>
      </AnimatePresence>
      {view !== "landing" && view !== "paper-landing" && view !== "archive" && view !== "machine-world" && view !== "circuit-dashboard" && <ParamModal />}
    </div>
  );
}
