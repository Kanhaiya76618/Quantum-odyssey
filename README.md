# Quantum Odyssey

An interactive archive of quantum discovery — a Next.js front end backed by a
FastAPI service that runs real circuits through Qiskit Aer.

## Layout

| Path              | What it is                                                    |
| ----------------- | ------------------------------------------------------------- |
| `quantumodyssey/` | The Next.js 15 app (the front end that is actively developed) |
| `backend/`        | FastAPI + Qiskit Aer statevector simulator                    |
| `frontend/`       | The earlier Vite prototype, kept for reference                |

## Running it

Start the backend first — the app probes it on boot and falls back to its
in-browser simulator when it is unreachable.

```bash
backend/.venv/bin/uvicorn app.main:app --port 8000 --app-dir backend
```

```bash
npm --prefix quantumodyssey run dev
```

The app is then at http://localhost:4028 and the API at http://localhost:8000.

## How the two halves talk

`quantumodyssey/src/lib/api.ts` is the only place that knows about the backend.
It points at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) and calls:

- `GET /health` — probed once on mount to set the Qiskit/Local status badge
- `POST /circuit/simulate` — `{ num_qubits, gates[] }` in; exact statevector,
  probabilities, per-qubit Bloch vectors, OpenQASM 2.0 and an ASCII diagram out

Two conventions matter when reading that code:

- **Bit order.** Qiskit is little-endian (q0 is the rightmost bit); the UI labels
  basis states with q0 leftmost. `flipBits` converts between them, and
  everything stored or displayed is in UI order.
- **Two-qubit gates.** The builder places a gate on a single anchor qubit, so
  `CNOT`/`CX`/`SWAP` implicitly act on `(q, (q + 1) % n)`. `toBackendGates`
  expands that into explicit control/target pairs.

When the backend answers, The Machine uses the exact amplitudes for the state
vector, the measurement histogram, the Bloch spheres and Eigen's narration, and
writes the run to `localStorage` under `qo:lastRun` so the Circuit Dashboard
reports the same numbers instead of sample data.
