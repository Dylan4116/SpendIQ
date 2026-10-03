import { unlink } from 'node:fs/promises';
import { ApiError } from '../utils/ApiError.js';
import * as ocrService from '../services/ocrService.js';
import * as geminiService from '../services/geminiService.js';
import * as receiptService from '../services/receiptService.js';

export async function createReceipt(req, res) {
  if (!req.file) throw new ApiError(400, 'FILE_REQUIRED', 'An image file is required');
  try {
    const receipt = await receiptService.processAndSaveReceipt(req.userId, req.file.path);
    res.status(201).json({ success: true, data: { receipt } });
  } finally {
    await unlink(req.file.path).catch(() => undefined);
  }
}

export async function extractOcr(req, res) {
  if (!req.file) throw new ApiError(400, 'FILE_REQUIRED', 'An image file is required');

  try {
    const ocr = await ocrService.extractText(req.file.path);
    res.json({ success: true, data: { ocr } });
  } finally {
    await unlink(req.file.path).catch(() => undefined);
  }
}

export async function analyzeReceipt(req, res) {
  const analysis = await geminiService.analyzeReceipt(req.body.ocrText);
  res.json({ success: true, data: { analysis } });
}

export async function listReceipts(req, res) {
  const receipts = await receiptService.listReceipts(req.userId, req.query);
  res.json({ success: true, data: { receipts } });
}

export async function getReceipt(req, res) {
  const receipt = await receiptService.getReceipt(req.userId, req.params.id);
  res.json({ success: true, data: { receipt } });
}

export async function deleteReceipt(req, res) {
  const receipt = await receiptService.deleteReceipt(req.userId, req.params.id);
  res.json({ success: true, data: { receipt } });
}
