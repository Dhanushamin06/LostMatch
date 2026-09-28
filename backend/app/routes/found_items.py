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
from app.models.item import FoundItem, LostItem, ItemCategory, ItemStatus
from app.models.match import Match, Claim
from app.models.notification import Notification
from app.services.matching_service import get_matching_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "images", "found")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def trigger_matching_found(found_item_id: int):
    """Background task to find matches for a found item"""
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        matching_service = get_matching_service(db)
        found_item = db.query(FoundItem).filter(FoundItem.id == found_item_id).first()
        if found_item:
            matches = matching_service.search_matches_for_found(found_item)
            if matches:
                matching_service.create_matches(found_item, matches)
                logger.info(f"Created {len(matches)} matches for found item {found_item_id}")
    except Exception as e:
        logger.error(f"Matching failed for found item {found_item_id}: {e}")
    finally:
        db.close()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_found_item(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    category: ItemCategory = Form(...),
    description: str = Form(...),
    identifying_features: str = Form(""),
    location: str = Form(...),
    found_date: date = Form(...),
    found_time: Optional[time] = Form(None),
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
        
        image_url = f"/storage/images/found/{filename}"

    resolved_contact_name = contact_name or current_user.full_name
    resolved_contact_phone = contact_phone or current_user.phone_number
    resolved_contact_email = contact_email or current_user.email

    found_item = FoundItem(
        user_id=current_user.id,
        title=title,
        category=category,
        description=description,
        identifying_features=identifying_features,
        image_url=image_url,
        location=location,
        found_date=found_date,
        found_time=found_time,
        contact_name=resolved_contact_name,
        contact_phone=resolved_contact_phone,
        contact_email=resolved_contact_email,
        additional_details=additional_details,
        status=ItemStatus.FOUND
    )
    
    db.add(found_item)
    db.commit()
    db.refresh(found_item)
    
    # Index in FAISS
    matching_service = get_matching_service(db)
    matching_service.index_found_item(found_item)
    
    # Trigger background matching
    background_tasks.add_task(trigger_matching_found, found_item.id)
    
    return {
        "id": found_item.id,
        "title": found_item.title,
        "category": found_item.category.value,
        "description": found_item.description,
        "identifying_features": found_item.identifying_features,
        "image_url": found_item.image_url,
        "location": found_item.location,
        "found_date": found_item.found_date.isoformat(),
        "found_time": found_item.found_time.isoformat() if found_item.found_time else None,
        "contact_name": found_item.contact_name,
        "contact_phone": found_item.contact_phone,
        "contact_email": found_item.contact_email,
        "additional_details": found_item.additional_details,
        "status": found_item.status.value,
        "created_at": found_item.created_at.isoformat()
    }


@router.get("")
async def list_found_items(
    skip: int = 0,
    limit: int = 20,
    category: Optional[ItemCategory] = None,
    location: Optional[str] = None,
    status: Optional[ItemStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(FoundItem).filter(FoundItem.user_id == current_user.id)
    
    if category:
        query = query.filter(FoundItem.category == category)
    if location:
        query = query.filter(FoundItem.location.ilike(f"%{location}%"))
    if status:
        query = query.filter(FoundItem.status == status)
    
    items = query.order_by(FoundItem.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": item.id,
            "title": item.title,
            "category": item.category.value,
            "description": item.description,
            "identifying_features": item.identifying_features,
            "image_url": item.image_url,
            "location": item.location,
            "found_date": item.found_date.isoformat(),
            "found_time": item.found_time.isoformat() if item.found_time else None,
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
async def get_found_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    item = db.query(FoundItem).filter(FoundItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Found item not found"
        )
    
    # Allow access if user is the owner OR part of a match involving this item
    if item.user_id != current_user.id:
        # Check if user has a match with this item
        match = db.query(Match).filter(
            Match.found_item_id == item_id,
            Match.lost_item_id.in_(
                db.query(LostItem.id).filter(LostItem.user_id == current_user.id)
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
        "found_date": item.found_date.isoformat(),
        "found_time": item.found_time.isoformat() if item.found_time else None,
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
async def rematch_found_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually trigger re-matching for a found item"""
    item = db.query(FoundItem).filter(FoundItem.id == item_id, FoundItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    matching_service = get_matching_service(db)
    matches = matching_service.search_matches_for_found(item)
    created = matching_service.create_matches(item, matches)
    
    return {
        "message": f"Found {len(matches)} potential matches",
        "matches": len(created)
    }


@router.delete("/{item_id}")
async def delete_found_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a found item and all related data"""
    item = db.query(FoundItem).filter(FoundItem.id == item_id, FoundItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete related matches
    matches = db.query(Match).filter(Match.found_item_id == item_id).all()
    for match in matches:
        db.query(Claim).filter(Claim.match_id == match.id).delete()
        db.query(Notification).filter(
            or_(
                Notification.message.contains(str(match.id)),
                Notification.message.contains(item.title)
            )
        ).delete(synchronize_session=False)
        db.delete(match)
    
    db.query(Notification).filter(
        Notification.message.contains(item.title)
    ).delete(synchronize_session=False)
    
    matching_service = get_matching_service(db)
    try:
        matching_service.remove_from_index(item.id, "found")
    except:
        pass
    
    db.delete(item)
    db.commit()
    
    return {"message": "Item deleted successfully"}