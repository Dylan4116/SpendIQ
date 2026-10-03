import * as userService from '../services/userService.js';

export async function getMe(req, res) {
  const user = await userService.findUserById(req.userId);
  res.json({ success: true, data: { user: user.toJSON() } });
}

export async function updateMe(req, res) {
  const user = await userService.updateProfile(req.userId, req.body);
  res.json({ success: true, data: { user: user.toJSON() } });
}

export async function updateBudgets(req, res) {
  const user = await userService.replaceBudgets(req.userId, req.body.budgets);
  res.json({ success: true, data: { budgets: user.budgets } });
}
