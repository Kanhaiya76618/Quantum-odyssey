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
    <div className="overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4" onClick={cancel}>
      <div
        className="modal bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-6 shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg text-[#0A0A0A] mb-4 pb-2 border-b border-[#1A1A1A]">
          {req.name.toUpperCase()} — Rotation Angle (Radians)
        </h3>
        <input
          autoFocus
          type="number"
          step="any"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") place();
          }}
          className="w-full px-4 py-3 bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-xl text-[#0A0A0A] font-mono font-extrabold text-base mb-4 focus:outline-none"
        />
        <div className="quick flex gap-2 mb-6">
          {QUICK.map(([label, v]) => (
            <button
              key={label}
              onClick={() => setVal(String(v))}
              className="flex-1 py-2 bg-[#EAE7DF] border border-[#1A1A1A] rounded-lg text-xs font-mono font-bold text-[#0A0A0A] cursor-pointer hover:bg-[#1A1A1A] hover:text-[#F2F0EA] transition-all"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="actions flex justify-end gap-3 pt-3 border-t border-[#1A1A1A]">
          <button
            onClick={cancel}
            className="px-4 py-2 bg-[#EAE7DF] border border-[#1A1A1A] rounded-xl text-xs font-bold text-[#1A1A1A] cursor-pointer hover:bg-[#DEDACF]"
          >
            Cancel
          </button>
          <button
            onClick={place}
            className="px-5 py-2 bg-[#1A1A1A] text-[#F2F0EA] border-2 border-[#1A1A1A] rounded-xl text-xs font-bold font-mono cursor-pointer hover:scale-102 transition-all"
          >
            Place Gate ▶
          </button>
        </div>
      </div>
    </div>
  );
}
