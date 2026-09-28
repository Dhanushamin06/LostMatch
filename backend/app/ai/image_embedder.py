import numpy as np
import torch
from PIL import Image
from typing import List, Union, Optional
import logging
from transformers import CLIPProcessor, CLIPModel

logger = logging.getLogger(__name__)


class ImageEmbedder:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dimension = 512

    def load(self):
        if self.model is None:
            logger.info(f"Loading image embedding model: {self.model_name} on {self.device}")
            self.model = CLIPModel.from_pretrained(self.model_name).to(self.device)
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model.eval()
            logger.info("CLIP model loaded")

    def embed(self, images: Union[str, List[str], Image.Image, List[Image.Image]]) -> np.ndarray:
        self.load()
        
        if isinstance(images, (str, Image.Image)):
            images = [images]
        
        pil_images = []
        for img in images:
            if isinstance(img, str):
                pil_images.append(Image.open(img).convert("RGB"))
            elif isinstance(img, Image.Image):
                pil_images.append(img.convert("RGB"))
            else:
                raise ValueError(f"Unsupported image type: {type(img)}")
        
        inputs = self.processor(images=pil_images, return_tensors="pt", padding=True).to(self.device)
        
        with torch.no_grad():
            outputs = self.model.get_image_features(**inputs)
            if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
                image_features = outputs.pooler_output
            elif hasattr(outputs, "image_embeds") and outputs.image_embeds is not None:
                image_features = outputs.image_embeds
            elif isinstance(outputs, torch.Tensor):
                image_features = outputs
            else:
                image_features = outputs[0]
            
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        return image_features.cpu().numpy().astype(np.float32)

    def embed_batch(self, image_paths: List[str], batch_size: int = 16) -> np.ndarray:
        self.load()
        all_embeddings = []
        
        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i:i + batch_size]
            embeddings = self.embed(batch_paths)
            all_embeddings.append(embeddings)
        
        return np.vstack(all_embeddings) if all_embeddings else np.array([]).reshape(0, self.dimension)


_image_embedder = None


def get_image_embedder() -> ImageEmbedder:
    global _image_embedder
    if _image_embedder is None:
        from app.core.config import settings
        _image_embedder = ImageEmbedder(settings.IMAGE_EMBEDDING_MODEL)
    return _image_embedder