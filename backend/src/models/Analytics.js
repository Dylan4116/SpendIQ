import mongoose from 'mongoose';
import { CATEGORIES, PERIOD_TYPES } from '../utils/constants.js';

// Analytics is a derived snapshot, stored only when recommendations are generated.
const paise = {
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: 'Money values must be integer paise' },
};

const categoryBreakdownSchema = new mongoose.Schema({
  category: { type: String, enum: CATEGORIES, required: true },
  amount: { ...paise, required: true },
  percentage: { type: Number, min: 0, max: 100, required: true },
}, { _id: false });

const topStoreSchema = new mongoose.Schema({
  storeName: { type: String, required: true, trim: true },
  amount: { ...paise, required: true },
  purchaseCount: { type: Number, min: 0, required: true },
}, { _id: false });

const recurringItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  purchaseCount: { type: Number, min: 0, required: true },
  totalSpent: { ...paise, required: true },
}, { _id: false });

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  periodType: { type: String, enum: PERIOD_TYPES, required: true },
  periodKey: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  totalSpent: { ...paise, required: true, default: 0 },
  receiptCount: { type: Number, min: 0, required: true, default: 0 },
  categoryBreakdown: { type: [categoryBreakdownSchema], default: [] },
  topStores: { type: [topStoreSchema], default: [] },
  recurringItems: { type: [recurringItemSchema], default: [] },
}, { timestamps: true });

analyticsSchema.index({ userId: 1, periodType: 1, periodKey: 1 }, { unique: true });

export default mongoose.model('Analytics', analyticsSchema);
