from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.auth import (
    UserResponse, Token, LoginRequest, RegisterRequest, 
    RefreshTokenRequest, UserUpdate, UserChangePassword
)
from app.services.auth_service import (
    authenticate_user, register_user, get_user_by_id,
    update_user, change_password, refresh_access_token
)
from app.core.security import create_token_pair
from app.core.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Create user in database
    user = register_user(db, user_data)
    
    # 2. Generate token pair directly
    tokens = create_token_pair(user.id, user.email, user.role.value)
    return tokens


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = create_token_pair(user.id, user.email, user.role.value)
    return tokens


@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest):
    tokens = refresh_access_token(request.refresh_token)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    return tokens


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user = update_user(db, current_user.id, user_data)
    return user


@router.patch("/password")
def change_user_password(
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    change_password(db, current_user.id, password_data)
    return {"message": "Password changed successfully"}


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}