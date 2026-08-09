import { motion, useReducedMotion } from "motion/react";

export default function Histogram({ probabilities, numQubits }) {
  const reduced = useReducedMotion();
  const entries = Object.entries(probabilities).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="histogram">
      {entries.map(([basis, p]) => (
        <div className="hrow" key={basis}>
          <span className="hlabel">
            ⟨{basis}⟩ {(p * 100).toFixed(1)}%
          </span>
          <div className="hbar-track">
            {/* scaleX (transform), never width — bar is full-width and scales from the left */}
            <motion.div
              className="hbar"
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: p }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
            />
          </div>
        </div>
      ))}
      <div className="caption">bit order: q{numQubits - 1}…q0 (little-endian)</div>
    </div>
  );
}
