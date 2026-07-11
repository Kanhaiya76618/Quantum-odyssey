import { useCircuitStore, NUM_COLS } from "../store/circuitStore";

const CELL = 56;
const DISPLAY = { sdg: "S†", tdg: "T†" };

export function formatTheta(t) {
  const k = Math.round(t / (Math.PI / 4));
  if (Math.abs(t - (k * Math.PI) / 4) < 1e-6) {
    if (k === 0) return "0";
    const sign = k < 0 ? "-" : "";
    const a = Math.abs(k);
    if (a % 4 === 0) return `${sign}${a / 4 === 1 ? "" : a / 4}π`;
    if (a % 2 === 0) return `${sign}${a / 2 === 1 ? "" : a / 2}π/2`;
    return `${sign}${a === 1 ? "" : a}π/4`;
  }
  return t.toFixed(3);
}

function cellView(cell) {
  if (cell.role === "control") return ["●", "sym"];
  if (cell.name === "swap") return ["✕", "sym"];
  if (cell.role === "target") return [cell.name === "cz" ? "●Z" : "⊕", "sym"];
  const base = DISPLAY[cell.name] || cell.name.toUpperCase();
  return [cell.params ? `${base}(${formatTheta(cell.params[0])})` : base, "box"];
}

function connectors(grid, numQubits) {
  const lines = [];
  for (let col = 0; col < NUM_COLS; col++) {
    const spans = {};
    for (let q = 0; q < numQubits; q++) {
      const c = grid[q][col];
      if (!c) continue;
      const s = spans[c.opId] || (spans[c.opId] = [q, q]);
      s[0] = Math.min(s[0], q);
      s[1] = Math.max(s[1], q);
    }
    for (const [minQ, maxQ] of Object.values(spans)) {
      if (maxQ > minQ) lines.push({ col, minQ, maxQ });
    }
  }
  return lines;
}

export default function CircuitGrid() {
  const grid = useCircuitStore((s) => s.grid);
  const numQubits = useCircuitStore((s) => s.numQubits);
  const pending = useCircuitStore((s) => s.pending);
  const shake = useCircuitStore((s) => s.shake);
  const notice = useCircuitStore((s) => s.notice);
  const cellClick = useCircuitStore((s) => s.cellClick);
  const eraseAt = useCircuitStore((s) => s.eraseAt);

  const lines = connectors(grid, numQubits);
  const pendingAt = (q, col) => pending && pending.cells.find((c) => c.q === q && c.col === col);

  return (
    <div className="grid-wrap">
      <div className="labels">
        {Array.from({ length: numQubits }, (_, q) => (
          <div key={q} className="qlabel">
            |q{q}⟩
          </div>
        ))}
      </div>
      <div className="grid" style={{ width: NUM_COLS * CELL, height: numQubits * CELL }}>
        {lines.map((l, i) => (
          <div
            key={i}
            className="vline"
            style={{ left: l.col * CELL + CELL / 2 - 1, top: l.minQ * CELL + CELL / 2, height: (l.maxQ - l.minQ) * CELL }}
          />
        ))}
        {grid.map((row, q) =>
          row.map((cell, col) => {
            const pend = pendingAt(q, col);
            const cls = ["cell"];
            if (shake && shake.q === q && shake.col === col) cls.push("shake");
            const [label, kind] = cell ? cellView(cell) : [null, null];
            return (
              <div
                key={`${q}-${col}`}
                role="button"
                aria-label={`q${q} col ${col}`}
                className={cls.join(" ")}
                style={{ left: col * CELL, top: q * CELL }}
                onClick={() => cellClick(q, col)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  eraseAt(q, col);
                }}
              >
                {cell && <span className={`tag ${kind}`}>{label}</span>}
                {pend && !cell && <span className="tag ghost">{pend.role === "control" ? "●" : "◌"}</span>}
                {notice && notice.q === q && notice.col === col && <span className="tip">{notice.msg}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
