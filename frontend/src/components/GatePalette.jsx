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
    <div className="palette">
      {GROUPS.map((group, i) => (
        <div className="group" key={i}>
          {group.map(([name, label]) => (
            <button key={name} className={selected === name ? "sel" : ""} onClick={() => select(name)}>
              {label}
            </button>
          ))}
        </div>
      ))}
      <div className="group">
        <button className={"erase" + (selected === "erase" ? " sel" : "")} onClick={() => select("erase")}>
          ERASE
        </button>
        <button className="clear" onClick={clearAll}>
          CLEAR ALL
        </button>
      </div>
    </div>
  );
}
