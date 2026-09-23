import faiss
import numpy as np
import json
import os
import pickle
from typing import List, Tuple, Dict, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class FAISSManager:
    def __init__(self, index_path: str, dimension: int, index_type: str = "flat"):
        self.index_path = Path(index_path)
        self.dimension = dimension
        self.index_type = index_type
        self.index = None
        self.id_mapping: Dict[int, int] = {}  # faiss_id -> db_id
        self.reverse_mapping: Dict[int, int] = {}  # db_id -> faiss_id
        self.next_faiss_id = 0

    def _create_index(self):
        if self.index_type == "flat":
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner product for normalized vectors
        elif self.index_type == "ivf":
            nlist = min(100, max(1, self.next_faiss_id // 10))
            quantizer = faiss.IndexFlatIP(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist, faiss.METRIC_INNER_PRODUCT)
        else:
            raise ValueError(f"Unknown index type: {self.index_type}")

    def load(self):
        index_file = self.index_path / "index.faiss"
        mapping_file = self.index_path / "id_mapping.json"
        
        if index_file.exists() and mapping_file.exists():
            logger.info(f"Loading FAISS index from {self.index_path}")
            self.index = faiss.read_index(str(index_file))
            
            with open(mapping_file, "r") as f:
                data = json.load(f)
                self.id_mapping = {int(k): v for k, v in data["id_mapping"].items()}
                self.reverse_mapping = {int(k): v for k, v in data["reverse_mapping"].items()}
                self.next_faiss_id = data["next_faiss_id"]
        else:
            logger.info("Creating new FAISS index")
            self._create_index()
            self.save()

    def save(self):
        self.index_path.mkdir(parents=True, exist_ok=True)
        index_file = self.index_path / "index.faiss"
        mapping_file = self.index_path / "id_mapping.json"
        
        faiss.write_index(self.index, str(index_file))
        
        data = {
            "id_mapping": {str(k): v for k, v in self.id_mapping.items()},
            "reverse_mapping": {str(k): v for k, v in self.reverse_mapping.items()},
            "next_faiss_id": self.next_faiss_id
        }
        with open(mapping_file, "w") as f:
            json.dump(data, f)
        
        logger.info(f"Saved FAISS index to {self.index_path}")

    def add(self, vectors: np.ndarray, db_ids: List[int]) -> List[int]:
        if self.index is None:
            self.load()
        
        if self.index_type == "ivf" and not self.index.is_trained:
            logger.info("Training IVF index...")
            self.index.train(vectors)
        
        faiss_ids = list(range(self.next_faiss_id, self.next_faiss_id + len(db_ids)))
        self.index.add(vectors)
        
        for faiss_id, db_id in zip(faiss_ids, db_ids):
            self.id_mapping[faiss_id] = db_id
            self.reverse_mapping[db_id] = faiss_id
        
        self.next_faiss_id += len(db_ids)
        self.save()
        
        return faiss_ids

    def search(self, query_vectors: np.ndarray, k: int) -> Tuple[np.ndarray, np.ndarray]:
        if self.index is None:
            self.load()
        
        if self.index.ntotal == 0:
            return np.array([]).reshape(query_vectors.shape[0], 0), np.array([]).reshape(query_vectors.shape[0], 0)
        
        k = min(k, self.index.ntotal)
        scores, faiss_ids = self.index.search(query_vectors, k)
        
        # Convert faiss_ids to db_ids (ensure Python int types)
        db_ids = np.vectorize(lambda x: int(self.id_mapping.get(x, -1)))(faiss_ids)
        
        return scores, db_ids

    def remove(self, db_ids: List[int]) -> bool:
        # FAISS doesn't support direct removal, need to rebuild
        logger.warning("FAISS removal requires index rebuild")
        return self.rebuild_from_db(db_ids)

    def rebuild_from_db(self, db_id_to_vector: Dict[int, np.ndarray]) -> bool:
        """Rebuild index from database vectors"""
        try:
            self._create_index()
            self.id_mapping = {}
            self.reverse_mapping = {}
            self.next_faiss_id = 0
            
            if db_id_to_vector:
                vectors = np.vstack(list(db_id_to_vector.values()))
                db_ids = list(db_id_to_vector.keys())
                self.add(vectors, db_ids)
            
            logger.info(f"Rebuilt FAISS index with {self.index.ntotal} vectors")
            return True
        except Exception as e:
            logger.error(f"Failed to rebuild index: {e}")
            return False

    def get_db_id(self, faiss_id: int) -> Optional[int]:
        return self.id_mapping.get(faiss_id)

    def get_faiss_id(self, db_id: int) -> Optional[int]:
        return self.reverse_mapping.get(db_id)

    def __len__(self) -> int:
        return self.index.ntotal if self.index else 0


class DualFAISSManager:
    def __init__(self, base_path: str, text_dim: int = 384, image_dim: int = 512):
        self.text_index = FAISSManager(
            os.path.join(base_path, "text"), text_dim, "flat"
        )
        self.image_index = FAISSManager(
            os.path.join(base_path, "image"), image_dim, "flat"
        )

    def load(self):
        self.text_index.load()
        self.image_index.load()

    def save(self):
        self.text_index.save()
        self.image_index.save()

    def add_text(self, vectors: np.ndarray, db_ids: List[int]) -> List[int]:
        return self.text_index.add(vectors, db_ids)

    def add_image(self, vectors: np.ndarray, db_ids: List[int]) -> List[int]:
        return self.image_index.add(vectors, db_ids)

    def search_text(self, query_vectors: np.ndarray, k: int) -> Tuple[np.ndarray, np.ndarray]:
        return self.text_index.search(query_vectors, k)

    def search_image(self, query_vectors: np.ndarray, k: int) -> Tuple[np.ndarray, np.ndarray]:
        return self.image_index.search(query_vectors, k)

    def rebuild_text(self, db_id_to_vector: Dict[int, np.ndarray]) -> bool:
        return self.text_index.rebuild_from_db(db_id_to_vector)

    def rebuild_image(self, db_id_to_vector: Dict[int, np.ndarray]) -> bool:
        return self.image_index.rebuild_from_db(db_id_to_vector)


_dual_faiss = None


def get_faiss_manager() -> DualFAISSManager:
    global _dual_faiss
    if _dual_faiss is None:
        from app.core.config import settings
        _dual_faiss = DualFAISSManager(settings.FAISS_INDEX_PATH)
    return _dual_faiss