import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.database.session import Base, engine
from app.routes import auth, lost_items, found_items, matches, claims, notifications, admin, health, profile, messages


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created/verified")
    except Exception as e:
        print(f"Database connection warning: {e}")
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Multimodal Lost & Found Retrieval System",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(lost_items.router, prefix="/lost-items", tags=["lost-items"])
app.include_router(found_items.router, prefix="/found-items", tags=["found-items"])
app.include_router(matches.router, prefix="/matches", tags=["matches"])
app.include_router(claims.router, prefix="/claims", tags=["claims"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])

# Serve uploaded images as static files
# Project root storage directory: e:\IRA-PBL\storage
_storage_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage"))
os.makedirs(os.path.join(_storage_path, "images", "lost"), exist_ok=True)
os.makedirs(os.path.join(_storage_path, "images", "found"), exist_ok=True)
app.mount("/storage", StaticFiles(directory=_storage_path), name="storage")


@app.get("/")
async def root():
    return {"message": "Welcome to LostMatch API", "version": "1.0.0"}