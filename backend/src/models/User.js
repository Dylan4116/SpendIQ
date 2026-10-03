import mongoose from 'mongoose';
import { CATEGORIES, GENDERS } from '../utils/constants.js';

// Money is stored as integer paise; conversion to rupees happens at the API boundary.
const paise = {
  type: Number,
  required: true,
  min: 0,
  validate: { validator: Number.isInteger, message: 'Money values must be integer paise' },
};

const budgetSchema = new mongoose.Schema({
  category: { type: String, enum: CATEGORIES, required: true },
  monthlyLimit: { ...paise },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  age: { type: Number, min: 1, max: 120 },
  gender: { type: String, enum: GENDERS },
  bio: { type: String, maxlength: 200 },
  budgets: { type: [budgetSchema], default: [] },
}, { timestamps: true });

userSchema.path('budgets').validate({
  validator: (budgets) => new Set(budgets.map((budget) => budget.category)).size === budgets.length,
  message: 'Each budget category must be unique per user',
});

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
