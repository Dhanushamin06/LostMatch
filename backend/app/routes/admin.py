from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.models.match import Match, Claim
from app.routes import admin_users, admin_index

router = APIRouter()
router.include_router(admin_users.router, prefix="/users", tags=["admin-users"])
router.include_router(admin_index.router, prefix="/index", tags=["admin-index"])


@router.get("/analytics")
async def get_analytics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    lost_items = db.query(LostItem).count()
    found_items = db.query(FoundItem).count()
    potential_matches = db.query(Match).filter(Match.status == "pending").count()
    successful_returns = db.query(Match).filter(Match.status == "confirmed").count()
    pending_claims = db.query(Claim).filter(Claim.status == "pending").count()
    
    return {
        "total_users": total_users,
        "lost_items": lost_items,
        "found_items": found_items,
        "potential_matches": potential_matches,
        "successful_returns": successful_returns,
        "pending_claims": pending_claims,
    }


@router.get("/matching/weights")
async def get_weights(
    current_admin: User = Depends(get_current_admin)
):
    from app.ranking.matcher import get_weights
    weights = get_weights()
    return {
        "image_weight": weights.image_weight,
        "text_weight": weights.text_weight,
        "location_weight": weights.location_weight,
        "time_weight": weights.time_weight
    }


@router.patch("/matching/weights")
async def update_weights(
    image_weight: float,
    text_weight: float,
    location_weight: float,
    time_weight: float,
    current_admin: User = Depends(get_current_admin)
):
    # Update .env file
    import os
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
        
        weights = {
            "IMAGE_WEIGHT": str(image_weight),
            "TEXT_WEIGHT": str(text_weight),
            "LOCATION_WEIGHT": str(location_weight),
            "TIME_WEIGHT": str(time_weight)
        }
        
        for i, line in enumerate(lines):
            for key, value in weights.items():
                if line.startswith(key + "="):
                    lines[i] = f"{key}={value}\n"
        
        with open(env_path, "w") as f:
            f.writelines(lines)
    
    return {
        "message": "Weights updated. Restart server to apply changes.",
        "weights": {
            "image_weight": image_weight,
            "text_weight": text_weight,
            "location_weight": location_weight,
            "time_weight": time_weight
        }
    }