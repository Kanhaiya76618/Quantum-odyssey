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


class ArbitrageRequest(BaseModel):
    capital: float = 10000.0
    steps: int = 3
    rates: dict[str, float] | None = None
    ibm_token: str | None = None


class ArbitragePathResult(BaseModel):
    binary: str
    path: list[str]
    final_capital: float
    profit: float
    prob: float


class ArbitrageResponse(BaseModel):
    initial_capital: float
    final_capital: float
    projected_profit: float
    roi_percent: float
    optimal_path_binary: str
    optimal_path_names: list[str]
    all_paths: list[ArbitragePathResult]
    num_qubits: int
    qaoa_circuit_gates: list[GateOp]
    probabilities: dict[str, float]
    cost_history: list[float]
    error_mitigation: str
    backend_used: str
    is_real_hardware: bool
    execution_time_ms: float


