import { useRef } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import { waveParams } from "./waveState";

const LINES = {
  dUp: "Widen the slits' separation and the fringes crowd together — Δy = λL/d, the geometry of interference.",
  lamUp: "Longer waves stretch the pattern apart; the screen is measuring wavelength itself.",
  dTight: "Bring the slits close and the pattern opens wide — small causes, broad consequences.",
};

// DOM glass budget: this panel uses pre-baked translucency (no backdrop-filter).
export default function WaveControls() {
  const setScripted = useCircuitStore((s) => s.setScriptedNarration);
  const dOut = useRef();
  const lOut = useRef();
  const timer = useRef();
  const prev = useRef({ ...waveParams });

  const onChange = () => {
    if (dOut.current) dOut.current.textContent = waveParams.d.toFixed(2);
    if (lOut.current) lOut.current.textContent = waveParams.lambda.toFixed(2);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const p = prev.current;
      let line = null;
      if (waveParams.d < 0.8) line = LINES.dTight;
      else if (waveParams.d > p.d + 1e-3) line = LINES.dUp;
      else if (waveParams.lambda > p.lambda + 1e-3) line = LINES.lamUp;
      else if (waveParams.lambda < p.lambda - 1e-3) line = LINES.dUp; // Δy=λL/d shrinks again
      prev.current = { ...waveParams };
      if (line) setScripted(line);
    }, 900);
  };

  return (
    <aside className="era-panel" aria-label="Double slit controls">
      <h3>DOUBLE-SLIT RIG</h3>
      <label>
        SLIT SEPARATION d <span ref={dOut} className="val">{waveParams.d.toFixed(2)}</span>
        <input
          type="range" min="0.6" max="3" step="0.05" defaultValue={waveParams.d}
          aria-label="Slit separation d"
          onInput={(e) => { waveParams.d = Number(e.target.value); onChange(); }}
        />
      </label>
      <label>
        WAVELENGTH λ <span ref={lOut} className="val">{waveParams.lambda.toFixed(2)}</span>
        <input
          type="range" min="0.4" max="1.2" step="0.02" defaultValue={waveParams.lambda}
          aria-label="Wavelength lambda"
          onInput={(e) => { waveParams.lambda = Number(e.target.value); onChange(); }}
        />
      </label>
      <p className="hint-line">Δy = λL/d</p>
    </aside>
  );
}
