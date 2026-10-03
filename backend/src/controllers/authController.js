import * as authService from '../services/authService.js';

export async function register(req, res) {
  const data = await authService.registerUser(req.body);
  res.status(201).json({ success: true, message: 'Registration successful', data });
}

export async function login(req, res) {
  const data = await authService.loginUser(req.body);
  res.json({ success: true, message: 'Login successful', data });
}

export async function getMe(req, res) {
  const user = await authService.getCurrentUser(req.userId);
  res.json({ success: true, message: 'User retrieved successfully', data: { user } });
}

export async function updateMe(req, res) {
  const user = await authService.updateCurrentUser(req.userId, req.body);
  res.json({ success: true, message: 'Profile updated successfully', data: { user } });
}

export async function deleteMe(req, res) {
  const user = await authService.deleteCurrentUser(req.userId);
  res.json({ success: true, message: 'Profile deleted successfully', data: { user } });
}

export async function logout(_req, res) {
  // JWTs are stateless; the client must remove its stored token.
  res.json({ success: true, message: 'Logout successful', data: {} });
}
