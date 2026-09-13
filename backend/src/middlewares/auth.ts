import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../helpers/jwt';
import { getUserById } from '../db/userModel';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    // Expired access tokens are an expected part of normal rotation; avoid
    // logging a full stack trace for them.
    if ((error as { name?: string })?.name !== 'TokenExpiredError') {
      console.error(error);
    }
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
};
