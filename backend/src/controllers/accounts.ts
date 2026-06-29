import express from "express";
import fs from "fs";
import path from "path";
import {
  getAccountsByUserId,
  createAccount,
  getAccountById,
  updateAccountById,
  deleteAccountById,
} from "../db/accountModel";
import {
  createDomain,
  getDomainsByAccountId,
  deleteDomainById,
  deleteDomainsByAccountId,
} from "../db/domainModel";
import { deleteTransactionsByAccountId } from "../db/transactionModel";
import { getActiveLinkedAccountByUserId } from "../db/linkedAccountModel";
import { deleteSyncStatesByDomainId } from "../db/syncStateModel";
import { AuthRequest } from "../middlewares/auth";

/**
 * Helper to clean up a single domain and its related data
 * - sync state
 * - domain document
 */
const cleanupDomain = async (userId: string, domainId: string) => {
  // 1. Delete sync state
  await deleteSyncStatesByDomainId(domainId);

  // 2. Delete domain document
  await deleteDomainById(domainId);
};


/**
 * Helper to process domains for an account:
 * 1. Creates Domain documents with just fromEmail.
 * 2. ML-based classification and NER will be applied during sync.
 */
const processAccountDomains = async (
  userId: string,
  accountId: string,
  linkedAccount: any,
  domainNames: string[]
): Promise<string[]> => {
  const domainIds: string[] = [];

  for (const fromEmail of domainNames) {
    if (!fromEmail.trim()) continue;
    const emailDomain = fromEmail.trim();

    // Create domain with just fromEmail; classifier + NER will be applied during sync
    const domain = await createDomain({
      userId,
      accountId,
      fromEmail: emailDomain,
    });
    domainIds.push(domain._id.toString());
    console.log(`Created domain for ${emailDomain}`);
  }
  return domainIds;
};

export const getUserAccounts = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const accounts = await getAccountsByUserId(userId);
    return res.status(200).json(accounts);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const addUserAccount = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res.status(403).json({
        message: "Please link an email account in settings before adding bank accounts.",
      });
    }

    const { title, icon, currency, accountNumber, domainNames } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const account = await createAccount({
      userId,
      title,
      icon,
      currency: currency || "INR",
      accountNumber,
    });

    try {
      let domainIds: string[] = [];
      if (domainNames && Array.isArray(domainNames)) {
        domainIds = await processAccountDomains(
          userId,
          account._id.toString(),
          linkedAccount,
          domainNames
        );
      }

      const updatedAccount = await updateAccountById(account._id.toString(), {
        domainIds,
      });
      return res.status(201).json(updatedAccount);
    } catch (error: any) {
      console.error("Rollback: Error during domain setup:", error.message);
      await deleteDomainsByAccountId(account._id.toString());
      await deleteAccountById(account._id.toString());

      return res.status(400).json({
        message: error.message || "Failed to set up account domains.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const updateAccount = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res.status(403).json({
        message: "Please link an email account in settings before updating bank accounts.",
      });
    }

    const existingAccount = await getAccountById(id);
    if (!existingAccount) return res.sendStatus(404);

    const { title, icon, currency, accountNumber, domainNames } = req.body;
    const values: any = { title, icon, currency, accountNumber };

    if (domainNames && Array.isArray(domainNames)) {
      // For updates, we replace existing domains
      if (existingAccount.domainIds) {
        for (const domainId of existingAccount.domainIds) {
          await cleanupDomain(userId, domainId.toString());
        }
      }

      values.domainIds = await processAccountDomains(
        userId,
        id,
        linkedAccount,
        domainNames
      );
    }

    const account = await updateAccountById(id, values);
    return res.status(200).json(account);
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ message: error.message || "Update failed" });
  }
};

export const deleteAccount = async (
  req: AuthRequest,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    // 1. Get all domains for this account
    const domains = await getDomainsByAccountId(id);

    // 2. Clean up each domain
    for (const domain of domains) {
      await cleanupDomain(userId, domain._id.toString());
    }

    // 3. Delete all transactions for this account
    await deleteTransactionsByAccountId(id);

    // 4. Delete the account itself
    await deleteAccountById(id);

    return res.status(200).json({
      message: "Account and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error during account deletion:", error);
    return res.status(400).json({ message: "Failed to delete account and associated data" });
  }
};
