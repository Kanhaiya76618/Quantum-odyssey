from fastapi import APIRouter, HTTPException

from app.core.simulator import simulate
from app.models.schemas import CircuitRequest, SimulateResponse

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse)
def simulate_circuit(req: CircuitRequest):
    try:
        return simulate(req.num_qubits, [g.model_dump() for g in req.gates])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
