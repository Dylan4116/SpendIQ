import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CATEGORIES, GENDERS } from '../utils/constants.js';
import { getMe, updateBudgets, updateMe } from '../controllers/userController.js';

const router = Router();
const protectedRoute = [authMiddleware];

const profileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Age must be a number between 1 and 120'),
  body('gender').optional().isIn(GENDERS).withMessage(`Gender must be one of: ${GENDERS.join(', ')}`),
  body('bio').optional().isString().isLength({ max: 200 }).withMessage('Bio must be 200 characters or fewer'),
];

const budgetRules = body('budgets').isArray().withMessage('Budgets must be an array').custom((budgets) => {
  const categories = new Set();
  for (const budget of budgets) {
    if (!budget || !CATEGORIES.includes(budget.category)) throw new Error('Each budget has an invalid category');
    if (categories.has(budget.category)) throw new Error('Duplicate budget categories are not allowed');
    if (typeof budget.monthlyLimit !== 'number' || budget.monthlyLimit < 0) {
      throw new Error('Monthly limit must be a number greater than or equal to 0');
    }
    categories.add(budget.category);
  }
  return true;
});

router.get('/me', protectedRoute, asyncHandler(getMe));
router.patch('/me', protectedRoute, profileRules, validate, asyncHandler(updateMe));
router.put('/me/budgets', protectedRoute, budgetRules, validate, asyncHandler(updateBudgets));

export default router;
