import * as analyticsService from '../services/analyticsService.js';

export async function getAnalytics(req, res) {
  const analytics = await analyticsService.getAnalytics(req.userId, req.query);
  res.json({ success: true, data: analytics });
}
