import mongoose from 'mongoose';
import Receipt from '../models/Receipt.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_RECURRING_MIN = 2;
const DEFAULT_LARGE_EXPENSE_LIMIT = 5;

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addPeriod(date, periodType, amount) {
  const result = new Date(date);
  if (periodType === 'DAILY') result.setUTCDate(result.getUTCDate() + amount);
  if (periodType === 'WEEKLY') result.setUTCDate(result.getUTCDate() + (amount * 7));
  if (periodType === 'MONTHLY') result.setUTCMonth(result.getUTCMonth() + amount);
  if (periodType === 'YEARLY') result.setUTCFullYear(result.getUTCFullYear() + amount);
  return result;
}

function currentPeriod(periodType) {
  const today = startOfUtcDay(new Date());
  if (periodType === 'DAILY') return { start: today, end: addPeriod(today, 'DAILY', 1) };
  if (periodType === 'WEEKLY') {
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const start = addPeriod(today, 'DAILY', -mondayOffset);
    return { start, end: addPeriod(start, 'WEEKLY', 1) };
  }
  if (periodType === 'YEARLY') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    return { start, end: new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)) };
  }
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { start, end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)) };
}

function parseDate(value, field, endDate = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be an ISO date`, { [field]: 'Use YYYY-MM-DD or an ISO timestamp' });
  }
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} is invalid`, { [field]: 'Use a valid ISO date' });
  }
  return endDate && value.length === 10 ? addPeriod(date, 'DAILY', 1) : date;
}

function getPeriod(query) {
  const periodType = String(query.period || 'MONTHLY').toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(periodType)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid period', { period: 'Use DAILY, WEEKLY, MONTHLY, or YEARLY' });
  }
  const hasStart = query.startDate !== undefined;
  const hasEnd = query.endDate !== undefined;
  if (hasStart !== hasEnd) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Both startDate and endDate are required together', {
      startDate: 'Provide both dates', endDate: 'Provide both dates',
    });
  }
  const period = hasStart
    ? { start: parseDate(query.startDate, 'startDate'), end: parseDate(query.endDate, 'endDate', true) }
    : currentPeriod(periodType);
  if (period.start >= period.end) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'startDate must be before endDate', { startDate: 'Must be before endDate' });
  }
  return { periodType, period, explicitRange: hasStart };
}

function getPreviousPeriod(periodType, period, explicitRange) {
  if (explicitRange) {
    const duration = period.end.getTime() - period.start.getTime();
    return { start: new Date(period.start.getTime() - duration), end: period.start };
  }
  return { start: addPeriod(period.start, periodType, -1), end: period.start };
}

function matchStage(userId, period) {
  return {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      receiptDate: { $gte: period.start, $lt: period.end },
    },
  };
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function percentage(amount, total) {
  return total ? round((amount / total) * 100) : 0;
}

async function summarize(userId, period) {
  const [result] = await Receipt.aggregate([
    matchStage(userId, period),
    { $group: { _id: null, totalSpent: { $sum: { $ifNull: ['$total', 0] } }, numberOfReceipts: { $sum: 1 } } },
  ]);
  const totalSpent = result?.totalSpent || 0;
  const numberOfReceipts = result?.numberOfReceipts || 0;
  return { totalSpent, numberOfReceipts, averageReceiptValue: numberOfReceipts ? round(totalSpent / numberOfReceipts) : 0 };
}

async function categoryBreakdown(userId, period, totalSpent) {
  const rows = await Receipt.aggregate([
    matchStage(userId, period), { $unwind: '$items' },
    { $group: { _id: '$items.category', amount: { $sum: { $ifNull: ['$items.price', 0] } } } },
    { $sort: { amount: -1 } },
  ]);
  return rows.map((row) => ({ category: row._id || 'OTHER', amount: row.amount, percentage: percentage(row.amount, totalSpent) }));
}

async function subcategoryBreakdown(userId, period, totalSpent) {
  const rows = await Receipt.aggregate([
    matchStage(userId, period), { $unwind: '$items' },
    { $group: { _id: { category: '$items.category', subcategory: '$items.subcategory' }, amount: { $sum: { $ifNull: ['$items.price', 0] } } } },
    { $sort: { amount: -1 } },
  ]);
  return rows.map((row) => ({ category: row._id.category || 'OTHER', subcategory: row._id.subcategory || 'OTHER', amount: row.amount, percentage: percentage(row.amount, totalSpent) }));
}

async function topStores(userId, period, totalSpent) {
  const rows = await Receipt.aggregate([
    matchStage(userId, period),
    { $group: { _id: { $ifNull: ['$storeName', 'UNKNOWN'] }, amount: { $sum: { $ifNull: ['$total', 0] } }, purchaseCount: { $sum: 1 } } },
    { $sort: { amount: -1 } },
  ]);
  return rows.map((row) => ({ storeName: row._id || 'UNKNOWN', amount: row.amount, purchaseCount: row.purchaseCount, percentage: percentage(row.amount, totalSpent) }));
}

async function recurringItems(userId, period, minimumPurchases) {
  const rows = await Receipt.aggregate([
    matchStage(userId, period), { $unwind: '$items' },
    { $project: { normalizedName: { $ifNull: ['$items.normalizedName', '$items.name'] }, itemName: '$items.name', price: { $ifNull: ['$items.price', 0] } } },
    { $group: { _id: { $toLower: { $trim: { input: '$normalizedName' } } }, itemName: { $first: '$itemName' }, purchaseCount: { $sum: 1 }, totalSpent: { $sum: '$price' } } },
    { $match: { purchaseCount: { $gte: minimumPurchases } } },
    { $sort: { purchaseCount: -1, totalSpent: -1 } },
  ]);
  return rows.map((row) => ({ itemName: row.itemName, purchaseCount: row.purchaseCount, totalSpent: row.totalSpent }));
}

function timeGroup(periodType) {
  if (periodType === 'WEEKLY') return { year: { $isoWeekYear: '$receiptDate' }, week: { $isoWeek: '$receiptDate' } };
  const format = periodType === 'DAILY' ? '%Y-%m-%d' : periodType === 'MONTHLY' ? '%Y-%m' : '%Y';
  return { $dateToString: { format, date: '$receiptDate', timezone: 'UTC' } };
}

async function spendingOverTime(userId, periodType, period) {
  const rows = await Receipt.aggregate([
    matchStage(userId, period), { $group: { _id: timeGroup(periodType), amount: { $sum: { $ifNull: ['$total', 0] } } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => {
    if (periodType !== 'WEEKLY') return { period: row._id, amount: row.amount };
    return { period: `${row._id.year}-W${String(row._id.week).padStart(2, '0')}`, amount: row.amount };
  });
}

async function largeExpenses(userId, period, limit) {
  return Receipt.aggregate([
    matchStage(userId, period),
    { $project: { _id: 1, storeName: { $ifNull: ['$storeName', 'UNKNOWN'] }, receiptDate: 1, total: { $ifNull: ['$total', 0] } } },
    { $sort: { total: -1, receiptDate: -1 } }, { $limit: limit },
    { $project: { _id: 0, receiptId: '$_id', storeName: 1, receiptDate: 1, amount: '$total' } },
  ]);
}

export async function getAnalytics(userId, query = {}) {
  const { periodType, period, explicitRange } = getPeriod(query);
  const previousPeriod = getPreviousPeriod(periodType, period, explicitRange);
  const recurringMin = Math.max(2, Math.min(20, Number(query.recurringMin) || DEFAULT_RECURRING_MIN));
  const largeExpenseLimit = Math.max(1, Math.min(20, Number(query.largeExpenseLimit) || DEFAULT_LARGE_EXPENSE_LIMIT));

  const [summary, previousSummary] = await Promise.all([summarize(userId, period), summarize(userId, previousPeriod)]);
  const [categories, subcategories, stores, recurring, overTime, large] = await Promise.all([
    categoryBreakdown(userId, period, summary.totalSpent),
    subcategoryBreakdown(userId, period, summary.totalSpent),
    topStores(userId, period, summary.totalSpent),
    recurringItems(userId, period, recurringMin),
    spendingOverTime(userId, periodType, period),
    largeExpenses(userId, period, largeExpenseLimit),
  ]);

  const difference = summary.totalSpent - previousSummary.totalSpent;
  return {
    period: { type: periodType, startDate: period.start, endDate: period.end },
    summary,
    categoryBreakdown: categories,
    subcategoryBreakdown: subcategories,
    topStores: stores,
    recurringItems: recurring,
    spendingTrend: {
      currentPeriod: summary.totalSpent,
      previousPeriod: previousSummary.totalSpent,
      difference,
      percentageChange: previousSummary.totalSpent ? round((difference / previousSummary.totalSpent) * 100) : 0,
      direction: difference > 0 ? 'INCREASE' : difference < 0 ? 'DECREASE' : 'UNCHANGED',
    },
    spendingOverTime: overTime,
    largeExpenses: large,
  };
}
