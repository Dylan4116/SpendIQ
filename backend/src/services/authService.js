import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { GENDERS } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validationError(message, fields) {
  return new ApiError(400, 'VALIDATION_ERROR', message, fields);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

function toSafeUser(userDoc) {
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    age: user.age,
    gender: user.gender,
    bio: user.bio,
    budgets: user.budgets || [],
    createdAt: user.createdAt,
  };
}

function validateCredentials(body) {
  const fields = {};
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) fields.email = 'Invalid email format';
  if (typeof body.password !== 'string' || body.password.length < 8) {
    fields.password = 'Password must be at least 8 characters';
  }
  if (Object.keys(fields).length) throw validationError('Invalid credentials format', fields);
  return { email, password: body.password };
}

function validateOptionalProfile(body, fields) {
  if (body.age !== undefined && (!Number.isInteger(body.age) || body.age < 1 || body.age > 120)) {
    fields.age = 'Age must be an integer between 1 and 120';
  }
  if (body.gender !== undefined) {
    body.gender = typeof body.gender === 'string' ? body.gender.trim().toUpperCase() : '';
    if (!GENDERS.includes(body.gender)) fields.gender = `Gender must be one of: ${GENDERS.join(', ')}`;
  }
  if (body.bio !== undefined && (typeof body.bio !== 'string' || body.bio.length > 200)) {
    fields.bio = 'Bio must be 200 characters or fewer';
  }
}

export async function registerUser(body) {
  const fields = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = normalizeEmail(body.email);
  if (!name) fields.name = 'Name is required';
  if (!isEmail(email)) fields.email = 'Invalid email format';
  if (typeof body.password !== 'string' || body.password.length < 8) {
    fields.password = 'Password must be at least 8 characters';
  }
  validateOptionalProfile(body, fields);
  if (Object.keys(fields).length) throw validationError('Invalid registration details', fields);

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');

  const userData = {
    name,
    email,
    passwordHash: await bcrypt.hash(body.password, 10),
  };
  for (const key of ['age', 'gender', 'bio']) {
    if (body[key] !== undefined) userData[key] = body[key];
  }

  try {
    const user = await User.create(userData);
    return { token: signToken(user._id.toString()), user: toSafeUser(user) };
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    throw error;
  }
}

export async function loginUser(body) {
  const { email, password } = validateCredentials(body);
  const user = await User.findOne({ email }).select('+passwordHash');
  const validPassword = user && await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  return { token: signToken(user._id.toString()), user: toSafeUser(user) };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  return toSafeUser(user);
}

export async function updateCurrentUser(userId, body) {
  body = body || {};
  const allowedFields = ['name', 'age', 'gender', 'bio'];
  const fields = {};
  const unknownFields = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length) {
    throw validationError('Unsupported profile fields', { [unknownFields[0]]: 'This field cannot be updated' });
  }

  if (body.name !== undefined) {
    fields.name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!fields.name) fields.name = undefined;
  }
  if (body.age !== undefined && (!Number.isInteger(body.age) || body.age < 1 || body.age > 120)) {
    fields.age = undefined;
  }
  if (body.gender !== undefined) {
    fields.gender = typeof body.gender === 'string' ? body.gender.trim().toUpperCase() : '';
    if (!GENDERS.includes(fields.gender)) fields.gender = undefined;
  }
  if (body.bio !== undefined && (typeof body.bio !== 'string' || body.bio.length > 200)) fields.bio = undefined;

  const invalidFields = {};
  if (body.name !== undefined && !fields.name) invalidFields.name = 'Name cannot be empty';
  if (body.age !== undefined && fields.age === undefined) invalidFields.age = 'Age must be an integer between 1 and 120';
  if (body.gender !== undefined && fields.gender === undefined) invalidFields.gender = `Gender must be one of: ${GENDERS.join(', ')}`;
  if (body.bio !== undefined && fields.bio === undefined) invalidFields.bio = 'Bio must be 200 characters or fewer';
  if (Object.keys(invalidFields).length) throw validationError('Invalid profile details', invalidFields);

  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  Object.assign(user, fields);
  await user.save();
  return toSafeUser(user);
}

export async function deleteCurrentUser(userId) {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  return { id: user._id.toString() };
}
