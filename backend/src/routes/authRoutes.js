import { Router } from 'express';
import { deleteMe, getMe, login, logout, register, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', protect, asyncHandler(getMe));
router.patch('/me', protect, asyncHandler(updateMe));
router.delete('/me', protect, asyncHandler(deleteMe));
router.post('/logout', protect, asyncHandler(logout));

export default router;
