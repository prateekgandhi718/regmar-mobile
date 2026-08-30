import express from "express";
import { createHash } from "crypto";
import { AuthRequest } from "../middlewares/auth";
import { getActiveLinkedAccountByUserId } from "../db/linkedAccountModel";
import { decrypt } from "../helpers/encryption";
import {
  fetchEmailsIncrementally,
  fetchLatestEmailWithAttachment,
  isImapAuthError,
} from "../helpers/imap";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { parseCASText } from "../helpers/casParser";
import { formatInvestmentPayload } from "./investments";
import { processEmailsWithGemini } from "../helpers/geminiBatchTxnParser";
import { CategoryModel, getCategories } from "../db/categoryModel";

type SyncedTransaction = {
  clientTxnId: string;
  accountId: {
    _id: string;
    userId: string;
    title: string;
    currency: string;
    accountNumber?: string;
  };
  domainId: {
    _id: string;
    userId: string;
    accountId: string;
    fromEmail: string;
  };
  userId: string;
  originalDate: string;
  originalDescription: string;
  originalAmount: number;
  type: "credit" | "debit";
  userType?: "credit" | "debit";
  refunded: boolean;
  emailBody: string;
  createdAt: string;
  updatedAt: string;
  categoryId?: {
    _id: string;
    name: string;
  };
  categoryName?: string;
  newDate?: string;
  newDescription?: string;
  newAmount?: number;
};

type SyncRequestDomain = {
  clientDomainId: string;
  fromEmail: string;
};

type SyncRequestAccount = {
  clientAccountId: string;
  title: string;
  currency: string;
  accountNumber?: string;
  domains: SyncRequestDomain[];
};

const createClientTxnId = (userId: string, accountId: string, domainId: string, uid: number) =>
  createHash("sha256")
    .update(`${userId}:${accountId}:${domainId}:${uid}`)
    .digest("hex")
    .slice(0, 40);

export const syncInvestments = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const inputPan = String(req.body?.pan || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(inputPan)) {
      return res.status(400).json({
        message: "Please provide a valid PAN number to sync investments.",
      });
    }

    // 2. Get active linked email account
    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res
        .status(400)
        .json({ message: "Please link an email account first" });
    }

    const appPassword = decrypt(linkedAccount.appPassword);
    const email = linkedAccount.email;
    const provider = linkedAccount.provider === "icloud" ? "icloud" : "gmail";

    // 3. Fetch latest CAS email from CDSL
    const { attachment, date, uid } = await fetchLatestEmailWithAttachment(
      provider,
      email,
      appPassword,
      "ecas@cdslstatement.com",
      ".pdf",
    );

    if (!attachment) {
      return res
        .status(404)
        .json({ message: "No CAS statement found in your emails." });
    }

    const clientLastSyncedEmailUid = Number(req.body?.lastSyncedEmailUid);
    if (
      Number.isFinite(clientLastSyncedEmailUid) &&
      clientLastSyncedEmailUid === uid
    ) {
      return res.status(200).json({
        message: "Your investment portfolio is already up to date.",
        lastSyncedAt: date || new Date(),
        lastSyncedEmailUid: uid,
        alreadySynced: true,
      });
    }

    // 4. Extract text and parse
    try {
      const data = new Uint8Array(attachment);
      const loadingTask = pdfjsLib.getDocument({
        data,
        password: inputPan,
        stopAtErrors: true,
      });

      const pdfDocument = await loadingTask.promise;

      console.log("Successfully unlocked PDF with PAN");

      let fullText = "";
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        // Group items by their vertical position (y-coordinate) to form lines
        const items = textContent.items as any[];
        const lines: { [key: number]: any[] } = {};

        items.forEach((item) => {
          const y = Math.round(item.transform[5]); // Round to handle small offsets
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        // Sort lines from top to bottom, and items within each line from left to right
        const sortedY = Object.keys(lines)
          .map(Number)
          .sort((a, b) => b - a);
        const pageText = sortedY
          .map((y) => {
            return lines[y]
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map((item) => item.str)
              .join(" ");
          })
          .join("\n");

        fullText += `\n--- Page ${i} ---\n${pageText}\n`;
      }

      // Use manual parser to analyze the text
      const parsedData = parseCASText(fullText);
      if (!parsedData) {
        return res
          .status(500)
          .json({ message: "Failed to parse statement content" });
      }

      const investment = formatInvestmentPayload({
        pan: inputPan,
        lastSyncedAt: date || new Date(),
        lastSyncedEmailUid: uid ?? undefined,
        casId: parsedData.casId,
        statementPeriod: parsedData.statementPeriod,
        summary: parsedData.summary,
        historicalValuation: parsedData.historicalValuation,
        mutualFunds: parsedData.mutualFunds,
        stocks: parsedData.stocks,
      });

      return res.status(200).json({
        message: "Statement synced and analyzed successfully",
        investment,
      });
    } catch (pdfError: any) {
      if (pdfError.name === "PasswordException") {
        return res.status(400).json({
          message: "Failed to unlock PDF. Please check if your PAN is correct.",
        });
      }
      console.error("PDF Processing Error:", pdfError);
      throw pdfError;
    }
  } catch (error) {
    console.error("Investment sync error:", error);
    if (isImapAuthError(error)) {
      return res.status(400).json({
        message: "Email authentication failed. Please update your app password in Settings.",
      });
    }
    return res
      .status(500)
      .json({ message: "Internal server error during investment sync" });
  }
};

export const syncAccountTransactions = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    // 1. Active linked email account
    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res
        .status(400)
        .json({ message: "Please link an email account first" });
    }

    const appPassword = decrypt(linkedAccount.appPassword);
    const email = linkedAccount.email;
    const provider = linkedAccount.provider === "icloud" ? "icloud" : "gmail";

    const accounts = Array.isArray(req.body?.accounts)
      ? (req.body.accounts as SyncRequestAccount[])
      : [];
    const incomingSyncState = req.body?.syncState as Record<string, number> | undefined;
    const syncState = incomingSyncState && typeof incomingSyncState === "object" ? incomingSyncState : {};
    const accountsWithDomains = accounts.filter(
      (acc) => Array.isArray(acc.domains) && acc.domains.length > 0,
    );

    if (accountsWithDomains.length === 0) {
      return res.status(400).json({
        message:
          "No bank accounts with transaction domains found. Please add an account first.",
      });
    }

    let totalSynced = 0;
    const syncedTransactions: SyncedTransaction[] = [];
    const syncStateUpdates: Record<string, number> = {};

    for (const account of accountsWithDomains) {
      for (const domain of account.domains) {
        if (!domain?.clientDomainId || !domain?.fromEmail?.trim()) continue;
        const lastUid = Number(syncState[domain.clientDomainId] || 0);

        let since: Date | undefined;

        if (lastUid === 0) {
          const now = new Date();

          // Move to first day of current month
          now.setDate(1);
          now.setHours(0, 0, 0, 0);

          since = now;

          console.log(
            `Initial sync for ${domain.fromEmail}, fetching since ${since.toISOString()}`,
          );
        }

          // 4. Fetch emails
        const { emails, lastUid: newLastUid } = await fetchEmailsIncrementally(
          provider,
          email,
          appPassword,
          domain.fromEmail.trim(),
          lastUid,
          undefined,
          since,
        );

        if (emails.length > 0) {
          console.log(
            `Processing ${emails.length} emails for ${domain.fromEmail}`,
          );

          const parsedEmails = await processEmailsWithGemini(
            emails.map(({ content }) => content),
          );

          for (let index = 0; index < emails.length; index += 1) {
            const { content, date, uid } = emails[index];
            const parsed = parsedEmails[index];

              if (!parsed) {
                console.warn(
                  `Missing Gemini parse result for email uid ${uid} in ${domain.fromEmail}`,
                );
                continue;
              }

              if (!parsed.is_transaction) {
                console.log(
                  `[${domain.fromEmail}] Skipped (not a transaction email)`,
                );
                continue;
              }

              const now = new Date().toISOString();
              const txnType = parsed.type === "credit" ? "credit" : "debit";
              const originalAmount = Number(parsed.amount) || 0;
              const originalDescription =
                typeof parsed.merchant === "string"
                  ? parsed.merchant.trim()
                  : "";
              const categoryName =
                typeof parsed.category === "string" && parsed.category.trim()
                  ? parsed.category.trim()
                  : "Personal";

              const categoryDoc = await CategoryModel.findOne({ name: categoryName })
                .select("_id name")
                .lean<{ _id: string; name: string } | null>();

              const categoryId = categoryDoc
                ? {
                    _id: String(categoryDoc._id),
                    name: categoryDoc.name,
                  }
                : undefined;

              syncedTransactions.push({
                clientTxnId: createClientTxnId(
                  userId,
                  account.clientAccountId,
                  domain.clientDomainId,
                  uid,
                ),
                accountId: {
                  _id: account.clientAccountId,
                  userId,
                  title: account.title,
                  currency: account.currency,
                  accountNumber: account.accountNumber || undefined,
                },
                domainId: {
                  _id: domain.clientDomainId,
                  userId,
                  accountId: account.clientAccountId,
                  fromEmail: domain.fromEmail.trim(),
                },
                userId,
                originalDate: new Date(date).toISOString(),
                originalDescription: originalDescription || content.substring(0, 80),
                originalAmount,
                type: txnType,
                categoryId,
                categoryName,
                refunded: false,
                emailBody: content,
                createdAt: now,
                updatedAt: now,
              });
              totalSynced++;
              console.log("Processed transaction in memory");
          }
        }

        syncStateUpdates[domain.clientDomainId] = newLastUid;
      }
    }

    return res.status(200).json({
      message: "Sync completed successfully",
      transactionsSynced: totalSynced,
      transactions: syncedTransactions,
      syncStateUpdates,
    });
  } catch (error) {
    console.error("Sync error:", error);
    if (isImapAuthError(error)) {
      return res.status(400).json({
        message: "Email authentication failed. Please update your app password in Settings.",
      });
    }
    return res.status(500).json({
      message: "Internal server error during sync",
    });
  }
};
