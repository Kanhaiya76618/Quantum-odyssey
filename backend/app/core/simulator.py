"""Gate-list JSON -> QuantumCircuit -> exact Aer statevector simulation."""
from qiskit import QuantumCircuit, qasm2, transpile
from qiskit.quantum_info import Pauli, Statevector, partial_trace
from qiskit_aer import AerSimulator

EPS = 1e-9
MAX_QUBITS = 5
MAX_GATES = 64

# name -> (n_controls, n_targets, n_params, apply(qc, controls, targets, params))
GATES = {
    "h":    (0, 1, 0, lambda qc, c, t, p: qc.h(t[0])),
    "x":    (0, 1, 0, lambda qc, c, t, p: qc.x(t[0])),
    "y":    (0, 1, 0, lambda qc, c, t, p: qc.y(t[0])),
    "z":    (0, 1, 0, lambda qc, c, t, p: qc.z(t[0])),
    "s":    (0, 1, 0, lambda qc, c, t, p: qc.s(t[0])),
    "sdg":  (0, 1, 0, lambda qc, c, t, p: qc.sdg(t[0])),
    "t":    (0, 1, 0, lambda qc, c, t, p: qc.t(t[0])),
    "tdg":  (0, 1, 0, lambda qc, c, t, p: qc.tdg(t[0])),
    "rx":   (0, 1, 1, lambda qc, c, t, p: qc.rx(p[0], t[0])),
    "ry":   (0, 1, 1, lambda qc, c, t, p: qc.ry(p[0], t[0])),
    "rz":   (0, 1, 1, lambda qc, c, t, p: qc.rz(p[0], t[0])),
    "p":    (0, 1, 1, lambda qc, c, t, p: qc.p(p[0], t[0])),
    "cx":   (1, 1, 0, lambda qc, c, t, p: qc.cx(c[0], t[0])),
    "cz":   (1, 1, 0, lambda qc, c, t, p: qc.cz(c[0], t[0])),
    "swap": (0, 2, 0, lambda qc, c, t, p: qc.swap(t[0], t[1])),
    "ccx":  (2, 1, 0, lambda qc, c, t, p: qc.ccx(c[0], c[1], t[0])),
}


def _validate(num_qubits: int, gates: list[dict]) -> None:
    if not 1 <= num_qubits <= MAX_QUBITS:
        raise ValueError(f"num_qubits must be between 1 and {MAX_QUBITS}, got {num_qubits}")
    if not 1 <= len(gates) <= MAX_GATES:
        raise ValueError(f"circuit must have between 1 and {MAX_GATES} gates, got {len(gates)}")
    for i, g in enumerate(gates):
        name = g["name"]
        if name not in GATES:
            raise ValueError(f"gate {i}: unsupported gate '{name}'")
        nc, nt, np, _ = GATES[name]
        if len(g["controls"]) != nc:
            raise ValueError(f"gate {i} ('{name}'): expects {nc} control(s), got {len(g['controls'])}")
        if len(g["targets"]) != nt:
            raise ValueError(f"gate {i} ('{name}'): expects {nt} target(s), got {len(g['targets'])}")
        if len(g["params"]) != np:
            raise ValueError(f"gate {i} ('{name}'): expects {np} param(s), got {len(g['params'])}")
        qubits = g["controls"] + g["targets"]
        for q in qubits:
            if not 0 <= q < num_qubits:
                raise ValueError(f"gate {i} ('{name}'): qubit index {q} out of range for {num_qubits} qubit(s)")
        if len(set(qubits)) != len(qubits):
            raise ValueError(f"gate {i} ('{name}'): duplicate qubit index in {qubits}")


def simulate(num_qubits: int, gates: list[dict]) -> dict:
    _validate(num_qubits, gates)

    qc = QuantumCircuit(num_qubits)
    for g in gates:
        GATES[g["name"]][3](qc, g["controls"], g["targets"], g["params"])

    # export before save_statevector: save instructions break QASM 2 export
    qasm = qasm2.dumps(qc)
    diagram = str(qc.draw(output="text"))

    qc.save_statevector()
    sim = AerSimulator(method="statevector")
    sv = Statevector(sim.run(transpile(qc, sim)).result().get_statevector())

    statevector = [
        {
            "basis": format(i, f"0{num_qubits}b"),
            "re": round(amp.real, 6),
            "im": round(amp.imag, 6),
            "prob": round(abs(amp) ** 2, 6),
        }
        for i, amp in enumerate(sv.data)
        if abs(amp) ** 2 >= EPS
    ]
    probabilities = {b: round(p, 6) for b, p in sv.probabilities_dict().items() if p >= EPS}

    bloch = []
    for q in range(num_qubits):
        rho = partial_trace(sv, [k for k in range(num_qubits) if k != q])
        bloch.append({
            "qubit": q,
            "x": round(rho.expectation_value(Pauli("X")).real, 6),
            "y": round(rho.expectation_value(Pauli("Y")).real, 6),
            "z": round(rho.expectation_value(Pauli("Z")).real, 6),
        })

    return {
        "num_qubits": num_qubits,
        "gate_count": len(gates),
        "statevector": statevector,
        "probabilities": probabilities,
        "bloch": bloch,
        "qasm": qasm,
        "diagram": diagram,
        "bit_order": "qiskit-little-endian",
    }
