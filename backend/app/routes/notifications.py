from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_notifications():
    return {"message": "List notifications endpoint - to be implemented"}


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: int):
    return {"message": f"Mark notification {notification_id} as read - to be implemented"}