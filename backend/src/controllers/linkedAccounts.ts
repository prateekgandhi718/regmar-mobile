import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
  createLinkedAccount,
  getLinkedAccountsByUserId,
  getActiveLinkedAccountByUserId,
  updateLinkedAccountById,
  deleteLinkedAccountById
} from '../db/linkedAccountModel';
import { encrypt } from '../helpers/encryption';
import { isImapAuthError, SupportedProvider, verifyImapCredentials } from '../helpers/imap';

const SUPPORTED_PROVIDERS = new Set(['gmail', 'icloud']);

export const upsertLinkedAccount = async (req: AuthRequest, res: Response) => {
  const { email, appPassword } = req.body;
  const provider = String(req.params.provider || '').toLowerCase();
  const userId = req.userId;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return res.status(400).json({ message: 'Unsupported email provider' });
  }

  try {
    // Check if an active link already exists
    let existingLink = await getActiveLinkedAccountByUserId(userId);

    if (existingLink) {
      // Update existing (app password optional)
      const updatePayload: Record<string, any> = { email: normalizedEmail, provider };
      const isEmailChanged = existingLink.email.toLowerCase() !== normalizedEmail.toLowerCase();

      if (isEmailChanged && !appPassword) {
        return res.status(400).json({ message: 'App password is required when changing email' });
      }

      if (appPassword) {
        if (String(appPassword).length !== 16) {
          return res.status(400).json({ message: 'App password must be 16 characters' });
        }

        await verifyImapCredentials(provider as SupportedProvider, normalizedEmail, appPassword);
        updatePayload.appPassword = encrypt(appPassword);
      }
      existingLink = await updateLinkedAccountById(existingLink._id.toString(), updatePayload);
    } else {
      if (!appPassword) {
        return res.status(400).json({ message: 'App password is required' });
      }
      if (String(appPassword).length !== 16) {
        return res.status(400).json({ message: 'App password must be 16 characters' });
      }
      // Create new
      await verifyImapCredentials(provider as SupportedProvider, normalizedEmail, appPassword);

      existingLink = await createLinkedAccount({
        userId,
        email: normalizedEmail,
        appPassword: encrypt(appPassword),
        provider,
        isActive: true
      });
    }

    res.status(200).json({
      message: `${provider[0].toUpperCase()}${provider.slice(1)} account linked successfully`,
      linkedAccount: {
        id: existingLink?._id,
        email: existingLink?.email,
        provider: existingLink?.provider,
        isActive: existingLink?.isActive
      }
    });
  } catch (error) {
    if (isImapAuthError(error)) {
      return res.status(400).json({ message: 'Unable to connect to your mailbox. Please check your email and app password.' });
    }
    console.error(`Error linking ${provider}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLinkedAccounts = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const accounts = await getLinkedAccountsByUserId(userId);
    // Mask passwords and only send necessary info
    const safeAccounts = accounts.map(acc => ({
      id: acc._id,
      email: acc.email,
      provider: acc.provider,
      isActive: acc.isActive
    }));

    res.status(200).json(safeAccounts);
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeLinkedAccount = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    await deleteLinkedAccountById(id);
    res.status(200).json({ message: 'Linked account removed successfully' });
  } catch (error) {
    console.error('Error removing linked account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
