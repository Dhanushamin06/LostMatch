from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.auth_service import update_user, change_password
from app.schemas.auth import UserUpdate, UserChangePassword, UserResponse

router = APIRouter(tags=["profile"])


@router.get("", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return current_user


@router.patch("", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    user = update_user(db, current_user.id, user_data)
    return user


@router.patch("/password")
async def change_password_endpoint(
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user password"""
    change_password(db, current_user.id, password_data)
    return {"message": "Password changed successfully"}


@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user statistics"""
    from app.models.item import LostItem, FoundItem, ItemStatus
    from app.models.match import Match, MatchStatus
    from app.models.notification import Notification
    
    lost_count = db.query(LostItem).filter(LostItem.user_id == current_user.id).count()
    found_count = db.query(FoundItem).filter(FoundItem.user_id == current_user.id).count()
    
    # Items with matches
    lost_matched = db.query(LostItem).filter(
        LostItem.user_id == current_user.id,
        LostItem.status.in_([ItemStatus.POTENTIAL_MATCH, ItemStatus.CLAIM_PENDING, ItemStatus.VERIFIED, ItemStatus.RETURNED])
    ).count()
    
    found_matched = db.query(FoundItem).filter(
        FoundItem.user_id == current_user.id,
        FoundItem.status.in_([ItemStatus.POTENTIAL_MATCH, ItemStatus.CLAIM_PENDING, ItemStatus.VERIFIED, ItemStatus.RETURNED])
    ).count()
    
    # Successful returns
    successful_returns = db.query(LostItem).filter(
        LostItem.user_id == current_user.id,
        LostItem.status == ItemStatus.RETURNED
    ).count()
    
    # Pending claims
    from app.models.match import Claim, ClaimStatus
    pending_claims = db.query(Claim).filter(
        Claim.claimant_id == current_user.id,
        Claim.status == ClaimStatus.PENDING
    ).count()
    
    # Unread notifications
    from app.models.notification import Notification
    unread_notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {
        "lost_items": lost_count,
        "found_items": found_count,
        "lost_matched": lost_matched,
        "found_matched": found_matched,
        "successful_returns": successful_returns,
        "pending_claims": pending_claims,
        "unread_notifications": unread_notifications
    }