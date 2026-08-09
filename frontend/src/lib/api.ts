const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:8000';

export interface GateOp {
  name: string;
  targets: number[];
  controls: number[];
  params: number[];
}

export interface StatevectorEntry {
  basis: string;
  re: number;
  im: number;
  prob: number;
}

export interface BlochVector {
  qubit: number;
  x: number;
  y: number;
  z: number;
}

export interface SimulateResponse {
  num_qubits: number;
  gate_count: number;
  statevector: StatevectorEntry[];
  probabilities: Record<string, number>;
  bloch: BlochVector[];
  qasm: string;
  diagram: string;
  bit_order: string;
}

// UI gate model used by the machine-world builder.
export interface UIGate {
  type: string;
  qubit: number;
  col: number;
}

// The UI labels basis states with q0 as the leftmost bit; Qiskit is
// little-endian (q0 rightmost). Reverse bitstrings when crossing the boundary.
export const flipBits = (basis: string) => basis.split('').reverse().join('');

/**
 * Map the builder's single-anchor gate model to backend GateOps.
 * Two-qubit gates in the builder implicitly act on (q, (q+1) % n), matching
 * the client-side simulator's convention.
 */
export function toBackendGates(gates: UIGate[], nQubits: number): GateOp[] {
  const sorted = [...gates].sort((a, b) => a.col - b.col || a.qubit - b.qubit);
  const ops: GateOp[] = [];
  for (const g of sorted) {
    const q = g.qubit;
    const partner = (q + 1) % nQubits;
    switch (g.type) {
      case 'H': case 'X': case 'Y': case 'Z': case 'S': case 'T':
        ops.push({ name: g.type.toLowerCase(), targets: [q], controls: [], params: [] });
        break;
      case 'RZ':
        ops.push({ name: 'rz', targets: [q], controls: [], params: [Math.PI / 4] });
        break;
      case 'CNOT': case 'CX':
        ops.push({ name: 'cx', targets: [partner], controls: [q], params: [] });
        break;
      case 'SWAP':
        ops.push({ name: 'swap', targets: [q, partner], controls: [], params: [] });
        break;
      default:
        break;
    }
  }
  return ops;
}

export async function simulateCircuit(numQubits: number, gates: GateOp[]): Promise<SimulateResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/circuit/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_qubits: numQubits, gates }),
    });
  } catch {
    throw new Error('backend offline');
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch { /* non-JSON body */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Cross-page persistence: machine-world writes, dashboard reads ────────────
export interface LastRun {
  timestamp: number;
  numQubits: number;
  gateCounts: Record<string, number>;
  gateLayout: UIGate[];
  totalGates: number;
  depth: number;
  fidelity: number;
  probabilities: Record<string, number>; // display bit order (q0 leftmost)
  bloch: BlochVector[];
  qasm: string;
  source: 'qiskit' | 'local';
}

const LAST_RUN_KEY = 'qo:lastRun';

export function saveLastRun(run: LastRun) {
  try {
    localStorage.setItem(LAST_RUN_KEY, JSON.stringify(run));
  } catch { /* private mode */ }
}

export function loadLastRun(): LastRun | null {
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    return raw ? (JSON.parse(raw) as LastRun) : null;
  } catch {
    return null;
  }
}
