import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'rerendet_access_secret_fallback';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'rerendet_refresh_secret_fallback';

if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET not set. Using fallback (UNSAFE).');
if (!process.env.JWT_REFRESH_SECRET) console.warn('⚠️ JWT_REFRESH_SECRET not set. Using fallback (UNSAFE).');

// ── Access Token — short-lived, lives in memory ──────────────────────────────
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

// ── Refresh Token — long-lived, lives in HttpOnly cookie ─────────────────────
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

// ── Verify Access Token ───────────────────────────────────────────────────────
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

// ── Verify Refresh Token ──────────────────────────────────────────────────────
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

// ── Set Refresh Token as HttpOnly Cookie ─────────────────────────────────────
export const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,          // JS cannot read this — XSS-proof
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',     // No cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth/refresh' // Cookie only sent to the refresh endpoint
  });
};

// ── Clear Refresh Token Cookie ────────────────────────────────────────────────
export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh'
  });
};

// ── Legacy — kept for compatibility, wraps generateAccessToken ───────────────
const generateToken = (userId) => generateAccessToken(userId);
export default generateToken;