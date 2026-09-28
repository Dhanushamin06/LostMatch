import os
import uuid
from datetime import date, time
from typing import Optional
from sqlalchemy import or_
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.item import LostItem, FoundItem, ItemCategory, ItemStatus
from app.models.match import Match, Claim
from app.models.notification import Notification
from app.schemas.auth import UserResponse
from app.services.auth_service import get_user_by_id
from app.services.matching_service import get_matching_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "images", "lost")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def trigger_matching(lost_item_id: int):
    """Background task to find matches for a lost item"""
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        matching_service = get_matching_service(db)
        lost_item = db.query(LostItem).filter(LostItem.id == lost_item_id).first()
        if lost_item:
            matches = matching_service.search_matches_for_lost(lost_item)
            if matches:
                matching_service.create_matches(lost_item, matches)
                logger.info(f"Created {len(matches)} matches for lost item {lost_item_id}")
    except Exception as e:
        logger.error(f"Matching failed for lost item {lost_item_id}: {e}")
    finally:
        db.close()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lost_item(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    category: ItemCategory = Form(...),
    description: str = Form(...),
    identifying_features: str = Form(""),
    location: str = Form(...),
    lost_date: date = Form(...),
    lost_time: Optional[time] = Form(None),
    contact_name: Optional[str] = Form(None),
    contact_phone: Optional[str] = Form(None),
    contact_email: Optional[str] = Form(None),
    additional_details: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    image_url = None
    if image and image.filename:
        allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format. Only JPEG, PNG, WebP allowed."
            )
        
        content = await image.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image must be less than 5MB"
            )
        
        ext = os.path.splitext(image.filename)[1].lower()
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        image_url = f"/storage/images/lost/{filename}"

    resolved_contact_name = contact_name or current_user.full_name
    resolved_contact_phone = contact_phone or current_user.phone_number
    resolved_contact_email = contact_email or current_user.email

    lost_item = LostItem(
        user_id=current_user.id,
        title=title,
        category=category,
        description=description,
        identifying_features=identifying_features,
        image_url=image_url,
        location=location,
        lost_date=lost_date,
        lost_time=lost_time,
        contact_name=resolved_contact_name,
        contact_phone=resolved_contact_phone,
        contact_email=resolved_contact_email,
        additional_details=additional_details,
        status=ItemStatus.LOST
    )
    
    db.add(lost_item)
    db.commit()
    db.refresh(lost_item)
    
    # Index in FAISS
    matching_service = get_matching_service(db)
    matching_service.index_lost_item(lost_item)
    
    # Trigger background matching
    background_tasks.add_task(trigger_matching, lost_item.id)
    
    return {
        "id": lost_item.id,
        "title": lost_item.title,
        "category": lost_item.category.value,
        "description": lost_item.description,
        "identifying_features": lost_item.identifying_features,
        "image_url": lost_item.image_url,
        "location": lost_item.location,
        "lost_date": lost_item.lost_date.isoformat(),
        "lost_time": lost_item.lost_time.isoformat() if lost_item.lost_time else None,
        "contact_name": lost_item.contact_name,
        "contact_phone": lost_item.contact_phone,
        "contact_email": lost_item.contact_email,
        "additional_details": lost_item.additional_details,
        "status": lost_item.status.value,
        "created_at": lost_item.created_at.isoformat()
    }


@router.get("")
async def list_lost_items(
    skip: int = 0,
    limit: int = 20,
    category: Optional[ItemCategory] = None,
    location: Optional[str] = None,
    status: Optional[ItemStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(LostItem).filter(LostItem.user_id == current_user.id)
    
    if category:
        query = query.filter(LostItem.category == category)
    if location:
        query = query.filter(LostItem.location.ilike(f"%{location}%"))
    if status:
        query = query.filter(LostItem.status == status)
    
    items = query.order_by(LostItem.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category.value,
            "description": item.description,
            "identifying_features": item.identifying_features,
            "image_url": item.image_url,
            "location": item.location,
            "lost_date": item.lost_date.isoformat(),
            "lost_time": item.lost_time.isoformat() if item.lost_time else None,
            "contact_name": item.contact_name,
            "contact_phone": item.contact_phone,
            "contact_email": item.contact_email,
            "additional_details": item.additional_details,
            "status": item.status.value,
            "created_at": item.created_at.isoformat()
        }
        for item in items
    ]


@router.get("/{item_id}")
async def get_lost_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    item = db.query(LostItem).filter(LostItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lost item not found"
        )
    
    # Allow access if user is the owner OR part of a match involving this item
    if item.user_id != current_user.id:
        # Check if user has a match with this item
        match = db.query(Match).filter(
            Match.lost_item_id == item_id,
            Match.found_item_id.in_(
                db.query(FoundItem.id).filter(FoundItem.user_id == current_user.id)
            )
        ).first()
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this item"
            )
    
    return {
        "id": item.id,
        "title": item.title,
        "category": item.category.value,
        "description": item.description,
        "identifying_features": item.identifying_features,
        "image_url": item.image_url,
        "location": item.location,
        "lost_date": item.lost_date.isoformat(),
        "lost_time": item.lost_time.isoformat() if item.lost_time else None,
        "contact_name": item.contact_name or (item.user.full_name if item.user else None),
        "contact_phone": item.contact_phone or (item.user.phone_number if item.user else None),
        "contact_email": item.contact_email or (item.user.email if item.user else None),
        "additional_details": item.additional_details,
        "status": item.status.value,
        "created_at": item.created_at.isoformat(),
        "user_id": item.user_id,
        "user_name": item.user.full_name if item.user else None,
        "user_email": item.user.email if item.user else None,
        "user_phone": item.user.phone_number if item.user else None,
    }


@router.post("/{item_id}/rematch")
async def rematch_lost_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually trigger re-matching for a lost item"""
    item = db.query(LostItem).filter(LostItem.id == item_id, LostItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    matching_service = get_matching_service(db)
    matches = matching_service.search_matches_for_lost(item)
    created = matching_service.create_matches(item, matches)
    
    return {
        "message": f"Found {len(matches)} potential matches",
        "matches": len(created)
    }


@router.delete("/{item_id}")
async def delete_lost_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a lost item and all related data"""
    item = db.query(LostItem).filter(LostItem.id == item_id, LostItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete related matches (cascade will handle claims, notifications)
    matches = db.query(Match).filter(Match.lost_item_id == item_id).all()
    for match in matches:
        # Delete claims for this match
        db.query(Claim).filter(Claim.match_id == match.id).delete()
        # Delete notifications for this match
        db.query(Notification).filter(
            or_(
                Notification.message.contains(str(match.id)),
                Notification.message.contains(item.title)
            )
        ).delete(synchronize_session=False)
        db.delete(match)
    
    # Delete notifications for this item
    db.query(Notification).filter(
        Notification.message.contains(item.title)
    ).delete(synchronize_session=False)
    
    # Remove from FAISS index
    matching_service = get_matching_service(db)
    try:
        matching_service.remove_from_index(item.id, "lost")
    except:
        pass
    
    db.delete(item)
    db.commit()
    
    return {"message": "Item deleted successfully"}