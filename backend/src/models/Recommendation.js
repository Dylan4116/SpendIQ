import mongoose from 'mongoose';
import { CATEGORIES, RECOMMENDATION_TYPES, SEVERITIES } from '../utils/constants.js';

const recommendationItemSchema = new mongoose.Schema({
  type: { type: String, enum: RECOMMENDATION_TYPES, required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  severity: { type: String, enum: SEVERITIES, required: true },
  category: { type: String, enum: CATEGORIES },
  relatedItem: { type: String, trim: true },
}, { _id: false });

// A cache is valid only when stale is false and expiresAt is later than the current time.
// stale handles immediate invalidation after receipt changes, while expiresAt provides a time limit.
// This avoids version bookkeeping and keeps one replaceable recommendation document per user and period.
// No TTL index is used: deleting expired documents would remove the stale fallback if Gemini is unavailable.
const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  analyticsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analytics', required: true },
  periodKey: { type: String, required: true },
  recommendations: { type: [recommendationItemSchema], default: [] },
  model: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  stale: { type: Boolean, default: false },
}, { timestamps: true });

recommendationSchema.index({ userId: 1, periodKey: 1 }, { unique: true });

export default mongoose.model('Recommendation', recommendationSchema);
