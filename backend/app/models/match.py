from sqlalchemy import Column, Integer, String, DateTime, Float, Enum as SQLEnum, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base
import enum


class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    lost_item_id = Column(Integer, ForeignKey("lost_items.id"), nullable=False)
    found_item_id = Column(Integer, ForeignKey("found_items.id"), nullable=False)
    image_score = Column(Float, default=0.0)
    text_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    time_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lost_item = relationship("LostItem", back_populates="matches", foreign_keys=[lost_item_id])
    found_item = relationship("FoundItem", back_populates="matches", foreign_keys=[found_item_id])
    claims = relationship("Claim", back_populates="match")


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    claimant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verification_question = Column(Text, nullable=False)
    verification_answer = Column(Text, nullable=True)
    status = Column(SQLEnum(ClaimStatus), default=ClaimStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    match = relationship("Match", back_populates="claims")
    claimant = relationship("User")


class NotificationType(str, enum.Enum):
    MATCH_FOUND = "match_found"
    CLAIM_SUBMITTED = "claim_submitted"
    CLAIM_APPROVED = "claim_approved"
    CLAIM_REJECTED = "claim_rejected"
    ITEM_RETURNED = "item_returned"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")


Index("idx_matches_lost_item", Match.lost_item_id)
Index("idx_matches_found_item", Match.found_item_id)
Index("idx_claims_match", Claim.match_id)
Index("idx_notifications_user", Notification.user_id)