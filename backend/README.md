# Expense Management Backend

Boilerplate for a Node.js and Express backend supporting a mobile expense-management application. The planned system will handle receipt uploads, OCR, structured classification, analytics, recommendations, and MongoDB persistence.

## Architecture

Requests follow `Route → Controller → Service → Model`. Authentication uses bcrypt password hashes and JWTs. Receipt processing uses the configured FastAPI/PaddleOCR service and Gemini classification.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Use `cp .env.example .env` on macOS/Linux.

## Environment variables

Required: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GEMINI_API_KEY`, and `OCR_SERVICE_URL`. Optional: `GEMINI_MODEL` and `OCR_TIMEOUT_MS`.

Fill `MONGODB_URI` with your MongoDB connection string and `GEMINI_API_KEY` with your Gemini API key. Keep credentials in the ignored `.env` file, never in frontend variables. Use a long random `JWT_SECRET` and `JWT_EXPIRES_IN=7d`. The local OCR URL is `http://127.0.0.1:8000`; do not append `/ocr`. The default Gemini model is `gemini-3.8-flash`.

The configuration loader reads `backend/.env` regardless of the working directory. `PORT` defaults to `5000` if omitted.

`OCR_TIMEOUT_MS` defaults to `120000` (two minutes) and is capped at `180000`. CPU OCR can exceed 30 seconds on phone photos. The HTTP socket timeout allows another 90 seconds after the OCR budget for classification and saving. Restart the backend after changing `.env`.

## Run locally

Set all required variables in `.env`, start FastAPI first, then run `npm start` (or `npm run dev` during development). The Node server exits if required configuration is missing or MongoDB cannot be reached.

Start the OCR service from the backend directory:

```powershell
cd ocr-engine
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start Express in a second terminal from the backend directory:

```powershell
npm start
```

## Authentication endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token required)
- `PATCH /api/auth/me` (Bearer token required; update profile)
- `DELETE /api/auth/me` (Bearer token required; delete profile)
- `POST /api/auth/logout` (Bearer token required)
- `GET /api/analytics?period=MONTHLY` (Bearer token required)
- `GET /api/recommendations?period=MONTHLY` (Bearer token required)
- `GET /api/users/me` (Bearer token required)
- `PATCH /api/users/me` (Bearer token required)
- `PUT /api/users/me/budgets` (Bearer token required)
- `POST /api/receipts` (Bearer token and multipart image; runs OCR, Gemini classification, and saves the receipt)
- `GET /api/receipts` (Bearer token required)
- `GET /api/receipts/:id` (Bearer token required)
- `DELETE /api/receipts/:id` (Bearer token required)
- `POST /api/receipts/ocr` (Bearer token and multipart image required; OCR only)
- `POST /api/receipts/analyze` (Bearer token and OCR text required)
- `GET /api/health`

Receipt categorization uses the configured Gemini API key. Send the OCR response's `rawText` to `/api/receipts/analyze` as `{ "ocrText": "..." }`; the endpoint returns controlled categories, subcategories, item types, prices, and confidence values without saving to MongoDB.

Authentication uses `POST /api/auth/register`, `POST /api/auth/login`, protected `GET/PATCH/DELETE /api/auth/me`, and protected `POST /api/auth/logout`. Future protected data queries must use the verified `req.userId` only; resource-by-ID queries must include both `_id` and `userId`, returning 404 when either does not match.

Analytics are calculated dynamically from the authenticated user's receipts. Supported periods are `DAILY`, `WEEKLY`, `MONTHLY`, and `YEARLY`; arbitrary `startDate`/`endDate` ISO dates are also supported. Money values remain integer paise. Category and subcategory totals use item prices, while receipt totals drive summaries, stores, trends, and large expenses. Recurring items default to at least two purchases and can be adjusted with `recurringMin`.

Example curl commands (PowerShell uses backticks for line continuation):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Akshay","email":"akshay@example.com","password":"password123"}'

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Akshay","email":"akshay@example.com","password":"password123"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"akshay@example.com","password":"password123"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"akshay@example.com","password":"wrongpass"}'

curl http://localhost:5000/api/users/me
curl http://localhost:5000/api/users/me -H "Authorization: Bearer YOUR_TOKEN"

curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"age":25,"gender":"PREFER_NOT_TO_SAY","bio":"Expense tracker"}'

curl -X PUT http://localhost:5000/api/users/me/budgets \
  -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"budgets":[{"category":"FOOD","monthlyLimit":7000}]}'

curl -X PUT http://localhost:5000/api/users/me/budgets \
  -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"budgets":[{"category":"INVALID","monthlyLimit":7000}]}'
```
