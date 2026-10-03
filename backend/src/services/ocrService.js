import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'node:fs';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function isValidOcrResponse(value) {
  return value && typeof value.rawText === 'string'
    && Array.isArray(value.lines)
    && value.lines.every((line) => line && typeof line.text === 'string'
      && typeof line.confidence === 'number' && line.bbox
      && ['x', 'y', 'width', 'height'].every((key) => Number.isInteger(line.bbox[key])))
    && value.meta && Number.isInteger(value.meta.lineCount)
    && typeof value.meta.avgConfidence === 'number';
}

function noTextError() {
  return new ApiError(422, 'OCR_NO_TEXT', 'No readable text found. Try a clearer, well-lit photo.');
}

export async function extractText(filePath) {
  const form = new FormData();
  form.append('file', createReadStream(filePath));

  try {
    const response = await axios.post(`${env.ocrServiceUrl}/ocr`, form, {
      headers: form.getHeaders(),
      timeout: env.ocrTimeoutMs,
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
    });
    const result = response.data;
    if (response.status === 422 || !result?.rawText?.trim()) throw noTextError();
    if (!isValidOcrResponse(result)) throw new ApiError(422, 'OCR_FAILED', 'OCR returned an invalid response');
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new ApiError(504, 'OCR_TIMEOUT', 'OCR service timed out');
    }
    if (['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code) || !error.response) {
      throw new ApiError(503, 'OCR_SERVICE_UNAVAILABLE', 'OCR service is unavailable');
    }
    if (error.response.status === 422) throw noTextError();
    throw new ApiError(422, 'OCR_FAILED', 'OCR processing failed');
  }
}
