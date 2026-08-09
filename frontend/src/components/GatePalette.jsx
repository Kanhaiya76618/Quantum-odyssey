import { useCircuitStore } from "../store/circuitStore";

const GROUPS = [
  [["h", "H"], ["x", "X"], ["y", "Y"], ["z", "Z"], ["s", "S"], ["sdg", "S†"], ["t", "T"], ["tdg", "T†"]],
  [["rx", "RX"], ["ry", "RY"], ["rz", "RZ"], ["p", "P"]],
  [["cx", "CX"], ["cz", "CZ"], ["swap", "SWAP"], ["ccx", "CCX"]],
];

export default function GatePalette() {
  const selected = useCircuitStore((s) => s.selectedGate);
  const select = useCircuitStore((s) => s.setSelectedGate);
  const clearAll = useCircuitStore((s) => s.clearAll);

  return (
    <div className="palette" role="toolbar" aria-label="Gate palette">
      {GROUPS.map((group, i) => (
        <div className="group" key={i}>
          {group.map(([name, label]) => (
            <button
              key={name}
              className={selected === name ? "sel" : ""}
              onClick={() => select(name)}
              aria-label={`${label} gate`}
              aria-pressed={selected === name}
            >
              {label}
            </button>
          ))}
        </div>
      ))}
      <div className="group">
        <button
          className={"erase" + (selected === "erase" ? " sel" : "")}
          onClick={() => select("erase")}
          aria-label="Erase tool"
          aria-pressed={selected === "erase"}
        >
          ERASE
        </button>
        <button className="clear" onClick={clearAll} aria-label="Clear all gates">
          CLEAR ALL
        </button>
      </div>
    </div>
  );
}
