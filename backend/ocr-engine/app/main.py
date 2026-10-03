import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile

from .ocr_engine import load_engine, model_loaded, process_image
from .schemas import OCRResponse

logger = logging.getLogger("ocr-engine")
logging.basicConfig(level=logging.INFO)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_FILE_SIZE = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(_app):
    load_engine()
    logger.info("PaddleOCR model loaded and warmed up")
    yield


app = FastAPI(title="Receipt OCR Service", lifespan=lifespan)


@app.get('/health')
def health():
    return {"status": "ok", "modelLoaded": model_loaded()}


@app.post('/ocr', response_model=OCRResponse)
def extract_ocr(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_FILE_TYPE", "message": "Only JPEG, PNG, WEBP, and HEIC images are allowed"})

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail={"code": "FILE_TOO_LARGE", "message": "Image must be 10 MB or smaller"})
    try:
        result = process_image(contents)
    except Exception as error:
        logger.warning("Unable to decode OCR image: %s", error.__class__.__name__)
        raise HTTPException(status_code=422, detail={"code": "OCR_NO_TEXT", "message": "No readable text found. Try a clearer, well-lit photo."}) from error

    logger.info("OCR processed %s in %sms", file.filename, result["meta"]["processingMs"])
    if not result["rawText"].strip():
        raise HTTPException(status_code=422, detail={"code": "NO_TEXT", "message": "No readable text found. Try a clearer, well-lit photo."})
    return result
