import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Send } from "lucide-react";
import { useCircuitStore } from "../store/circuitStore";

export default function EigenPanel({ variant = "overlay" }) {
  const eigen = useCircuitStore((s) => s.eigen);
  const results = useCircuitStore((s) => s.results);
  const narrate = useCircuitStore((s) => s.eigenNarrate);
  const ask = useCircuitStore((s) => s.eigenAsk);
  const setTyping = useCircuitStore((s) => s.eigenSetTyping);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState("");
  const [q, setQ] = useState("");

  const era = useCircuitStore((s) => s.era);
  const view = useCircuitStore((s) => s.view);
  useEffect(() => {
    if (view === "city" && era === "city") narrate();
  }, [results, narrate, era, view]);

  useEffect(() => {
    const text = eigen.text || "";
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    if (!text) return;
    setTyping(true);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setTyping(false);
      }
    }, 24);
    return () => {
      clearInterval(id);
      setTyping(false);
    };
  }, [eigen.text, reduced, setTyping]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      ask(q.trim());
      setQ("");
    }
  };

  return (
    <motion.aside
      className={`eigen-panel ${variant}`}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#FDFBF7',
        border: '2px solid #1A1A1A',
        borderRadius: '18px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        padding: '16px',
        color: '#1A1A1A',
      }}
    >
      <header className="flex items-center gap-3.5 mb-2 pb-2 border-b border-[#1A1A1A]">
        <span className={"orb" + (eigen.typing ? "" : " idle")} aria-hidden="true" />
        <b className="font-display font-extrabold text-[#0A0A0A] tracking-wider text-sm">
          EIGEN COMPANION
        </b>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#EAE7DF] border border-[#1A1A1A] text-[#1A1A1A] ml-auto">
          {eigen.typing ? "narrating…" : "listening"}
        </span>
      </header>

      <p className="eigen-text font-body text-sm font-medium leading-relaxed text-[#0A0A0A] my-2 min-h-[48px]" aria-live="polite">
        {shown || "Eigen is analyzing your quantum circuit state vector..."}
        {eigen.typing && !reduced && <span className="caret text-[#1A1A1A]">▍</span>}
      </p>

      <form onSubmit={submit} className="flex gap-2 mt-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask Eigen — e.g. why 50/50?"
          aria-label="Ask Eigen a question"
          className="flex-1 px-3 py-2 text-sm font-body font-semibold rounded-xl focus:outline-none transition-all"
          style={{
            background: '#FFFFFF',
            border: '2px solid #1A1A1A',
            color: '#0A0A0A',
            caretColor: '#0A0A0A',
          }}
        />
        <button
          type="submit"
          aria-label="Send question to Eigen"
          className="w-10 h-10 flex items-center justify-center rounded-xl font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            background: '#1A1A1A',
            color: '#F2F0EA',
            border: '2px solid #1A1A1A',
          }}
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </motion.aside>
  );
}
