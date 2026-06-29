import express from 'express';
import { AuthRequest } from '../middlewares/auth';
import { updateUserById, getUserById } from '../db/userModel';

const isValidHexColor = (value: unknown) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

const toSafeUser = (user: any) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  pan: user.pan,
  primaryColor: user.primaryColor,
});

export const updateProfile = async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.userId;
    const { name, pan } = req.body;

    if (!userId) {
      return res.sendStatus(401);
    }

    const updatedUser = await updateUserById(userId, { name, pan });
    return res.status(200).json(toSafeUser(updatedUser));
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePreferences = async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.userId;
    const { primaryColor } = req.body as { primaryColor?: string };

    if (!userId) {
      return res.sendStatus(401);
    }

    if (primaryColor !== undefined && !isValidHexColor(primaryColor)) {
      return res.status(400).json({ message: 'primaryColor must be a hex string like #RRGGBB' });
    }

    const updatedUser = await updateUserById(userId, { primaryColor });
    return res.status(200).json(toSafeUser(updatedUser));
  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const user = await getUserById(userId);
    if (!user) return res.sendStatus(404);

    return res.status(200).json(toSafeUser(user));
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
