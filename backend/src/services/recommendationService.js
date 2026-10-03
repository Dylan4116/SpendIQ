import Analytics from '../models/Analytics.js';
import Recommendation from '../models/Recommendation.js';
import * as analyticsService from './analyticsService.js';
import { generateRecommendations } from './geminiService.js';

const CACHE_DURATION_MS = 60 * 60 * 1000;

function periodKey(analytics) {
  return [analytics.period.type, analytics.period.startDate.toISOString(), analytics.period.endDate.toISOString()].join(':');
}

function snapshotFromAnalytics(userId, analytics) {
  return {
    userId,
    periodType: analytics.period.type,
    periodKey: periodKey(analytics),
    periodStart: analytics.period.startDate,
    periodEnd: analytics.period.endDate,
    totalSpent: analytics.summary.totalSpent,
    receiptCount: analytics.summary.numberOfReceipts,
    categoryBreakdown: analytics.categoryBreakdown,
    topStores: analytics.topStores,
    recurringItems: analytics.recurringItems,
  };
}

export async function getRecommendations(userId, query = {}) {
  const analytics = await analyticsService.getAnalytics(userId, query);
  const key = periodKey(analytics);
  const cached = await Recommendation.findOne({
    userId,
    periodKey: key,
    stale: false,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (cached) return { period: analytics.period, recommendations: cached.recommendations, cached: true };

  const snapshot = await Analytics.findOneAndUpdate(
    { userId, periodType: analytics.period.type, periodKey: key },
    { $set: snapshotFromAnalytics(userId, analytics) },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const generated = await generateRecommendations(analytics);
  const saved = await Recommendation.findOneAndUpdate(
    { userId, periodKey: key },
    {
      $set: {
        analyticsId: snapshot._id,
        recommendations: generated.recommendations,
        model: 'gemini',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
        stale: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return { period: analytics.period, recommendations: saved.recommendations, cached: false };
}
