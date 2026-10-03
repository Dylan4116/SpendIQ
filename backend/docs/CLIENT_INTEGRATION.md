# React Native Client Integration

## Base URL

The server listens on all network interfaces and prints a LAN URL at startup.

- Physical phone on the same Wi-Fi: `http://YOUR_COMPUTER_LAN_IP:5000/api`
- Android Emulator: `http://10.0.2.2:5000/api`
- iOS Simulator: `http://127.0.0.1:5000/api`
- Expo Web: use the computer LAN URL when testing from another device, or `http://localhost:5000/api` locally.

Use the LAN IP shown by `npm run dev` for a physical phone. The phone and computer must be on the same network. Send JWTs using `Authorization: Bearer TOKEN`; no cookies are used.

## Responses

Successful responses use `{ "success": true, "data": {} }`, except health, which also includes `message` and `serverTime`. Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Validation errors also include `error.fields` for inline form messages.

## Endpoints

### Health

```http
GET /api/health
```

```json
{
  "success": true,
  "message": "Server is running",
  "serverTime": "2026-10-02T00:00:00.000Z"
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Akshay","email":"akshay@example.com","password":"password123"}
```

Returns `201` with `{ "success": true, "data": { "user": {...}, "token": "JWT" } }`.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{"email":"demo@tektonix.com","password":"Demo@1234"}
```

Returns `200` with the same `{ user, token }` data shape.

### Current user

```http
GET /api/users/me
Authorization: Bearer JWT
```

Returns the authenticated profile and budgets.

### Update profile

```http
PATCH /api/users/me
Authorization: Bearer JWT
Content-Type: application/json

{"age":25,"gender":"PREFER_NOT_TO_SAY","bio":"Expense tracker"}
```

Allowed fields are `name`, `age`, `gender`, and `bio`.

### Delete profile and logout

```http
DELETE /api/auth/me
Authorization: Bearer JWT
```

```http
POST /api/auth/logout
Authorization: Bearer JWT
```

Logout is stateless: remove the JWT from secure storage after receiving the successful response.

### Recommendations

```http
GET /api/recommendations?period=MONTHLY
Authorization: Bearer JWT
```

The endpoint calculates the authenticated user's analytics and returns up to three evidence-based recommendations:

```json
{
  "success": true,
  "data": {
    "period": { "type": "MONTHLY", "startDate": "2026-10-01T00:00:00.000Z", "endDate": "2026-11-01T00:00:00.000Z" },
    "recommendations": [],
    "cached": false
  }
}
```

Recommendation types are `OVERSPENDING`, `RECURRING_PURCHASE`, `SPENDING_INCREASE`, `LARGE_EXPENSE`, `CATEGORY_TREND`, `STORE_PATTERN`, and `GENERAL_INSIGHT`.

### Process and save a receipt

```http
POST /api/receipts
Authorization: Bearer JWT
Content-Type: multipart/form-data

image: <receipt image>
```

This runs FastAPI/PaddleOCR, sends the resulting text to Gemini, validates the structured classification, stores the receipt for the authenticated user, and removes the temporary upload.

### Replace budgets

```http
PUT /api/users/me/budgets
Authorization: Bearer JWT
Content-Type: application/json

{"budgets":[{"category":"FOOD","monthlyLimit":7000}]}
```

### Receipt image upload preparation

`uploadMiddleware` accepts a multipart field named `image`, up to 10 MB, with JPEG, PNG, WEBP, or HEIC content. Uploaded files are served from `/uploads/<filename>` when attached to a future receipt route.

### Categorize OCR text

After calling `/api/receipts/ocr`, send the returned `data.ocr.rawText` to Gemini through Express:

```http
POST /api/receipts/analyze
Authorization: Bearer JWT
Content-Type: application/json

{"ocrText":"DMART\nAmul Taaza Milk 64\nTOTAL 64"}
```

The response is `{ "success": true, "data": { "analysis": { "storeName": "DMART", "items": [], "total": 64, "currency": "INR" } } }`. Categories, subcategories, item types, and confidence values are validated by the backend. This endpoint does not save the result yet.

## Error codes

| Code | Status | Meaning |
| --- | ---: | --- |
| `VALIDATION_ERROR` | 400 | Request fields are invalid; inspect `error.fields`. |
| `INVALID_FILE_TYPE` | 400 | Upload is not JPEG, PNG, WEBP, or HEIC. |
| `FILE_TOO_LARGE` | 400 | Upload exceeds 10 MB. |
| `FILE_REQUIRED` | 400 | Multipart request must include the `image` field. |
| `UNAUTHORIZED` | 401 | Token is missing, invalid, expired, or its user no longer exists. |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect. |
| `NOT_FOUND` | 404 | User or route was not found. |
| `EMAIL_ALREADY_EXISTS` | 409 | Signup email is already registered. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |
| `OCR_SERVICE_UNAVAILABLE` | 503 | FastAPI OCR service cannot be reached. |
| `OCR_TIMEOUT` | 504 | OCR service exceeded the configured timeout. |
| `OCR_NO_TEXT` | 422 | Image contains no readable receipt text. |
| `OCR_FAILED` | 422 | OCR returned an invalid or failed result. |
| `GEMINI_NOT_CONFIGURED` | 500 | Gemini API key is not configured. |
| `GEMINI_FAILED` | 502 | Gemini request failed. |
| `GEMINI_INVALID_RESPONSE` | 502 | Gemini returned data that failed validation. |
| `RECEIPT_INCOMPLETE` | 422 | Receipt data is insufficient to save. |

## Demo seed

```bash
npm run seed
```

This creates or updates `demo@tektonix.com` with password `Demo@1234` and a FOOD budget of 7000.
