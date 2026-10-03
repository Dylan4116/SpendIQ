from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class OCRLine(BaseModel):
    text: str
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox


class OCRMeta(BaseModel):
    lineCount: int = Field(ge=0)
    avgConfidence: float = Field(ge=0, le=1)
    lowConfidenceLines: int = Field(ge=0)
    imageWidth: int = Field(gt=0)
    imageHeight: int = Field(gt=0)
    processingMs: int = Field(ge=0)


class OCRResponse(BaseModel):
    rawText: str
    lines: list[OCRLine]
    meta: OCRMeta
