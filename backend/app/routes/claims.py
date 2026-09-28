from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.match import Match, MatchStatus, Claim, ClaimStatus
from app.models.item import LostItem, FoundItem, ItemStatus
from app.models.notification import Notification, NotificationType

router = APIRouter()


from pydantic import BaseModel

class ClaimCreate(BaseModel):
    match_id: int
    verification_question: str

class ClaimVerify(BaseModel):
    verification_answer: str
    approve: bool


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_claim(
    claim_data: ClaimCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    match_id = claim_data.match_id
    verification_question = claim_data.verification_question
    """Submit a claim for a matched item"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.status != MatchStatus.PENDING:
        raise HTTPException(status_code=400, detail="Match is not in pending status")
    
    # Check if user owns either the lost or found item
    lost_item = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
    found_item = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    # User must be the owner of the lost item (claiming their lost item)
    if lost_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner of the lost item can claim")
    
    # Check if claim already exists
    existing_claim = db.query(Claim).filter(Claim.match_id == match_id).first()
    if existing_claim:
        raise HTTPException(status_code=400, detail="Claim already exists for this match")
    
    claim = Claim(
        match_id=match_id,
        claimant_id=current_user.id,
        verification_question=verification_question,
        status=ClaimStatus.PENDING
    )
    
    db.add(claim)
    db.commit()
    db.refresh(claim)
    
    # Update match status
    match.status = MatchStatus.CLAIM_PENDING
    
    # Notify the found item owner
    notification = Notification(
        user_id=found_item.user_id,
        type=NotificationType.CLAIM_SUBMITTED,
        message=f"Someone has claimed your found item: {found_item.title}"
    )
    db.add(notification)
    
    # Notify the lost item owner
    notification2 = Notification(
        user_id=lost_item.user_id,
        type=NotificationType.CLAIM_SUBMITTED,
        message=f"Your claim for {lost_item.title} has been submitted"
    )
    db.add(notification2)
    
    db.commit()
    
    return {
        "id": claim.id,
        "match_id": claim.match_id,
        "claimant_id": claim.claimant_id,
        "verification_question": claim.verification_question,
        "status": claim.status.value,
        "created_at": claim.created_at.isoformat()
    }


@router.get("/my-claims")
async def list_my_claims(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List claims submitted by current user"""
    claims = db.query(Claim).filter(Claim.claimant_id == current_user.id).all()
    
    return [
        {
            "id": claim.id,
            "match_id": claim.match_id,
            "verification_question": claim.verification_question,
            "verification_answer": claim.verification_answer,
            "status": claim.status.value,
            "created_at": claim.created_at.isoformat(),
            "match": {
                "id": claim.match.id,
                "lost_item": claim.match.lost_item.title if claim.match.lost_item else None,
                "found_item": claim.match.found_item.title if claim.match.found_item else None,
                "final_score": claim.match.final_score
            } if claim.match else None
        }
        for claim in claims
    ]


@router.get("/received-claims")
async def list_received_claims(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List claims received for user's found items"""
    # Get found items owned by user
    found_item_ids = [item.id for item in current_user.found_items]
    
    if not found_item_ids:
        return []
    
    # Get matches where user owns the found item
    matches = db.query(Match).filter(Match.found_item_id.in_(found_item_ids)).all()
    match_ids = [m.id for m in matches]
    
    if not match_ids:
        return []
    
    claims = db.query(Claim).filter(Claim.match_id.in_(match_ids)).all()
    
    return [
        {
            "id": claim.id,
            "match_id": claim.match_id,
            "claimant_id": claim.claimant_id,
            "claimant_name": claim.claimant.full_name if claim.claimant else "",
            "verification_question": claim.verification_question,
            "verification_answer": claim.verification_answer,
            "status": claim.status.value,
            "created_at": claim.created_at.isoformat(),
            "match": {
                "id": claim.match.id,
                "lost_item": claim.match.lost_item.title if claim.match.lost_item else None,
                "found_item": claim.match.found_item.title if claim.match.found_item else None,
                "final_score": claim.match.final_score
            } if claim.match else None
        }
        for claim in claims
    ]


@router.patch("/{claim_id}/verify")
async def verify_claim(
    claim_id: int,
    verify_data: ClaimVerify,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    verification_answer = verify_data.verification_answer
    approve = verify_data.approve
    """Verify/approve or reject a claim (by found item owner)"""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    match = db.query(Match).filter(Match.id == claim.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    found_item = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")
    
    # Only found item owner can verify
    if found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the found item owner can verify claims")
    
    if claim.status != ClaimStatus.PENDING:
        raise HTTPException(status_code=400, detail="Claim already processed")
    
    claim.verification_answer = verification_answer
    
    if approve:
        claim.status = ClaimStatus.VERIFIED
        match.status = MatchStatus.CONFIRMED
        
        # Update item statuses
        lost_item = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
        found_item_db = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
        
        if lost_item:
            lost_item.status = ItemStatus.VERIFIED
        if found_item_db:
            found_item_db.status = ItemStatus.VERIFIED
        
        # Notify claimant
        notification = Notification(
            user_id=claim.claimant_id,
            type=NotificationType.CLAIM_APPROVED,
            message=f"Your claim for {lost_item.title if lost_item else 'the item'} has been approved!"
        )
        db.add(notification)
    else:
        claim.status = ClaimStatus.REJECTED
        match.status = MatchStatus.REJECTED
        
        # Notify claimant
        notification = Notification(
            user_id=claim.claimant_id,
            type=NotificationType.CLAIM_REJECTED,
            message=f"Your claim for {match.lost_item.title if match.lost_item else 'the item'} was rejected"
        )
        db.add(notification)
    
    db.commit()
    
    return {
        "id": claim.id,
        "status": claim.status.value,
        "match_status": match.status.value,
        "message": "Claim approved" if approve else "Claim rejected"
    }


@router.patch("/{claim_id}/return")
async def mark_returned(
    claim_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark item as returned (by found item owner after handover)"""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    match = db.query(Match).filter(Match.id == claim.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    found_item = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")
    
    if found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the found item owner can mark as returned")
    
    if claim.status != ClaimStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Claim must be verified first")
    
    claim.status = ClaimStatus.VERIFIED  # Keep as verified
    match.status = MatchStatus.CONFIRMED
    
    lost_item = db.query(LostItem).filter(LostItem.id == match.lost_item_id).first()
    found_item_db = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    
    if lost_item:
        lost_item.status = ItemStatus.RETURNED
    if found_item_db:
        found_item_db.status = ItemStatus.RETURNED
    
    # Notify both parties
    notification = Notification(
        user_id=claim.claimant_id,
        type=NotificationType.ITEM_RETURNED,
        message=f"Your item {lost_item.title if lost_item else 'the item'} has been returned!"
    )
    db.add(notification)
    
    db.commit()
    
    return {
        "message": "Item marked as returned",
        "match_status": match.status.value
    }