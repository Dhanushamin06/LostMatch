from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.item import LostItem, FoundItem, ItemStatus
from app.models.match import Match, MatchStatus
from app.services.matching_service import get_matching_service

router = APIRouter()


@router.get("")
async def list_matches(
    skip: int = 0,
    limit: int = 20,
    status: Optional[MatchStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List matches for current user's items"""
    # Get user's lost and found item IDs
    lost_ids = [item.id for item in current_user.lost_items]
    found_ids = [item.id for item in current_user.found_items]
    all_ids = lost_ids + found_ids
    
    if not all_ids:
        return []
    
    query = db.query(Match).filter(
        (Match.lost_item_id.in_(all_ids)) | (Match.found_item_id.in_(all_ids))
    )
    
    if status:
        query = query.filter(Match.status == status)
    
    matches = query.order_by(Match.final_score.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": match.id,
            "lost_item_id": match.lost_item_id,
            "found_item_id": match.found_item_id,
            "image_score": match.image_score,
            "text_score": match.text_score,
            "location_score": match.location_score,
            "time_score": match.time_score,
            "final_score": match.final_score,
            "status": match.status.value,
            "created_at": match.created_at.isoformat(),
            "lost_item": {
                "id": match.lost_item.id,
                "title": match.lost_item.title,
                "category": match.lost_item.category.value,
                "description": match.lost_item.description,
                "identifying_features": match.lost_item.identifying_features,
                "image_url": match.lost_item.image_url,
                "location": match.lost_item.location,
                "lost_date": match.lost_item.lost_date.isoformat(),
                "lost_time": match.lost_item.lost_time.isoformat() if match.lost_item.lost_time else None,
                "contact_name": match.lost_item.contact_name or (match.lost_item.user.full_name if match.lost_item.user else None),
                "contact_phone": match.lost_item.contact_phone or (match.lost_item.user.phone_number if match.lost_item.user else None),
                "contact_email": match.lost_item.contact_email or (match.lost_item.user.email if match.lost_item.user else None),
                "additional_details": match.lost_item.additional_details,
                "user_id": match.lost_item.user_id,
                "user": {
                    "full_name": match.lost_item.user.full_name,
                    "email": match.lost_item.user.email,
                    "phone_number": match.lost_item.user.phone_number
                } if match.lost_item.user else None
            } if match.lost_item else None,
            "found_item": {
                "id": match.found_item.id,
                "title": match.found_item.title,
                "category": match.found_item.category.value,
                "description": match.found_item.description,
                "identifying_features": match.found_item.identifying_features,
                "image_url": match.found_item.image_url,
                "location": match.found_item.location,
                "found_date": match.found_item.found_date.isoformat(),
                "found_time": match.found_item.found_time.isoformat() if match.found_item.found_time else None,
                "contact_name": match.found_item.contact_name or (match.found_item.user.full_name if match.found_item.user else None),
                "contact_phone": match.found_item.contact_phone or (match.found_item.user.phone_number if match.found_item.user else None),
                "contact_email": match.found_item.contact_email or (match.found_item.user.email if match.found_item.user else None),
                "additional_details": match.found_item.additional_details,
                "user_id": match.found_item.user_id,
                "user": {
                    "full_name": match.found_item.user.full_name,
                    "email": match.found_item.user.email,
                    "phone_number": match.found_item.user.phone_number
                } if match.found_item.user else None
            } if match.found_item else None
        }
        for match in matches
    ]


@router.get("/{match_id}")
async def get_match(
    match_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if user owns either item
    lost_item = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
    found_item = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    if lost_item.user_id != current_user.id and found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this match")
    
    return {
        "id": match.id,
        "lost_item_id": match.lost_item_id,
        "found_item_id": match.found_item_id,
        "image_score": match.image_score,
        "text_score": match.text_score,
        "location_score": match.location_score,
        "time_score": match.time_score,
        "final_score": match.final_score,
        "status": match.status.value,
        "created_at": match.created_at.isoformat(),
        "lost_item": {
            "id": lost_item.id,
            "title": lost_item.title,
            "category": lost_item.category.value,
            "description": lost_item.description,
            "identifying_features": lost_item.identifying_features,
            "image_url": lost_item.image_url,
            "location": lost_item.location,
            "lost_date": lost_item.lost_date.isoformat(),
            "lost_time": lost_item.lost_time.isoformat() if lost_item.lost_time else None,
            "contact_name": lost_item.contact_name or (lost_item.user.full_name if lost_item.user else ""),
            "contact_phone": lost_item.contact_phone or (lost_item.user.phone_number if lost_item.user else ""),
            "contact_email": lost_item.contact_email or (lost_item.user.email if lost_item.user else ""),
            "additional_details": lost_item.additional_details,
            "user_id": lost_item.user_id,
            "user_name": lost_item.user.full_name if lost_item.user else "",
            "user_phone": lost_item.user.phone_number if lost_item.user else ""
        },
        "found_item": {
            "id": found_item.id,
            "title": found_item.title,
            "category": found_item.category.value,
            "description": found_item.description,
            "identifying_features": found_item.identifying_features,
            "image_url": found_item.image_url,
            "location": found_item.location,
            "found_date": found_item.found_date.isoformat(),
            "found_time": found_item.found_time.isoformat() if found_item.found_time else None,
            "contact_name": found_item.contact_name or (found_item.user.full_name if found_item.user else ""),
            "contact_phone": found_item.contact_phone or (found_item.user.phone_number if found_item.user else ""),
            "contact_email": found_item.contact_email or (found_item.user.email if found_item.user else ""),
            "additional_details": found_item.additional_details,
            "user_id": found_item.user_id,
            "user_name": found_item.user.full_name if found_item.user else "",
            "user_phone": found_item.user.phone_number if found_item.user else ""
        }
    }


@router.patch("/{match_id}/status")
async def update_match_status(
    match_id: int,
    status: MatchStatus,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check ownership
    lost_item = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
    found_item = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    # Only item owners or admin can update
    if lost_item.user_id != current_user.id and found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    match.status = status
    db.commit()
    
    # Update item statuses if confirmed
    if status == MatchStatus.CONFIRMED:
        lost = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
        found = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
        
        if lost:
            lost.status = ItemStatus.CLAIM_PENDING
        if found:
            found.status = ItemStatus.CLAIM_PENDING
        db.commit()
    
    return {"message": f"Match status updated to {status.value}"}


@router.get("/{match_id}/explanation")
async def get_match_explanation(
    match_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check ownership
    lost_item = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
    found_item = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    if lost_item.user_id != current_user.id and found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from app.ranking.matcher import get_explanation, get_weights, MatchScore
    
    weights = get_weights()
    score = MatchScore(
        image_score=match.image_score,
        text_score=match.text_score,
        location_score=match.location_score,
        time_score=match.time_score,
        final_score=match.final_score,
        same_category=lost_item.category == found_item.category
    )
    
    explanation = get_explanation(score, weights)
    
    return {
        "match_id": match.id,
        "overall_score": match.final_score,
        "breakdown": {
            "image": match.image_score,
            "text": match.text_score,
            "location": match.location_score,
            "time": match.time_score
        },
        "weights": {
            "image": weights.image_weight,
            "text": weights.text_weight,
            "location": weights.location_weight,
            "time": weights.time_weight
        },
        "explanation": explanation,
        "category_match": lost_item.category == found_item.category
    }