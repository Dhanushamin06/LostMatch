from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import numpy as np
from datetime import date, time, datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class MatchScore:
    image_score: float = 0.0
    text_score: float = 0.0
    location_score: float = 0.0
    time_score: float = 0.0
    final_score: float = 0.0
    same_category: bool = False
    category_match: bool = False


@dataclass
class RankedMatch:
    lost_item_id: int
    found_item_id: int
    score: MatchScore
    explanation: List[str]


class RankingWeights:
    def __init__(
        self,
        image_weight: float = 0.40,
        text_weight: float = 0.30,
        location_weight: float = 0.20,
        time_weight: float = 0.10
    ):
        self.image_weight = image_weight
        self.text_weight = text_weight
        self.location_weight = location_weight
        self.time_weight = time_weight
        
        total = image_weight + text_weight + location_weight + time_weight
        if abs(total - 1.0) > 0.001:
            logger.warning(f"Weights sum to {total}, normalizing to 1.0")
            self.image_weight /= total
            self.text_weight /= total
            self.location_weight /= total
            self.time_weight /= total


def calculate_location_similarity(
    loc1: str, loc2: str,
    lat1: Optional[float] = None, lon1: Optional[float] = None,
    lat2: Optional[float] = None, lon2: Optional[float] = None
) -> float:
    """Calculate location similarity between two locations"""
    
    # If coordinates available, use Haversine distance
    if all(v is not None for v in [lat1, lon1, lat2, lon2]):
        return _haversine_similarity(lat1, lon1, lat2, lon2)
    
    # Fallback: string similarity
    return _string_similarity(loc1.lower(), loc2.lower())


def _haversine_similarity(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate similarity based on geographic distance"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    # Convert distance to similarity (1km = 0.9, 10km = 0.5, 50km = 0.1)
    if distance <= 1:
        return 1.0
    elif distance <= 5:
        return 0.9
    elif distance <= 10:
        return 0.7
    elif distance <= 25:
        return 0.5
    elif distance <= 50:
        return 0.3
    else:
        return 0.1


def _string_similarity(s1: str, s2: str) -> float:
    """Simple string similarity using word overlap"""
    if not s1 or not s2:
        return 0.0
    
    words1 = set(s1.split())
    words2 = set(s2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union) if union else 0.0


def calculate_time_similarity(
    date1: date, time1: Optional[time],
    date2: date, time2: Optional[time]
) -> float:
    """Calculate time similarity between two dates/times"""
    
    # Date difference in days
    date_diff = abs((date1 - date2).days)
    
    # Base score from date difference
    if date_diff == 0:
        date_score = 1.0
    elif date_diff == 1:
        date_score = 0.9
    elif date_diff <= 3:
        date_score = 0.7
    elif date_diff <= 7:
        date_score = 0.5
    elif date_diff <= 30:
        date_score = 0.3
    else:
        date_score = 0.1
    
    # Time difference bonus (if both have times)
    if time1 and time2:
        from datetime import datetime, timedelta
        dt1 = datetime.combine(date.today(), time1)
        dt2 = datetime.combine(date.today(), time2)
        time_diff = abs((dt1 - dt2).total_seconds()) / 3600  # hours
        
        if time_diff <= 1:
            time_bonus = 0.1
        elif time_diff <= 3:
            time_bonus = 0.05
        else:
            time_bonus = 0.0
        
        date_score = min(1.0, date_score + time_bonus)
    
    return date_score


def calculate_category_match(cat1: str, cat2: str) -> bool:
    """Check if categories match"""
    return cat1.lower() == cat2.lower()


def compute_match_score(
    image_sim: float,
    text_sim: float,
    location_sim: float,
    time_sim: float,
    weights: RankingWeights,
    same_category: bool
) -> MatchScore:
    """Compute weighted match score"""
    
    # Category compatibility constraint
    if not same_category:
        # Reduce scores if categories don't match
        image_sim *= 0.5
        text_sim *= 0.5
        location_sim *= 0.7
        time_sim *= 0.7
    
    final = (
        image_sim * weights.image_weight +
        text_sim * weights.text_weight +
        location_sim * weights.location_weight +
        time_sim * weights.time_weight
    )
    
    return MatchScore(
        image_score=round(image_sim, 4),
        text_score=round(text_sim, 4),
        location_score=round(location_sim, 4),
        time_score=round(time_sim, 4),
        final_score=round(final, 4),
        same_category=same_category,
        category_match=same_category
    )


def get_explanation(score: MatchScore, weights: RankingWeights) -> List[str]:
    """Generate human-readable explanation"""
    explanations = []
    
    if score.same_category:
        explanations.append("✓ Same category")
    else:
        explanations.append("✗ Different category")
    
    if score.image_score >= 0.8:
        explanations.append(f"✓ Visually very similar ({score.image_score:.0%})")
    elif score.image_score >= 0.6:
        explanations.append(f"✓ Visually similar ({score.image_score:.0%})")
    elif score.image_score > 0:
        explanations.append(f"~ Somewhat visually similar ({score.image_score:.0%})")
    
    if score.text_score >= 0.8:
        explanations.append(f"✓ Description matches closely ({score.text_score:.0%})")
    elif score.text_score >= 0.6:
        explanations.append(f"✓ Description somewhat matches ({score.text_score:.0%})")
    elif score.text_score > 0:
        explanations.append(f"~ Description partially matches ({score.text_score:.0%})")
    
    if score.location_score >= 0.8:
        explanations.append(f"✓ Nearby location ({score.location_score:.0%})")
    elif score.location_score >= 0.5:
        explanations.append(f"✓ Similar area ({score.location_score:.0%})")
    elif score.location_score > 0:
        explanations.append(f"~ Somewhat nearby ({score.location_score:.0%})")
    
    if score.time_score >= 0.8:
        explanations.append(f"✓ Close date/time ({score.time_score:.0%})")
    elif score.time_score >= 0.5:
        explanations.append(f"✓ Similar timeframe ({score.time_score:.0%})")
    elif score.time_score > 0:
        explanations.append(f"~ Within reasonable time ({score.time_score:.0%})")
    
    return explanations


def merge_candidates(
    text_results: Tuple[np.ndarray, np.ndarray],  # (scores, db_ids)
    image_results: Tuple[np.ndarray, np.ndarray],
    k: int
) -> Dict[int, Tuple[float, float]]:  # db_id -> (text_score, image_score)
    """Merge candidates from text and image search"""
    
    text_scores, text_ids = text_results
    image_scores, image_ids = image_results
    
    merged: Dict[int, Tuple[float, float]] = {}
    
    # Add text results
    for i in range(text_ids.shape[0]):
        for j in range(text_ids.shape[1]):
            db_id = text_ids[i, j]
            score = text_scores[i, j]
            if db_id > 0 and score > 0:
                if db_id not in merged or score > merged[db_id][0]:
                    merged[db_id] = (score, merged.get(db_id, (0, 0))[1])
    
    # Add image results
    for i in range(image_ids.shape[0]):
        for j in range(image_ids.shape[1]):
            db_id = image_ids[i, j]
            score = image_scores[i, j]
            if db_id > 0 and score > 0:
                if db_id not in merged:
                    merged[db_id] = (0, score)
                else:
                    merged[db_id] = (merged[db_id][0], score)
    
    return merged


def rank_candidates(
    candidates: Dict[int, Tuple[float, float]],
    query_item: Dict,
    candidate_items: Dict[int, Dict],
    weights: RankingWeights,
    top_k: int
) -> List[RankedMatch]:
    """Rank merged candidates with full scoring"""
    
    ranked = []
    
    for db_id, (text_sim, image_sim) in candidates.items():
        if db_id not in candidate_items:
            continue
        
        candidate = candidate_items[db_id]
        
        same_cat = calculate_category_match(
            query_item.get("category", ""),
            candidate.get("category", "")
        )
        
        location_sim = calculate_location_similarity(
            query_item.get("location", ""),
            candidate.get("location", ""),
            query_item.get("latitude"),
            query_item.get("longitude"),
            candidate.get("latitude"),
            candidate.get("longitude")
        )
        
        time_sim = calculate_time_similarity(
            query_item.get("lost_date") or query_item.get("found_date"),
            query_item.get("lost_time") or query_item.get("found_time"),
            candidate.get("lost_date") or candidate.get("found_date"),
            candidate.get("lost_time") or candidate.get("found_time")
        )
        
        score = compute_match_score(
            image_sim=image_sim,
            text_sim=text_sim,
            location_sim=location_sim,
            time_sim=time_sim,
            weights=weights,
            same_category=same_cat
        )
        
        if score.final_score > 0.1:  # Minimum threshold
            explanation = get_explanation(score, weights)
            ranked.append(RankedMatch(
                lost_item_id=query_item["id"] if query_item.get("type") == "lost" else candidate["id"],
                found_item_id=candidate["id"] if query_item.get("type") == "lost" else query_item["id"],
                score=score,
                explanation=explanation
            ))
    
    # Sort by final score descending
    ranked.sort(key=lambda x: x.score.final_score, reverse=True)
    
    return ranked[:top_k]


def get_weights() -> RankingWeights:
    from app.core.config import settings
    return RankingWeights(
        image_weight=settings.IMAGE_WEIGHT,
        text_weight=settings.TEXT_WEIGHT,
        location_weight=settings.LOCATION_WEIGHT,
        time_weight=settings.TIME_WEIGHT
    )