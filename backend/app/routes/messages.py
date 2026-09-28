from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from pydantic import BaseModel
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.match import Match, MatchStatus
from app.models.item import LostItem, FoundItem
from app.models.message import Message
from app.models.notification import Notification, NotificationType


class MessageCreate(BaseModel):
    content: str

router = APIRouter(tags=["messages"])


@router.get("/match/{match_id}")
async def get_messages(
    match_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get messages for a match"""
    match = db.query(Match).options(
        joinedload(Match.lost_item).joinedload(LostItem.user),
        joinedload(Match.found_item).joinedload(FoundItem.user)
    ).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if user is part of this match
    lost_item = match.lost_item
    found_item = match.found_item
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    if lost_item.user_id != current_user.id and found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")
    
    messages = db.query(Message).filter(
        Message.match_id == match_id
    ).order_by(desc(Message.created_at)).offset(skip).limit(limit).all()
    
    return [
        {
            "id": m.id,
            "match_id": m.match_id,
            "sender_id": m.sender_id,
            "sender_name": m.sender.full_name,
            "content": m.content,
            "is_read": bool(m.is_read),
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]


@router.post("/match/{match_id}")
async def send_message(
    match_id: int,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message in a match"""
    match = db.query(Match).options(
        joinedload(Match.lost_item).joinedload(LostItem.user),
        joinedload(Match.found_item).joinedload(FoundItem.user)
    ).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if user is part of this match
    lost_item = match.lost_item
    found_item = match.found_item
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    if lost_item.user_id != current_user.id and found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to message in this match")
    
    message = Message(
        match_id=match_id,
        sender_id=current_user.id,
        content=message_data.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Determine recipient
    recipient_id = found_item.user_id if lost_item.user_id == current_user.id else lost_item.user_id
    
    # Create notification for recipient
    notification = Notification(
        user_id=recipient_id,
        type=NotificationType.CLAIM_SUBMITTED,  # Reuse existing type
        message=f"New message from {current_user.full_name}: {message_data.content[:50]}..."
    )
    db.add(notification)
    db.commit()
    
    return {
        "id": message.id,
        "match_id": message.match_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.full_name,
        "content": message.content,
        "is_read": bool(message.is_read),
        "created_at": message.created_at.isoformat()
    }


@router.patch("/{message_id}/read")
async def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    message = db.query(Message).filter(
        Message.id == message_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is part of this match
    match = db.query(Match).options(
        joinedload(Match.lost_item).joinedload(LostItem.user),
        joinedload(Match.found_item).joinedload(FoundItem.user)
    ).filter(Match.id == message.match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    lost_item = match.lost_item
    found_item = match.found_item
    
    if not lost_item or not found_item:
        raise HTTPException(status_code=404, detail="Match items not found")
    
    if lost_item.user_id != current_user.id and found_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    message.is_read = 1
    db.commit()
    
    return {"message": "Message marked as read"}


@router.get("/unread-count")
async def get_unread_message_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of unread messages for current user"""
    # Get all matches where user is involved
    lost_item_ids = [item.id for item in current_user.lost_items]
    found_item_ids = [item.id for item in current_user.found_items]
    
    matches = db.query(Message).join(Message.match).filter(
        (Match.lost_item_id.in_(lost_item_ids)) | (Match.found_item_id.in_(found_item_ids)),
        Message.sender_id != current_user.id,
        Message.is_read == 0
    ).count()
    
    return {"unread_count": matches}