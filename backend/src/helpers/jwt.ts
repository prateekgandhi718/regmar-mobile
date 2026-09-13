import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const REFRESH_HASH_SECRET = process.env.REFRESH_HASH_SECRET || REFRESH_SECRET;

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string) => {
  // Refresh tokens represent the persisted device session. Keep this window
  // materially longer than the 15-minute access token, while allowing the
  // deployment to choose a different lifetime.
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: refreshExpiresIn as jwt.SignOptions['expiresIn'] });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as { userId: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
};

export const hashRefreshToken = (token: string) => {
  return crypto.createHash('sha256').update(`${token}:${REFRESH_HASH_SECRET}`).digest('hex');
};
