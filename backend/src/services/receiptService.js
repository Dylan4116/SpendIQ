import mongoose from 'mongoose';
import Receipt from '../models/Receipt.js';
import { ApiError } from '../utils/ApiError.js';
import * as geminiService from './geminiService.js';
import * as ocrService from './ocrService.js';

function toPaise(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ApiError(422, 'RECEIPT_INCOMPLETE', `Gemini did not return a valid ${field}`);
  }
  const paise = Math.round(value * 100);
  if (!Number.isSafeInteger(paise)) throw new ApiError(422, 'RECEIPT_INCOMPLETE', `Gemini returned an invalid ${field}`);
  return paise;
}

function parseReceiptDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(422, 'RECEIPT_INCOMPLETE', 'Gemini returned an invalid receipt date');
  return date;
}

function toPublicReceipt(receipt) {
  const value = receipt.toObject ? receipt.toObject() : receipt;
  delete value.rawOcrText;
  delete value.__v;
  return value;
}

function buildReceipt(userId, ocr, analysis) {
  if (analysis.total === null || analysis.total === undefined || !Array.isArray(analysis.items) || analysis.items.length === 0) {
    throw new ApiError(422, 'RECEIPT_INCOMPLETE', 'Gemini did not return enough data to save this receipt');
  }

  return {
    userId,
    rawOcrText: ocr.rawText,
    storeName: analysis.storeName || 'UNKNOWN',
    receiptDate: parseReceiptDate(analysis.receiptDate),
    items: analysis.items.map((item) => ({
      name: item.name,
      normalizedName: item.name.trim().toLowerCase(),
      quantity: item.quantity,
      price: toPaise(item.price, 'item price'),
      category: item.category,
      subcategory: item.subcategory,
      itemType: item.itemType,
      classifiedBy: 'AI',
      confidence: item.confidence,
    })),
    subtotal: analysis.subtotal === null ? 0 : toPaise(analysis.subtotal, 'subtotal'),
    tax: analysis.tax === null ? 0 : toPaise(analysis.tax, 'tax'),
    discount: analysis.discount === null ? 0 : toPaise(analysis.discount, 'discount'),
    total: toPaise(analysis.total, 'total'),
    currency: analysis.currency || 'INR',
  };
}

export async function processAndSaveReceipt(userId, filePath) {
  const ocr = await ocrService.extractText(filePath);
  const analysis = await geminiService.analyzeReceipt(ocr.rawText);
  const receipt = await Receipt.create(buildReceipt(userId, ocr, analysis));
  return toPublicReceipt(receipt);
}

export async function listReceipts(userId, query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const receipts = await Receipt.find({ userId }).sort({ receiptDate: -1 }).limit(limit).lean();
  return receipts.map(toPublicReceipt);
}

export async function getReceipt(userId, receiptId) {
  if (!mongoose.Types.ObjectId.isValid(receiptId)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid receipt id');
  const receipt = await Receipt.findOne({ _id: receiptId, userId }).lean();
  if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'Receipt not found');
  return toPublicReceipt(receipt);
}

export async function deleteReceipt(userId, receiptId) {
  if (!mongoose.Types.ObjectId.isValid(receiptId)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid receipt id');
  const receipt = await Receipt.findOneAndDelete({ _id: receiptId, userId }).lean();
  if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'Receipt not found');
  return { id: receipt._id.toString() };
}
