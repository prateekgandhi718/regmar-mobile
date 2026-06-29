import { Request, Response } from 'express';
import { createOtp, getOtpByEmail, deleteOtpsByEmail } from '../db/otpModel';
import { getUserByEmail, createUser, updateUserById, getUserById } from '../db/userModel';
import { sendOtpEmail } from '../helpers/mailer';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../helpers/jwt';

export const requestOtp = async (req: Request, res: Response) => {
  const { email, mode } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await getUserByEmail(email);

    if (mode === 'login' && !user) {
      return res.status(404).json({ message: 'User not found. Please sign up.' });
    }

    if (mode === 'signup' && user) {
      return res.status(400).json({ message: 'User already exists. Please log in.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await createOtp({ email, otp });
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp, name } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const otpRecord = await getOtpByEmail(email);

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await deleteOtpsByEmail(email);

    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser({ email, name });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    await updateUserById(user._id.toString(), { refreshToken });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        pan: user.pan,
        primaryColor: user.primaryColor,
      },
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

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    await updateUserById(user._id.toString(), { refreshToken: newRefreshToken });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error(error);
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};
