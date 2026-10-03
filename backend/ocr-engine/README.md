# Receipt OCR Engine

Internal FastAPI service used by the Express backend. The mobile app must call Express at `/api/receipts/ocr`; it should never call this service directly.

## Setup

Use Python 3.10 or 3.11, then create and activate a virtual environment:

```bash
cd ocr-engine
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The service uses PaddleOCR 3.7.0 and PaddlePaddle 3.2.0 and runs the English model on CPU. On startup it loads the model once and performs a blank-image warm-up. Confirm this with the log line `PaddleOCR model loaded and warmed up`, or check:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok","modelLoaded":true}
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Use one worker because every worker loads its own PaddleOCR model. Uploaded images are processed in memory and are not saved permanently.

## Test commands

Direct FastAPI test:

```bash
curl -F "file=@receipt.jpg" http://localhost:8000/ocr
```

Express test with a JWT:

```bash
curl -H "Authorization: Bearer <token>" -F "image=@receipt.jpg" http://localhost:5000/api/receipts/ocr
```

Postman: choose `Body` → `form-data`, add key `image`, change its type to `File`, select the image, and do not set `Content-Type` manually.

Try these failure cases: missing token, missing file, PDF upload, stopped FastAPI service, blank image, and a rotated phone photo.

## React Native upload

```js
const form = new FormData();
form.append('image', {
  uri: asset.uri,
  name: asset.fileName ?? 'receipt.jpg',
  type: asset.mimeType ?? 'image/jpeg',
});

const response = await fetch(`${API_BASE_URL}/receipts/ocr`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
```

Do not set `Content-Type` yourself; React Native must add the multipart boundary.
