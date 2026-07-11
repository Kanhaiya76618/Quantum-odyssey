import { useCircuitStore } from "../store/circuitStore";
import Histogram from "./Histogram";

export default function ResultsPanel() {
  const results = useCircuitStore((s) => s.results);

  if (!results) {
    return (
      <aside className="results empty">
        <p>Place gates on the grid — results appear here.</p>
      </aside>
    );
  }

  const { probabilities, statevector, bloch, diagram, qasm, gate_count, num_qubits } = results;

  return (
    <aside className="results">
      <h2>Probabilities</h2>
      <Histogram probabilities={probabilities} numQubits={num_qubits} />

      <h2>Statevector</h2>
      <table>
        <thead>
          <tr>
            <th>basis</th>
            <th>re</th>
            <th>im</th>
            <th>prob</th>
          </tr>
        </thead>
        <tbody>
          {statevector.map((e) => (
            <tr key={e.basis}>
              <td>{e.basis}</td>
              <td>{e.re}</td>
              <td>{e.im}</td>
              <td>{e.prob}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Bloch vectors</h2>
      {bloch.map((b) => (
        <div className="bloch" key={b.qubit}>
          q{b.qubit}: x={b.x.toFixed(3)} y={b.y.toFixed(3)} z={b.z.toFixed(3)}
        </div>
      ))}

      <h2>Circuit</h2>
      <pre className="diagram">{diagram}</pre>
      <details>
        <summary>QASM</summary>
        <pre>{qasm}</pre>
      </details>

      <footer>
        {gate_count} gates · {num_qubits} qubits
      </footer>
    </aside>
  );
}
