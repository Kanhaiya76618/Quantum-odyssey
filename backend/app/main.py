import qiskit
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import circuit

app = FastAPI(title="Quantum Odyssey API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(circuit.router, prefix="/circuit")


@app.get("/health")
def health():
    return {"status": "ok", "qiskit": qiskit.__version__}
