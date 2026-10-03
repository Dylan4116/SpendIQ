import os
import tempfile
import time
from io import BytesIO

# Keep PaddleX cache inside the project so Windows does not need a protected user cache path.
os.environ.setdefault(
    "PADDLE_PDX_CACHE_HOME",
    os.path.join(tempfile.gettempdir(), "tektonix-paddlex-cache"),
)

import numpy as np
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from paddleocr import PaddleOCR

from .normalizer import normalize_result

register_heif_opener()

_engine = None


def load_engine():
    global _engine
    # PaddleOCR 3.7.0 uses predict() and returns result objects with rec_texts,
    # rec_scores, and rec_polys. This configuration runs the English model on CPU.
    _engine = PaddleOCR(
        lang="en",
        device="cpu",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    list(_engine.predict(np.zeros((100, 100, 3), dtype=np.uint8)))


def model_loaded():
    return _engine is not None


def _result_value(result, name, fallback=None):
    try:
        value = result[name]
    except (KeyError, TypeError, IndexError):
        value = getattr(result, name, fallback)
    return value if value is not None else fallback


def _box_to_polygon(box):
    values = box.tolist() if hasattr(box, "tolist") else list(box)
    if len(values) == 4:
        x1, y1, x2, y2 = values
        return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
    return values


def _to_legacy_result(results):
    """Adapt PaddleOCR 3.x result objects to the normalizer's fragment format."""
    fragments = []
    for result in results:
        texts = _result_value(result, "rec_texts", []) or []
        scores = _result_value(result, "rec_scores", []) or []
        polygons = _result_value(result, "rec_polys", None)
        if polygons is None:
            polygons = _result_value(result, "rec_boxes", []) or []

        for index, text in enumerate(texts):
            if index >= len(scores) or index >= len(polygons):
                continue
            fragments.append([
                _box_to_polygon(polygons[index]),
                (str(text), float(scores[index])),
            ])
    return [fragments]


def process_image(contents):
    if _engine is None:
        raise RuntimeError("OCR model is not loaded")

    started = time.perf_counter()
    image = Image.open(BytesIO(contents))
    image = ImageOps.exif_transpose(image)
    original_width, original_height = image.size
    image = image.convert("RGB")
    longest_side = max(image.size)
    if longest_side > 2000:
        scale = 2000 / longest_side
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )

    results = list(_engine.predict(np.asarray(image)))
    processing_ms = round((time.perf_counter() - started) * 1000)
    return normalize_result(
        _to_legacy_result(results),
        original_width,
        original_height,
        processing_ms,
    )
