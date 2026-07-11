from pydantic import BaseModel


class GateOp(BaseModel):
    name: str
    targets: list[int]
    controls: list[int] = []
    params: list[float] = []


class CircuitRequest(BaseModel):
    num_qubits: int
    gates: list[GateOp]


class StatevectorEntry(BaseModel):
    basis: str
    re: float
    im: float
    prob: float


class BlochVector(BaseModel):
    qubit: int
    x: float
    y: float
    z: float


class SimulateResponse(BaseModel):
    num_qubits: int
    gate_count: int
    statevector: list[StatevectorEntry]
    probabilities: dict[str, float]
    bloch: list[BlochVector]
    qasm: str
    diagram: str
    bit_order: str
