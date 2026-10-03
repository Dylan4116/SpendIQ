import * as recommendationService from '../services/recommendationService.js';

export async function getRecommendations(req, res) {
  const data = await recommendationService.getRecommendations(req.userId, req.query);
  res.json({ success: true, data });
}
