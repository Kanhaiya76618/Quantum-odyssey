import { useEffect, useState } from "react";
import { useCircuitStore } from "../store/circuitStore";

const DEFAULT = "1.5707963";
const QUICK = [
  ["π", Math.PI],
  ["π/2", Math.PI / 2],
  ["π/4", Math.PI / 4],
  ["−π/2", -Math.PI / 2],
];

export default function ParamModal() {
  const req = useCircuitStore((s) => s.paramRequest);
  const confirmParam = useCircuitStore((s) => s.confirmParam);
  const cancel = useCircuitStore((s) => s.cancelPending);
  const [val, setVal] = useState(DEFAULT);

  useEffect(() => {
    if (req) setVal(DEFAULT);
  }, [req]);

  if (!req) return null;

  const place = () => {
    const v = parseFloat(val);
    if (!Number.isFinite(v)) return;
    confirmParam(v);
  };

  return (
    <div className="overlay" onClick={cancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{req.name.toUpperCase()} — angle (radians)</h3>
        <input
          autoFocus
          type="number"
          step="any"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") place();
          }}
        />
        <div className="quick">
          {QUICK.map(([label, v]) => (
            <button key={label} onClick={() => setVal(String(v))}>
              {label}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={cancel}>Cancel</button>
          <button className="primary" onClick={place}>
            Place
          </button>
        </div>
      </div>
    </div>
  );
}
