export default function Histogram({ probabilities, numQubits }) {
  const entries = Object.entries(probabilities).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="histogram">
      {entries.map(([basis, p]) => (
        <div className="hrow" key={basis}>
          <span className="hlabel">
            ⟨{basis}⟩ {(p * 100).toFixed(1)}%
          </span>
          <div className="hbar-track">
            <div className="hbar" style={{ width: `${p * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="caption">bit order: q{numQubits - 1}…q0 (little-endian)</div>
    </div>
  );
}
