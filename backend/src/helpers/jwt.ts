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
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
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
