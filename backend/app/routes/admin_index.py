from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.services.matching_service import get_matching_service

router = APIRouter(prefix="/index", tags=["admin-index"])


@router.post("/rebuild")
async def rebuild_indices(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Rebuild all FAISS indices from database"""
    matching_service = get_matching_service(db)
    
    try:
        matching_service.rebuild_all_indices()
        return {"message": "Indices rebuilt successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rebuild indices: {str(e)}"
        )


@router.get("/stats")
async def index_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get FAISS index statistics"""
    from app.retrieval.faiss_manager import get_faiss_manager
    
    faiss = get_faiss_manager()
    faiss.load()
    
    return {
        "text_index": {
            "total_vectors": len(faiss.text_index),
            "dimension": faiss.text_index.dimension
        },
        "image_index": {
            "total_vectors": len(faiss.image_index),
            "dimension": faiss.image_index.dimension
        }
    }