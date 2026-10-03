import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export async function findUserById(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  return user;
}

export async function updateProfile(userId, updates) {
  const allowed = ['name', 'age', 'gender', 'bio'];
  const unknown = Object.keys(updates).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new ApiError(400, 'VALIDATION_ERROR', `Unsupported fields: ${unknown.join(', ')}`);

  const user = await findUserById(userId);
  Object.assign(user, updates);
  return user.save();
}

export async function replaceBudgets(userId, budgets) {
  const user = await findUserById(userId);
  user.budgets = budgets;
  return user.save();
}
