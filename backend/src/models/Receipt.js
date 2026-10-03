import mongoose from 'mongoose';
import {
  CATEGORIES,
  CATEGORY_TAXONOMY,
  CLASSIFIED_BY,
  ITEM_TYPES,
  RECEIPT_STATUS,
  SUBCATEGORIES,
} from '../utils/constants.js';

// Money is stored as integer paise (₹64.50 is 6450); conversion to rupees happens at the API boundary.
const paise = {
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: 'Money values must be integer paise' },
};

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, trim: true, lowercase: true },
  quantity: { type: Number, min: 0, default: 1 },
  price: { ...paise, required: true },
  category: { type: String, enum: CATEGORIES, required: true, default: 'OTHER' },
  subcategory: {
    type: String,
    enum: SUBCATEGORIES,
    required: true,
    default: 'OTHER',
    validate: {
      validator(value) {
        return CATEGORY_TAXONOMY[this.category]?.includes(value) === true;
      },
      message: 'Subcategory is not valid for the selected category',
    },
  },
  itemType: { type: String, enum: ITEM_TYPES, required: true, default: 'OTHER' },
  classifiedBy: { type: String, enum: CLASSIFIED_BY, required: true },
  confidence: { type: Number, min: 0, max: 1 },
});

const receiptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  imageUrl: { type: String },
  rawOcrText: { type: String, select: false },
  storeName: { type: String, trim: true, default: 'UNKNOWN' },
  receiptDate: { type: Date, required: true, default: Date.now },
  items: {
    type: [itemSchema],
    validate: { validator: (items) => items.length >= 1, message: 'A receipt must contain at least one item' },
  },
  subtotal: { ...paise, required: true, default: 0 },
  tax: { ...paise, required: true, default: 0 },
  discount: { ...paise, required: true, default: 0 },
  total: { ...paise, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, enum: ['CASH', 'CARD', 'UPI', 'OTHER'], default: 'OTHER' },
  status: { type: String, enum: RECEIPT_STATUS, default: 'PROCESSED' },
}, { timestamps: true });

// A confidence below 0.5 is treated as low confidence and needs manual review.
receiptSchema.pre('validate', function setReviewStatus(next) {
  if (this.items.some((item) => item.confidence !== undefined && item.confidence < 0.5)) {
    this.status = 'NEEDS_REVIEW';
  }
  next();
});

receiptSchema.index({ userId: 1, receiptDate: -1 });
receiptSchema.index({ userId: 1, 'items.category': 1, receiptDate: -1 });
receiptSchema.index({ userId: 1, 'items.normalizedName': 1 });

export default mongoose.model('Receipt', receiptSchema);
