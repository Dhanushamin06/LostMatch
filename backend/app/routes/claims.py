from fastapi import APIRouter

router = APIRouter()


@router.post("")
async def create_claim():
    return {"message": "Create claim endpoint - to be implemented"}


@router.patch("/{claim_id}")
async def update_claim(claim_id: int):
    return {"message": f"Update claim {claim_id} endpoint - to be implemented"}