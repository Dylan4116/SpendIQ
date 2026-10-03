import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { CATEGORY_TAXONOMY, CATEGORIES, ITEM_TYPES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

const client = env.geminiApiKey ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : null;

const analyzerRules = `You are the Categorist Analyzer for an intelligent expense-management application.
Analyze OCR receipt text and return ONLY valid JSON. Do not return markdown or explanations.

Use only these controlled values:
Categories: ${CATEGORIES.join(', ')}.
Category taxonomy: ${JSON.stringify(CATEGORY_TAXONOMY)}.
Item types: ${ITEM_TYPES.join(', ')}.

Rules:
- Identify storeName, receiptDate, items, prices, subtotal, tax, discount, total, and currency only when supported by OCR.
- If quantity is missing, use 1. If a price or financial value is unsupported, use null.
- Keep product names as free text; never invent category or financial values.
- category, subcategory, and itemType are separate fields. The subcategory must belong to the selected category taxonomy.
- If classification is uncertain, use OTHER for the relevant enum and lower confidence.
- Confidence is a number from 0 to 1 and describes extraction/classification confidence.
- Return exactly this shape:
{
  "storeName": null,
  "receiptDate": null,
  "items": [{"name":"", "quantity":1, "price":null, "category":"OTHER", "subcategory":"OTHER", "itemType":"OTHER", "confidence":0}],
  "subtotal": null,
  "tax": null,
  "discount": null,
  "total": null,
  "currency": "INR"
}`;

const recommendationRules = `You are the Recommendation Engine of an intelligent personal expense-management application.
Analyze ONLY the supplied analytics JSON for one user and one time period. The backend calculates facts; you interpret them.

Rules:
- Never invent or estimate amounts, percentages, dates, products, stores, budgets, trends, or causes.
- Do not perform unsupported causal reasoning or give generic financial advice.
- Return only meaningful, actionable recommendations supported by the supplied analytics.
- Avoid duplicate recommendations and prefer the strongest insights.
- Return at most 3 recommendations, or an empty array when no meaningful pattern exists.
- Use neutral language. Do not make financial, investment, credit, tax, or medical claims.
- Each message should combine observation, context, and an optional useful action in approximately 25 words or fewer.

Allowed types: OVERSPENDING, RECURRING_PURCHASE, SPENDING_INCREASE, LARGE_EXPENSE, CATEGORY_TREND, STORE_PATTERN, GENERAL_INSIGHT.
Allowed severities: LOW, MEDIUM, HIGH. Severity reflects pattern strength and relevance, not financial danger.

Return ONLY valid JSON in exactly this shape:
{
  "recommendations": [{
    "type": "OVERSPENDING",
    "severity": "MEDIUM",
    "title": "Short title",
    "message": "Concise evidence-based observation and useful suggestion.",
    "category": "FOOD",
    "relatedItem": null
  }]
}

Rules for fields: title is at most 8 words; message is approximately 25 words or fewer; category must be an existing analytics category or null; relatedItem must be an existing analytics item name or null.`;

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new ApiError(502, 'GEMINI_INVALID_RESPONSE', 'Gemini returned invalid JSON');
  }
}

function isMoney(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function validateAnalysis(value) {
  if (!value || !Array.isArray(value.items) || !isMoney(value.subtotal)
    || !isMoney(value.tax) || !isMoney(value.discount) || !isMoney(value.total)) {
    throw new ApiError(502, 'GEMINI_INVALID_RESPONSE', 'Gemini returned an invalid receipt structure');
  }

  for (const item of value.items) {
    const validSubcategory = item && CATEGORY_TAXONOMY[item.category]?.includes(item.subcategory);
    if (!item || typeof item.name !== 'string' || typeof item.quantity !== 'number'
      || !isMoney(item.price) || !CATEGORIES.includes(item.category)
      || !validSubcategory || !ITEM_TYPES.includes(item.itemType)
      || typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
      throw new ApiError(502, 'GEMINI_INVALID_RESPONSE', 'Gemini returned an invalid item classification');
    }
  }
  return value;
}

async function callGeminiWithRetry(params, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.models.generateContent(params);
    } catch (error) {
      lastError = error;
      const is503 = error?.status === 503 || error?.message?.includes('"code":503');
      if (is503 && attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        console.warn(`Gemini 503 overload (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function analyzeReceipt(ocrText) {
  if (!client) throw new ApiError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');

  try {
    const response = await callGeminiWithRetry({
      model: env.geminiModel,
      contents: `${analyzerRules}\n\nOCR TEXT:\n${ocrText}`,
      config: { responseMimeType: 'application/json' },
    });
    return validateAnalysis(parseJson(response.text));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('GEMINI ANALYZE ERROR:', error?.message ?? error);
    const is503 = error?.status === 503 || error?.message?.includes('"code":503');
    if (is503) throw new ApiError(503, 'GEMINI_OVERLOADED', 'AI service is busy. Please try again in a few seconds.');
    throw new ApiError(502, 'GEMINI_FAILED', 'Receipt categorization failed');
  }
}

function validateRecommendations(value, analytics) {
  const allowedTypes = ['OVERSPENDING', 'RECURRING_PURCHASE', 'SPENDING_INCREASE', 'LARGE_EXPENSE', 'CATEGORY_TREND', 'STORE_PATTERN', 'GENERAL_INSIGHT'];
  const allowedSeverities = ['LOW', 'MEDIUM', 'HIGH'];
  const categories = new Set((analytics.categoryBreakdown || []).map((item) => item.category));
  const itemNames = new Set((analytics.recurringItems || []).map((item) => item.itemName));

  if (!value || !Array.isArray(value.recommendations) || value.recommendations.length > 3) {
    throw new ApiError(502, 'GEMINI_INVALID_RESPONSE', 'Gemini returned an invalid recommendation structure');
  }

  for (const recommendation of value.recommendations) {
    if (!recommendation || !allowedTypes.includes(recommendation.type)
      || !allowedSeverities.includes(recommendation.severity)
      || typeof recommendation.title !== 'string' || recommendation.title.trim().split(/\s+/).length > 8
      || typeof recommendation.message !== 'string' || recommendation.message.trim().split(/\s+/).length > 30
      || (recommendation.category !== null && recommendation.category !== undefined && !categories.has(recommendation.category))
      || (recommendation.relatedItem !== null && recommendation.relatedItem !== undefined && !itemNames.has(recommendation.relatedItem))) {
      throw new ApiError(502, 'GEMINI_INVALID_RESPONSE', 'Gemini returned an invalid recommendation');
    }
  }
  return {
    recommendations: value.recommendations.map((recommendation) => ({
      ...recommendation,
      title: recommendation.title.trim(),
      message: recommendation.message.trim(),
      category: recommendation.category ?? null,
      relatedItem: recommendation.relatedItem ?? null,
    })),
  };
}

export async function generateRecommendations(analytics) {
  if (!client) throw new ApiError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');

  try {
    const response = await client.models.generateContent({
      model: env.geminiModel,
      contents: `${recommendationRules}\n\nANALYTICS JSON:\n${JSON.stringify(analytics)}`,
      config: { responseMimeType: 'application/json' },
    });
    return validateRecommendations(parseJson(response.text), analytics);
  } catch (error) {
    console.error('GEMINI UNDERLYING ERROR:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'GEMINI_FAILED', 'Recommendation generation failed');
  }
}
