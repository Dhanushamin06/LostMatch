import os
import uuid
from datetime import date, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.item import LostItem, ItemCategory, ItemStatus
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
    item = db.query(LostItem).filter(LostItem.id == item_id, LostItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lost item not found"
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
        "status": item.status.value,
        "created_at": item.created_at.isoformat()
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