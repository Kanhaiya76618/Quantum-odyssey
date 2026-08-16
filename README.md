# Quantum Odyssey ⚡

An interactive quantum discovery platform & fintech optimization engine — combining an architectural Paper & Ink 3D Quantum Museum, 2D Qubit City circuit builder, Machine World circuit lab, and **The Quantum Arbitrage Compass (ERA V)** backed by FastAPI, Qiskit 1.x, and real IBM Quantum Hardware API integration.

## 🚀 Quick Start with Docker

The fastest way to launch the complete system (both Frontend and Backend) is via Docker Compose:

```bash
docker-compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Qiskit Backend**: [http://localhost:8000](http://localhost:8000)
- **Backend API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🛠️ Local Development (Without Docker)

### 1. Start the FastAPI + Qiskit Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Start the React + Vite Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌟 Key Features & Architecture

1. **ERA V — The Quantum Arbitrage Compass & Eigen Quantum AI Agent**:
   - Formulates currency exchange graph routing into a QUBO optimization problem.
   - Runs a 30-iteration COBYLA classical-quantum variational optimization loop.
   - Real-time live exchange rate ingestion via Frankfurter API.
   - Executes on real IBM Quantum Hardware (via `QiskitRuntimeService` & `SamplerV2`) with **TREX Level 1 Error Mitigation**.
   - Populates the generated QAOA circuit ansatz directly into the 2D Qubit City grid and monolith skyline!
2. **Grand Quantum Museum (3D Paper & Ink Exhibition)**:
   - Architectural stacked gallery housing 71 historical quantum milestones from 1610 to 2025.
   - Dedicated 17th Century Chamber (Galileo's Telescope, Snell's Law, Grimaldi's Diffraction, Rømer's Speed of Light).
   - Dedicated 18th Century Chamber (Newton's Opticks, Bradley's Stellar Aberration, Coulomb's Torsion Balance, Young's Wave Superposition).
   - Interactive mathematical blueprint diagrams ($n_1\sin\theta_1 = n_2\sin\theta_2$, $F = k\frac{q_1 q_2}{r^2}$, $d\sin\theta = m\lambda$).
3. **Machine World & Circuit Dashboard**:
   - High-contrast Paper & Ink quantum circuit builder with live Bloch sphere vector projections.
   - Step debugger, circuit optimizer, noise model simulator, and SVG/PNG archival blueprint exports.
4. **2D Qubit City & Physics Labs**:
   - Dynamic paper monolith skyline & Hilbert space wave density visualizer ($|\Psi(x)|^2$).
   - Wave Ocean double-slit interference rig & Schrödinger's Cat superposition collapse experiment.

---

## 📄 License
MIT License
