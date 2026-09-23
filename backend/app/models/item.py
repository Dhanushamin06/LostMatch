from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time, Float, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base
import enum


class ItemCategory(str, enum.Enum):
    ELECTRONICS = "electronics"
    BAGS = "bags"
    WALLETS = "wallets"
    ID_CARDS = "id_cards"
    KEYS = "keys"
    BOOKS = "books"
    CLOTHING = "clothing"
    ACCESSORIES = "accessories"
    DOCUMENTS = "documents"
    OTHER = "other"


class ItemStatus(str, enum.Enum):
    LOST = "lost"
    FOUND = "found"
    POTENTIAL_MATCH = "potential_match"
    CLAIM_PENDING = "claim_pending"
    VERIFIED = "verified"
    RETURNED = "returned"
    CLOSED = "closed"


class LostItem(Base):
    __tablename__ = "lost_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(SQLEnum(ItemCategory), nullable=False)
    description = Column(Text, nullable=False)
    identifying_features = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    lost_date = Column(Date, nullable=False)
    lost_time = Column(Time, nullable=True)
    status = Column(SQLEnum(ItemStatus), default=ItemStatus.LOST, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    matches = relationship("Match", back_populates="lost_item", foreign_keys="Match.lost_item_id")


class FoundItem(Base):
    __tablename__ = "found_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(SQLEnum(ItemCategory), nullable=False)
    description = Column(Text, nullable=False)
    identifying_features = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    found_date = Column(Date, nullable=False)
    found_time = Column(Time, nullable=True)
    status = Column(SQLEnum(ItemStatus), default=ItemStatus.FOUND, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    matches = relationship("Match", back_populates="found_item", foreign_keys="Match.found_item_id")


Index("idx_lost_items_category", LostItem.category)
Index("idx_lost_items_location", LostItem.location)
Index("idx_lost_items_status", LostItem.status)
Index("idx_found_items_category", FoundItem.category)
Index("idx_found_items_location", FoundItem.location)
Index("idx_found_items_status", FoundItem.status)