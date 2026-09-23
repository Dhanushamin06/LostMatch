from typing import Dict, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from app.models.item import LostItem, FoundItem, ItemStatus
from app.models.match import Match, MatchStatus
from app.ai.text_embedder import get_text_embedder
from app.ai.image_embedder import get_image_embedder
from app.retrieval.faiss_manager import get_faiss_manager
from app.ranking.matcher import (
    rank_candidates, merge_candidates, get_weights,
    RankedMatch, MatchScore
)
import logging

logger = logging.getLogger(__name__)


class MatchingService:
    def __init__(self, db: Session):
        self.db = db
        self.text_embedder = get_text_embedder()
        self.image_embedder = get_image_embedder()
        self.faiss = get_faiss_manager()
        self.weights = get_weights()
        self.top_k = 5

    def _filter_search_results(self, scores, ids, valid_ids):
        """Filter FAISS search results to only include valid IDs"""
        if scores is None or ids is None or ids.size == 0:
            return np.array([]).reshape(1, 0), np.array([]).reshape(1, 0)
        
        filtered_scores = []
        filtered_ids = []
        
        for i in range(ids.shape[0]):
            row_scores = []
            row_ids = []
            for j in range(ids.shape[1]):
                db_id = int(ids[i, j])
                if db_id in valid_ids:
                    row_scores.append(float(scores[i, j]))
                    row_ids.append(db_id)
            if row_ids:
                filtered_scores.append(row_scores)
                filtered_ids.append(row_ids)
        
        if not filtered_ids:
            return np.array([]).reshape(1, 0), np.array([]).reshape(1, 0)
        
        return np.array(filtered_scores), np.array(filtered_ids)

    def _get_text_for_embedding(self, item: LostItem | FoundItem) -> str:
        """Combine text fields for embedding"""
        parts = []
        if item.title:
            parts.append(item.title)
        if item.description:
            parts.append(item.description)
        if item.identifying_features:
            parts.append(item.identifying_features)
        if item.category:
            parts.append(item.category.value)
        if item.location:
            parts.append(item.location)
        return " ".join(parts)

    def _process_lost_item(self, item: LostItem) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Generate embeddings for a lost item"""
        text = self._get_text_for_embedding(item)
        text_emb = self.text_embedder.embed(text)
        
        image_emb = None
        if item.image_url:
            try:
                import os
                image_path = os.path.join("storage", item.image_url.lstrip("/"))
                if os.path.exists(image_path):
                    image_emb = self.image_embedder.embed(image_path)
            except Exception as e:
                logger.warning(f"Failed to embed image for lost item {item.id}: {e}")
        
        return text_emb, image_emb

    def _process_found_item(self, item: FoundItem) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Generate embeddings for a found item"""
        text = self._get_text_for_embedding(item)
        text_emb = self.text_embedder.embed(text)
        
        image_emb = None
        if item.image_url:
            try:
                import os
                image_path = os.path.join("storage", item.image_url.lstrip("/"))
                if os.path.exists(image_path):
                    image_emb = self.image_embedder.embed(image_path)
            except Exception as e:
                logger.warning(f"Failed to embed image for found item {item.id}: {e}")
        
        return text_emb, image_emb

    def _item_to_dict(self, item: LostItem | FoundItem, item_type: str) -> Dict:
        return {
            "id": item.id,
            "type": item_type,
            "title": item.title,
            "category": item.category.value if item.category else "",
            "description": item.description or "",
            "identifying_features": item.identifying_features or "",
            "location": item.location or "",
            "latitude": item.latitude,
            "longitude": item.longitude,
            "lost_date": item.lost_date if hasattr(item, 'lost_date') else None,
            "lost_time": item.lost_time if hasattr(item, 'lost_time') else None,
            "found_date": item.found_date if hasattr(item, 'found_date') else None,
            "found_time": item.found_time if hasattr(item, 'found_time') else None,
            "image_url": item.image_url,
            "status": item.status.value if item.status else ""
        }

    def index_lost_item(self, item: LostItem):
        """Add lost item to FAISS indices"""
        text_emb, image_emb = self._process_lost_item(item)
        
        # Add to text index
        self.faiss.add_text(text_emb.reshape(1, -1), [item.id])
        
        # Add to image index if available
        if image_emb is not None:
            self.faiss.add_image(image_emb.reshape(1, -1), [item.id])
        
        logger.info(f"Indexed lost item {item.id}")

    def index_found_item(self, item: FoundItem):
        """Add found item to FAISS indices"""
        text_emb, image_emb = self._process_found_item(item)
        
        # Add to text index
        self.faiss.add_text(text_emb.reshape(1, -1), [item.id])
        
        # Add to image index if available
        if image_emb is not None:
            self.faiss.add_image(image_emb.reshape(1, -1), [item.id])
        
        logger.info(f"Indexed found item {item.id}")

    def search_matches_for_lost(self, lost_item: LostItem) -> List[RankedMatch]:
        """Find matching found items for a lost item"""
        query_text, query_image = self._process_lost_item(lost_item)
        query_dict = self._item_to_dict(lost_item, "lost")
        
        # Search text index (found items)
        text_scores, text_ids = self.faiss.search_text(query_text.reshape(1, -1), self.top_k * 3)
        
        # Search image index (found items) if image available
        image_scores, image_ids = None, None
        if query_image is not None:
            image_scores, image_ids = self.faiss.search_image(query_image.reshape(1, -1), self.top_k * 3)
        
        # Get candidate found items from DB
        candidate_ids = set()
        if text_ids.size > 0:
            candidate_ids.update(int(x) for x in text_ids[0])
        if image_ids is not None and image_ids.size > 0:
            candidate_ids.update(int(x) for x in image_ids[0])
        
        candidate_ids = [cid for cid in candidate_ids if cid > 0]
        if not candidate_ids:
            return []
        
        # Only query for items that exist in DB
        found_items = self.db.query(FoundItem).filter(
            FoundItem.id.in_(candidate_ids),
            FoundItem.status.in_([ItemStatus.FOUND, ItemStatus.POTENTIAL_MATCH])
        ).all()
        
        # Filter candidate_ids to only those that exist in DB
        existing_ids = {item.id for item in found_items}
        candidate_ids = [cid for cid in candidate_ids if cid in existing_ids]
        if not candidate_ids:
            return []
        
        candidate_dict = {item.id: self._item_to_dict(item, "found") for item in found_items}
        
        # Filter search results to only include existing IDs
        existing_ids_set = set(existing_ids)
        filtered_text_scores, filtered_text_ids = self._filter_search_results(text_scores, text_ids, existing_ids_set)
        filtered_image_scores, filtered_image_ids = self._filter_search_results(image_scores, image_ids, existing_ids_set)
        
        # Merge candidates
        text_results = (filtered_text_scores, filtered_text_ids)
        image_results = (filtered_image_scores, filtered_image_ids)
        
        merged = merge_candidates(text_results, image_results, self.top_k)
        
        # Rank
        ranked = rank_candidates(
            merged, query_dict, candidate_dict,
            self.weights, self.top_k
        )
        
        return ranked

    def search_matches_for_found(self, found_item: FoundItem) -> List[RankedMatch]:
        """Find matching lost items for a found item"""
        query_text, query_image = self._process_found_item(found_item)
        query_dict = self._item_to_dict(found_item, "found")
        
        # Search text index (lost items)
        text_scores, text_ids = self.faiss.search_text(query_text.reshape(1, -1), self.top_k * 3)
        
        # Search image index (lost items) if image available
        image_scores, image_ids = None, None
        if query_image is not None:
            image_scores, image_ids = self.faiss.search_image(query_image.reshape(1, -1), self.top_k * 3)
        
        # Get candidate lost items from DB
        candidate_ids = set()
        if text_ids.size > 0:
            candidate_ids.update(int(x) for x in text_ids[0])
        if image_ids is not None and image_ids.size > 0:
            candidate_ids.update(int(x) for x in image_ids[0])
        
        candidate_ids = [cid for cid in candidate_ids if cid > 0]
        if not candidate_ids:
            return []
        
        # Only query for items that exist in DB
        lost_items = self.db.query(LostItem).filter(
            LostItem.id.in_(candidate_ids),
            LostItem.status.in_([ItemStatus.LOST, ItemStatus.POTENTIAL_MATCH])
        ).all()
        
        # Filter candidate_ids to only those that exist in DB
        existing_ids = {item.id for item in lost_items}
        candidate_ids = [cid for cid in candidate_ids if cid in existing_ids]
        if not candidate_ids:
            return []
        
        candidate_dict = {item.id: self._item_to_dict(item, "lost") for item in lost_items}
        
        # Filter search results to only include existing IDs
        existing_ids_set = set(existing_ids)
        filtered_text_scores, filtered_text_ids = self._filter_search_results(text_scores, text_ids, existing_ids_set)
        filtered_image_scores, filtered_image_ids = self._filter_search_results(image_scores, image_ids, existing_ids_set)
        
        # Merge candidates
        text_results = (filtered_text_scores, filtered_text_ids)
        image_results = (filtered_image_scores, filtered_image_ids)
        
        merged = merge_candidates(text_results, image_results, self.top_k)
        
        # Rank
        ranked = rank_candidates(
            merged, query_dict, candidate_dict,
            self.weights, self.top_k
        )
        
        return ranked

    def create_matches(self, item: LostItem | FoundItem, matches: List[RankedMatch]) -> List[Match]:
        """Create match records in database"""
        created_matches = []
        
        for match in matches:
            if item.__class__ == LostItem:
                lost_id, found_id = match.lost_item_id, match.found_item_id
            else:
                lost_id, found_id = match.found_item_id, match.lost_item_id
            
            # Check if match already exists
            existing = self.db.query(Match).filter(
                Match.lost_item_id == lost_id,
                Match.found_item_id == found_id
            ).first()
            
            if existing:
                # Update score if better
                if match.score.final_score > existing.final_score:
                    existing.image_score = float(match.score.image_score)
                    existing.text_score = float(match.score.text_score)
                    existing.location_score = float(match.score.location_score)
                    existing.time_score = float(match.score.time_score)
                    existing.final_score = float(match.score.final_score)
                    existing.status = MatchStatus.PENDING
                created_matches.append(existing)
            else:
                new_match = Match(
                    lost_item_id=lost_id,
                    found_item_id=found_id,
                    image_score=float(match.score.image_score),
                    text_score=float(match.score.text_score),
                    location_score=float(match.score.location_score),
                    time_score=float(match.score.time_score),
                    final_score=float(match.score.final_score),
                    status=MatchStatus.PENDING
                )
                self.db.add(new_match)
                created_matches.append(new_match)
                
                # Update item statuses
                lost = self.db.query(LostItem).filter(LostItem.id == lost_id).first()
                found = self.db.query(FoundItem).filter(FoundItem.id == found_id).first()
                
                if lost and lost.status == ItemStatus.LOST:
                    lost.status = ItemStatus.POTENTIAL_MATCH
                if found and found.status == ItemStatus.FOUND:
                    found.status = ItemStatus.POTENTIAL_MATCH
        
        self.db.commit()
        return created_matches

    def rebuild_all_indices(self):
        """Rebuild FAISS indices from database"""
        logger.info("Rebuilding FAISS indices from database...")
        
        # Get all lost items
        lost_items = self.db.query(LostItem).all()
        lost_text_vectors = {}
        lost_image_vectors = {}
        
        for item in lost_items:
            text_emb, image_emb = self._process_lost_item(item)
            lost_text_vectors[item.id] = text_emb
            if image_emb is not None:
                lost_image_vectors[item.id] = image_emb
        
        # Get all found items
        found_items = self.db.query(FoundItem).all()
        found_text_vectors = {}
        found_image_vectors = {}
        
        for item in found_items:
            text_emb, image_emb = self._process_found_item(item)
            found_text_vectors[item.id] = text_emb
            if image_emb is not None:
                found_image_vectors[item.id] = image_emb
        
        # Combine all text vectors
        all_text_vectors = {**lost_text_vectors, **found_text_vectors}
        all_image_vectors = {**lost_image_vectors, **found_image_vectors}
        
        # Rebuild indices
        self.faiss.rebuild_text(all_text_vectors)
        self.faiss.rebuild_image(all_image_vectors)
        
        logger.info("FAISS indices rebuilt successfully")


def get_matching_service(db: Session) -> MatchingService:
    return MatchingService(db)