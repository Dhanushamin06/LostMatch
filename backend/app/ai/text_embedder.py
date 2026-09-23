import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Union
import logging

logger = logging.getLogger(__name__)


class TextEmbedder:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.dimension = 384

    def load(self):
        if self.model is None:
            logger.info(f"Loading text embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.dimension = self.model.get_sentence_embedding_dimension()
            logger.info(f"Model loaded, embedding dimension: {self.dimension}")

    def embed(self, texts: Union[str, List[str]]) -> np.ndarray:
        self.load()
        if isinstance(texts, str):
            texts = [texts]
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.astype(np.float32)

    def embed_batch(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        self.load()
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=True,
            normalize_embeddings=True
        )
        return embeddings.astype(np.float32)


_text_embedder = None


def get_text_embedder() -> TextEmbedder:
    global _text_embedder
    if _text_embedder is None:
        from app.core.config import settings
        _text_embedder = TextEmbedder(settings.TEXT_EMBEDDING_MODEL)
    return _text_embedder