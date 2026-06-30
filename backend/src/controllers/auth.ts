import { Request, Response } from 'express';
import { createUser, updateUserById, getUserById, getUserByDeviceUuid } from '../db/userModel';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashRefreshToken } from '../helpers/jwt';

const toSafeUser = (user: any) => ({
  id: user._id,
  name: user.name,
  pan: user.pan,
  primaryColor: user.primaryColor,
});

export const registerDevice = async (req: Request, res: Response) => {
  const { deviceUuid, name } = req.body as { deviceUuid?: string; name?: string };

  if (!deviceUuid || typeof deviceUuid !== 'string') {
    return res.status(400).json({ message: 'deviceUuid is required' });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'name is required' });
  }

  try {
    let user = await getUserByDeviceUuid(deviceUuid);

    if (!user) {
      user = await createUser({ deviceUuid, name: name.trim() });
    } else if ((!user.name || !user.name.trim()) && name.trim()) {
      user = await updateUserById(user._id.toString(), { name: name.trim() });
    }

    if (!user) return res.status(500).json({ message: 'Failed to resolve user' });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await updateUserById(user._id.toString(), { refreshTokenHash });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await getUserById(decoded.userId);
    const currentHash = hashRefreshToken(refreshToken);

    if (!user || user.refreshTokenHash !== currentHash) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    await updateUserById(user._id.toString(), { refreshTokenHash: newRefreshTokenHash });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error(error);
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};
